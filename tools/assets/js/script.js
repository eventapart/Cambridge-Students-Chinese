// =======================
// 初始化
// =======================

const appContainer = document.getElementById('app');
appContainer.classList.add('loading-state');

// =======================
// 工具函数
// =======================

const $ = (id) => document.getElementById(id);

/** Fisher-Yates 洗牌算法 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

    if (currentPage > 1) {
      html += `<li class="page-item"><a class="page-link" data-page="${currentPage - 1}" href="#">上一页</a></li>`;
    }

    let startPage, endPage;
    if (totalPages <= maxButtons) {
      [startPage, endPage] = [1, totalPages];
    } else {
      const half = Math.floor(maxButtons / 2);
      if (currentPage <= half) {
        [startPage, endPage] = [1, maxButtons];
      } else if (currentPage + half >= totalPages) {
        [startPage, endPage] = [totalPages - maxButtons + 1, totalPages];
      } else {
        [startPage, endPage] = [currentPage - half, currentPage + half];
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const active = i === currentPage ? 'active' : '';
      html += `<li class="page-item ${active}"><a class="page-link" data-page="${i}" href="#">${i}</a></li>`;
    }

    if (currentPage < totalPages) {
      html += `<li class="page-item"><a class="page-link" data-page="${currentPage + 1}" href="#">下一页</a></li>`;
    }

    this.container.innerHTML = html;
    this.bindEvents();
  }

  bindEvents() {
    this.container.onclick = (e) => {
      const a = e.target.closest("a[data-page]");
      if (!a) return;
      e.preventDefault();
      const page = parseInt(a.dataset.page, 10);
      if (page && page !== this.currentPage) {
        this.render(page);
        this.onPageChange(page);
      }
    };
  }
}

// =======================
// 数据加载
// =======================

let igcseData = null;
let allIdioms = [];

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

function renderCard(container, title, pinyin, content) {
  container.insertAdjacentHTML("beforeend", `
    <div class="col">
      <div class="card shadow-sm h-100">
        <div class="card-body d-flex flex-column card-chinese">
          <h5 class="card-title mb-4">${title}<br><small class="text-muted">${pinyin}</small></h5>
          <p class="card-text mt-auto" style="padding-left:2.75rem">${content}</p>
        </div>
      </div>
    </div>`);
}

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

function showHome() {
  const c = $('random-idioms');
  if (!allIdioms.length) return;
  c.innerHTML = '';
  shuffle(allIdioms).slice(0, 3).forEach(i => renderCard(c, i.idiom, i.pinyin, buildCardContent(i)));
}

function showRandomStory() {
  const c = $('search-results');
  c.innerHTML = '';
  const items = allIdioms.filter(i => i.story?.length);
  if (!items.length) return renderMessage(c, "暂无成语故事");
  shuffle(items).slice(0, 3).forEach(i =>
    renderCard(c, i.idiom, i.pinyin, `<strong style="margin-left:-2.75rem">故事</strong> ${i.story.join('<br /><br />')}`)
  );
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

  const perPage = 3, totalPages = Math.ceil(matched.length / perPage);
  const renderPage = (page) => {
    results.innerHTML = '';
    matched.slice((page - 1) * perPage, page * perPage).forEach(i => {
      renderCard(results,
        highlightText(i.idiom, input),
        i.pinyin,
        buildCardContent({ ...i, definition: highlightText(i.definition, input) })
      );
    });
  };

  new Paginator('pagination-controls-dict', totalPages, renderPage).render(1);
  renderPage(1);
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
      const item = allIdioms.find(i => i.idiom === name);
      if (item) items.push({ ...item, exampleSentence: `${sentence} (${exam})` });
    }
  }

  if (!items.length) return c.innerHTML = '<p>暂无真题成语数据。</p>';

  const perPage = 3, totalPages = Math.ceil(items.length / perPage);
  const renderPage = (p) => {
    c.innerHTML = '';
    items.slice((p - 1) * perPage, p * perPage).forEach(i =>
      renderCard(c, i.idiom, i.pinyin, buildCardContent(i))
    );
  };

  new Paginator(paginationId, totalPages, renderPage).render(page);
  renderPage(page);
}

// =======================
// 游戏逻辑
// =======================

let currentQuestion = null, currentScore = 0;
let bestScore = parseInt(localStorage.getItem('idiomGameBestScore')) || 0;

function nextQuestion() {
  const idiom = allIdioms[Math.floor(Math.random() * allIdioms.length)];
  let options = [idiom.idiom];
  while (options.length < 3) {
    const cand = allIdioms[Math.floor(Math.random() * allIdioms.length)].idiom;
    if (!options.includes(cand)) options.push(cand);
  }
  options = shuffle(options);

  currentQuestion = { definition: idiom.definition, correctIndex: options.indexOf(idiom.idiom) };
  $('question').innerHTML = `<strong style="border-bottom:var(--text-color) 1px dashed">“${idiom.definition}” 对应的成语是？</strong>`;
  $('options').innerHTML = options.map((word, i) => {
    const item = allIdioms.find(x => x.idiom === word);
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
  const toast = bootstrap.Toast.getInstance(toastEl) || new bootstrap.Toast(toastEl);
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
  document.querySelector('#myTabs a[href="#game"]')
    .addEventListener('shown.bs.tab', nextQuestion);

  ['#home', '#dictionary'].forEach(sel => {
    document.querySelector(`#myTabs a[href="${sel}"]`)
      ?.addEventListener('shown.bs.tab', () => {
        if (document.querySelector('#myTabs .nav-link.active')?.getAttribute('href') !== '#game') {
          showRandomStory();
        }
      });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadIgcseData();
  loadAllIdioms();
  $('search-input').addEventListener('input', debounce(searchIdiom, 100));
  $('button-addon2').disabled = true;
  $('best-score').textContent = bestScore;
});
