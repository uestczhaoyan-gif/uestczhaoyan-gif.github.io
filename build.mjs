import fs from 'node:fs';
import path from 'node:path';
import { Marked } from './vendor/marked.esm.js';
import { art } from './templates/art.mjs';

const root = process.cwd();
const output = path.resolve(root, 'dist');
const contentRoot = path.resolve(root, 'content');
const readJson = name => JSON.parse(fs.readFileSync(path.join(contentRoot, name), 'utf8'));
const site = readJson('site.json');
const projects = readJson('projects.json');
const posts = readJson('posts.json');
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const baseUrl = site.baseUrl.replace(/\/$/, '');
const routes = [];
function assert(value, message) { if (!value) throw new Error(message); }
function validUrl(value) { return /^https:\/\//.test(value) && new URL(value).protocol === 'https:'; }
assert(validUrl(baseUrl) && validUrl(site.github) && validUrl(site.repository), 'Invalid site URL');
for (const [items, categories] of [[projects, site.projectCategories], [posts, site.postCategories]]) {
  const ids = new Set();
  for (const item of items) {
    assert(/^[a-z0-9-]+$/.test(item.id) && !ids.has(item.id), `Duplicate or invalid ID: ${item.id}`);
    ids.add(item.id);
    assert(categories.includes(item.category), `Unknown category: ${item.category}`);
    assert(item.title && item.summary, `Missing title/summary: ${item.id}`);
    for (const field of ['published', 'updated']) if (item[field]) assert(/^\d{4}-\d{2}-\d{2}$/.test(item[field]) && !Number.isNaN(Date.parse(item[field])), `Invalid date: ${item.id}`);
    for (const field of ['repository', 'website']) if (item[field]) assert(validUrl(item[field]), `Invalid URL: ${item.id}`);
  }
}
for (const [chosen, items] of [[site.featuredProjects, projects], [site.featuredPosts, posts]]) {
  assert(chosen.length <= 3 && new Set(chosen).size === chosen.length, 'Choose up to three unique featured IDs');
  for (const id of chosen) assert(items.some(x => x.id === id), `Missing featured item: ${id}`);
}
for (const project of projects) for (const id of project.relatedPosts) assert(posts.some(x => x.id === id), `Unknown related post: ${id}`);
for (const post of posts) for (const id of post.relatedProjects) assert(projects.some(x => x.id === id), `Unknown related project: ${id}`);

function markdown(file) {
  const sourcePath = path.resolve(contentRoot, file);
  assert(sourcePath.startsWith(contentRoot + path.sep), 'Content path escapes content directory');
  const body = fs.readFileSync(sourcePath, 'utf8').replace(/^# [^\n]+\n+/, '');
  const toc = [];
  const parser = new Marked({ gfm: true, renderer: {
    heading(token) {
      const id = `section-${toc.length + 1}`;
      toc.push({ id, depth: token.depth, title: token.text.replace(/[*_`]/g, '') });
      return `<h${token.depth} id="${id}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
    }
  } });
  return { html: parser.parse(body), toc, read: `${Math.max(1, Math.ceil(body.replace(/\s/g, '').length / 400))} 分钟` };
}
for (const entry of [...projects, ...posts]) Object.assign(entry, markdown(entry.body));

// Clean generated files only, after verifying the destination. Sources live outside dist/.
assert(output === path.join(root, 'dist'), 'Unexpected output directory');
function clean(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.resolve(dir, entry.name);
    assert(target.startsWith(output + path.sep) && !entry.isSymbolicLink(), 'Unexpected output path');
    if (entry.isDirectory()) clean(target); else fs.unlinkSync(target);
  }
}
clean(output);
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
function write(file, data) {
  fs.mkdirSync(path.dirname(path.join(output, file)), { recursive: true });
  fs.writeFileSync(path.join(output, file), data);
}
function external(url, label, className = '') {
  return `<a class="${className}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`;
}
function shell(title, active, body, file = 'index.html', description = site.purpose) {
  const depth = file.split('/').length - 1;
  const prefix = file === '404.html' ? '/' : '../'.repeat(depth) || './';
  const canonical = `${baseUrl}/${file.replace(/index\.html$/, '')}`;
  if (file !== '404.html') routes.push(canonical);
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${esc(site.name)}</title><meta name="description" content="${esc(description)}">
${file === '404.html' ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta property="og:title" content="${esc(title)} · ${esc(site.name)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${active === 'blog' && depth === 2 ? 'article' : 'website'}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:locale" content="zh_CN">
<link rel="icon" type="image/svg+xml" href="${prefix}assets/favicon.svg"><link rel="stylesheet" href="${prefix}assets/style.css"><script src="${prefix}assets/app.js" defer></script></head>
<body><a class="skip" href="#main">跳转到正文</a><header><div class="nav-wrap"><a class="brand" href="${prefix}index.html">Zhao <strong>Yan</strong><span class="brand-dot">.</span></a><nav aria-label="主导航">${[['home', '首页', 'index.html'], ['projects', '项目', 'projects/index.html'], ['blog', '博客', 'blog/index.html']].map(([id, label, url]) => `<a href="${prefix}${url}" ${active === id ? 'aria-current="page"' : ''}>${label}</a>`).join('')}<button class="theme" aria-label="切换深色模式" title="切换配色">◐</button></nav></div></header>
<main id="main">${body}</main><footer><span>© ${new Date().getFullYear()} ${esc(site.name)} <span class="footer-dot">·</span> 学习，探索，记录。</span>${external(site.repository, '本站源码')}</footer></body></html>`;
}
function projectCard(item, prefix = '') {
  return `<a class="project-card" href="${prefix}projects/${item.id}/index.html"><div class="project-art">${art(item.art)}</div><div class="card-body"><span class="eyebrow">${esc(item.category)}</span><h3>${esc(item.title)}<span class="arrow" aria-hidden="true">↗</span></h3><p>${esc(item.summary)}</p><span class="tools">${esc(item.tools)}</span></div></a>`;
}
function postRow(item, prefix = '') {
  return `<a class="post-row" href="${prefix}blog/${item.id}/index.html"><div><span class="eyebrow">${esc(item.category)}<span class="muted"> / ${esc(item.topic)}</span></span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p></div><span class="post-meta">${esc(item.read)}<span aria-hidden="true">↗</span></span></a>`;
}
function homeSection(type, label, english, items, ids, render) {
  const featured = ids.length ? ids.map(id => items.find(x => x.id === id)) : items.slice(0, 3);
  const latest = [...items].sort((a, b) => (b.updated || b.published).localeCompare(a.updated || a.published)).slice(0, 3);
  return `<section class="home-section" data-showcase><div class="section-head"><h2>${label}<span>${english}</span></h2><div class="section-actions">${items.length > 1 ? `<div class="segmented" aria-label="${label}展示方式"><button data-mode="featured" aria-pressed="true">精选</button><button data-mode="latest" aria-pressed="false">最新</button></div>` : ''}<a class="all-link" href="${type}/index.html">全部${label} <span>→</span></a></div></div><div class="${type === 'projects' ? 'project-grid' : 'post-list'}" data-panel="featured">${featured.length ? featured.map(item => render(item)).join('') : '<p class="muted">内容正在整理中。</p>'}</div><div class="${type === 'projects' ? 'project-grid' : 'post-list'}" data-panel="latest" hidden>${latest.map(item => render(item)).join('')}</div></section>`;
}
const portrait = site.photo
  ? `<img class="portrait-photo" src="./assets/${esc(site.photo)}" alt="${esc(site.name)} 的个人照片">`
  : '<div class="portrait" role="img" aria-label="Zhao Yan 的姓名字母图案"><div class="portrait-lines"></div><span class="portrait-monogram">ZY</span></div>';
const intro = `<section class="intro intro-revised intro-live"><div class="intro-copy"><div class="intro-heading"><h1>Zhao <strong>Yan</strong><span class="name-dot">.</span></h1><p class="intro-motto">${esc(site.motto)}</p></div><div class="intro-details"><dl class="about-list"><div><dt>研究方向</dt><dd><span class="accent">${esc(site.research)}</span></dd></div><div><dt>教育经历</dt><dd class="education-list">${site.education.map(e => `<div><span class="education-period">${esc(e.period)}</span><div><strong>${esc(e.school)}</strong><span>${esc(e.degree)}</span></div></div>`).join('')}</dd></div><div><dt>荣誉与奖励</dt><dd><ul class="honors-list">${site.honors.map(h => `<li>${esc(h)}</li>`).join('')}</ul></dd></div><div><dt>网站目标</dt><dd>${esc(site.purpose)}</dd></div></dl><div class="socials" aria-label="其他账号">${external(site.github, 'GitHub', 'profile-link')}<a href="mailto:${esc(site.email)}" class="profile-link">${esc(site.email)} <span aria-hidden="true">↗</span></a></div></div></div><aside class="profile">${portrait}</aside></section>`;
write('index.html', shell('首页', 'home', intro + homeSection('projects', '项目', 'Selected work', projects, site.featuredProjects, projectCard) + homeSection('blog', '博客', 'Notes & thoughts', posts, site.featuredPosts, postRow)));
function overview(type, title, english, description, items, categories, render) {
  const available = categories.filter(category => items.some(item => item.category === category));
  const file = `${type}/index.html`;
  const body = `<div class="breadcrumb"><a href="../index.html">首页</a><span>/</span>${title}</div><div class="page-heading"><span class="kicker">${english}</span><h1>${title}<span class="name-dot">.</span></h1><p>${description}</p></div>${available.length > 1 ? `<div class="filters" aria-label="按类别筛选"><button data-filter="all" aria-pressed="true">全部 <span>${items.length}</span></button>${available.map(category => `<button data-filter="${esc(category)}" aria-pressed="false">${esc(category)} <span>${items.filter(item => item.category === category).length}</span></button>`).join('')}</div>` : ''}<div class="category-groups">${available.map(category => `<section class="category-group" data-category="${esc(category)}"><div class="category-title"><h2>${esc(category)}</h2><span>${String(items.filter(item => item.category === category).length).padStart(2, '0')}</span></div><div class="${type === 'projects' ? 'overview-projects' : 'post-list'}">${items.filter(item => item.category === category).map(item => render(item, '../')).join('')}</div></section>`).join('') || '<p class="muted">内容正在整理中。</p>'}</div><p class="filter-status sr-only" aria-live="polite"></p>`;
  write(file, shell(title, type, body, file, description));
}
overview('projects', '项目', 'PROJECTS', '从研究与实验，到工具和兴趣探索。', projects, site.projectCategories, projectCard);
overview('blog', '博客', 'BLOG', '把学到的知识写清楚，也为尚未解答的问题留一个位置。', posts, site.postCategories, postRow);
const toc = entry => `<div class="toc"><span>本页目录</span>${entry.toc.map(h => `<a class="toc-depth-${h.depth}" href="#${h.id}">${esc(h.title)}</a>`).join('')}</div>`;
for (const item of projects) {
  const file = `projects/${item.id}/index.html`;
  const body = `<div class="breadcrumb"><a href="../../index.html">首页</a><span>/</span><a href="../index.html">项目</a><span>/</span>${esc(item.category)}</div><div class="detail-heading"><span class="kicker">${esc(item.category)}</span><h1>${esc(item.title)}</h1><p>${esc(item.englishTitle)}</p><div class="tags"><span>${esc(item.status)}</span></div><div class="project-links">${external(item.repository, 'GitHub 仓库', 'primary-link')}${item.website ? external(item.website, '在线使用', 'secondary-link') : ''}</div></div><figure class="project-figure"><div class="detail-art">${art(item.art)}</div><figcaption>项目概念示意图</figcaption></figure><div class="article-layout"><article class="markdown-body">${item.html}${item.relatedPosts.length ? `<section class="related-content"><h2>相关博客</h2>${item.relatedPosts.map(id => postRow(posts.find(post => post.id === id), '../../')).join('')}</section>` : ''}<a class="back-link" href="../index.html">← 返回全部项目</a></article><aside class="article-sidebar"><h3>项目档案</h3><dl><dt>方向</dt><dd>${esc(item.category)}</dd><dt>工具与方法</dt><dd>${esc(item.tools)}</dd><dt>状态</dt><dd>${esc(item.status)}</dd><dt>最近更新</dt><dd>${esc(item.updated)}</dd></dl>${toc(item)}</aside></div>`;
  write(file, shell(item.title, 'projects', body, file, item.summary));
}
for (const item of posts) {
  const file = `blog/${item.id}/index.html`;
  const body = `<div class="breadcrumb"><a href="../../index.html">首页</a><span>/</span><a href="../index.html">博客</a><span>/</span>${esc(item.category)}</div><div class="detail-heading"><span class="kicker">${esc(item.category)} / ${esc(item.topic)}</span><h1>${esc(item.title)}</h1><p class="article-meta">${esc(site.name)} <span>·</span> 阅读约 ${esc(item.read)} <span>·</span> 发布于 <time datetime="${item.published}">${item.published}</time></p></div><div class="article-layout"><article class="markdown-body">${item.html}${item.relatedProjects.length ? `<div class="related-project"><span class="eyebrow">相关项目</span>${item.relatedProjects.map(id => `<a href="../../projects/${id}/index.html">${esc(projects.find(p => p.id === id).title)} →</a>`).join('')}</div>` : ''}<a class="back-link" href="../index.html">← 返回全部博客</a></article><aside class="article-sidebar blog-sidebar">${toc(item)}</aside></div>`;
  write(file, shell(item.title, 'blog', body, file, item.summary));
}
write('404.html', shell('页面未找到', '', '<section class="page-heading"><span class="kicker">404</span><h1>这个页面暂时找不到。</h1><p>你可以返回首页，继续浏览项目与博客。</p><a class="all-link" href="/index.html">返回首页 →</a></section>', '404.html'));
write('.nojekyll', '');
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(url => `<url><loc>${esc(url)}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${routes.length + 1} pages in ${output}`);
