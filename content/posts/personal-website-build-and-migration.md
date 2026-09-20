# 从个人主页到持续写作空间：建站、HTTPS 排查与 Cloudflare 迁移记录

> 由 GPT‑6 Astra 总结。根据赵岩的需求、仓库实现与本次部署核验整理，记录日期：2026-09-20。本文是协作建站记录，不是赵岩手写的第一人称复盘；涉及平台状态的结论仅代表核验时点。

## 1. 为什么做这个网站

网站最初的目标，是让合作者、招聘者了解赵岩，也给学习、研究和项目复盘一个长期保存的位置。方向包括光芯片与光系统、AI for Optics，同时保留兴趣探索和小项目的空间。因此，页面没有用“博士阶段”限制身份，也没有把网站设计成只在求职时更新的简历。

从样例到实际页面，逐步确定了这些选择：姓名以“赵岩”为主，英文 Zhao Yan 为辅；座右铭、研究方向、教育经历与分组荣誉放在首页；照片放大，网站介绍直接展示正文；项目和博客各展示少量精选内容，再链接到分类总览。荣誉按奖学金、学科竞赛、荣誉培养归组，让信息更容易浏览。

整体采用三级结构：**首页 → 博客／项目总览 → 单篇文章／单个项目**。总览按类别组织，时间用于文章元信息与“最新”排序。视觉参考简洁学术主页方向，但代码独立实现，并非直接安装 al-folio 主题。

## 2. 当前架构：三家服务，各自负责什么

| 组成 | 职责 | 本站配置 |
| --- | --- | --- |
| 阿里云 | 域名注册、实名信息与续费 | 持有 zhaoyanphd.com；修改域名服务器入口仍在这里 |
| GitHub | 内容与代码版本管理 | uestczhaoyan-gif/uestczhaoyan-gif.github.io，main 分支 |
| Cloudflare DNS | 域名解析 | 接管根域名和 www 的有效 DNS 记录 |
| Cloudflare Pages | 自动构建、静态托管与 HTTPS | 项目 zhaoyanphd，正式入口 https://zhaoyanphd.com/ |
| GitHub Pages | 备用发布 | 保留原 Actions 发布流程及 github.io 地址；没有自动故障切换 |

发布链路可以写成：

```text
Markdown 正文 + JSON 索引 + 页面模板和样式
                  ↓ git commit / git push
            GitHub main 分支
                  ↓ 自动拉取
Cloudflare Pages：构建 → 检查 → 发布 dist/
                  ↓
       https://zhaoyanphd.com/

同一提交 → GitHub Actions → GitHub Pages 备用地址
```

网站没有登录后台和数据库，也不需要自己租服务器。Node.js 只参与构建；访问者收到的是 HTML、CSS、JavaScript 和图片。域名注册、DNS、网页托管是不同职责，换托管平台并不意味着需要重新购买域名或迁移代码仓库。

## 3. 仓库如何组织与构建

| 路径 | 用途 |
| --- | --- |
| `content/site.json` | 姓名、研究方向、经历荣誉、照片、联系方式、类别与精选 ID |
| `content/posts.json` | 博客标题、类别、日期、摘要、正文路径及关联项目 |
| `content/posts/*.md` | 博客正文 |
| `content/projects.json` | 项目索引、仓库与演示地址、状态和关联文章 |
| `content/projects/*.md` | 项目介绍正文 |
| `build.mjs` | 校验内容配置、渲染 Markdown、生成页面与站点地图 |
| `check.mjs` | 检查生成页面的本地链接、资源、锚点、重复 ID 与基础元信息 |
| `assets/`、`templates/` | 照片、样式、交互和项目概念图模板 |
| `vendor/` | 本地收录的 Markdown 渲染器及许可证 |
| `dist/` | 构建产物，自动生成，不提交也不直接编辑 |
| `docs/` | 日常维护及域名配置说明 |

本地使用 Node.js 22 或更新版本，部署环境固定 Node.js 24。无需额外安装 npm 依赖，执行：

```sh
node build.mjs
node check.mjs
node server.mjs
```

然后打开 `http://127.0.0.1:4173/`。修改源文件后需要重新构建并刷新；当前预览脚本不提供自动热更新，也不会模拟 Cloudflare 的域名跳转规则。

Cloudflare Pages 的配置为：生产分支 `main`，框架 `None`，构建命令 `node build.mjs && node check.mjs`，输出目录 `dist`，环境变量 `NODE_VERSION=24`。检查失败会使这次构建失败，不应绕过检查直接发布。

