/**
 * 功能组件导出
 * @module components
 */

// 组件版本
export const COMPONENTS_VERSION = '1.0.0';

// ==================== 窗口组件 ====================
export {
  BaseWindow,
  CardWindow,
  ToolWindow,
  WindowMenu,
} from './window';

// ==================== 程序坞组件 ====================
export { Dock, DockItem } from './dock';

// ==================== 卡箱库组件 ====================
export {
  CardBoxLibrary,
  CardTypeGrid,
  LayoutTypeGrid,
  cardCategories,
  layoutCategories,
  cardTypes,
  layoutTypes,
  getCardTypesByCategory,
  getLayoutTypesByCategory,
  searchCardTypes,
  searchLayoutTypes,
  useDragCreate,
  useGlobalDragCreate,
  resetGlobalDragCreate,
} from './card-box-library';

export type {
  CardCategory,
  LayoutCategory,
  CardTypeDefinition,
  LayoutTypeDefinition,
  CategoryDefinition,
  DragData,
  DragState,
  UseDragCreateReturn,
} from './card-box-library';

// ==================== 编辑面板组件 ====================
export {
  EditPanel,
  PluginHost,
  DefaultEditor,
} from './edit-panel';

export type {
  EditPanelProps,
  PluginHostProps,
  DefaultEditorProps,
  EditorPlugin,
  ConfigChangeEvent,
} from './edit-panel';

// ==================== 文件管理器组件 ====================
export {
  FileManager,
  FileTree,
  FileItem,
  ContextMenu,
} from './file-manager';

export type {
  MenuItem,
} from './file-manager';
