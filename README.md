# Zhao Yan · 个人主页与技术博客

赵岩的个人网站，关注光芯片与光系统、AI for Optics，记录研究实践、项目与学习复盘。

[访问主页](https://uestczhaoyan-gif.github.io/) · [GitHub](https://github.com/uestczhaoyan-gif)

页面参考 al-folio 的简洁学术主页视觉方向独立实现，并非 al-folio 主题安装版。项目和博客采用「首页 → 分类总览 → 详情」结构；经历与荣誉直接展示在首页。

## 本地运行

需要 Node.js 22 或更新版本，无需安装依赖。

```sh
node build.mjs
node check.mjs
node server.mjs
```

打开 http://127.0.0.1:4173 。修改内容后重新运行构建并刷新浏览器。`dist/` 是自动生成目录，不要直接编辑。

## 日常更新

| 内容 | 编辑位置 |
| --- | --- |
| 姓名、座右铭、研究方向、经历、荣誉、邮箱 | `content/site.json` |
| 首页精选条目及顺序 | `featuredProjects` / `featuredPosts`，最多三项 |
| 项目标题、类别、仓库入口、更新时间 | `content/projects.json` |
| 项目介绍正文 | `content/projects/*.md` |
| 博客标题、类别、摘要、发布日期 | `content/posts.json` |
| 博客正文 | `content/posts/*.md` |
| 样式与交互 | `assets/style.css` / `assets/app.js` |

完整步骤见 [维护说明](docs/MAINTENANCE.md)。日期用于「最新」排序与文章元信息，总览始终按类别组织。

## 发布

仓库使用 GitHub Actions 构建、检查并部署 GitHub Pages。推送到 `main` 会触发发布；拉取请求只检查，不部署。Pages 的发布来源应设为 GitHub Actions。

自定义域名计划为 `zhaoyanphd.com`，解析与绑定步骤见 [域名配置](docs/DOMAIN.md)。域名准备完成前使用上方 GitHub Pages 地址。

## 内容与技术说明

- 项目简介依据相应公开仓库 README 整理，核对日期为 2026-09-18。阶段性验证范围见各项目页面；封面为概念示意图，不是实验结果。
- 首篇博客保留作者原文，仅规范标题层级、列表空格和段落排版。文中的发布日指本站发布日期。
- 尚未提供照片时显示姓名字母图案；不使用他人照片。
- Markdown 渲染器为本地收录的 marked 17.0.5，保留 [上游许可证](vendor/marked.LICENSE.md)，无需 CDN。
- 博客、个人资料及图片的内容权利归各自权利人；依赖按其原许可证使用。
