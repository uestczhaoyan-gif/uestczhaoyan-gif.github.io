document.querySelectorAll('[data-showcase]').forEach(section=>{
  section.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    section.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    section.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==button.dataset.mode);
  }));
});
const categoryButtons=[...document.querySelectorAll('[data-filter]')];
categoryButtons.forEach(button=>button.addEventListener('click',()=>{
  categoryButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  let count=0;
  document.querySelectorAll('[data-category]').forEach(group=>{
    group.hidden=button.dataset.filter!=='all'&&group.dataset.category!==button.dataset.filter;
    if(!group.hidden)count+=group.querySelectorAll('.post-row,.project-card').length;
  });
  const status=document.querySelector('.filter-status');
  if(status)status.textContent=`当前分类：${button.dataset.filter==='all'?'全部':button.dataset.filter}；共 ${count} 项`;
}));
const themeButton=document.querySelector('.theme');
let savedTheme;try{savedTheme=localStorage.getItem('zy-theme')}catch{}
if(savedTheme==='dark')document.documentElement.dataset.theme='dark';
function syncThemeLabel(){const dark=document.documentElement.dataset.theme==='dark';themeButton.setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');themeButton.title=themeButton.getAttribute('aria-label')}
syncThemeLabel();
themeButton.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('zy-theme',next)}catch{}syncThemeLabel()});

document.querySelectorAll('[data-copy-account]').forEach(button=>button.addEventListener('click',async()=>{
  const status=button.closest('.contact-panel').querySelector('.copy-status');
  try{await navigator.clipboard.writeText(button.dataset.copyAccount);status.textContent='已复制';}
  catch{status.textContent='请长按或选中账号复制';}
}));
document.addEventListener('click',event=>{
  if(!event.target.closest('.contact-detail'))document.querySelectorAll('.contact-detail[open]').forEach(item=>item.open=false);
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')document.querySelectorAll('.contact-detail[open]').forEach(item=>{item.open=false;item.querySelector('summary').focus()});
});
