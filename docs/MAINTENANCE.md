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
  "category": "学习笔记",
  "topic": "集成光子学",
  "published": "2026-09-20",
  "updated": "2026-09-20",
  "summary": "用一两句话说明文章解决的问题。",
  "body": "posts/waveguide-notes.md",
  "relatedProjects": []
}
```

分类须存在于 `site.json` 的 `postCategories`，可自行添加新分类。没有文章的分类不会显示。

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
