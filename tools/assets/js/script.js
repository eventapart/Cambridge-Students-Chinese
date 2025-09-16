// =======================
// 初始化
// =======================

// 获取根容器
const appContainer = document.getElementById('app');
// 进入加载状态
appContainer.classList.add('loading-state');

// =======================
// 工具函数
// =======================

/**
 * Fisher-Yates 洗牌算法：打乱数组
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 高亮文本中的关键词
 */
function highlightText(text, keyword) {
  if (!keyword) return text;
  const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * 防抖函数
 */
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// =======================
// 通用分页组件
// =======================

class Paginator {
  constructor(containerId, totalPages, onPageChange, maxButtons = 5) {
    this.containerId = containerId;
    this.totalPages = totalPages;
    this.onPageChange = onPageChange;
    this.maxButtons = maxButtons;
    this.currentPage = 1;
  }

  render(page = 1) {
    this.currentPage = page;
    const container = document.getElementById(this.containerId);
    if (!container) return;

    let html = '';
    const { totalPages, maxButtons, currentPage } = this;

    // 上一页
    if (currentPage > 1) {
      html += `<li class="page-item"><a class="page-link" data-page="${currentPage - 1}" href="###">上一页</a></li>`;
    }

    // 计算页码范围
    let startPage, endPage;
    if (totalPages <= maxButtons) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const half = Math.floor(maxButtons / 2);
      if (currentPage <= half) {
        startPage = 1;
        endPage = maxButtons;
      } else if (currentPage + half >= totalPages) {
        startPage = totalPages - maxButtons + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - half;
        endPage = currentPage + half;
      }
    }

    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
      const active = i === currentPage ? 'active' : '';
      html += `<li class="page-item ${active}"><a class="page-link" data-page="${i}" href="###">${i}</a></li>`;
    }

    // 下一页
    if (currentPage < totalPages) {
      html += `<li class="page-item"><a class="page-link" data-page="${currentPage + 1}" href="###">下一页</a></li>`;
    }

    container.innerHTML = html;
    this.bindEvents(container);
  }

  bindEvents(container) {
    const cloned = container.cloneNode(true);
    container.replaceWith(cloned);

    cloned.addEventListener('click', (e) => {
      e.preventDefault();
      if (e.target.tagName === 'A') {
        const page = parseInt(e.target.dataset.page);
        if (!isNaN(page) && page >= 1 && page <= this.totalPages && page !== this.currentPage) {
          this.render(page);
          this.onPageChange(page);
        }
      }
    });
  }

  goTo(page) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.render(page);
      this.onPageChange(page);
    }
  }
}

// =======================
// 数据加载
// =======================

let igcseData = null;
let allIdioms = [];

// 加载 IGCSE 数据
async function loadIgcseData() {
  try {
    const response = await fetch('./dictionaries/idioms_cam_masked.min.json');
    if (!response.ok) throw new Error(`HTTP 错误: ${response.status}`);
    igcseData = await response.json();
    console.log("IGCSE 数据加载成功");
  } catch (error) {
    console.error("加载 IGCSE 数据失败:", error);
    alert("无法加载数据，请稍后重试。");
  }
}

// 加载全部成语
function loadAllIdioms() {
  return fetch('./dictionaries/idioms.min.json')
    .then(res => res.json())
    .then(data => {
      allIdioms = data;
      appContainer.classList.remove('loading-state');
      showHome();
      showIgcseIdioms();
      showRandomStory();
      setupTabListeners();
    })
    .catch(err => {
      console.error('数据加载失败:', err);
      appContainer.classList.remove('loading-state');
      document.getElementById('random-idioms').innerHTML =
        '<p></p><p class="text-danger text-center">加载失败</p><p></p>';
    });
}

// =======================
// 渲染函数
// =======================

function renderCard(container, title, pinyin, content) {
  const col = document.createElement('div');
  col.className = 'col';
  col.innerHTML = `
    <div class="card shadow-sm h-100">
      <div class="card-body d-flex flex-column card-chinese">
        <h5 class="card-title mb-4">${title}<br><small class="text-muted">${pinyin}</small></h5>
        <p class="card-text mt-auto" style="padding-left:2.75rem">${content}</p>
      </div>
    </div>
  `;
  container.appendChild(col);
}

