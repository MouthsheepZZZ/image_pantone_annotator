# Pantone 色彩选择器

[English](./README.md) | [中文](./README_zh.md)

专业的网页端工具，用于从图片中提取颜色并匹配到 Pantone 色卡，提供可视化标注功能。适合设计师、艺术家和色彩专业人士使用。

## 功能特性

- **本地服务器应用**：需要本地 Web 服务器来加载数据文件
- **图片上传**：支持拖放或点击上传图片
- **颜色提取**：点击图片任意位置即可提取颜色
- **精准 Pantone 匹配**：使用 Delta E 2000 算法实现卓越的颜色匹配精度
- **可视化标注**：提供美观的色块、连接线和标签
- **可拖动色块**：通过鼠标拖动自由移动色块和采样点
- **图像平移与缩放**：使用鼠标右键/中键平移图像，使用滚轮缩放图像
- **自定义显示**：通过设置面板调整色块大小和字体大小
- **导出选项**：下载带标注的图片或将颜色数据导出为 JSON
- **多点采样**：添加多个颜色采样点创建完整的色彩方案
- **颜色过滤**：按 Pantone 系统（Graphics/FHI/Plastics）和卡片类型筛选
- **相似颜色**：查找和比较相似的 Pantone 颜色，支持阈值调整
- **分割颜色对比**：相似颜色对话框中的色块一分为二，左侧显示原始采样颜色，右侧显示 Pantone 匹配色，便于直观对比
- **导入/导出**：以 JSON 格式保存和加载颜色项目
- **多语言支持**：支持中文和英文界面
- **海量数据库**：包含 20,970+ 种 Pantone 颜色，覆盖所有类别

## 截图

![Pantone Color Picker Interface](./docs/screenshot.png)
*从图片中提取颜色并匹配到 Pantone 色卡*

## 文件说明

- `index.html` - 主应用界面，采用响应式设计
- `color_picker.js` - 核心交互逻辑和画布处理
- `color_utils.js` - 颜色转换和匹配算法（Delta E 2000）
- `i18n.js` - 多语言国际化支持
- `pantone_data.json` - Pantone 颜色数据库（3MB+，20,970+ 种颜色）
- `locales/` - 翻译文件（en.json, zh.json）
- `Pantone_finder/` - 原始数据爬虫和 JSON 数据源
- `docs/` - 文档和格式规范

## 如何使用

您可以通过以下两种方式使用本工具：

### 1. 在线使用 (推荐)

直接通过已部署的 GitHub Pages 访问：

