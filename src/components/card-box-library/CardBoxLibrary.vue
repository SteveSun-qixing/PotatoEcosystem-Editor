<script setup lang="ts">
/**
 * 卡箱库主组件
 * @module components/card-box-library/CardBoxLibrary
 * @description 显示已安装的基础卡片插件和箱子布局插件，支持拖放创建
 * 
 * 设计说明：
 * - 卡箱库中的卡片类型和布局类型来自已安装的插件
 * - 插件通过内核的插件管理接口动态加载
 * - 启动时查询内核获取已安装的插件列表
 */

import { ref, computed, onMounted } from 'vue';
import CardTypeGrid from './CardTypeGrid.vue';
import LayoutTypeGrid from './LayoutTypeGrid.vue';
import { useGlobalDragCreate } from './use-drag-create';
import type { DragData, CardTypeDefinition, LayoutTypeDefinition } from './types';

/** 标签页类型 */
type TabType = 'cards' | 'boxes';

const emit = defineEmits<{
  /** 拖放开始 */
  dragStart: [data: DragData, event: DragEvent];
}>();

/** 当前激活的标签页 */
const activeTab = ref<TabType>('cards');

/** 全局拖放创建实例 */
const dragCreate = useGlobalDragCreate();

/** 加载状态 */
const isLoading = ref(true);

/** 错误信息 */
const errorMessage = ref<string | null>(null);

/** 已安装的基础卡片插件（从内核动态加载） */
const installedCardTypes = ref<CardTypeDefinition[]>([]);

/** 已安装的布局插件（从内核动态加载） */
const installedLayoutTypes = ref<LayoutTypeDefinition[]>([]);

/**
 * 从内核加载已安装的插件
 * TODO: 实际实现需要通过 SDK 连接内核的插件管理接口
 */
async function loadInstalledPlugins(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    // TODO: 通过 SDK 调用内核接口
    // const sdk = inject('sdk');
    // const cardPlugins = await sdk.plugins.list({ type: 'base-card' });
    // const layoutPlugins = await sdk.plugins.list({ type: 'layout' });
    
    // 模拟从内核获取已安装的插件
    // 当前只有富文本基础卡片插件已开发
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 只显示真正已安装的插件
    // 富文本插件信息应该从插件的 manifest.yaml 读取
    installedCardTypes.value = [
      {
        id: 'rich-text',
        name: '富文本',
        icon: '📄',
        description: '支持格式化的富文本内容',
        category: 'text',
        keywords: ['文本', '富文本', 'rich', 'text', '编辑'],
        // 插件来源信息
        pluginId: 'rich-text-basic-card-plugin',
        pluginVersion: '1.0.0',
      },
    ];
    
    // 暂时没有已安装的布局插件
    installedLayoutTypes.value = [];
    
  } catch (error) {
    console.error('[CardBoxLibrary] 加载插件失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '加载插件失败';
  } finally {
    isLoading.value = false;
  }
}

/** 卡片类型列表 */
const cardTypes = computed<CardTypeDefinition[]>(() => installedCardTypes.value);

/** 布局类型列表 */
const layoutTypes = computed<LayoutTypeDefinition[]>(() => installedLayoutTypes.value);

/** 是否有内容 */
const hasContent = computed(() => {
  if (activeTab.value === 'cards') {
    return cardTypes.value.length > 0;
  }
  return layoutTypes.value.length > 0;
});

/** 当前显示的卡片数量 */
const currentCardCount = computed(() => installedCardTypes.value.length);

/** 当前显示的布局数量 */
const currentLayoutCount = computed(() => installedLayoutTypes.value.length);

/**
 * 切换标签页
 */
function switchTab(tab: TabType): void {
  activeTab.value = tab;
}

/**
 * 处理拖放开始
 */
function handleDragStart(data: DragData, event: DragEvent): void {
  dragCreate.startDrag(data, event);
  emit('dragStart', data, event);
}

/**
 * 刷新插件列表
 */
function refreshPlugins(): void {
  loadInstalledPlugins();
}

// 组件挂载时加载插件
onMounted(() => {
  loadInstalledPlugins();
});
</script>

