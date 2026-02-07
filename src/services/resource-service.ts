/**
 * 资源服务
 * @module services/resource-service
 * @description 统一封装资源管理器与转换能力（通过 Core 路由）
 */

import {
  ResourceManager,
  Logger,
  ConfigManager,
  EventBus,
  ConversionAPI,
  type ConversionResult,
  type HTMLConversionOptions,
  type ImageConversionOptions,
  type PDFConversionOptions,
} from '@chips/sdk';
import { getEditorConnector } from './sdk-service';
import { LOCAL_CORE_DEFAULTS } from './local-core-connector';

const logger = new Logger('EditorResourceService');
const config = new ConfigManager();
const eventBus = new EventBus();

let initialized = false;
let resourceManager: ResourceManager | null = null;
let conversionApi: ConversionAPI | null = null;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await config.initialize();
  const connector = await getEditorConnector();
  resourceManager = new ResourceManager(connector, logger, eventBus);
  conversionApi = new ConversionAPI(connector, logger, config);
  initialized = true;
}

function toAbsolutePath(path: string): string {
  if (path.startsWith(LOCAL_CORE_DEFAULTS.rootPath)) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${LOCAL_CORE_DEFAULTS.rootPath}${path}`;
  }
  return `${LOCAL_CORE_DEFAULTS.rootPath}/${path}`;
}

export const resourceService = {
  workspaceRoot: LOCAL_CORE_DEFAULTS.workspaceRoot,
  externalRoot: LOCAL_CORE_DEFAULTS.externalRoot,

  async readText(path: string): Promise<string> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request<string>({
      service: 'resource',
      method: 'read_to_string',
      payload: { path: toAbsolutePath(path) },
    });
    if (!response.success) {
      throw new Error(response.error || 'Read failed');
    }
    return response.data ?? '';
  },

  async readBinary(path: string): Promise<ArrayBuffer> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request<ArrayBuffer>({
      service: 'resource',
      method: 'read',
      payload: { path: toAbsolutePath(path) },
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Read failed');
    }
    return response.data;
  },

  async writeText(path: string, content: string): Promise<void> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request({
      service: 'resource',
      method: 'write',
      payload: { path: toAbsolutePath(path), content },
    });
    if (!response.success) {
      throw new Error(response.error || 'Write failed');
    }
  },

  async writeBinary(path: string, content: ArrayBuffer): Promise<void> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request({
      service: 'resource',
      method: 'write',
      payload: { path: toAbsolutePath(path), data: content },
    });
    if (!response.success) {
      throw new Error(response.error || 'Write failed');
    }
  },

  async ensureDir(path: string): Promise<void> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request({
      service: 'resource',
      method: 'mkdir',
      payload: { path: toAbsolutePath(path) },
    });
    if (!response.success && response.error) {
      throw new Error(response.error);
    }
  },

  async exists(path: string): Promise<boolean> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request<boolean>({
      service: 'resource',
      method: 'exists',
      payload: { path: toAbsolutePath(path) },
    });
    return response.success && response.data === true;
  },

  async delete(path: string): Promise<void> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request({
      service: 'resource',
      method: 'delete',
      payload: { path: toAbsolutePath(path) },
    });
    if (!response.success) {
      throw new Error(response.error || 'Delete failed');
    }
  },

  async list(path: string): Promise<string[]> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request<{ entries: string[] }>({
      service: 'resource',
      method: 'list',
      payload: { path: toAbsolutePath(path) },
    });
    if (!response.success || !response.data) {
      return [];
    }
    return response.data.entries ?? [];
  },

  async metadata(path: string): Promise<{
    path: string;
    exists: boolean;
    isDirectory: boolean;
    isFile: boolean;
    size?: number;
    modified?: string;
  }> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request<{
      path: string;
      exists: boolean;
      isDirectory: boolean;
      isFile: boolean;
      size?: number;
      modified?: string;
    }>({
      service: 'resource',
      method: 'metadata',
      payload: { path: toAbsolutePath(path) },
    });
    if (!response.success || !response.data) {
      return {
        path: toAbsolutePath(path),
        exists: false,
        isDirectory: false,
        isFile: false,
      };
    }
    return response.data;
  },

  async getCardFiles(cardPath: string): Promise<Array<{ path: string; content: string }>> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request<{ files: Array<{ path: string; content: string }> }>({
      service: 'resource',
      method: 'read_card_files',
      payload: { path: toAbsolutePath(cardPath) },
    });
    if (!response.success || !response.data) {
      return [];
    }
    return response.data.files ?? [];
  },

  async convertToHTML(sourcePath: string, outputPath: string, options?: HTMLConversionOptions): Promise<ConversionResult> {
    await ensureInitialized();
    if (!conversionApi) {
      throw new Error('Conversion API not ready');
    }
    return conversionApi.convertToHTML(
      { type: 'path', path: toAbsolutePath(sourcePath), fileType: 'card' },
      { ...options, outputPath: toAbsolutePath(outputPath) }
    );
  },

  async convertToPDF(sourcePath: string, outputPath: string, options?: PDFConversionOptions): Promise<ConversionResult> {
    await ensureInitialized();
    if (!conversionApi) {
      throw new Error('Conversion API not ready');
    }
    return conversionApi.convertToPDF(
      { type: 'path', path: toAbsolutePath(sourcePath), fileType: 'card' },
      { ...options, outputPath: toAbsolutePath(outputPath) }
    );
  },

  async convertToImage(sourcePath: string, outputPath: string, options?: ImageConversionOptions): Promise<ConversionResult> {
    await ensureInitialized();
    if (!conversionApi) {
      throw new Error('Conversion API not ready');
    }
    return conversionApi.convertToImage(
      { type: 'path', path: toAbsolutePath(sourcePath), fileType: 'card' },
      { ...options, outputPath: toAbsolutePath(outputPath) }
    );
  },

  async exportCard(cardId: string, outputPath: string): Promise<ConversionResult> {
    await ensureInitialized();
    if (!conversionApi) {
      throw new Error('Conversion API not ready');
    }
    return conversionApi.exportAsCard(cardId, { outputPath: toAbsolutePath(outputPath) });
  },

  async copy(sourcePath: string, destPath: string): Promise<void> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request({
      service: 'file',
      method: 'copy',
      payload: {
        sourcePath: toAbsolutePath(sourcePath),
        destPath: toAbsolutePath(destPath),
      },
    });
    if (!response.success) {
      throw new Error(response.error || 'Copy failed');
    }
  },

  async move(sourcePath: string, destPath: string): Promise<void> {
    await ensureInitialized();
    const response = await (await getEditorConnector()).request({
      service: 'file',
      method: 'move',
      payload: {
        sourcePath: toAbsolutePath(sourcePath),
        destPath: toAbsolutePath(destPath),
      },
    });
    if (!response.success) {
      throw new Error(response.error || 'Move failed');
    }
  },
};
