<script setup lang="ts">
/**
 * 卡箱库主组件
 * @module components/card-box-library/CardBoxLibrary
 * @description 显示所有可用的卡片类型和箱子布局类型，支持拖放创建
 */

import { ref, computed, watch } from 'vue';
import CardTypeGrid from './CardTypeGrid.vue';
import LayoutTypeGrid from './LayoutTypeGrid.vue';
import { searchCardTypes, searchLayoutTypes, cardTypes, layoutTypes } from './data';
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

/** 搜索关键词 */
const searchQuery = ref('');

/** 全局拖放创建实例 */
const dragCreate = useGlobalDragCreate();

/** 过滤后的卡片类型 */
const filteredCardTypes = computed<CardTypeDefinition[]>(() => {
  return searchCardTypes(searchQuery.value);
});

/** 过滤后的布局类型 */
const filteredLayoutTypes = computed<LayoutTypeDefinition[]>(() => {
  return searchLayoutTypes(searchQuery.value);
});

/** 是否有搜索结果 */
const hasSearchResults = computed(() => {
  if (!searchQuery.value.trim()) return true;

  if (activeTab.value === 'cards') {
    return filteredCardTypes.value.length > 0;
  }
  return filteredLayoutTypes.value.length > 0;
});

/** 是否显示分类（搜索时不显示） */
const showCategories = computed(() => {
  return !searchQuery.value.trim();
});

/** 当前显示的卡片数量 */
const currentCardCount = computed(() => filteredCardTypes.value.length);

/** 当前显示的布局数量 */
const currentLayoutCount = computed(() => filteredLayoutTypes.value.length);

/**
 * 切换标签页
 */
function switchTab(tab: TabType): void {
  activeTab.value = tab;
}

/**
 * 清空搜索
 */
function clearSearch(): void {
  searchQuery.value = '';
}

/**
 * 处理拖放开始
 */
function handleDragStart(data: DragData, event: DragEvent): void {
  dragCreate.startDrag(data, event);
  emit('dragStart', data, event);
}

// 当切换标签页时，如果搜索结果为空，清空搜索
watch(activeTab, () => {
  if (!hasSearchResults.value) {
    clearSearch();
  }
});
</script>

<template>
  <div class="card-box-library">
    <!-- 搜索框 -->
    <div class="card-box-library__search">
      <span class="card-box-library__search-icon">🔍</span>
      <input
        v-model="searchQuery"
        type="text"
        class="card-box-library__search-input"
        :placeholder="activeTab === 'cards' ? '搜索卡片类型...' : '搜索布局类型...'"
      />
      <button
        v-if="searchQuery"
        class="card-box-library__search-clear"
        @click="clearSearch"
      >
        ✕
      </button>
    </div>

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
      <!-- 卡片类型网格 -->
      <CardTypeGrid
        v-if="activeTab === 'cards'"
        :types="filteredCardTypes"
        :show-categories="showCategories"
        @drag-start="handleDragStart"
      />

      <!-- 布局类型网格 -->
      <LayoutTypeGrid
        v-if="activeTab === 'boxes'"
        :types="filteredLayoutTypes"
        :show-categories="showCategories"
        @drag-start="handleDragStart"
      />

      <!-- 无搜索结果提示 -->
      <div v-if="!hasSearchResults" class="card-box-library__empty">
        <span class="card-box-library__empty-icon">🔍</span>
        <span class="card-box-library__empty-text">未找到匹配的{{ activeTab === 'cards' ? '卡片' : '布局' }}类型</span>
        <button class="card-box-library__empty-action" @click="clearSearch">
          清空搜索
        </button>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="card-box-library__hint">
      <span class="card-box-library__hint-icon">💡</span>
      <span class="card-box-library__hint-text">拖拽到画布空白区域创建新{{ activeTab === 'cards' ? '卡片' : '箱子' }}</span>
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

/* 搜索框 */
.card-box-library__search {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-sm, 8px);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  border-radius: var(--chips-border-radius-base, 8px);
  margin-bottom: var(--chips-spacing-sm, 8px);
}

.card-box-library__search-icon {
  font-size: var(--chips-font-size-sm, 14px);
  opacity: 0.6;
}

.card-box-library__search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-primary, #1a1a1a);
  outline: none;
}

.card-box-library__search-input::placeholder {
  color: var(--chips-color-text-tertiary, #999);
}

.card-box-library__search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: var(--chips-color-bg-hover, #e8e8e8);
  border-radius: 50%;
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-box-library__search-clear:hover {
  background: var(--chips-color-bg-active, #ddd);
  color: var(--chips-color-text-secondary, #666);
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

/* 滚动条样式 */
.card-box-library__content::-webkit-scrollbar {
  width: 6px;
}

.card-box-library__content::-webkit-scrollbar-track {
  background: transparent;
}

.card-box-library__content::-webkit-scrollbar-thumb {
  background-color: var(--chips-color-border, #e0e0e0);
  border-radius: 3px;
}

.card-box-library__content::-webkit-scrollbar-thumb:hover {
  background-color: var(--chips-color-text-tertiary, #999);
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
}

.card-box-library__empty-action {
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-md, 12px);
  border: 1px solid var(--chips-color-border, #e0e0e0);
  background: transparent;
  border-radius: var(--chips-border-radius-sm, 6px);
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-box-library__empty-action:hover {
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  border-color: var(--chips-color-text-tertiary, #999);
}

/* 提示信息 */
.card-box-library__hint {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-sm, 8px);
  margin-top: var(--chips-spacing-sm, 8px);
  background-color: var(--chips-color-info-light, #e6f7ff);
  border-radius: var(--chips-border-radius-sm, 6px);
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-info, #1890ff);
}

.card-box-library__hint-icon {
  font-size: var(--chips-font-size-sm, 14px);
}

.card-box-library__hint-text {
  flex: 1;
}
</style>
