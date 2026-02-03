import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  // 平台信息
  platform: process.platform,
  // 对话框
  dialog: {
    open: () => ipcRenderer.invoke("dialog:open"),
    save: (defaultPath) => ipcRenderer.invoke("dialog:save", defaultPath)
  },
  // 应用信息
  app: {
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    getPath: (name) => ipcRenderer.invoke("app:get-path", name)
  },
  // 菜单事件监听
  onMenuAction: (callback) => {
    const channels = [
      "menu:new-card",
      "menu:open",
      "menu:save",
      "menu:save-as",
      "menu:undo",
      "menu:redo",
      "menu:layout-canvas",
      "menu:layout-workbench",
      "menu:toggle-grid",
      "menu:zoom-in",
      "menu:zoom-out",
      "menu:zoom-reset"
    ];
    const handlers = [];
    channels.forEach((channel) => {
      const handler = (_event, ...args) => {
        callback(channel, ...args);
      };
      handlers.push(handler);
      ipcRenderer.on(channel, handler);
    });
    return () => {
      channels.forEach((channel, index) => {
        ipcRenderer.removeListener(channel, handlers[index]);
      });
    };
  },
  // 发送消息到主进程
  send: (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
  },
  // 调用主进程方法
  invoke: (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
  }
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC5qcyIsInNvdXJjZXMiOlsiLi4vZWxlY3Ryb24vcHJlbG9hZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENoaXBzIEVkaXRvciAtIEVsZWN0cm9uIOmihOWKoOi9veiEmuacrFxuICogQGRlc2NyaXB0aW9uIOWcqOa4suafk+i/m+eoi+S4reaatOmcsuWuieWFqOeahCBBUElcbiAqL1xuXG5pbXBvcnQgeyBjb250ZXh0QnJpZGdlLCBpcGNSZW5kZXJlciwgSXBjUmVuZGVyZXJFdmVudCB9IGZyb20gJ2VsZWN0cm9uJztcblxuLy8g5a6a5LmJ5pq06Zyy57uZ5riy5p+T6L+b56iL55qEIEFQSVxuY29uc3QgZWxlY3Ryb25BUEkgPSB7XG4gIC8vIOW5s+WPsOS/oeaBr1xuICBwbGF0Zm9ybTogcHJvY2Vzcy5wbGF0Zm9ybSxcbiAgXG4gIC8vIOWvueivneahhlxuICBkaWFsb2c6IHtcbiAgICBvcGVuOiAoKTogUHJvbWlzZTxFbGVjdHJvbi5PcGVuRGlhbG9nUmV0dXJuVmFsdWU+ID0+IFxuICAgICAgaXBjUmVuZGVyZXIuaW52b2tlKCdkaWFsb2c6b3BlbicpLFxuICAgIHNhdmU6IChkZWZhdWx0UGF0aD86IHN0cmluZyk6IFByb21pc2U8RWxlY3Ryb24uU2F2ZURpYWxvZ1JldHVyblZhbHVlPiA9PiBcbiAgICAgIGlwY1JlbmRlcmVyLmludm9rZSgnZGlhbG9nOnNhdmUnLCBkZWZhdWx0UGF0aCksXG4gIH0sXG4gIFxuICAvLyDlupTnlKjkv6Hmga9cbiAgYXBwOiB7XG4gICAgZ2V0VmVyc2lvbjogKCk6IFByb21pc2U8c3RyaW5nPiA9PiBcbiAgICAgIGlwY1JlbmRlcmVyLmludm9rZSgnYXBwOmdldC12ZXJzaW9uJyksXG4gICAgZ2V0UGF0aDogKG5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiA9PiBcbiAgICAgIGlwY1JlbmRlcmVyLmludm9rZSgnYXBwOmdldC1wYXRoJywgbmFtZSksXG4gIH0sXG4gIFxuICAvLyDoj5zljZXkuovku7bnm5HlkKxcbiAgb25NZW51QWN0aW9uOiAoY2FsbGJhY2s6IChhY3Rpb246IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgY29uc3QgY2hhbm5lbHMgPSBbXG4gICAgICAnbWVudTpuZXctY2FyZCcsXG4gICAgICAnbWVudTpvcGVuJyxcbiAgICAgICdtZW51OnNhdmUnLFxuICAgICAgJ21lbnU6c2F2ZS1hcycsXG4gICAgICAnbWVudTp1bmRvJyxcbiAgICAgICdtZW51OnJlZG8nLFxuICAgICAgJ21lbnU6bGF5b3V0LWNhbnZhcycsXG4gICAgICAnbWVudTpsYXlvdXQtd29ya2JlbmNoJyxcbiAgICAgICdtZW51OnRvZ2dsZS1ncmlkJyxcbiAgICAgICdtZW51Onpvb20taW4nLFxuICAgICAgJ21lbnU6em9vbS1vdXQnLFxuICAgICAgJ21lbnU6em9vbS1yZXNldCcsXG4gICAgXTtcbiAgICBcbiAgICBjb25zdCBoYW5kbGVyczogQXJyYXk8KGV2ZW50OiBJcGNSZW5kZXJlckV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ+ID0gW107XG4gICAgXG4gICAgY2hhbm5lbHMuZm9yRWFjaCgoY2hhbm5lbCkgPT4ge1xuICAgICAgY29uc3QgaGFuZGxlciA9IChfZXZlbnQ6IElwY1JlbmRlcmVyRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4ge1xuICAgICAgICBjYWxsYmFjayhjaGFubmVsLCAuLi5hcmdzKTtcbiAgICAgIH07XG4gICAgICBoYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgICAgaXBjUmVuZGVyZXIub24oY2hhbm5lbCwgaGFuZGxlcik7XG4gICAgfSk7XG4gICAgXG4gICAgLy8g6L+U5Zue5riF55CG5Ye95pWwXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNoYW5uZWxzLmZvckVhY2goKGNoYW5uZWwsIGluZGV4KSA9PiB7XG4gICAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUxpc3RlbmVyKGNoYW5uZWwsIGhhbmRsZXJzW2luZGV4XSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9LFxuICBcbiAgLy8g5Y+R6YCB5raI5oGv5Yiw5Li76L+b56iLXG4gIHNlbmQ6IChjaGFubmVsOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSk6IHZvaWQgPT4ge1xuICAgIGlwY1JlbmRlcmVyLnNlbmQoY2hhbm5lbCwgLi4uYXJncyk7XG4gIH0sXG4gIFxuICAvLyDosIPnlKjkuLvov5vnqIvmlrnms5VcbiAgaW52b2tlOiAoY2hhbm5lbDogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICB9LFxufTtcblxuLy8g5pq06Zyy5YiwIHdpbmRvdyDlr7nosaFcbmNvbnRleHRCcmlkZ2UuZXhwb3NlSW5NYWluV29ybGQoJ2VsZWN0cm9uQVBJJywgZWxlY3Ryb25BUEkpO1xuXG4vLyBUeXBlU2NyaXB0IOexu+Wei+WjsOaYjlxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBlbGVjdHJvbkFQSTogdHlwZW9mIGVsZWN0cm9uQVBJO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQVFBLE1BQU0sY0FBYztBQUFBO0FBQUEsRUFFbEIsVUFBVSxRQUFRO0FBQUE7QUFBQSxFQUdsQixRQUFRO0FBQUEsSUFDTixNQUFNLE1BQ0osWUFBWSxPQUFPLGFBQWE7QUFBQSxJQUNsQyxNQUFNLENBQUMsZ0JBQ0wsWUFBWSxPQUFPLGVBQWUsV0FBVztBQUFBLEVBQUE7QUFBQTtBQUFBLEVBSWpELEtBQUs7QUFBQSxJQUNILFlBQVksTUFDVixZQUFZLE9BQU8saUJBQWlCO0FBQUEsSUFDdEMsU0FBUyxDQUFDLFNBQ1IsWUFBWSxPQUFPLGdCQUFnQixJQUFJO0FBQUEsRUFBQTtBQUFBO0FBQUEsRUFJM0MsY0FBYyxDQUFDLGFBQTJEO0FBQ3hFLFVBQU0sV0FBVztBQUFBLE1BQ2Y7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQUE7QUFHRixVQUFNLFdBQXlFLENBQUE7QUFFL0UsYUFBUyxRQUFRLENBQUMsWUFBWTtBQUM1QixZQUFNLFVBQVUsQ0FBQyxXQUE2QixTQUFvQjtBQUNoRSxpQkFBUyxTQUFTLEdBQUcsSUFBSTtBQUFBLE1BQzNCO0FBQ0EsZUFBUyxLQUFLLE9BQU87QUFDckIsa0JBQVksR0FBRyxTQUFTLE9BQU87QUFBQSxJQUNqQyxDQUFDO0FBR0QsV0FBTyxNQUFNO0FBQ1gsZUFBUyxRQUFRLENBQUMsU0FBUyxVQUFVO0FBQ25DLG9CQUFZLGVBQWUsU0FBUyxTQUFTLEtBQUssQ0FBQztBQUFBLE1BQ3JELENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxNQUFNLENBQUMsWUFBb0IsU0FBMEI7QUFDbkQsZ0JBQVksS0FBSyxTQUFTLEdBQUcsSUFBSTtBQUFBLEVBQ25DO0FBQUE7QUFBQSxFQUdBLFFBQVEsQ0FBQyxZQUFvQixTQUFzQztBQUNqRSxXQUFPLFlBQVksT0FBTyxTQUFTLEdBQUcsSUFBSTtBQUFBLEVBQzVDO0FBQ0Y7QUFHQSxjQUFjLGtCQUFrQixlQUFlLFdBQVc7In0=
