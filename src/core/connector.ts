/**
 * SDK 连接器
 * @module core/connector
 * @description 负责与 Chips-SDK 的连接和通信
 */

import type { EventEmitter } from './event-manager';

/**
 * SDK 连接配置选项
 */
export interface SDKConnectorOptions {
  /** 连接地址（WebSocket URL） */
  url?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 重连延迟（毫秒） */
  reconnectDelay?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 调试模式 */
  debug?: boolean;
}

/**
 * Mock SDK 实例类型
 * 在真实 SDK 可用之前使用的模拟类型
 */
export interface MockSDKInstance {
  /** SDK 版本 */
  readonly version: string;
  /** 是否已初始化 */
  readonly initialized: boolean;
  /** 初始化 SDK */
  initialize: () => Promise<void>;
  /** 销毁 SDK */
  destroy: () => void;
  /** 订阅事件 */
  on: (event: string, handler: (data: unknown) => void) => string;
  /** 取消订阅 */
  off: (event: string, handlerId?: string) => void;
  /** 卡片 API */
  card: {
    create: (options: { name: string; type?: string }) => Promise<MockCard>;
    get: (idOrPath: string) => Promise<MockCard>;
    save: (path: string, card: MockCard) => Promise<void>;
    delete: (idOrPath: string) => Promise<void>;
  };
  /** 箱子 API */
  box: {
    create: (options: { name: string; layout?: string }) => Promise<MockBox>;
    get: (idOrPath: string) => Promise<MockBox>;
  };
}

/** Mock 卡片类型 */
export interface MockCard {
  id: string;
  metadata: {
    chip_standards_version: string;
    card_id: string;
    name: string;
    created_at: string;
    modified_at: string;
    theme?: string;
    tags?: Array<string | string[]>;
  };
  structure: {
    structure: Array<{ id: string; type: string }>;
    manifest: {
      card_count: number;
      resource_count: number;
      resources: Array<{ path: string; size: number; mime_type: string }>;
    };
  };
}

