<script setup lang="ts">
/**
 * 程序坞主组件
 * @module components/dock/Dock
 * @description 固定在窗口层底部/侧边，显示最小化的工具窗口图标
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

/** 获取最小化的工具窗口列表 */
const minimizedTools = computed<ToolWindowConfig[]>(() => {
  return uiStore.toolWindows.filter((w) => w.state === 'minimized');
});

/**
 * 处理恢复工具窗口
 * @param toolId - 工具窗口 ID
 */
function handleRestoreTool(toolId: string): void {
  uiStore.restoreTool(toolId);
}
</script>

<template>
  <Transition name="dock-fade">
    <div
      v-if="visible && minimizedTools.length > 0"
      :class="['dock', `dock--${position}`]"
    >
      <DockItem
        v-for="tool in minimizedTools"
        :key="tool.id"
        :tool-id="tool.id"
        :icon="tool.icon"
        :title="tool.title"
        @restore="handleRestoreTool"
      />
    </div>
  </Transition>
</template>

<style scoped>
.dock {
  position: absolute;
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-lg, 8px);
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

/* 淡入淡出动画 */
.dock-fade-enter-active,
.dock-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.dock-fade-enter-from,
.dock-fade-leave-to {
  opacity: 0;
}

.dock-fade-enter-from.dock--bottom,
.dock-fade-leave-to.dock--bottom {
  transform: translateX(-50%) translateY(20px);
}

.dock-fade-enter-from.dock--left,
.dock-fade-leave-to.dock--left {
  transform: translateY(-50%) translateX(-20px);
}

.dock-fade-enter-from.dock--right,
.dock-fade-leave-to.dock--right {
  transform: translateY(-50%) translateX(20px);
}

/* 深色主题适配 */
:global(.dark) .dock {
  background: var(--chips-color-surface-dark, #1a1a1a);
  box-shadow: var(--chips-shadow-lg-dark, 0 8px 24px rgba(0, 0, 0, 0.3));
}
</style>
