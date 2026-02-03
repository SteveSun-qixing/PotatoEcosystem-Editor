/**
 * 文件操作服务
 * @module core/file-service
 * @description 提供文件管理功能，包括创建、读取、删除、重命名等操作
 */

import type { EventEmitter } from './event-manager';

/**
 * 文件类型
 */
export type FileType = 'card' | 'box' | 'folder' | 'unknown';

/**
 * 文件信息接口
 */
export interface FileInfo {
  /** 文件 ID */
  id: string;
  /** 文件名 */
  name: string;
  /** 文件路径 */
  path: string;
  /** 文件类型 */
  type: FileType;
  /** 文件大小（字节） */
  size: number;
  /** 创建时间 */
  createdAt: string;
  /** 修改时间 */
  modifiedAt: string;
  /** 是否为目录 */
  isDirectory: boolean;
  /** 子文件（仅目录有效） */
  children?: FileInfo[];
  /** 是否展开（仅目录有效） */
  expanded?: boolean;
}

/**
 * 创建卡片选项
 */
export interface CreateCardOptions {
  /** 卡片名称 */
  name: string;
  /** 父目录路径 */
  parentPath: string;
  /** 卡片类型 */
  type?: string;
  /** 标签 */
  tags?: string[];
}

/**
 * 创建箱子选项
 */
export interface CreateBoxOptions {
  /** 箱子名称 */
  name: string;
  /** 父目录路径 */
  parentPath: string;
  /** 布局类型 */
  layout?: string;
}

/**
 * 创建文件夹选项
 */
export interface CreateFolderOptions {
  /** 文件夹名称 */
  name: string;
  /** 父目录路径 */
  parentPath: string;
}

/**
 * 文件操作结果
 */
export interface FileOperationResult {
  /** 操作是否成功 */
  success: boolean;
  /** 操作的文件信息 */
  file?: FileInfo;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
}

/**
 * 剪贴板操作类型
 */
export type ClipboardOperation = 'copy' | 'cut';

/**
 * 剪贴板数据
 */
export interface ClipboardData {
  /** 操作类型 */
  operation: ClipboardOperation;
  /** 文件路径列表 */
  files: string[];
}

/**
 * 生成简单的 ID
 */
function generateId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * 获取文件扩展名对应的文件类型
 */
export function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'card':
      return 'card';
    case 'box':
      return 'box';
    default:
      return 'unknown';
  }
}

/**
 * 检查文件名是否合法
 */
export function isValidFileName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }
  // 禁止的字符: / \ : * ? " < > |
  const invalidChars = /[/\\:*?"<>|]/;
  return !invalidChars.test(name);
}

/**
 * 文件服务类
 * 
 * 提供文件管理功能，所有操作通过事件系统通知其他模块。
 * 
 * @example
 * ```typescript
 * const fileService = new FileService(eventEmitter);
 * 
 * // 创建卡片
 * const result = await fileService.createCard({
 *   name: '新卡片',
 *   parentPath: '/workspace'
 * });
 * 
 * // 删除文件
 * await fileService.deleteFile('/workspace/old-card.card');
 * ```
 */
export class FileService {
  /** 事件发射器 */
  private events: EventEmitter;
  /** 当前工作目录 */
  private workingDirectory: string = '/workspace';
  /** 文件缓存 */
  private fileCache: Map<string, FileInfo> = new Map();
  /** 剪贴板数据 */
  private clipboard: ClipboardData | null = null;
  /** Mock 文件系统数据 */
  private mockFileSystem: FileInfo[] = [];

  /**
   * 创建文件服务
   * @param events - 事件发射器实例
   */
  constructor(events: EventEmitter) {
    this.events = events;
    this.initMockFileSystem();
  }

  /**
   * 初始化文件系统
   * 
   * 设计说明：
   * - 文件系统数据应该从真实的工作目录读取
   * - 需要用户选择工作目录或打开已有的卡片/箱子文件
   * - 这里初始化为空，等待用户操作
   * 
   * TODO: 通过内核的文件系统接口读取真实目录
   */
  private initMockFileSystem(): void {
    // 初始化为空，等待用户选择工作目录
    this.mockFileSystem = [];
    this.workingDirectory = '';
  }

  /**
   * 获取当前工作目录
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * 设置工作目录
   * @param path - 目录路径
   */
  setWorkingDirectory(path: string): void {
    this.workingDirectory = path;
    this.events.emit('file:working-directory-changed', { path });
  }

