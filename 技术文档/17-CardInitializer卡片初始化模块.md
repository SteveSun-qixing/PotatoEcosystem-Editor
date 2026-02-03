# 卡片编辑引擎 - CardInitializer 卡片初始化模块

**版本**: 1.0.0  
**更新时间**: 2026-02-03  
**状态**: 设计中

---

## 1. 模块概述

### 1.1 模块定位

CardInitializer 是编辑引擎中负责新卡片创建的核心模块。当用户点击"新建卡片"按钮时，系统需要完成一系列初始化工作：生成唯一标识符、创建目录结构、写入初始配置文件、准备默认封面。这些工作涉及多个步骤和多种文件格式，如果分散在各处会造成代码重复和维护困难。CardInitializer 将这些初始化逻辑集中在一起，提供统一的卡片创建入口。

卡片在编辑器中以解压后的文件夹形式存在。一个新建的卡片需要包含 .card 配置目录、content 内容目录，以及必要的初始文件。CardInitializer 负责按照卡片文件格式规范创建这些目录和文件，确保新卡片从一开始就符合标准结构，可以被编辑器正常读取和编辑。

### 1.2 核心职责

CardInitializer 承担四项核心职责。

第一是生成卡片唯一 ID。每个卡片都需要一个全局唯一的标识符，格式是 10 位 62 进制编号，使用 0-9、a-z、A-Z 字符组成。这个 ID 在卡片的整个生命周期中保持不变，用于卡片的引用和关联。

第二是创建目录结构。卡片文件夹需要遵循特定的目录布局：根目录下有一个 .card 隐藏文件夹存放配置，一个 content 文件夹存放基础卡片的配置文件。初始化时需要创建这两个目录。

第三是初始化配置文件。.card 目录下需要三个必需文件：metadata.yaml 记录卡片元数据，structure.yaml 定义卡片结构，cover.html 定义封面显示。CardInitializer 生成这些文件的初始内容并写入磁盘。

第四是与 WorkspaceService 协作。新卡片需要在工作区中创建对应的文件夹，CardInitializer 调用 WorkspaceService 完成工作区层面的注册，使新卡片出现在文件列表中。

---

## 2. 卡片初始化流程

### 2.1 整体流程

卡片初始化是一个有序的多步骤过程。当调用 initializeCard 方法时，系统按以下顺序执行操作。

首先是参数验证。检查传入的卡片名称是否合法，名称不能为空，长度不能超过 500 个字符，不能包含文件系统禁止的特殊字符。如果名称不合法，立即返回错误，不进行后续操作。

然后是 ID 生成。调用 ID 生成器创建一个 10 位 62 进制的唯一标识符。生成器使用当前时间戳和随机数组合，确保 ID 的唯一性。生成后会检查工作区中是否已存在同 ID 的卡片，虽然概率极低，但如果冲突则重新生成。

接下来是目录创建。在工作区的指定位置创建卡片根目录，目录名使用用户提供的卡片名称加上 .card 后缀。然后在根目录下创建 .card 配置目录和 content 内容目录。目录创建失败（如权限不足或磁盘已满）会触发错误处理流程。

最后是文件初始化。依次创建 metadata.yaml、structure.yaml 和 cover.html 三个必需文件。每个文件都有预定义的模板，填入卡片名称、ID、创建时间等信息后写入磁盘。所有文件创建完成后，向 WorkspaceService 注册新卡片，更新文件列表。

### 2.2 流程图示

```
用户请求创建卡片
        │
        ▼
┌───────────────────┐
│   验证卡片名称     │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   生成唯一 ID      │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  创建卡片根目录    │
│  (name.card/)     │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  创建 .card/ 目录  │
│  创建 content/ 目录│
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 写入 metadata.yaml│
│ 写入 structure.yaml│
│ 写入 cover.html   │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 注册到 Workspace  │
└───────────────────┘
        │
        ▼
    返回新卡片信息
```

### 2.3 事务性保证

卡片初始化涉及多个文件操作，需要考虑部分失败的情况。如果在创建过程中某个步骤失败，系统应该清理已创建的文件和目录，避免留下不完整的卡片结构。CardInitializer 采用"全部成功或全部回滚"的策略：记录每个成功完成的操作，如果后续步骤失败，按相反顺序撤销已完成的操作。

---

## 3. 初始文件结构和内容

### 3.1 目录结构

新建卡片的目录结构如下所示。卡片名称假设为"我的第一张卡片"。

