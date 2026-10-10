# 网站维护

## 更新个人资料

编辑 `content/site.json`。`education` 为教育经历，`honors` 为荣誉列表。没有内容的条目直接不添加，不需要显示“待补充”。

照片放在 `assets/` 下，例如 `assets/profile.jpg`，将 `photo` 设置为 `"profile.jpg"`。`null` 表示继续使用 ZY 字母图案。照片下方没有阶段标签。

## 新增博客

1. 在 `content/posts/` 下新建 Markdown 文件，例如 `waveguide-notes.md`。
2. 在 `content/posts.json` 数组中增加一条记录。`id` 使用小写英文、数字和短横线，发布后尽量不改，避免旧链接失效。

```json
{
  "id": "waveguide-notes",
  "title": "波导学习笔记",
  "category": "知识笔记",
  "topic": "集成光子学",
  "published": "2026-09-20",
  "updated": "2026-09-20",
  "summary": "用一两句话说明文章解决的问题。",
  "body": "posts/waveguide-notes.md",
  "relatedProjects": []
}
```

分类须存在于 `site.json` 的 `postCategories`，可自行添加新分类。博客的四个分类始终显示；没有文章时显示数量 0 和空状态说明。

正文首行可写 `# 文章标题`（构建时避免重复显示），大节用 `##`，小节用 `###`。标题自动生成目录。支持链接、图片、代码块、列表与表格。当前未集成 LaTeX 数学公式渲染；普通上下标可用 HTML，复杂公式可先放本地 SVG/PNG。

正文图片可放 `assets/posts/`，文章中使用相对页面路径，例如 `![示意图](../../assets/posts/example.png)`。

## 新增项目

在 `content/projects/` 新建 Markdown，仿照现有记录补充 `projects.json`。`repository` 是 GitHub 链接，`website` 为可选在线演示地址。`relatedPosts` 填文章 ID。现有封面类型：`network`、`scan`、`catalog`、`persona`、`website`。

新增类别时先加入 `site.json` 的 `projectCategories`。不要为了凑栏目填写尚不存在的成果。

## 精选与最新

`featuredProjects` 和 `featuredPosts` 填对应的 ID，最多三项，顺序就是首页顺序。「最新」按 `updated` 倒序，不会根据 Git 提交时间自动改变。更新正文后需要时同步修改日期。

## 检查与上线

```sh
node build.mjs
node check.mjs
```

检查通过后提交并推送到 `main`。Cloudflare Pages 的 `zhaoyanphd` 项目会自动构建并发布正式站点；到 Cloudflare 的 Deployments 查看发布结果。GitHub Actions 继续检查和发布备用站点。`dist/` 不提交，由平台自动生成。

第一次操作 Git 时可先用 GitHub 网页编辑少量文本；网页提交同样触发发布。涉及版式或较多内容时先本地预览。

## 文章署名与建站记录

文章索引可选填 `authors` 数组，例如 `["赵岩", "DeepSeek"]`，按第一作者、第二作者的顺序展示；不填时显示赵岩，也兼容旧 `author` 字段。AI 总结的文章应明确署名，并在正文说明来源。完整建站经过见 [建站与迁移记录](../content/posts/personal-website-build-and-migration.md)。域名与证书设置见 [域名维护](DOMAIN.md)。

## 博客分类与实验记录

博客索引 `content/posts.json` 中每篇文章通过 `category` 归类，分为“项目实践”（项目开发与建设复盘）、“成长随笔”（个人经历复盘与想法）、“实验记录”（仪器操作与实验过程）、“知识笔记”（概念、原理与知识梳理）。使用 `content/site.json` 的 `postCategories` 中已有的类别；博客顶部按类别筛选，点击“全部”恢复全部文章。无需另外维护标签。

实验记录正文位于 `content/posts/laboratory-instrument-notes.md`，配图放在 `assets/posts/laboratory-instrument-notes/`。后续在原文对应仪器章节补充步骤、参数和新图，并同步修改索引的 `updated` 日期；新增仪器可沿用文末模板。公开资料不要包含电脑密码、账号凭据等内容。原始 PPT 保留在本地，未上传到公开仓库。

## 每次发布的关联信息复核（2026-10-10）

`node check.mjs` 会自动执行 `review-updates.mjs`：项目与博客双向关联缺失时阻止发布；按改动文件输出需要人工复核的标题、摘要、正文、日期、项目来源、首页展示与维护文档。GitHub Actions 同时把清单写入运行摘要，Cloudflare 构建日志中也可查看。

默认比较上一提交与当前工作区，包含未提交和新增文件；批量提交时可以设置 `REVIEW_BASE` 为更新前的提交。没有可用 Git 历史时输出完整复核清单。关联提示不会自动修改正文，也不等于内容已核实。

- 更新项目后检查仓库与在线页面，同步 `projects.json` 的摘要、状态、网址和 Markdown 详情；`sourceChecked` 是实际核对日期，`sourceRevision` 可记录依据的提交。
- 新增博客后判断是否关联已有项目，并同步两侧 `relatedProjects` / `relatedPosts`；检查首页精选是否仍合适。
- 改变部署、更新方式或隐私处理后检查 README、维护说明和建站博客，历史文章用日期补记。
- 只更新外部项目仓库，不会触发本主页的检查。项目完成一个版本后，需要在这里复核介绍；此机制没有后台定时监控，也不自动复制外部 README。

发布前处理清单中的相关项；发布后确认实际网页。卡片与总览共用 JSON 数据，无需手工重复修改生成的 HTML。

## 社交联系方式（2026-10-10）

`content/site.json` 的 `socialContact` 维护二维码替代文本所用昵称、联系说明、B站主页和小红书／抖音／QQ账号。平台入口与邮箱尽量同排，窄屏自动换行，不单独展示昵称行，点击显示账号并复制；微信图片由 `wechatImage` 指定，点击展开。只上传了用户提供的微信加好友图片，其他截图不公开。联系方式是用户明确授权公开的信息，收起界面不代表私密存储；更换二维码后需实测扫码，构建无法判断二维码是否过期。

样式与交互资源链接带内容摘要版本号，修改后自动更新，避免浏览器沿用旧缓存导致新组件失去样式。