/** Mock 箱子类型 */
export interface MockBox {
  id: string;
  metadata: {
    chip_standards_version: string;
    box_id: string;
    name: string;
    created_at: string;
    modified_at: string;
    layout: string;
  };
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
 * 创建 Mock SDK 实例
 * 用于开发和测试阶段
 */
function createMockSDK(): MockSDKInstance {
  let initialized = false;
  const eventHandlers = new Map<string, Map<string, (data: unknown) => void>>();
  let handlerId = 0;

  return {
    version: '1.0.0',
    get initialized() {
      return initialized;
    },
    async initialize() {
      await new Promise((resolve) => setTimeout(resolve, 100));
      initialized = true;
    },
    destroy() {
      initialized = false;
      eventHandlers.clear();
    },
    on(event: string, handler: (data: unknown) => void): string {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Map());
      }
      const id = `handler-${++handlerId}`;
      eventHandlers.get(event)!.set(id, handler);
      return id;
    },
    off(event: string, id?: string) {
      if (id) {
        eventHandlers.get(event)?.delete(id);
      } else {
        eventHandlers.delete(event);
      }
    },
    card: {
      async create(options: { name: string; type?: string }): Promise<MockCard> {
        const id = generateId();
        const now = new Date().toISOString();
        return {
          id,
          metadata: {
            chip_standards_version: '1.0.0',
            card_id: id,
            name: options.name,
            created_at: now,
            modified_at: now,
            tags: [],
          },
          structure: {
            structure: [],
            manifest: {
              card_count: 0,
              resource_count: 0,
              resources: [],
            },
          },
        };
      },
      async get(idOrPath: string): Promise<MockCard> {
        const now = new Date().toISOString();
        return {
          id: idOrPath,
          metadata: {
            chip_standards_version: '1.0.0',
            card_id: idOrPath,
            name: `Card-${idOrPath}`,
            created_at: now,
            modified_at: now,
          },
          structure: {
            structure: [],
            manifest: {
              card_count: 0,
              resource_count: 0,
              resources: [],
            },
          },
        };
      },
      async save(path: string, card: MockCard): Promise<void> {
        // 开发阶段：通过文件服务器保存卡片
        const DEV_FILE_SERVER = 'http://localhost:3456';
        
        try {
          // 检查文件服务器是否可用
          const statusRes = await fetch(`${DEV_FILE_SERVER}/status`, { 
            signal: AbortSignal.timeout(2000) 
          });
          if (!statusRes.ok) {
            console.warn('[MockSDK] 开发文件服务器不可用，跳过文件保存');
            return;
          }
        } catch {
          console.warn('[MockSDK] 无法连接开发文件服务器，跳过文件保存');
          return;
        }
        
        // YAML 序列化辅助函数
        const toYaml = (obj: unknown, indent = 0): string => {
          const spaces = '  '.repeat(indent);
          if (obj === null || obj === undefined) return 'null';
          if (typeof obj === 'string') {
            if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || 
                obj.includes("'") || obj.includes('"') || obj.startsWith(' ') ||
                obj.endsWith(' ') || obj === '') {
              return `"${obj.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
            }
            return obj;
          }
          if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
          if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            return obj.map(item => {
              if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                const entries = Object.entries(item as Record<string, unknown>);
                if (entries.length === 0) return `${spaces}- {}`;
                const [firstKey, firstVal] = entries[0];
                const firstValue = typeof firstVal === 'object' && firstVal !== null
                  ? `\n${toYaml(firstVal, indent + 2)}`
                  : ` ${toYaml(firstVal, 0)}`;
                const firstLine = `${spaces}- ${firstKey}:${firstValue}`;
                const restLines = entries.slice(1).map(([key, value]) => {
                  if (typeof value === 'object' && value !== null) {
                    if (Array.isArray(value) && value.length === 0) return `${spaces}  ${key}: []`;
                    if (!Array.isArray(value) && Object.keys(value).length === 0) return `${spaces}  ${key}: {}`;
                    return `${spaces}  ${key}:\n${toYaml(value, indent + 2)}`;
                  }
                  return `${spaces}  ${key}: ${toYaml(value, 0)}`;
                });
                return [firstLine, ...restLines].join('\n');
              }
              return `${spaces}- ${toYaml(item, 0)}`;
            }).join('\n');
          }
          if (typeof obj === 'object') {
            const entries = Object.entries(obj as Record<string, unknown>);
            if (entries.length === 0) return '{}';
            return entries.map(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value) && value.length === 0) return `${spaces}${key}: []`;
                if (!Array.isArray(value) && Object.keys(value).length === 0) return `${spaces}${key}: {}`;
                return `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
              }
              return `${spaces}${key}: ${toYaml(value, indent)}`;
            }).join('\n');
          }
          return String(obj);
        };
        
        // 写入文件辅助函数
        const writeFile = async (filePath: string, content: string) => {
          await fetch(`${DEV_FILE_SERVER}/file/${encodeURIComponent(filePath)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          });
        };
        
        // 创建目录辅助函数
        const mkdir = async (dirPath: string) => {
          await fetch(`${DEV_FILE_SERVER}/mkdir/${encodeURIComponent(dirPath)}`, {
            method: 'POST',
          });
        };
        
        try {
          // 创建目录结构
          await mkdir(path);
          await mkdir(`${path}/.card`);
          await mkdir(`${path}/content`);
          await mkdir(`${path}/cardcover`);
          
          // 写入 metadata.yaml
          const metadata = {
            card_id: card.id,
            name: card.metadata.name,
            created_at: card.metadata.created_at,
            modified_at: card.metadata.modified_at,
            theme_id: card.metadata.theme || '薯片官方：默认主题',
            tags: card.metadata.tags || [],
            chips_standards_version: '1.0.0',
          };
          await writeFile(`${path}/.card/metadata.yaml`, toYaml(metadata));
          
          // 写入 structure.yaml
          const structure = {
            structure: card.structure.structure,
            manifest: card.structure.manifest,
          };
          await writeFile(`${path}/.card/structure.yaml`, toYaml(structure));
          
          // 写入 cover.html
          const escapedName = card.metadata.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const coverHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedName}</title>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
    .card-name { font-size: 18px; font-weight: 500; color: #333; }
  </style>
</head>
<body>
  <div class="card-name">${escapedName}</div>
</body>
</html>`;
          await writeFile(`${path}/.card/cover.html`, coverHtml);
          
          // 写入每个基础卡片的配置
          for (const baseCard of card.structure.structure) {
            const basicCardConfig = {
              type: baseCard.type,
              data: {},
            };
            await writeFile(`${path}/content/${baseCard.id}.yaml`, toYaml(basicCardConfig));
          }
          
          console.log(`[MockSDK] 卡片已保存: ${path}`);
        } catch (e) {
          console.error('[MockSDK] 保存卡片失败:', e);
        }
      },
      async delete(_idOrPath: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
    },
    box: {
      async create(options: { name: string; layout?: string }): Promise<MockBox> {
        const id = generateId();
        const now = new Date().toISOString();
        return {
          id,
          metadata: {
            chip_standards_version: '1.0.0',
            box_id: id,
            name: options.name,
            created_at: now,
            modified_at: now,
            layout: options.layout ?? 'grid',
          },
        };
      },
      async get(idOrPath: string): Promise<MockBox> {
        const now = new Date().toISOString();
        return {
          id: idOrPath,
          metadata: {
            chip_standards_version: '1.0.0',
            box_id: idOrPath,
            name: `Box-${idOrPath}`,
            created_at: now,
            modified_at: now,
            layout: 'grid',
          },
        };
      },
    },
  };
}

