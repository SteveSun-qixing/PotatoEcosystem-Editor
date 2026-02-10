/**
 * LocalCoreConnector
 * @module services/local-core-connector
 * @description 开发阶段使用的本地 Core 连接器，
 * 通过 dev-file-server 模拟 resource/file/conversion 路由。
 */

import {
  CoreConnector,
  type RequestParams,
  type ResponseData,
  ConnectionError,
} from '@chips/sdk';
import yaml from 'yaml';
import { generateScopedId } from '@/utils';
import { t } from '@/services/i18n-service';
import { stringifyBaseCardContentYaml } from '@/core/base-card-content-loader';

export interface LocalCoreConnectorOptions {
  /** dev 文件服务器地址 */
  baseUrl?: string;
  /** 生态根目录 */
  rootPath?: string;
  /** 工作区根目录 */
  workspaceRoot?: string;
  /** 外部环境根目录 */
  externalRoot?: string;
}

type EventHandler = (data: unknown) => void;

interface ResourceServiceMock {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  list(path: string): Promise<string[]>;
  metadata(path: string): Promise<unknown>;
  getCardFiles(path: string): Promise<Array<{ path: string; content: string }>>;
  copy(sourcePath: string, destPath: string): Promise<void>;
  move(sourcePath: string, destPath: string): Promise<void>;
}

const DEFAULT_ROOT = '/ProductFinishedProductTestingSpace';
const DEFAULT_BASE_URL = 'http://localhost:3456';
const CONFIG_STORAGE_KEY = 'chips.editor.local-config';

function getResourceServiceMock(): ResourceServiceMock | null {
  const maybeMock = (
    globalThis as typeof globalThis & {
      __RESOURCE_SERVICE_MOCK__?: ResourceServiceMock;
    }
  ).__RESOURCE_SERVICE_MOCK__;
  return maybeMock ?? null;
}

function textToArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * MIME 类型 → SDK ResourceType 映射
 * 与 Chips-SDK ResourceManager 中的 MIME_TYPE_MAP 保持一致
 */
const MIME_TO_RESOURCE_TYPE: Record<string, string> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  'image/x-icon': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/flac': 'audio',
  'font/woff': 'font',
  'font/woff2': 'font',
  'font/ttf': 'font',
  'application/pdf': 'document',
};

export class LocalCoreConnector extends CoreConnector {
  private _localConnected = false;
  private _baseUrl: string;
  private _rootPath: string;
  private _workspaceRoot: string;
  private _externalRoot: string;
  private _localClientId: string;
  private _localEventHandlers = new Map<string, Set<EventHandler>>();
  private _configStore = new Map<string, unknown>();

  constructor(options: LocalCoreConnectorOptions = {}) {
    super({ url: 'ws://local-bridge' });
    this._baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this._rootPath = options.rootPath ?? DEFAULT_ROOT;
    this._workspaceRoot = options.workspaceRoot ?? `${this._rootPath}/TestWorkspace`;
    this._externalRoot = options.externalRoot ?? `${this._rootPath}/ExternalEnvironment`;
    this._localClientId = generateScopedId('local');
    this.loadConfigStore();
  }

  async connect(): Promise<void> {
    this._localConnected = true;
  }

  disconnect(): void {
    this._localConnected = false;
  }

  get isConnected(): boolean {
    return this._localConnected;
  }

  get isConnecting(): boolean {
    return false;
  }

  get clientId(): string {
    return this._localClientId;
  }

  get pendingCount(): number {
    return 0;
  }

  publish(eventType: string, data: Record<string, unknown>): void {
    const handlers = this._localEventHandlers.get(eventType);
    if (!handlers) return;
    handlers.forEach((handler) => handler(data));
  }

  on(eventType: string, handler: EventHandler): void {
    const handlers = this._localEventHandlers.get(eventType);
    if (handlers) {
      handlers.add(handler);
      return;
    }
    this._localEventHandlers.set(eventType, new Set([handler]));
  }

  off(eventType: string, handler?: EventHandler): void {
    if (!handler) {
      this._localEventHandlers.delete(eventType);
      return;
    }
    this._localEventHandlers.get(eventType)?.delete(handler);
  }

  once(eventType: string, handler: EventHandler): void {
    const wrapped: EventHandler = (data) => {
      this.off(eventType, wrapped);
      handler(data);
    };
    this.on(eventType, wrapped);
  }

