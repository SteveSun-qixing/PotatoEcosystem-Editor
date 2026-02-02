<script setup lang="ts">
/**
 * 无限画布主组件
 * @module layouts/infinite-canvas/InfiniteCanvas
 * @description 编辑器核心布局 - 两层界面设计（桌面层 + 窗口层）
 */

import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import DesktopLayer from './DesktopLayer.vue';
import WindowLayer from './WindowLayer.vue';
import ZoomControl from './ZoomControl.vue';
import { useUIStore } from '@/core/state';
import { useCanvasControls } from './use-canvas';
import { useGlobalDragCreate, DragPreview } from '@/components/card-box-library';
import type { DragData } from '@/components/card-box-library';

const emit = defineEmits<{
  /** 拖放创建卡片/箱子 */
  dropCreate: [data: DragData, worldPosition: { x: number; y: number }];
}>();

const uiStore = useUIStore();

/** 画布容器引用 */
const canvasRef = ref<HTMLElement | null>(null);

/** 全局拖放创建实例 */
const dragCreate = useGlobalDragCreate();

/** 拖放悬停状态 */
const isDragOver = ref(false);

/** 拖放预览位置 */
const dragPreviewPosition = ref({ x: 0, y: 0 });

/** 使用画布控制 hook */
const {
  zoom,
  panX,
  panY,
  isPanning,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  zoomIn,
  zoomOut,
  zoomTo,
  resetView,
  fitToContent,
  screenToWorld,
  worldToScreen,
} = useCanvasControls();

/** 桌面层样式（应用缩放和平移） */
const desktopStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
  transformOrigin: '0 0',
}));

/** 网格样式 */
const gridStyle = computed(() => {
  const gridSize = uiStore.gridSize * zoom.value;
  return {
    backgroundSize: `${gridSize}px ${gridSize}px`,
    backgroundPosition: `${panX.value % gridSize}px ${panY.value % gridSize}px`,
  };
});

/** 画布光标样式 */
const canvasCursor = computed(() => {
  if (isPanning.value) return 'grabbing';
  return 'grab';
});

/** 提供给子组件的上下文 */
provide('canvas', {
  zoom,
  panX,
  panY,
  zoomIn,
  zoomOut,
  zoomTo,
  resetView,
  fitToContent,
  screenToWorld,
  worldToScreen,
});

/**
 * 监听键盘快捷键
 * @param e - 键盘事件
 */
function handleKeyDown(e: KeyboardEvent): void {
  // Ctrl/Cmd + 0: 重置视图
  if ((e.ctrlKey || e.metaKey) && e.key === '0') {
    e.preventDefault();
    resetView();
  }
  // Ctrl/Cmd + +: 放大
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoomIn();
  }
  // Ctrl/Cmd + -: 缩小
  if ((e.ctrlKey || e.metaKey) && e.key === '-') {
    e.preventDefault();
    zoomOut();
  }
}

/**
 * 处理拖放进入
 * @param e - 拖放事件
 */
function handleDragEnter(e: DragEvent): void {
  e.preventDefault();
  isDragOver.value = true;
}

/**
 * 处理拖放悬停
 * @param e - 拖放事件
 */
function handleDragOver(e: DragEvent): void {
  e.preventDefault();

  // 更新拖放效果
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }

  // 更新预览位置
  dragPreviewPosition.value = { x: e.clientX, y: e.clientY };
  dragCreate.updatePreview(e.clientX, e.clientY);
}

/**
 * 处理拖放离开
 * @param e - 拖放事件
 */
function handleDragLeave(e: DragEvent): void {
  // 检查是否真正离开了画布（而不是进入了子元素）
  const rect = canvasRef.value?.getBoundingClientRect();
  if (rect) {
    const { clientX, clientY } = e;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      isDragOver.value = false;
    }
  }
}

/**
 * 处理拖放释放
 * @param e - 拖放事件
 */
function handleDrop(e: DragEvent): void {
  e.preventDefault();
  isDragOver.value = false;

  // 获取拖放数据
  const data = dragCreate.getDragDataFromEvent(e);
  if (!data) return;

  // 计算世界坐标
  const worldPosition = screenToWorld(e.clientX, e.clientY);

  // 触发创建事件
  emit('dropCreate', data, worldPosition);

  // 结束拖放
  dragCreate.endDrag();
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div
    ref="canvasRef"
    class="infinite-canvas"
    :class="{ 'infinite-canvas--drag-over': isDragOver }"
    :style="{ cursor: canvasCursor }"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 网格背景 -->
    <div
      v-if="uiStore.showGrid"
      class="infinite-canvas__grid"
      :style="gridStyle"
    ></div>

    <!-- 桌面层 -->
    <DesktopLayer :style="desktopStyle">
      <slot name="desktop"></slot>
    </DesktopLayer>

    <!-- 窗口层（不受缩放影响） -->
    <WindowLayer>
      <slot name="window"></slot>

      <!-- 工具窗口动态插槽转发 -->
      <template
        v-for="(_, name) in $slots"
        :key="name"
        #[name]="slotProps"
      >
        <slot :name="name" v-bind="slotProps ?? {}"></slot>
      </template>
    </WindowLayer>

    <!-- 缩放控制器 -->
    <ZoomControl
      :zoom="zoom"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @zoom-to="zoomTo"
      @reset="resetView"
      @fit="fitToContent"
    />

    <!-- 拖放预览 -->
    <DragPreview
      v-if="isDragOver && dragCreate.dragState.value.data"
      :data="dragCreate.dragState.value.data"
      :position="dragPreviewPosition"
    />
  </div>
</template>

<style scoped>
.infinite-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--chips-color-background, #fafafa);
  user-select: none;
  transition: background-color 0.2s ease;
}

.infinite-canvas--drag-over {
  background-color: var(--chips-color-primary-light, rgba(24, 144, 255, 0.05));
}

.infinite-canvas__grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-image:
    linear-gradient(to right, var(--chips-color-border, #e0e0e0) 1px, transparent 1px),
    linear-gradient(to bottom, var(--chips-color-border, #e0e0e0) 1px, transparent 1px);
}
</style>
