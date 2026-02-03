/**
 * 工作区服务
 * @module core/workspace-service
 * @description 管理编辑器的内置工作区目录，所有文件都保存在这里
 * 
 * 设计说明：
 * - 编辑器有自己的工作区文件夹，用于存放用户创建的所有文件
 * - 文件缓存、临时文件、用户制作的卡片和箱子都保存在工作区
 * - 只有用户选择导出时，才会将文件移动到其他位置
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { EventEmitter } from './event-manager';
import { createEventEmitter } from './event-manager';

/** 工作区文件信息 */
export interface WorkspaceFile {
  /** 文件 ID */
  id: string;
  /** 文件名 */
  name: string;
  /** 相对路径 */
  path: string;
  /** 文件类型 */
  type: 'card' | 'box' | 'folder';
  /** 创建时间 */
  createdAt: string;
  /** 修改时间 */
  modifiedAt: string;
  /** 子文件（仅文件夹） */
  children?: WorkspaceFile[];
  /** 是否展开（仅文件夹） */
  expanded?: boolean;
}

/** 工作区状态 */
export interface WorkspaceState {
  /** 是否已初始化 */
  initialized: boolean;
  /** 工作区根路径 */
  rootPath: string;
  /** 文件列表 */
  files: WorkspaceFile[];
  /** 当前打开的文件 ID 列表 */
  openedFiles: string[];
}

