/**
 * 开发阶段文件服务器
 * @description 为 Web 版本提供真实的文件系统访问能力
 * 
 * 使用方法：
 * 1. 在另一个终端运行: npm run dev:fs
 * 2. 然后启动编辑器: npm run dev
 * 
 * 生产环境不需要此服务器，桌面端通过 Electron 直接访问文件系统
 * 
 * 转换 API 通过 Foundation 的 FileConverter 调用各转换插件：
 * - /convert/html -> FileConverter -> CardtoHTMLPlugin
 * - /convert/pdf  -> 直接使用 Puppeteer（后续可迁移到 CardtoPDFPlugin）
 * - /convert/image -> 直接使用 Puppeteer（后续可迁移到 CardtoImagePlugin）
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { exec } from 'child_process';

// 导入 Foundation 模块（通过 pnpm workspace 链接）
import { fileConverter, zipProcessor, cardPacker } from '@chips/foundation';

// 导入 CardtoHTMLPlugin（通过 pnpm workspace 链接）
import {
  CardtoHTMLPlugin,
  resolveConversionAppearance,
} from '@chips/cardto-html-plugin';

// 注册 HTML 转换插件
const htmlPlugin = new CardtoHTMLPlugin();
fileConverter.registerConverter(htmlPlugin);

// ES Module 兼容性处理
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3456;
const PROJECT_ROOT = path.resolve(__dirname, '../..');
// 扩大工作空间范围，支持 TestWorkspace 和 ExternalEnvironment
const WORKSPACE_ROOT = path.join(PROJECT_ROOT, 'ProductFinishedProductTestingSpace');

// 确保目录存在
const ensureDirs = [
  WORKSPACE_ROOT,
  path.join(WORKSPACE_ROOT, 'TestWorkspace'),
  path.join(WORKSPACE_ROOT, 'ExternalEnvironment'),
];
for (const dir of ensureDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

const server = http.createServer(async (req, res) => {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  
  try {
    // 读取文件（JSON 格式响应）
    // 支持 ?binary=true 参数以 base64 格式返回二进制文件内容
    if (req.method === 'GET' && url.pathname.startsWith('/file/')) {
      const relativePath = decodeURIComponent(url.pathname.replace('/file/', ''));
      const fullPath = path.join(WORKSPACE_ROOT, relativePath);
      const isBinaryMode = url.searchParams.get('binary') === 'true';
      
      if (!fullPath.startsWith(WORKSPACE_ROOT)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
      }

      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const files = fs.readdirSync(fullPath);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ type: 'directory', files }));
        } else if (isBinaryMode) {
          // 二进制模式：以 base64 编码返回文件内容
          const buffer = fs.readFileSync(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
            '.bmp': 'image/bmp', '.ico': 'image/x-icon',
            '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg',
            '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
            '.pdf': 'application/pdf',
            '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
          };
          const mimeType = mimeTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'file',
            binary: true,
            content: buffer.toString('base64'),
            mimeType,
            size: buffer.length,
          }));
        } else {
          const content = fs.readFileSync(fullPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ type: 'file', content }));
        }
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'File not found' }));
      }
      return;
    }

    // 写入文件（文本或二进制）
    if (req.method === 'PUT' && url.pathname.startsWith('/file/')) {
      const relativePath = decodeURIComponent(url.pathname.replace('/file/', ''));
      const fullPath = path.join(WORKSPACE_ROOT, relativePath);
      
      if (!fullPath.startsWith(WORKSPACE_ROOT)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
      }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const dir = path.dirname(fullPath);
          
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // 支持二进制内容（base64 编码）
          if (data.binary && data.content) {
            const buffer = Buffer.from(data.content, 'base64');
            fs.writeFileSync(fullPath, buffer);
            console.log(`[DEV-FS] Written (binary): ${relativePath} (${buffer.length} bytes)`);
          } else if (data.content !== undefined) {
            fs.writeFileSync(fullPath, data.content, 'utf-8');
            console.log(`[DEV-FS] Written: ${relativePath}`);
          } else {
            throw new Error('Missing content field');
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, path: relativePath }));
        } catch (e) {
          console.error(`[DEV-FS] Write error: ${e}`);
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return;
    }

    // 创建目录
    if (req.method === 'POST' && url.pathname.startsWith('/mkdir/')) {
      const relativePath = decodeURIComponent(url.pathname.replace('/mkdir/', ''));
      const fullPath = path.join(WORKSPACE_ROOT, relativePath);
      
      if (!fullPath.startsWith(WORKSPACE_ROOT)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
      }

      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`[DEV-FS] Created directory: ${relativePath}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, path: relativePath }));
      return;
    }

    // 删除文件/目录
    if (req.method === 'DELETE' && url.pathname.startsWith('/file/')) {
      const relativePath = decodeURIComponent(url.pathname.replace('/file/', ''));
      const fullPath = path.join(WORKSPACE_ROOT, relativePath);
      
      if (!fullPath.startsWith(WORKSPACE_ROOT)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
      }

      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        console.log(`[DEV-FS] Deleted: ${relativePath}`);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // 列出工作空间
    if (req.method === 'GET' && url.pathname === '/workspace') {
      const listDir = (dir: string, prefix = ''): any[] => {
        const items: any[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          
          const itemPath = path.join(prefix, entry.name);
          
          if (entry.isDirectory()) {
            items.push({
              name: entry.name,
              path: itemPath,
              type: 'directory',
              children: listDir(path.join(dir, entry.name), itemPath)
            });
          } else {
            items.push({
              name: entry.name,
              path: itemPath,
              type: 'file'
            });
          }
        }
        
        return items;
      };

      const tree = listDir(WORKSPACE_ROOT);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ root: WORKSPACE_ROOT, files: tree }));
      return;
    }

    // 读取卡片目录的所有文件（包括 .card 隐藏目录）
    if (req.method === 'GET' && url.pathname.startsWith('/card-files/')) {
      const relativePath = decodeURIComponent(url.pathname.substring('/card-files/'.length));
      const fullPath = path.join(WORKSPACE_ROOT, relativePath);
      
      // 安全检查
      if (!fullPath.startsWith(WORKSPACE_ROOT)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
      }
      
      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Directory not found' }));
        return;
      }
      
      // 递归读取所有文件（包括隐藏目录）
      const files: Array<{ path: string; content: string }> = [];
      
      const readDirRecursive = (dir: string, prefix: string = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(dir, entry.name);
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
          
          if (entry.isDirectory()) {
            readDirRecursive(entryPath, relativePath);
          } else {
            try {
              const content = fs.readFileSync(entryPath);
              files.push({
                path: relativePath,
                content: content.toString('base64'),
              });
            } catch (e) {
              console.error(`[DEV-FS] 读取文件失败: ${entryPath}`, e);
            }
          }
        }
      };
      
      readDirRecursive(fullPath);
      console.log(`[DEV-FS] 读取卡片目录 ${relativePath}: ${files.length} 个文件`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files }));
      return;
    }

    // 打包卡片为 .card 文件
    if (req.method === 'POST' && url.pathname === '/card/pack') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { cardPath, outputPath, options = {} } = data;

          if (!cardPath || !outputPath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing cardPath or outputPath' }));
            return;
          }

          const fullCardPath = path.join(WORKSPACE_ROOT, cardPath);
          const fullOutputPath = path.join(WORKSPACE_ROOT, outputPath);

          if (!fullCardPath.startsWith(WORKSPACE_ROOT) || !fullOutputPath.startsWith(WORKSPACE_ROOT)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: 'Access denied' }));
            return;
          }

          const outputDir = path.dirname(fullOutputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const packResult = await cardPacker.pack(fullCardPath, fullOutputPath, {
            compress: options.compress ?? false,
            resourceMode: options.includeResources === false ? 'shell' : 'full',
            validateStructure: options.validateStructure ?? true,
            generateChecksum: options.generateChecksum ?? true,
          });

          if (!packResult.success) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: packResult.error?.message || 'Card pack failed' }));
            return;
          }

          console.log(`[DEV-FS] Card packed: ${outputPath}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              outputPath,
              stats: packResult.stats,
              warnings: packResult.warnings,
            })
          );
        } catch (e) {
          console.error(`[DEV-FS] Card pack error: ${e}`);
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return;
    }

    // 转换 HTML 到 PDF
    if (req.method === 'POST' && url.pathname === '/convert/pdf') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { html, htmlPath, outputPath, options = {} } = data;
          
          if ((!html && !htmlPath) || !outputPath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing html/htmlPath or outputPath' }));
            return;
          }
          
          const fullOutputPath = path.join(WORKSPACE_ROOT, outputPath);
          if (!fullOutputPath.startsWith(WORKSPACE_ROOT)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: 'Access denied' }));
            return;
          }
          
          const appearance = resolveConversionAppearance({
            profileId: options.appearanceProfileId,
            overrides: options.appearanceOverrides,
          });

          // 确保输出目录存在
          const outputDir = path.dirname(fullOutputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          // 解析页面入口（优先使用 htmlPath，确保相对资源路径可用）
          let pageUrl = '';
          let tempHtmlPath: string | null = null;
          if (typeof htmlPath === 'string' && htmlPath.length > 0) {
            const fullHtmlPath = path.join(WORKSPACE_ROOT, htmlPath);
            if (!fullHtmlPath.startsWith(WORKSPACE_ROOT)) {
              res.writeHead(403);
              res.end(JSON.stringify({ error: 'Access denied: htmlPath' }));
              return;
            }
            if (!fs.existsSync(fullHtmlPath) || !fs.statSync(fullHtmlPath).isFile()) {
              res.writeHead(404);
              res.end(JSON.stringify({ error: `HTML file not found: ${htmlPath}` }));
              return;
            }
            pageUrl = pathToFileURL(fullHtmlPath).href;
            console.log(`[DEV-FS] 使用现有 HTML 文件转换 PDF: ${htmlPath}`);
          } else {
            tempHtmlPath = path.join(outputDir, `.temp-${Date.now()}.html`);
            fs.writeFileSync(tempHtmlPath, html, 'utf-8');
            pageUrl = pathToFileURL(tempHtmlPath).href;
            console.log(`[DEV-FS] Created temp HTML: ${tempHtmlPath}`);
          }
          
          try {
            // 使用 Puppeteer 转换（动态导入）
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.default.launch({ 
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setViewport({
              width: appearance.pdf.viewportWidthPx,
              height: appearance.pdf.viewportHeightPx,
            });
            
            // 加载 HTML 文件
            await page.goto(pageUrl, { waitUntil: 'networkidle0' });
            // 等待图片加载完成，避免导出灰图
            await page.evaluate(async () => {
              const images = Array.from(document.images ?? []);
              await Promise.all(
                images.map((img) => {
                  if (img.complete) return Promise.resolve();
                  return new Promise<void>((resolve) => {
                    img.addEventListener('load', () => resolve(), { once: true });
                    img.addEventListener('error', () => resolve(), { once: true });
                  });
                })
              );
            });
            
            // 生成 PDF
            await page.pdf({
              path: fullOutputPath,
              format: String(options.format || appearance.pdf.pageFormat).toUpperCase(),
              landscape: (options.orientation || appearance.pdf.orientation) === 'landscape',
              printBackground: options.printBackground ?? appearance.pdf.printBackground,
              margin: options.margin || appearance.pdf.margin,
            });
            
            await browser.close();
            console.log(`[DEV-FS] PDF exported: ${outputPath}`);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, path: outputPath }));
          } finally {
            // 删除临时文件
            if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
              fs.unlinkSync(tempHtmlPath);
              console.log(`[DEV-FS] Cleaned temp HTML: ${tempHtmlPath}`);
            }
          }
        } catch (e) {
          console.error(`[DEV-FS] PDF convert error: ${e}`);
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return;
    }
    
    // 转换 HTML 到 Image
    if (req.method === 'POST' && url.pathname === '/convert/image') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { html, htmlPath, outputPath, options = {} } = data;
          
          if ((!html && !htmlPath) || !outputPath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing html/htmlPath or outputPath' }));
            return;
          }
          
          const fullOutputPath = path.join(WORKSPACE_ROOT, outputPath);
          if (!fullOutputPath.startsWith(WORKSPACE_ROOT)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: 'Access denied' }));
            return;
          }
          
          const appearance = resolveConversionAppearance({
            profileId: options.appearanceProfileId,
            overrides: options.appearanceOverrides,
          });

          // 确保输出目录存在
          const outputDir = path.dirname(fullOutputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          // 解析页面入口（优先使用 htmlPath，确保相对资源路径可用）
          let pageUrl = '';
          let tempHtmlPath: string | null = null;
          if (typeof htmlPath === 'string' && htmlPath.length > 0) {
            const fullHtmlPath = path.join(WORKSPACE_ROOT, htmlPath);
            if (!fullHtmlPath.startsWith(WORKSPACE_ROOT)) {
              res.writeHead(403);
              res.end(JSON.stringify({ error: 'Access denied: htmlPath' }));
              return;
            }
            if (!fs.existsSync(fullHtmlPath) || !fs.statSync(fullHtmlPath).isFile()) {
              res.writeHead(404);
              res.end(JSON.stringify({ error: `HTML file not found: ${htmlPath}` }));
              return;
            }
            pageUrl = pathToFileURL(fullHtmlPath).href;
            console.log(`[DEV-FS] 使用现有 HTML 文件转换图片: ${htmlPath}`);
          } else {
            tempHtmlPath = path.join(outputDir, `.temp-${Date.now()}.html`);
            fs.writeFileSync(tempHtmlPath, html, 'utf-8');
            pageUrl = pathToFileURL(tempHtmlPath).href;
            console.log(`[DEV-FS] Created temp HTML: ${tempHtmlPath}`);
          }
          
          try {
            // 使用 Puppeteer 转换（动态导入）
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.default.launch({ 
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            // 设置视口
            await page.setViewport({
              width: options.width || appearance.image.viewportWidthPx,
              height: options.height || appearance.image.viewportHeightPx,
              deviceScaleFactor: options.scale || appearance.image.deviceScaleFactor,
            });
            
            // 加载 HTML 文件
            await page.goto(pageUrl, { waitUntil: 'networkidle0' });
            const waitTime = options.waitTime ?? appearance.image.waitTimeMs;
            if (waitTime > 0) {
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
            // 等待图片加载完成，避免导出灰图
            await page.evaluate(async () => {
              const images = Array.from(document.images ?? []);
              await Promise.all(
                images.map((img) => {
                  if (img.complete) return Promise.resolve();
                  return new Promise<void>((resolve) => {
                    img.addEventListener('load', () => resolve(), { once: true });
                    img.addEventListener('error', () => resolve(), { once: true });
                  });
                })
              );
            });
            
            // 截图
            await page.screenshot({
              path: fullOutputPath,
              fullPage: options.fullPage !== false,
              type: options.type || 'png',
            });
            
            await browser.close();
            console.log(`[DEV-FS] Image exported: ${outputPath}`);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, path: outputPath }));
          } finally {
            // 删除临时文件
            if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
              fs.unlinkSync(tempHtmlPath);
              console.log(`[DEV-FS] Cleaned temp HTML: ${tempHtmlPath}`);
            }
          }
        } catch (e) {
          console.error(`[DEV-FS] Image convert error: ${e}`);
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return;
    }

    // 转换卡片到 HTML（通过 FileConverter -> CardtoHTMLPlugin）
    if (req.method === 'POST' && url.pathname === '/convert/html') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { cardId, cardFiles: inputCardFiles, cardPath, outputPath, options = {} } = data;
          
          if (!outputPath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing outputPath' }));
            return;
          }
          
          if (!inputCardFiles && !cardPath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing cardFiles or cardPath' }));
            return;
          }
          
          console.log(`[DEV-FS] HTML 转换请求:`);
          console.log(`  - cardId: ${cardId}`);
          console.log(`  - 数据来源: ${inputCardFiles ? '直接传递卡片数据' : '从文件系统读取'}`);
          console.log(`  - outputPath: ${outputPath}`);
          
          // 验证输出路径
          const fullOutputPath = path.join(WORKSPACE_ROOT, outputPath);
          if (!fullOutputPath.startsWith(WORKSPACE_ROOT)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: 'Access denied: outputPath' }));
            return;
          }
          
          // 构建卡片文件映射
          const cardFiles = new Map<string, Uint8Array>();
          
          if (inputCardFiles && Array.isArray(inputCardFiles) && inputCardFiles.length > 0) {
            // 方式1：编辑器直接传递卡片数据（推荐）
            console.log(`[DEV-FS] 使用编辑器传递的卡片数据...`);
            for (const file of inputCardFiles) {
              if (file.path && file.content) {
                // Base64 解码
                const buffer = Buffer.from(file.content, 'base64');
                cardFiles.set(file.path, new Uint8Array(buffer));
              }
            }
            console.log(`[DEV-FS] 接收了 ${cardFiles.size} 个文件（编辑器传递）`);
          } else if (cardPath) {
            // 方式2：从文件系统读取（备用）
            console.log(`[DEV-FS] 从文件系统读取: ${cardPath}`);
            const fullCardPath = path.join(WORKSPACE_ROOT, cardPath);
            
            if (!fullCardPath.startsWith(WORKSPACE_ROOT)) {
              res.writeHead(403);
              res.end(JSON.stringify({ error: 'Access denied: cardPath' }));
              return;
            }
            
            if (!fs.existsSync(fullCardPath)) {
              res.writeHead(404);
              res.end(JSON.stringify({ error: `Card not found: ${cardPath}` }));
              return;
            }
            
            const readDirRecursive = (dirPath: string, prefix: string = '') => {
              const entries = fs.readdirSync(dirPath, { withFileTypes: true });
              for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
                
                if (entry.isDirectory()) {
                  readDirRecursive(entryPath, relativePath);
                } else {
                  const content = fs.readFileSync(entryPath);
                  cardFiles.set(relativePath, new Uint8Array(content));
                }
              }
            };
            
            readDirRecursive(fullCardPath);
            console.log(`[DEV-FS] 读取了 ${cardFiles.size} 个文件（文件系统）`);
          }
          
          // 确保输出目录存在
          if (!fs.existsSync(fullOutputPath)) {
            fs.mkdirSync(fullOutputPath, { recursive: true });
          }
          
          // 调用 FileConverter 进行转换（直接传递文件夹结构，无需打包 ZIP）
          console.log(`[DEV-FS] 调用 FileConverter 转换（文件夹结构模式）...`);
          const conversionResult = await fileConverter.convert(
            {
              type: 'files',  // 使用文件夹结构模式
              files: cardFiles,
              fileType: 'card',
            },
            'html-directory',
            {
              outputPath: fullOutputPath,
              includeAssets: options.includeAssets !== false,
              themeId: options.themeId,
              appearanceProfileId: options.appearanceProfileId,
              appearanceOverrides: options.appearanceOverrides,
              onProgress: (progress) => {
                console.log(`[DEV-FS] 转换进度: ${progress.percent}% - ${progress.currentStep || ''}`);
              },
            }
          );
          
          if (!conversionResult.success) {
            console.error(`[DEV-FS] HTML 转换失败:`, conversionResult.error);
            res.writeHead(500);
            res.end(JSON.stringify({ 
              error: conversionResult.error?.message || 'HTML 转换失败',
              code: conversionResult.error?.code,
              warnings: conversionResult.warnings,
            }));
            return;
          }
          
          console.log(`[DEV-FS] HTML 转换成功: ${outputPath}`);
          console.log(`  - 基础卡片数: ${conversionResult.stats?.baseCardCount || 0}`);
          console.log(`  - 资源文件数: ${conversionResult.stats?.resourceCount || 0}`);
          console.log(`  - 耗时: ${conversionResult.stats?.duration || 0}ms`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            path: outputPath,
            stats: conversionResult.stats,
            warnings: conversionResult.warnings,
          }));
        } catch (e) {
          console.error(`[DEV-FS] HTML convert error: ${e}`);
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return;
    }

    // 检查文件/目录是否存在
    if (req.method === 'GET' && url.pathname.startsWith('/exists/')) {
      const relativePath = decodeURIComponent(url.pathname.replace('/exists/', ''));
      const fullPath = path.join(WORKSPACE_ROOT, relativePath);
      
      if (!fullPath.startsWith(WORKSPACE_ROOT)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
      }

      const exists = fs.existsSync(fullPath);
      let isDirectory = false;
      let isFile = false;
      
      if (exists) {
        const stat = fs.statSync(fullPath);
        isDirectory = stat.isDirectory();
        isFile = stat.isFile();
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        exists, 
        isDirectory, 
        isFile,
        path: relativePath 
      }));
      return;
    }

    // 状态检查
    if (req.method === 'GET' && url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'running',
        workspace: WORKSPACE_ROOT,
        port: PORT
      }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));

  } catch (error) {
    console.error('[DEV-FS] Error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(error) }));
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📁 开发文件服务器已启动');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  端口: http://localhost:${PORT}`);
  console.log(`  工作空间: ${WORKSPACE_ROOT}`);
  console.log('');
  console.log('  文件 API:');
  console.log('    GET  /status           - 服务器状态');
  console.log('    GET  /workspace        - 列出工作空间');
  console.log('    GET  /file/{path}      - 读取文件（JSON格式，支持 ?binary=true 参数）');
  console.log('    PUT  /file/{path}      - 写入文件');
  console.log('    POST /mkdir/{path}     - 创建目录');
  console.log('    DELETE /file/{path}    - 删除文件');
  console.log('    GET  /exists/{path}    - 检查是否存在');
  console.log('');
  console.log('  转换 API:');
  console.log('    POST /convert/html     - 卡片转 HTML (FileConverter -> CardtoHTMLPlugin)');
  console.log('    POST /convert/pdf      - HTML 转 PDF (Puppeteer)');
  console.log('    POST /convert/image    - HTML 转图片 (Puppeteer)');
  console.log('    POST /card/pack        - 卡片打包为 .card (CardPacker)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});
