# Jev 训练从零到一：在 RTX 3050 上完成微调、校准与本地部署

> 本文根据我的训练记录整理，并对照本地 JevForge 的配置、源码与评估报告核对。使用的 GPU 为 NVIDIA GeForce RTX 3050。这里的“从零到一”指从环境搭建到本地服务的完整实践，模型以预训练权重为起点，并非从随机初始化预训练。

这次训练最费力的地方，不只是让一个命令跑起来。环境安装、数据转换、显存占用、检查点选择和指标解读，每一步都可能影响最终结果。跑通之后，我才逐渐把这些环节连接起来：模型怎样给候选项打分，训练到底改善了什么，以及怎样把训练结果接到自己的程序中。

本文按实际过程整理：先说明本次训练的对象，再记录环境与数据准备、监督微调、RLCD 后训练、结果比较和本地调用。原稿中的 200 步结果作为早期记录保留，1200 步与 RLCD 结果已对照本地报告核实。

## 1. 这次训练的是什么

本次使用的是 [JevForge](https://github.com/zwliJay/jev-forge)，一个面向 Jev 风格结构化决策的开源训练与推理工具。它支持 Choice、Noul 和有序 Score 三类问题。

| 类型 | 要回答的问题 | 结果形式 |
| --- | --- | --- |
| Choice | 从给定候选中选择哪一个？ | 候选概率分布与选项 |
| Noul | 一个陈述是否成立？ | 真／假判断及概率 |
| Score | 某个属性处于哪个有序等级？ | 等级分布与评分结果 |

我的任务是网页决策：根据当前页面状态和任务，判断下一步应操作哪个元素。问题需要有明确的候选项或判断标准；如果目标是“分析情况并给出完整方案”，就需要先拆成可以独立评估的小问题，再由程序组合结果。

这里需要区分 **Jev 的接口概念、JevForge 的实现和本次训练的模型**。本地实现使用 Qwen3.5-0.8B 预训练底座，提取隐藏表示后接候选打分头，不进行逐 token 文本生成。源码将它描述为因果语言模型底座加标量候选头，因此不能因为输出是分类或判断，就把它称为 BERT 式 Encoder-only 模型，也不能据此推断原版 Jev 的内部结构。

### 候选是怎样得到概率的

对于一个包含 K 个候选的问题，程序构造 K 条输入，每条包含相同的状态与问题，以及一个不同候选。底座计算隐藏表示，取每条输入最后一个有效 token 的表示，再交给共享的两层 GELU 打分器。

```text
                    同一状态 + 同一问题
                           │
           ┌───────────────┼───────────────┐
         候选 A          候选 B          候选 C
           │               │               │
       底座隐藏表示     底座隐藏表示     底座隐藏表示
           │               │               │
           └────── 共享候选打分头 ──────────┘
                           │
                    logits [a, b, c]
                           │
                 在本题候选内做 softmax
                           │
                  概率 [p(A), p(B), p(C)]
```

关键是只在同一个问题的候选之间归一化，不能把不同问题的候选混在一起。上述流程不需要生成一段解释文本，输出可以直接供代码使用。

## 2. 环境与数据准备

本次在 Windows PowerShell 下运行，GPU 为 **NVIDIA GeForce RTX 3050**，使用 `uv` 管理 Python 环境。原记录没有完整保存驱动、CUDA、Python 和 PyTorch 的版本，因此这里不补写具体版本或显存容量。

在 PowerShell 中先建立虚拟环境，再安装依赖：

```powershell
git clone https://github.com/zwliJay/jev-forge.git
cd jev-forge
pip install uv
uv venv
.\.venv\Scripts\Activate.ps1
uv pip install -r requirements.txt
```

仓库提供的流水线是 Bash 脚本，不能直接当作 PowerShell 命令执行。本次将下载、数据构建、训练、预测和评估拆开运行，便于定位失败发生在哪一步。下面的命令按本次本地版本整理；上游仓库后续更新可能改变参数。

### 下载并明确选择底座快照

```powershell
$jevCacheDir = Join-Path $HOME ".cache\huggingface\hub"
uv run python scripts/fetch_hf_model.py Qwen/Qwen3.5-0.8B --cache-dir $jevCacheDir

Get-ChildItem (Join-Path $jevCacheDir "models--Qwen--Qwen3.5-0.8B\snapshots") -Directory
```

本次检查点记录的快照为 `2fc06364715b967f1860aea9cf38778875588b17`。确认下载结果后，使用实际快照目录赋值，不在有多个版本时随意取第一个目录：

```powershell
$jevModelDir = Join-Path $jevCacheDir "models--Qwen--Qwen3.5-0.8B\snapshots\2fc06364715b967f1860aea9cf38778875588b17"
if (-not (Test-Path $jevModelDir)) { throw "请先下载并确认模型快照目录" }
```

原记录还使用过 `HF_ENDPOINT` 指向下载镜像，这是下载环境设置，不是模型训练的必要条件，因此没有将镜像写成默认步骤。

### 构建网页决策数据

本次实际使用的数据来源是 `LangAGI-Lab/Mind2Web-axtree-cleaned-lite`，转换后保存在 `data/web`，而不是直接使用示例脚本中的 `data/web_full`。

```powershell
uv run python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='LangAGI-Lab/Mind2Web-axtree-cleaned-lite', repo_type='dataset', cache_dir='hf_home/hub')"

uv run python -m jevforge.build_web `
  --dataset-glob "hf_home/hub/datasets--LangAGI-Lab--Mind2Web-axtree-cleaned-lite/snapshots/*/data/*.parquet" `
  --output-dir data/web

$jevRecords = "data/web"
```

本地 `manifest.json` 保存的划分如下。网站分组用于隔离不同划分，避免同一个网站同时进入训练与测试。

| 划分 | 记录数 | 网站数 | 用途 |
| --- | ---: | ---: | --- |
| train | 4642 | 49 | 更新模型参数 |
| dev | 786 | 6 | 比较检查点 |
| calibration | 400 | 6 | 拟合温度等校准参数 |
| test | 800 | 8 | 测试集评估 |
| ood | 386 | 4 | 项目定义的 OOD 划分评估 |

一次记录可以包含多个问题。本次报告中的 test 为 1600 个问题、OOD 为 772 个问题，是两种问题合计的数量，不是 Choice 单独有 1600 和 772 道题。

### 训练记录与接口请求不是同一种格式

原稿把接口请求和训练标签混在了一起。按照本地 JevForge 的数据规范，训练 JSONL 除了 `request.state` 与 `request.questions`，还需要 `targets` 等监督字段。下面是便于理解的 Choice 单题示意，正式构建以项目转换器和数据规范为准：

```json
{
  "id": "example-choice-1",
  "schema_version": "jevforge-record-v1",
  "split": "train",
  "source_group": "example-site",
  "request": {
    "state": "目标：打开设置。页面元素：e1 设置，e2 取消。",
    "questions": {
      "action": {
        "type": "choice",
        "instructions": "下一步应选择哪个元素？",
        "criteria": {"e1": "设置", "e2": "取消"}
      }
    }
  },
  "targets": {"action": {"e1": 1.0, "e2": 0.0}},
  "target_kinds": {"action": "uniform_over_positive_elements"},
  "gold": {"action": "e1"},
  "meta": {"positive_ids": ["e1"]}
}
```

目标分布需要覆盖候选集且总和为 1。多个元素都有效时，可以给正候选分配概率质量，而不必强行指定唯一正确元素。数据标签应有明确的标注或规则依据；如果使用模型生成标签，需要另外审核，不能将待评估模型的预测直接当作独立真值。

## 3. 在本地跑通训练：最主要的两个问题

### 依赖加载失败

原记录中，`pyarrow` 安装或加载遇到系统拦截，曾尝试固定版本并使用复制模式重装：

```powershell
uv pip install "pyarrow==17.0.0" --reinstall --no-cache --link-mode=copy
```

这条命令是当时的排查尝试，不是所有 Windows 环境都需要执行的步骤。原稿将问题直接归因于签名和硬链接，但没有保存足够的错误日志来确认原因。它还记录了关闭智能应用控制的尝试；本文保留这段经历，但不将关闭系统保护列为常规安装方案。再次遇到同类错误，应先核对报错文件、Python 与 wheel 的兼容性及安全中心记录。

### 显存压力让训练明显变慢

早期使用 `microbatch-tokens=12000` 时，我观察到专用 GPU 内存占满，并出现共享 GPU 内存占用和明显减速。这提示显存压力需要优先处理，但仅凭任务管理器不能确定发生了哪一种回退机制，也不能据此给出固定的降速倍数。

最终监督训练配置保存的是 `microbatch_tokens=4000`。它限制候选输入微批次的 token 预算；一次问题展开成多个候选后，实际计算量会明显增加。处理显存问题时，需要同时考虑序列长度、候选数量、问题批次和微批次预算，而不能只看“模型不到 1B”。

## 4. 从 200 步验证到 1200 步监督训练

我先用 200 步检查数据、训练和评估是否能贯通，再进行配置为 1200 步的监督训练。下面按最终保存的主要参数整理命令，使用新的输出目录可以避免覆盖之前的试跑结果：

```powershell
$jevSftDir = "runs/my_first_jev_1200"
uv run python -m jevforge.train `
  --records $jevRecords `
  --output-dir $jevSftDir `
  --base-model $jevModelDir `
  --backbone-init pretrained `
  --max-length 768 `
  --steps 1200 `
  --head-steps 12 `
  --questions-per-batch 8 `
  --microbatch-tokens 4000 `
  --eval-every 50
```

本次历史产物实际保存在 `runs/my_first_jev`。检查点配置还记录了 `seed=17`、Brier 权重 0.5、底座学习率 `2e-5`、打分头学习率 `2e-4`，以及余弦学习率调度。

**配置训练 1200 步，不代表最终评估的是第 1200 步权重。** 保存的 `best_step` 为 **500**，温度为 **1.215**。因此，下文的“1200 步运行”指该次训练所选出的检查点，而不是最后一步模型。

这个区别很重要：dev 用于选择模型，calibration 用于校准，test 与 OOD 用于报告结果。写复盘时应将这些角色分开，不能只凭训练步数解释模型效果。

## 5. 后训练：本次实际采用的 RLCD 路径

监督训练之后，我继续运行 JevForge 的 RLCD 后训练模块。本地配置记录的是 **`mode=exact`**，训练 200 步，最优检查点为第 200 步。这个模式直接计算候选分布下的效用目标，再结合 Brier 项和相对监督检查点的 KL 约束。

原稿中的“每题采样 8 个决策、组内计算 advantage”描述对应的是 `sampled` 分支。虽然配置也保存了 `group_size=8`，但本次走的是 `exact` 分支，不能把采样流程写成本次实际执行方式。

主要设置如下：

| 参数 | 本次值 |
| --- | ---: |
| 训练步数 | 200 |
| 每批问题数 | 6 |
| microbatch token 预算 | 10000 |
| 底座／打分头学习率 | 5e-6 / 5e-5 |
| 效用／Brier／KL 权重 | 1.0 / 0.5 / 0.02 |
| 评估间隔 | 50 步 |
| dev 问题上限 | 300 |
| 随机种子 | 29 |

这是保存下来的运行配置，不是针对所有 RTX 3050 的显存推荐值。与监督阶段不同的训练路径也不能仅凭 token 预算比较显存需求。

后训练结束后，保存的温度为 Choice **1.5915**、Noul **4.8265**。因此，后面展示的是包含校准在内的最终流水线结果。缺少关闭温度校准等对照实验时，不能把所有改善单独归因于 RLCD 参数更新。

## 6. 结果：哪些改善了，哪些没有变化

以下数值保留原记录精度。200 步结果来自笔记；1200 步运行和 RLCD 结果与两份本地 `metrics.json` 一致。

### Choice：候选选择和概率分配均有改善

| 指标 | 划分 | 200 步试跑 | 1200 步运行 | RLCD 后 |
| --- | --- | ---: | ---: | ---: |
| CE ↓ | test | 1.8522 | 1.6711 | **1.5910** |
| CE ↓ | OOD | 1.8408 | 1.5518 | **1.3894** |
| Top-1 in positives ↑ | test | 0.4037 | 0.4387 | **0.4637** |
| Top-1 in positives ↑ | OOD | 0.4041 | 0.4793 | **0.5311** |
| Exact gold ↑ | test | 0.3925 | 0.4313 | **0.4550** |
| Exact gold ↑ | OOD | 0.3860 | 0.4585 | **0.5078** |
| Mass on positives ↑ | test | 0.1999 | 0.2834 | **0.3637** |
| Mass on positives ↑ | OOD | 0.1973 | 0.2842 | **0.3707** |

`top1_in_positives` 衡量最高概率选项是否属于有效候选集合；`exact_gold` 衡量它是否等于记录中的指定 gold，两者在多个候选都有效时可以不同。`mass_on_positives` 是所有正候选的概率之和，其均匀分布基线为“正候选数 / 总候选数”，不能统一写成 0.20。

相对于监督训练检查点，RLCD 后的 top-1 在 test 上增加 **2.50 个百分点**，在 OOD 上增加 **5.18 个百分点**，同时分配给有效候选的概率质量提高。这里 OOD 数值高于 test，并不说明 OOD 天然更容易泛化：两个划分的网站构成和难度不同，主要应比较同一划分上的前后变化。

### Noul：准确率不变，概率指标改善

| 指标 | 划分 | 200 步试跑 | 1200 步运行 | RLCD 后 |
| --- | --- | ---: | ---: | ---: |
| CE ↓ | test | 0.5604 | 0.5296 | **0.5265** |
| CE ↓ | OOD | 0.5746 | 0.5332 | **0.5310** |
| Accuracy ↑ | test | 0.7762 | 0.7762 | 0.7762 |
| Accuracy ↑ | OOD | 0.7694 | 0.7694 | 0.7694 |
| Brier ↓ | test | 0.1816 | 0.1729 | **0.1717** |
| Brier ↓ | OOD | 0.1868 | 0.1748 | **0.1740** |
| ECE ↓ | test | 0.1122 | 0.0374 | **0.0263** |
| ECE ↓ | OOD | 0.1109 | 0.0392 | **0.0202** |

这组结果体现了准确率与概率质量的区别：最终分类没有变化，输出概率仍可能更合理。但准确率约 77% 本身不足以判断模型好坏，还需要结合类别比例、混淆矩阵和多数类基线。

本地评估的二分类 Brier 是预测真概率与目标真概率的平方误差均值。它衡量整体概率预测质量，并非只度量校准；恒定输出 0.5 时，对硬标签其值为 0.25，这不是所有随机策略或数据集的统一基线。

ECE 按置信度分箱，计算置信度与正确率之间的加权差异。本地实现使用 10 个分箱。它下降说明按这一计算方式观察到的校准误差减小，但不能将 0.1122 解释成“每个样本的概率平均错了 11.22%”。

这次可以直接支持的结论是：**在保存的 test 与 OOD 评估中，Choice 的选择指标提高，Noul 的准确率持平而概率指标改善。** 本文没有 Score 评估结果，也没有实测推理延迟或成本，因此不声称模型达到某个倍数的加速。

## 7. 预测、评估与本地服务

对最终检查点先生成预测，再单独运行评估。本次 RLCD 产物位于 `runs/my_first_jev_rlcd_v1`：

```powershell
$jevRunDir = "runs/my_first_jev_rlcd_v1"
$jevPredDir = "artifacts/my_first_jev_rlcd_v1"
$jevReportDir = "artifacts/report_my_first_jev_rlcd_v1"
$jevRecords = "data/web"

uv run python -m jevforge.predict `
  --checkpoint-dir $jevRunDir `
  --records $jevRecords `
  --splits "test,ood" `
  --output-dir $jevPredDir

uv run python -m jevforge.evaluate `
  --records $jevRecords `
  --predictions "rlcd=$jevPredDir" `
  --splits "test,ood" `
  --output-dir $jevReportDir
```

启动本地服务：

```powershell
uv run python -m jevforge.serve `
  --checkpoint-dir $jevRunDir `
  --port 8009 `
  --host 127.0.0.1
```

保持这个终端运行，在另一个 PowerShell 窗口检查健康状态并发送请求。下面同时包含 Choice 和 Noul，避免复用请求变量时把问题覆盖掉，却仍尝试读取之前的回答字段：

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8009/health" -Method Get

$jevBody = @{
  state = "目标：打开设置。页面元素：e1 设置，e2 取消。"
  questions = @{
    action = @{
      type = "choice"
      instructions = "下一步应选择哪个元素？"
      criteria = @{ e1 = "设置"; e2 = "取消" }
    }
    is_target = @{
      type = "noul"
      instructions = "元素 e1 是正确的下一步目标。"
    }
  }
} | ConvertTo-Json -Depth 6

$jevResponse = Invoke-RestMethod `
  -Uri "http://127.0.0.1:8009/v1/systemone" `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($jevBody))

$jevResponse | ConvertTo-Json -Depth 10
$jevResponse.answers.action.choice
$jevResponse.answers.action.probabilities
$jevResponse.answers.is_target.noul
```

这个请求用于验证服务调用路径，不是中文业务能力测试。网页决策数据上的提升，也不能直接替代工单分流或光学领域任务的评估。后续接入自己的 Agent 时，需要用实际任务的数据重新检查效果。

## 8. 这次训练留下的经验

先用短训练把整个流程跑通，比一开始就追求长训练更容易定位问题。但短训练不仅要确认 loss 在下降，还要真正走完预测、评估和服务加载，确保保存的检查点可以被后续代码使用。

训练资源也需要逐项管理。底座规模、输入长度和候选展开共同决定计算量；显存出现压力时，应通过日志和实际占用调整预算，而不是只根据模型参数量判断能否运行。

最后，实验结论必须回到保存的配置和报告。这次整理才明确了第 500 步最佳检查点、RLCD 的 `exact` 模式，以及温度校准参与最终输出等细节。以后应为每次试跑保留独立目录、环境版本、命令、数据划分和评估报告，避免覆盖早期结果，也避免把预期流程写成实际执行过程。

## 实现依据

- [JevForge 源码与说明](https://github.com/zwliJay/jev-forge)
- [训练记录格式](https://github.com/zwliJay/jev-forge/blob/main/docs/DATASET.md)
- [候选打分模型实现](https://github.com/zwliJay/jev-forge/blob/main/jevforge/model.py)
- [RLCD 实现](https://github.com/zwliJay/jev-forge/blob/main/jevforge/rlcd.py)

本文的实验数值依据本次本地运行配置与报告。上游链接用于追溯实现，当前版本可能已演进；它公开展示的其他训练结果不作为本次实验结果引用。
