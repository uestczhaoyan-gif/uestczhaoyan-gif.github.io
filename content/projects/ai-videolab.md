## 把想法变成一段视频

VideoLab 是一个本地优先的命令行视频制作项目：从主题出发，选择视频类型、时长与画幅，生成风格帧，再渲染视频并保存项目记录。它也可以交给已有 AI Agent 读取和协助使用。

## 当前实现

- 文字与图形动效：将主题组织成卡片式画面，提供 blueprint、bauhaus 与 ink-wash 三种已接入的风格模板。
- 数据解释：使用提供的数据、单位与来源生成条形图视频。
- 产品介绍：用真实产品截图组织演示画面。
- 输出视频、联系表与 QA 记录，并整理可复用的风格、提示词和制作资源。

## 使用与阶段

已发布 [v0.2.0 CLI 初版](https://github.com/uestczhaoyan-gif/AI-VideoLab/releases/tag/v0.2.0)。运行需要 Node.js 22+、Chrome 或 Edge 及 FFmpeg；按 [README](https://github.com/uestczhaoyan-gif/AI-VideoLab#readme) 安装依赖并准备资源后，通过 `npm run make` 开始制作。

当前可直接执行的是三条本地制作流程，其余资源需要另行准备或适配。项目没有网页工作台，也不提供在线生成服务；内容准确性和最终观感由创作者确认。本页依据 README 与发布说明整理，未在此重新渲染验收视频。