```
我的第一张卡片.card/
├── .card/
│   ├── metadata.yaml    # 卡片元数据
│   ├── structure.yaml   # 卡片结构定义
│   └── cover.html       # 封面显示
└── content/             # 基础卡片配置（初始为空）
```

.card 目录是一个隐藏文件夹，存放卡片的核心配置文件。content 目录初始为空，当用户添加基础卡片时，会在这里创建对应的配置文件。根目录初始时不包含任何资源文件，用户导入图片、视频等资源后，这些文件会保存在根目录中。

### 3.2 metadata.yaml 初始内容

metadata.yaml 记录卡片的元信息。初始化时生成的内容包含卡片的基本属性。

```yaml
# 卡片元数据
id: "a1B2c3D4e5"                    # 10位62进制唯一ID
name: "我的第一张卡片"               # 卡片名称
created_at: "2026-02-03T10:30:00Z"  # 创建时间（UTC）
modified_at: "2026-02-03T10:30:00Z" # 修改时间（UTC）
chip_standards_version: "1.0.0"     # 卡片格式版本

# 主题设置（默认使用系统主题）
theme: ""

# 标签（初始为空）
tags: []

# 文件信息（由系统自动计算）
file_info:
  total_size: 0
  file_count: 0
  checksum: ""
```

id 字段是卡片的唯一标识符，由 CardInitializer 在初始化时生成。name 字段来自用户输入的卡片名称。created_at 和 modified_at 记录 ISO 8601 格式的时间戳，使用 UTC 时区。chip_standards_version 标记卡片遵循的格式规范版本，当前是 1.0.0。

theme 字段指定卡片使用的主题包，格式是"发行商：主题包名称"。新建卡片默认为空，表示使用系统默认主题。tags 是标签数组，新卡片初始为空数组。file_info 部分由系统在保存时自动计算，初始值都是零或空字符串。

### 3.3 structure.yaml 初始内容

structure.yaml 定义卡片包含哪些基础卡片以及它们的顺序。新建卡片的结构文件只包含空的基本框架。

```yaml
# 卡片结构定义

# 基础卡片列表（按渲染顺序排列）
structure: []

# 资源清单
manifest:
  basic_card_count: 0
  files: []
```

structure 数组记录卡片包含的基础卡片，每个条目包含卡片 ID 和类型。新建卡片没有任何基础卡片，所以初始为空数组。manifest 部分提供快速索引信息，basic_card_count 记录基础卡片数量，files 数组列出所有资源文件的信息。

当用户添加第一个基础卡片后，structure.yaml 会更新为类似这样的内容：

```yaml
structure:
  - id: "Xy9Zw8Vt7U"
    type: "RichTextCard"

manifest:
  basic_card_count: 1
  files: []
```

### 3.4 cover.html 初始内容

cover.html 定义卡片在列表视图中的封面显示。新建卡片使用默认封面，简洁地显示卡片名称。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>卡片封面</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    .card-title {
      color: white;
      font-size: 1.5rem;
      font-weight: 600;
      text-align: center;
      padding: 1rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      word-break: break-word;
      max-width: 90%;
    }
  </style>
</head>
<body>
  <div class="card-title">我的第一张卡片</div>
</body>
</html>
```

默认封面使用渐变背景和居中的卡片名称，提供简洁美观的视觉效果。用户可以稍后自定义封面，上传图片或编写自己的 HTML 代码。封面 HTML 在沙箱环境中运行，有安全限制，不能访问外部资源或执行危险操作。

---

## 4. 接口设计

### 4.1 主要方法

CardInitializer 提供一个核心方法 initializeCard，负责完成卡片的全部初始化工作。

```typescript
interface CardInitializer {
  /**
   * 初始化新卡片
   * 创建卡片目录结构，生成初始配置文件
   * 
   * @param options - 初始化选项
   * @returns 初始化结果，包含新卡片的完整信息
   */
  initializeCard(options: CardInitOptions): Promise<CardInitResult>;
  
  /**
   * 生成卡片唯一 ID
   * 返回 10 位 62 进制编号
   */
  generateCardId(): string;
  
  /**
   * 验证卡片名称
   * 检查名称是否符合规范
   */
  validateCardName(name: string): ValidationResult;
}
```

### 4.2 初始化选项

initializeCard 方法接受一个选项对象，包含创建新卡片所需的全部参数。

```typescript
interface CardInitOptions {
  /** 卡片名称（必需） */
  name: string;
  
