# Cambridge Students Chinese 成语词典工具

本项目隶属于 **Cambridge Students Chinese** 项目，旨在为国际学校学生（尤其是 IGCSE / A-Level 中文学习者）提供成语学习与查阅的数字化工具。  
通过网页应用形式，学生能够方便地搜索、浏览和理解成语，提升中文学习体验。

项目地址: [Cambridge-Students-Chinese](https://github.com/eventapart/Cambridge-Students-Chinese)

---

## 功能特性

- **成语查询**：支持拼音、关键字与成语全文搜索  
- **成语释义**：展示直译与意译，帮助学生理解含义  
- **成语故事**：收录部分成语的历史典故与文化背景  
- **随机推荐**：提供随机成语与成语故事，辅助日常学习  
- **响应式设计**：支持桌面与移动端访问，基于 Bootstrap 5 构建  

---

## 在线预览

你可以通过以下链接直接使用成语词典工具：  
[剑桥学生中文成语词典](https://aneventapart.cn/tools/csc-idioms.html)

---

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)  
- **框架**: Bootstrap 5  
- **数据源**: 成语 JSON 数据集（包含释义与故事）  

---

## 使用方法

1. 克隆本项目仓库：
   ```bash
   git clone https://github.com/eventapart/Cambridge-Students-Chinese.git
   ```
2. 进入项目目录并启动本地服务器（例如使用 VSCode Live Server 或 Python 简易服务器）：
   ```bash
   cd Cambridge-Students-Chinese
   python3 -m http.server 8080
   ```
3. 打开浏览器访问：
   ```
   http://localhost:8080/tools/csc-idioms.html
   ```

---

## 目录结构

```
Cambridge-Students-Chinese/
├── tools/
│   └── csc-idioms.html   # 成语词典主工具页面
├── data/
│   └── idioms.json         # 成语与释义数据
├── css/                    # 样式文件
├── js/                     # 脚本文件
└── README.md               # 项目说明
```

---

## 贡献方式

欢迎提交 Pull Request 或 Issue：  
- 报告错误与改进建议  
- 补充或修订成语释义与故事  
- 优化界面与交互设计  

---

## 许可证

本项目采用 **MIT License**，详情见 [LICENSE](LICENSE) 文件。