  /**
   * 获取文件列表
   * @param path - 目录路径，默认为工作目录
   * @returns 文件列表
   */
  async getFileList(path?: string): Promise<FileInfo[]> {
    const targetPath = path ?? this.workingDirectory;
    
    // 从 Mock 文件系统查找
    const findDirectory = (files: FileInfo[], searchPath: string): FileInfo | null => {
      for (const file of files) {
        if (file.path === searchPath) {
          return file;
        }
        if (file.children) {
          const found = findDirectory(file.children, searchPath);
          if (found) return found;
        }
      }
      return null;
    };

    // 如果是根目录，返回整个文件系统
    if (targetPath === '/workspace') {
      return this.mockFileSystem[0]?.children ?? [];
    }

    const dir = findDirectory(this.mockFileSystem, targetPath);
    return dir?.children ?? [];
  }

  /**
   * 获取完整文件树
   * @returns 文件树
   */
  async getFileTree(): Promise<FileInfo[]> {
    return this.mockFileSystem[0]?.children ?? [];
  }

  /**
   * 获取文件信息
   * @param path - 文件路径
   * @returns 文件信息
   */
  async getFileInfo(path: string): Promise<FileInfo | null> {
    const findFile = (files: FileInfo[], searchPath: string): FileInfo | null => {
      for (const file of files) {
        if (file.path === searchPath) {
          return file;
        }
        if (file.children) {
          const found = findFile(file.children, searchPath);
          if (found) return found;
        }
      }
      return null;
    };

    return findFile(this.mockFileSystem, path);
  }

  /**
   * 创建卡片
   * @param options - 创建选项
   * @returns 操作结果
   */
  async createCard(options: CreateCardOptions): Promise<FileOperationResult> {
    if (!isValidFileName(options.name)) {
      return {
        success: false,
        error: 'error.invalid_filename',
        errorCode: 'VAL-1001',
      };
    }

    const now = new Date().toISOString();
    const fileName = options.name.endsWith('.card') ? options.name : `${options.name}.card`;
    const filePath = `${options.parentPath}/${fileName}`;

    const newFile: FileInfo = {
      id: generateId(),
      name: fileName,
      path: filePath,
      type: 'card',
      size: 0,
      createdAt: now,
      modifiedAt: now,
      isDirectory: false,
    };

    // 添加到文件系统
    this.addFileToSystem(options.parentPath, newFile);

    this.events.emit('file:created', { file: newFile });
    return { success: true, file: newFile };
  }

  /**
   * 创建箱子
   * @param options - 创建选项
   * @returns 操作结果
   */
  async createBox(options: CreateBoxOptions): Promise<FileOperationResult> {
    if (!isValidFileName(options.name)) {
      return {
        success: false,
        error: 'error.invalid_filename',
        errorCode: 'VAL-1001',
      };
    }

    const now = new Date().toISOString();
    const fileName = options.name.endsWith('.box') ? options.name : `${options.name}.box`;
    const filePath = `${options.parentPath}/${fileName}`;

    const newFile: FileInfo = {
      id: generateId(),
      name: fileName,
      path: filePath,
      type: 'box',
      size: 0,
      createdAt: now,
      modifiedAt: now,
      isDirectory: false,
    };

    this.addFileToSystem(options.parentPath, newFile);

    this.events.emit('file:created', { file: newFile });
    return { success: true, file: newFile };
  }

  /**
   * 创建文件夹
   * @param options - 创建选项
   * @returns 操作结果
   */
  async createFolder(options: CreateFolderOptions): Promise<FileOperationResult> {
    if (!isValidFileName(options.name)) {
      return {
        success: false,
        error: 'error.invalid_filename',
        errorCode: 'VAL-1001',
      };
    }

    const now = new Date().toISOString();
    const filePath = `${options.parentPath}/${options.name}`;

    const newFolder: FileInfo = {
      id: generateId(),
      name: options.name,
      path: filePath,
      type: 'folder',
      size: 0,
      createdAt: now,
      modifiedAt: now,
      isDirectory: true,
      children: [],
      expanded: false,
    };

    this.addFileToSystem(options.parentPath, newFolder);

    this.events.emit('file:created', { file: newFolder });
    return { success: true, file: newFolder };
  }

  /**
   * 将文件添加到文件系统
   */
  private addFileToSystem(parentPath: string, file: FileInfo): void {
    const findAndAdd = (files: FileInfo[]): boolean => {
      for (const f of files) {
        if (f.path === parentPath && f.isDirectory) {
          if (!f.children) f.children = [];
          f.children.push(file);
          return true;
        }
        if (f.children && findAndAdd(f.children)) {
          return true;
        }
      }
      return false;
    };

    findAndAdd(this.mockFileSystem);
  }