  async request<T = unknown>(params: RequestParams): Promise<ResponseData<T>> {
    if (!this._localConnected) {
      throw new ConnectionError('LocalCoreConnector not connected');
    }

    const resourceMock = getResourceServiceMock();
    if (resourceMock) {
      if (params.service === 'resource') {
        return (await this.handleResourceMock(resourceMock, params.method, params.payload)) as ResponseData<T>;
      }
      if (params.service === 'file') {
        return (await this.handleFileMock(resourceMock, params.method, params.payload)) as ResponseData<T>;
      }
    }

    switch (params.service) {
      case 'resource':
        return (await this.handleResource(params.method, params.payload)) as ResponseData<T>;
      case 'resource.fetch':
        return (await this.handleResourceFetch(params.payload)) as ResponseData<T>;
      case 'resource.write':
        return (await this.handleResourceWrite(params.payload)) as ResponseData<T>;
      case 'file':
        return (await this.handleFile(params.method, params.payload)) as ResponseData<T>;
      case 'parser':
        return (await this.handleParser(params.method, params.payload)) as ResponseData<T>;
      case 'conversion':
        return (await this.handleConversion(params.payload)) as ResponseData<T>;
      case 'card.pack':
        return (await this.handleCardPack(params.payload)) as ResponseData<T>;
      case 'config':
        return this.handleConfig(params.method, params.payload) as ResponseData<T>;
      default:
        return {
          success: false,
          error: `Unsupported service: ${params.service}.${params.method}`,
        } as ResponseData<T>;
    }
  }