**[https://mouthsheepzzz.github.io/image_pantone_annotator/](https://mouthsheepzzz.github.io/image_pantone_annotator/)**

这是最简单快捷的方式，无需任何本地配置。

### 2. 本地部署

如果您需要在本地运行该工具，或者希望进行二次开发，请按以下步骤操作：

#### 方法一：Windows 批处理文件 (最简单)

双击 `start_server.bat` 文件，它将自动启动一个本地服务器，并在您的浏览器中打开应用程序。

#### 方法二：命令行

**启动一个本地 Web 服务器：**

```bash
# 使用 Python 3
python -m http.server 8000

# 或使用 Python 2
python -m SimpleHTTPServer 8000

# 或使用 Node.js
npx http-server -p 8000
```

然后在浏览器中打开 `http://localhost:8000/index.html`。

> **注意**：必须使用本地服务器，因为应用需要通过 `fetch` API 加载 Pantone 颜色数据库 (`pantone_data.json`)。如果直接通过 `file:///...` 方式打开 HTML 文件，浏览器的安全策略会阻止此操作。




### 基本工作流程

1. **打开应用**：使用上述任一方法打开应用。
2. **上传图片**：
   - 点击上传区域或拖放图片
   - 或按 `Ctrl+V` 从剪贴板粘贴
4. **提取颜色**：点击图片上的任意位置提取颜色
5. 工具将显示最接近的 Pantone 颜色，包括：
   - 色块
   - Pantone 代码（例如："19-3909 TCX"）
   - 颜色名称（例如："Black Bean"）
   - Delta E 值（颜色差异度）
   - 从点击位置到色块的连接线

### 高级功能

- **平移和缩放**：上传图片后，您可以：
  - **平移**：按住鼠标右键或中键并拖动以移动图像。
  - **缩放**：使用鼠标滚轮进行放大和缩小。
- **拖动重新定位**：点击并拖动任何色块或采样点来移动它
- **查找相似颜色**：点击色块上的"相似"按钮探索替代颜色方案
  - 每个色块显示分割视图：原始颜色（左侧）vs Pantone 匹配色（右侧）
  - 轻松对比采样颜色与潜在的 Pantone 替代方案
  - 调整 Delta E 阈值以找到更多或更少的相似颜色
- **颜色过滤**：使用"颜色过滤"面板限制匹配到特定的 Pantone 系统
- **自定义外观**：点击"设置"按钮调整：
  - 色块大小（40-150px）
  - 代码字体大小（10-24px）
  - 名称字体大小（8-18px）
  - 标签宽度（80-200px）
- **添加多个采样点**：点击多个位置创建完整的色彩方案
- **导出选项**：
  - **导出图片**：下载带有所有颜色信息的标注图片
  - **导出 JSON**：保存项目数据，包括所有颜色采样点
  - **导入 JSON**：加载之前保存的项目

### 键盘快捷键

- `Ctrl+V` / `Cmd+V` - 从剪贴板粘贴图片
- `Ctrl+Z` / `Cmd+Z` - 撤销上一步操作
- `Delete` - 删除选中的颜色采样点

### 全局配置

你也可以通过浏览器控制台修改 `window.SWATCH_CONFIG` 来程序化调整设置：

```javascript
window.SWATCH_CONFIG.swatchSize = 100;
window.SWATCH_CONFIG.fontSize = 16;
window.SWATCH_CONFIG.nameFontSize = 12;
window.SWATCH_CONFIG.labelWidth = 150;
```

## 技术细节

### 颜色匹配算法

使用 **Delta E 2000 (CIEDE2000)** - 业界标准的感知色差匹配算法：
- 将 RGB 转换到 LAB 色彩空间（D65 光源，2° 观察者）
- 应用 CIEDE2000 公式实现精确的感知色差计算
- 考虑人眼对颜色差异的非均匀敏感性
- 相比 Delta E 76 或简单欧氏距离提供更优越的精度
- 在 20,970+ 种 Pantone 颜色中找到最佳匹配

### 画布图层

- **图像画布**：显示上传的图片
- **主画布**：渲染标注（采样点、连接线、色块、标签）

### 支持的格式

- JPG/JPEG
- PNG
- GIF
- WebP

## 浏览器兼容性

支持所有现代浏览器，需要以下特性：
- HTML5 Canvas
- File API
- ES6 JavaScript

## 依赖项

- **零依赖！** 所有 Pantone 数据从 JSON 文件加载
- 不需要外部 JavaScript 库
- 需要本地 Web 服务器（Python、Node.js 或任何 HTTP 服务器）
## 项目结构

```
pantone_color_creator/
├── index.html             # 主应用界面
├── color_picker.js        # 应用逻辑和交互处理
├── color_utils.js         # 颜色转换和 Delta E 2000 算法
├── i18n.js                # 国际化支持
├── pantone_data.json      # Pantone 数据库（20,970+ 种颜色）
├── start_server.bat       # Windows 批处理文件，用于启动服务器
├── README.md              # 英文文档
├── README_zh.md           # 本文件（中文文档）
├── locales/               # 翻译文件
│   ├── en.json            # 英文翻译
│   └── zh.json            # 中文翻译
├── docs/                  # 文档
│   ├── JSON_FORMAT.md     # JSON 导出格式规范
│   └── pantone_category.md # Pantone 类别参考
└── Pantone_finder/        # 原始数据爬虫
    ├── fetch_colors.py    # Pantone 数据的 Python 爬虫
    ├── index.html         # 原始 Pantone 查找器
    ├── pantone.js         # 原始查找器逻辑
    └── set1.json          # 源 JSON 数据
```

## 工作原理

1. **数据收集**：`fetch_colors.py` 从 numerosamente.it 爬取 Pantone 颜色
2. **数据存储**：JSON 数据存储在 `pantone_data.json` 中以支持异步加载
3. **数据加载**：应用启动时异步获取数据
4. **颜色匹配**：使用 LAB 色彩空间和 CIEDE2000 公式进行精确匹配
5. **本地服务器**：需要 HTTP 服务器以使 fetch API 正常工作

## 数据源

Pantone 颜色数据使用包含的 Python 脚本从 [numerosamente.it](https://numerosamente.it) 爬取。

## 贡献

欢迎贡献！你可以：
- 报告 bug
- 建议新功能
- 提交 pull request
- 改进文档

## 致谢

本项目扩展自 picorana 的原始 [Pantone Finder](https://github.com/picorana/Pantone_finder) 项目。

## 许可证

MIT 许可证 - 可自由用于个人或商业用途。

---

**用 ❤️ 为设计师和色彩专业人士打造**
