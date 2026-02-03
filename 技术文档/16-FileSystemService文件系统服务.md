# 卡片编辑引擎 - FileSystemService 文件系统服务

**版本**: 1.0.0  
**更新时间**: 2026-02-03  
**状态**: 正式版

---

## 1. 模块定位与职责

### 1.1 设计定位

FileSystemService 是编辑引擎的文件系统抽象层，位于核心服务层与底层文件 I/O 之间。它的核心使命是屏蔽不同运行环境（Electron 桌面端、Web 浏览器端）之间的文件系统差异，为上层模块提供统一、一致的文件操作接口。

在 Chips 编辑器的分层架构中，FileSystemService 承担着"桥梁"角色。上层的 WorkspaceService 和 CardService 无需关心底层是通过 Node.js 的 fs 模块直接操作文件系统，还是通过 IndexedDB 在浏览器中模拟文件存储——这些实现细节完全由 FileSystemService 内部处理。

### 1.2 核心职责

FileSystemService 的职责边界清晰明确，主要包含以下几个维度：

**文件读写抽象**。提供统一的文件创建、读取、更新、删除（CRUD）接口。无论底层使用何种存储机制，上层调用方式保持一致。读取操作支持全量读取和分片读取，写入操作支持覆盖写入和追加写入。

**工作区目录管理**。维护编辑器的标准工作区目录结构（默认为 `~/.chips-editor/workspace/`）。负责工作区的初始化、目录树的遍历、文件索引的维护。确保工作区目录结构的完整性和一致性。

**卡片文件夹操作**。针对 `.card` 文件夹（卡片的物理存储形式）提供专门的操作方法。包括卡片文件夹的创建（含必要的元文件初始化）、内容读取、结构更新、安全删除。

**文件变更监听**。建立文件系统变更的监听机制，当外部程序修改了工作区内的文件时，能够及时感知并通知上层模块。这对于实现多窗口同步、外部编辑检测等功能至关重要。

---

## 2. 接口设计

### 2.1 核心类型定义

FileSystemService 依赖一套完整的类型系统来描述文件系统中的各种实体和操作。

```typescript
/**
 * 文件类型枚举
 * 用于区分工作区中不同类型的文件实体
 */
export type FileType = 'card' | 'box' | 'folder' | 'unknown';

/**
 * 文件信息接口
 * 描述文件系统中单个文件或目录的完整元信息
 */
export interface FileInfo {
  /** 文件唯一标识符，采用 10 位 62 进制编码 */
  id: string;
  /** 文件显示名称，包含扩展名 */
  name: string;
  /** 文件在工作区中的相对路径 */
  path: string;
  /** 文件类型，由扩展名推断 */
  type: FileType;
  /** 文件大小（字节），目录为 0 */
  size: number;
  /** 创建时间，ISO 8601 格式 */
  createdAt: string;
  /** 最后修改时间，ISO 8601 格式 */
  modifiedAt: string;
  /** 是否为目录 */
  isDirectory: boolean;
  /** 子文件列表，仅目录有效 */
  children?: FileInfo[];
  /** 目录展开状态，仅目录有效 */
  expanded?: boolean;
}

/**
 * 文件操作结果
 * 统一的操作返回格式，包含成功/失败状态和详细信息
 */
export interface FileOperationResult {
  /** 操作是否成功 */
  success: boolean;
  /** 操作涉及的文件信息 */
  file?: FileInfo;
  /** 错误描述信息，用于 UI 展示 */
  error?: string;
  /** 错误代码，用于程序化处理 */
  errorCode?: string;
}
```

### 2.2 FileSystemService 类

FileSystemService 采用单例模式设计，确保整个应用中只存在一个文件系统服务实例，避免资源竞争和状态不一致。

```typescript
/**
 * 文件系统服务类
 * 
 * 提供跨平台的文件系统操作能力，是编辑器文件操作的唯一入口。
 * 所有文件操作通过事件系统通知其他模块，实现松耦合的模块协作。
 */
export class FileSystemService {
  /** 事件发射器，用于通知文件变更 */
  private events: EventEmitter;
  /** 工作区根路径 */
  private workspaceRoot: string;
  /** 文件信息缓存，提升重复访问性能 */
  private fileCache: Map<string, FileInfo>;
  /** 文件监听器映射 */
  private watchers: Map<string, FileWatcher>;
  /** 运行环境适配器 */
  private adapter: FileSystemAdapter;

  constructor(events: EventEmitter, adapter: FileSystemAdapter);
}
```

