import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(path.join(dir,x.name)):[path.join(dir,x.name)]);}
const pages=files(root).filter(x=>x.endsWith('.html'));
let count=0;
for(const file of pages){
 const html=fs.readFileSync(file,'utf8');
 for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(/^(data:|https?:|mailto:)/.test(url))continue;
  const [relative,fragment]=url.split('#');
  const target=relative?(relative.startsWith('/')?path.resolve(root,'.'+relative):path.resolve(path.dirname(file),relative)):file;
  if(!fs.existsSync(target))throw new Error(`Missing link: ${file} -> ${url}`);
  if(fragment&&!fs.readFileSync(target,'utf8').includes(`id="${fragment}"`))throw new Error(`Missing anchor: ${url}`);
  count++;
 }
}
for(const file of pages){
 const html=fs.readFileSync(file,'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 if(new Set(ids).size!==ids.length)throw new Error(`Duplicate HTML ID: ${file}`);
 if(/设计样例|YOUR PHOTO HERE|待填写|示例项目|示例文章/.test(html))throw new Error(`Demo content remains: ${file}`);
 if(!html.includes('<html lang="zh-CN">')||!html.includes('<title>'))throw new Error(`Missing metadata: ${file}`);
}
console.log(`PASS: ${pages.length} pages, ${count} local links/assets/anchors.`);
