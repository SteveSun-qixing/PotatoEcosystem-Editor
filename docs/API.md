# Chips Editor API 文档

**版本**: 1.0.0  
**更新日期**: 2026-02-02

---

## 目录

- [编辑器 API](#编辑器-api)
- [窗口管理 API](#窗口管理-api)
- [命令管理 API](#命令管理-api)
- [事件系统 API](#事件系统-api)
- [拖放管理 API](#拖放管理-api)
- [状态管理 API](#状态管理-api)

---

## 编辑器 API

### createEditor

创建编辑器实例的工厂函数。

```typescript
function createEditor(config?: Partial<EditorConfig>): ChipsEditor;
```

#### 参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `config.sdk` | `ChipsSDK` | `undefined` | SDK 实例（可选） |
| `config.layout` | `LayoutType` | `'infinite-canvas'` | 默认布局类型 |
| `config.debug` | `boolean` | `false` | 是否启用调试模式 |
| `config.autoSaveInterval` | `number` | `30000` | 自动保存间隔（毫秒） |
| `config.locale` | `string` | `'zh-CN'` | 语言设置 |

#### 示例

```typescript
import { createEditor } from '@chips/editor';

const editor = createEditor({
  layout: 'infinite-canvas',
  debug: true,
  autoSaveInterval: 60000,
});
```

---

### ChipsEditor 类

编辑器主类，整合所有模块功能。

#### 生命周期方法

##### initialize()

初始化编辑器，连接 SDK，加载配置。

```typescript
async initialize(): Promise<void>
```

**注意**: 在使用编辑器其他功能前必须先调用此方法。

```typescript
await editor.initialize();
```

##### destroy()

销毁编辑器，释放资源。

```typescript
destroy(): void
```

```typescript
editor.destroy();
```

---

#### 卡片操作方法

##### createCard(options)

创建新卡片。

```typescript
async createCard(options: CreateCardOptions): Promise<MockCard>
```

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `options.name` | `string` | 是 | 卡片名称 |
| `options.type` | `string` | 否 | 卡片类型 |
| `options.tags` | `Array<string \| string[]>` | 否 | 标签 |
| `options.description` | `string` | 否 | 描述 |
| `options.theme` | `string` | 否 | 主题 |

```typescript
const card = await editor.createCard({
  name: '我的笔记',
  type: 'note',
  tags: ['工作', '重要'],
});
```

##### openCard(pathOrId, options?)

打开卡片。

```typescript
async openCard(pathOrId: string, options?: OpenCardOptions): Promise<MockCard>
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `pathOrId` | `string` | - | 卡片路径或 ID |
| `options.activate` | `boolean` | `true` | 是否立即激活 |
| `options.newWindow` | `boolean` | `false` | 是否在新窗口打开 |
| `options.position` | `{ x: number; y: number }` | - | 窗口位置 |

```typescript
const card = await editor.openCard('/path/to/card.chip', {
  activate: true,
  position: { x: 100, y: 100 },
});
```

##### saveCard(cardId, options?)

保存卡片。

```typescript
async saveCard(cardId: string, options?: SaveCardOptions): Promise<void>
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `cardId` | `string` | - | 卡片 ID |
| `options.path` | `string` | - | 保存路径（可选） |
| `options.force` | `boolean` | `false` | 是否强制保存 |

```typescript
await editor.saveCard('card-123');
```

##### closeCard(cardId, force?)

关闭卡片。

```typescript
closeCard(cardId: string, force?: boolean): boolean
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `cardId` | `string` | - | 卡片 ID |
| `force` | `boolean` | `false` | 是否强制关闭 |

```typescript
const closed = editor.closeCard('card-123');
if (!closed) {
  // 卡片有未保存的更改
}
```

##### deleteCard(cardId)

删除卡片。

```typescript
async deleteCard(cardId: string): Promise<void>
```

```typescript
await editor.deleteCard('card-123');
```

##### saveAllCards()

保存所有修改过的卡片。

```typescript
async saveAllCards(): Promise<void>
```

```typescript
await editor.saveAllCards();
```

---

#### 布局操作方法

##### setLayout(layout)

切换布局。

```typescript
setLayout(layout: LayoutType): void
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `layout` | `'infinite-canvas' \| 'workbench'` | 布局类型 |

```typescript
editor.setLayout('workbench');
```

##### getLayout()

获取当前布局。

```typescript
getLayout(): LayoutType
```

```typescript
const currentLayout = editor.getLayout();
```

---

#### 窗口操作方法

##### createWindow(config)

创建窗口。

```typescript
createWindow(config: WindowConfig): void
```

##### closeWindow(windowId)

关闭窗口。

```typescript
closeWindow(windowId: string): void
```

##### focusWindow(windowId)

聚焦窗口。

```typescript
focusWindow(windowId: string): void
```

---

#### 状态属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `state` | `EditorState` | 编辑器状态（idle/initializing/ready/error/destroyed） |
| `isReady` | `boolean` | 是否就绪 |
| `isConnected` | `boolean` | SDK 是否已连接 |
| `hasUnsavedChanges` | `boolean` | 是否有未保存的更改 |
| `sdk` | `MockSDKInstance` | SDK 实例 |
| `configuration` | `EditorConfig` | 编辑器配置（只读） |
| `stores` | `object` | Pinia stores 访问器 |

---

## 窗口管理 API

### useWindowManager

获取窗口管理器实例。

```typescript
function useWindowManager(): WindowManager
```

```typescript
import { useWindowManager } from '@chips/editor';

const windowManager = useWindowManager();
```

---

### WindowManager 类

#### 创建窗口

##### createCardWindow(cardId, options?)

创建卡片窗口。

```typescript
createCardWindow(
  cardId: string,
  options?: Partial<Omit<CardWindowConfig, 'id' | 'type' | 'cardId'>>
): string
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `cardId` | `string` | 卡片 ID |
| `options.title` | `string` | 窗口标题 |
| `options.position` | `WindowPosition` | 窗口位置 |
| `options.size` | `WindowSize` | 窗口大小 |

```typescript
const windowId = windowManager.createCardWindow('card-123', {
  title: '我的卡片',
  position: { x: 100, y: 100 },
  size: { width: 400, height: 600 },
});
```

##### createToolWindow(component, options?)

创建工具窗口。

```typescript
createToolWindow(
  component: string,
  options?: Partial<Omit<ToolWindowConfig, 'id' | 'type' | 'component'>>
): string
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `component` | `string` | 工具组件名称 |
| `options.title` | `string` | 窗口标题 |
| `options.icon` | `string` | 窗口图标 |
| `options.dockable` | `boolean` | 是否可停靠 |

```typescript
const windowId = windowManager.createToolWindow('FileManager', {
  title: '文件管理器',
  icon: '📁',
});
```

---

#### 窗口操作

##### closeWindow(windowId)

关闭窗口。

```typescript
closeWindow(windowId: string): void
```

##### focusWindow(windowId)

聚焦窗口。

```typescript
focusWindow(windowId: string): void
```

##### blurWindow()

取消当前窗口焦点。

```typescript
blurWindow(): void
```

##### moveWindow(windowId, position)

移动窗口。

```typescript
moveWindow(windowId: string, position: WindowPosition): void
```

```typescript
windowManager.moveWindow('window-1', { x: 200, y: 150 });
```

##### resizeWindow(windowId, size)

调整窗口大小。

```typescript
resizeWindow(windowId: string, size: WindowSize): void
```

```typescript
windowManager.resizeWindow('window-1', { width: 500, height: 700 });
```

##### minimizeWindow(windowId)

最小化窗口。

```typescript
minimizeWindow(windowId: string): void
```

##### restoreWindow(windowId)

恢复窗口。

```typescript
restoreWindow(windowId: string): void
```

##### toggleCollapse(windowId)

切换窗口折叠状态。

```typescript
toggleCollapse(windowId: string): void
```

---

#### 查询方法

##### getWindow(windowId)

获取窗口配置。

```typescript
getWindow(windowId: string): WindowConfig | undefined
```

##### getAllWindows()

获取所有窗口。

```typescript
getAllWindows(): WindowConfig[]
```

##### getCardWindows()

获取所有卡片窗口。

```typescript
getCardWindows(): CardWindowConfig[]
```

##### getToolWindows()

获取所有工具窗口。

```typescript
getToolWindows(): ToolWindowConfig[]
```

##### getFocusedWindow()

获取焦点窗口。

```typescript
getFocusedWindow(): WindowConfig | null
```

##### hasWindow(windowId)

检查窗口是否存在。

```typescript
hasWindow(windowId: string): boolean
```

##### findWindowByCardId(cardId)

根据卡片 ID 查找窗口。

```typescript
findWindowByCardId(cardId: string): CardWindowConfig | undefined
```

##### findWindowsByComponent(component)

根据组件名称查找工具窗口。

```typescript
findWindowsByComponent(component: string): ToolWindowConfig[]
```

---

#### 布局方法

##### tileWindows(options?)

平铺所有窗口。

```typescript
tileWindows(options?: {
  windowWidth?: number;
  windowHeight?: number;
  gap?: number;
  startX?: number;
  startY?: number;
}): void
```

```typescript
windowManager.tileWindows({
  windowWidth: 400,
  windowHeight: 300,
  gap: 20,
});
```

##### cascadeWindows(options?)

层叠所有窗口。

```typescript
cascadeWindows(options?: {
  startX?: number;
  startY?: number;
  offsetX?: number;
  offsetY?: number;
}): void
```

```typescript
windowManager.cascadeWindows({
  startX: 50,
  startY: 50,
  offsetX: 30,
  offsetY: 30,
});
```

##### closeAllWindows()

关闭所有窗口。

```typescript
closeAllWindows(): void
```

##### minimizeAllWindows()

最小化所有窗口。

```typescript
minimizeAllWindows(): void
```

##### restoreAllWindows()

恢复所有窗口。

```typescript
restoreAllWindows(): void
```

---

## 命令管理 API

### useCommandManager

获取命令管理器实例。

```typescript
function useCommandManager(config?: Partial<CommandManagerConfig>): CommandManager
```

```typescript
import { useCommandManager } from '@chips/editor';

const commandManager = useCommandManager({
  maxHistory: 100,
  debug: true,
});
```

---

### CommandManager 类

#### 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `maxHistory` | `number` | `100` | 最大历史记录数量 |
| `mergeWindow` | `number` | `500` | 合并命令的时间窗口（毫秒） |
| `debug` | `boolean` | `false` | 是否启用调试日志 |

---

#### 命令执行

##### execute(command)

执行命令。

```typescript
async execute(command: Command): Promise<void>
```

```typescript
import { AddBaseCardCommand } from '@chips/editor';

const command = new AddBaseCardCommand(cardId, 'MarkdownCard', {});
await commandManager.execute(command);
```

##### undo()

撤销上一个命令。

```typescript
async undo(): Promise<boolean>
```

```typescript
const success = await commandManager.undo();
```

##### redo()

重做上一个撤销的命令。

```typescript
async redo(): Promise<boolean>
```

```typescript
const success = await commandManager.redo();
```

---

#### 状态查询

##### canUndo()

是否可以撤销。

```typescript
canUndo(): boolean
```

##### canRedo()

是否可以重做。

```typescript
canRedo(): boolean
```

##### undoStackSize

撤销栈大小。

```typescript
get undoStackSize(): number
```

##### redoStackSize

重做栈大小。

```typescript
get redoStackSize(): number
```

##### executing

是否正在执行命令。

```typescript
get executing(): boolean
```

---

#### 历史记录

##### getHistory(limit?)

获取历史记录列表。

```typescript
getHistory(limit?: number): CommandHistory[]
```

```typescript
const history = commandManager.getHistory(10);
// 返回最近 10 条历史记录
```

##### getRedoHistory()

获取可重做的历史记录。

```typescript
getRedoHistory(): CommandHistory[]
```

##### goToHistory(historyId)

跳转到特定历史记录。

```typescript
async goToHistory(historyId: string): Promise<boolean>
```

```typescript
await commandManager.goToHistory('cmd-abc123');
```

##### clear()

清空历史记录。

```typescript
clear(): void
```

---

#### 事件订阅

##### on(event, callback)

订阅事件。

```typescript
on<K extends keyof CommandManagerEvents>(
  event: K,
  callback: CommandManagerEventCallback<K>
): void
```

| 事件 | 数据 |
|------|------|
| `command:executed` | `{ command, history }` |
| `command:undone` | `{ command, history }` |
| `command:redone` | `{ command, history }` |
| `history:cleared` | `{}` |
| `state:changed` | `{ canUndo, canRedo }` |

```typescript
commandManager.on('state:changed', ({ canUndo, canRedo }) => {
  console.log('撤销可用:', canUndo);
  console.log('重做可用:', canRedo);
});
```

##### off(event, callback)

取消订阅。

```typescript
off<K extends keyof CommandManagerEvents>(
  event: K,
  callback: CommandManagerEventCallback<K>
): void
```

---

### Command 接口

实现自定义命令需要实现此接口。

```typescript
interface Command {
  /** 执行命令 */
  execute(): Promise<void>;
  
  /** 撤销命令 */
  undo(): Promise<void>;
  
  /** 重做命令 */
  redo(): Promise<void>;
  
  /** 命令描述（用于历史记录显示） */
  description: string;
  
  /** 是否可以与前一个命令合并（可选） */
  canMergeWith?(other: Command): boolean;
  
  /** 与另一个命令合并（可选） */
  mergeWith?(other: Command): void;
}
```

#### 示例：自定义命令

```typescript
class MoveWindowCommand implements Command {
  private windowId: string;
  private oldPosition: WindowPosition;
  private newPosition: WindowPosition;

  constructor(
    windowId: string,
    oldPosition: WindowPosition,
    newPosition: WindowPosition
  ) {
    this.windowId = windowId;
    this.oldPosition = oldPosition;
    this.newPosition = newPosition;
  }

  get description(): string {
    return 'command.move_window';
  }

  async execute(): Promise<void> {
    const manager = useWindowManager();
    manager.moveWindow(this.windowId, this.newPosition);
  }

  async undo(): Promise<void> {
    const manager = useWindowManager();
    manager.moveWindow(this.windowId, this.oldPosition);
  }

  async redo(): Promise<void> {
    await this.execute();
  }

  canMergeWith(other: Command): boolean {
    return other instanceof MoveWindowCommand && 
           other.windowId === this.windowId;
  }

  mergeWith(other: Command): void {
    if (other instanceof MoveWindowCommand) {
      this.newPosition = other.newPosition;
    }
  }
}
```

---

## 事件系统 API

### createEventEmitter

创建事件发射器实例。

```typescript
function createEventEmitter(): EventEmitter
```

---

### EventEmitter 类

#### 订阅事件

##### on(eventType, handler)

订阅事件。

```typescript
on<T = unknown>(eventType: string, handler: (data: T) => void): string
```

**返回值**: 订阅 ID，可用于取消订阅。

```typescript
const id = emitter.on('card:saved', (data) => {
  console.log('卡片已保存:', data.cardId);
});
```

##### once(eventType, handler)

一次性订阅事件。

```typescript
once<T = unknown>(eventType: string, handler: (data: T) => void): string
```

```typescript
emitter.once('editor:ready', () => {
  console.log('编辑器已就绪');
});
```

---

#### 取消订阅

##### off(eventType, handlerOrId?)

取消订阅。

```typescript
off(eventType: string, handlerOrId?: EventHandler | string): void
```

| 调用方式 | 描述 |
|----------|------|
| `off('event')` | 移除该事件类型的所有订阅 |
| `off('event', id)` | 通过 ID 移除特定订阅 |
| `off('event', handler)` | 通过处理器移除订阅 |

```typescript
// 通过 ID 取消
emitter.off('card:saved', subscriptionId);

// 通过处理器取消
emitter.off('card:saved', myHandler);

// 移除所有订阅
emitter.off('card:saved');
```

---

#### 发布事件

##### emit(eventType, data)

发布事件。

```typescript
emit<T = unknown>(eventType: string, data: T): void
```

```typescript
emitter.emit('card:created', { cardId: 'new-card-123' });
```

---

#### 等待事件

##### waitFor(eventType, timeout?)

等待事件发生。

```typescript
waitFor<T = unknown>(eventType: string, timeout?: number): Promise<T>
```

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `eventType` | `string` | - | 事件类型 |
| `timeout` | `number` | `30000` | 超时时间（毫秒） |

```typescript
try {
  const data = await emitter.waitFor<{ cardId: string }>('card:saved', 5000);
  console.log('卡片已保存:', data.cardId);
} catch (error) {
  console.error('等待超时');
}
```

---

#### 工具方法

##### hasListeners(eventType)

检查是否有订阅者。

```typescript
hasListeners(eventType: string): boolean
```

##### listenerCount(eventType)

获取订阅者数量。

```typescript
listenerCount(eventType: string): number
```

##### eventNames()

获取所有事件类型。

```typescript
eventNames(): string[]
```

##### clear()

清除所有订阅。

```typescript
clear(): void
```

##### removeAllListeners(eventType?)

移除监听器。

```typescript
removeAllListeners(eventType?: string): void
```

---

### 编辑器内置事件

| 事件类型 | 数据 | 描述 |
|----------|------|------|
| `editor:ready` | `{}` | 编辑器就绪 |
| `editor:destroyed` | `{}` | 编辑器销毁 |
| `editor:error` | `{ error }` | 编辑器错误 |
| `card:created` | `{ cardId }` | 卡片创建 |
| `card:opened` | `{ cardId }` | 卡片打开 |
| `card:saved` | `{ cardId }` | 卡片保存 |
| `card:closed` | `{ cardId }` | 卡片关闭 |
| `card:deleted` | `{ cardId }` | 卡片删除 |
| `card:closeRequested` | `{ cardId, hasUnsavedChanges }` | 请求关闭卡片 |
| `layout:changed` | `{ layout }` | 布局切换 |
| `window:created` | `{ windowId, config }` | 窗口创建 |
| `window:closed` | `{ windowId }` | 窗口关闭 |
| `window:focused` | `{ windowId }` | 窗口聚焦 |
| `connector:connected` | `{}` | SDK 连接成功 |
| `connector:disconnected` | `{}` | SDK 断开连接 |
| `connector:error` | `{ error }` | SDK 连接错误 |

---

## 拖放管理 API

### useDragDropManager

获取拖放管理器实例。

```typescript
function useDragDropManager(): DragDropManager
```

---

### DragDropManager 类

#### 注册拖放源

##### registerSource(id, config)

注册拖放源。

```typescript
registerSource(id: string, config: DragSourceConfig): void
```

```typescript
dragDropManager.registerSource('card-library', {
  type: 'card-library',
  data: { cardType: 'MarkdownCard' },
  allowedTargets: ['canvas', 'card'],
  effect: 'copy',
});
```

##### unregisterSource(id)

注销拖放源。

```typescript
unregisterSource(id: string): void
```

---

#### 注册拖放目标

##### registerTarget(id, config)

注册拖放目标。

```typescript
registerTarget(id: string, config: DropTargetConfig): void
```

```typescript
dragDropManager.registerTarget('main-canvas', {
  type: 'canvas',
  id: 'main-canvas',
  acceptedSources: ['card-library', 'file', 'base-card'],
  onDrop: async (source, position) => {
    console.log('放置在位置:', position);
  },
});
```

##### unregisterTarget(id)

注销拖放目标。

```typescript
unregisterTarget(id: string): void
```

---

#### 拖放操作

##### startDrag(config)

开始拖放。

```typescript
startDrag(config: DragSourceConfig): DragSource
```

```typescript
const source = dragDropManager.startDrag({
  type: 'base-card',
  data: { cardId: 'card-1', baseCardId: 'base-1' },
});
```

##### updatePosition(position)

更新拖放位置。

```typescript
updatePosition(position: Position): void
```

##### setHoverTarget(targetId, rect?)

设置悬停目标。

```typescript
setHoverTarget(targetId: string | null, rect?: DOMRect): void
```

##### setInsertPosition(insertPosition)

设置插入位置。

```typescript
setInsertPosition(insertPosition: InsertPosition | null): void
```

##### drop()

执行放置。

```typescript
async drop(): Promise<boolean>
```

##### endDrag(success?)

结束拖放。

```typescript
endDrag(success?: boolean): void
```

##### cancelDrag()

取消拖放。

```typescript
cancelDrag(): void
```

---

#### 辅助方法

##### checkCanDrop(source, target)

检查是否可以放置。

```typescript
checkCanDrop(source: DragSource, target: DropTarget): boolean
```

##### calculateInsertIndex(items, position, direction?)

计算插入索引。

```typescript
calculateInsertIndex(
  items: Array<{ rect: DOMRect; id: string }>,
  position: Position,
  direction?: 'horizontal' | 'vertical'
): number
```

##### isPointInRect(position, rect)

检测点是否在矩形内。

```typescript
isPointInRect(position: Position, rect: DOMRect): boolean
```

##### findTargetAtPoint(position, targetRects)

查找包含点的目标。

```typescript
findTargetAtPoint(
  position: Position,
  targetRects: Map<string, DOMRect>
): string | null
```

---

### 拖放 Composables

#### useFileDrop

处理从操作系统拖入文件。

```typescript
function useFileDrop(): UseFileDropReturn
```

```vue
<template>
  <div
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div v-if="isFileDragOver">释放以导入文件</div>
  </div>
</template>

<script setup>
import { useFileDrop } from '@chips/editor';

const {
  isFileDragOver,
  draggedFiles,
  handleDragEnter,
  handleDragOver,
  handleDragLeave,
  handleDrop,
} = useFileDrop();
</script>
```

#### useCardSort

处理卡片排序拖放。

```typescript
function useCardSort(): UseCardSortReturn
```

```typescript
const {
  isSorting,
  draggedCard,
  insertIndex,
  startSort,
  updateInsertIndex,
  endSort,
  cancelSort,
} = useCardSort();

// 开始排序
startSort({
  cardId: 'card-1',
  baseCardId: 'base-1',
  baseCardType: 'text',
  originalIndex: 0,
});

// 更新位置
updateInsertIndex(2);

// 结束排序
const result = endSort();
if (result) {
  reorderCards(result.from, result.to);
}
```

#### useCardNest

处理卡片嵌套拖放。

```typescript
function useCardNest(): UseCardNestReturn
```

```typescript
const {
  isNesting,
  draggedCard,
  targetCardId,
  canNest,
  startNest,
  setTarget,
  endNest,
  cancelNest,
} = useCardNest();

// 开始嵌套
startNest({ cardId: 'card-1', cardName: '笔记卡片' });

// 设置目标
setTarget('card-2', true);

// 结束嵌套
const result = endNest();
if (result) {
  nestCard(result.sourceId, result.targetId);
}
```

---

## 状态管理 API

### useEditorStore

编辑器状态 Store。

```typescript
const editorStore = useEditorStore();
```

#### 状态

| 状态 | 类型 | 描述 |
|------|------|------|
| `state` | `EditorState` | 编辑器状态 |
| `isConnected` | `boolean` | SDK 连接状态 |
| `currentLayout` | `LayoutType` | 当前布局 |
| `hasUnsavedChanges` | `boolean` | 是否有未保存的更改 |
| `error` | `Error \| null` | 错误信息 |
| `config` | `EditorConfig` | 编辑器配置 |

#### 方法

| 方法 | 描述 |
|------|------|
| `initialize(config)` | 初始化编辑器 |
| `setConnected(connected)` | 设置连接状态 |
| `setLayout(layout)` | 设置布局 |
| `setState(state)` | 设置状态 |
| `setError(error)` | 设置错误 |
| `markUnsaved()` | 标记有未保存更改 |
| `markSaved()` | 标记已保存 |
| `reset()` | 重置状态 |

---

### useCardStore

卡片状态 Store。

```typescript
const cardStore = useCardStore();
```

#### 状态

| 状态 | 类型 | 描述 |
|------|------|------|
| `openCards` | `Map<string, CardInfo>` | 打开的卡片 |
| `activeCardId` | `string \| null` | 活动卡片 ID |
| `loadingCards` | `Set<string>` | 加载中的卡片 |

#### Getters

| Getter | 类型 | 描述 |
|--------|------|------|
| `cardList` | `CardInfo[]` | 卡片列表 |
| `activeCard` | `CardInfo \| null` | 活动卡片 |
| `hasModifiedCards` | `boolean` | 是否有修改的卡片 |
| `modifiedCards` | `CardInfo[]` | 修改过的卡片列表 |

#### 方法

| 方法 | 描述 |
|------|------|
| `addCard(card, filePath?)` | 添加卡片 |
| `removeCard(cardId)` | 移除卡片 |
| `setActiveCard(cardId)` | 设置活动卡片 |
| `getCard(cardId)` | 获取卡片信息 |
| `isCardOpen(cardId)` | 检查卡片是否打开 |
| `markCardModified(cardId)` | 标记卡片已修改 |
| `markCardSaved(cardId)` | 标记卡片已保存 |
| `updateFilePath(cardId, path)` | 更新文件路径 |
| `setCardLoading(cardId, loading)` | 设置加载状态 |
| `clearAll()` | 清空所有卡片 |

---

### useUIStore

UI 状态 Store。

```typescript
const uiStore = useUIStore();
```

#### 状态

| 状态 | 类型 | 描述 |
|------|------|------|
| `windows` | `Map<string, WindowConfig>` | 窗口映射 |
| `focusedWindowId` | `string \| null` | 焦点窗口 ID |
| `nextZIndex` | `number` | 下一个 z-index |
| `minimizedTools` | `Set<string>` | 最小化的工具窗口 |
| `sidebarCollapsed` | `boolean` | 侧边栏是否折叠 |

#### Getters

| Getter | 类型 | 描述 |
|--------|------|------|
| `windowList` | `WindowConfig[]` | 窗口列表 |
| `cardWindows` | `CardWindowConfig[]` | 卡片窗口列表 |
| `toolWindows` | `ToolWindowConfig[]` | 工具窗口列表 |
| `focusedWindow` | `WindowConfig \| null` | 焦点窗口 |

#### 方法

| 方法 | 描述 |
|------|------|
| `addWindow(config)` | 添加窗口 |
| `removeWindow(windowId)` | 移除窗口 |
| `focusWindow(windowId)` | 聚焦窗口 |
| `blurWindow()` | 取消焦点 |
| `moveWindow(windowId, x, y)` | 移动窗口 |
| `resizeWindow(windowId, width, height)` | 调整窗口大小 |
| `updateWindow(windowId, updates)` | 更新窗口 |
| `setWindowState(windowId, state)` | 设置窗口状态 |
| `minimizeTool(windowId)` | 最小化工具窗口 |
| `restoreTool(windowId)` | 恢复工具窗口 |
| `toggleSidebar()` | 切换侧边栏 |
| `clearWindows()` | 清空所有窗口 |

---

## 类型定义

### EditorConfig

```typescript
interface EditorConfig {
  sdk?: ChipsSDK;
  layout?: LayoutType;
  debug?: boolean;
  autoSaveInterval?: number;
  locale?: string;
}
```

### LayoutType

```typescript
type LayoutType = 'infinite-canvas' | 'workbench';
```

### EditorState

```typescript
type EditorState = 'idle' | 'initializing' | 'ready' | 'error' | 'destroyed';
```

### WindowConfig

```typescript
interface WindowConfig {
  id: string;
  type: 'card' | 'tool' | 'modal';
  title: string;
  position: WindowPosition;
  size: WindowSize;
  state: WindowState;
  zIndex: number;
  resizable?: boolean;
  draggable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
}
```

### WindowPosition

```typescript
interface WindowPosition {
  x: number;
  y: number;
}
```

### WindowSize

```typescript
interface WindowSize {
  width: number;
  height: number;
}
```

### WindowState

```typescript
type WindowState = 'normal' | 'minimized' | 'collapsed';
```

### DragSourceType

```typescript
type DragSourceType =
  | 'file'           // 从操作系统拖入的文件
  | 'card-library'   // 从卡箱库拖出的卡片类型
  | 'layout-library' // 从卡箱库拖出的布局类型
  | 'base-card'      // 从卡片内拖动基础卡片
  | 'card';          // 拖动整个卡片
```

### DropTargetType

```typescript
type DropTargetType =
  | 'canvas'     // 画布空白区域
  | 'card'       // 卡片（用于嵌套）
  | 'card-slot'  // 卡片内的插槽位置
  | 'trash';     // 垃圾桶（删除）
```

---

**文档维护者**: Chips 生态核心团队  
**最后更新**: 2026-02-02
