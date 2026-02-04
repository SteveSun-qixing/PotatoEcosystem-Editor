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
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// 导入 Foundation 模块（通过 pnpm workspace 链接）
import { fileConverter, zipProcessor } from '@chips/foundation';

// 导入 CardtoHTMLPlugin（通过 pnpm workspace 链接）
import { CardtoHTMLPlugin } from '@chips/cardto-html-plugin';

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

type IncomingCardFile = { path: string; content: string };

const buildCardFileMap = (
  inputCardFiles?: IncomingCardFile[],
  cardPath?: string
): Map<string, Uint8Array> => {
  const cardFiles = new Map<string, Uint8Array>();

  if (inputCardFiles && Array.isArray(inputCardFiles) && inputCardFiles.length > 0) {
    for (const file of inputCardFiles) {
      if (file.path && file.content) {
        const buffer = Buffer.from(file.content, 'base64');
        cardFiles.set(file.path, new Uint8Array(buffer));
      }
    }
    return cardFiles;
  }

  if (!cardPath) {
    return cardFiles;
  }

  const fullCardPath = path.join(WORKSPACE_ROOT, cardPath);
  if (!fullCardPath.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Access denied: cardPath');
  }

  if (!fs.existsSync(fullCardPath)) {
    throw new Error(`Card not found: ${cardPath}`);
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
  return cardFiles;
};

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
    // 读取文件
    if (req.method === 'GET' && url.pathname.startsWith('/file/')) {
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
          const files = fs.readdirSync(fullPath);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ type: 'directory', files }));
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

    // 转换 HTML 到 PDF
    if (req.method === 'POST' && url.pathname === '/convert/pdf') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { html, outputPath, options = {}, cardFiles: inputCardFiles, cardPath } = data;
          
          if (!outputPath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing outputPath' }));
            return;
          }
          
          const fullOutputPath = path.join(WORKSPACE_ROOT, outputPath);
          if (!fullOutputPath.startsWith(WORKSPACE_ROOT)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: 'Access denied' }));
            return;
          }
          
          // 确保输出目录存在
          const outputDir = path.dirname(fullOutputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          let tempHtmlPath = '';
          let tempDir: string | null = null;

          if (html) {
            // 兼容旧流程：直接使用传入的 HTML
            tempHtmlPath = path.join(WORKSPACE_ROOT, `.temp-${Date.now()}.html`);
            fs.writeFileSync(tempHtmlPath, html, 'utf-8');
            console.log(`[DEV-FS] Created temp HTML: ${tempHtmlPath}`);
          } else {
            // 新流程：先调用 HTML 转换模块
            const cardFiles = buildCardFileMap(inputCardFiles, cardPath);
            if (cardFiles.size === 0) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Missing html or cardFiles/cardPath' }));
              return;
            }

            tempDir = path.join(WORKSPACE_ROOT, `.temp-html-${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });

            console.log(`[DEV-FS] 先生成 HTML 再转换 PDF...`);
            const conversionResult = await fileConverter.convert(
              {
                type: 'files',
                files: cardFiles,
                fileType: 'card',
              },
              'html-directory',
              {
                outputPath: tempDir,
                includeAssets: options.includeAssets !== false,
                themeId: options.themeId,
              }
            );

            if (!conversionResult.success) {
              res.writeHead(500);
              res.end(JSON.stringify({ error: conversionResult.error?.message || 'HTML 转换失败' }));
              return;
            }

            tempHtmlPath = path.join(tempDir, 'index.html');
          }
          
          try {
            // 使用 Puppeteer 转换（动态导入）
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.default.launch({ 
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            // 加载 HTML 文件
            await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
            
            // 生成 PDF
            await page.pdf({
              path: fullOutputPath,
              format: options.format || 'A4',
              printBackground: options.printBackground !== false,
              margin: options.margin || { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
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
            if (tempDir && fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
              console.log(`[DEV-FS] Cleaned temp directory: ${tempDir}`);
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
          const { html, outputPath, options = {}, cardFiles: inputCardFiles, cardPath } = data;
          
          if (!outputPath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing outputPath' }));
            return;
          }
          
          const fullOutputPath = path.join(WORKSPACE_ROOT, outputPath);
          if (!fullOutputPath.startsWith(WORKSPACE_ROOT)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: 'Access denied' }));
            return;
          }
          
          // 确保输出目录存在
          const outputDir = path.dirname(fullOutputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          let tempHtmlPath = '';
          let tempDir: string | null = null;

          if (html) {
            tempHtmlPath = path.join(WORKSPACE_ROOT, `.temp-${Date.now()}.html`);
            fs.writeFileSync(tempHtmlPath, html, 'utf-8');
            console.log(`[DEV-FS] Created temp HTML: ${tempHtmlPath}`);
          } else {
            const cardFiles = buildCardFileMap(inputCardFiles, cardPath);
            if (cardFiles.size === 0) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Missing html or cardFiles/cardPath' }));
              return;
            }

            tempDir = path.join(WORKSPACE_ROOT, `.temp-html-${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });

            console.log(`[DEV-FS] 先生成 HTML 再转换图片...`);
            const conversionResult = await fileConverter.convert(
              {
                type: 'files',
                files: cardFiles,
                fileType: 'card',
              },
              'html-directory',
              {
                outputPath: tempDir,
                includeAssets: options.includeAssets !== false,
                themeId: options.themeId,
              }
            );

            if (!conversionResult.success) {
              res.writeHead(500);
              res.end(JSON.stringify({ error: conversionResult.error?.message || 'HTML 转换失败' }));
              return;
            }

            tempHtmlPath = path.join(tempDir, 'index.html');
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
              width: options.width || 1200,
              height: options.height || 800,
              deviceScaleFactor: options.scale || 2,
            });
            
            // 加载 HTML 文件
            await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
            
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
            if (tempDir && fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
              console.log(`[DEV-FS] Cleaned temp directory: ${tempDir}`);
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
          let cardFiles: Map<string, Uint8Array>;
          try {
            cardFiles = buildCardFileMap(inputCardFiles, cardPath);
          } catch (error) {
            const message = error instanceof Error ? error.message : '读取卡片文件失败';
            res.writeHead(403);
            res.end(JSON.stringify({ error: message }));
            return;
          }

          console.log(`[DEV-FS] 读取了 ${cardFiles.size} 个文件（${inputCardFiles ? '编辑器传递' : '文件系统'}）`);
          
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
  console.log('    GET  /file/{path}      - 读取文件');
  console.log('    PUT  /file/{path}      - 写入文件');
  console.log('    POST /mkdir/{path}     - 创建目录');
  console.log('    DELETE /file/{path}    - 删除文件');
  console.log('    GET  /exists/{path}    - 检查是否存在');
  console.log('');
  console.log('  转换 API:');
  console.log('    POST /convert/html     - 卡片转 HTML (FileConverter -> CardtoHTMLPlugin)');
  console.log('    POST /convert/pdf      - HTML 转 PDF (Puppeteer)');
  console.log('    POST /convert/image    - HTML 转图片 (Puppeteer)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});
