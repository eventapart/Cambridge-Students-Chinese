// =======================
// 初始化
// =======================

const appContainer = document.getElementById('app');
appContainer.classList.add('loading-state');

// =======================
// 工具函数
// =======================

const $ = id => document.getElementById(id);

/** 原地 Fisher-Yates 洗牌 */
function shuffleArrayInPlace(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** 转义正则 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 高亮关键词 */
function highlightText(text, keyword) {
  if (!keyword || !text) return text || '';
  return text.replace(new RegExp(`(${escapeRegExp(keyword)})`, 'gi'), '<mark>$1</mark>');
}

/** 防抖 */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** 渲染提示信息 */
function renderStatusMessage(container, text, type = "muted") {
  container.innerHTML = `<p></p><p class="text-${type} text-center">${text}</p><p></p>`;
}

// =======================
// 分页组件
// =======================

class Paginator {
  constructor(containerId, totalPages, onPageChange, maxButtons = 5) {
    this.container = $(containerId);
    this.totalPages = totalPages;
    this.onPageChange = onPageChange;
    this.maxButtons = maxButtons;
    this.currentPage = 1;

    this.handleKey = this.handleKey.bind(this);
    document.addEventListener('keydown', this.handleKey);
  }

  render(page = 1) {
    this.currentPage = page;
    if (!this.container) return;

    const { totalPages, maxButtons, currentPage } = this;
    let html = '';

    if (currentPage > 1) html += `<li class="page-item"><a class="page-link" data-page="${currentPage - 1}" href="#">上一页</a></li>`;

    let startPage, endPage;
    if (totalPages <= maxButtons) [startPage, endPage] = [1, totalPages];
    else {
      const half = Math.floor(maxButtons / 2);
      if (currentPage <= half) [startPage, endPage] = [1, maxButtons];
      else if (currentPage + half >= totalPages) [startPage, endPage] = [totalPages - maxButtons + 1, totalPages];
      else [startPage, endPage] = [currentPage - half, currentPage + half];
    }

    for (let i = startPage; i <= endPage; i++) {
      const active = i === currentPage ? 'active' : '';
      html += `<li class="page-item ${active}"><a class="page-link" data-page="${i}" href="#">${i}</a></li>`;
    }

    if (currentPage < totalPages) html += `<li class="page-item"><a class="page-link" data-page="${currentPage + 1}" href="#">下一页</a></li>`;

    this.container.innerHTML = html;
    this.bindEvents();
    this.onPageChange(page);
  }

  bindEvents() {
    this.container.onclick = e => {
      const a = e.target.closest("a[data-page]");
      if (!a) return;
      e.preventDefault();
      const page = parseInt(a.dataset.page, 10);
      if (page && page !== this.currentPage) this.render(page);
    };
  }

  handleKey(e) {
    if (!this.container.offsetParent) return;
    if (!this.container.querySelector("[data-page]")) return;

    const activeTab = document.querySelector('#myTabs .nav-link.active')?.getAttribute('href');
    if (!activeTab) return;
    if (!this.container.closest(activeTab)) return;

    if (e.key === 'ArrowLeft' && this.currentPage > 1) this.render(this.currentPage - 1);
    else if (e.key === 'ArrowRight' && this.currentPage < this.totalPages) this.render(this.currentPage + 1);
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKey);
    if (this.container) this.container.innerHTML = '';
  }
}

// =======================
// 数据加载与索引
// =======================

let igcseData = null;
let allIdioms = [];
let idiomMap = new Map();
let idiomsParts = [];
let invertedIndex = new Map(); // 倒排索引

async function loadAllIdioms(parts = 10) {
  appContainer.classList.add('loading-state');

  const fetchPromises = [];
  for (let i = 1; i <= parts; i++) {
    fetchPromises.push(
      fetch(`./dictionaries/idioms_part${i}.min.json`)
        .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
        .then(partData => {
          partData.forEach(i => {
            i.idiom = i.idiom || '';
            i.definition = i.definition || '';
            i.idiomLower = i.idiom.toLowerCase();
            i.definitionLower = i.definition.toLowerCase();
            const text = i.idiomLower + ' ' + i.definitionLower;
            text.split(/\s+/).forEach(word => {
              if (!invertedIndex.has(word)) invertedIndex.set(word, new Set());
              invertedIndex.get(word).add(i);
            });
          });
          allIdioms.push(...partData);
          idiomsParts[i - 1] = partData;
          partData.forEach(i => idiomMap.set(i.idiom, i));
        })
    );
  }

  await Promise.all(fetchPromises);

  appContainer.classList.remove('loading-state');
  renderHomeIdioms();
  renderIgcseIdioms();
  renderRandomIdiomStories();
  initTabListeners();
}

