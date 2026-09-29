document.querySelectorAll('[data-showcase]').forEach(section=>{
  section.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    section.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    section.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==button.dataset.mode);
  }));
});
const categoryButtons=[...document.querySelectorAll('[data-filter]')];
const tagButtons=[...document.querySelectorAll('[data-tag]')];
let selectedCategory='all';
let selectedTag=new URLSearchParams(location.search).get('tag') || '';
if(!tagButtons.some(button=>button.dataset.tag===selectedTag))selectedTag='';
function applyFilters(){
  categoryButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===selectedCategory)));
  tagButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tag===selectedTag)));
  let visibleCount=0;
  document.querySelectorAll('[data-category]').forEach(group=>{
    const categoryMatches=selectedCategory==='all'||group.dataset.category===selectedCategory;
    const posts=[...group.querySelectorAll('[data-post-tags]')];
    posts.forEach(post=>post.hidden=!!selectedTag&&!JSON.parse(post.dataset.postTags).includes(selectedTag));
    const count=posts.length?posts.filter(post=>!post.hidden).length:group.querySelectorAll('.project-card').length;
    group.hidden=!categoryMatches||count===0;
    if(!group.hidden)visibleCount+=count;
    const countLabel=group.querySelector('.category-title>span');
    if(countLabel)countLabel.textContent=String(count).padStart(2,'0');
  });
  const empty=document.querySelector('.filter-empty');if(empty)empty.hidden=visibleCount>0;
  const status=document.querySelector('.filter-status');
  if(status)status.textContent=`当前分类：${selectedCategory==='all'?'全部':selectedCategory}；标签：${selectedTag||'全部'}；共 ${visibleCount} 篇`;
}
categoryButtons.forEach(button=>button.addEventListener('click',()=>{selectedCategory=button.dataset.filter;applyFilters()}));
tagButtons.forEach(button=>button.addEventListener('click',()=>{
  selectedTag=button.dataset.tag;
  const url=new URL(location.href);if(selectedTag)url.searchParams.set('tag',selectedTag);else url.searchParams.delete('tag');
  history.replaceState(null,'',url);applyFilters();
}));
if(categoryButtons.length||tagButtons.length)applyFilters();
const themeButton=document.querySelector('.theme');
let savedTheme;try{savedTheme=localStorage.getItem('zy-theme')}catch{}
if(savedTheme==='dark')document.documentElement.dataset.theme='dark';
function syncThemeLabel(){const dark=document.documentElement.dataset.theme==='dark';themeButton.setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');themeButton.title=themeButton.getAttribute('aria-label')}
syncThemeLabel();
themeButton.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('zy-theme',next)}catch{}syncThemeLabel()});
