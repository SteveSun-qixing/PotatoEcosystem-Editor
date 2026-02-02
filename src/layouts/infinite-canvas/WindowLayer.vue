<script setup lang="ts">
/**
 * 窗口层组件
 * @module layouts/infinite-canvas/WindowLayer
 * @description 渲染工具窗口（不受缩放影响），集成程序坞
 */

import { computed } from 'vue';
import { ToolWindow } from '@/components/window';
import { useUIStore } from '@/core/state';
import { useWindowManager } from '@/core/window-manager';
import type { ToolWindowConfig } from '@/types';

const uiStore = useUIStore();
const windowManager = useWindowManager();

/** 获取工具窗口（在窗口层显示，不最小化的） */
const toolWindows = computed(() =>
  uiStore.toolWindows.filter((w) => w.state !== 'minimized')
);

/** 最小化的工具窗口（显示在程序坞） */
const minimizedTools = computed(() =>
  uiStore.toolWindows.filter((w) => w.state === 'minimized')
);

/**
 * 处理工具窗口更新
 * @param windowId - 窗口 ID
 * @param updates - 更新内容
 */
function handleToolWindowUpdate(windowId: string, updates: Partial<ToolWindowConfig>): void {
  windowManager.updateWindow(windowId, updates);
}

/**
 * 处理工具窗口关闭
 * @param windowId - 窗口 ID
 */
function handleToolWindowClose(windowId: string): void {
  windowManager.closeWindow(windowId);
}

/**
 * 处理工具窗口聚焦
 * @param windowId - 窗口 ID
 */
function handleToolWindowFocus(windowId: string): void {
  windowManager.focusWindow(windowId);
}

/**
 * 从程序坞恢复工具窗口
 * @param toolId - 工具窗口 ID
 */
function handleRestoreTool(toolId: string): void {
  uiStore.restoreTool(toolId);
}
</script>

<template>
  <div class="window-layer">
    <!-- 工具窗口 -->
    <ToolWindow
      v-for="window in toolWindows"
      :key="window.id"
      :config="window"
      @update:config="(updates) => handleToolWindowUpdate(window.id, updates)"
      @close="handleToolWindowClose(window.id)"
      @focus="handleToolWindowFocus(window.id)"
    >
      <!-- 动态组件插槽 -->
      <slot :name="`tool-${window.component}`" :config="window"></slot>
    </ToolWindow>

    <!-- 其他窗口层内容插槽 -->
    <slot></slot>

    <!-- 程序坞占位（Phase8 实现） -->
    <div
      v-if="minimizedTools.length > 0"
      class="window-layer__dock-placeholder"
    >
      <div
        v-for="tool in minimizedTools"
        :key="tool.id"
        class="window-layer__dock-item"
        :title="tool.title"
        @click="handleRestoreTool(tool.id)"
      >
        <span v-if="tool.icon" class="window-layer__dock-icon">{{ tool.icon }}</span>
        <span v-else class="window-layer__dock-icon">📦</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.window-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.window-layer > :deep(*) {
  pointer-events: auto;
}

/* 程序坞占位样式（Phase8 将替换为正式组件） */
.window-layer__dock-placeholder {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-lg, 8px);
  box-shadow: var(--chips-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
  pointer-events: auto;
}

.window-layer__dock-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--chips-radius-sm, 4px);
  background: var(--chips-color-surface-variant, #f5f5f5);
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
}

.window-layer__dock-item:hover {
  transform: scale(1.1);
  background: var(--chips-color-primary-light, rgba(59, 130, 246, 0.1));
}

.window-layer__dock-icon {
  font-size: 20px;
}
</style>
