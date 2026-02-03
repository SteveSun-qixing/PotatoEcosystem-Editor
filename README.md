# Chips Editor - 卡片编辑引擎

<p align="center">
  <img src="./src/assets/logo.svg" alt="Chips Editor Logo" width="128" height="128" />
</p>

<p align="center">
  <strong>薯片生态的核心应用 - 创建和编辑卡片的专业软件平台</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#开发指南">开发指南</a> •
  <a href="#架构设计">架构设计</a> •
  <a href="#API-文档">API 文档</a> •
  <a href="#贡献指南">贡献指南</a>
</p>

<p align="center">
  <a href="https://github.com/chips-ecosystem/chips-editor/actions"><img src="https://img.shields.io/github/actions/workflow/status/chips-ecosystem/chips-editor/ci.yml?branch=main" alt="Build Status" /></a>
  <a href="https://www.npmjs.com/package/@chips/editor"><img src="https://img.shields.io/npm/v/@chips/editor" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
  <a href="https://codecov.io/gh/chips-ecosystem/chips-editor"><img src="https://img.shields.io/codecov/c/github/chips-ecosystem/chips-editor" alt="Coverage" /></a>
</p>

---

## 项目介绍

Chips Editor（卡片编辑引擎）是薯片生态系统的核心应用，提供专业的卡片创建和编辑功能。作为一个强大的编辑框架，它支持多种布局模式、丰富的拖放交互，以及完整的撤销重做系统。

### 核心特点

- **框架化设计**: 编辑引擎本身是框架，实际编辑功能由插件提供
- **实时保存**: 自动保存所有更改，无需手动保存
- **双布局支持**: 无限画布和工作台两种布局模式
- **完全可扩展**: 通过插件系统扩展任意功能

---

## 功能特性

### 布局系统

| 功能 | 描述 |
|------|------|
| **无限画布布局** | 自由摆放卡片窗口，无限扩展，支持缩放（10%-500%）和平移 |
| **工作台布局** | 分区窗口组合方式，左侧文件管理器 + 中间编辑区 + 右侧属性面板 |
| **布局切换** | 一键切换布局模式，自动保存和恢复布局状态 |

### 编辑功能

| 功能 | 描述 |
|------|------|
| **文件管理器** | 树形结构展示卡片和箱子文件，支持搜索、新建、重命名、删除 |
| **编辑面板** | 显示基础卡片的编辑组件，支持插件扩展 |
| **卡箱库** | 26 种基础卡片类型和 8 种箱子布局类型，拖放创建 |
| **程序坞** | 快速访问工具窗口，支持最小化和恢复 |

### 交互系统

| 功能 | 描述 |
|------|------|
| **拖放系统** | 支持从卡箱库拖放、文件系统拖入、卡片排序、卡片嵌套 |
| **撤销重做** | 完整的操作历史支持，可回溯到任意历史节点 |
| **快捷键** | 丰富的键盘快捷键支持 |
| **窗口管理** | 窗口堆叠、聚焦、移动、缩放、最小化、折叠 |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Vue 3 + TypeScript |
| **状态管理** | Pinia |
| **构建工具** | Vite |
| **测试** | Vitest + Vue Test Utils |
| **代码规范** | ESLint + Prettier |
| **桌面封装** | Electron |

### 依赖项目

```
@chips/core       - 薯片微内核（中心路由、模块管理）
@chips/foundation - 公共基础层（渲染器、窗口管理器）
@chips/sdk        - 开发工具包（API 封装）
@chips/components - 组件库（UI 组件）
```

---

## 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **操作系统**: macOS / Windows / Linux

### 安装依赖

```bash
# 克隆仓库
git clone https://github.com/chips-ecosystem/chips-editor.git
cd chips-editor

# 安装依赖
npm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 查看应用。

### 构建生产版本

```bash
# 类型检查并构建
npm run build

