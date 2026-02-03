<script setup lang="ts">
/**
 * 卡片窗口组件
 * @module components/window/CardWindow
 * @description 用于显示和编辑卡片内容的窗口组件
 */

import { ref, computed } from 'vue';
import CardWindowBase from './CardWindowBase.vue';
import WindowMenu from './WindowMenu.vue';
import { CardSettingsDialog } from '@/components/card-settings';
import { useCardStore } from '@/core/state';
import { useWorkspaceService } from '@/core/workspace-service';
import type { CardWindowConfig, WindowPosition, WindowSize } from '@/types';

interface Props {
  /** 窗口配置 */
  config: CardWindowConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 关闭窗口 */
  close: [];
  /** 聚焦窗口 */
  focus: [];
  /** 更新配置 */
  'update:config': [config: Partial<CardWindowConfig>];
}>();

const cardStore = useCardStore();
const workspaceService = useWorkspaceService();

/** 获取卡片信息 */
const cardInfo = computed(() => cardStore.openCards.get(props.config.cardId));

/** 是否正在编辑 */
const isEditing = computed(() => props.config.isEditing);

/** 窗口状态 */
const windowState = computed(() => props.config.state);

/** 封面比例选项（预留用于封面比例选择器） */
const _COVER_RATIOS = [
  { value: '1:1', label: '正方形' },
  { value: '3:4', label: '标准照片' },
  { value: '9:16', label: '手机比例' },
  { value: '16:9', label: '视频比例' },
] as const;

/**
 * 切换编辑模式
 */
function toggleEditMode(): void {
  emit('update:config', { isEditing: !isEditing.value });
}

/**
 * 切换到封面模式
 */
function switchToCover(): void {
  emit('update:config', { state: 'cover' });
}

/**
 * 从封面恢复
 */
function restoreFromCover(): void {
  emit('update:config', { state: 'normal' });
}

/**
 * 设置封面比例（预留用于封面比例选择器）
 */
function _setCoverRatio(ratio: string): void {
  emit('update:config', { coverRatio: ratio });
}

/**
 * 更新位置
 */
function updatePosition(position: WindowPosition): void {
  emit('update:config', { position });
}

/**
 * 更新大小
 */
function updateSize(size: WindowSize): void {
  emit('update:config', { size });
}

/**
 * 更新标题
 * 同时更新 cardStore 和 workspaceService，保持数据同步
 */
function updateTitle(title: string): void {
  if (cardInfo.value) {
    // 更新卡片元数据
    cardStore.updateCardMetadata(props.config.cardId, { name: title });
    
    // 同步更新工作区文件名（使用相同的 cardId 作为文件 ID）
    workspaceService.renameFile(props.config.cardId, `${title}.card`);
    
    console.log('[CardWindow] 更新卡片名称:', title, 'ID:', props.config.cardId);
  }
}

/**
 * 关闭窗口
 */
function handleClose(): void {
  emit('close');
}

/**
 * 最小化
 */
function handleMinimize(): void {
  emit('update:config', { state: 'minimized' });
}

/**
 * 收起/展开
 */
function handleCollapse(): void {
  const newState = windowState.value === 'collapsed' ? 'normal' : 'collapsed';
  emit('update:config', { state: newState });
}

/**
 * 聚焦窗口
 */
function handleFocus(): void {
  emit('focus');
}

/** 设置对话框可见状态 */
const showSettingsDialog = ref(false);

/**
 * 打开设置对话框
 */
function handleSettings(): void {
  showSettingsDialog.value = true;
}

/**
 * 关闭设置对话框
 */
function handleCloseSettings(): void {
  showSettingsDialog.value = false;
}

/**
 * 选择基础卡片
 * 同时设置活动卡片，确保编辑面板能正确显示
 */
function selectBaseCard(baseCardId: string): void {
  // 先设置活动卡片
  cardStore.setActiveCard(props.config.cardId);
  // 再设置选中的基础卡片
  cardStore.setSelectedBaseCard(baseCardId);
  
  console.log('[CardWindow] 选中基础卡片:', baseCardId, '卡片ID:', props.config.cardId);
}

/**
 * 获取封面比例样式
 */
function getCoverAspectRatio(ratio?: string): string {
  return ratio?.replace(':', '/') || '3/4';
}

/**
 * 获取基础卡片类型名称
 */
function getBaseCardTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    'rich-text': '富文本',
    'markdown': 'Markdown',
    'image': '图片',
    'video': '视频',
    'audio': '音频',
    'code': '代码',
    'list': '列表',
  };
  return typeNames[type] || type;
}
</script>

