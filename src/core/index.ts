/**
 * 核心模块导出
 * @module core
 * @description Chips 编辑器核心模块，提供编辑器主类、连接器、事件管理和状态管理
 */

// ==================== 核心版本 ====================
export const CORE_VERSION = '1.0.0';

// ==================== 编辑器主类 ====================
export { ChipsEditor, createEditor } from './editor';
export type { CreateCardOptions, OpenCardOptions, SaveCardOptions } from './editor';

// ==================== SDK 连接器 ====================
export { SDKConnector, createConnector } from './connector';
export type {
  SDKConnectorOptions,
  MockSDKInstance,
  MockCard,
  MockBox,
} from './connector';

// ==================== 事件管理 ====================
export { EventEmitter, createEventEmitter } from './event-manager';

// ==================== 状态管理 ====================
export {
  useEditorStore,
  useCardStore,
  useUIStore,
} from './state';

export type {
  EditorStoreState,
  EditorStore,
  CardStoreState,
  CardStore,
  CardInfo,
  CardMetadata,
  BaseCardInfo,
  Card,
  UIStoreState,
  UIStore,
  DockPosition,
} from './state';
