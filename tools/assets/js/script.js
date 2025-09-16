// 获取根容器
const appContainer = document.getElementById('app');

// 初始化：进入加载状态
appContainer.classList.add('loading-state');

// 通用分页组件（适配 <ul> 作为容器）
class Paginator {
  /**
   * @param {string} containerId - <ul> 的 ID，例如 'pagination-controls-dict'
   * @param {number} totalPages
   * @param {function} onPageChange
   * @param {number} maxButtons
   */
  constructor(containerId, totalPages, onPageChange, maxButtons = 5) {
    this.containerId = containerId;
    this.totalPages = totalPages;
    this.onPageChange = onPageChange;
    this.maxButtons = maxButtons;
    this.currentPage = 1;
  }

  // 渲染分页按钮到指定的 <ul>
  render(page = 1) {
    this.currentPage = page;
    const container = document.getElementById(this.containerId);
    if (!container) return;

    let html = '';

    // 上一页
    if (this.currentPage > 1) {
      html += `<li class="page-item"><a class="page-link" data-page="${this.currentPage - 1}" href="###">上一页</a></li>`;
    }

    // 计算页码范围
    let startPage, endPage;
    const { totalPages, maxButtons, currentPage } = this;

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
      const active = i === this.currentPage ? 'active' : '';
      html += `<li class="page-item ${active}"><a class="page-link" data-page="${i}" href="###">${i}</a></li>`;
    }

    // 下一页
    if (this.currentPage < this.totalPages) {
      html += `<li class="page-item"><a class="page-link" data-page="${this.currentPage + 1}" href="###">下一页</a></li>`;
    }

    container.innerHTML = html;

    // ✅ 事件绑定（使用事件委托，绑定到 <ul> 自身）
    this.bindEvents(container);
  }

  // 绑定点击事件（安全绑定，防止重复）
  bindEvents(container) {
    // 移除旧事件监听器
    const cloned = container.cloneNode(true);
    container.replaceWith(cloned);

    // 添加新监听器
    cloned.addEventListener('click', (e) => {
      e.preventDefault();
      if (e.target.tagName === 'A') {
        const page = parseInt(e.target.dataset.page);
        if (!isNaN(page) && page >= 1 && page <= this.totalPages && page !== this.currentPage) {
          this.render(page); // 更新 UI
          this.onPageChange(page); // 回调业务逻辑
        }
      }
    });
  }

  // 外部跳转接口
  goTo(page) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.render(page);
      this.onPageChange(page);
    }
  }
}

// 声明igcse成语
let igcseData = null;
async function loadIgcseData() {
  try {
      // 发起网络请求，获取 JSON 文件
      const response = await fetch('./dictionaries/idioms_cam.min.json');
      
      // 检查请求是否成功
      if (!response.ok) {
          throw new Error(`HTTP 错误！状态码: ${response.status}`);
      }
      
      // 将响应体解析为 JSON
      igcseData = await response.json();
      
      // ✅ 数据加载成功，现在可以使用 igcseData 了
      console.log("数据加载成功:", igcseData);
      
      // 在这里调用其他依赖 igcseData 的函数
      // initializeApp(); 
      // displayData();
      
  } catch (error) {
      console.error("加载数据失败:", error);
      // 可以在这里显示错误提示给用户
      alert("无法加载数据，请稍后重试。");
  }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    loadIgcseData();
});

// 全部成语
let allIdioms = [];

// 加载 JSON 数据
fetch('./dictionaries/idioms.min.json')
  .then(res => res.json())
  .then(data => {
    allIdioms = data;

    // 数据加载成功：移除加载状态
    appContainer.classList.remove('loading-state');

    // 渲染页面
    showHome();
    showIgcseIdioms();

    // 监听 tab 切换事件，自动加载游戏第一题
    const tabEl = document.querySelector('#myTabs a[href="#game"]');
    tabEl.addEventListener('shown.bs.tab', () => {
      nextQuestion();
    });
  })
  .catch(err => {
    console.error('数据加载失败:', err);
    // 即使失败，也应恢复交互（否则页面完全不可用）
    appContainer.classList.remove('loading-state');
    const container = document.getElementById('random-idioms');
    container.innerHTML = '<p></p><p class="text-danger">加载失败</p><p></p>';
  });

// 显示首页随机成语
function showHome() {
  const container = document.getElementById('random-idioms');

  // 如果数据未加载，确保骨架屏已存在（通常 HTML 已写好）
  if (!allIdioms || allIdioms.length === 0) {
    // 骨架屏已在 HTML 中，无需操作
    return;
  }

  // ✅ 数据已加载：清空容器，渲染真实内容
  container.innerHTML = ''; // 🔥 自动移除骨架屏

  // 数据已加载，生成随机成语
  const randomIds = shuffle(allIdioms).slice(0, 3);
  container.innerHTML = '';
  randomIds.forEach(idiom => {
    renderCard(container, idiom.idiom, idiom.pinyin, idiom.definition);
  });
}