<template>
  <div class="card-box-library">
    <!-- 标签页 -->
    <div class="card-box-library__tabs">
      <button
        class="card-box-library__tab"
        :class="{ 'card-box-library__tab--active': activeTab === 'cards' }"
        @click="switchTab('cards')"
      >
        <span class="card-box-library__tab-icon">🃏</span>
        <span class="card-box-library__tab-label">卡片</span>
        <span class="card-box-library__tab-count">{{ currentCardCount }}</span>
      </button>
      <button
        class="card-box-library__tab"
        :class="{ 'card-box-library__tab--active': activeTab === 'boxes' }"
        @click="switchTab('boxes')"
      >
        <span class="card-box-library__tab-icon">📦</span>
        <span class="card-box-library__tab-label">箱子</span>
        <span class="card-box-library__tab-count">{{ currentLayoutCount }}</span>
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="card-box-library__content">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="card-box-library__loading">
        <span class="card-box-library__loading-spinner">⏳</span>
        <span class="card-box-library__loading-text">正在加载已安装的插件...</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="errorMessage" class="card-box-library__error">
        <span class="card-box-library__error-icon">⚠️</span>
        <span class="card-box-library__error-text">{{ errorMessage }}</span>
        <button class="card-box-library__error-action" @click="refreshPlugins">
          重试
        </button>
      </div>

      <!-- 卡片类型网格 -->
      <template v-else-if="activeTab === 'cards'">
        <CardTypeGrid
          v-if="hasContent"
          :types="cardTypes"
          :show-categories="false"
          @drag-start="handleDragStart"
        />
        
        <!-- 无已安装的卡片插件 -->
        <div v-else class="card-box-library__empty">
          <span class="card-box-library__empty-icon">📭</span>
          <span class="card-box-library__empty-text">暂无已安装的基础卡片插件</span>
          <span class="card-box-library__empty-hint">请通过应用市场安装基础卡片插件</span>
        </div>
      </template>

      <!-- 布局类型网格 -->
      <template v-else-if="activeTab === 'boxes'">
        <LayoutTypeGrid
          v-if="hasContent"
          :types="layoutTypes"
          :show-categories="false"
          @drag-start="handleDragStart"
        />
        
        <!-- 无已安装的布局插件 -->
        <div v-else class="card-box-library__empty">
          <span class="card-box-library__empty-icon">📭</span>
          <span class="card-box-library__empty-text">暂无已安装的布局插件</span>
          <span class="card-box-library__empty-hint">请通过应用市场安装布局插件</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.card-box-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 300px;
}

/* 标签页 */
.card-box-library__tabs {
  display: flex;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  border-radius: var(--chips-border-radius-base, 8px);
  margin-bottom: var(--chips-spacing-sm, 8px);
}

.card-box-library__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  border: none;
  background: transparent;
  border-radius: var(--chips-border-radius-sm, 6px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-box-library__tab:hover {
  background-color: var(--chips-color-bg-hover, #e8e8e8);
}

.card-box-library__tab--active {
  background-color: var(--chips-color-bg-base, #fff);
  color: var(--chips-color-text-primary, #1a1a1a);
  box-shadow: var(--chips-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.card-box-library__tab-icon {
  font-size: var(--chips-font-size-md, 16px);
}

.card-box-library__tab-label {
  font-weight: var(--chips-font-weight-medium, 500);
}

.card-box-library__tab-count {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  padding: 2px 6px;
  border-radius: 10px;
}

.card-box-library__tab--active .card-box-library__tab-count {
  background-color: var(--chips-color-primary-light, #e6f7ff);
  color: var(--chips-color-primary, #1890ff);
}

/* 内容区域 */
.card-box-library__content {
  flex: 1;
  overflow-y: auto;
  padding-right: var(--chips-spacing-xs, 4px);
}

/* 加载状态 */
.card-box-library__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-xl, 32px);
  color: var(--chips-color-text-tertiary, #999);
}

.card-box-library__loading-spinner {
  font-size: var(--chips-font-size-xxl, 32px);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-box-library__loading-text {
  font-size: var(--chips-font-size-sm, 14px);
}

/* 错误状态 */
.card-box-library__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-xl, 32px);
  color: var(--chips-color-error, #ff4d4f);
}

.card-box-library__error-icon {
  font-size: var(--chips-font-size-xxl, 32px);
}

.card-box-library__error-text {
  font-size: var(--chips-font-size-sm, 14px);
  text-align: center;
}

.card-box-library__error-action {
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-md, 12px);
  border: 1px solid var(--chips-color-error, #ff4d4f);
  background: transparent;
  border-radius: var(--chips-border-radius-sm, 6px);
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-error, #ff4d4f);
  cursor: pointer;
}

/* 空状态 */
.card-box-library__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-xl, 32px);
  color: var(--chips-color-text-tertiary, #999);
}

.card-box-library__empty-icon {
  font-size: var(--chips-font-size-xxl, 32px);
  opacity: 0.5;
}

.card-box-library__empty-text {
  font-size: var(--chips-font-size-sm, 14px);
  text-align: center;
}

.card-box-library__empty-hint {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-quaternary, #bbb);
}
</style>
