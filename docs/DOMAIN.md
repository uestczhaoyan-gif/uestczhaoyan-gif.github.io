# 域名与 HTTPS 维护

配置核验日期：2026-09-20。正式站点 https://zhaoyanphd.com/ 已由 Cloudflare Pages 托管。根域名和 www 均显示 Active / SSL enabled，实际 HTTPS 请求通过证书校验。原 GitHub 证书停滞的内部原因没有得到明确诊断。

## 服务与配置

- 阿里云：域名注册、实名资料、续费、修改域名服务器。
- Cloudflare：有效 DNS、Pages 正式部署、HTTPS 与域名跳转。
- GitHub：代码和内容、Actions 检查及 GitHub Pages 备用发布；没有自动故障切换。

阿里云保存的域名服务器为 `bryce.ns.cloudflare.com`、`mia.ns.cloudflare.com`。

| 主机 | 类型 | 目标 |
| --- | --- | --- |
| @ | CNAME | zhaoyanphd.pages.dev |
| www | CNAME | zhaoyanphd.pages.dev |

根域名 CNAME 由 Cloudflare 处理，公共查询可能返回 A/AAAA。今后在 Cloudflare 修改 DNS，不要把旧 GitHub 四个 A 记录加入当前解析。邮箱的 MX、SPF、DKIM 等记录也应按邮箱服务要求添加到当前 DNS。

Pages 项目 `zhaoyanphd` 连接仓库 `uestczhaoyan-gif/uestczhaoyan-gif.github.io` 的 main 分支，构建命令 `node build.mjs && node check.mjs`，输出 `dist`，环境变量 `NODE_VERSION=24`。

- 正式入口：https://zhaoyanphd.com/
- Pages 默认入口：https://zhaoyanphd.pages.dev/
- GitHub 备用入口：https://uestczhaoyan-gif.github.io/

www 由 Cloudflare Redirect Rule `WWW to primary HTTPS domain` 以 301 跳到根域名，保留路径与查询参数。域名级跳转在控制台维护，不能照搬到 Pages `_redirects`。SSL/TLS 模式为 Full (strict)。

## 既有项目入口

GitHub Pages Custom domain 已清空，以解除旧域名继承。光研导航继续位于 https://uestczhaoyan-gif.github.io/optics-scholar-hub/ 。`build.mjs` 生成 `_redirects`，将旧 `/optics-scholar-hub` 和 `/optics-scholar-hub/*` 以 302 跳转过去。未修改光研导航仓库本身。不要重新绑定 GitHub 自定义域名而不检查这些跳转，否则可能循环。

## 排查与回退

1. 先看 Pages 对应提交的 Deployments 是否成功；默认 pages.dev 不可用时先检查构建日志。
2. 自定义域名单独异常时，看 Custom domains，再检查 DNS 与域名服务器。
3. 实际验证 HTTPS、www 跳转、文章、图片与旧项目入口，不关闭证书校验。
4. 个别网络异常时检查 DNS 缓存与解析结果，不凭等待时间反复改记录。
5. 回退代码可使用 revert；控制台设置不会随 Git 回退，换平台前应保存当前 DNS 与域名绑定记录。

完整经过见 [建站与迁移记录](../content/posts/personal-website-build-and-migration.md)。旧 GitHub DNS 配置属于历史方案，不是当前操作指引。

## 官方资料

- [Cloudflare Pages 自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Pages 路径跳转](https://developers.cloudflare.com/pages/configuration/redirects/)
- [GitHub 自定义域名排障](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)
