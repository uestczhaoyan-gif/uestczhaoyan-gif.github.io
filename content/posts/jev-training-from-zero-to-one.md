# Jev 训练从零到一：在 RTX 3050 上完成微调、校准与本地部署

这篇笔记记录了我用一张 RTX 3050 显卡，把 JevForge 从环境搭建跑通到本地服务的全过程。虽然名字叫“从零到一”，但模型并不是从随机初始化开始练的，而是基于预训练权重起步的微调。

这次折腾下来，我发现最难的不是敲几条命令行命令。从配环境、转数据，到被显存卡脖子、选检查点，再到怎么读懂那些评估指标，每一步都在反复。跑通之后，我才算真正理清了整个脉络：模型是怎么给选项打分的，训练到底改变了什么，以及怎么把训好的结果接进自己的代码里。

## 1. JevForge

我在训练过程中用的是 [JevForge](https://github.com/zwliJay/jev-forge)，一个开源的 Jev 风格结构化决策工具。它主要处理三种问题：

| 类型 | 要回答的问题 | 结果形式 |
| --- | --- | --- |
| Choice | 从给定候选中选哪一个？ | 候选概率分布与选项 |
| Noul | 一个陈述是否成立？ | 真／假判断及概率 |
| Score | 某个属性处于哪个等级？ | 等级分布与评分结果 |

开源项目对应的任务是网页决策：根据当前的页面状态和任务，判断下一步该点哪个元素。这里有个前提：问题必须有明确的选项或判断标准。如果目标是“分析情况并给出完整方案”，那就得先把它拆成几个能独立评估的小问题，再由代码去拼结果。

概念澄清：Jev 的接口设计、JevForge 的实现，以及实际跑的模型，其实是三个概念。JevForge 在本地用 Qwen3.5-0.8B 作为预训练底座，提取隐藏表示后接了一个候选打分头，并不会去逐个生成 token 文本。看源码的话，它是“因果语言模型底座 + 标量候选头”的组合。所以，不要因为它的输出是分类或判断，就管它叫 BERT 式的 Encoder-only 模型，更不能以此去推断原版 Jev 的内部结构。

### 候选是怎么变成概率的？

对于一个有 K 个候选的问题，程序会构造 K 条输入。每条输入都包含相同的状态和问题，只是带上了不同的候选。底座模型算出隐藏表示后，取每条输入最后一个有效 token 的表示，扔给一个共享的两层 GELU 打分器：

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

重点在于：**只能在同一个问题的候选之间做归一化**，绝对不能用其他问题的候选来算。这个流程完全不需要生成解释文本，输出结果可以直接给代码用。

## 2. 环境与数据准备

我的运行环境是 Windows PowerShell + NVIDIA GeForce RTX 3050，Python 环境用的是 `uv` 管理。（因为没存完整的驱动、CUDA 和 PyTorch 版本记录，不做更多记录）。

先建虚拟环境，装依赖：

```powershell
git clone https://github.com/zwliJay/jev-forge.git
cd jev-forge
pip install uv
uv venv
.\.venv\Scripts\Activate.ps1
uv pip install -r requirements.txt
```

因为仓库自带的流水线是 Bash 脚本，在 PowerShell 里跑不了，所以我把它拆成了下载、构建、训练、预测和评估几步分开跑，这样哪一步报错也容易查。下面的命令是基于我当时的本地版本整理的，如果你拉取的是最新代码，参数可能会有变化。

### 下载并锁定底座模型

```powershell
$jevCacheDir = Join-Path $HOME ".cache\huggingface\hub"
uv run python scripts/fetch_hf_model.py Qwen/Qwen3.5-0.8B --cache-dir $jevCacheDir

Get-ChildItem (Join-Path $jevCacheDir "models--Qwen--Qwen3.5-0.8B\snapshots") -Directory
```

我这次用的快照是 `2fc06364715b967f1860aea9cf38778875588b17`。确认下载没问题后，把路径赋给变量：

```powershell
$jevModelDir = Join-Path $jevCacheDir "models--Qwen--Qwen3.5-0.8B\snapshots\2fc06364715b967f1860aea9cf38778875588b17"
if (-not (Test-Path $jevModelDir)) { throw "请先下载并确认模型快照目录" }
```

（注：下载时我用了 `HF_ENDPOINT` 镜像。）

### 构建网页决策数据

我用的数据源是 `LangAGI-Lab/Mind2Web-axtree-cleaned-lite`，转换后存在 `data/web` 下。

```powershell
uv run python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='LangAGI-Lab/Mind2Web-axtree-cleaned-lite', repo_type='dataset', cache_dir='hf_home/hub')"

uv run python -m jevforge.build_web `
  --dataset-glob "hf_home/hub/datasets--LangAGI-Lab--Mind2Web-axtree-cleaned-lite/snapshots/*/data/*.parquet" `
  --output-dir data/web

$jevRecords = "data/web"
```

本地 `manifest.json` 里的数据划分是这样的（按网站分组来隔离，防止同一个网站的数据同时出现在训练集和测试集里）：

| 划分 | 记录数 | 网站数 | 用途 |
| --- | ---: | ---: | --- |
| train | 4642 | 49 | 更新模型参数 |
| dev | 786 | 6 | 对比检查点 |
| calibration | 400 | 6 | 拟合温度等校准参数 |
| test | 800 | 8 | 测试集评估 |
| ood | 386 | 4 | OOD 划分评估 |

（报告里的 test 是 1600 个问题、OOD 是 772 个问题，是 Choice 和 Noul 两类问题加起来的总数，不是单类有这么多题。）

### 训练记录和接口请求的格式类型

我之前差点搞混。按 JevForge 的规范，训练用的 JSONL 除了 `request`，还得有 `targets` 等监督字段。下面是个 Choice 单题的示例：

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

目标分布必须覆盖所有候选，且总和为 1。如果有多个选项都算对，可以直接给正候选分配概率。另外，标签必须有确凿依据，如果用模型生成标签，一定要人工审核，不能把待评估模型的预测直接当真理。

## 3. 跑通训练：遇到的两个大坑

### 依赖安装失败

当时装 `pyarrow` 报错，疑似遇到了系统拦截，但没有保留足够的日志来确定原因。我试着固定版本并换用复制模式重装：

```powershell
uv pip install "pyarrow==17.0.0" --reinstall --no-cache --link-mode=copy
```

当时我还试过关掉系统的智能应用控制，不建议大家完全照做，但确实有效果。遇到这类报错，优先核对报错文件、Python 和 wheel 的兼容性，看看安全中心记录。

### 显存炸了，训练极慢

一开始我把 `microbatch-tokens` 设成 12000，结果观察到专用显存直接占满，开始爆共享内存，速度断崖式下跌。这说明显存压力得优先处理。不过光看任务管理器看不出具体的回退机制，也不能随便给出一个固定降速倍数。

最后我保存的配置是 `microbatch_tokens=4000`。这个参数限制的是输入微批次的 token 预算，因为一道题展开成多个候选后，计算量会飙升。调显存的时候得综合考虑序列长度、候选数、问题批次和微批次预算，不能光看“模型不到 1B”就觉得肯定跑得动。

## 4. 从 200 步验证到 1200 步监督训练

我先跑了 200 步确认链路通了，再开始配置 1200 步的正式训练。下面的命令改用独立输出目录，方便再次运行时保留试跑结果：

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

历史产物我留在了 `runs/my_first_jev`。检查点配置里记了 `seed=17`、Brier 权重 0.5、底座学习率 `2e-5`、打分头学习率 `2e-4`，以及余弦学习率调度。

**重点**：配置写了 1200 步，不代表最终评估用的就是第 1200 步的权重。系统保存的 `best_step` 其实是 **500**，温度为 **1.215**。所以，后面我说的“1200 步运行”，指的是这次完整训练选出来的最优检查点，而不是选择最后一步的权重。

数据作用：dev 用来挑模型，calibration 用来做校准，test 和 OOD 用来出报告。

## 5. 后训练：我实际跑的 RLCD 流程

监督训练完，我接着跑了 RLCD 后训练模块。配置记的是 **`mode=exact`**，跑了 200 步，最优检查点就是第 200 步。这个模式会直接算候选分布下的效用目标，再结合 Brier 项和对监督模型的 KL 约束。

用一个例子说明训练循环（`exact` 模式）：

```text
for step in 1..200:
    for question in batch(6 个问题):
        1. 计算当前模型和固定参考模型的候选分布
        2. 直接计算候选分布下的期望 utility、Brier 和 KL
        3. loss = -utility + 0.5 × Brier + 0.02 × KL
    汇总批次损失，反向传播并更新底座和决策头
    每 50 步：在最多 300 题 dev 集上评估 → 记录 ce/brier/utility/kl/top1
200 步后：加载最佳检查点并拟合温度 → 另行在 test/ood 全量评估
```
主要参数如下：

| 参数 | 值 |
| --- | ---: |
| 训练步数 | 200 |
| 每批问题数 | 6 |
| microbatch token 预算 | 10000 |
| 底座／打分头学习率 | 5e-6 / 5e-5 |
| 效用／Brier／KL 权重 | 1.0 / 0.5 / 0.02 |
| 评估间隔 | 50 步 |
| dev 问题上限 | 300 |
| 随机种子 | 29 |

这是实际保存下来的配置，而且因为训练路径和监督阶段不一样，在其他的设备上不能光凭 token 预算去比显存需求。

后训练结束后，保存的温度是：Choice **1.5915**、Noul **4.8265**。所以，下面展示的结果是**包含了温度校准**的最终流水线结果。

## 6. RLCD结果

下面的数值保留了原记录精度。200 步是我笔记里的数据；1200 步运行和 RLCD 结果与本地两份 `metrics.json` 完全一致。

### Choice：候选选择和概率分配都变好了

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

解释一下：`top1_in_positives` 是看最高概率的选项在不在有效集合里；`exact_gold` 是看它是不是刚好等于指定的 gold。如果有多个有效候选，这俩数值可能不一样。`mass_on_positives` 是所有正候选的概率之和，均匀分布的基线是“正候选数 / 总候选数”，不是固定的 0.20。

跟监督训练相比，RLCD 后的 top-1 在 test 上提了 **2.50 个百分点**，在 OOD 上提了 **5.18 个百分点**，而且分给有效候选的概率质量也高了。OOD 比 test 高不说明 OOD 简单，两个划分的网站和难度本来就不同，重点看同一个划分上的前后对比。

### Noul：准确率没变，概率指标变好了

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

这组结果里，整体准确率没变，但概率指标改善了。准确率相同不代表每一道题的预测都没变。当然，准确率 77% 本身说明不了太多，还得结合类别比例、混淆矩阵和多数类基线一起看。

本地算的二分类 Brier 是预测概率与目标概率的平方误差均值，它衡量的是整体概率预测质量，不仅是校准。如果一直输出 0.5，对硬标签来说它是 0.25。ECE 是按置信度分箱算的（本地分了 10 箱），计算置信度和正确率的加权差异。它下降说明按这种算法得出的校准误差变小了。

这次能直接得出的结论是：**在保存的 test 和 OOD 评估里，Choice 的选择指标提高了，Noul 的准确率持平但概率指标变好了。**

## 7. 预测、评估与本地服务

对最后的检查点，先生成预测，再跑评估。RLCD 的产物在 `runs/my_first_jev_rlcd_v1`：

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

让这个窗口一直开着，然后另开一个 PowerShell 窗口测一下健康状态，顺便发个请求。这里我把 Choice 和 Noul 放在一起测了，免得覆盖变量后读错字段：
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
## 8. 踩坑总结

先用短训练把流程跑通，比一上来就直接运行复杂长训练靠谱得多。但短训练不能只看 loss 降没降，还得把预测、评估和服务加载都走一遍，确保保存的检查点后面能真的用上。

资源管理得盯紧。底座大小、输入长度和候选数量决定了计算量。显存吃紧的时候，看日志、看实际占用去调预算，别光盯着“模型参数量”瞎猜。

最后，所有结论都必须回到保存的配置和报告上。这次复盘我才理清第 500 步才是最佳检查点、RLCD 用的是 `exact` 模式、以及温度校准参与了最终输出。以后每次试跑还是得留独立目录，记好环境版本、命令、数据划分和评估报告，做到不互相覆盖。

## 实现依据

- [JevForge 源码与说明](https://github.com/zwliJay/jev-forge)
- [训练记录格式](https://github.com/zwliJay/jev-forge/blob/main/docs/DATASET.md)
- [候选打分模型实现](https://github.com/zwliJay/jev-forge/blob/main/jevforge/model.py)
- [RLCD 实现](https://github.com/zwliJay/jev-forge/blob/main/jevforge/rlcd.py)

本文的实验数值都基于我这次的本地运行配置与报告，上游链接是为了方便读者追溯代码。