/**
 * SDK 连接器
 * 
 * 负责与 Chips-SDK 的连接和通信管理
 * 
 * @example
 * ```typescript
 * const events = createEventEmitter();
 * const connector = new SDKConnector(events, { debug: true });
 * 
 * await connector.connect();
 * const sdk = connector.getSDK();
 * 
 * // 使用 SDK API
 * const card = await sdk.card.create({ name: '新卡片' });
 * ```
 */
export class SDKConnector {
  /** SDK 实例 */
  private sdk: MockSDKInstance | null = null;
  /** 事件发射器 */
  private events: EventEmitter;
  /** 连接状态 */
  private isConnected = false;
  /** 连接配置 */
  private options: SDKConnectorOptions;
  /** SDK 事件订阅 ID 列表 */
  private sdkSubscriptions: string[] = [];

  /**
   * 创建 SDK 连接器
   * 
   * @param events - 事件发射器实例
   * @param options - 连接配置选项
   */
  constructor(events: EventEmitter, options: SDKConnectorOptions = {}) {
    this.events = events;
    this.options = {
      timeout: 30000,
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      debug: false,
      ...options,
    };
  }

  /**
   * 初始化并连接 SDK
   * 
   * @throws {Error} 如果已连接或连接失败
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new Error('SDK already connected');
    }

    try {
      this.log('Connecting to SDK...');
      
      // 创建 Mock SDK（后续替换为真实 SDK）
      this.sdk = createMockSDK();
      await this.sdk.initialize();
      
      this.isConnected = true;
      this.setupEventForwarding();
      this.events.emit('connector:connected', {});
      
      this.log('SDK connected successfully');
    } catch (error) {
      this.events.emit('connector:error', { error });
      throw error;
    }
  }

  /**
   * 断开 SDK 连接
   */
  disconnect(): void {
    if (this.sdk) {
      // 清理事件订阅
      this.sdkSubscriptions.forEach((id) => {
        this.sdk?.off('*', id);
      });
      this.sdkSubscriptions = [];
      
      this.sdk.destroy();
      this.sdk = null;
      this.isConnected = false;
      this.events.emit('connector:disconnected', {});
      
      this.log('SDK disconnected');
    }
  }

  /**
   * 获取 SDK 实例
   * 
   * @returns SDK 实例
   * @throws {Error} 如果未连接
   */
  getSDK(): MockSDKInstance {
    if (!this.sdk || !this.isConnected) {
      throw new Error('SDK not connected');
    }
    return this.sdk;
  }

  /**
   * 检查是否已连接
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 设置事件转发
   * 将 SDK 事件转发到编辑器事件系统
   */
  private setupEventForwarding(): void {
    if (!this.sdk) return;

    // 需要转发的 SDK 事件列表
    const eventsToForward = [
      'card:created',
      'card:saved',
      'card:updated',
      'card:deleted',
      'box:created',
      'box:saved',
      'box:updated',
      'theme:changed',
      'plugin:enabled',
      'plugin:disabled',
      'resource:loaded',
      'resource:error',
    ];

    eventsToForward.forEach((eventType) => {
      const id = this.sdk!.on(eventType, (data) => {
        this.events.emit(`sdk:${eventType}`, data);
      });
      this.sdkSubscriptions.push(id);
    });
  }

  /**
   * 日志输出
   */
  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log('[SDKConnector]', ...args);
    }
  }
}

/**
 * 创建 SDK 连接器
 * 
 * @param events - 事件发射器实例
 * @param options - 连接配置选项
 * @returns SDK 连接器实例
 */
export function createConnector(
  events: EventEmitter,
  options?: SDKConnectorOptions
): SDKConnector {
  return new SDKConnector(events, options);
}

// 类型导出
export type { EventEmitter };