<template>
  <!-- 封面模式 -->
  <div
    v-if="windowState === 'cover'"
    class="card-cover"
    :style="{ transform: `translate(${config.position.x}px, ${config.position.y}px)` }"
    @click="restoreFromCover"
  >
    <div
      class="card-cover__image"
      :style="{ aspectRatio: getCoverAspectRatio(config.coverRatio) }"
    >
      <!-- 封面内容由渲染器提供 -->
      <slot name="cover">
        <div class="card-cover__placeholder">
          {{ cardInfo?.metadata.name || '未命名卡片' }}
        </div>
      </slot>
    </div>
    <div class="card-cover__title">
      {{ cardInfo?.metadata.name || '未命名卡片' }}
    </div>
  </div>

  <!-- 正常窗口模式 -->
  <CardWindowBase
    v-else
    :config="config"
    @update:position="updatePosition"
    @update:size="updateSize"
    @focus="handleFocus"
    @close="handleClose"
    @minimize="handleMinimize"
    @collapse="handleCollapse"
  >
    <template #header>
      <WindowMenu
        :title="cardInfo?.metadata.name || '未命名卡片'"
        :is-editing="isEditing"
        :show-lock="true"
        :show-cover="true"
        :show-settings="true"
        @toggle-edit="toggleEditMode"
        @switch-to-cover="switchToCover"
        @settings="handleSettings"
        @update:title="updateTitle"
      />
    </template>

    <template #default>
      <div class="card-window__content">
        <!-- 卡片内容由渲染器提供 -->
        <slot>
          <div v-if="cardInfo?.isLoading" class="card-window__loading">
            <span class="card-window__loading-icon">⏳</span>
            <span class="card-window__loading-text">加载中...</span>
          </div>
          <div v-else class="card-window__body">
            <!-- 基础卡片列表 -->
            <div
              v-for="baseCard in cardInfo?.structure"
              :key="baseCard.id"
              class="card-window__base-card"
              :class="{
                'card-window__base-card--selected': cardStore.selectedBaseCardId === baseCard.id,
                'card-window__base-card--editing': isEditing,
              }"
              @click="selectBaseCard(baseCard.id)"
            >
              <div class="card-window__base-card-content">
                <!-- 富文本基础卡片预览 -->
                <div 
                  v-if="baseCard.type === 'rich-text'"
                  class="card-window__base-card-preview"
                >
                  <div 
                    class="card-window__richtext-preview"
                    v-html="baseCard.config?.content_text || '<p>点击编辑内容...</p>'"
                  ></div>
                </div>
                <!-- 其他类型卡片占位符 -->
                <div v-else class="card-window__base-card-placeholder">
                  <span class="card-window__base-card-type-icon">📄</span>
                  <span>{{ getBaseCardTypeName(baseCard.type) }}</span>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div
              v-if="!cardInfo?.structure?.length"
              class="card-window__empty"
            >
              <span class="card-window__empty-icon">📄</span>
              <span class="card-window__empty-text">暂无内容</span>
              <span v-if="isEditing" class="card-window__empty-hint">
                从卡箱库拖拽基础卡片到此处
              </span>
            </div>
          </div>
        </slot>
      </div>
    </template>
  </CardWindowBase>

  <!-- 卡片设置对话框 -->
  <CardSettingsDialog
    :card-id="config.cardId"
    :visible="showSettingsDialog"
    @close="handleCloseSettings"
    @save="handleCloseSettings"
  />
</template>

<style scoped>
/* 封面模式样式 */
.card-cover {
  position: absolute;
  cursor: pointer;
  transition: transform var(--chips-transition-fast, 0.15s) ease;
}

.card-cover:hover {
  transform: scale(1.02);
}

.card-cover__image {
  width: 200px;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-md, 8px);
  overflow: hidden;
  box-shadow: var(--chips-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
  transition: box-shadow var(--chips-transition-fast, 0.15s) ease;
}

.card-cover:hover .card-cover__image {
  box-shadow: var(--chips-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.15));
}

.card-cover__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--chips-color-surface-variant, #f5f5f5);
  color: var(--chips-color-text-secondary, #666666);
  padding: var(--chips-spacing-md, 12px);
  text-align: center;
  font-size: var(--chips-font-size-sm, 14px);
}

.card-cover__title {
  margin-top: var(--chips-spacing-sm, 8px);
  text-align: center;
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-secondary, #666666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* 窗口内容样式 */
.card-window__content {
  padding: var(--chips-spacing-md, 16px);
}

.card-window__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: var(--chips-spacing-sm, 8px);
}

.card-window__loading-icon {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-window__loading-text {
  color: var(--chips-color-text-secondary, #666666);
  font-size: var(--chips-font-size-sm, 14px);
}

.card-window__body {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-md, 12px);
}

/* 基础卡片样式 */
.card-window__base-card {
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-sm, 6px);
  overflow: hidden;
  transition: border-color var(--chips-transition-fast, 0.15s) ease,
              box-shadow var(--chips-transition-fast, 0.15s) ease;
}

.card-window__base-card--editing {
  cursor: pointer;
}

