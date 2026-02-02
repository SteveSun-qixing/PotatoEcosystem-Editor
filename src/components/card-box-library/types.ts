/**
 * 卡箱库类型定义
 * @module components/card-box-library/types
 */

/** 卡片类型分类 */
export type CardCategory = 'text' | 'media' | 'interactive' | 'professional' | 'content' | 'info';

/** 布局类型分类 */
export type LayoutCategory = 'basic' | 'professional';

/** 卡片类型定义 */
export interface CardTypeDefinition {
  /** 类型ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 图标 */
  icon: string;
  /** 描述 */
  description: string;
  /** 分类 */
  category: CardCategory;
  /** 关键词（用于搜索） */
  keywords: string[];
}

/** 布局类型定义 */
export interface LayoutTypeDefinition {
  /** 布局ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 图标 */
  icon: string;
  /** 描述 */
  description: string;
  /** 分类 */
  category: LayoutCategory;
  /** 关键词（用于搜索） */
  keywords: string[];
}

/** 分类定义 */
export interface CategoryDefinition {
  /** 分类ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 图标 */
  icon: string;
}

/** 拖放数据 */
export interface DragData {
  /** 拖放类型 */
  type: 'card' | 'layout';
  /** 类型ID */
  typeId: string;
  /** 名称 */
  name: string;
}

/** 拖放状态 */
export interface DragState {
  /** 是否正在拖放 */
  isDragging: boolean;
  /** 拖放数据 */
  data: DragData | null;
  /** 预览位置 */
  previewPosition: { x: number; y: number } | null;
}
