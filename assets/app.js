document.querySelectorAll('[data-showcase]').forEach(section=>{
  section.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    section.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    section.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==button.dataset.mode);
  }));
});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelectorAll('[data-category]').forEach(group=>group.hidden=button.dataset.filter!=='all'&&group.dataset.category!==button.dataset.filter);
  document.querySelector('.filter-status').textContent=`当前分类：${button.dataset.filter==='all'?'全部':button.dataset.filter}`;
}));
const themeButton=document.querySelector('.theme');
let savedTheme;try{savedTheme=localStorage.getItem('zy-theme')}catch{}
if(savedTheme==='dark')document.documentElement.dataset.theme='dark';
function syncThemeLabel(){const dark=document.documentElement.dataset.theme==='dark';themeButton.setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');themeButton.title=themeButton.getAttribute('aria-label')}
syncThemeLabel();
themeButton.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('zy-theme',next)}catch{}syncThemeLabel()});
