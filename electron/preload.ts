/**
 * Chips Editor - Electron 预加载脚本
 * @description 在渲染进程中暴露安全的 API
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// 定义暴露给渲染进程的 API
const electronAPI = {
  // 平台信息
  platform: process.platform,
  
  // 对话框
  dialog: {
    open: (): Promise<Electron.OpenDialogReturnValue> => 
      ipcRenderer.invoke('dialog:open'),
    save: (defaultPath?: string): Promise<Electron.SaveDialogReturnValue> => 
      ipcRenderer.invoke('dialog:save', defaultPath),
  },
  
  // 应用信息
  app: {
    getVersion: (): Promise<string> => 
      ipcRenderer.invoke('app:get-version'),
    getPath: (name: string): Promise<string> => 
      ipcRenderer.invoke('app:get-path', name),
  },
  
  // 菜单事件监听
  onMenuAction: (callback: (action: string, ...args: unknown[]) => void) => {
    const channels = [
      'menu:new-card',
      'menu:open',
      'menu:save',
      'menu:save-as',
      'menu:undo',
      'menu:redo',
      'menu:layout-canvas',
      'menu:layout-workbench',
      'menu:toggle-grid',
      'menu:zoom-in',
      'menu:zoom-out',
      'menu:zoom-reset',
    ];
    
    const handlers: Array<(event: IpcRendererEvent, ...args: unknown[]) => void> = [];
    
    channels.forEach((channel) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => {
        callback(channel, ...args);
      };
      handlers.push(handler);
      ipcRenderer.on(channel, handler);
    });
    
    // 返回清理函数
    return () => {
      channels.forEach((channel, index) => {
        ipcRenderer.removeListener(channel, handlers[index]);
      });
    };
  },
  
  // 发送消息到主进程
  send: (channel: string, ...args: unknown[]): void => {
    ipcRenderer.send(channel, ...args);
  },
  
  // 调用主进程方法
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    return ipcRenderer.invoke(channel, ...args);
  },
};

// 暴露到 window 对象
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript 类型声明
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