这些检查能发现站内路径错误，不能证明外部 GitHub 链接、DNS、证书或不同设备的排版正常；上线之后还要实际访问。

## 4. 最初的 GitHub Pages 部署遇到了什么

最初按计划使用 GitHub Pages 托管，在阿里云给根域名配置 GitHub 的四个 A 记录，并把 www 指向账号的 github.io 地址。页面构建与 HTTP 访问正常，但自定义域名证书长时间停在 `new`。

排查区分了几层问题：DNS 是否指向正确平台、是否有冲突的 A／AAAA／CAA 记录、仓库的自定义域名绑定是否正确、Pages DNS 健康检查是否通过，以及证书是否真正就绪。本次检查中，GitHub 对根域名和 www 给出了有效的 DNS 健康检查结果，HTTPS 资格检查也通过，但证书状态仍未推进。

随后向 GitHub Support 反馈。收到的是当前账号支持范围的说明，未得到证书任务的技术诊断。**因此，不能把这次经历写成“已经证实是 DNS 错误”，也不能断言“已经证实是 GitHub 故障”。准确结论是：可见配置检查通过，但未查明签发任务停滞的内部原因。**

几个值得保留的区别：DNS 校验通过不等于证书已签发；HTTP 返回 200 不等于 HTTPS 正常；采用自定义 GitHub Actions 发布时，不能仅凭仓库没有 CNAME 文件就断言配置错误。相关细节应对照 [GitHub 自定义域名排障文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)。

迁移的目的，是让网站获得可用的 HTTPS，并保留简单的维护方式，而不是把未经确认的根因当成结论。

## 5. 迁移到 Cloudflare Pages 的过程

1. 创建 Cloudflare Pages 项目，连接现有 GitHub 仓库，GitHub 应用授权由账号所有者完成。
2. 设置构建命令、输出目录与 Node.js 版本，先验证 `zhaoyanphd.pages.dev` 可以通过 HTTPS 访问。
3. 在 Cloudflare 添加域名，选择 Free 计划，检查导入的 DNS 记录。
4. 在阿里云将域名服务器改为 `bryce.ns.cloudflare.com` 与 `mia.ns.cloudflare.com`；实名、登录和短信验证由本人处理。
5. 在 Pages 的 Custom domains 中绑定根域名与 www，将原 GitHub 目标替换为 Pages 目标。
6. 等待验证完成，再分别检查控制台状态与真实 HTTPS 请求。

2026-09-20 的实际核验结果：两个域名均显示 **Active / SSL enabled**，根域名与 www 的 HTTPS 请求均通过证书校验；根域名返回 HTTP 200。该结果说明新平台已能够正常提供 HTTPS，不需要再为这次问题购买服务器。

迁移后，阿里云继续负责域名续费，**日常 DNS 记录应在 Cloudflare 修改**。不要把旧的四个 GitHub A 记录再加回当前 Cloudflare 解析，否则会改变服务目标。以后配置域名邮箱，也应在当前有效的 DNS 服务中添加邮箱服务要求的 MX、SPF、DKIM 等记录。

## 6. 两个容易遗漏的收尾问题

### 主域名与 www

www 与根域名都绑定 Pages，但对外统一使用根域名。www 跳转由 Cloudflare 的域名 Redirect Rule 管理，保留路径与查询参数；站内 canonical 和 sitemap 使用 `content/site.json` 中的 `baseUrl`。