### 2.3 核心方法签名

**初始化与配置方法**：

```typescript
/**
 * 初始化文件系统服务
 * 创建工作区目录（如不存在）、加载文件索引、启动文件监听
 */
async initialize(): Promise<void>;

/**
 * 获取当前工作区根路径
 */
getWorkspaceRoot(): string;

/**
 * 设置工作区根路径
 * 切换工作区时调用，会重新初始化文件索引
 */
async setWorkspaceRoot(path: string): Promise<void>;
```

**文件查询方法**：

```typescript
/**
 * 获取指定目录下的文件列表
 * @param path - 目录路径，相对于工作区根
 * @param recursive - 是否递归获取子目录
 */
async getFileList(path?: string, recursive?: boolean): Promise<FileInfo[]>;

/**
 * 获取完整的文件树结构
 * 返回从工作区根开始的完整目录树
 */
async getFileTree(): Promise<FileInfo[]>;

/**
 * 获取单个文件的详细信息
 * @param path - 文件路径
 */
async getFileInfo(path: string): Promise<FileInfo | null>;

/**
 * 搜索文件
 * @param query - 搜索关键词
 * @param options - 搜索选项（类型过滤、路径范围等）
 */
async searchFiles(
  query: string, 
  options?: { type?: FileType; path?: string }
): Promise<FileInfo[]>;
```

**文件操作方法**：

```typescript
/**
 * 创建卡片文件夹
 * 在指定位置创建 .card 文件夹，并初始化必要的元文件
 */
async createCard(options: CreateCardOptions): Promise<FileOperationResult>;

/**
 * 创建箱子文件夹
 */
async createBox(options: CreateBoxOptions): Promise<FileOperationResult>;

/**
 * 创建普通文件夹
 */
async createFolder(options: CreateFolderOptions): Promise<FileOperationResult>;

/**
 * 删除文件或目录
 * @param path - 文件路径
 * @param permanent - 是否永久删除（否则移至回收站）
 */
async deleteFile(path: string, permanent?: boolean): Promise<FileOperationResult>;

/**
 * 重命名文件或目录
 */
async renameFile(path: string, newName: string): Promise<FileOperationResult>;

/**
 * 复制文件或目录
 */
async copyFile(sourcePath: string, destPath: string): Promise<FileOperationResult>;

/**
 * 移动文件或目录
 */
async moveFile(sourcePath: string, destPath: string): Promise<FileOperationResult>;
```

**文件内容操作方法**：

```typescript
/**
 * 读取文件内容
 * @param path - 文件路径
 * @param encoding - 编码格式，默认 utf-8
 */
async readFile(path: string, encoding?: string): Promise<string | ArrayBuffer>;

/**
 * 写入文件内容
 * @param path - 文件路径
 * @param content - 文件内容
 * @param options - 写入选项
 */
async writeFile(
  path: string, 
  content: string | ArrayBuffer,
  options?: { overwrite?: boolean; createDirectories?: boolean }
): Promise<FileOperationResult>;

/**
 * 检查文件是否存在
 */
async exists(path: string): Promise<boolean>;
```

**文件监听方法**：

```typescript
/**
 * 监听文件变更
 * @param path - 监听路径
 * @param callback - 变更回调
 */
watch(path: string, callback: (event: FileChangeEvent) => void): () => void;

/**
 * 停止监听指定路径
 */
unwatch(path: string): void;

/**
 * 停止所有文件监听
 */
unwatchAll(): void;
```

---

## 3. 模块关系

### 3.1 与 WorkspaceService 的协作

WorkspaceService 是 FileSystemService 的主要消费者之一。WorkspaceService 负责管理编辑器的工作区状态（包括已打开的文件列表、文件的编辑状态等），而实际的文件 I/O 操作则委托给 FileSystemService 完成。

两者的协作遵循清晰的职责划分：WorkspaceService 关注"业务语义"层面的操作（如"创建一张新卡片"），FileSystemService 关注"文件系统"层面的操作（如"创建一个目录并写入初始文件"）。

