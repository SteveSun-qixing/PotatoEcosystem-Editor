/**
 * 拖放创建 Hook
 * @module components/card-box-library/use-drag-create
 * @description 处理从卡箱库拖放到画布创建卡片/箱子的逻辑
 */

import { ref, readonly, type Ref } from 'vue';
import type { DragData, DragState } from './types';

/** 拖放创建 Hook 返回值 */
export interface UseDragCreateReturn {
  /** 拖放状态（只读） */
  dragState: Readonly<Ref<DragState>>;
  /** 开始拖放 */
  startDrag: (data: DragData, event: DragEvent) => void;
  /** 更新预览位置 */
  updatePreview: (x: number, y: number) => void;
  /** 结束拖放 */
  endDrag: () => void;
  /** 获取拖放数据 */
  getDragData: () => DragData | null;
  /** 设置拖放数据到事件 */
  setDragDataToEvent: (event: DragEvent, data: DragData) => void;
  /** 从事件获取拖放数据 */
  getDragDataFromEvent: (event: DragEvent) => DragData | null;
}

/** 拖放数据的 MIME 类型 */
const DRAG_DATA_TYPE = 'application/x-chips-drag-data';

/**
 * 拖放创建 Hook
 *
 * 提供从卡箱库拖放到画布创建新卡片或箱子的功能。
 *
 * @example
 * ```typescript
 * const {
 *   dragState,
 *   startDrag,
 *   updatePreview,
 *   endDrag,
 *   getDragDataFromEvent,
 * } = useDragCreate();
 *
 * // 开始拖放
 * function handleDragStart(data: DragData, event: DragEvent) {
 *   startDrag(data, event);
 * }
 *
 * // 在画布上放置
 * function handleDrop(event: DragEvent) {
 *   const data = getDragDataFromEvent(event);
 *   if (data) {
 *     // 创建卡片或箱子
 *   }
 *   endDrag();
 * }
 * ```
 */
export function useDragCreate(): UseDragCreateReturn {
  /** 拖放状态 */
  const dragState = ref<DragState>({
    isDragging: false,
    data: null,
    previewPosition: null,
  });

  /**
   * 开始拖放
   * @param data - 拖放数据
   * @param event - 拖放事件
   */
  function startDrag(data: DragData, event: DragEvent): void {
    dragState.value = {
      isDragging: true,
      data,
      previewPosition: null,
    };

    // 设置拖放数据
    setDragDataToEvent(event, data);

    // 设置拖放效果
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      // 设置拖放图标（使用透明图片，我们自己渲染预览）
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      event.dataTransfer.setDragImage(img, 0, 0);
    }
  }

  /**
   * 更新预览位置
   * @param x - X 坐标
   * @param y - Y 坐标
   */
  function updatePreview(x: number, y: number): void {
    if (dragState.value.isDragging) {
      dragState.value.previewPosition = { x, y };
    }
  }

  /**
   * 结束拖放
   */
  function endDrag(): void {
    dragState.value = {
      isDragging: false,
      data: null,
      previewPosition: null,
    };
  }

  /**
   * 获取拖放数据
   * @returns 拖放数据或 null
   */
  function getDragData(): DragData | null {
    return dragState.value.data;
  }

  /**
   * 设置拖放数据到事件
   * @param event - 拖放事件
   * @param data - 拖放数据
   */
  function setDragDataToEvent(event: DragEvent, data: DragData): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(data));
      // 同时设置 text/plain 作为降级
      event.dataTransfer.setData('text/plain', data.name);
    }
  }

  /**
   * 从事件获取拖放数据
   * @param event - 拖放事件
   * @returns 拖放数据或 null
   */
  function getDragDataFromEvent(event: DragEvent): DragData | null {
    if (!event.dataTransfer) return null;

    const dataStr = event.dataTransfer.getData(DRAG_DATA_TYPE);
    if (!dataStr) return null;

    try {
      return JSON.parse(dataStr) as DragData;
    } catch {
      return null;
    }
  }

  return {
    dragState: readonly(dragState),
    startDrag,
    updatePreview,
    endDrag,
    getDragData,
    setDragDataToEvent,
    getDragDataFromEvent,
  };
}

// 全局拖放状态（供跨组件使用）
let globalDragCreate: UseDragCreateReturn | null = null;

/**
 * 获取全局拖放创建实例
 * @returns 拖放创建实例
 */
export function useGlobalDragCreate(): UseDragCreateReturn {
  if (!globalDragCreate) {
    globalDragCreate = useDragCreate();
  }
  return globalDragCreate;
}

/**
 * 重置全局拖放创建（主要用于测试）
 */
export function resetGlobalDragCreate(): void {
  if (globalDragCreate) {
    globalDragCreate.endDrag();
  }
  globalDragCreate = null;
}
