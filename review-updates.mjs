import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = name => JSON.parse(fs.readFileSync(`content/${name}.json`, 'utf8'));
const projects = read('projects'), posts = read('posts');
for (const [items, others, forward, reverse] of [
  [projects, posts, 'relatedPosts', 'relatedProjects'],
  [posts, projects, 'relatedProjects', 'relatedPosts']
]) for (const item of items) for (const id of item[forward] || []) {
  const other = others.find(entry => entry.id === id);
  if (!other || !other[reverse]?.includes(item.id))
    throw new Error(`关联不一致：${item.id} → ${id}，请同步 ${forward} / ${reverse}`);
}

const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const base = process.env.REVIEW_BASE || 'HEAD~1';
let changed;
try {
  // Include the latest commit plus staged, unstaged and untracked source changes.
  changed = new Set([
    ...git(['diff', '--name-only', base, '--']).trim().split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).trim().split('\n')
  ]);
} catch {
  changed = new Set(['content/projects.json', 'content/posts.json', 'content/site.json']);
  console.log('未取得 Git 比较基线，输出完整内容复核清单。');
}
const notes = new Set();
for (const [items, index, relation] of [[projects, 'projects', 'relatedPosts'], [posts, 'posts', 'relatedProjects']]) {
  let previous;
  try { previous = JSON.parse(git(['show', `${base}:content/${index}.json`])); } catch {}
  if (previous?.some(old => !items.some(item => item.id === old.id)))
    notes.add(`${index} 有条目删除：核对旧链接、关联关系和首页精选是否需要调整。`);
  for (const item of items) if ((changed.has(`content/${index}.json`) && (!previous || JSON.stringify(previous.find(old => old.id === item.id)) !== JSON.stringify(item))) || changed.has(`content/${item.body}`)) {
    notes.add(`${item.title}：核对标题、摘要、正文、状态／日期及首页精选；关联条目：${item[relation]?.join('、') || '无（确认是否需要新增）'}。`);
    if (index === 'projects') notes.add(`${item.title}：对照源仓库 README／版本说明和在线页面；实际核对后才更新 sourceChecked。`);
  }
}
if (changed.has('content/site.json') || [...changed].some(file => file.startsWith('assets/')))
  notes.add('个人资料／资源：核对首页、公开联系方式、图片元数据以及文章中的引用。');
if ([...changed].some(file => /^(build\.mjs|check\.mjs|review-updates\.mjs|\.github\/|docs\/)/.test(file)))
  notes.add('架构／维护流程：核对 README、维护文档、建站博客；历史经过不改写，当前操作变化另加更新说明。');
const report = ['## 关联信息复核', ...[...notes].map(note => `- ${note}`), '', '关联结构校验通过。以上是人工复核提示，不代表内容准确性已自动确认；其他项目仓库的更新不会自动触发本仓库构建。'].join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