```typescript
// WorkspaceService 中的典型调用模式
async function createCard(name: string): Promise<WorkspaceFile> {
  const id = generateId();
  const timestamp = now();
  
  // 1. 通过 FileSystemService 创建物理文件
  const result = await fileSystemService.createCard({
    name,
    parentPath: this.state.rootPath,
  });
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  // 2. 更新工作区状态
  const newFile: WorkspaceFile = {
    id,
    name: `${name}.card`,
    path: result.file!.path,
    type: 'card',
    createdAt: timestamp,
    modifiedAt: timestamp,
  };
  
  this.state.files.push(newFile);
  
  // 3. 发布事件通知
  this.events.emit('workspace:file-created', { file: newFile });
  
  return newFile;
}
```

### 3.2 与 CardService 的协作

CardService 处理卡片数据的读写，它需要通过 FileSystemService 访问卡片文件夹内的具体文件。当 CardService 需要读取卡片的 `manifest.json` 或 `content/` 目录下的内容时，都通过 FileSystemService 提供的统一接口完成。

这种设计使得 CardService 可以专注于卡片数据格式的解析和验证，而无需关心底层存储细节。

```typescript
// CardService 中读取卡片数据的典型流程
async function readCard(cardId: string): Promise<Card> {
  const cardPath = await this.resolveCardPath(cardId);
  
  // 1. 读取清单文件
  const manifestContent = await fileSystemService.readFile(
    `${cardPath}/manifest.json`
  );
  const manifest = JSON.parse(manifestContent as string);
  
  // 2. 读取结构定义
  const structureContent = await fileSystemService.readFile(
    `${cardPath}/structure.json`
  );
  const structure = JSON.parse(structureContent as string);
  
  // 3. 按需加载内容
  const content: Record<string, any> = {};
  for (const baseCard of structure.baseCards) {
    const contentPath = `${cardPath}/content/${baseCard.id}.json`;
    if (await fileSystemService.exists(contentPath)) {
      content[baseCard.id] = JSON.parse(
        await fileSystemService.readFile(contentPath) as string
      );
    }
  }
  
  return { metadata: manifest.metadata, structure, content };
}
```

### 3.3 与 Electron Main Process 的关系

在 Electron 环境下，FileSystemService 的实际文件操作需要通过 IPC（进程间通信）调用 Main Process 中的 Node.js API。FileSystemService 内部维护一个环境适配器（FileSystemAdapter），在 Electron 环境下，该适配器会将所有文件操作请求转发给 Main Process。

```typescript
// Electron 环境下的适配器实现
class ElectronFileSystemAdapter implements FileSystemAdapter {
  async readFile(path: string): Promise<ArrayBuffer> {
    return window.electronAPI.fs.readFile(path);
  }
  
  async writeFile(path: string, content: ArrayBuffer): Promise<void> {
    return window.electronAPI.fs.writeFile(path, content);
  }
  
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    return window.electronAPI.fs.mkdir(path, options);
  }
  
  watch(path: string, callback: (event: string, filename: string) => void): void {
    window.electronAPI.fs.watch(path, callback);
  }
}
```

### 3.4 与 Web 环境的关系

在 Web 环境下，FileSystemService 使用 IndexedDB 模拟文件系统。每个"文件"存储为一条 IndexedDB 记录，目录结构通过路径字符串的层级关系来表达。这种实现方式使得 Web 版本的编辑器也能提供完整的文件管理功能。

```typescript
// Web 环境下的适配器实现
class WebFileSystemAdapter implements FileSystemAdapter {
  private db: IDBDatabase;
  
  async readFile(path: string): Promise<ArrayBuffer> {
    const transaction = this.db.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    const request = store.get(path);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.content);
      request.onerror = () => reject(request.error);
    });
  }
  
  async writeFile(path: string, content: ArrayBuffer): Promise<void> {
    const transaction = this.db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    
    await store.put({
      path,
      content,
      modifiedAt: new Date().toISOString(),
    });
  }
}
```

---

## 4. 工作区目录结构

### 4.1 标准目录布局

FileSystemService 管理的工作区遵循统一的目录结构规范。默认工作区位于用户目录下的 `.chips-editor/workspace/`。

