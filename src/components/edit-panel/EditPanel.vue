<script setup lang="ts">
/**
 * 编辑面板主组件
 * @module components/edit-panel/EditPanel
 * @description 固定在窗口层右侧，显示选中基础卡片的编辑组件
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useCardStore, useEditorStore } from '@/core/state';
import PluginHost from './PluginHost.vue';
import type { EditPanelProps, EditPanelPosition } from './types';

// ==================== Props ====================
interface Props {
  /** 面板位置 */
  position?: EditPanelPosition;
  /** 面板宽度 */
  width?: number;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'right',
  width: 320,
  defaultExpanded: true,
});

// ==================== Emits ====================
const emit = defineEmits<{
  /** 面板展开/收起 */
  'toggle': [expanded: boolean];
  /** 配置变更 */
  'config-changed': [baseCardId: string, config: Record<string, unknown>];
}>();

// ==================== Stores ====================
const cardStore = useCardStore();
const editorStore = useEditorStore();

// ==================== State ====================
/** 面板是否展开 */
const isExpanded = ref(props.defaultExpanded);

/** 是否正在切换动画 */
const isTransitioning = ref(false);

/** 面板实际宽度 */
const panelWidth = ref(props.width);

// ==================== Computed ====================
/** 当前选中的基础卡片 */
const selectedBaseCard = computed(() => {
  const activeCard = cardStore.activeCard;
  if (!activeCard || !cardStore.selectedBaseCardId) {
    return null;
  }
  return activeCard.structure.find(bc => bc.id === cardStore.selectedBaseCardId) ?? null;
});

/** 面板是否应该显示 - 总是显示（空状态或编辑组件） */
const shouldShow = computed(() => {
  return true;
});

/** 面板样式 */
const panelStyle = computed(() => {
  const width = isExpanded.value ? panelWidth.value : 0;
  return {
    '--panel-width': `${width}px`,
    width: `${panelWidth.value}px`,
  };
});

/** 面板类名 */
const panelClass = computed(() => ({
  'edit-panel': true,
  'edit-panel--expanded': isExpanded.value,
  'edit-panel--collapsed': !isExpanded.value,
  'edit-panel--transitioning': isTransitioning.value,
  [`edit-panel--${props.position}`]: true,
}));

/** 空状态提示文本 */
const emptyText = computed(() => {
  // 开发阶段使用 key，打包时替换为系统词汇编码
  return 'edit_panel.empty_hint'; // t('edit_panel.empty_hint')
});

/** 面板标题 */
const panelTitle = computed(() => {
  if (selectedBaseCard.value) {
    return selectedBaseCard.value.type;
  }
  return 'edit_panel.title'; // t('edit_panel.title')
});

// ==================== Methods ====================
/**
 * 切换面板展开状态
 */
function toggleExpand(): void {
  isExpanded.value = !isExpanded.value;
  emit('toggle', isExpanded.value);
}

/**
 * 展开面板
 */
function expand(): void {
  if (!isExpanded.value) {
    isExpanded.value = true;
    emit('toggle', true);
  }
}

/**
 * 收起面板
 */
function collapse(): void {
  if (isExpanded.value) {
    isExpanded.value = false;
    emit('toggle', false);
  }
}

/**
 * 处理配置变更
 */
function handleConfigChange(config: Record<string, unknown>): void {
  if (!cardStore.selectedBaseCardId || !cardStore.activeCardId) {
    return;
  }
  
  emit('config-changed', cardStore.selectedBaseCardId, config);
}

/**
 * 处理过渡开始
 */
function handleTransitionStart(): void {
  isTransitioning.value = true;
}

/**
 * 处理过渡结束
 */
function handleTransitionEnd(): void {
  isTransitioning.value = false;
}

// ==================== Watchers ====================
// 监听选中状态变化
watch(selectedBaseCard, (newVal, oldVal) => {
  // 选中新卡片时自动展开面板
  if (newVal && !oldVal) {
    expand();
  }
});

// 监听宽度属性变化
watch(() => props.width, (newWidth) => {
  panelWidth.value = newWidth;
});

// ==================== Lifecycle ====================
onMounted(() => {
  // 初始化完成
});

onUnmounted(() => {
  // 清理
});

// ==================== Expose ====================
defineExpose({
  isExpanded,
  expand,
  collapse,
  toggleExpand,
});
</script>

<template>
  <div
    :class="panelClass"
    role="complementary"
    aria-label="编辑面板"
  >
    <!-- 面板内容 - 直接显示插件编辑器 -->
    <div class="edit-panel__content">
      <!-- 有选中卡片时显示编辑组件 -->
      <Transition name="edit-panel-fade" mode="out-in">
        <div
          v-if="selectedBaseCard"
          :key="selectedBaseCard.id"
          class="edit-panel__editor"
        >
          <PluginHost
            :card-type="selectedBaseCard.type"
            :base-card-id="selectedBaseCard.id"
            :config="selectedBaseCard.config ?? {}"
            @config-change="handleConfigChange"
          />
        </div>
        
        <!-- 空状态 -->
        <div
          v-else
          class="edit-panel__empty"
        >
          <div class="edit-panel__empty-icon">📝</div>
          <p class="edit-panel__empty-text">选择一个基础卡片进行编辑</p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 面板容器 ==================== */
.edit-panel {
  /* 作为 ToolWindow 内容时使用相对定位 */
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--chips-color-surface, #ffffff);
  overflow: hidden;
}

.edit-panel--transitioning {
  pointer-events: none;
}

/* ==================== 头部 ==================== */
.edit-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  background: var(--chips-color-surface-variant, #f5f5f5);
  border-bottom: 1px solid var(--chips-color-border, #e0e0e0);
  flex-shrink: 0;
  min-height: 48px;
}

.edit-panel__header-content {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-xs, 4px);
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.edit-panel__title {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-semibold, 600);
  color: var(--chips-color-text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-panel__subtitle {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-secondary, #666666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==================== 操作按钮 ==================== */
.edit-panel__actions {
  display: flex;
  gap: var(--chips-spacing-xs, 4px);
  flex-shrink: 0;
}

.edit-panel__action {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color var(--chips-transition-fast, 0.15s) ease;
}

.edit-panel__action:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.05));
}

.edit-panel__action:focus-visible {
  outline: 2px solid var(--chips-color-primary, #3b82f6);
  outline-offset: 2px;
}

.edit-panel__action-icon {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #666666);
  transition: color var(--chips-transition-fast, 0.15s) ease;
}

.edit-panel__action:hover .edit-panel__action-icon {
  color: var(--chips-color-text-primary, #1a1a1a);
}

/* ==================== 内容区 ==================== */
.edit-panel__content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 编辑器容器 - 只提供空间，布局由插件控制 */
.edit-panel__editor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ==================== 空状态 ==================== */
.edit-panel__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--chips-spacing-xl, 32px);
  text-align: center;
}

.edit-panel__empty-icon {
  font-size: 48px;
  margin-bottom: var(--chips-spacing-md, 12px);
  opacity: 0.5;
}

.edit-panel__empty-text {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #666666);
  margin: 0;
  line-height: 1.5;
}

/* ==================== 过渡动画 ==================== */
/* 编辑器切换动画 */
.edit-panel-fade-enter-active,
.edit-panel-fade-leave-active {
  transition: opacity var(--chips-transition-fast, 0.15s) ease,
              transform var(--chips-transition-fast, 0.15s) ease;
}

.edit-panel-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.edit-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
