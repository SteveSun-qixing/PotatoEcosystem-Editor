/**
 * ConversionService - 统一的转换服务层
 * 
 * 提供跨环境的统一转换 API，确保开发环境和生产环境行为一致
 * 
 * @description
 * 这个服务层封装了转换逻辑的调用方式：
 * - 开发环境（Web）：通过 HTTP API 调用开发服务器
 * - 生产环境（Electron）：通过 IPC 调用主进程
 * 
 * 无论哪种方式，底层都调用相同的：
 * - FileConverter（Foundation 枢纽）
 * - CardtoHTMLPlugin（HTML 转换插件）
 */

/**
 * 卡片文件数据（文件夹结构）
 */
export interface CardFileData {
  /** 文件相对路径 */
  path: string;
  /** 文件内容（Base64 编码） */
  content: string;
}

/**
 * 转换选项
 */
export interface ConvertHTMLOptions {
  /** 卡片 ID */
  cardId: string;
  /** 输出路径（相对于工作空间） */
  outputPath: string;
  /** 卡片文件数据（文件夹结构，优先使用） */
  cardFiles?: CardFileData[];
  /** 卡片路径（相对于工作空间，备用） */
  cardPath?: string;
  /** 是否包含资源文件 */
  includeAssets?: boolean;
  /** 主题 ID */
  themeId?: string;
}

/**
 * 转换结果
 */
export interface ConvertResult {
  /** 是否成功 */
  success: boolean;
  /** 输出路径 */
  path?: string;
  /** 错误信息 */
  error?: string;
  /** 统计信息 */
  stats?: {
    duration?: number;
    baseCardCount?: number;
    resourceCount?: number;
  };
  /** 警告列表 */
  warnings?: string[];
}

/**
 * PDF 转换选项
 */
export interface ConvertPDFOptions {
  /** HTML 内容 */
  html: string;
  /** 输出路径 */
  outputPath: string;
  /** 页面格式 */
  format?: 'A4' | 'Letter';
  /** 是否打印背景 */
  printBackground?: boolean;
}

/**
 * 图片转换选项
 */
export interface ConvertImageOptions {
  /** HTML 内容 */
  html: string;
  /** 输出路径 */
  outputPath: string;
  /** 图片宽度 */
  width?: number;
  /** 图片高度 */
  height?: number;
  /** 缩放比例 */
  scale?: number;
  /** 图片类型 */
  type?: 'png' | 'jpeg';
}

/**
 * 检测当前是否应该使用 Electron IPC
 * 
 * 注意：开发环境下即使在 Electron 中运行，也应该使用 HTTP API
 * 因为开发服务器提供了完整的转换功能，而 Electron IPC 仅在生产环境完整实现
 */
function shouldUseElectronIPC(): boolean {
  // 开发环境强制使用 HTTP API
  if (import.meta.env.DEV) {
    return false;
  }
  
  // 生产环境检查 Electron API 是否完整可用
  return typeof window !== 'undefined' && 
         typeof (window as any).electronAPI !== 'undefined' &&
         typeof (window as any).electronAPI.convertHTML === 'function';
}

/**
 * 开发服务器 URL
 */
const DEV_SERVER_URL = 'http://localhost:3456';

/**
 * 转换服务类
 * 
 * 提供统一的转换 API，自动选择正确的后端实现
 */
export class ConversionService {
  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    if (shouldUseElectronIPC()) {
      // Electron 生产环境总是可用
      return true;
    }
    