```
~/.chips-editor/
├── workspace/                    # 工作区根目录
│   ├── 我的第一张卡片.card/      # 卡片文件夹
│   │   ├── manifest.json         # 卡片清单
│   │   ├── structure.json        # 结构定义
│   │   ├── content/              # 内容目录
│   │   │   ├── bc001.json        # 基础卡片内容
│   │   │   └── bc002.json
│   │   └── resources/            # 资源目录
│   │       ├── images/
│   │       └── attachments/
│   │
│   ├── 项目文档.box/             # 箱子文件夹
│   │   ├── manifest.json
│   │   ├── layout.json           # 布局配置
│   │   └── cards/                # 引用的卡片
│   │
│   └── 工作笔记/                 # 普通文件夹
│       └── ...
│
├── cache/                        # 缓存目录
│   ├── thumbnails/               # 缩略图缓存
│   └── previews/                 # 预览缓存
│
├── trash/                        # 回收站
│   └── ...
│
└── config/                       # 配置目录
    ├── settings.json             # 用户设置
    └── recent.json               # 最近打开的文件
```

### 4.2 卡片文件夹结构

每个 `.card` 文件夹是一个自包含的卡片存储单元，其内部结构经过精心设计以支持卡片的完整功能。

`manifest.json` 是卡片的入口文件，包含卡片的基本元信息：

```json
{
  "version": "1.0",
  "id": "a1b2c3d4e5",
  "metadata": {
    "name": "我的第一张卡片",
    "description": "这是一张示例卡片",
    "author": "用户名",
    "createdAt": "2026-02-03T10:00:00.000Z",
    "modifiedAt": "2026-02-03T15:30:00.000Z",
    "tags": ["示例", "文档"]
  },
  "theme": {
    "id": "default",
    "customizations": {}
  }
}
```

`structure.json` 定义了卡片的结构组成：

```json
{
  "baseCards": [
    {
      "id": "bc001",
      "type": "rich-text",
      "position": 0
    },
    {
      "id": "bc002", 
      "type": "image",
      "position": 1
    }
  ],
  "layout": {
    "direction": "vertical",
    "gap": 16
  }
}
```

### 4.3 目录初始化流程

当 FileSystemService 首次初始化或切换到新的工作区时，会执行完整的目录初始化流程：

1. **检查工作区根目录是否存在**。如果不存在，创建完整的目录结构。

2. **验证目录结构完整性**。确保 `cache/`、`trash/`、`config/` 等必要子目录存在。

3. **加载配置文件**。读取 `config/settings.json` 获取用户偏好设置。

4. **构建文件索引**。遍历工作区目录，构建内存中的文件树结构。

5. **启动文件监听**。对工作区根目录启动监听，以感知外部文件变更。

---

## 5. 文件操作流程

### 5.1 创建卡片流程

创建新卡片是一个涉及多个步骤的原子操作。FileSystemService 确保这个过程的完整性——要么全部成功，要么全部回滚。

```typescript
async createCard(options: CreateCardOptions): Promise<FileOperationResult> {
  const { name, parentPath, type = 'basic', tags = [] } = options;
  
  // 1. 验证文件名合法性
  if (!isValidFileName(name)) {
    return {
      success: false,
      error: 'error.invalid_filename',
      errorCode: 'VAL-1001',
    };
  }
  
  // 2. 检查目标路径是否已存在
  const cardPath = `${parentPath}/${name}.card`;
  if (await this.exists(cardPath)) {
    return {
      success: false,
      error: 'error.file_exists',
      errorCode: 'FS-2001',
    };
  }
  
  try {
    // 3. 创建卡片文件夹
    await this.adapter.mkdir(cardPath);
    
    // 4. 创建子目录
    await this.adapter.mkdir(`${cardPath}/content`);
    await this.adapter.mkdir(`${cardPath}/resources`);
    await this.adapter.mkdir(`${cardPath}/resources/images`);
    
    // 5. 生成并写入清单文件
    const manifest = this.generateManifest(name, tags);
    await this.writeFile(
      `${cardPath}/manifest.json`,
      JSON.stringify(manifest, null, 2)
    );
    
    // 6. 生成并写入结构文件
    const structure = this.generateInitialStructure(type);
    await this.writeFile(
      `${cardPath}/structure.json`,
      JSON.stringify(structure, null, 2)
    );
    
    // 7. 构建文件信息
    const fileInfo = await this.getFileInfo(cardPath);
    
    // 8. 发布创建事件
    this.events.emit('file:created', { file: fileInfo });
    
    return { success: true, file: fileInfo };
    
  } catch (error) {
    // 9. 发生错误时清理已创建的内容
    await this.cleanupPartialCreate(cardPath);
    
    return {
      success: false,
      error: error.message,
      errorCode: 'FS-1001',
    };
  }
}
```