  private loadConfigStore(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const [key, value] of Object.entries(parsed)) {
        this._configStore.set(key, value);
      }
    } catch {
      this._configStore.clear();
    }
  }

  private persistConfigStore(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      const data = Object.fromEntries(this._configStore.entries());
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 忽略本地持久化失败，保持内存数据可用
    }
  }

  private handleConfig(method: string, payload: Record<string, unknown>): ResponseData {
    const key = typeof payload.key === 'string' ? payload.key : '';

    switch (method) {
      case 'get': {
        if (!key) {
          return { success: false, error: 'Missing config key' };
        }
        const value = this._configStore.has(key)
          ? this._configStore.get(key)
          : payload.default;
        return { success: true, data: value };
      }
      case 'set': {
        if (!key) {
          return { success: false, error: 'Missing config key' };
        }
        this._configStore.set(key, payload.value);
        this.persistConfigStore();
        return { success: true };
      }
      case 'delete': {
        if (!key) {
          return { success: false, error: 'Missing config key' };
        }
        this._configStore.delete(key);
        this.persistConfigStore();
        return { success: true };
      }
      case 'list': {
        const prefix = typeof payload.prefix === 'string' ? payload.prefix : '';
        const entries: Array<{ key: string; value: unknown }> = [];
        for (const [entryKey, value] of this._configStore.entries()) {
          if (!prefix || entryKey.startsWith(prefix)) {
            entries.push({ key: entryKey, value });
          }
        }
        return { success: true, data: { entries } };
      }
      default:
        return { success: false, error: `Unsupported config method: ${method}` };
    }
  }

  private async handleResourceMock(
    mock: ResourceServiceMock,
    method: string,
    payload?: Record<string, unknown>
  ): Promise<ResponseData<unknown>> {
    const path = (payload?.path as string) ?? '';

    try {
      switch (method) {
        case 'read_to_string': {
          const content = await mock.readText(path);
          return { success: true, data: content };
        }
        case 'read': {
          const content = await mock.readText(path);
          return { success: true, data: textToArrayBuffer(content) };
        }
        case 'write': {
          if (typeof payload?.content === 'string') {
            await mock.writeText(path, payload.content);
          } else if (payload?.data instanceof ArrayBuffer) {
            const text = new TextDecoder().decode(new Uint8Array(payload.data));
            await mock.writeText(path, text);
          } else {
            await mock.writeText(path, '');
          }
          return { success: true };
        }
        case 'mkdir': {
          await mock.ensureDir(path);
          return { success: true };
        }
        case 'exists': {
          const exists = await mock.exists(path);
          return { success: true, data: exists };
        }
        case 'delete': {
          await mock.delete(path);
          return { success: true };
        }
        case 'list': {
          const entries = await mock.list(path);
          return { success: true, data: { entries } };
        }
        case 'metadata': {
          const data = await mock.metadata(path);
          return { success: true, data };
        }
        case 'read_card_files': {
          const files = await mock.getCardFiles(path);
          return { success: true, data: { files } };
        }
        default:
          return { success: false, error: `Unsupported resource method: ${method}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async handleFileMock(
    mock: ResourceServiceMock,
    method: string,
    payload?: Record<string, unknown>
  ): Promise<ResponseData<unknown>> {
    const sourcePath = payload?.sourcePath as string | undefined;
    const destPath = payload?.destPath as string | undefined;

    try {
      switch (method) {
        case 'copy': {
          if (!sourcePath || !destPath) {
            return { success: false, error: 'Missing source or destination path' };
          }
          await mock.copy(sourcePath, destPath);
          return { success: true };
        }
        case 'move': {
          if (!sourcePath || !destPath) {
            return { success: false, error: 'Missing source or destination path' };
          }
          await mock.move(sourcePath, destPath);
          return { success: true };
        }
        default:
          return { success: false, error: `Unsupported file method: ${method}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private toRelativePath(path: string): string {
    if (path.startsWith(`${this._rootPath}/`)) {
      return path.slice(this._rootPath.length + 1);
    }
    if (path.startsWith('/')) {
      return path.slice(1);
    }
    return path;
  }

  private async readDevFile(relativePath: string): Promise<{ type: string; content?: string; files?: string[] } | null> {
    const response = await fetch(`${this._baseUrl}/file/${encodeURIComponent(relativePath)}`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  }

  private async writeDevFile(relativePath: string, content: string | ArrayBuffer): Promise<boolean> {
    const payload: Record<string, unknown> = {};
    if (typeof content === 'string') {
      payload.content = content;
    } else {
      payload.binary = true;
      payload.content = arrayBufferToBase64(content);
    }

    const response = await fetch(`${this._baseUrl}/file/${encodeURIComponent(relativePath)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  }

  private async ensureDevDir(relativePath: string): Promise<boolean> {
    const response = await fetch(`${this._baseUrl}/mkdir/${encodeURIComponent(relativePath)}`, {
      method: 'POST',
    });
    return response.ok;
  }

  private async existsDevPath(relativePath: string): Promise<{ exists: boolean; isDirectory: boolean; isFile: boolean }> {
    const response = await fetch(`${this._baseUrl}/exists/${encodeURIComponent(relativePath)}`);
    if (!response.ok) {
      return { exists: false, isDirectory: false, isFile: false };
    }
    return response.json();
  }

  private async readDirectoryFiles(relativePath: string): Promise<Map<string, ArrayBuffer>> {
    const response = await fetch(`${this._baseUrl}/card-files/${encodeURIComponent(relativePath)}`);
    if (!response.ok) {
      throw new Error(`Failed to read directory files: ${relativePath}`);
    }
    const data = await response.json();
    const files = new Map<string, ArrayBuffer>();
    for (const file of data.files ?? []) {
      if (!file.path || !file.content) continue;
      files.set(file.path, base64ToArrayBuffer(file.content));
    }
    return files;
  }

  private normalizePath(value: string): string {
    return value.replace(/\\/g, '/').replace(/\/+/g, '/');
  }

  private async isCardFolder(relativePath: string, cardId: string): Promise<boolean> {
    const metadata = await this.readDevFile(`${relativePath}/.card/metadata.yaml`);
    if (!metadata || metadata.type !== 'file') {
      return false;
    }
    try {
      const parsed = yaml.parse(metadata.content ?? '');
      return parsed?.card_id === cardId;
    } catch {
      return false;
    }
  }

  private async findCardFolderById(baseRelativePath: string, cardId: string): Promise<string | null> {
    const result = await this.readDevFile(baseRelativePath);
    if (!result || result.type !== 'directory') {
      return null;
    }

    for (const entry of result.files ?? []) {
      if (!entry || entry.startsWith('.')) continue;
      const entryPath = this.normalizePath(`${baseRelativePath}/${entry}`);
      const entryInfo = await this.readDevFile(entryPath);
      if (!entryInfo || entryInfo.type !== 'directory') {
        continue;
      }

      if (await this.isCardFolder(entryPath, cardId)) {
        return entryPath;
      }

      const nested = await this.findCardFolderById(entryPath, cardId);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  private async resolveCardFolderPath(cardId: string): Promise<string | null> {
    const trimmed = cardId.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = this.normalizePath(trimmed);
    const hasPathSegments = normalized.includes('/');
    if (hasPathSegments) {
      const absolute = normalized.startsWith(this._rootPath)
        ? normalized
        : normalized.startsWith('/')
          ? `${this._rootPath}${normalized}`
          : `${this._rootPath}/${normalized}`;
      const info = await this.existsDevPath(this.toRelativePath(absolute));
      if (info.exists && info.isDirectory) {
        return absolute;
      }
    }

    const idWithoutExtension = normalized.replace(/\.card$/i, '');
    const candidates = new Set<string>([
      `${this._workspaceRoot}/${idWithoutExtension}`,
      `${this._workspaceRoot}/${idWithoutExtension}.card`,
    ]);

    for (const candidate of candidates) {
      const relative = this.toRelativePath(candidate);
      const info = await this.existsDevPath(relative);
      if (!info.exists || !info.isDirectory) {
        continue;
      }
      if (await this.isCardFolder(relative, idWithoutExtension)) {
        return candidate;
      }
    }

    const workspaceRelative = this.toRelativePath(this._workspaceRoot);
    const matchedRelative = await this.findCardFolderById(workspaceRelative, idWithoutExtension);
    if (matchedRelative) {
      return this.normalizePath(`${this._rootPath}/${matchedRelative}`);
    }

    return null;
  }

  /**
   * 解析 chips:// URI 为本地文件系统的相对路径
   *
   * 支持的 URI 格式：
   *   - chips://card/{cardPath}/{resourceRelativePath}
   *   - chips://local/{absolutePath}
   *   - chips://network/{url} （不做本地解析，直接返回 URL）
   *
   * @returns { type, path } 其中 type 为 'card'|'local'|'network'|'unknown'
   */
  private parseChipsUri(uri: string): { type: string; path: string; cardPath?: string; resourcePath?: string } {
    if (!uri.startsWith('chips://')) {
      return { type: 'unknown', path: uri };
    }

    const withoutProtocol = uri.slice('chips://'.length);

    if (withoutProtocol.startsWith('network/')) {
      // chips://network/{url} — 网络资源，直接返回 URL
      return { type: 'network', path: withoutProtocol.slice('network/'.length) };
    }

    if (withoutProtocol.startsWith('local/')) {
      // chips://local/{absolutePath} — 本地绝对路径
      return { type: 'local', path: withoutProtocol.slice('local/'.length) };
    }

    if (withoutProtocol.startsWith('card/')) {
      // chips://card/{cardPath}/{resourcePath}
      // cardPath 可以是卡片 ID 或卡片文件夹路径，resourcePath 是资源相对路径
      const rest = withoutProtocol.slice('card/'.length);
      // 找到 .card/ 后面的部分作为 resourcePath
      // 例如：chips://card/TestWorkspace/lP3j41BXpy/photo.jpg
      //   → cardPath=TestWorkspace/lP3j41BXpy, resourcePath=photo.jpg
      // 或：chips://card/TestWorkspace/mycard.card/photo.jpg
      //   → cardPath=TestWorkspace/mycard.card, resourcePath=photo.jpg

      // 策略：查找最后一个 .card 目录标记来拆分，如果没有则使用第一段+第二段作为 cardPath
      const cardExtIndex = rest.indexOf('.card/');
      if (cardExtIndex !== -1) {
        const cardPath = rest.slice(0, cardExtIndex + '.card'.length);
        const resourcePath = rest.slice(cardExtIndex + '.card/'.length);
        return { type: 'card', path: `${cardPath}/${resourcePath}`, cardPath, resourcePath };
      }

      // 没有 .card 扩展名的情况：假设格式为 workspace/cardFolder/resourcePath
      // 取前两段作为 cardPath
      const parts = rest.split('/');
      if (parts.length >= 3) {
        const cardPath = parts.slice(0, 2).join('/');
        const resourcePath = parts.slice(2).join('/');
        return { type: 'card', path: `${cardPath}/${resourcePath}`, cardPath, resourcePath };
      }

      // 只有两段的话（如 cardId/resource）
      if (parts.length === 2) {
        return { type: 'card', path: rest, cardPath: parts[0], resourcePath: parts[1] };
      }

      return { type: 'card', path: rest };
    }

    return { type: 'unknown', path: withoutProtocol };
  }

  /**
   * 从 dev-file-server 读取二进制文件并返回 base64 内容和 mimeType
   */
  private async readDevFileBinary(relativePath: string): Promise<{ content: string; mimeType: string; size: number } | null> {
    // 对路径中的每段分别编码，保留 / 作为路径分隔符
    const encodedPath = relativePath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    const url = `${this._baseUrl}/file/${encodedPath}?binary=true`;
    console.warn('[LocalCoreConnector] readDevFileBinary URL:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('[LocalCoreConnector] readDevFileBinary failed:', response.status, response.statusText, 'for', url);
      return null;
    }
    const data = await response.json();
    console.warn('[LocalCoreConnector] readDevFileBinary response keys:', Object.keys(data), 'binary:', data.binary, 'mimeType:', data.mimeType);
    if (data.type !== 'file' || !data.binary) {
      console.warn('[LocalCoreConnector] readDevFileBinary: unexpected response format', { type: data.type, binary: data.binary });
      return null;
    }
    return {
      content: data.content as string,
      mimeType: data.mimeType as string,
      size: data.size as number,
    };
  }

  /**
   * 处理 resource.fetch 服务请求
   *
   * 根据薯片协议规范，所有资源访问都通过 chips:// URI 进行。
   * 此方法解析 URI，读取对应的本地文件，并根据 options.as 返回：
   *   - 'url': 返回 blob URL（浏览器可直接用于 <img src>）
   *   - 'blob': 返回 Blob 对象
   *   - 'arraybuffer': 返回 ArrayBuffer
   */
  private async handleResourceFetch(payload: Record<string, unknown>): Promise<ResponseData> {
    const uri = String(payload.uri ?? '');
    const options = (payload.options ?? {}) as Record<string, unknown>;
    const asType = String(options.as ?? 'url');

    console.warn('[LocalCoreConnector] handleResourceFetch:', uri, 'as:', asType);

    if (!uri) {
      return { success: false, error: 'Missing uri parameter' };
    }

    const parsed = this.parseChipsUri(uri);
    console.warn('[LocalCoreConnector] Parsed URI:', JSON.stringify(parsed));

    // 网络资源：直接返回 URL
    if (parsed.type === 'network') {
      return { success: true, data: { url: parsed.path } };
    }

    // 解析为本地文件系统路径
    let relativePath: string;
    if (parsed.type === 'card') {
      relativePath = parsed.path;
    } else if (parsed.type === 'local') {
      relativePath = this.toRelativePath(parsed.path);
    } else {
      // 未知类型：尝试直接作为路径使用
      relativePath = this.toRelativePath(parsed.path);
    }

    console.warn('[LocalCoreConnector] Reading binary file:', relativePath);

    try {
      // 读取二进制文件
      const binaryData = await this.readDevFileBinary(relativePath);
      if (!binaryData) {
        return { success: false, error: `Resource not found: ${uri}` };
      }

      if (asType === 'url') {
        // 将 base64 转换为 Blob，然后创建 ObjectURL
        const arrayBuffer = base64ToArrayBuffer(binaryData.content);
        const blob = new Blob([arrayBuffer], { type: binaryData.mimeType });
        const blobUrl = URL.createObjectURL(blob);
        return { success: true, data: { url: blobUrl, mimeType: binaryData.mimeType, size: binaryData.size } };
      } else if (asType === 'blob') {
        const arrayBuffer = base64ToArrayBuffer(binaryData.content);
        const blob = new Blob([arrayBuffer], { type: binaryData.mimeType });
        return { success: true, data: { blob, mimeType: binaryData.mimeType, size: binaryData.size } };
      } else if (asType === 'arraybuffer') {
        const arrayBuffer = base64ToArrayBuffer(binaryData.content);
        return { success: true, data: { data: arrayBuffer, mimeType: binaryData.mimeType, size: binaryData.size } };
      }

      // 默认返回 URL
      const arrayBuffer = base64ToArrayBuffer(binaryData.content);
      const blob = new Blob([arrayBuffer], { type: binaryData.mimeType });
      const blobUrl = URL.createObjectURL(blob);
      return { success: true, data: { url: blobUrl, mimeType: binaryData.mimeType, size: binaryData.size } };
    } catch (error) {
      return { success: false, error: `Failed to fetch resource: ${uri} - ${String(error)}` };
    }
  }

  /**
   * 处理 resource.write 服务请求
   *
   * 通过 chips:// URI 将资源写入对应位置。
   * payload 中应包含：
   *   - uri: chips:// URI
   *   - data: ArrayBuffer | string (二进制数据或文本内容)
   */
  private async handleResourceWrite(payload: Record<string, unknown>): Promise<ResponseData> {
    const uri = String(payload.uri ?? '');
    const data = payload.data;

    if (!uri) {
      return { success: false, error: 'Missing uri parameter' };
    }

    if (!data) {
      return { success: false, error: 'Missing data parameter' };
    }

    const parsed = this.parseChipsUri(uri);

    // 只支持 card 和 local 类型的写入
    if (parsed.type === 'network') {
      return { success: false, error: 'Cannot write to network resources' };
    }

    let relativePath: string;
    if (parsed.type === 'card') {
      relativePath = parsed.path;
    } else if (parsed.type === 'local') {
      relativePath = this.toRelativePath(parsed.path);
    } else {
      relativePath = this.toRelativePath(parsed.path);
    }

    try {
      // 确保父目录存在
      const dirPath = relativePath.split('/').slice(0, -1).join('/');
      if (dirPath) {
        await this.ensureDevDir(dirPath);
      }

      const content = data instanceof ArrayBuffer
        ? data
        : typeof data === 'string'
          ? data
          : JSON.stringify(data);

      const ok = await this.writeDevFile(relativePath, content);
      return { success: ok, error: ok ? undefined : `Failed to write resource: ${uri}` };
    } catch (error) {
      return { success: false, error: `Failed to write resource: ${uri} - ${String(error)}` };
    }
  }

  private async handleResource(method: string, payload: Record<string, unknown>): Promise<ResponseData> {
    const path = String(payload.path ?? '');
    const relativePath = this.toRelativePath(path);

    switch (method) {
      case 'load': {
        // SDK ResourceManager.load() 使用此方法
        // 返回格式: { data: ArrayBuffer, info: ResourceInfo }
        const binaryData = await this.readDevFileBinary(relativePath);
        if (!binaryData) {
          return { success: false, error: `Resource not found: ${path}` };
        }
        const arrayBuffer = base64ToArrayBuffer(binaryData.content);
        return {
          success: true,
          data: {
            data: arrayBuffer,
            info: {
              id: relativePath,
              name: relativePath.split('/').pop() || '',
              path: relativePath,
              type: MIME_TO_RESOURCE_TYPE[binaryData.mimeType] || 'other',
              mimeType: binaryData.mimeType,
              size: binaryData.size,
            },
          },
        };
      }
      case 'upload': {
        // SDK ResourceManager.upload() 使用此方法
        const uploadData = payload.data;
        const fileName = String(payload.name ?? '');
        const mimeType = String(payload.mimeType ?? 'application/octet-stream');
        const fileSize = Number(payload.size ?? 0);
        if (!uploadData) {
          return { success: false, error: 'Missing upload data' };
        }
        // 确保目录存在
        const dirPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
        if (dirPath) {
          await this.ensureDevDir(dirPath);
        }
        const ok = await this.writeDevFile(relativePath, uploadData instanceof ArrayBuffer ? uploadData : String(uploadData));
        if (!ok) {
          return { success: false, error: `Failed to upload resource: ${path}` };
        }
        return {
          success: true,
          data: {
            id: relativePath,
            name: fileName || relativePath.split('/').pop() || '',
            path: relativePath,
            type: MIME_TO_RESOURCE_TYPE[mimeType] || 'other',
            mimeType,
            size: fileSize,
          },
        };
      }
      case 'info': {
        // SDK ResourceManager.getInfo() 使用此方法
        const existsInfo = await this.existsDevPath(relativePath);
        if (!existsInfo.exists || !existsInfo.isFile) {
          return { success: false, error: `Resource not found: ${path}` };
        }
        // 尝试获取 MIME 类型（通过文件扩展名推断）
        const ext = relativePath.split('.').pop()?.toLowerCase() || '';
        const extMimeMap: Record<string, string> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
          gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
          bmp: 'image/bmp', ico: 'image/x-icon',
          mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg',
          mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
          pdf: 'application/pdf',
          woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf',
        };
        const inferredMime = extMimeMap[ext] || 'application/octet-stream';
        return {
          success: true,
          data: {
            id: relativePath,
            name: relativePath.split('/').pop() || '',
            path: relativePath,
            type: MIME_TO_RESOURCE_TYPE[inferredMime] || 'other',
            mimeType: inferredMime,
            size: 0, // 开发环境无法准确获取大小，SDK 缓存时会使用实际 Blob 大小
          },
        };
      }
      case 'mkdir': {
        const ok = await this.ensureDevDir(relativePath);
        return { success: ok, error: ok ? undefined : 'Create directory failed' };
      }
      case 'read': {
        const result = await this.readDevFile(relativePath);
        if (!result || result.type !== 'file') {
          return { success: false, error: 'Resource not found' };
        }
        return { success: true, data: textToArrayBuffer(result.content ?? '') };
      }
      case 'read_to_string': {
        const result = await this.readDevFile(relativePath);
        if (!result || result.type !== 'file') {
          return { success: false, error: 'Resource not found' };
        }
        return { success: true, data: result.content ?? '' };
      }
      case 'write': {
        const content = payload.data ?? payload.content ?? '';
        const data = content instanceof ArrayBuffer
          ? content
          : typeof content === 'string'
            ? content
            : JSON.stringify(content);
        const ok = await this.writeDevFile(relativePath, data);
        return { success: ok, error: ok ? undefined : 'Write failed' };
      }
      case 'exists': {
        const info = await this.existsDevPath(relativePath);
        return { success: true, data: info.exists };
      }
      case 'metadata': {
        const info = await this.existsDevPath(relativePath);
        return {
          success: true,
          data: {
            path,
            exists: info.exists,
            isDirectory: info.isDirectory,
            isFile: info.isFile,
            size: 0,
            modified: new Date().toISOString(),
          },
        };
      }
      case 'delete': {
        const response = await fetch(`${this._baseUrl}/file/${encodeURIComponent(relativePath)}`, {
          method: 'DELETE',
        });
        return { success: response.ok, error: response.ok ? undefined : 'Delete failed' };
      }
      case 'list': {
        const result = await this.readDevFile(relativePath);
        if (!result || result.type !== 'directory') {
          return { success: false, error: 'Directory not found' };
        }
        return { success: true, data: { entries: result.files ?? [] } };
      }
      case 'read_card_files': {
        try {
          const files = await this.readDirectoryFiles(relativePath);
          const list = Array.from(files.entries()).map(([filePath, buffer]) => ({
            path: filePath,
            content: arrayBufferToBase64(buffer),
          }));
          return { success: true, data: { files: list } };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Read card files failed' };
        }
      }
      default:
        return { success: false, error: `Unsupported resource method: ${method}` };
    }
  }

  private async handleFile(method: string, payload: Record<string, unknown>): Promise<ResponseData> {
    const path = String(payload.path ?? '');
    const relativePath = this.toRelativePath(path);

    if (method === 'exists') {
      const info = await this.existsDevPath(relativePath);
      return { success: true, data: info.exists };
    }

    if (method === 'info') {
      const name = relativePath.split('/').pop() ?? '';
      const extension = name.includes('.') ? name.split('.').pop() ?? '' : '';
      return {
        success: true,
        data: {
          path,
          name,
          extension,
          size: 0,
          modified: new Date().toISOString(),
          type: extension || 'unknown',
        },
      };
    }

    if (method === 'read') {
      const fileMap = await this.readDirectoryFiles(relativePath);
      const isBox = relativePath.endsWith('.box');
      const metadataPath = isBox ? '.box/metadata.yaml' : '.card/metadata.yaml';
      const structurePath = isBox ? '.box/structure.yaml' : '.card/structure.yaml';
      const contentPath = isBox ? '.box/content.yaml' : undefined;
      const coverPath = isBox ? undefined : '.card/cover.html';

      const metadataBuffer = fileMap.get(metadataPath);
      const structureBuffer = fileMap.get(structurePath);
      const contentBuffer = contentPath ? fileMap.get(contentPath) : undefined;
      const coverBuffer = coverPath ? fileMap.get(coverPath) : undefined;

      if (!metadataBuffer || !structureBuffer) {
        return { success: false, error: 'Missing metadata or structure' };
      }

      const resources = new Map<string, ArrayBuffer>();
      for (const [filePath, buffer] of fileMap.entries()) {
        if (filePath === metadataPath || filePath === structurePath) continue;
        if (contentPath && filePath === contentPath) continue;
        if (coverPath && filePath === coverPath) continue;
        resources.set(filePath, buffer);
      }

      return {
        success: true,
        data: {
          metadata: new TextDecoder().decode(metadataBuffer),
          structure: new TextDecoder().decode(structureBuffer),
          content: contentBuffer ? new TextDecoder().decode(contentBuffer) : undefined,
          cover: coverBuffer ? new TextDecoder().decode(coverBuffer) : undefined,
          resources,
        },
      };
    }

    if (method === 'write') {
      const data = payload.data as Record<string, unknown> | undefined;
      if (!data) {
        return { success: false, error: 'Missing data' };
      }

      const isBox = relativePath.endsWith('.box');
      const metadataDir = isBox ? '.box' : '.card';
      const contentDir = isBox ? '.box' : 'content';

      await this.ensureDevDir(relativePath);
      await this.ensureDevDir(`${relativePath}/${metadataDir}`);
      if (!isBox) {
        await this.ensureDevDir(`${relativePath}/${contentDir}`);
        await this.ensureDevDir(`${relativePath}/cardcover`);
      }

      if (data.metadata) {
        const metadataYaml = yaml.stringify(data.metadata as Record<string, unknown>);
        await this.writeDevFile(`${relativePath}/${metadataDir}/metadata.yaml`, metadataYaml);
      }
      if (data.structure) {
        const structureYaml = yaml.stringify(data.structure as Record<string, unknown>);
        await this.writeDevFile(`${relativePath}/${metadataDir}/structure.yaml`, structureYaml);
      }
      if (isBox && data.content) {
        const contentYaml = yaml.stringify(data.content as Record<string, unknown>);
        await this.writeDevFile(`${relativePath}/${metadataDir}/content.yaml`, contentYaml);
      }

      // 写入基础卡片内容文件 content/{id}.yaml
      if (!isBox && data.baseCardContents) {
        const baseCardContents = data.baseCardContents as Record<string, Record<string, unknown>>;
        for (const [baseCardId, contentData] of Object.entries(baseCardContents)) {
          if (!baseCardId || !contentData) continue;
          const rawType = typeof contentData.type === 'string' ? contentData.type : '';
          const rawData = isPlainObject(contentData.data) ? contentData.data : null;
          if (!rawType || !rawData) {
            throw new Error(`Invalid baseCard content format for ${baseCardId}, expected { type, data }`);
          }
          const contentYaml = stringifyBaseCardContentYaml(rawType, rawData);
          const contentFilePath = `${relativePath}/${contentDir}/${baseCardId}.yaml`;
          await this.writeDevFile(contentFilePath, contentYaml);
        }
      }

      if (!isBox) {
        const coverPath = `${relativePath}/.card/cover.html`;
        const coverExists = await this.existsDevPath(this.toRelativePath(coverPath));
        if (!coverExists.exists) {
          const name = (data.metadata as { name?: string })?.name ?? t('common.untitled_card');
          const escaped = String(name).replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const coverHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escaped}</title>
</head>
<body>
  <div>${escaped}</div>
</body>
</html>`;
          await this.writeDevFile(coverPath, coverHtml);
        }
      }

      const resources = data.resources as Record<string, unknown> | undefined;
      if (resources) {
        for (const [resourcePath, value] of Object.entries(resources)) {
          if (!resourcePath) continue;
          const targetPath = `${relativePath}/${resourcePath}`;
          if (typeof value === 'string') {
            await this.writeDevFile(targetPath, value);
          } else if (value instanceof ArrayBuffer) {
            await this.writeDevFile(targetPath, value);
          } else if (value instanceof Uint8Array) {
            const buffer = value.buffer;
            const normalizedBuffer =
              buffer instanceof ArrayBuffer
                ? buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
                : value.slice().buffer;
            await this.writeDevFile(targetPath, normalizedBuffer);
          }
        }
      }

      return { success: true };
    }

    if (method === 'delete') {
      const response = await fetch(`${this._baseUrl}/file/${encodeURIComponent(relativePath)}`, {
        method: 'DELETE',
      });
      return { success: response.ok, error: response.ok ? undefined : 'Delete failed' };
    }

    if (method === 'validate') {
      const readResult = await this.handleFile('read', payload);
      if (!readResult.success) {
        return { success: true, data: { valid: false, fileType: 'unknown', errors: [], warnings: [] } };
      }
      return { success: true, data: { valid: true, fileType: 'card', errors: [], warnings: [] } };
    }

    if (method === 'copy' || method === 'move') {
      const sourcePath = String(payload.sourcePath ?? '');
      const destPath = String(payload.destPath ?? '');
      const relativeSource = this.toRelativePath(sourcePath);
      const relativeDest = this.toRelativePath(destPath);
      const exists = await this.existsDevPath(relativeSource);
      if (!exists.exists) {
        return { success: false, error: 'Source not found' };
      }

      const fileData = await this.readDirectoryFiles(relativeSource);
      await this.ensureDevDir(relativeDest);
      for (const [filePath, buffer] of fileData.entries()) {
        await this.writeDevFile(`${relativeDest}/${filePath}`, buffer);
      }

      if (method === 'move') {
        await fetch(`${this._baseUrl}/file/${encodeURIComponent(relativeSource)}`, { method: 'DELETE' });
      }

      return { success: true };
    }

    return { success: false, error: `Unsupported file method: ${method}` };
  }

  private async handleParser(method: string, payload: Record<string, unknown>): Promise<ResponseData> {
    if (method === 'parseYaml') {
      const content = String(payload.content ?? '');
      return { success: true, data: yaml.parse(content) };
    }
    return { success: false, error: `Unsupported parser method: ${method}` };
  }

  private async handleConversion(payload: Record<string, unknown>): Promise<ResponseData> {
    const source = payload.source as { type: string; path?: string; data?: Uint8Array } | undefined;
    const targetType = String(payload.targetType ?? '');
    const options = (payload.options ?? {}) as Record<string, unknown>;
    const outputPath = String(options.outputPath ?? '');

    if (!source || !outputPath) {
      return { success: false, error: 'Missing source or outputPath' };
    }

    const relativeOutput = this.toRelativePath(outputPath);

    if (targetType === 'html') {
      const cardPath = source.type === 'path' ? this.toRelativePath(String(source.path ?? '')) : undefined;
      if (!cardPath) {
        return { success: false, error: 'Unsupported source for html conversion' };
      }

      const response = await fetch(`${this._baseUrl}/convert/html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: source.path,
          cardPath,
          outputPath: relativeOutput,
          options: {
            includeAssets: options.includeAssets !== false,
            themeId: options.themeId,
            appearanceProfileId: options.appearanceProfileId,
            appearanceOverrides: options.appearanceOverrides,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.error || 'HTML conversion failed' };
      }
      const data = await response.json();
      return {
        success: true,
        data: {
          success: true,
          outputPath: outputPath,
          stats: data.stats,
          warnings: data.warnings,
        },
      };
    }

    if (targetType === 'pdf' || targetType === 'image') {
      const tempDir = `${this._externalRoot}/.tmp-conversion/${Date.now()}`;
      const htmlResult = await this.handleConversion({
        source,
        targetType: 'html',
        options: { ...options, outputPath: tempDir },
      });

      if (!htmlResult.success) {
        return htmlResult;
      }

      const htmlFilePath = `${tempDir}/index.html`;
      const htmlRelativePath = this.toRelativePath(htmlFilePath);

      try {
        const response = await fetch(`${this._baseUrl}/convert/${targetType}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            htmlPath: htmlRelativePath,
            outputPath: relativeOutput,
            options: {
              format: options.pageFormat || options.format,
              orientation: options.orientation,
              margin: options.margin,
              printBackground: options.printBackground,
              width: options.width,
              height: options.height,
              scale: options.scale,
              waitTime: options.waitTime,
              type: options.format,
              appearanceProfileId: options.appearanceProfileId,
              appearanceOverrides: options.appearanceOverrides,
            },
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { success: false, error: err.error || 'Conversion failed' };
        }
        await response.json();
        return {
          success: true,
          data: {
            success: true,
            outputPath: outputPath,
          },
        };
      } finally {
        const tempRelative = this.toRelativePath(tempDir);
        await fetch(`${this._baseUrl}/file/${encodeURIComponent(tempRelative)}`, {
          method: 'DELETE',
        }).catch(() => undefined);
      }
    }

    return { success: false, error: `Unsupported targetType: ${targetType}` };
  }

  private async handleCardPack(payload: Record<string, unknown>): Promise<ResponseData> {
    const cardId = String(payload.cardId ?? '');
    const outputPath = String(payload.outputPath ?? '');

    if (!cardId || !outputPath) {
      return { success: false, error: 'Missing cardId or outputPath' };
    }

    const resolvedCardPath = await this.resolveCardFolderPath(cardId);
    if (!resolvedCardPath) {
      return { success: false, error: `Card folder not found: ${cardId}` };
    }
    const response = await fetch(`${this._baseUrl}/card/pack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardPath: this.toRelativePath(resolvedCardPath),
        outputPath: this.toRelativePath(outputPath),
        options: payload.options ?? {},
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error || 'Card pack failed' };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        success: true,
        outputPath,
        stats: data.stats,
        warnings: data.warnings,
      },
    };
  }
}

export const LOCAL_CORE_DEFAULTS = {
  rootPath: DEFAULT_ROOT,
  workspaceRoot: `${DEFAULT_ROOT}/TestWorkspace`,
  externalRoot: `${DEFAULT_ROOT}/ExternalEnvironment`,
  baseUrl: DEFAULT_BASE_URL,
};
