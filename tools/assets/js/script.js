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
// 数据加载与索引
// =======================

let igcseData = [];
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
// 统一虚拟列表类
// =======================

class VirtualList {
  /**
   * @param {HTMLElement} container - 容器元素
   * @param {Array} items - 数据列表
   * @param {Object} options - 配置项
   *   options.rowHeight: 单行高度
   *   options.buffer: 缓存行数
   *   options.highlight: 关键词高亮
   */
  constructor(container, items, options = {}) {
    this.container = container;
    this.items = items;
    this.rowHeight = options.rowHeight || 150;
    this.buffer = options.buffer || 3;
    this.keyword = options.highlight || '';

    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.position = 'relative';
    this.scrollContainer.style.height = `${items.length * this.rowHeight}px`;
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
      const idiomText = this.keyword ? highlightText(item.idiom, this.keyword) : item.idiom;
      const definitionText = this.keyword ? highlightText(item.definition, this.keyword) : item.definition;

      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = `${i * this.rowHeight}px`;
      div.style.width = '100%';
      div.style.height = `${this.rowHeight}px`;
      div.className = 'col';
      div.innerHTML = `
        <div class="card shadow-sm h-100">
          <div class="card-body d-flex flex-column card-chinese">
            <h5 class="card-title mb-4">${idiomText}<br><small class="text-muted">${item.pinyin || ''}</small></h5>
            <p class="card-text mt-auto" style="padding-left:2.75rem">${buildIdiomCardContent({...item, idiom: idiomText, definition: definitionText})}</p>
          </div>
        </div>`;
      this.scrollContainer.appendChild(div);
    }
  }

  handleScroll() {
    this.render();
  }

  /**
   * 更新数据并重新渲染
   * @param {Array} newItems
   * @param {string} highlightKeyword
   */
  update(newItems, highlightKeyword = '') {
    this.items = newItems;
    this.keyword = highlightKeyword;
    this.scrollContainer.style.height = `${newItems.length * this.rowHeight}px`;
    this.container.scrollTop = 0;
    this.render();
  }

  destroy() {
    this.container.removeEventListener('scroll', this.handleScroll);
    this.container.innerHTML = '';
  }
}

// =======================
// 搜索功能
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

  if (searchVirtualList) searchVirtualList.destroy();

  if (input.length < 2) {
    renderStatusMessage(results, "请输入至少2个字符");
    if (!input) renderRandomIdiomStories();
    button.disabled = true;
    return;
  }
  button.disabled = false;

  const matched = await searchIdioms(input);
  if (!matched.length) return renderStatusMessage(results, "未找到相关成语");

  searchVirtualList = new VirtualList(results, matched, { rowHeight: 180, buffer: 5, highlight: input });
}

// =======================
// 首页 & IGCSE & 随机故事渲染
// =======================

let homeVirtualList = null;
let igcseVirtualList = null;
let randomStoryVirtualList = null;

function renderHomeIdioms() {
  const container = $('home-idioms');
  if (!allIdioms.length) return renderStatusMessage(container, "成语数据加载中...");
  if (homeVirtualList) homeVirtualList.destroy();
  homeVirtualList = new VirtualList(container, shuffleArrayInPlace([...allIdioms]), { rowHeight: 180, buffer: 5 });
}

function renderIgcseIdioms() {
  const container = $('igcse-idioms');
  if (!igcseData.length) return renderStatusMessage(container, "IGCSE数据加载中...");
  if (igcseVirtualList) igcseVirtualList.destroy();
  igcseVirtualList = new VirtualList(container, igcseData, { rowHeight: 180, buffer: 5 });
}

function renderRandomIdiomStories() {
  const container = $('random-idioms');
  const items = allIdioms.filter(i => i.story?.length);
  if (!items.length) return renderStatusMessage(container, "暂无成语故事");
  if (randomStoryVirtualList) randomStoryVirtualList.destroy();
  randomStoryVirtualList = new VirtualList(container, shuffleArrayInPlace(items), { rowHeight: 180, buffer: 5 });
}

// =======================
// 页面初始化
// =======================

document.addEventListener('DOMContentLoaded', () => {
  loadIgcseData();
  loadAllIdioms(10);
  $('search-input').addEventListener('input', debounce(handleIdiomSearch, 150));
  $('button-addon2').disabled = true;
  $('best-score').textContent = bestScore;
});