/** 工作区服务接口 */
export interface WorkspaceService {
  /** 工作区状态 */
  state: Readonly<Ref<WorkspaceState>>;
  /** 文件列表 */
  files: ComputedRef<WorkspaceFile[]>;
  /** 是否已初始化 */
  isInitialized: ComputedRef<boolean>;
  /** 初始化工作区 */
  initialize: () => Promise<void>;
  /** 创建卡片 */
  createCard: (name: string, initialContent?: unknown, cardId?: string) => Promise<WorkspaceFile>;
  /** 创建箱子 */
  createBox: (name: string, layoutType?: string) => Promise<WorkspaceFile>;
  /** 创建文件夹 */
  createFolder: (name: string, parentPath?: string) => Promise<WorkspaceFile>;
  /** 获取文件 */
  getFile: (id: string) => WorkspaceFile | undefined;
  /** 删除文件 */
  deleteFile: (id: string) => Promise<void>;
  /** 重命名文件 */
  renameFile: (id: string, newName: string) => Promise<void>;
  /** 刷新文件列表 */
  refresh: () => Promise<void>;
  /** 获取已打开的文件 */
  getOpenedFiles: () => WorkspaceFile[];
  /** 打开文件 */
  openFile: (id: string) => void;
  /** 关闭文件 */
  closeFile: (id: string) => void;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 获取当前时间的 ISO 字符串
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * 创建工作区服务
 * @param events - 事件发射器
 * @returns 工作区服务实例
 */
export function createWorkspaceService(events?: EventEmitter): WorkspaceService {
  const eventEmitter = events || createEventEmitter();

  /** 工作区状态 */
  const state = ref<WorkspaceState>({
    initialized: false,
    rootPath: '',
    files: [],
    openedFiles: [],
  });

  /** 文件列表计算属性 */
  const files = computed(() => state.value.files);

  /** 是否已初始化 */
  const isInitialized = computed(() => state.value.initialized);

  /**
   * 在文件列表中查找文件
   */
  function findFileById(files: WorkspaceFile[], id: string): WorkspaceFile | undefined {
    for (const file of files) {
      if (file.id === id) return file;
      if (file.children) {
        const found = findFileById(file.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * 初始化工作区
   * 
   * TODO: 实际实现应该：
   * 1. 获取应用数据目录路径
   * 2. 检查工作区目录是否存在，不存在则创建
   * 3. 读取现有文件列表
   */
  async function initialize(): Promise<void> {
    if (state.value.initialized) return;

    try {
      // TODO: 通过 Electron IPC 获取应用数据目录
      // const appDataPath = await window.electronAPI?.app.getPath('userData');
      // state.value.rootPath = `${appDataPath}/workspace`;

      // 模拟初始化
      state.value.rootPath = '/chips-workspace';
      state.value.files = [];
      state.value.initialized = true;

      eventEmitter.emit('workspace:initialized', { rootPath: state.value.rootPath });
      console.log('[WorkspaceService] 工作区已初始化:', state.value.rootPath);
    } catch (error) {
      console.error('[WorkspaceService] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建卡片
   * @param name - 卡片名称
   * @param initialContent - 初始内容（包含基础卡片信息）
   * @param cardId - 可选的卡片 ID（用于与 cardStore 同步）
   */
  async function createCard(name: string, initialContent?: unknown, cardId?: string): Promise<WorkspaceFile> {
    // 如果提供了 cardId，使用它作为文件 ID（确保数据同步）
    const id = cardId || generateId();
    const timestamp = now();
    const fileName = `${name}.card`;

    const newCard: WorkspaceFile = {
      id,
      name: fileName,
      path: `/${fileName}`,
      type: 'card',
      createdAt: timestamp,
      modifiedAt: timestamp,
    };

    // 添加到文件列表
    state.value.files.push(newCard);

    // TODO: 实际实现应该通过内核创建 .card 文件
    // const cardData = {
    //   metadata: { name, createdAt: timestamp, modifiedAt: timestamp },
    //   structure: { basicCards: initialContent ? [initialContent] : [] },
    // };
    // await sdk.card.create(newCard.path, cardData);

    eventEmitter.emit('workspace:file-created', { file: newCard, content: initialContent });
    console.log('[WorkspaceService] 创建卡片:', newCard.name, 'ID:', id, '初始内容:', initialContent);

    return newCard;
  }

  /**
   * 创建箱子
   * @param name - 箱子名称
   * @param layoutType - 布局类型
   */
  async function createBox(name: string, layoutType?: string): Promise<WorkspaceFile> {
    const id = generateId();
    const timestamp = now();
    const fileName = `${name}.box`;

    const newBox: WorkspaceFile = {
      id,
      name: fileName,
      path: `/${fileName}`,
      type: 'box',
      createdAt: timestamp,
      modifiedAt: timestamp,
    };

    // 添加到文件列表
    state.value.files.push(newBox);

    // TODO: 实际实现应该通过内核创建 .box 文件
    eventEmitter.emit('workspace:file-created', { file: newBox, layoutType });
    console.log('[WorkspaceService] 创建箱子:', newBox.name, '布局类型:', layoutType);

    return newBox;
  }

  /**
   * 创建文件夹
   * @param name - 文件夹名称
   * @param parentPath - 父路径
   */
  async function createFolder(name: string, parentPath?: string): Promise<WorkspaceFile> {
    const id = generateId();
    const timestamp = now();

    const newFolder: WorkspaceFile = {
      id,
      name,
      path: parentPath ? `${parentPath}/${name}` : `/${name}`,
      type: 'folder',
      createdAt: timestamp,
      modifiedAt: timestamp,
      children: [],
      expanded: true,
    };

    // 添加到文件列表
    state.value.files.push(newFolder);

    eventEmitter.emit('workspace:file-created', { file: newFolder });
    console.log('[WorkspaceService] 创建文件夹:', newFolder.name);

    return newFolder;
  }

  /**
   * 获取文件
   * @param id - 文件 ID
   */
  function getFile(id: string): WorkspaceFile | undefined {
    return findFileById(state.value.files, id);
  }

  /**
   * 删除文件
   * @param id - 文件 ID
   */
  async function deleteFile(id: string): Promise<void> {
    const index = state.value.files.findIndex(f => f.id === id);
    if (index !== -1) {
      const file = state.value.files[index];
      state.value.files.splice(index, 1);

      // 同时从已打开文件中移除
      const openIndex = state.value.openedFiles.indexOf(id);
      if (openIndex !== -1) {
        state.value.openedFiles.splice(openIndex, 1);
      }

      eventEmitter.emit('workspace:file-deleted', { file });
      console.log('[WorkspaceService] 删除文件:', file?.name);
    }
  }

  /**
   * 重命名文件
   * @param id - 文件 ID
   * @param newName - 新名称
   */
  async function renameFile(id: string, newName: string): Promise<void> {
    const file = findFileById(state.value.files, id);
    if (file) {
      const oldName = file.name;
      file.name = newName;
      file.modifiedAt = now();

      eventEmitter.emit('workspace:file-renamed', { file, oldName, newName });
      console.log('[WorkspaceService] 重命名文件:', oldName, '->', newName);
    }
  }

  /**
   * 刷新文件列表
   */
  async function refresh(): Promise<void> {
    // TODO: 重新读取工作区目录
    eventEmitter.emit('workspace:refreshed', {});
    console.log('[WorkspaceService] 刷新文件列表');
  }

  /**
   * 获取已打开的文件
   */
  function getOpenedFiles(): WorkspaceFile[] {
    return state.value.openedFiles
      .map(id => findFileById(state.value.files, id))
      .filter((f): f is WorkspaceFile => f !== undefined);
  }

  /**
   * 打开文件
   * @param id - 文件 ID
   */
  function openFile(id: string): void {
    if (!state.value.openedFiles.includes(id)) {
      state.value.openedFiles.push(id);
      const file = findFileById(state.value.files, id);
      eventEmitter.emit('workspace:file-opened', { file });
      console.log('[WorkspaceService] 打开文件:', file?.name);
    }
  }

  /**
   * 关闭文件
   * @param id - 文件 ID
   */
  function closeFile(id: string): void {
    const index = state.value.openedFiles.indexOf(id);
    if (index !== -1) {
      state.value.openedFiles.splice(index, 1);
      const file = findFileById(state.value.files, id);
      eventEmitter.emit('workspace:file-closed', { file });
      console.log('[WorkspaceService] 关闭文件:', file?.name);
    }
  }

  return {
    state: state as Readonly<Ref<WorkspaceState>>,
    files,
    isInitialized,
    initialize,
    createCard,
    createBox,
    createFolder,
    getFile,
    deleteFile,
    renameFile,
    refresh,
    getOpenedFiles,
    openFile,
    closeFile,
  };
}

// 单例实例
let workspaceServiceInstance: WorkspaceService | null = null;

/**
 * 获取工作区服务实例
 */
export function useWorkspaceService(): WorkspaceService {
  if (!workspaceServiceInstance) {
    workspaceServiceInstance = createWorkspaceService();
  }
  return workspaceServiceInstance;
}

/**
 * 重置工作区服务（主要用于测试）
 */
export function resetWorkspaceService(): void {
  workspaceServiceInstance = null;
}
