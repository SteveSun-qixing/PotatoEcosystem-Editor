<script setup lang="ts">
/**
 * 卡片类型网格组件
 * @module components/card-box-library/CardTypeGrid
 * @description 显示 26 种基础卡片类型，支持分类显示和拖放
 */

import { computed } from 'vue';
import type { CardTypeDefinition, DragData } from './types';
import { cardCategories, getCardTypesByCategory } from './data';

interface Props {
  /** 卡片类型列表（可选，用于搜索过滤后的结果） */
  types?: CardTypeDefinition[];
  /** 是否显示分类标题 */
  showCategories?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showCategories: true,
});

const emit = defineEmits<{
  /** 拖放开始 */
  dragStart: [data: DragData, event: DragEvent];
}>();

/** 按分类组织的卡片类型 */
const categorizedTypes = computed(() => {
  if (props.types) {
    // 使用传入的类型（搜索结果）
    const categories: { category: typeof cardCategories[0]; types: CardTypeDefinition[] }[] = [];

    cardCategories.forEach((category) => {
      const typesInCategory = props.types!.filter((t) => t.category === category.id);
      if (typesInCategory.length > 0) {
        categories.push({ category, types: typesInCategory });
      }
    });

    return categories;
  }

  // 使用全部类型
  return cardCategories.map((category) => ({
    category,
    types: getCardTypesByCategory(category.id),
  }));
});

/**
 * 处理拖放开始
 */
function handleDragStart(type: CardTypeDefinition, event: DragEvent): void {
  const data: DragData = {
    type: 'card',
    typeId: type.id,
    name: type.name,
  };

  emit('dragStart', data, event);
}
</script>

<template>
  <div class="card-type-grid">
    <template v-if="showCategories">
      <div
        v-for="{ category, types: categoryTypes } in categorizedTypes"
        :key="category.id"
        class="card-type-grid__category"
      >
        <div class="card-type-grid__category-header">
          <span class="card-type-grid__category-icon">{{ category.icon }}</span>
          <span class="card-type-grid__category-name">{{ category.name }}</span>
          <span class="card-type-grid__category-count">{{ categoryTypes.length }}</span>
        </div>

        <div class="card-type-grid__items">
          <div
            v-for="type in categoryTypes"
            :key="type.id"
            class="card-type-grid__item"
            draggable="true"
            :title="type.description"
            @dragstart="handleDragStart(type, $event)"
          >
            <span class="card-type-grid__item-icon">{{ type.icon }}</span>
            <span class="card-type-grid__item-name">{{ type.name }}</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="card-type-grid__items card-type-grid__items--flat">
        <div
          v-for="type in types"
          :key="type.id"
          class="card-type-grid__item"
          draggable="true"
          :title="type.description"
          @dragstart="handleDragStart(type, $event)"
        >
          <span class="card-type-grid__item-icon">{{ type.icon }}</span>
          <span class="card-type-grid__item-name">{{ type.name }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.card-type-grid {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-md, 12px);
}

.card-type-grid__category {
  display: flex;
  flex-direction: column;
  gap: var(--chips-spacing-sm, 8px);
}

.card-type-grid__category-header {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px) 0;
  border-bottom: 1px solid var(--chips-color-border, #e0e0e0);
}

.card-type-grid__category-icon {
  font-size: var(--chips-font-size-md, 16px);
}

.card-type-grid__category-name {
  font-size: var(--chips-font-size-sm, 14px);
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-primary, #1a1a1a);
}

.card-type-grid__category-count {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
  margin-left: auto;
}

.card-type-grid__items {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--chips-spacing-sm, 8px);
}

.card-type-grid__items--flat {
  grid-template-columns: repeat(3, 1fr);
}

.card-type-grid__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-sm, 8px);
  border-radius: var(--chips-border-radius-base, 8px);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
}

.card-type-grid__item:hover {
  background-color: var(--chips-color-bg-hover, #e8e8e8);
  transform: translateY(-1px);
  box-shadow: var(--chips-shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
}

.card-type-grid__item:active {
  cursor: grabbing;
  transform: translateY(0);
}

.card-type-grid__item-icon {
  font-size: var(--chips-font-size-xl, 24px);
}

.card-type-grid__item-name {
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-secondary, #666);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