  /** 父目录路径（可选，默认为工作区根目录） */
  parentPath?: string;
  
  /** 初始标签（可选） */
  tags?: string[][];
  
  /** 主题包标识（可选） */
  theme?: string;
  
  /** 初始基础卡片（可选） */
  initialBasicCard?: {
    type: string;
    data?: Record<string, unknown>;
  };
  
  /** 自定义封面 HTML（可选） */
  customCover?: string;
}
```

name 是唯一的必需参数，指定卡片的显示名称。parentPath 指定卡片创建的位置，如果不提供则在工作区根目录创建。tags 允许在创建时就指定标签，避免用户事后再设置。theme 指定使用的主题包，不指定则使用系统默认主题。

initialBasicCard 是一个便捷选项，允许在创建卡片的同时添加第一个基础卡片。比如用户选择"新建富文本卡片"时，可以传入 `{ type: 'RichTextCard' }` 直接创建一个包含空白富文本基础卡片的复合卡片。customCover 允许传入自定义的封面 HTML 代码，不传则使用默认封面。

### 4.3 初始化结果

initializeCard 方法返回一个结果对象，包含新创建卡片的完整信息。

```typescript
interface CardInitResult {
  /** 操作是否成功 */
  success: boolean;
  
  /** 错误信息（仅失败时有值） */
  error?: CardInitError;
  
  /** 新卡片信息（仅成功时有值） */
  card?: {
    /** 卡片唯一 ID */
    id: string;
    
    /** 卡片名称 */
    name: string;
    
    /** 卡片在工作区中的路径 */
    path: string;
    
    /** 创建时间 */
    createdAt: string;
    
    /** 元数据文件路径 */
    metadataPath: string;
    
    /** 结构文件路径 */
    structurePath: string;
    
    /** 封面文件路径 */
    coverPath: string;
    
    /** 内容目录路径 */
    contentPath: string;
  };
}

interface CardInitError {
  /** 错误代码 */
  code: CardInitErrorCode;
  
  /** 错误消息 */
  message: string;
  
  /** 相关路径（如有） */
  path?: string;
}

enum CardInitErrorCode {
  /** 名称无效 */
  INVALID_NAME = 'INIT-001',
  
  /** 卡片已存在 */
  CARD_EXISTS = 'INIT-002',
  
  /** 目录创建失败 */
  DIRECTORY_CREATION_FAILED = 'INIT-003',
  
  /** 文件写入失败 */
  FILE_WRITE_FAILED = 'INIT-004',
  
  /** 权限不足 */
  PERMISSION_DENIED = 'INIT-005',
  
  /** 磁盘空间不足 */
  NO_SPACE = 'INIT-006',
  
  /** 工作区未初始化 */
  WORKSPACE_NOT_READY = 'INIT-007',
}
```

成功时 success 为 true，card 对象包含新卡片的所有路径信息，上层代码可以直接使用这些路径进行后续操作。失败时 success 为 false，error 对象描述失败原因，便于向用户显示友好的错误提示。

### 4.4 ID 生成算法

卡片 ID 使用 10 位 62 进制编码，字符集包括 0-9、a-z、A-Z 共 62 个字符。生成算法结合时间戳和随机数，确保全局唯一性。

```typescript
/**
 * 生成 10 位 62 进制卡片 ID
 */
function generateCardId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const base = chars.length; // 62
  
  // 使用时间戳作为前 6 位的基础（提供时间顺序性）
  let timestamp = Date.now();
  let timePart = '';
  for (let i = 0; i < 6; i++) {
    timePart = chars[timestamp % base] + timePart;
    timestamp = Math.floor(timestamp / base);
  }
  
  // 使用随机数作为后 4 位（提供唯一性）
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars[Math.floor(Math.random() * base)];
  }
  
  return timePart + randomPart;
}
```

这个算法生成的 ID 具有几个特性：前 6 位基于时间戳，使得同一时间段创建的卡片 ID 相近，有一定的时间顺序性；后 4 位是纯随机数，即使在同一毫秒内创建多个卡片也能保证唯一性。10 位 62 进制数的组合空间约为 8.4×10^17，足以避免冲突。

---

## 5. 与其他模块的关系

### 5.1 模块依赖图

CardInitializer 在编辑器架构中处于服务层，与多个模块存在依赖关系。

```
┌─────────────────────────────────────────────────────────┐
│                      UI 组件层                          │
│         CreateCardDialog    FileExplorer               │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      服务层                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ CardService │◄───│CardInitializer│───►│WorkspaceService│
│  └─────────────┘    └──────┬──────┘    └─────────────┘ │
│                            │                            │
│                            ▼                            │
│                   ┌─────────────────┐                   │
│                   │FileSystemService│                   │
│                   └─────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### 5.2 与 CardService 的协作