# 预览构建结果
npm run preview
```

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

---

## 项目结构

```
Chips-Editor/
├── src/
│   ├── core/                    # 核心模块
│   │   ├── editor.ts            # 编辑器主类
│   │   ├── connector.ts         # SDK 连接器
│   │   ├── window-manager.ts    # 窗口管理器
│   │   ├── command-manager.ts   # 命令管理器（撤销/重做）
│   │   ├── drag-drop-manager.ts # 拖放管理器
│   │   ├── event-manager.ts     # 事件管理器
│   │   └── state/               # 状态管理（Pinia Stores）
│   │
│   ├── layouts/                 # 布局模块
│   │   ├── infinite-canvas/     # 无限画布布局
│   │   └── workbench/           # 工作台布局
│   │
│   ├── components/              # 功能组件
│   │   ├── window/              # 窗口组件
│   │   ├── file-manager/        # 文件管理器
│   │   ├── edit-panel/          # 编辑面板
│   │   ├── card-box-library/    # 卡箱库
│   │   ├── dock/                # 程序坞
│   │   └── drag-drop/           # 拖放组件
│   │
│   ├── plugins/                 # 插件系统
│   ├── composables/             # Vue Composables
│   ├── types/                   # TypeScript 类型定义
│   ├── utils/                   # 工具函数
│   └── styles/                  # 全局样式
│
├── tests/                       # 测试文件
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── e2e/                     # 端到端测试
│
├── docs/                        # 文档
│   ├── API.md                   # API 文档
│   ├── ARCHITECTURE.md          # 架构文档
│   └── USER_GUIDE.md            # 用户指南
│
└── 技术文档/                     # 中文技术文档
```

---

## 开发指南

### 开发规范

本项目遵循薯片生态的统一开发规范：

1. **中心路由原则**: 所有通信通过微内核路由
2. **多语言支持**: 所有文本使用 i18n
3. **配置化**: 所有配置通过配置系统管理
4. **主题支持**: 使用 CSS 变量，支持主题切换
5. **测试覆盖**: 核心模块测试覆盖率 >= 80%

### 代码风格

```bash
# 运行代码检查
npm run lint

# 自动修复可修复的问题
npm run lint:fix

# 格式化代码
npm run format
```

### 类型检查

```bash
# 运行 TypeScript 类型检查
npm run typecheck
```

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat(module): 添加新功能
fix(module): 修复问题
docs(module): 更新文档
refactor(module): 代码重构
test(module): 添加或修改测试
chore(module): 其他修改
```

---

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                     Chips Editor                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │InfiniteCanvas│  │  Workbench  │  │  Other...   │     │
│  │   (布局)      │  │   (布局)    │  │   (布局)    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │FileManager│ │EditPanel │ │CardBoxLib│ │   Dock   │   │
│  │ 文件管理器 │ │ 编辑面板  │ │  卡箱库   │ │  程序坞  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│                    Core Layer                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Editor  │ │ Window   │ │ Command  │ │ DragDrop │   │
│  │  主类    │ │ Manager  │ │ Manager  │ │ Manager  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│                    State (Pinia)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │EditorStore│ │CardStore │ │ UIStore  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
├─────────────────────────────────────────────────────────┤
│                    Chips SDK                            │
└─────────────────────────────────────────────────────────┘
```

详细架构设计请参阅 [ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

---

## API 文档

### 创建编辑器实例

```typescript
import { createEditor } from '@chips/editor';

const editor = createEditor({
  layout: 'infinite-canvas',
  debug: true,
  autoSaveInterval: 30000,
});

await editor.initialize();
```

### 卡片操作

```typescript
// 创建卡片
const card = await editor.createCard({ name: '新卡片' });

// 打开卡片
await editor.openCard('/path/to/card.chip');

// 保存卡片
await editor.saveCard(cardId);

// 关闭卡片
editor.closeCard(cardId);
```

### 事件系统

```typescript
// 订阅事件
editor.on('card:saved', (data) => {
  console.log('卡片已保存:', data.cardId);
});

// 一次性订阅
editor.once('editor:ready', () => {
  console.log('编辑器已就绪');
});
```

完整 API 文档请参阅 [API.md](./docs/API.md)。

---

## 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

- 提交 Bug 报告
- 提出新功能建议
- 提交代码修复和新功能
- 改进文档

详细贡献指南请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 相关项目

| 项目 | 描述 |
|------|------|
| [Chips-Core](https://github.com/chips-ecosystem/chips-core) | 薯片微内核 |
| [Chips-Foundation](https://github.com/chips-ecosystem/chips-foundation) | 公共基础层 |
| [Chips-SDK](https://github.com/chips-ecosystem/chips-sdk) | 开发工具包 |
| [Chips-Components](https://github.com/chips-ecosystem/chips-components) | 组件库 |

---

## 许可证

本项目基于 [MIT 许可证](./LICENSE) 开源。

---

## 团队

**维护团队**: 薯片生态核心团队  
**联系方式**: dev@chips-ecosystem.io  
**最后更新**: 2026-02-02
