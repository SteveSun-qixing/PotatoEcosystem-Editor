# Chips Editor 技术架构文档

**版本**: 1.0.0  
**更新日期**: 2026-02-02

---

## 目录

- [整体架构](#整体架构)
- [核心模块设计](#核心模块设计)
- [状态管理设计](#状态管理设计)
- [插件系统设计](#插件系统设计)
- [布局系统设计](#布局系统设计)
- [通信架构](#通信架构)
- [性能优化策略](#性能优化策略)

---

## 整体架构

### 架构概述

Chips Editor 采用分层架构设计，遵循薯片生态的微内核架构原则。所有通信通过中心路由进行，确保模块间的解耦和可维护性。

```
┌─────────────────────────────────────────────────────────────────┐
│                       Chips Editor                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    UI Layer (Vue 组件)                      │ │
│  │                                                             │ │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │ │
│  │   │   Layouts   │  │ Components  │  │   Composables   │   │ │
│  │   │ 无限画布/工作台│  │ 窗口/面板等  │  │    Vue Hooks    │   │ │
│  │   └─────────────┘  └─────────────┘  └─────────────────┘   │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Core Layer (核心模块)                     │ │
│  │                                                             │ │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │ │
│  │   │  Editor  │ │ Window   │ │ Command  │ │  DragDrop    │ │ │
│  │   │  主类    │ │ Manager  │ │ Manager  │ │  Manager     │ │ │
│  │   └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │ │
│  │                                                             │ │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐                  │ │
│  │   │  Event   │ │ Connector│ │  File    │                  │ │
│  │   │ Manager  │ │  (SDK)   │ │ Service  │                  │ │
│  │   └──────────┘ └──────────┘ └──────────┘                  │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                State Layer (Pinia Stores)                   │ │
│  │                                                             │ │
│  │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │ │
│  │   │ EditorStore  │ │  CardStore   │ │   UIStore    │      │ │
│  │   │  编辑器状态   │ │   卡片状态    │ │   UI 状态    │      │ │
│  │   └──────────────┘ └──────────────┘ └──────────────┘      │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                   │
├─────────────────────────────────────────────────────────────────┤
│                       Chips SDK                                  │
├─────────────────────────────────────────────────────────────────┤
│                       Chips Core (微内核)                        │
├─────────────────────────────────────────────────────────────────┤
│           Chips Foundation (公共基础层) / Plugins                │
└─────────────────────────────────────────────────────────────────┘
```

### 架构原则

#### 1. 中心路由原则

所有通信通过微内核路由，禁止模块间直接调用。

```typescript
// ✅ 正确：通过 SDK 调用
const response = await sdk.connector.request({
  service: 'card.read',
  payload: { cardId },
});

// ❌ 错误：直接调用
import { CardReader } from '@chips/foundation';
CardReader.read(cardId);
```

#### 2. 分层解耦原则

- **UI Layer**: 只负责界面渲染和用户交互
- **Core Layer**: 处理业务逻辑
- **State Layer**: 管理应用状态
- **SDK Layer**: 封装与微内核的通信

#### 3. 单向数据流

```
用户操作 → Core → State → UI 更新
              ↓
           SDK → 微内核 → 基础层
```

---

## 核心模块设计

### ChipsEditor 主类

编辑器的入口类，协调所有模块。

```typescript
class ChipsEditor {
  // 核心组件
  private config: EditorConfig;
  private events: EventEmitter;
  private connector: SDKConnector;
  
  // Pinia Stores
  private editorStore: EditorStore;
  private cardStore: CardStore;
  private uiStore: UIStore;
  
  // 生命周期
  async initialize(): Promise<void>;
  destroy(): void;
  
  // 卡片操作
  async createCard(options): Promise<Card>;
  async openCard(pathOrId, options?): Promise<Card>;
  async saveCard(cardId, options?): Promise<void>;
  closeCard(cardId, force?): boolean;
  
  // 布局操作
  setLayout(layout: LayoutType): void;
  getLayout(): LayoutType;
  
  // 事件系统
  on(eventType, handler): string;
  off(eventType, handler): void;
  emit(eventType, data): void;
}
```

**职责**:
- 初始化和销毁编辑器
- 协调各模块工作
- 提供统一的对外 API
- 管理编辑器生命周期

---

### WindowManager 窗口管理器

负责所有窗口的生命周期管理。

```typescript
class WindowManager {
  // 窗口创建
  createCardWindow(cardId, options?): string;
  createToolWindow(component, options?): string;
  
  // 窗口操作
  closeWindow(windowId): void;
  focusWindow(windowId): void;
  moveWindow(windowId, position): void;
  resizeWindow(windowId, size): void;
  minimizeWindow(windowId): void;
  restoreWindow(windowId): void;
  
  // 布局操作
  tileWindows(options?): void;
  cascadeWindows(options?): void;
  
  // 查询方法
  getWindow(windowId): WindowConfig | undefined;
  getAllWindows(): WindowConfig[];
  getFocusedWindow(): WindowConfig | null;
}
```

**职责**:
- 创建、关闭、管理窗口
- 维护窗口堆叠顺序（z-index）
- 处理窗口移动、缩放、焦点
- 窗口平铺和层叠布局

**设计要点**:
- 使用单例模式
- 延迟初始化 Pinia Store
- 自动计算窗口位置（级联排列）

---

### CommandManager 命令管理器

实现撤销/重做系统的命令模式管理器。

```typescript
class CommandManager {
  // 命令执行
  async execute(command: Command): Promise<void>;
  async undo(): Promise<boolean>;
  async redo(): Promise<boolean>;
  
  // 状态查询
  canUndo(): boolean;
  canRedo(): boolean;
  
  // 历史管理
  getHistory(limit?): CommandHistory[];
  goToHistory(historyId): Promise<boolean>;
  clear(): void;
  
  // 事件订阅
  on(event, callback): void;
  off(event, callback): void;
}
```

**职责**:
- 执行命令并记录历史
- 撤销和重做操作
- 命令合并（连续相同操作）
- 历史记录管理

**命令接口**:

```typescript
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  description: string;
  canMergeWith?(other: Command): boolean;
  mergeWith?(other: Command): void;
}
```

**内置命令**:
- `AddBaseCardCommand` - 添加基础卡片
- `RemoveBaseCardCommand` - 移除基础卡片
- `MoveBaseCardCommand` - 移动基础卡片
- `UpdateBaseCardCommand` - 更新基础卡片
- `MoveWindowCommand` - 移动窗口
- `ResizeWindowCommand` - 调整窗口大小

---

### DragDropManager 拖放管理器

统一管理编辑器中的所有拖放操作。

```typescript
class DragDropManager {
  // 注册
  registerSource(id, config): void;
  unregisterSource(id): void;
  registerTarget(id, config): void;
  unregisterTarget(id): void;
  
  // 拖放操作
  startDrag(config): DragSource;
  updatePosition(position): void;
  setHoverTarget(targetId, rect?): void;
  drop(): Promise<boolean>;
  endDrag(success?): void;
  cancelDrag(): void;
  
  // 状态
  get state(): DragDropState;
}
```

**支持的拖放类型**:

| 源类型 | 描述 |
|--------|------|
| `file` | 从操作系统拖入的文件 |
| `card-library` | 从卡箱库拖出的卡片类型 |
| `layout-library` | 从卡箱库拖出的布局类型 |
| `base-card` | 从卡片内拖动基础卡片 |
| `card` | 拖动整个卡片 |

| 目标类型 | 描述 |
|----------|------|
| `canvas` | 画布空白区域 |
| `card` | 卡片（用于嵌套） |
| `card-slot` | 卡片内的插槽位置 |
| `trash` | 垃圾桶（删除） |

---

### EventManager 事件管理器

负责编辑器内部事件的发布和订阅。

```typescript
class EventEmitter {
  // 订阅
  on(eventType, handler): string;
  once(eventType, handler): string;
  off(eventType, handlerOrId?): void;
  
  // 发布
  emit(eventType, data): void;
  
  // 异步等待
  waitFor(eventType, timeout?): Promise<T>;
  
  // 工具方法
  hasListeners(eventType): boolean;
  listenerCount(eventType): number;
  eventNames(): string[];
  clear(): void;
}
```

**特性**:
- 支持普通订阅和一次性订阅
- 支持通配符订阅 (`*`)
- 支持 Promise 等待事件
- 处理器错误不会影响其他处理器

---

### SDKConnector SDK 连接器

封装与 Chips-SDK 的通信。

```typescript
class SDKConnector {
  // 连接管理
  async connect(): Promise<void>;
  disconnect(): void;
  get connected(): boolean;
  
  // SDK 访问
  getSDK(): MockSDKInstance;
}
```

**职责**:
- 管理 SDK 连接状态
- 提供 SDK 实例访问
- 处理连接错误和重连

---

## 状态管理设计

使用 Pinia 进行状态管理，按职责划分为三个 Store。

### EditorStore 编辑器状态

管理编辑器全局状态。

```typescript
const useEditorStore = defineStore('editor', {
  state: () => ({
    state: 'idle' as EditorState,
    isConnected: false,
    currentLayout: 'infinite-canvas' as LayoutType,
    hasUnsavedChanges: false,
    error: null as Error | null,
    config: {
      debug: false,
      autoSaveInterval: 30000,
      locale: 'zh-CN',
    },
  }),
  
  getters: {
    isReady: (state) => state.state === 'ready',
  },
  
  actions: {
    initialize(config),
    setState(state),
    setConnected(connected),
    setLayout(layout),
    setError(error),
    markUnsaved(),
    markSaved(),
    reset(),
  },
});
```

### CardStore 卡片状态

管理打开的卡片状态。

```typescript
const useCardStore = defineStore('card', {
  state: () => ({
    openCards: new Map<string, CardInfo>(),
    activeCardId: null as string | null,
    loadingCards: new Set<string>(),
  }),
  
  getters: {
    cardList: (state) => [...state.openCards.values()],
    activeCard: (state) => state.openCards.get(state.activeCardId),
    hasModifiedCards: (state) => /* ... */,
    modifiedCards: (state) => /* ... */,
  },
  
  actions: {
    addCard(card, filePath?),
    removeCard(cardId),
    setActiveCard(cardId),
    getCard(cardId),
    isCardOpen(cardId),
    markCardModified(cardId),
    markCardSaved(cardId),
    updateFilePath(cardId, path),
    setCardLoading(cardId, loading),
    clearAll(),
  },
});
```

### UIStore UI 状态

管理 UI 相关状态。

```typescript
const useUIStore = defineStore('ui', {
  state: () => ({
    windows: new Map<string, WindowConfig>(),
    focusedWindowId: null as string | null,
    nextZIndex: 1000,
    minimizedTools: new Set<string>(),
    sidebarCollapsed: false,
  }),
  
  getters: {
    windowList: (state) => [...state.windows.values()],
    cardWindows: (state) => /* 过滤卡片窗口 */,
    toolWindows: (state) => /* 过滤工具窗口 */,
    focusedWindow: (state) => state.windows.get(state.focusedWindowId),
  },
  
  actions: {
    addWindow(config),
    removeWindow(windowId),
    focusWindow(windowId),
    blurWindow(),
    moveWindow(windowId, x, y),
    resizeWindow(windowId, width, height),
    updateWindow(windowId, updates),
    setWindowState(windowId, state),
    minimizeTool(windowId),
    restoreTool(windowId),
    toggleSidebar(),
    clearWindows(),
  },
});
```

### 数据流

```
┌──────────────────────────────────────────────────────────────┐
│                        Vue 组件                               │
│                           ↓ 调用 actions                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ EditorStore  │  │  CardStore   │  │   UIStore    │       │
│  │              │  │              │  │              │       │
│  │   state      │  │   state      │  │   state      │       │
│  │   getters    │  │   getters    │  │   getters    │       │
│  │   actions    │  │   actions    │  │   actions    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         ↑                  ↑                  ↑               │
│         └──────────────────┼──────────────────┘               │
│                            ↓ 响应式更新                        │
│                        Vue 组件                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 插件系统设计

### 插件接口

```typescript
interface Plugin {
  /** 插件元数据 */
  metadata: PluginMetadata;
  /** 激活插件 */
  activate: (context: PluginContext) => void | Promise<void>;
  /** 停用插件 */
  deactivate?: () => void | Promise<void>;
}

interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
}

interface PluginContext {
  editor: EditorInstance;
  logger: Logger;
}
```

### 插件类型

| 类型 | 描述 | 示例 |
|------|------|------|
| **编辑器插件** | 提供基础卡片的编辑组件 | Markdown 编辑器、代码编辑器 |
| **布局插件** | 提供新的布局模式 | 自定义布局 |
| **工具插件** | 提供工具窗口 | 搜索工具、标签管理 |

### 插件生命周期

```
加载插件文件
    ↓
验证插件元数据
    ↓
解析依赖关系
    ↓
调用 activate()
    ↓
插件运行中
    ↓
调用 deactivate()
    ↓
卸载插件
```

### PluginHost 组件

宿主组件用于加载和渲染编辑器插件。

```vue
<template>
  <div class="plugin-host">
    <component
      v-if="pluginComponent"
      :is="pluginComponent"
      :card-id="cardId"
      :base-card-id="baseCardId"
      :data="cardData"
      @update="handleUpdate"
    />
    <DefaultEditor v-else :data="cardData" />
  </div>
</template>
```

---

## 布局系统设计

### 布局类型

#### 无限画布布局 (InfiniteCanvas)

两层界面设计，支持无限扩展。

```
┌─────────────────────────────────────────────────────────────┐
│                    InfiniteCanvas                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Desktop Layer                         │  │
│  │                  (桌面背景层)                           │  │
│  │                                                        │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │              Window Layer                       │   │  │
│  │  │              (窗口层)                            │   │  │
│  │  │                                                 │   │  │
│  │  │   ┌──────┐  ┌──────┐  ┌──────┐               │   │  │
│  │  │   │ 窗口1 │  │ 窗口2 │  │ 窗口3 │               │   │  │
│  │  │   └──────┘  └──────┘  └──────┘               │   │  │
│  │  │                                                 │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Zoom Control                          │   │
│  │                 (缩放控制器)                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**特性**:
- 无限平移（拖拽背景）
- 缩放范围：10% - 500%
- 触摸板和鼠标滚轮支持
- 窗口自由摆放

**核心实现**:

```typescript
// use-canvas.ts
function useCanvas(config) {
  const state = reactive({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
  });
  
  // 坐标转换
  function screenToWorld(screenX, screenY) {
    return {
      x: (screenX - state.offsetX) / state.scale,
      y: (screenY - state.offsetY) / state.scale,
    };
  }
  
  function worldToScreen(worldX, worldY) {
    return {
      x: worldX * state.scale + state.offsetX,
      y: worldY * state.scale + state.offsetY,
    };
  }
  
  // 缩放
  function zoomTo(newScale, centerX, centerY) {
    // 以指定点为中心缩放
  }
  
  // 平移
  function panBy(deltaX, deltaY) {
    state.offsetX += deltaX;
    state.offsetY += deltaY;
  }
  
  return { state, screenToWorld, worldToScreen, zoomTo, panBy };
}
```

#### 工作台布局 (Workbench)

分区窗口组合方式。

```
┌─────────────────────────────────────────────────────────────┐
│                      Workbench                               │
│  ┌──────────┬──────────────────────────┬──────────────┐    │
│  │          │                          │              │    │
│  │   Left   │        Main Area         │    Right     │    │
│  │  Panel   │        (主编辑区)         │    Panel     │    │
│  │ (文件管理)│                          │  (属性面板)   │    │
│  │          │                          │              │    │
│  │          │                          │              │    │
│  │          │                          │              │    │
│  │          │                          │              │    │
│  │          │                          │              │    │
│  └──────────┴──────────────────────────┴──────────────┘    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Bottom Panel                       │   │
│  │                   (历史记录面板)                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**特性**:
- 可调整分区大小
- 面板可折叠
- 专注单卡片编辑

### 布局切换

```typescript
// use-layout-switch.ts
function useLayoutSwitch() {
  const currentLayout = ref<LayoutType>('infinite-canvas');
  
  async function switchLayout(layout: LayoutType) {
    // 1. 保存当前布局状态
    await saveLayoutState(currentLayout.value);
    
    // 2. 切换布局
    currentLayout.value = layout;
    
    // 3. 恢复目标布局状态
    await restoreLayoutState(layout);
    
    // 4. 发送事件
    emit('layout:changed', { layout });
  }
  
  return { currentLayout, switchLayout };
}
```

---

## 通信架构

### 通信流程

```
┌──────────────────────────────────────────────────────────────┐
│                         编辑器                                │
│                            │                                  │
│                    1. 调用 SDK 方法                           │
│                            ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    SDKConnector                          │ │
│  │                                                          │ │
│  │  2. 封装请求消息                                          │ │
│  │     {                                                    │ │
│  │       protocol_version: "1.0.0",                        │ │
│  │       message_id: "uuid",                               │ │
│  │       service: "card.read",                             │ │
│  │       payload: { cardId }                               │ │
│  │     }                                                    │ │
│  │                            ↓                             │ │
│  │  3. 发送到微内核                                          │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                       Chips Core                              │
│                       (薯片微内核)                             │
│                                                               │
│  4. 验证请求                                                   │
│  5. 路由到目标模块                                             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                    Chips Foundation                           │
│                    (公共基础层/插件)                           │
│                                                               │
│  6. 执行操作                                                   │
│  7. 返回结果                                                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                         编辑器                                │
│                                                               │
│  8. 接收响应                                                   │
│     {                                                         │
│       status: "success",                                     │
│       data: { ... },                                         │
│       metadata: { execution_time: 150 }                      │
│     }                                                         │
│                            ↓                                  │
│  9. 更新 Store 状态                                           │
│                            ↓                                  │
│  10. Vue 响应式更新界面                                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 事件通信

```typescript
// 订阅微内核事件
sdk.event.subscribe('card.updated', (event) => {
  // 处理卡片更新事件
  cardStore.updateCard(event.payload.cardId, event.payload.updates);
});

// 发布事件到微内核
sdk.event.publish({
  eventType: 'editor.window.created',
  payload: { windowId, config },
});
```

---

## 性能优化策略

### 1. 视口裁剪

只渲染视口内可见的窗口。

```typescript
function getVisibleWindows(windows, viewport) {
  const buffer = 200; // 缓冲区
  
  return windows.filter(window => {
    return isIntersecting(window.bounds, {
      left: viewport.left - buffer,
      top: viewport.top - buffer,
      right: viewport.right + buffer,
      bottom: viewport.bottom + buffer,
    });
  });
}
```

### 2. LOD (细节层次)

根据缩放级别调整渲染细节。

```typescript
function getLODLevel(scale: number): 'minimal' | 'simple' | 'full' {
  if (scale < 0.3) return 'minimal';  // 只显示标题
  if (scale < 0.7) return 'simple';   // 简化内容
  return 'full';                       // 完整渲染
}
```

### 3. 虚拟滚动

大列表使用虚拟滚动。

```vue
<template>
  <VirtualScroller
    :items="items"
    :item-height="60"
    :visible-count="20"
  >
    <template #item="{ item }">
      <FileItem :file="item" />
    </template>
  </VirtualScroller>
</template>
```

### 4. 防抖和节流

```typescript
// 防抖保存
const debouncedSave = debounce(saveCard, 1000);

// 节流缩放更新
const throttledUpdateScale = throttle(updateScale, 16);
```

### 5. 懒加载

```typescript
// 组件懒加载
const EditPanel = defineAsyncComponent(() => 
  import('./components/EditPanel.vue')
);

// 按需加载插件
async function loadPlugin(pluginId: string) {
  const plugin = await import(`./plugins/${pluginId}`);
  return plugin.default;
}
```

### 6. 缓存策略

```typescript
// 渲染结果缓存
const renderCache = new WeakMap<CardInfo, HTMLElement>();

// 资源缓存
const resourceCache = new LRUCache<string, Resource>({
  max: 100,
  maxAge: 1000 * 60 * 60, // 1 小时
});
```

### 性能指标

| 指标 | 目标 | 描述 |
|------|------|------|
| 首屏渲染 | < 1s | 编辑器首次显示 |
| 窗口创建 | < 100ms | 创建新窗口 |
| 布局切换 | < 300ms | 切换布局模式 |
| 缩放响应 | 60 FPS | 缩放时保持流畅 |
| 内存占用 | < 200MB | 100 个窗口时 |

---

**文档维护者**: Chips 生态核心团队  
**最后更新**: 2026-02-02
