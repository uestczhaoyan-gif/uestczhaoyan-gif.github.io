# 将 zhaoyanphd.com 关联到主页

初始发布地址为 https://uestczhaoyan-gif.github.io/ 。以下是后续域名切换步骤，准备此文档不表示已改动 DNS。

## 顺序

1. 在 GitHub 个人 Settings → Pages 中添加并验证 `zhaoyanphd.com`，按页面给出的值在 DNS 服务添加 TXT 记录。验证码必须使用该账号实际生成的值。
2. 在主页仓库 Settings → Pages 的 Custom domain 填入 `zhaoyanphd.com`。
3. 在域名实际使用的 DNS 服务添加以下记录（若 DNS 托管在阿里云，则进入该域名的解析设置）。

| 主机记录 | 类型 | 记录值 |
| --- | --- | --- |
| @ | A | 185.199.108.153 |
| @ | A | 185.199.109.153 |
| @ | A | 185.199.110.153 |
| @ | A | 185.199.111.153 |
| www | CNAME | uestczhaoyan-gif.github.io |

保留验证 TXT；以后添加域名邮箱时还会使用 MX、SPF 等记录，网站解析不代替邮箱配置。不要添加通配符记录。

4. 等待 DNS 校验及 HTTPS 证书就绪，再启用 Enforce HTTPS，检查根域名与 www 跳转。
5. 将 `content/site.json` 的 `baseUrl` 改为 `https://zhaoyanphd.com`，同步 README 主链接，重新构建并发布，使 canonical、站点地图与分享地址同步。

本仓库通过自定义 Actions 工作流发布，GitHub 文档说明此方式不需要 CNAME 文件，绑定以 Pages 设置为准。

## 现有项目站点

GitHub 用户主页绑定自定义域名后，同账号未设置独立域名的项目站点会继承该域名。绑定时同时检查已有光研导航的访问和静态资源路径：`/optics-scholar-hub/`。此仓库没有修改光研导航的内容或发布配置。

## 官方依据

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages

DNS 记录核对日期：2026-09-18。
