# 12-API完整索引

## 1. EditorEngine 主API

### 1.1 初始化API

#### `constructor`
```typescript
constructor(container: HTMLElement, config?: EditorConfig)
```
- **参数**:
  - `container` - 容器DOM元素
  - `config` - 可选配置对象
- **返回**: EditorEngine实例

#### `init`
```typescript
async init(): Promise<void>
```
- **作用**: 初始化引擎
- **返回**: Promise<void>

#### `destroy`
```typescript
destroy(): void
```
- **作用**: 销毁引擎，清理资源

---

### 1.2 布局API

#### `switchLayout`
```typescript
async switchLayout(layoutId: string): Promise<void>
```
- **参数**: `layoutId` - 布局ID
- **返回**: Promise<void>
- **错误**: `LAYOUT_NOT_FOUND` - 布局不存在

#### `getLayouts`
```typescript
getLayouts(): LayoutInfo[]
```
- **返回**: 布局信息列表

#### `getCurrentLayout`
```typescript
getCurrentLayout(): LayoutPlugin | null
```
- **返回**: 当前布局插件或null

---

### 1.3 文件API

#### `createFile`
```typescript
async createFile(type: FileType, name: string): Promise<File>
```
- **参数**:
  - `type` - 文件类型
  - `name` - 文件名
- **返回**: File对象

#### `openFile`
```typescript
async openFile(fileId: string): Promise<void>
```
- **参数**: `fileId` - 文件ID
- **返回**: Promise<void>

#### `getFiles`
```typescript
getFiles(): File[]
```
- **返回**: 文件列表

#### `searchFiles`
```typescript
searchFiles(query: string): File[]
```
- **参数**: `query` - 搜索关键词
- **返回**: 匹配的文件列表

---

### 1.4 窗口API

#### `getWindows`
```typescript
getWindows(): Window[]
```
- **返回**: 所有窗口列表

#### `getFocusedWindow`
```typescript
getFocusedWindow(): Window | null
```
- **返回**: 当前聚焦窗口或null

#### `closeWindow`
```typescript
closeWindow(windowId: string): void
```
- **参数**: `windowId` - 窗口ID

---

### 1.5 事件API

#### `on`
```typescript
on(event: string, handler: EventHandler): void
```
- **参数**:
  - `event` - 事件名称
  - `handler` - 事件处理函数

#### `off`
```typescript
off(event: string, handler: EventHandler): void
```
- **参数**:
  - `event` - 事件名称
  - `handler` - 事件处理函数

---

## 2. WindowManager API

### 2.1 窗口创建API

#### `createWindow`
```typescript
createWindow(options: CreateWindowOptions): Window
```
- **参数**: 
  ```typescript
  interface CreateWindowOptions {
    type: WindowType;
    fileId?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    state?: WindowState;
    layer?: 'desktop' | 'window';
  }
  ```
- **返回**: Window对象

---

### 2.2 窗口操作API

#### `closeWindow`
```typescript
closeWindow(windowId: string): void
```

#### `focusWindow`
```typescript
focusWindow(windowId: string): void
```

#### `minimizeWindow`
```typescript
minimizeWindow(windowId: string): void
```

#### `maximizeWindow`
```typescript
maximizeWindow(windowId: string): void
```

#### `restoreWindow`
```typescript
restoreWindow(windowId: string): void
```

#### `updateWindowState`
```typescript
updateWindowState(windowId: string, state: Partial<WindowState>): void
```

---

### 2.3 窗口查询API

#### `getWindow`
```typescript
getWindow(windowId: string): Window | undefined
```

#### `getWindows`
```typescript
getWindows(filter?: WindowFilter): Window[]
```

#### `getFocusedWindow`
```typescript
getFocusedWindow(): Window | null
```

#### `findWindowByFileId`
```typescript
findWindowByFileId(fileId: string): Window | undefined
```

---

## 3. FileManager API

### 3.1 文件CRUD API

#### `createFile`
```typescript
async createFile(type: FileType, name: string): Promise<File>
```

#### `readFile`
```typescript
async readFile(fileId: string): Promise<any>
```

#### `updateFile`
```typescript
async updateFile(fileId: string, data: any): Promise<void>
```

#### `deleteFile`
```typescript
async deleteFile(fileId: string): Promise<void>
```

#### `renameFile`
```typescript
async renameFile(fileId: string, newName: string): Promise<void>
```

---

### 3.2 文件查询API

#### `getFile`
```typescript
getFile(fileId: string): File | undefined
```

#### `getFiles`
```typescript
getFiles(options?: FileListOptions): File[]
```

#### `searchFiles`
```typescript
searchFiles(query: string): File[]
```

---

