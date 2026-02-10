/**
 * Chips Editor - 卡片编辑引擎
 * 应用入口文件
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/global.css';

// 创建应用实例
const app = createApp(App);

// 注册 Pinia 状态管理
const pinia = createPinia();
app.use(pinia);

// 挂载应用
app.mount('#app');

// 开发模式下的调试信息
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn('[Chips Editor] Development mode');
}
