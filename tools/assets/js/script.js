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
  return function (...args) {
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
    if (totalPages <= maxButtons) {
      [startPage, endPage] = [1, totalPages];
    } else {
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
    if (!activeTab || !this.container.closest(activeTab)) return;

    if (e.key === 'ArrowLeft' && this.currentPage > 1) this.render(this.currentPage - 1);
    else if (e.key === 'ArrowRight' && this.currentPage < this.totalPages) this.render(this.currentPage + 1);
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKey);
    if (this.container) this.container.innerHTML = '';
  }
}

// =======================
// 数据加载
// =======================

let igcseData = null;
let allIdioms = [];
let idiomMap = new Map();
let idiomsParts = [];
let idiomsEnMap = new Map();

async function loadIgcseData() {
  try {
    const res = await fetch('./dictionaries/idioms_cam_masked.min.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    igcseData = await res.json();
    console.log("IGCSE 数据加载成功");
  } catch (err) {
    console.error("加载 IGCSE 数据失败:", err);
    alert("无法加载数据，请稍后重试");
  }
}

async function loadIdiomsEnMap() {
  const parts = 3;
  const fetchPromises = [];
  for (let i = 1; i <= parts; i++) {
    fetchPromises.push(
      fetch(`./dictionaries/idioms_en_map_part${i}.min.json`)
        .then(res => res.json())
        .then(arr => {
          arr.forEach(entry => {
            const k = (entry.idiom || '').trim();
            if (!k) return;
            idiomsEnMap.set(k, entry);
          });
          console.log(`idioms_en_map_part${i} 加载完成，条目数：`, arr.length);
        })
        .catch(err => console.warn(`加载 idioms_en_map_part${i}.min.json 失败：`, err))
    );
  }
  await Promise.all(fetchPromises);
  console.log('所有 idioms_en_map 分片加载完成，总条目数：', idiomsEnMap.size);
}

async function loadAllIdioms(parts = 10) {
  appContainer.classList.add('loading-state');

  const fetchPromises = [];
  for (let i = 1; i <= parts; i++) {
    fetchPromises.push(
      fetch(`./dictionaries/idioms_part${i}.min.json`)
        .then(res => res.json())
        .then(partData => {
          partData.forEach(item => {
            item.idiom = item.idiom || '';
            item.definition = item.definition || '';
            item.usage = item.usage || '';
            item.source = item.source || {};
            item.example = item.example || {};
            item.pinyin = item.pinyin || '';
            item.similar = item.similar || [];
            item.opposite = item.opposite || [];
            item.story = item.story || [];
            item.idiomLower = item.idiom.toLowerCase();
            item.definitionLower = item.definition.toLowerCase();
            item.litLower = (item.lit || '').toLowerCase();
            item.figLower = (item.fig || '').toLowerCase();
          });
          allIdioms.push(...partData);
          idiomsParts[i - 1] = partData;
          partData.forEach(it => idiomMap.set(it.idiom, it));
          console.log(`Part ${i} 加载完成`);
        })
        .catch(err => console.error(`加载 idioms_part${i}.json 失败:`, err))
    );
  }

  fetchPromises.push(loadIdiomsEnMap());

  await Promise.all(fetchPromises);

  idiomsEnMap.forEach((entry, idiomKey) => {
    const target = idiomMap.get(idiomKey);
    if (target) {
      if (entry.tongyi) {
        target.lit = entry.tongyi.lit || target.lit;
        target.fig = entry.tongyi.fig || target.fig;
      }
      if (entry.petci) target.petci = entry.petci;
      target._enmap = entry;
      target.litLower = (target.lit || '').toLowerCase();
      target.figLower = (target.fig || '').toLowerCase();
    }
  });

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
  const add = (label, text) => text ? `<strong>${label}</strong>${text}` : '';
  const base = [
    add("释义", item.definition),
    add("用法", item.usage),
    add("出处", (item.source?.text || '') + (item.source?.book ? `（${item.source.book}）` : '')),
    add("例句", (item.example?.text || '') + (item.example?.book ? `（${item.example.book}）` : '')),
    add("官方", item.exampleSentence),
    item.similar?.length ? add("近义", item.similar.join('、')) : '',
    item.opposite?.length ? add("反义", item.opposite.join('、')) : ''
  ].filter(Boolean);

  const extra = [];
  if (item.lit) extra.push(add("LIT", item.lit));
  if (item.fig) extra.push(add("FIG", item.fig));
  if (item.petci) extra.push(add("PETCI", item.petci));

  let merged = base.length && base[0].includes("释义") ? [base[0], ...extra, ...base.slice(1)] : [...extra, ...base];
  return merged.filter(Boolean).join('<br />');
}

function renderIdiomCards(container, items) {
  container.innerHTML = items.map(i => `
    <div class="col">
      <div class="card shadow-sm h-100">
        <div class="card-body d-flex flex-column card-chinese">
          <h5 class="card-title mb-4">${i.idiom}<br><small class="text-muted">${i.pinyin || ''}</small></h5>
          <p class="card-text mt-auto" style="padding-left:4rem">${buildIdiomCardContent(i)}</p>
        </div>
      </div>
    </div>`).join('');
}

// =======================
// 首页与随机故事
// =======================

function renderHomeIdioms() {
  const c = $('random-idioms');
  if (!allIdioms.length) return;
  renderIdiomCards(c, shuffleArrayInPlace([...allIdioms]).slice(0, 3));
}

function renderRandomIdiomStories() {
  const c = $('search-results');
  const items = allIdioms.filter(i => i.story?.length);
  if (!items.length) return renderStatusMessage(c, "暂无成语故事");

  const pageItems = shuffleArrayInPlace(items).slice(0, 3).map(i => ({
    ...i,
    // 保留释义并追加故事
    definition: (i.definition || '') + '<br /><strong>故事</strong> ' + i.story.join('<br /><br />')
  }));

  renderIdiomCards(c, pageItems);
}

// =======================
// 模糊搜索
// =======================

let searchPaginator = null;

async function searchIdioms(input) {
  if (!input) return [];
  const matchedParts = await Promise.all(idiomsParts.map(part =>
    part.filter(i =>
      i.idiomLower.includes(input) ||
      i.definitionLower.includes(input) ||
      i.litLower?.includes(input) ||
      i.figLower?.includes(input)
    )
  ));
  return matchedParts.flat();
}

async function handleIdiomSearch() {
  const inputRaw = $('search-input').value.trim();
  const input = inputRaw.toLowerCase();
  const results = $('search-results');
  const pagination = $('pagination-controls-dict');
  const button = $('button-addon2');

  results.innerHTML = '';
  if (pagination) pagination.innerHTML = '';
  if (searchPaginator) { searchPaginator.destroy(); searchPaginator = null; }

  if (input.length < 2) {
    renderStatusMessage(results, "请输入至少2个字符");
    if (!input) renderRandomIdiomStories();
    button.disabled = true;
    return;
  }

  button.disabled = false;
  const matched = await searchIdioms(input);
  if (!matched.length) return renderStatusMessage(results, "未找到相关成语");

  const perPage = 3;
  const totalPages = Math.ceil(matched.length / perPage);
  const renderPage = page => {
    const pageItems = matched.slice((page - 1) * perPage, page * perPage)
      .map(i => ({
        ...i,
        idiom: highlightText(i.idiom, inputRaw),
        definition: highlightText(i.definition || '', inputRaw) + (i.story?.length ? '<br /><strong>故事</strong> ' + i.story.join('<br /><br />') : ''),
        lit: highlightText(i.lit || '', inputRaw),
        fig: highlightText(i.fig || '', inputRaw)
      }));
    renderIdiomCards(results, pageItems);
  };

  searchPaginator = new Paginator('pagination-controls-dict', totalPages, renderPage);
  searchPaginator.render(1);
}

// =======================
// IGCSE 成语展示
// =======================

function renderIgcseIdioms(page = 1) {
  const c = $('igcse-idioms');
  const paginationId = 'pagination-controls-igcse';
  c.innerHTML = '';
  $(paginationId).innerHTML = '';

  const entries = Object.entries(igcseData || {}).sort((a, b) =>
    b[0].localeCompare(a[0], 'en', { numeric: true })
  );

  const items = [];
  for (const [exam, idioms] of entries) {
    for (const [name, sentence] of Object.entries(idioms)) {
      const item = idiomMap.get(name);
      if (item) items.push({ ...item, exampleSentence: `${sentence} (${exam})` });
    }
  }

  if (!items.length) return c.innerHTML = '<p>暂无真题成语数据</p>';

  const perPage = 3;
  const totalPages = Math.ceil(items.length / perPage);
  const renderPage = p => renderIdiomCards(c, items.slice((p - 1) * perPage, p * perPage));
  new Paginator(paginationId, totalPages, renderPage).render(page);
}

// =======================
// 游戏逻辑
// =======================

let currentQuestion = null, currentScore = 0;
let bestScore = parseInt(localStorage.getItem('idiomGameBestScore')) || 0;

function renderNextGameQuestion() {
  const idiom = allIdioms[Math.floor(Math.random() * allIdioms.length)];
  const shuffled = shuffleArrayInPlace([...allIdioms]);
  let options = shuffled.slice(0, 3).map(i => i.idiom);
  if (!options.includes(idiom.idiom)) options[Math.floor(Math.random() * 3)] = idiom.idiom;
  const correctIndex = options.indexOf(idiom.idiom);

  currentQuestion = { definition: idiom.definition, correctIndex };
  $('question').innerHTML = `<strong style="border-bottom:var(--text-color) 1px dashed">“${idiom.definition}” 对应的成语是？</strong>`;
  $('options').innerHTML = options.map((word, i) => {
    const item = idiomMap.get(word);
    return `
      <div class="col">
        <button class="btn btn-outline-dark option card h-100" onclick="handleGameAnswer(${i})">
            <span class="card-body d-flex flex-column text-center card-chinese" style="justify-content:center; line-height:1.2">
            <span class="card-title mb-0">${word}<br /><small class="text-muted">${item?.pinyin || ''}</small></span>
          </span>
        </button>
      </div>`;
  }).join('');
}

function handleGameAnswer(index) {
  if (!currentQuestion) return;
  const toastEl = $('check-toast');
  const toastBody = $('toast-body');
  const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
  const correct = index === currentQuestion.correctIndex;

  if (correct) {
    currentScore += 10;
    $('current-score').textContent = currentScore;
    if (currentScore > bestScore) {
      bestScore = currentScore;
      $('best-score').textContent = bestScore;
      localStorage.setItem('idiomGameBestScore', bestScore);
    }
    toastEl.classList.replace('bg-danger', 'bg-success');
    toastBody.innerHTML = '正确！+10 分';
    setTimeout(renderNextGameQuestion, 300);
  } else {
    toastEl.classList.replace('bg-success', 'bg-danger');
    toastBody.innerHTML = '错误';
  }
  toast.show();
}

function restartGame() {
  currentScore = 0;
  $('current-score').textContent = currentScore;
  renderNextGameQuestion();
}

// =======================
// 页面事件绑定
// =======================

function initTabListeners() {
  document.querySelector('#myTabs a[href="#game"]')?.addEventListener('shown.bs.tab', renderNextGameQuestion);
  document.querySelector('#myTabs a[href="#dictionary"]')?.addEventListener('shown.bs.tab', () => {
    if (searchPaginator) { searchPaginator.destroy(); searchPaginator = null; }
    $('search-input').value = '';
    renderRandomIdiomStories();
  });
  document.querySelector('#myTabs a[href="#igcse"]')?.addEventListener('shown.bs.tab', () => renderIgcseIdioms(1));
  document.querySelector('#myTabs a[href="#home"]')?.addEventListener('shown.bs.tab', renderRandomIdiomStories);
}

// =======================
// DOMContentLoaded 初始化
// =======================

document.addEventListener('DOMContentLoaded', () => {
  loadIgcseData();
  loadAllIdioms(10);
  $('search-input').addEventListener('input', debounce(handleIdiomSearch, 200));
  $('button-addon2').disabled = true;
  $('best-score').textContent = bestScore;
});