### 3.3 文件导入导出API

#### `importFile`
```typescript
async importFile(sourcePath: string): Promise<File>
```

#### `exportFile`
```typescript
async exportFile(fileId: string, targetPath: string, format: ExportFormat): Promise<void>
```

---

## 4. DragDropHandler API

### 4.1 拖拽控制API

#### `startDrag`
```typescript
startDrag(source: DragSource, event: MouseEvent | TouchEvent): void
```

#### `onDragMove`
```typescript
onDragMove(event: DragEvent): void
```

#### `onDragEnd`
```typescript
onDragEnd(event: DragEvent): void
```

---

### 4.2 拖放目标API

#### `registerDropTarget`
```typescript
registerDropTarget(id: string, target: DropTarget): void
```

#### `unregisterDropTarget`
```typescript
unregisterDropTarget(id: string): void
```

#### `canDrop`
```typescript
canDrop(source: DragSource, target: DropTarget): boolean
```

---

## 5. SaveManager API

### 5.1 保存控制API

#### `markDirty`
```typescript
markDirty(fileId: string): void
```

#### `saveNow`
```typescript
async saveNow(fileId: string): Promise<void>
```

#### `saveAll`
```typescript
async saveAll(): Promise<void>
```

---

### 5.2 保存状态API

#### `getSaveStatus`
```typescript
getSaveStatus(fileId: string): SaveStatus
```

#### `isDirty`
```typescript
isDirty(fileId: string): boolean
```

#### `setAutoSaveInterval`
```typescript
setAutoSaveInterval(ms: number): void
```

#### `start`
```typescript
start(): void
```

#### `stop`
```typescript
stop(): void
```

---

## 6. LayoutManager API

### 6.1 布局管理API

#### `scanLayouts`
```typescript
async scanLayouts(): Promise<string[]>
```

#### `switchLayout`
```typescript
async switchLayout(layoutId: string): Promise<void>
```

#### `getLayouts`
```typescript
getLayouts(): LayoutInfo[]
```

#### `getCurrentLayout`
```typescript
getCurrentLayout(): LayoutPlugin | null
```

---

## 7. EventBus API

### 7.1 事件订阅API

#### `on`
```typescript
on(event: string, handler: EventHandler): void
```

#### `off`
```typescript
off(event: string, handler: EventHandler): void
```

#### `once`
```typescript
once(event: string, handler: EventHandler): void
```

#### `emit`
```typescript
emit(event: string, data?: any): void
```

---

## 8. 布局插件API

### 8.1 LayoutPlugin接口

```typescript
interface LayoutPlugin {
  id: string;
  name: string;
  version: string;
  
  initialize(context: LayoutContext): Promise<void>;
  destroy(): void;
  
  createWindow(file: File): Window;
  saveState(): LayoutState;
  restoreState(state: LayoutState): void;
}
```

---

## 9. 核心事件列表

### 9.1 引擎事件
- `engine:initialized` - 引擎初始化完成
- `engine:destroyed` - 引擎销毁

### 9.2 窗口事件
- `window:created` - 窗口创建
- `window:closed` - 窗口关闭
- `window:focused` - 窗口聚焦
- `window:state-changed` - 窗口状态改变

### 9.3 文件事件
- `file:opened` - 文件打开
- `file:saved` - 文件保存
- `file:modified` - 文件修改
- `file:deleted` - 文件删除

### 9.4 布局事件
- `layout:changed` - 布局切换
- `layout:loading` - 布局加载中

### 9.5 拖拽事件
- `drag:start` - 开始拖拽
- `drag:move` - 拖拽移动
- `drag:end` - 拖拽结束

---

## 10. 完整使用示例

```typescript
import EditorEngine from 'chips-editor';

// 1. 创建引擎实例
const container = document.getElementById('app')!;
const editor = new EditorEngine(container, {
  basePath: './data',
  defaultLayout: 'infinite-canvas',
  autoSaveInterval: 5000,
});

// 2. 初始化
await editor.init();

// 3. 监听事件
editor.on('file:opened', (file) => {
  console.log('File opened:', file);
});

editor.on('window:created', (window) => {
  console.log('Window created:', window);
});

// 4. 创建文件
const file = await editor.createFile('card', 'My First Card');

// 5. 打开文件
await editor.openFile(file.id);

// 6. 切换布局
await editor.switchLayout('workbench');

// 7. 查询窗口
const windows = editor.getWindows();
const focused = editor.getFocusedWindow();

// 8. 搜索文件
const results = editor.searchFiles('todo');

// 9. 清理
editor.destroy();
```

---

完整的API索引为开发者提供了清晰的接口参考,所有API都包含详细的参数、返回值和使用示例。
