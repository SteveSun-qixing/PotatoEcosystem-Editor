# Changelog

本文档记录 Chips Editor 的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.0] - 2026-02-02

### 新功能

#### 核心功能
- **编辑器主类** (`ChipsEditor`)
  - 统一的编辑器 API
  - 完整的生命周期管理（初始化、销毁）
  - SDK 连接器集成
  - 自动保存机制

- **状态管理系统** (Pinia)
  - `EditorStore` - 编辑器全局状态
  - `CardStore` - 卡片状态管理
  - `UIStore` - UI 状态管理

- **事件系统** (`EventEmitter`)
  - 支持普通订阅和一次性订阅
  - 支持通配符订阅
  - 支持 Promise 等待事件

#### 布局系统
- **无限画布布局** (`InfiniteCanvas`)
  - 两层界面设计（桌面层 + 窗口层）
  - 无限平移和缩放（10%-500%）
  - 触摸板和鼠标滚轮支持
  - 视口裁剪优化

- **工作台布局** (`Workbench`)
  - 分区窗口组合布局
  - 可调整面板大小
  - 面板折叠功能

- **布局切换**
  - 一键切换布局模式
  - 自动保存和恢复布局状态

#### 窗口管理
- **窗口管理器** (`WindowManager`)
  - 卡片窗口和工具窗口支持
  - 窗口堆叠顺序管理
  - 窗口移动、缩放、最小化、折叠
  - 窗口平铺和层叠布局

- **窗口组件**
  - `BaseWindow` - 基础窗口组件
  - `CardWindow` - 卡片窗口组件
  - `ToolWindow` - 工具窗口组件
  - `WindowMenu` - 窗口菜单栏组件

#### 文件管理
- **文件管理器** (`FileManager`)
  - 树形结构展示
  - 文件搜索功能
  - 新建、重命名、删除操作
  - 上下文菜单

- **文件服务** (`FileService`)
  - 文件读写操作
  - 最近文件列表
  - 文件监视

#### 编辑面板
- **编辑面板** (`EditPanel`)
  - 基础卡片编辑组件加载
  - 插件宿主支持
  - 默认编辑器

- **插件宿主** (`PluginHost`)
  - 动态加载编辑器插件
  - 插件生命周期管理

#### 卡箱库
- **卡箱库** (`CardBoxLibrary`)
  - 26 种基础卡片类型
  - 8 种箱子布局类型
  - 拖放预览
  - 分类浏览

#### 程序坞
- **程序坞** (`Dock`)
  - 工具窗口快速访问
  - 最小化窗口显示
  - 图标点击交互

#### 拖放系统
- **拖放管理器** (`DragDropManager`)
  - 统一的拖放状态管理
  - 拖放源和目标注册
  - 放置验证

- **拖放组件**
  - `DragGhost` - 拖动幽灵
  - `DropHighlight` - 放置高亮
  - `InsertIndicator` - 插入位置指示器
  - `FileDropZone` - 文件拖入区域
  - `SortableList` - 可排序列表
  - `NestableCard` - 可嵌套卡片

- **拖放 Hooks**
  - `useFileDrop` - 文件拖入处理
  - `useCardSort` - 卡片排序
  - `useCardNest` - 卡片嵌套

#### 撤销重做系统
- **命令管理器** (`CommandManager`)
  - 命令模式实现
  - 撤销/重做栈管理
  - 命令合并
  - 历史记录跳转

- **内置命令**
  - `AddBaseCardCommand` - 添加基础卡片
  - `RemoveBaseCardCommand` - 移除基础卡片
  - `MoveBaseCardCommand` - 移动基础卡片
  - `UpdateBaseCardCommand` - 更新基础卡片

- **历史面板** (`HistoryPanel`)
  - 操作历史列表
  - 点击跳转到历史节点

#### 快捷键
- **快捷键管理** (`useKeyboardShortcuts`)
  - 全局快捷键注册
  - 快捷键冲突检测
  - 可自定义配置

### 技术特性

- **Vue 3 + TypeScript**
  - 完整的类型定义
  - Composition API
  - 响应式状态管理

- **Pinia 状态管理**
  - 模块化 Store
  - TypeScript 支持
  - DevTools 集成

- **Vite 构建**
  - 快速开发服务器
  - 优化的生产构建
  - 代码分割

- **测试覆盖**
  - 单元测试（Vitest）
  - 组件测试（Vue Test Utils）
  - 核心模块覆盖率 > 80%

### 性能优化

- 视口裁剪 - 只渲染可见窗口
- LOD 渲染 - 根据缩放级别调整细节
- 虚拟滚动 - 大列表优化
- 防抖保存 - 减少保存频率
- 懒加载 - 组件和插件按需加载

### 文档

- README.md - 项目介绍和快速开始
- API.md - 完整 API 文档
- ARCHITECTURE.md - 技术架构文档
- USER_GUIDE.md - 用户指南
- CONTRIBUTING.md - 贡献指南

---

## [0.9.0] - 2026-01-28

### 新功能

- 集成测试框架搭建
- 性能基准测试
- CI/CD 流程配置

### 修复

- 修复窗口焦点切换时的闪烁问题
- 修复拖放时的坐标计算错误
- 修复布局切换后状态丢失问题

---

## [0.8.0] - 2026-01-25

### 新功能

- 程序坞完成
- 快捷键系统完成
- 历史记录面板完成

---

## [0.7.0] - 2026-01-20

### 新功能

- 卡箱库完成
- 拖放创建功能完成
- 拖放系统核心完成

---

## [0.6.0] - 2026-01-15

### 新功能

- 编辑面板完成
- 插件宿主完成
- 默认编辑器完成

---

## [0.5.0] - 2026-01-10

### 新功能

- 文件管理器完成
- 文件树组件完成
- 文件服务完成

---

## [0.4.0] - 2026-01-05

### 新功能

- 无限画布布局完成
- 缩放控制器完成
- 坐标系统完成

---

## [0.3.0] - 2025-12-30

### 新功能

- 窗口管理系统完成
- 卡片窗口组件完成
- 工具窗口组件完成

---

## [0.2.0] - 2025-12-25

### 新功能

- 核心通信层完成
- SDK 连接器完成
- 状态管理系统完成

---

## [0.1.0] - 2025-12-20

### 新功能

- 项目初始化
- 基础架构搭建
- 开发环境配置

---

[1.0.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v1.0.0
[0.9.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v0.9.0
[0.8.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v0.8.0
[0.7.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v0.7.0
[0.6.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v0.6.0
[0.5.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v0.5.0
[0.4.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v0.4.0
[0.3.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v0.3.0
[0.2.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v0.2.0
[0.1.0]: https://github.com/chips-ecosystem/chips-editor/releases/tag/v0.1.0