  /**
   * 打开文件
   * @param path - 文件路径
   */
  async openFile(path: string): Promise<void> {
    const file = await this.getFileInfo(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    this.events.emit('file:open', { file });
  }

  /**
   * 删除文件
   * @param path - 文件路径
   * @returns 操作结果
   */
  async deleteFile(path: string): Promise<FileOperationResult> {
    const file = await this.getFileInfo(path);
    if (!file) {
      return {
        success: false,
        error: 'error.file_not_found',
        errorCode: 'RES-3001',
      };
    }

    // 从文件系统中移除
    const removeFromSystem = (files: FileInfo[], targetPath: string): boolean => {
      for (let i = 0; i < files.length; i++) {
        if (files[i]?.path === targetPath) {
          files.splice(i, 1);
          return true;
        }
        const children = files[i]?.children;
        if (children && removeFromSystem(children, targetPath)) {
          return true;
        }
      }
      return false;
    };

    removeFromSystem(this.mockFileSystem, path);
    this.fileCache.delete(path);

    this.events.emit('file:deleted', { path, file });
    return { success: true, file };
  }

  /**
   * 重命名文件
   * @param path - 文件路径
   * @param newName - 新名称
   * @returns 操作结果
   */
  async renameFile(path: string, newName: string): Promise<FileOperationResult> {
    if (!isValidFileName(newName)) {
      return {
        success: false,
        error: 'error.invalid_filename',
        errorCode: 'VAL-1001',
      };
    }

    const file = await this.getFileInfo(path);
    if (!file) {
      return {
        success: false,
        error: 'error.file_not_found',
        errorCode: 'RES-3001',
      };
    }

    const oldPath = file.path;
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    
    // 保留原有扩展名
    let finalName = newName;
    if (file.type === 'card' && !newName.endsWith('.card')) {
      finalName = `${newName}.card`;
    } else if (file.type === 'box' && !newName.endsWith('.box')) {
      finalName = `${newName}.box`;
    }

    file.name = finalName;
    file.path = `${parentPath}/${finalName}`;
    file.modifiedAt = new Date().toISOString();

    // 更新子文件路径（如果是文件夹）
    if (file.isDirectory && file.children) {
      this.updateChildrenPaths(file.children, oldPath, file.path);
    }

    this.fileCache.delete(oldPath);
    this.events.emit('file:renamed', { oldPath, newPath: file.path, file });
    
    return { success: true, file };
  }

  /**
   * 递归更新子文件路径
   */
  private updateChildrenPaths(children: FileInfo[], oldParentPath: string, newParentPath: string): void {
    for (const child of children) {
      child.path = child.path.replace(oldParentPath, newParentPath);
      if (child.children) {
        this.updateChildrenPaths(child.children, oldParentPath, newParentPath);
      }
    }
  }

  /**
   * 复制文件
   * @param sourcePath - 源文件路径
   * @param destPath - 目标路径
   * @returns 操作结果
   */
  async copyFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    const file = await this.getFileInfo(sourcePath);
    if (!file) {
      return {
        success: false,
        error: 'error.file_not_found',
        errorCode: 'RES-3001',
      };
    }

    const now = new Date().toISOString();
    const newFile: FileInfo = {
      ...file,
      id: generateId(),
      path: `${destPath}/${file.name}`,
      createdAt: now,
      modifiedAt: now,
    };

    if (file.isDirectory && file.children) {
      newFile.children = this.deepCopyChildren(file.children, newFile.path);
    }

    this.addFileToSystem(destPath, newFile);
    this.events.emit('file:copied', { source: sourcePath, dest: newFile.path, file: newFile });
    
    return { success: true, file: newFile };
  }

  /**
   * 深拷贝子文件
   */
  private deepCopyChildren(children: FileInfo[], newParentPath: string): FileInfo[] {
    return children.map((child) => {
      const newChild: FileInfo = {
        ...child,
        id: generateId(),
        path: `${newParentPath}/${child.name}`,
      };
      if (child.children) {
        newChild.children = this.deepCopyChildren(child.children, newChild.path);
      }
      return newChild;
    });
  }

  /**
   * 移动文件
   * @param sourcePath - 源文件路径
   * @param destPath - 目标路径
   * @returns 操作结果
   */
  async moveFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    const file = await this.getFileInfo(sourcePath);
    if (!file) {
      return {
        success: false,
        error: 'error.file_not_found',
        errorCode: 'RES-3001',
      };
    }

    // 先从原位置删除
    await this.deleteFile(sourcePath);

    // 更新路径
    const oldPath = file.path;
    file.path = `${destPath}/${file.name}`;
    file.modifiedAt = new Date().toISOString();

