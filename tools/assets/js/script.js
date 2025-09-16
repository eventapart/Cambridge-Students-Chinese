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
function shuffleInPlace(array) {
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
  if (!keyword) return text;
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
function renderMessage(container, text, type = "muted") {
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

    // 首次渲染直接触发回调
    this.onPageChange(page);
  }

  bindEvents() {
    this.container.onclick = e => {
      const a = e.target.closest("a[data-page]");
      if (!a) return;
      e.preventDefault();
      const page = parseInt(a.dataset.page, 10);
      if (page && page !== this.currentPage) {
        this.render(page);
      }
    };
  }
}

// =======================
// 数据加载
// =======================

let igcseData = null;
let allIdioms = [];
let idiomMap = new Map();

async function loadIgcseData() {
  try {
    const res = await fetch('./dictionaries/idioms_cam_masked.min.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    igcseData = await res.json();
    console.log("IGCSE 数据加载成功");
  } catch (err) {
    console.error("加载 IGCSE 数据失败:", err);
    alert("无法加载数据，请稍后重试。");
  }
}

async function loadAllIdioms() {
  try {
    const res = await fetch('./dictionaries/idioms.min.json');
    allIdioms = await res.json();
    idiomMap = new Map(allIdioms.map(i => [i.idiom, i]));
    appContainer.classList.remove('loading-state');
    showHome();
    showIgcseIdioms();
    showRandomStory();
    setupTabListeners();
  } catch (err) {
    console.error('数据加载失败:', err);
    appContainer.classList.remove('loading-state');
    renderMessage($('random-idioms'), "加载失败", "danger");
  }
}

// =======================
// 渲染函数
// =======================

function buildCardContent(item) {
  const add = (label, text) => text ? `<strong style="margin-left:-2.75rem">${label}</strong> ${text}` : '';
  return [
    add("释义", item.definition),
    add("用法", item.usage),
    add("出处", item.source?.text || '' + (item.source?.book ? `（${item.source.book}）` : '')),
    add("例句", item.example?.text || '' + (item.example?.book ? `（${item.example.book}）` : '')),
    add("官方", item.exampleSentence),
    item.similar?.length ? add("近义", item.similar.join('、')) : '',
    item.opposite?.length ? add("反义", item.opposite.join('、')) : ''
  ].filter(Boolean).join('<br />');
}

function renderCards(container, items) {
  container.innerHTML = items.map(i => `
    <div class="col">
      <div class="card shadow-sm h-100">
        <div class="card-body d-flex flex-column card-chinese">
          <h5 class="card-title mb-4">${i.idiom}<br><small class="text-muted">${i.pinyin}</small></h5>
          <p class="card-text mt-auto" style="padding-left:2.75rem">${buildCardContent(i)}</p>
        </div>
      </div>
    </div>`).join('');
}

// =======================
// 首页和随机故事
// =======================

function showHome() {
  const c = $('random-idioms');
  if (!allIdioms.length) return;
  renderCards(c, shuffleInPlace([...allIdioms]).slice(0, 3));
}

function showRandomStory() {
  const c = $('search-results');
  const items = allIdioms.filter(i => i.story?.length);
  if (!items.length) return renderMessage(c, "暂无成语故事");
  renderCards(c, shuffleInPlace(items).slice(0, 3).map(i => ({
    ...i,
    definition: `<strong style="margin-left:-2.75rem">故事</strong> ${i.story.join('<br /><br />')}`
  })));
}

// =======================
// 搜索功能
// =======================

function searchIdiom() {
  const input = $('search-input').value.trim();
  const results = $('search-results');
  const pagination = $('pagination-controls-dict');
  const button = $('button-addon2');

  results.innerHTML = '';
  if (pagination) pagination.innerHTML = '';

  if (input.length < 2) {
    renderMessage(results, "请输入至少2个字符");
    if (!input) showRandomStory();
    button.disabled = true;
    return;
  }
  button.disabled = false;

  const matched = allIdioms.filter(i =>
    i.idiom?.includes(input) || i.definition?.includes(input)
  );

  if (!matched.length) return renderMessage(results, "未找到相关成语");

  const perPage = 3;
  const totalPages = Math.ceil(matched.length / perPage);

  const renderPage = page => {
    const pageItems = matched.slice((page - 1) * perPage, page * perPage)
      .map(i => ({ ...i, definition: highlightText(i.definition, input), idiom: highlightText(i.idiom, input) }));
    renderCards(results, pageItems);
  };

  new Paginator('pagination-controls-dict', totalPages, renderPage).render(1);
}

// =======================
// IGCSE 成语展示
// =======================

function showIgcseIdioms(page = 1) {
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

  if (!items.length) return c.innerHTML = '<p>暂无真题成语数据。</p>';

  const perPage = 3;
  const totalPages = Math.ceil(items.length / perPage);
  const renderPage = p => {
    renderCards(c, items.slice((p - 1) * perPage, p * perPage));
  };

  new Paginator(paginationId, totalPages, renderPage).render(page);
}

// =======================
// 游戏逻辑
// =======================

let currentQuestion = null, currentScore = 0;
let bestScore = parseInt(localStorage.getItem('idiomGameBestScore')) || 0;

function nextQuestion() {
  const idiom = allIdioms[Math.floor(Math.random() * allIdioms.length)];
  const shuffled = shuffleInPlace([...allIdioms]);
  let options = shuffled.slice(0, 3).map(i => i.idiom);
  if (!options.includes(idiom.idiom)) options[Math.floor(Math.random() * 3)] = idiom.idiom;
  const correctIndex = options.indexOf(idiom.idiom);

  currentQuestion = { definition: idiom.definition, correctIndex };
  $('question').innerHTML = `<strong style="border-bottom:var(--text-color) 1px dashed">“${idiom.definition}” 对应的成语是？</strong>`;
  $('options').innerHTML = options.map((word, i) => {
    const item = idiomMap.get(word);
    return `
      <div class="col">
        <button class="btn btn-outline-dark option card h-100" onclick="checkAnswer(${i})">
          <span class="card-body d-flex flex-column text-center card-chinese" style="justify-content:center; line-height:1.2">
            <span class="card-title mb-0">${word}<br /><small class="text-muted">${item?.pinyin || ''}</small></span>
          </span>
        </button>
      </div>`;
  }).join('');
}

function checkAnswer(index) {
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
    setTimeout(nextQuestion, 300);
  } else {
    toastEl.classList.replace('bg-success', 'bg-danger');
    toastBody.innerHTML = '错误。';
  }
  toast.show();
}

function restartGame() {
  currentScore = 0;
  $('current-score').textContent = currentScore;
  nextQuestion();
}

// =======================
// 页面事件绑定
// =======================

function setupTabListeners() {
  document.querySelector('#myTabs a[href="#game"]')?.addEventListener('shown.bs.tab', nextQuestion);
  ['#home', '#dictionary'].forEach(sel => {
    document.querySelector(`#myTabs a[href="${sel}"]`)?.addEventListener('shown.bs.tab', () => {
      if (document.querySelector('#myTabs .nav-link.active')?.getAttribute('href') !== '#game') {
        showRandomStory();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadIgcseData();
  loadAllIdioms();
  $('search-input').addEventListener('input', debounce(searchIdiom, 200));
  $('button-addon2').disabled = true;
  $('best-score').textContent = bestScore;
});