.card-window__base-card--editing:hover {
  border-color: var(--chips-color-primary, #3b82f6);
}

.card-window__base-card--selected {
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 2px var(--chips-color-primary-light, rgba(59, 130, 246, 0.2));
}

.card-window__base-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  background: var(--chips-color-surface-variant, #f5f5f5);
  font-size: var(--chips-font-size-xs, 12px);
}

.card-window__base-card-type {
  color: var(--chips-color-text-primary, #1a1a1a);
  font-weight: var(--chips-font-weight-medium, 500);
}

.card-window__base-card-id {
  color: var(--chips-color-text-tertiary, #999999);
  font-family: monospace;
}

.card-window__base-card-content {
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
}

.card-window__base-card-preview {
  min-height: 40px;
}

.card-window__richtext-preview {
  font-size: var(--chips-font-size-sm, 14px);
  line-height: 1.6;
  color: var(--chips-color-text-primary, #1a1a1a);
}

/* 使用 :deep() 让样式穿透到 v-html 渲染的内容 */
.card-window__richtext-preview :deep(p) {
  margin: 0.5em 0;
}

.card-window__richtext-preview :deep(p:first-child) {
  margin-top: 0;
}

.card-window__richtext-preview :deep(p:last-child) {
  margin-bottom: 0;
}

/* 文本格式样式 */
.card-window__richtext-preview :deep(b),
.card-window__richtext-preview :deep(strong) {
  font-weight: bold;
}

.card-window__richtext-preview :deep(i),
.card-window__richtext-preview :deep(em) {
  font-style: italic;
}

.card-window__richtext-preview :deep(u) {
  text-decoration: underline;
}

.card-window__richtext-preview :deep(s),
.card-window__richtext-preview :deep(strike),
.card-window__richtext-preview :deep(del) {
  text-decoration: line-through;
}

.card-window__richtext-preview :deep(sub) {
  vertical-align: sub;
  font-size: smaller;
}

.card-window__richtext-preview :deep(sup) {
  vertical-align: super;
  font-size: smaller;
}

.card-window__richtext-preview :deep(code) {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

/* 列表样式 */
.card-window__richtext-preview :deep(ul),
.card-window__richtext-preview :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.card-window__richtext-preview :deep(ol) {
  list-style-type: decimal;
}

.card-window__richtext-preview :deep(ul) {
  list-style-type: disc;
}

.card-window__richtext-preview :deep(li) {
  margin: 0.25em 0;
}

/* 标题样式 */
.card-window__richtext-preview :deep(h1),
.card-window__richtext-preview :deep(h2),
.card-window__richtext-preview :deep(h3),
.card-window__richtext-preview :deep(h4),
.card-window__richtext-preview :deep(h5),
.card-window__richtext-preview :deep(h6) {
  margin: 0.5em 0;
  font-weight: bold;
}

.card-window__richtext-preview :deep(h1) { font-size: 1.5em; }
.card-window__richtext-preview :deep(h2) { font-size: 1.3em; }
.card-window__richtext-preview :deep(h3) { font-size: 1.1em; }
.card-window__richtext-preview :deep(h4) { font-size: 1em; }
.card-window__richtext-preview :deep(h5) { font-size: 0.9em; }
.card-window__richtext-preview :deep(h6) { font-size: 0.8em; }

/* 引用样式 */
.card-window__richtext-preview :deep(blockquote) {
  margin: 0.5em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--chips-color-border, #ddd);
  background: var(--chips-color-surface-variant, #f5f5f5);
}

/* 链接样式 */
.card-window__richtext-preview :deep(a) {
  color: var(--chips-color-primary, #3b82f6);
  text-decoration: underline;
}

/* 图片样式 */
.card-window__richtext-preview :deep(img) {
  max-width: 100%;
  height: auto;
}

/* 分割线样式 */
.card-window__richtext-preview :deep(hr) {
  border: none;
  border-top: 1px solid var(--chips-color-border, #ddd);
  margin: 0.5em 0;
}

/* 对齐样式 */
.card-window__richtext-preview :deep([style*="text-align: center"]),
.card-window__richtext-preview :deep([align="center"]) {
  text-align: center;
}

.card-window__richtext-preview :deep([style*="text-align: right"]),
.card-window__richtext-preview :deep([align="right"]) {
  text-align: right;
}

.card-window__richtext-preview :deep([style*="text-align: justify"]) {
  text-align: justify;
}

.card-window__base-card-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-md, 16px);
  text-align: center;
  color: var(--chips-color-text-secondary, #666666);
  background: var(--chips-color-surface-variant, #f5f5f5);
  border-radius: var(--chips-radius-sm, 4px);
}

.card-window__base-card-type-icon {
  font-size: 24px;
  opacity: 0.6;
}

/* 空状态样式 */
.card-window__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--chips-spacing-xl, 48px) var(--chips-spacing-md, 16px);
  text-align: center;
  gap: var(--chips-spacing-sm, 8px);
}

.card-window__empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.card-window__empty-text {
  font-size: var(--chips-font-size-md, 16px);
  color: var(--chips-color-text-secondary, #666666);
}

.card-window__empty-hint {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-tertiary, #999999);
}
</style>