// 渲染卡片函数
function renderCard(container, title, pinyin, content) {
  const col = document.createElement('div');
  col.className = 'col';
  col.innerHTML = `
    <div class="card shadow-sm h-100">
      <div class="card-body d-flex flex-column card-chinese">
        <h5 class="card-title mb-4">${title}<br><small class="text-muted" style="font-family:Helvetica, Arial, sans-serif">${pinyin}</small></h5>
        <p class="card-text mt-auto">${content}</p>
      </div>
    </div>
  `;
  container.appendChild(col);
}

// 高亮关键词函数
function highlightText(text, keyword) {
  if (!keyword || !text) return text;

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  return text.replace(pattern, '<mark>$1</mark>');
}

// 搜索成语
// 监听搜索框至少输入两个字符
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('button-addon2');

// 监听输入框内容变化
searchInput.addEventListener('input', function () {
  const query = this.value.trim(); // 去除首尾空格

  // 如果输入字符数 >= 2，启用按钮；否则禁用
  if (query.length >= 2) {
    searchBtn.disabled = false;
  } else {
    searchBtn.disabled = true;
  }
});

// 可选：页面加载时确保按钮初始状态
searchBtn.disabled = true;

function searchIdiom() {
  const input = document.getElementById('search-input').value.trim();
  const resultsContainer = document.getElementById('search-results');
  const paginationContainerId = 'pagination-controls-dict'; // 对应 <ul> 的 ID

  // 清空内容
  resultsContainer.innerHTML = '';
  const paginationContainer = document.getElementById(paginationContainerId);
  if (paginationContainer) paginationContainer.innerHTML = '';

  // 输入为空
  if (!input) {
    resultsContainer.innerHTML = '<p></p><p class="text-muted text-center">请输入关键词搜索成语。</p><p></p>';
    return;
  }

  // 过滤成语：匹配成语本身或释义
  const results = allIdioms.filter(idiom =>
    idiom.idiom && idiom.idiom.toLowerCase().includes(input.toLowerCase()) ||
    (idiom.definition && typeof idiom.definition === 'string' && 
     idiom.definition.toLowerCase().includes(input.toLowerCase()))
  );

  // 无结果
  if (results.length === 0) {
    resultsContainer.innerHTML = '<p></p><p class="text-muted text-center">未找到相关成语。</p><p></p>';
    return;
  }

  // ✅ 分页逻辑开始
  const itemsPerPage = 3;
  const totalPages = Math.ceil(results.length / itemsPerPage);

  // ✅ 定义渲染当前页内容的函数（可复用）
  const renderResultsPage = (page) => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedResults = results.slice(start, end);

    resultsContainer.innerHTML = ''; // 清空当前显示

    paginatedResults.forEach(idiom => {
      const highlightedIdiom = highlightText(idiom.idiom, input);
      const highlightedDef = highlightText(idiom.definition, input);
      renderCard(resultsContainer, highlightedIdiom, idiom.pinyin, highlightedDef);
    });
  };

  // ✅ 创建分页器实例
  const paginator = new Paginator(paginationContainerId, totalPages, (page) => {
    renderResultsPage(page); // 用户点击页码时触发
  });

  // 🔥 关键修复：先手动渲染第一页内容，再渲染分页控件
  renderResultsPage(1);       // ✅ 立即显示第一页内容
  paginator.render(1);        // ✅ 渲染分页按钮（当前页为1）
}

// 显示 IGCSE 成语
// 全局变量用于存储当前页码
let currentPage = 1;
const pageSize = 3; // 每页显示的成语数量

function showIgcseIdioms() {
  const container = document.getElementById('igcse-idioms');
  container.innerHTML = ''; // 清空容器

  // 1. 获取所有条目并转换为数组
  const entries = Object.entries(igcseData);

  // 2. 按 exam（即文件名）倒序排序
  entries.sort((a, b) => {
    const examA = a[0];
    const examB = b[0];
    return examB.localeCompare(examA, 'en', { numeric: true, sensitivity: 'base' });
  });

  // 3. 收集所有条目
  let allItems = [];
  entries.forEach(([exam, idiomToExampleMap]) => {
    Object.entries(idiomToExampleMap).forEach(([idiomName, exampleSentence]) => {
      const item = allIdioms.find(i => i.idiom === idiomName);
      if (item) {
        allItems.push({
          idiom: item.idiom,
          pinyin: item.pinyin,
          definition: item.definition,
          exampleSentence: `${exampleSentence} (${exam})`
        });
      }
    });
  });

  // 4. 计算总页数
  const pageSize = 3; // 假设每页6条（与之前的逻辑一致）
  const totalPages = Math.ceil(allItems.length / pageSize);

  // 确保 currentPage 合法
  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

  // 获取当前页的数据
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const currentItems = allItems.slice(startIdx, endIdx);

  // 渲染当前页的成语卡片
  currentItems.forEach(item => {
    renderCard(
      container,
      item.idiom,
      item.pinyin,
      `<strong>辞典释义：</strong>${item.definition}<br />${item.example?.text ? `<strong>词典例句：</strong>${item.example.text}<br />` : ''}<strong>官方例句：</strong>${item.exampleSentence}`
    );
  });

  // 使用 Paginator
  const paginator = new Paginator('pagination-controls-igcse', totalPages, (page) => {
    // 分页回调：更新 currentPage 并重新渲染
    currentPage = page;
    showIgcseIdioms(); // 重新调用自身，刷新内容和分页
  });

  // 渲染分页控件
  paginator.render(currentPage);
}

