/**
 * Chips Editor - Electron 主进程
 * @description 薯片卡片编辑器桌面端主进程
 */

import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 内核进程
let coreProcess: ChildProcess | null = null;

// 主窗口
let mainWindow: BrowserWindow | null = null;

// 开发模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: '薯片卡片编辑器',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      // 开发模式下允许访问本地文件服务器
      webSecurity: !isDev,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#fafafa',
  });

  // 设置菜单
  createMenu();

  // 加载页面
  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
}

/**
 * 创建应用菜单
 */
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建卡片', accelerator: 'CmdOrCtrl+N', click: () => sendToRenderer('menu:new-card') },
        { label: '打开...', accelerator: 'CmdOrCtrl+O', click: () => handleOpen() },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => sendToRenderer('menu:save') },
        { label: '另存为...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendToRenderer('menu:save-as') },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', click: () => sendToRenderer('menu:undo') },
        { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', click: () => sendToRenderer('menu:redo') },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'delete', label: '删除' },
        { type: 'separator' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '无限画布', click: () => sendToRenderer('menu:layout-canvas') },
        { label: '工作台', click: () => sendToRenderer('menu:layout-workbench') },
        { type: 'separator' },
        { label: '显示网格', type: 'checkbox', checked: true, click: (item) => sendToRenderer('menu:toggle-grid', item.checked) },
        { type: 'separator' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', click: () => sendToRenderer('menu:zoom-in') },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', click: () => sendToRenderer('menu:zoom-out') },
        { label: '重置缩放', accelerator: 'CmdOrCtrl+0', click: () => sendToRenderer('menu:zoom-reset') },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { role: 'reload', label: '重新加载' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { type: 'separator' },
        { role: 'front', label: '前置所有窗口' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于薯片编辑器', click: () => showAbout() },
        { label: '文档', click: () => require('electron').shell.openExternal('https://chips.dev/docs') },
      ],
    },
  ];

  // macOS 特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about', label: '关于薯片编辑器' },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 发送消息到渲染进程
 */
function sendToRenderer(channel: string, ...args: unknown[]): void {
  mainWindow?.webContents.send(channel, ...args);
}

/**
 * 处理打开文件
 */
async function handleOpen(): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [
      { name: '薯片卡片', extensions: ['card'] },
      { name: '薯片箱子', extensions: ['box'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile', 'multiSelections'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    sendToRenderer('menu:open', result.filePaths);
  }
}

/**
 * 显示关于对话框
 */
function showAbout(): void {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: '关于薯片卡片编辑器',
    message: '薯片卡片编辑器',
    detail: `版本: 1.0.0\n薯片生态的核心应用\n\n© 2026 Chips Ecosystem`,
  });
}

/**
 * 启动内核进程
 */
function startCoreProcess(): void {
  const corePath = isDev
    ? path.join(__dirname, '../../Chips-core/target/debug/chips-core')
    : path.join(process.resourcesPath, 'chips-core');

  if (!fs.existsSync(corePath)) {
    console.warn('内核文件不存在:', corePath);
    return;
  }

  console.log('启动内核进程:', corePath);
  
  coreProcess = spawn(corePath, ['start', '--dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  coreProcess.stdout?.on('data', (data) => {
    console.log('[Core]', data.toString());
  });

  coreProcess.stderr?.on('data', (data) => {
    console.error('[Core Error]', data.toString());
  });

  coreProcess.on('close', (code) => {
    console.log('内核进程退出:', code);
    coreProcess = null;
  });
}

/**
 * 停止内核进程
 */
function stopCoreProcess(): void {
  if (coreProcess) {
    coreProcess.kill();
    coreProcess = null;
  }
}

// IPC 处理
ipcMain.handle('dialog:open', async () => {
  return dialog.showOpenDialog(mainWindow!, {
    filters: [
      { name: '薯片卡片', extensions: ['card'] },
      { name: '薯片箱子', extensions: ['box'] },
    ],
    properties: ['openFile'],
  });
});

ipcMain.handle('dialog:save', async (_event, defaultPath?: string) => {
  return dialog.showSaveDialog(mainWindow!, {
    defaultPath,
    filters: [
      { name: '薯片卡片', extensions: ['card'] },
    ],
  });
});

ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:get-path', (_event, name: string) => {
  return app.getPath(name as any);
});

// 应用生命周期
app.whenReady().then(() => {
  // 启动内核
  startCoreProcess();
  
  // 创建窗口
  createWindow();

  // macOS: 点击 Dock 图标时显示或重新创建窗口
  app.on('activate', () => {
    if (mainWindow) {
      // 窗口存在但可能被隐藏，显示并聚焦
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      // 没有窗口，重新创建
      createWindow();
    }
  });
});

// 所有窗口关闭时
app.on('window-all-closed', () => {
  // macOS 通常不退出应用
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前
app.on('before-quit', () => {
  stopCoreProcess();
});

// 防止多实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