function buildCardContent(item) {
  const parts = [];
  if (item.definition) parts.push(`<strong style="margin-left:-2.75rem">释义</strong> ${item.definition}`);
  if (item.usage) parts.push(`<strong style="margin-left:-2.75rem">用法</strong> ${item.usage}`);
  if (item.source?.text || item.source?.book) {
    parts.push(`<strong style="margin-left:-2.75rem">出处</strong> ${item.source.text || ''}${item.source.book ? `（${item.source.book}）` : ''}`);
  }
  if (item.example?.text || item.example?.book) {
    parts.push(`<strong style="margin-left:-2.75rem">例句</strong> ${item.example.text || ''}${item.example.book ? `（${item.example.book}）` : ''}`);
  }
  if (item.exampleSentence) parts.push(`<strong style="margin-left:-2.75rem">官方</strong> ${item.exampleSentence}`);
  if (item.similar?.length) parts.push(`<strong style="margin-left:-2.75rem">近义</strong> ${item.similar.join('、')}`);
  if (item.opposite?.length) parts.push(`<strong style="margin-left:-2.75rem">反义</strong> ${item.opposite.join('、')}`);
  return parts.join('<br />');
}

// 首页随机成语
function showHome() {
  const container = document.getElementById('random-idioms');
  if (!allIdioms.length) return;
  container.innerHTML = '';
  shuffle(allIdioms).slice(0, 3).forEach(idiom => {
    renderCard(container, idiom.idiom, idiom.pinyin, buildCardContent(idiom));
  });
}

// 随机故事成语
function showRandomStory() {
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = '';
  const itemsWithStory = allIdioms.filter(item => item.story?.length);
  if (!itemsWithStory.length) {
    resultsContainer.innerHTML = '<p></p><p class="text-muted text-center">暂无成语故事</p><p></p>';
    return;
  }
  shuffle(itemsWithStory).slice(0, 3).forEach(item => {
    renderCard(resultsContainer, item.idiom, item.pinyin, `<strong style="margin-left:-2.75rem">故事</strong> ${item.story.join('<br /><br />')}`);
  });
}

// =======================
// 搜索功能
// =======================

function searchIdiom() {
  const input = document.getElementById('search-input').value.trim();
  const resultsContainer = document.getElementById('search-results');
  const paginationContainer = document.getElementById('pagination-controls-dict');
  resultsContainer.innerHTML = '';
  if (paginationContainer) paginationContainer.innerHTML = '';

  if (input.length < 2) {
    resultsContainer.innerHTML = '<p></p><p class="text-muted text-center">请输入至少2个字符</p><p></p>';
    if (!input) showRandomStory();
    return;
  } else {
    document.getElementById('button-addon2').disabled = false;
  }

  const results = allIdioms.filter(idiom =>
    idiom.idiom?.includes(input) || idiom.definition?.includes(input)
  );

  if (!results.length) {
    resultsContainer.innerHTML = '<p></p><p class="text-muted text-center">未找到相关成语</p><p></p>';
    return;
  }

  const itemsPerPage = 3;
  const totalPages = Math.ceil(results.length / itemsPerPage);

  const renderResultsPage = (page) => {
    resultsContainer.innerHTML = '';
    results.slice((page - 1) * itemsPerPage, page * itemsPerPage).forEach(idiom => {
      renderCard(
        resultsContainer,
        highlightText(idiom.idiom, input),
        idiom.pinyin,
        buildCardContent({ ...idiom, definition: highlightText(idiom.definition, input) })
      );
    });
  };

  const paginator = new Paginator('pagination-controls-dict', totalPages, renderResultsPage);
  renderResultsPage(1);
  paginator.render(1);
}

// =======================
// IGCSE 成语展示
// =======================