    // 开发环境检查开发服务器
    try {
      const response = await fetch(`${DEV_SERVER_URL}/status`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 转换卡片为 HTML
   * 
   * @param options - 转换选项
   * @returns 转换结果
   * 
   * @example
   * ```typescript
   * const result = await conversionService.convertToHTML({
   *   cardId: 'card-123',
   *   cardPath: 'TestWorkspace/我的卡片',
   *   outputPath: 'ExternalEnvironment/我的卡片-export',
   * });
   * ```
   */
  async convertToHTML(options: ConvertHTMLOptions): Promise<ConvertResult> {
    if (shouldUseElectronIPC()) {
      // Electron 生产环境 - 使用 IPC
      return await this._convertHTMLViaIPC(options);
    } else {
      // 开发环境 - 使用 HTTP API
      return await this._convertHTMLViaHTTP(options);
    }
  }

  /**
   * 转换 HTML 为 PDF
   */
  async convertToPDF(options: ConvertPDFOptions): Promise<ConvertResult> {
    if (shouldUseElectronIPC()) {
      return await this._convertPDFViaIPC(options);
    } else {
      return await this._convertPDFViaHTTP(options);
    }
  }

  /**
   * 转换 HTML 为图片
   */
  async convertToImage(options: ConvertImageOptions): Promise<ConvertResult> {
    if (shouldUseElectronIPC()) {
      return await this._convertImageViaIPC(options);
    } else {
      return await this._convertImageViaHTTP(options);
    }
  }

  // ========== HTTP 实现（开发环境） ==========

  private async _convertHTMLViaHTTP(options: ConvertHTMLOptions): Promise<ConvertResult> {
    try {
      // 构建请求体：优先使用卡片数据，否则使用路径
      const requestBody: Record<string, unknown> = {
        cardId: options.cardId,
        outputPath: options.outputPath,
        options: {
          includeAssets: options.includeAssets ?? true,
          themeId: options.themeId,
        },
      };

      if (options.cardFiles && options.cardFiles.length > 0) {
        // 直接传递卡片文件数据（编辑器常用方式）
        requestBody.cardFiles = options.cardFiles;
      } else if (options.cardPath) {
        // 传递卡片路径（服务器从文件系统读取）
        requestBody.cardPath = options.cardPath;
      } else {
        return {
          success: false,
          error: '必须提供 cardFiles 或 cardPath',
        };
      }

      const response = await fetch(`${DEV_SERVER_URL}/convert/html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'HTML 转换失败',
          warnings: data.warnings,
        };
      }

      return {
        success: true,
        path: data.path,
        stats: data.stats,
        warnings: data.warnings,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '转换请求失败',
      };
    }
  }

  private async _convertPDFViaHTTP(options: ConvertPDFOptions): Promise<ConvertResult> {
    try {
      const response = await fetch(`${DEV_SERVER_URL}/convert/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: options.html,
          outputPath: options.outputPath,
          options: {
            format: options.format || 'A4',
            printBackground: options.printBackground ?? true,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'PDF 转换失败' };
      }

      return { success: true, path: data.path };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '转换请求失败',
      };
    }
  }

  private async _convertImageViaHTTP(options: ConvertImageOptions): Promise<ConvertResult> {
    try {
      const response = await fetch(`${DEV_SERVER_URL}/convert/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: options.html,
          outputPath: options.outputPath,
          options: {
            width: options.width,
            height: options.height,
            scale: options.scale,
            type: options.type,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || '图片转换失败' };
      }

      return { success: true, path: data.path };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '转换请求失败',
      };
    }
  }

  // ========== IPC 实现（生产环境） ==========

  private async _convertHTMLViaIPC(options: ConvertHTMLOptions): Promise<ConvertResult> {
    try {
      // 调用 Electron 主进程的转换 API
      const electronAPI = (window as any).electronAPI;
      
      if (!electronAPI?.convertHTML) {
        throw new Error('Electron API 不可用');
      }

      const result = await electronAPI.convertHTML({
        cardId: options.cardId,
        cardFiles: options.cardFiles,
        cardPath: options.cardPath,
        outputPath: options.outputPath,
        includeAssets: options.includeAssets ?? true,
        themeId: options.themeId,
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC 调用失败',
      };
    }
  }

  private async _convertPDFViaIPC(options: ConvertPDFOptions): Promise<ConvertResult> {
    try {
      const electronAPI = (window as any).electronAPI;
      
      if (!electronAPI?.convertPDF) {
        throw new Error('Electron API 不可用');
      }

      return await electronAPI.convertPDF(options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC 调用失败',
      };
    }
  }

  private async _convertImageViaIPC(options: ConvertImageOptions): Promise<ConvertResult> {
    try {
      const electronAPI = (window as any).electronAPI;
      
      if (!electronAPI?.convertImage) {
        throw new Error('Electron API 不可用');
      }

      return await electronAPI.convertImage(options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC 调用失败',
      };
    }
  }
}

/**
 * 全局转换服务实例
 */
export const conversionService = new ConversionService();
