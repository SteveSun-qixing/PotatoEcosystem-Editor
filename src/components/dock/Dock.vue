<script setup lang="ts">
/**
 * 程序坞主组件
 * @module components/dock/Dock
 * @description 固定在窗口层底部，显示所有工具窗口图标
 * 
 * 设计说明：
 * - Dock 始终显示所有工具窗口
 * - 最小化的工具显示为半透明状态
 * - 点击图标可以聚焦/恢复对应的窗口
 */

import { computed } from 'vue';
import { useUIStore } from '@/core/state';
import DockItem from './DockItem.vue';
import type { DockPosition } from '@/core/state/stores/ui';
import type { ToolWindowConfig } from '@/types';

const uiStore = useUIStore();

/** 程序坞位置 */
const position = computed<DockPosition>(() => uiStore.dockPosition);

/** 程序坞是否可见 */
const visible = computed(() => uiStore.dockVisible);

/** 获取所有工具窗口列表 */
const allTools = computed<ToolWindowConfig[]>(() => uiStore.toolWindows);

/**
 * 处理工具窗口点击
 * - 如果窗口已最小化，则恢复窗口
 * - 如果窗口已显示，则聚焦窗口
 * @param toolId - 工具窗口 ID
 */
function handleToolClick(toolId: string): void {
  const tool = uiStore.getWindow(toolId);
  if (tool?.state === 'minimized') {
    uiStore.restoreTool(toolId);
  } else {
    uiStore.focusWindow(toolId);
  }
}

/**
 * 判断工具是否已最小化
 */
function isMinimized(toolId: string): boolean {
  const tool = uiStore.getWindow(toolId);
  return tool?.state === 'minimized';
}
</script>

<template>
  <div
    v-if="visible && allTools.length > 0"
    :class="['dock', `dock--${position}`]"
  >
    <DockItem
      v-for="tool in allTools"
      :key="tool.id"
      :tool-id="tool.id"
      :icon="tool.icon"
      :title="tool.title"
      :minimized="isMinimized(tool.id)"
      @restore="handleToolClick"
    />
  </div>
</template>

<style scoped>
.dock {
  position: absolute;
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-lg, 12px);
  box-shadow: var(--chips-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12));
  pointer-events: auto;
  z-index: 1000;
  transition: opacity 0.3s, transform 0.3s;
}

/* 底部位置 */
.dock--bottom {
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row;
}

/* 左侧位置 */
.dock--left {
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
}

/* 右侧位置 */
.dock--right {
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
}

/* 深色主题适配 */
:global(.dark) .dock {
  background: var(--chips-color-surface-dark, #1a1a1a);
  box-shadow: var(--chips-shadow-lg-dark, 0 8px 24px rgba(0, 0, 0, 0.3));
}
</style>