这里还核对了平台差异：Pages 的 `_redirects` 文件适合路径跳转，不能把其他平台的域名级规则语法直接照搬过来。具体能力见 [Cloudflare Pages 跳转规则文档](https://developers.cloudflare.com/pages/configuration/redirects/)。

### 光研导航的旧入口

GitHub 用户主页绑定自定义域名时，部分同账号项目站点会继承该域名。若只迁移主页，旧的 `/optics-scholar-hub/` 入口可能失效，甚至因为旧域名绑定造成跳转循环。

这次移除了 GitHub Pages 的旧自定义域名绑定，保留其默认地址。光研导航仍在原 GitHub 项目站点运行；主页构建额外生成两条路径跳转，兼容带斜杠和不带斜杠的旧入口，并保留后续路径。没有修改光研导航本身的仓库内容。迁移过程中已验证其 GitHub 默认入口返回 200。

## 7. 以后如何新增或修改博客

以写一篇波导笔记为例：

1. 在 `content/posts/` 新建 `waveguide-notes.md`，用 Markdown 写正文。
2. 在 `content/posts.json` 数组中增加文章索引，注意相邻对象之间需要逗号。
3. 构建并检查，预览文章、目录与图片。
4. 提交并推送到 `main`，在 Cloudflare Deployments 确认发布成功，再打开线上文章。

```json
{
  "id": "waveguide-notes",
  "title": "波导学习笔记",
  "category": "学习笔记",
  "topic": "集成光子学",
  "published": "2026-09-20",
  "updated": "2026-09-20",
  "summary": "记录波导模式与边界条件的学习过程。",
  "body": "posts/waveguide-notes.md",
  "relatedProjects": []
}
```

`id` 使用小写英文、数字和短横线，它决定文章链接，发布后尽量不改。类别必须出现在 `site.json` 的 `postCategories` 中。`published` 是本站发布日期，修改旧文章通常只更新 `updated`。如需首页精选，把 ID 加到 `featuredPosts`，最多三个；只添加正文文件不会自动进入博客列表。

文章可以包含标题、列表、表格、链接、图片和代码块。图片放在 `assets/posts/`，正文示例写法为 `![示意图](../../assets/posts/example.png)`，使用前需要实际添加该图片。当前没有 LaTeX 公式渲染模块；复杂公式可先用图片或另行增加渲染支持。

这篇协作记录使用了可选的 `author` 字段，以便文章署名明确显示“GPT‑6 Astra（总结）”。未填写该字段的原有文章继续显示网站作者赵岩。

## 8. 更新主页、照片和项目

个人信息直接修改 `content/site.json`。照片文件放进 `assets/`，`photo` 填相对于该目录的文件名；照片过大时宜先压缩，避免拖慢首次加载。新增账户应同时核对配置字段与页面模板是否支持，不是随意增加一个 JSON 字段就会显示出来。

新增项目需要同时维护 `content/projects.json` 与对应 Markdown 正文。项目的 `repository` 指向源代码，`website` 是可选演示入口；`relatedPosts` 填博客 ID，博客的 `relatedProjects` 填项目 ID。两侧关系独立维护，需要互相展示时两边都填。

精选顺序由 `featuredProjects`／`featuredPosts` 决定；分类由类别数组决定。想改配色、间距、响应式布局时编辑 `assets/style.css`；想改页面结构时编辑 `build.mjs`，改完再看桌面与手机宽度。

## 9. 提交、发布失败与回退

少量文字可以直接在 GitHub 网页编辑并提交。多文件更新更适合本地完成，以免正文和索引分开提交造成一次短暂的失败部署。使用本地 Git 时，先确认工作区没有需要保留的未提交修改，再同步远端：

```sh
git status
git pull --ff-only
# 修改正文与索引后执行
node build.mjs
node check.mjs
git add content/posts/waveguide-notes.md content/posts.json
git commit -m "Add waveguide study notes"
git push origin main
```

如果还修改了主页精选或图片，把实际修改的那些文件一并添加。示例路径只是示范，不要在文件尚不存在时原样执行。若 `git pull --ff-only` 失败，先检查分支差异，不能用强制覆盖解决。

推送成功只表示代码到了 GitHub，并不代表 Cloudflare 已经发布。查看对应提交的部署日志：JSON 格式错误、类别或关联 ID 不存在、本地资源缺失等，应先修复源文件，再构建与推送。GitHub Actions 是备用站点的检查入口，Cloudflare Deployments 才是正式站点的发布入口。

需要撤销已发布内容时，优先在 GitHub 或本地对明确的错误提交做 revert，生成新的撤销提交并推送，让仓库与正式站点保持一致。不要清空仓库或删除历史来回退。更换域名或 DNS 则属于独立操作，应按域名维护文档核对，单纯恢复一条 Git 提交不会恢复控制台的设置。

## 10. 这次建站留下的方法

先让平台默认地址可用，再绑定自定义域名，可以将“构建失败”与“域名问题”分开定位。检查证书时，同时看平台状态与真实连接，不把等待中的状态写成成功。换平台时除了检查首页，还要覆盖文章、图片和已有项目入口。最后，把可执行的维护步骤留在仓库里，网站才能持续更新，而不只是完成一次上线。

这篇文章保存当时的经过；今后具体参数发生变化，以仓库中的 `docs/MAINTENANCE.md`、`docs/DOMAIN.md` 与平台实际配置为准。