CardService 是复合卡片的业务管理服务，负责卡片的打开、编辑、保存等操作。当用户请求创建新卡片时，CardService 调用 CardInitializer 完成文件系统层面的初始化，然后将新卡片的内存表示添加到已打开卡片列表中。

CardService 的 createCard 方法内部会调用 CardInitializer.initializeCard，获取新卡片的路径和 ID 后，创建对应的 CompositeCard 对象。这种分工使得 CardService 可以专注于内存中卡片数据的管理，而文件创建的细节由 CardInitializer 处理。

```typescript
// CardService 中调用 CardInitializer 的示例
async function createCard(name: string): Promise<CompositeCard> {
  // 调用 CardInitializer 创建文件结构
  const result = await cardInitializer.initializeCard({ name });
  
  if (!result.success) {
    throw new Error(result.error?.message);
  }
  
  // 创建内存中的卡片对象
  const newCard: CompositeCard = {
    id: result.card!.id,
    path: result.card!.path,
    metadata: {
      name,
      createdAt: result.card!.createdAt,
      modifiedAt: result.card!.createdAt,
    },
    structure: { basicCards: [] },
    isDirty: false,
    isEditing: true,
  };
  
  return newCard;
}
```

### 5.3 与 WorkspaceService 的协作

WorkspaceService 管理编辑器的工作区状态，包括文件列表、已打开文件、文件树展开状态等。CardInitializer 在创建卡片文件后，需要通知 WorkspaceService 更新文件列表，使新卡片出现在界面的文件浏览器中。

协作方式有两种。一种是 CardInitializer 在完成文件创建后直接调用 WorkspaceService.createCard 方法，传入卡片信息进行注册。另一种是通过事件系统，CardInitializer 发出 card:initialized 事件，WorkspaceService 监听此事件并自动更新文件列表。推荐使用事件方式，降低模块间的直接耦合。

```typescript
// 通过事件通知 WorkspaceService
eventEmitter.emit('card:initialized', {
  id: cardId,
  name: options.name,
  path: cardPath,
  createdAt: timestamp,
});

// WorkspaceService 监听事件
eventEmitter.on('card:initialized', (data) => {
  state.value.files.push({
    id: data.id,
    name: `${data.name}.card`,
    path: data.path,
    type: 'card',
    createdAt: data.createdAt,
    modifiedAt: data.createdAt,
  });
});
```

### 5.4 与 FileSystemService 的依赖

CardInitializer 依赖 FileSystemService 执行实际的文件操作。创建目录、写入文件、检查文件是否存在，这些底层操作都通过 FileSystemService 完成。这种依赖使得 CardInitializer 无需关心 Electron IPC 通信细节和跨平台差异，只需调用简洁的文件系统接口。

```typescript
// CardInitializer 内部实现示例
class CardInitializerImpl implements CardInitializer {
  private fsService: FileSystemService;
  
  async initializeCard(options: CardInitOptions): Promise<CardInitResult> {
    const cardPath = this.fsService.join(
      options.parentPath || '',
      `${options.name}.card`
    );
    
    // 创建目录结构
    await this.fsService.createDirectory(cardPath);
    await this.fsService.createDirectory(
      this.fsService.join(cardPath, '.card')
    );
    await this.fsService.createDirectory(
      this.fsService.join(cardPath, 'content')
    );
    
    // 写入配置文件
    await this.fsService.writeFile(
      this.fsService.join(cardPath, '.card', 'metadata.yaml'),
      this.generateMetadataContent(options)
    );
    
    // ... 其他文件写入
  }
}
```

---

## 6. 错误处理

### 6.1 错误场景分类

CardInitializer 可能遇到的错误分为三类：参数验证错误、文件系统错误、状态错误。

参数验证错误发生在初始化流程的最开始。卡片名称为空、名称过长、名称包含非法字符都属于此类。这类错误应该立即返回，给出清晰的错误提示，不进行任何文件操作。

