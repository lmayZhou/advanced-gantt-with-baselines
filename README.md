# 高级甘特图 - 基准线与动态交互

一个专业级的甘特图实现，灵感来源于 DHTMLX Gantt，支持基准线对比、交互式时间轴和任务管理。

## ✨ 功能特性

### 📊 核心功能
- **多视图模式**：支持日视图、周视图、月视图三种时间粒度
- **基准线对比**：可视化实际进度与计划基准的差异
- **层级任务管理**：支持项目/任务的父子层级关系，可展开/收起
- **任务类型支持**：
  - 普通任务（绿色）
  - 概要项目（蓝色）
  - 重要里程碑（粉色菱形）

### 🎯 交互功能
- **拖拽调整**：
  - 移动任务条调整开始/结束日期
  - 拖拽边缘调整任务时长
  - 拖拽基准线调整计划时间
  - 拖拽进度手柄调整完成百分比
- **列宽调整**：可拖拽调整表格列宽度
- **双击编辑**：双击任务条或基准线弹出详情编辑弹窗
- **智能时间轴**：根据任务日期自动扩展时间轴范围

### 🤖 AI 智能分析（集成 Google Gemini）
- 自动分析项目进度
- 对比实际与计划日期
- 识别延迟和优化建议
- 生成项目健康度评分

## 🏗️ 项目架构

```
advanced-gantt-with-baselines/
├── App.tsx                    # 主应用组件
├── index.tsx                  # 应用入口
├── index.html                 # HTML 模板
├── types.ts                   # TypeScript 类型定义
├── constants.ts               # 配置常量和初始数据
├── vite.config.ts             # Vite 配置
├── package.json               # 依赖配置
├── services/
│   └── geminiService.ts       # Google Gemini AI 服务
└── components/                # 组件目录（预留）
```

## 🛠️ 技术栈

- **框架**: React 19.2.3
- **构建工具**: Vite 6.2.0
- **样式**: Tailwind CSS (CDN)
- **类型**: TypeScript 5.8.2
- **图标**: Heroicons React
- **AI**: Google GenAI (@google/genai 1.37.0)

## 📦 安装与运行

### 前置要求
- Node.js 18+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
应用将在 http://localhost:3000 启动

### 生产构建
```bash
npm run build
```

### 预览构建
```bash
npm run preview
```

## 🎮 使用指南

### 基本操作

1. **新增任务**
   - 点击右上角"新增任务"按钮
   - 填写任务名称、开始/结束日期
   - 选择任务类型（普通任务/概要项目/里程碑）
   - 点击"确认创建"

2. **调整任务**
   - **移动**：拖拽任务条左右移动
   - **调整时长**：拖拽任务条左右边缘
   - **调整进度**：拖拽任务条内部的进度手柄
   - **调整基准线**：拖拽底部虚线基准线

3. **编辑详情**
   - 双击任务条或基准线
   - 在弹窗中修改详细信息
   - 点击"保存修改"

4. **切换视图**
   - 点击顶部"日/周/月"按钮切换时间粒度
   - 不同视图下时间轴宽度和显示方式会变化

5. **列宽调整**
   - 鼠标悬停在表格列标题右侧边缘
   - 出现调整手柄时拖拽调整宽度

### 任务层级
- 通过 `parent` 属性建立父子关系
- 父任务可展开/收起子任务
- 缩进显示层级结构

## 📝 数据结构

### Task 接口
```typescript
interface Task {
  id: string;                    // 任务唯一标识
  text: string;                  // 任务名称
  start_date: Date;              // 实际开始日期
  end_date: Date;                // 实际结束日期
  duration: number;              // 持续天数
  progress: number;              // 完成进度 (0-1)
  parent?: string;               // 父任务ID
  open?: boolean;                // 是否展开子任务
  type?: 'task' | 'project' | 'milestone';  // 任务类型
  planned_start?: Date;          // 计划开始日期（基准线）
  planned_end?: Date;            // 计划结束日期（基准线）
}
```

### 配置项
```typescript
const GANTT_CONFIG = {
  cellWidth: 50,      // 时间轴单元格宽度（日视图）
  rowHeight: 60,      // 行高
  headerHeight: 80,   // 表头高度
  gridWidth: 650,     // 左侧表格宽度
};
```

## 🔧 配置

### 环境变量
创建 `.env.local` 文件配置 Google Gemini API 密钥：
```env
GEMINI_API_KEY=your_api_key_here
```

### Vite 配置
- 端口：3000
- 主机：0.0.0.0（支持局域网访问）
- 路径别名：`@` 指向项目根目录

## 🎨 样式特性

- **Tailwind CSS**：使用 utility-first CSS
- **自定义滚动条**：优化的滚动条样式
- **动画效果**：
  - 拖拽时的缩放和透明度变化
  - 弹窗的淡入和缩放动画
  - 悬停时的阴影效果
- **颜色编码**：
  - 概要项目：蓝色系
  - 执行任务：绿色系
  - 里程碑：粉色菱形
  - 基准线：灰色虚线

## 📱 响应式设计

- 固定高度布局（100vh）
- 横向滚动的时间轴
- 纵向滚动的任务列表
- 同步滚动的表格和时间轴

## 🚀 扩展开发

### 添加新组件
项目预留了 `components/` 目录，可添加：
- GanttHeader.tsx - 表头组件
- GanttRow.tsx - 行组件
- Tooltip.tsx - 工具提示组件

### 集成更多 AI 服务
在 `services/` 目录下可添加：
- OpenAI 服务
- Claude 服务
- 其他 AI 分析服务

### 自定义主题
修改 `index.html` 中的 CSS 变量或 Tailwind 配置：
```css
/* 自定义颜色 */
.actual-bar { background: #your-color; }
.baseline-bar { border-color: #your-color; }
```

## 🐛 已知限制

1. **AI 功能**：需要有效的 Google Gemini API 密钥
2. **浏览器兼容**：现代浏览器（Chrome 90+, Firefox 90+, Safari 15+）
3. **性能**：大量任务（>1000）时可能需要优化

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发起 PR
- 邮件联系

---

**Built with ❤️ using React & Vite**