// 跳转到指定页码的函数
function goToPage(page) {
  // 重新计算总页数（基于当前数据）
  const totalItems = Object.entries(igcseData).reduce(
    (acc, [exam, map]) => acc + Object.keys(map).length,
    0
  );
  const totalPages = Math.ceil(totalItems / 3);

  // 安全检查
  if (Number.isInteger(page) && page >= 1 && page <= totalPages && page !== currentPage) {
    currentPage = page;
    showIgcseIdioms(); // 重新渲染页面
  }
}

// 初始化游戏
let currentQuestion = null;

function nextQuestion() {
  // 随机选择一个成语作为正确答案
  const randomIdiom = allIdioms[Math.floor(Math.random() * allIdioms.length)];
  
  // 正确选项是成语名
  let options = [randomIdiom.idiom];

  // 添加其他 2 个干扰项（其他成语的名字）
  while (options.length < 3) {
    const candidate = allIdioms[Math.floor(Math.random() * allIdioms.length)].idiom;
    if (!options.includes(candidate)) {
      options.push(candidate);
    }
  }

  // 打乱选项顺序
  options = shuffle(options);

  // 记录正确答案的新位置
  currentQuestion = {
    definition: randomIdiom.definition, // 当前释义
    correctIndex: options.indexOf(randomIdiom.idiom) // 成语在打乱后的位置
  };

  // 显示问题：根据释义猜成语
  document.getElementById('question').innerHTML = `<strong style="border-bottom:#333 1px dashed">“${randomIdiom.definition}” 对应的成语是？</strong>`;

  // 渲染选项按钮（显示成语名）
  document.getElementById('options').innerHTML = options.map((idiom, index) => {
    // 查找该成语的拼音（用于显示）
    const item = allIdioms.find(i => i.idiom === idiom);
    const pinyin = item ? item.pinyin : '未知拼音';

    return `
      <div class="col">
        <button class="btn btn-outline-dark option card h-100" onclick="checkAnswer(${index})">
          <span class="card-body d-flex flex-column text-center card-chinese" style="justify-content: center; line-height:1.2">
            <span class="card-title mb-0">${idiom}<br /><small class="text-muted">${pinyin}</small></span>
          </span>
        </button>
      </div>
    `;
  }).join('');

}

function checkAnswer(index) {
  if (!currentQuestion) return;
  const toastEl = document.getElementById('check-toast');
  const toastBody = document.getElementById('toast-body');
  const toast = bootstrap.Toast.getInstance(toastEl) || new bootstrap.Toast(toastEl);

  const isCorrect = index === currentQuestion.correctIndex;

  if (isCorrect) {
    // 答对：加 10 分
    currentScore += 10;
    document.getElementById('current-score').textContent = currentScore;

    // 更新最高分（如果需要）
    if (currentScore > bestScore) {
      bestScore = currentScore;
      document.getElementById('best-score').textContent = bestScore;
      localStorage.setItem('idiomGameBestScore', bestScore);
    }

    // 显示 Toast
    toastEl.classList.remove('bg-danger', 'text-white');
    toastEl.classList.add('bg-success', 'text-white');
    toastBody.innerHTML = '正确！+10 分';

    // 自动进入下一题
    setTimeout(() => {
      nextQuestion();
    }, 300);
  } else {
    // 答错：不加分
    toastEl.classList.remove('bg-success', 'text-white');
    toastEl.classList.add('bg-danger', 'text-white');
    toastBody.innerHTML = `错误。`;
  }

  // 显示 Toast
  toast.hide();
  toast.show();
}

// 辅助函数：洗牌
function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

// 计分变量
let currentScore = 0;
let bestScore = parseInt(localStorage.getItem('idiomGameBestScore')) || 0;

// 页面加载后显示最高分
document.addEventListener('DOMContentLoaded', () => {
  const bestScoreEl = document.getElementById('best-score');
  if (bestScoreEl) {
    bestScoreEl.textContent = bestScore;
  }
});
function restartGame() {
  currentScore = 0;
  document.getElementById('current-score').textContent = currentScore;
  nextQuestion();
}