文件系统错误发生在目录创建和文件写入阶段。磁盘空间不足、权限不足、路径无效、同名文件已存在都属于此类。这类错误需要进行回滚操作，清理已创建的部分文件，避免留下不完整的卡片结构。

状态错误是指系统状态不满足初始化前提条件。比如工作区尚未初始化、FileSystemService 不可用等。这类错误通常表示程序逻辑问题，应该在开发阶段发现和修复。

### 6.2 名称验证规则

卡片名称的验证遵循以下规则。

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateCardName(name: string): ValidationResult {
  // 规则1：名称不能为空
  if (!name || name.trim().length === 0) {
    return { valid: false, error: '卡片名称不能为空' };
  }
  
  // 规则2：名称长度不能超过 500 字符
  if (name.length > 500) {
    return { valid: false, error: '卡片名称不能超过 500 个字符' };
  }
  
  // 规则3：名称不能包含文件系统禁止的字符
  const forbiddenChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (forbiddenChars.test(name)) {
    return { valid: false, error: '卡片名称包含非法字符' };
  }
  
  // 规则4：名称不能是保留名称
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
  if (reservedNames.includes(name.toUpperCase())) {
    return { valid: false, error: '卡片名称不能使用系统保留名称' };
  }
  
  // 规则5：名称不能以点或空格结尾
  if (name.endsWith('.') || name.endsWith(' ')) {
    return { valid: false, error: '卡片名称不能以点或空格结尾' };
  }
  
  return { valid: true };
}
```

### 6.3 回滚机制

当初始化过程中发生错误时，CardInitializer 需要清理已创建的文件和目录，恢复到初始化之前的状态。回滚机制通过记录已完成的操作来实现。

```typescript
async function initializeCard(options: CardInitOptions): Promise<CardInitResult> {
  const rollbackActions: (() => Promise<void>)[] = [];
  
  try {
    // 创建卡片根目录
    await this.fsService.createDirectory(cardPath);
    rollbackActions.push(() => this.fsService.removeDirectory(cardPath));
    
    // 创建 .card 目录
    const configPath = this.fsService.join(cardPath, '.card');
    await this.fsService.createDirectory(configPath);
    rollbackActions.push(() => this.fsService.removeDirectory(configPath));
    
    // 写入 metadata.yaml
    const metadataPath = this.fsService.join(configPath, 'metadata.yaml');
    await this.fsService.writeFile(metadataPath, metadataContent);
    rollbackActions.push(() => this.fsService.deleteFile(metadataPath));
    
    // ... 其他操作
    
    return { success: true, card: { /* ... */ } };
    
  } catch (error) {
    // 按相反顺序执行回滚
    for (let i = rollbackActions.length - 1; i >= 0; i--) {
      try {
        await rollbackActions[i]();
      } catch (rollbackError) {
        console.error('回滚操作失败:', rollbackError);
      }
    }
    
    return {
      success: false,
      error: {
        code: this.mapErrorCode(error),
        message: this.formatErrorMessage(error),
      },
    };
  }
}
```

每个成功完成的操作都会将其逆操作添加到 rollbackActions 数组。如果后续操作失败，按照数组的逆序（即操作的相反顺序）执行回滚。这确保了目录和文件的删除顺序正确——先删除文件，再删除目录。

### 6.4 错误消息本地化

错误消息需要对用户友好，使用本地化的文本而不是技术性的错误代码。CardInitializer 内部使用错误代码标识错误类型，在返回给上层时转换为可读的消息。

```typescript
function formatErrorMessage(code: CardInitErrorCode, locale: string): string {
  const messages: Record<CardInitErrorCode, Record<string, string>> = {
    [CardInitErrorCode.INVALID_NAME]: {
      'zh-CN': '卡片名称无效，请检查后重试',
      'en-US': 'Invalid card name, please check and try again',
    },
    [CardInitErrorCode.CARD_EXISTS]: {
      'zh-CN': '同名卡片已存在，请使用其他名称',
      'en-US': 'A card with this name already exists',
    },
    [CardInitErrorCode.NO_SPACE]: {
      'zh-CN': '磁盘空间不足，无法创建卡片',
      'en-US': 'Not enough disk space to create the card',
    },
    // ... 其他错误消息
  };
  
  return messages[code]?.[locale] || messages[code]?.['zh-CN'] || '未知错误';
}
```

---

**文档维护者**: Chips生态团队  
**最后审核**: 2026-02-03  
**状态**: 📋 设计中