### 5.2 读取文件流程

文件读取操作会首先检查缓存，以提升重复访问的性能。

```typescript
async readFile(path: string, encoding: string = 'utf-8'): Promise<string | ArrayBuffer> {
  // 1. 检查缓存
  const cacheKey = `content:${path}`;
  if (this.contentCache.has(cacheKey)) {
    return this.contentCache.get(cacheKey);
  }
  
  // 2. 检查文件是否存在
  if (!await this.exists(path)) {
    throw new FileNotFoundError(path);
  }
  
  // 3. 读取文件内容
  const absolutePath = this.resolvePath(path);
  const content = await this.adapter.readFile(absolutePath);
  
  // 4. 根据编码转换
  let result: string | ArrayBuffer;
  if (encoding === 'binary') {
    result = content;
  } else {
    const decoder = new TextDecoder(encoding);
    result = decoder.decode(content);
  }
  
  // 5. 更新缓存
  this.contentCache.set(cacheKey, result);
  
  return result;
}
```

### 5.3 删除文件流程

删除操作默认将文件移至回收站，只有明确指定 `permanent: true` 时才执行永久删除。

```typescript
async deleteFile(path: string, permanent: boolean = false): Promise<FileOperationResult> {
  // 1. 获取文件信息
  const file = await this.getFileInfo(path);
  if (!file) {
    return {
      success: false,
      error: 'error.file_not_found',
      errorCode: 'RES-3001',
    };
  }
  
  try {
    if (permanent) {
      // 2a. 永久删除
      await this.adapter.remove(this.resolvePath(path), { recursive: true });
    } else {
      // 2b. 移至回收站
      const trashPath = this.generateTrashPath(path);
      await this.adapter.rename(this.resolvePath(path), trashPath);
      
      // 记录删除信息以便恢复
      await this.recordTrashEntry(path, trashPath, file);
    }
    
    // 3. 清理缓存
    this.invalidateCache(path);
    
    // 4. 发布删除事件
    this.events.emit('file:deleted', { path, file, permanent });
    
    return { success: true, file };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorCode: 'FS-3001',
    };
  }
}
```

### 5.4 文件变更监听流程

FileSystemService 维护一个统一的文件监听机制，能够感知工作区内的任何文件变更。

```typescript
private initializeWatcher(): void {
  // 监听工作区根目录
  this.adapter.watch(
    this.workspaceRoot,
    (eventType, filename) => {
      this.handleFileChange(eventType, filename);
    }
  );
}

private handleFileChange(eventType: string, filename: string): void {
  // 防抖处理，避免短时间内重复触发
  clearTimeout(this.debounceTimers.get(filename));
  
  this.debounceTimers.set(filename, setTimeout(async () => {
    // 获取最新的文件信息
    const path = `${this.workspaceRoot}/${filename}`;
    const fileInfo = await this.getFileInfo(path);
    
    // 根据事件类型发布不同的事件
    switch (eventType) {
      case 'create':
        this.events.emit('file:external-created', { path, file: fileInfo });
        break;
      case 'change':
        // 清理缓存
        this.invalidateCache(path);
        this.events.emit('file:external-modified', { path, file: fileInfo });
        break;
      case 'delete':
        this.invalidateCache(path);
        this.events.emit('file:external-deleted', { path });
        break;
    }
  }, 100));
}
```

---

## 6. 错误处理

### 6.1 错误分类体系

FileSystemService 定义了一套结构化的错误分类体系，便于上层模块进行针对性处理。

| 错误代码 | 错误类型 | 描述 | 处理建议 |
|---------|---------|------|---------|
| VAL-1001 | 验证错误 | 无效的文件名 | 提示用户修改文件名 |
| VAL-1002 | 验证错误 | 路径格式错误 | 检查路径字符串 |
| FS-1001 | 文件系统错误 | 创建文件失败 | 检查磁盘空间和权限 |
| FS-2001 | 文件系统错误 | 文件已存在 | 提示用户选择覆盖或重命名 |
| FS-2002 | 文件系统错误 | 目录已存在 | 同上 |
| FS-3001 | 文件系统错误 | 删除失败 | 检查文件是否被占用 |
| FS-4001 | 文件系统错误 | 读取失败 | 检查文件完整性 |
| FS-4002 | 文件系统错误 | 写入失败 | 检查磁盘空间 |
| RES-3001 | 资源错误 | 文件不存在 | 检查路径是否正确 |
| RES-3002 | 资源错误 | 目录不存在 | 创建目录或检查路径 |
| PERM-1001 | 权限错误 | 无读取权限 | 检查文件权限设置 |
| PERM-1002 | 权限错误 | 无写入权限 | 检查文件权限设置 |