    // 更新子文件路径
    if (file.isDirectory && file.children) {
      this.updateChildrenPaths(file.children, oldPath, file.path);
    }

    // 添加到新位置
    this.addFileToSystem(destPath, file);
    this.events.emit('file:moved', { source: sourcePath, dest: file.path, file });
    
    return { success: true, file };
  }

  /**
   * 切换文件夹展开状态
   * @param path - 文件夹路径
   */
  async toggleFolderExpanded(path: string): Promise<void> {
    const file = await this.getFileInfo(path);
    if (file && file.isDirectory) {
      file.expanded = !file.expanded;
      this.events.emit('file:folder-toggled', { path, expanded: file.expanded });
    }
  }

  /**
   * 设置文件夹展开状态
   * @param path - 文件夹路径
   * @param expanded - 是否展开
   */
  async setFolderExpanded(path: string, expanded: boolean): Promise<void> {
    const file = await this.getFileInfo(path);
    if (file && file.isDirectory) {
      file.expanded = expanded;
      this.events.emit('file:folder-toggled', { path, expanded });
    }
  }

  /**
   * 复制到剪贴板
   * @param paths - 文件路径列表
   */
  copyToClipboard(paths: string[]): void {
    this.clipboard = {
      operation: 'copy',
      files: paths,
    };
    this.events.emit('file:clipboard-changed', { clipboard: this.clipboard });
  }

  /**
   * 剪切到剪贴板
   * @param paths - 文件路径列表
   */
  cutToClipboard(paths: string[]): void {
    this.clipboard = {
      operation: 'cut',
      files: paths,
    };
    this.events.emit('file:clipboard-changed', { clipboard: this.clipboard });
  }

  /**
   * 粘贴文件
   * @param destPath - 目标路径
   * @returns 操作结果列表
   */
  async paste(destPath: string): Promise<FileOperationResult[]> {
    if (!this.clipboard || this.clipboard.files.length === 0) {
      return [{ success: false, error: 'error.clipboard_empty' }];
    }

    const results: FileOperationResult[] = [];
    
    for (const sourcePath of this.clipboard.files) {
      if (this.clipboard.operation === 'copy') {
        results.push(await this.copyFile(sourcePath, destPath));
      } else {
        results.push(await this.moveFile(sourcePath, destPath));
      }
    }

    // 剪切操作后清空剪贴板
    if (this.clipboard.operation === 'cut') {
      this.clipboard = null;
    }

    return results;
  }

  /**
   * 获取剪贴板数据
   */
  getClipboard(): ClipboardData | null {
    return this.clipboard;
  }

  /**
   * 清空剪贴板
   */
  clearClipboard(): void {
    this.clipboard = null;
    this.events.emit('file:clipboard-changed', { clipboard: null });
  }

  /**
   * 搜索文件
   * @param query - 搜索关键词
   * @param options - 搜索选项
   * @returns 匹配的文件列表
   */
  async searchFiles(
    query: string,
    options: { type?: FileType; path?: string } = {}
  ): Promise<FileInfo[]> {
    if (!query.trim()) {
      return [];
    }

    const results: FileInfo[] = [];
    const lowerQuery = query.toLowerCase();

    const searchInFiles = (files: FileInfo[]): void => {
      for (const file of files) {
        const nameMatch = file.name.toLowerCase().includes(lowerQuery);
        const typeMatch = !options.type || file.type === options.type;
        const pathMatch = !options.path || file.path.startsWith(options.path);

        if (nameMatch && typeMatch && pathMatch) {
          results.push(file);
        }

        if (file.children) {
          searchInFiles(file.children);
        }
      }
    };

    searchInFiles(this.mockFileSystem);
    return results;
  }

  /**
   * 刷新文件列表
   */
  async refresh(): Promise<void> {
    this.fileCache.clear();
    this.events.emit('file:refreshed', {});
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.fileCache.clear();
    this.clipboard = null;
  }
}

/** 单例实例 */
let fileServiceInstance: FileService | null = null;

/**
 * 获取文件服务实例
 * @param events - 事件发射器（首次调用必须提供）
 * @returns 文件服务实例
 */
export function getFileService(events?: EventEmitter): FileService {
  if (!fileServiceInstance) {
    if (!events) {
      throw new Error('EventEmitter is required for first initialization');
    }
    fileServiceInstance = new FileService(events);
  }
  return fileServiceInstance;
}

/**
 * 重置文件服务（用于测试）
 */
export function resetFileService(): void {
  if (fileServiceInstance) {
    fileServiceInstance.destroy();
    fileServiceInstance = null;
  }
}
