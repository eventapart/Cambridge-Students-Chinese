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
      const response = await fetch('./dictionaries/idioms_cam_masked.min.json');
      
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

    // 加载完成后显示3个随机故事
    showRandomStory();

    // 监听 tab 切换事件，自动加载游戏第一题
    const tabEl = document.querySelector('#myTabs a[href="#game"]');
    tabEl.addEventListener('shown.bs.tab', () => {
      nextQuestion();
    });

    // 监听切换到 “首页” 或 “词典” 时也刷新故事
    const homeTab = document.querySelector('#myTabs a[href="#home"]');
    const dictTab = document.querySelector('#myTabs a[href="#dictionary"]');

    [homeTab, dictTab].forEach(tab => {
      tab?.addEventListener('shown.bs.tab', () => {
        // 只有在切换到非“游戏”页时才显示故事
        const activeTab = document.querySelector('#myTabs .nav-link.active');
        if (activeTab.getAttribute('href') !== '#game') {
          showRandomStory();
        }
      });
    });    
  })
  .catch(err => {
    console.error('数据加载失败:', err);
    // 即使失败，也应恢复交互（否则页面完全不可用）
    appContainer.classList.remove('loading-state');
    const container = document.getElementById('random-idioms');
    container.innerHTML = '<p></p><p class="text-danger text-center">加载失败</p><p></p>';
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
  const randomItems = shuffle(allIdioms).slice(0, 3);

  // 渲染卡片
  randomItems.forEach(idiom => {
    renderCard(
      container,
      idiom.idiom,
      idiom.pinyin,
      buildCardContent(idiom) // 使用统一内容构建函数
    );
  });
}

/**
 * Fisher-Yates 洗牌算法：打乱数组
 * @param {Array} array - 要打乱的数组
 * @returns {Array} 打乱后的新数组
 */
function shuffle(array) {
  const arr = [...array]; // 不修改原数组
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 构建成语卡片的详细内容 HTML
 * @param {Object} item - 成语数据对象
 * @returns {string} 渲染后的 HTML 字符串
 */
function buildCardContent(item) {
  let content = '';

  // 1. 辞典释义（必有）
  if (item.definition) {
    content += `<strong style="margin-left:-2.75rem">释义</strong> ${item.definition}<br />`;
  }

  // 2. 用法说明（可选）
  if (item.usage && typeof item.usage === 'string') {
    content += `<strong style="margin-left:-2.75rem">用法</strong> ${item.usage}<br />`;
  }

  // 3. 成语出处（可选：text 或 book）
  const source = item.source;
  if (source?.text || source?.book) {
    const textPart = source.text || '';
    const bookPart = source.book ? `（${source.book}）` : '';
    content += `<strong style="margin-left:-2.75rem">出处</strong> ${textPart}${bookPart}<br />`;
  }

  // 4. 词典例句（可选）
  const example = item.example;
  if (example?.text || example?.book) {
    const textPart = example.text || '';
    const bookPart = example.book ? `（${example.book}）` : '';
    content += `<strong style="margin-left:-2.75rem">例句</strong> ${textPart}${bookPart}<br />`;
  }

  // 5. 官方例句（仅真题页有）
  if (item.exampleSentence) {
    content += `<strong style="margin-left:-2.75rem">官方</strong> ${item.exampleSentence}<br />`;
  }

  // 6. 近义词（可选）
  if (Array.isArray(item.similar) && item.similar.length > 0) {
    content += `<strong style="margin-left:-2.75rem">近义</strong> ${item.similar.join('、')}<br />`;
  }

  // 7. 反义词（可选）
  if (Array.isArray(item.opposite) && item.opposite.length > 0) {
    content += `<strong style="margin-left:-2.75rem">反义</strong> ${item.opposite.join('、')}<br />`;
  }

  // 移除末尾多余的 <br />
  return content.replace(/<br\s*\/?>\s*$/, '');
}

// 渲染卡片函数
function renderCard(container, title, pinyin, content) {
  const col = document.createElement('div');
  col.className = 'col';
  col.innerHTML = `
    <div class="card shadow-sm h-100">
      <div class="card-body d-flex flex-column card-chinese">
        <h5 class="card-title mb-4">${title}<br><small class="text-muted" style="font-family:Helvetica, Arial, sans-serif">${pinyin}</small></h5>
        <p class="card-text mt-auto" style="padding-left:2.75rem">${content}</p>
      </div>
    </div>
  `;
  container.appendChild(col);
}

/**
 * 高亮文本中的关键词
 * @param {string} text - 原始文本
 * @param {string} keyword - 搜索关键词
 * @returns {string} 包含 <mark> 标签的高亮文本
 */
function highlightText(text, keyword) {
  if (!keyword) return text;
  const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * 转义正则表达式特殊字符
 * @param {string} string - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  const inputElement = document.getElementById('search-input');
  const input = inputElement.value.trim();
  const resultsContainer = document.getElementById('search-results');
  const paginationContainer = document.getElementById('pagination-controls-dict');

  // 清空内容
  resultsContainer.innerHTML = '';
  if (paginationContainer) paginationContainer.innerHTML = '';

  // 🔍 输入字符少于 2 个：清空，显示提示
  if (input.length < 2) {
    resultsContainer.innerHTML = '<p></p><p class="text-muted text-center">请输入至少2个字符</p><p></p>';
    // 输入 1 个字符也视为不足，不显示结果
      if (input.length < 1) {
        showRandomStory();
      return;
      }
  }

  // ✅ 开始搜索：过滤成语（匹配 idiom 或 definition）
  const results = allIdioms.filter(idiom =>
    idiom.idiom?.toLowerCase().includes(input.toLowerCase()) ||
    (typeof idiom.definition === 'string' &&
     idiom.definition.toLowerCase().includes(input.toLowerCase()))
  );

  // 📝 无匹配结果
  if (results.length === 0) {
    resultsContainer.innerHTML = '<p></p><p class="text-muted text-center">未找到相关成语。</p><p></p>';
    return;
  }

  // ✅ 分页设置
  const itemsPerPage = 3;
  const totalPages = Math.ceil(results.length / itemsPerPage);

  // ✅ 渲染当前页的函数
  const renderResultsPage = (page) => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedResults = results.slice(start, end);

    resultsContainer.innerHTML = ''; // 清空

    paginatedResults.forEach(idiom => {
      const highlightedIdiom = highlightText(idiom.idiom, input);
      const highlightedDef = highlightText(idiom.definition, input);

      const cardContent = buildCardContent({
        ...idiom,
        definition: highlightedDef
      });

      renderCard(
        resultsContainer,
        highlightedIdiom,
        idiom.pinyin,
        cardContent
      );
    });
  };

  // ✅ 初始化分页器
  const paginator = new Paginator('pagination-controls-dict', totalPages, (page) => {
    renderResultsPage(page);
  });

  // 🔥 先渲染第一页，再渲染分页控件
  renderResultsPage(1);
  paginator.render(1);
}

// 防抖函数
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// 绑定时使用防抖（延迟 100ms 执行）
searchInput.addEventListener('input', debounce(() => {
  searchIdiom();
}, 100));

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');

  // 实时监听输入（包括删除、输入、粘贴等）
  searchInput.addEventListener('input', () => {
    // 使用防抖（推荐）或直接调用
    searchIdiom();
  });
});

