<script setup lang="ts">
/**
 * 程序坞项组件
 * @module components/dock/DockItem
 * @description 单个工具图标，支持悬停提示和点击恢复
 */

import { computed } from 'vue';

interface Props {
  /** 工具窗口 ID */
  toolId: string;
  /** 工具图标 */
  icon?: string;
  /** 工具标题 */
  title: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 点击恢复窗口 */
  restore: [toolId: string];
}>();

/** 默认图标 */
const displayIcon = computed(() => props.icon || '📦');

/**
 * 处理点击事件
 */
function handleClick(): void {
  emit('restore', props.toolId);
}
</script>

<template>
  <div
    class="dock-item"
    :title="title"
    @click="handleClick"
  >
    <span class="dock-item__icon">{{ displayIcon }}</span>
    <div class="dock-item__tooltip">{{ title }}</div>
  </div>
</template>

<style scoped>
.dock-item {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--chips-radius-md, 6px);
  background: var(--chips-color-surface-variant, #f5f5f5);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.2s;
  user-select: none;
}

.dock-item:hover {
  transform: scale(1.15) translateY(-4px);
  background: var(--chips-color-primary-light, rgba(59, 130, 246, 0.1));
}

.dock-item:active {
  transform: scale(1.05) translateY(-2px);
}

.dock-item__icon {
  font-size: 24px;
  line-height: 1;
  transition: transform 0.2s;
}

.dock-item:hover .dock-item__icon {
  transform: scale(1.1);
}

.dock-item__tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  padding: 4px 8px;
  background: var(--chips-color-surface-elevated, rgba(0, 0, 0, 0.8));
  color: var(--chips-color-text-on-dark, #ffffff);
  border-radius: var(--chips-radius-sm, 4px);
  font-size: var(--chips-font-size-xs, 12px);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}

.dock-item:hover .dock-item__tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* 深色主题适配 */
:global(.dark) .dock-item {
  background: var(--chips-color-surface-variant-dark, #2a2a2a);
}

:global(.dark) .dock-item:hover {
  background: var(--chips-color-primary-light-dark, rgba(59, 130, 246, 0.2));
}
</style>
