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

const uiStore = useUIStore();

/** 画布容器引用 */
const canvasRef = ref<HTMLElement | null>(null);

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
    :style="{ cursor: canvasCursor }"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
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