### 6.2 错误处理策略

FileSystemService 内部采用多层错误处理策略，确保错误信息能够准确传递给上层模块。

**底层适配器错误捕获**：适配器层捕获原生文件系统错误，并转换为统一的错误格式。

```typescript
class ElectronFileSystemAdapter implements FileSystemAdapter {
  async readFile(path: string): Promise<ArrayBuffer> {
    try {
      return await window.electronAPI.fs.readFile(path);
    } catch (error) {
      // 转换原生错误为统一格式
      if (error.code === 'ENOENT') {
        throw new FileSystemError('RES-3001', `文件不存在: ${path}`);
      }
      if (error.code === 'EACCES') {
        throw new FileSystemError('PERM-1001', `无权限读取: ${path}`);
      }
      throw new FileSystemError('FS-4001', error.message);
    }
  }
}
```

**服务层错误包装**：FileSystemService 将适配器错误包装为 FileOperationResult 格式返回。

```typescript
async readFile(path: string): Promise<string | ArrayBuffer> {
  try {
    return await this.adapter.readFile(this.resolvePath(path));
  } catch (error) {
    if (error instanceof FileSystemError) {
      // 记录错误日志
      console.error(`[FileSystemService] 读取失败: ${error.code} - ${error.message}`);
      throw error;
    }
    // 未知错误包装
    throw new FileSystemError('FS-4001', `读取文件时发生未知错误: ${error.message}`);
  }
}
```

### 6.3 错误恢复机制

对于部分可恢复的错误场景，FileSystemService 提供自动恢复机制。

**创建操作的回滚**：如果创建卡片过程中发生错误，会自动清理已创建的部分内容。

```typescript
private async cleanupPartialCreate(cardPath: string): Promise<void> {
  try {
    if (await this.exists(cardPath)) {
      await this.adapter.remove(this.resolvePath(cardPath), { recursive: true });
    }
  } catch (cleanupError) {
    // 清理失败也要记录，但不影响原错误的返回
    console.warn(`[FileSystemService] 清理失败创建时出错: ${cleanupError.message}`);
  }
}
```

**文件冲突的处理**：当检测到外部修改导致的冲突时，提供多种解决策略。

```typescript
async resolveConflict(
  path: string, 
  strategy: 'overwrite' | 'backup' | 'merge'
): Promise<FileOperationResult> {
  switch (strategy) {
    case 'overwrite':
      // 直接覆盖外部修改
      return await this.writeFile(path, this.pendingContent.get(path)!, { overwrite: true });
      
    case 'backup':
      // 备份外部版本后写入
      const backupPath = this.generateBackupPath(path);
      await this.copyFile(path, backupPath);
      return await this.writeFile(path, this.pendingContent.get(path)!, { overwrite: true });
      
    case 'merge':
      // 触发合并流程（需要上层模块支持）
      this.events.emit('file:conflict-merge-required', { path });
      return { success: false, error: 'merge_required' };
  }
}
```

---

## 7. 性能优化

### 7.1 缓存策略

FileSystemService 实现了多级缓存策略以提升性能：

**文件信息缓存**：缓存文件的元信息，避免重复的文件系统调用。

**内容缓存**：对于频繁访问的小文件（如 JSON 配置文件），缓存其内容。

**缓存失效**：当文件被修改或删除时，自动清理相关缓存。

### 7.2 批量操作优化

对于批量文件操作，FileSystemService 提供优化的批量接口：

```typescript
async batchCreate(
  operations: CreateCardOptions[]
): Promise<FileOperationResult[]> {
  // 并发执行创建操作，但限制最大并发数
  const results: FileOperationResult[] = [];
  const concurrencyLimit = 5;
  
  for (let i = 0; i < operations.length; i += concurrencyLimit) {
    const batch = operations.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(op => this.createCard(op))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

---

**文档维护者**: Chips 生态团队  
**最后审核**: 2026-02-03  
**状态**: ✅ 生效