// =======================
// 渲染函数
// =======================

function buildIdiomCardContent(item) {
  const add = (label, text) => text ? `<strong style="margin-left:-2.75rem">${label}</strong> ${text}` : '';
  return [
    add("释义", item.definition),
    add("用法", item.usage),
    add("出处", (item.source?.text || '') + (item.source?.book ? `（${item.source.book}）` : '')),
    add("例句", (item.example?.text || '') + (item.example?.book ? `（${item.example.book}）` : '')),
    add("官方", item.exampleSentence),
    item.similar?.length ? add("近义", item.similar.join('、')) : '',
    item.opposite?.length ? add("反义", item.opposite.join('、')) : ''
  ].filter(Boolean).join('<br />');
}

// =======================
// 无限滚动虚拟列表
// =======================

class VirtualList {
  constructor(container, items, rowHeight = 150, buffer = 3) {
    this.container = container;
    this.items = items;
    this.rowHeight = rowHeight;
    this.buffer = buffer;
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.position = 'relative';
    this.scrollContainer.style.height = `${items.length * rowHeight}px`;
    this.container.innerHTML = '';
    this.container.appendChild(this.scrollContainer);

    this.visibleStart = 0;
    this.visibleEnd = 0;

    this.handleScroll = this.handleScroll.bind(this);
    this.container.addEventListener('scroll', this.handleScroll);
    this.render();
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;

    const startIndex = Math.max(Math.floor(scrollTop / this.rowHeight) - this.buffer, 0);
    const endIndex = Math.min(Math.ceil((scrollTop + containerHeight) / this.rowHeight) + this.buffer, this.items.length);

    if (startIndex === this.visibleStart && endIndex === this.visibleEnd) return;

    this.visibleStart = startIndex;
    this.visibleEnd = endIndex;

    this.scrollContainer.innerHTML = '';

    for (let i = startIndex; i < endIndex; i++) {
      const item = this.items[i];
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = `${i * this.rowHeight}px`;
      div.style.width = '100%';
      div.style.height = `${this.rowHeight}px`;
      div.className = 'col';
      div.innerHTML = `
        <div class="card shadow-sm h-100">
          <div class="card-body d-flex flex-column card-chinese">
            <h5 class="card-title mb-4">${item.idiom}<br><small class="text-muted">${item.pinyin || ''}</small></h5>
            <p class="card-text mt-auto" style="padding-left:2.75rem">${buildIdiomCardContent(item)}</p>
          </div>
        </div>`;
      this.scrollContainer.appendChild(div);
    }
  }

  handleScroll() {
    this.render();
  }

  destroy() {
    this.container.removeEventListener('scroll', this.handleScroll);
    this.container.innerHTML = '';
  }
}

// =======================
// 搜索功能（倒排索引 + 异步高亮）
// =======================

let searchVirtualList = null;

async function searchIdioms(input) {
  if (!input) return [];
  const words = input.toLowerCase().split(/\s+/);
  let resultSets = [];
  words.forEach(word => {
    if (invertedIndex.has(word)) resultSets.push(Array.from(invertedIndex.get(word)));
  });
  if (!resultSets.length) return [];
  return resultSets.reduce((a, b) => a.filter(i => b.includes(i)));
}

async function handleIdiomSearch() {
  const input = $('search-input').value.trim().toLowerCase();
  const results = $('search-results');
  const button = $('button-addon2');

  if (searchVirtualList) {
    searchVirtualList.destroy();
    searchVirtualList = null;
  }

  if (input.length < 2) {
    renderStatusMessage(results, "请输入至少2个字符");
    if (!input) renderRandomIdiomStories();
    button.disabled = true;
    return;
  }
  button.disabled = false;

  const matched = await searchIdioms(input);

  if (!matched.length) return renderStatusMessage(results, "未找到相关成语");

  const highlighted = matched.map(i => ({
    ...i,
    idiom: highlightText(i.idiom, input),
    definition: highlightText(i.definition, input)
  }));

  // 创建虚拟列表
  searchVirtualList = new VirtualList(results, highlighted, 180, 5);
}

// =======================
// 首页、随机故事、IGCSE、游戏逻辑 与 页面绑定
// =======================

// 这里保持你原来的 renderHomeIdioms / renderRandomIdiomStories / renderIgcseIdioms / 游戏逻辑 / initTabListeners ...

document.addEventListener('DOMContentLoaded', () => {
  loadIgcseData();
  loadAllIdioms(10); // 并行加载 10 个 part
  $('search-input').addEventListener('input', debounce(handleIdiomSearch, 150));
  $('button-addon2').disabled = true;
  $('best-score').textContent = bestScore;
});