/**
 * 显示3个带故事的成语（随机）
 */
function showRandomStory() {
  // 1. 筛选有 story 的成语
  const itemsWithStory = allIdioms.filter(
    item => Array.isArray(item.story) && item.story.length > 0
  );

  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = ''; // 清空原有内容

  if (itemsWithStory.length === 0) {
    resultsContainer.innerHTML = '<p></p><p class="text-muted text-center">暂无成语故事</p><p></p>';
    return;
  }

  // 2. 随机打乱并取前 3 个
  const shuffled = [...itemsWithStory].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  // 3. 直接为每个成语创建 col 并用 renderCard 渲染
  selected.forEach(item => {
    // 拼接所有故事段落
    const storyContent = item.story.join('<br /><br />');
    
    // 使用您现有的 renderCard 函数
    renderCard(resultsContainer, item.idiom, item.pinyin, `<strong style="margin-left:-2.75rem">故事</strong> ${storyContent}`);
  });
}

// 显示 IGCSE 成语
// 全局变量用于存储当前页码
let currentPage = 1;
const pageSize = 3; // 每页显示的成语数量

/**
 * 渲染 IGCSE 真题成语页（带分页）
 */
function showIgcseIdioms(page = 1) {
  const container = document.getElementById('igcse-idioms');
  const paginationContainerId = 'pagination-controls-igcse';

  // 清空内容
  container.innerHTML = '';
  const paginationContainer = document.getElementById(paginationContainerId);
  if (paginationContainer) paginationContainer.innerHTML = '';

  // 1. 提取并排序所有真题条目（按 exam 名称倒序）
  const entries = Object.entries(igcseData).sort((a, b) => {
    return b[0].localeCompare(a[0], 'en', { numeric: true, sensitivity: 'base' });
  });

  // 2. 构建完整数据列表
  const allItems = [];
  for (const [exam, idiomToExampleMap] of entries) {
    for (const [idiomName, exampleSentence] of Object.entries(idiomToExampleMap)) {
      const item = allIdioms.find(i => i.idiom === idiomName);
      if (item) {
        allItems.push({
          idiom: item.idiom,
          pinyin: item.pinyin,
          definition: item.definition,
          source: item.source || null,
          usage: item.usage || '',
          example: item.example || {},
          exampleSentence: `${exampleSentence} (${exam})`,
          similar: item.similar || [],
          opposite: item.opposite || []
        });
      }
    }
  }

  // 3. 分页设置
  const pageSize = 3;
  const totalPages = Math.ceil(allItems.length / pageSize);

  // 校正页码
  const currentPage = Math.max(1, Math.min(page, totalPages));

  // 边界：无数据时显示提示
  if (allItems.length === 0) {
    container.innerHTML = '<p>暂无真题成语数据。</p>';
    return;
  }

  // 获取当前页数据
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const currentItems = allItems.slice(startIdx, endIdx);

  // 4. 渲染卡片
  currentItems.forEach(item => {
    renderCard(
      container,
      item.idiom,
      item.pinyin,
      buildCardContent(item) // 复用统一内容构建函数
    );
  });

  // 5. 初始化分页器
  const paginator = new Paginator(paginationContainerId, totalPages, (newPage) => {
    showIgcseIdioms(newPage); // 传入新页码，避免依赖外部变量
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