function showIgcseIdioms(page = 1) {
  const container = document.getElementById('igcse-idioms');
  const paginationContainerId = 'pagination-controls-igcse';
  container.innerHTML = '';
  document.getElementById(paginationContainerId).innerHTML = '';

  const entries = Object.entries(igcseData || {}).sort((a, b) =>
    b[0].localeCompare(a[0], 'en', { numeric: true })
  );

  const allItems = [];
  for (const [exam, idiomMap] of entries) {
    for (const [idiomName, exampleSentence] of Object.entries(idiomMap)) {
      const item = allIdioms.find(i => i.idiom === idiomName);
      if (item) {
        allItems.push({
          ...item,
          exampleSentence: `${exampleSentence} (${exam})`
        });
      }
    }
  }

  if (!allItems.length) {
    container.innerHTML = '<p>暂无真题成语数据。</p>';
    return;
  }

  const pageSize = 3;
  const totalPages = Math.ceil(allItems.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const currentItems = allItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  currentItems.forEach(item => {
    renderCard(container, item.idiom, item.pinyin, buildCardContent(item));
  });

  new Paginator(paginationContainerId, totalPages, (newPage) => showIgcseIdioms(newPage)).render(currentPage);
}

// =======================
// 游戏逻辑
// =======================

let currentQuestion = null;
let currentScore = 0;
let bestScore = parseInt(localStorage.getItem('idiomGameBestScore')) || 0;

function nextQuestion() {
  const randomIdiom = allIdioms[Math.floor(Math.random() * allIdioms.length)];
  let options = [randomIdiom.idiom];
  while (options.length < 3) {
    const candidate = allIdioms[Math.floor(Math.random() * allIdioms.length)].idiom;
    if (!options.includes(candidate)) options.push(candidate);
  }
  options = shuffle(options);

  currentQuestion = {
    definition: randomIdiom.definition,
    correctIndex: options.indexOf(randomIdiom.idiom)
  };

  document.getElementById('question').innerHTML = `<strong style="border-bottom:#333 1px dashed">“${randomIdiom.definition}” 对应的成语是？</strong>`;
  document.getElementById('options').innerHTML = options.map((idiom, index) => {
    const item = allIdioms.find(i => i.idiom === idiom);
    return `
      <div class="col">
        <button class="btn btn-outline-dark option card h-100" onclick="checkAnswer(${index})">
          <span class="card-body d-flex flex-column text-center card-chinese" style="justify-content:center; line-height:1.2">
            <span class="card-title mb-0">${idiom}<br /><small class="text-muted">${item?.pinyin || ''}</small></span>
          </span>
        </button>
      </div>`;
  }).join('');
}

function checkAnswer(index) {
  if (!currentQuestion) return;
  const toastEl = document.getElementById('check-toast');
  const toastBody = document.getElementById('toast-body');
  const toast = bootstrap.Toast.getInstance(toastEl) || new bootstrap.Toast(toastEl);
  const isCorrect = index === currentQuestion.correctIndex;

  if (isCorrect) {
    currentScore += 10;
    document.getElementById('current-score').textContent = currentScore;
    if (currentScore > bestScore) {
      bestScore = currentScore;
      document.getElementById('best-score').textContent = bestScore;
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
  document.getElementById('current-score').textContent = currentScore;
  nextQuestion();
}

// =======================
// 页面事件绑定
// =======================

function setupTabListeners() {
  document.querySelector('#myTabs a[href="#game"]')
    .addEventListener('shown.bs.tab', () => nextQuestion());

  ['#home', '#dictionary'].forEach(sel => {
    const tab = document.querySelector(`#myTabs a[href="${sel}"]`);
    tab?.addEventListener('shown.bs.tab', () => {
      if (document.querySelector('#myTabs .nav-link.active')?.getAttribute('href') !== '#game') {
        showRandomStory();
      }
    });
  });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
  loadIgcseData();
  loadAllIdioms();
  document.getElementById('search-input').addEventListener('input', debounce(searchIdiom, 100));
  document.getElementById('button-addon2').disabled = true;
  document.getElementById('best-score').textContent = bestScore;
});
