<script setup lang="ts">
/**
 * 缩放控制器组件
 * @module layouts/infinite-canvas/ZoomControl
 * @description 提供缩放控制功能，点击更多按钮展开选项
 * 
 * 设计说明：
 * - 默认只显示：滑块 + 加减号 + 更多按钮（三个点）
 * - 点击更多按钮时展开：百分比选择框 + 重置按钮 + 适应按钮
 * - 鼠标移出整个控制条后收起展开内容
 */

import { ref, computed } from 'vue';

interface Props {
  /** 当前缩放值 */
  zoom: number;
  /** 最小缩放值 */
  minZoom?: number;
  /** 最大缩放值 */
  maxZoom?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minZoom: 0.1,
  maxZoom: 5,
});

const emit = defineEmits<{
  /** 放大事件 */
  zoomIn: [];
  /** 缩小事件 */
  zoomOut: [];
  /** 缩放到指定值事件 */
  zoomTo: [value: number];
  /** 重置视图事件 */
  reset: [];
  /** 适应内容事件 */
  fit: [];
}>();

/** 是否展开更多选项 */
const isExpanded = ref(false);

/** 缩放百分比 */
const zoomPercent = computed(() => Math.round(props.zoom * 100));

/** 预设缩放值 */
const zoomPresets = [25, 50, 75, 100, 125, 150, 200, 300];

/** 是否可以放大 */
const canZoomIn = computed(() => props.zoom < props.maxZoom);

/** 是否可以缩小 */
const canZoomOut = computed(() => props.zoom > props.minZoom);

/**
 * 处理滑块变化
 */
function handleSliderChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  const value = target.valueAsNumber;
  emit('zoomTo', value / 100);
}

/**
 * 选择预设值
 */
function handlePresetSelect(e: Event): void {
  const target = e.target as HTMLSelectElement;
  const value = Number(target.value);
  emit('zoomTo', value / 100);
}

/**
 * 切换展开状态
 */
function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value;
}

/**
 * 鼠标离开 - 收起更多选项
 */
function handleMouseLeave(): void {
  isExpanded.value = false;
}
</script>

<template>
  <div
    class="zoom-control"
    @mouseleave="handleMouseLeave"
  >
    <!-- 基础控件：缩小按钮 -->
    <button
      class="zoom-control__button"
      :disabled="!canZoomOut"
      title="缩小 (Ctrl+-)"
      @click="emit('zoomOut')"
    >
      −
    </button>

    <!-- 基础控件：缩放滑块 -->
    <div class="zoom-control__slider-container">
      <input
        type="range"
        class="zoom-control__slider"
        :min="(minZoom ?? 0.1) * 100"
        :max="(maxZoom ?? 5) * 100"
        :value="zoomPercent"
        step="5"
        @input="handleSliderChange"
      />
    </div>

    <!-- 基础控件：放大按钮 -->
    <button
      class="zoom-control__button"
      :disabled="!canZoomIn"
      title="放大 (Ctrl++)"
      @click="emit('zoomIn')"
    >
      +
    </button>

    <!-- 更多按钮 -->
    <button
      class="zoom-control__button zoom-control__more"
      :class="{ 'zoom-control__more--active': isExpanded }"
      title="更多选项"
      @click="toggleExpanded"
    >
      ⋯
    </button>

    <!-- 展开内容 -->
    <Transition name="expand">
      <div v-if="isExpanded" class="zoom-control__expanded">
        <!-- 缩放百分比选择 -->
        <div class="zoom-control__value">
          <select
            :value="zoomPercent"
            class="zoom-control__select"
            @change="handlePresetSelect"
          >
            <option
              v-for="preset in zoomPresets"
              :key="preset"
              :value="preset"
            >
              {{ preset }}%
            </option>
            <option
              v-if="!zoomPresets.includes(zoomPercent)"
              :value="zoomPercent"
              selected
            >
              {{ zoomPercent }}%
            </option>
          </select>
        </div>

        <!-- 重置按钮 -->
        <button
          class="zoom-control__button zoom-control__button--text"
          title="重置视图 (Ctrl+0)"
          @click="emit('reset')"
        >
          重置
        </button>

        <!-- 适应内容按钮 -->
        <button
          class="zoom-control__button zoom-control__button--text"
          title="适应内容"
          @click="emit('fit')"
        >
          适应
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.zoom-control {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-lg, 8px);
  box-shadow: var(--chips-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
  z-index: 1000;
}

.zoom-control__button {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  background: var(--chips-color-surface-variant, #f5f5f5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--chips-color-text-primary, #1a1a1a);
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.zoom-control__button:hover:not(:disabled) {
  background: var(--chips-color-primary-light, rgba(59, 130, 246, 0.1));
  color: var(--chips-color-primary, #3b82f6);
}

.zoom-control__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-control__button--text {
  width: auto;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
}

/* 更多按钮样式 */
.zoom-control__more {
  font-size: 16px;
  letter-spacing: 1px;
}

.zoom-control__more--active {
  background: var(--chips-color-primary-light, rgba(59, 130, 246, 0.1));
  color: var(--chips-color-primary, #3b82f6);
}

.zoom-control__slider-container {
  width: 80px;
}

.zoom-control__slider {
  width: 100%;
  height: 4px;
  appearance: none;
  background: var(--chips-color-border, #e0e0e0);
  border-radius: 2px;
  cursor: pointer;
}

.zoom-control__slider::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  background: var(--chips-color-primary, #3b82f6);
  border-radius: 50%;
  cursor: pointer;
}

.zoom-control__slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  background: var(--chips-color-primary, #3b82f6);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

/* 展开区域 */
.zoom-control__expanded {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
  padding-left: 8px;
  border-left: 1px solid var(--chips-color-border, #e0e0e0);
}

.zoom-control__value {
  min-width: 56px;
}

.zoom-control__select {
  width: 100%;
  padding: 3px 6px;
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-sm, 4px);
  background: var(--chips-color-surface, #ffffff);
  font-size: 11px;
  cursor: pointer;
  color: var(--chips-color-text-primary, #1a1a1a);
}

.zoom-control__select:focus {
  outline: none;
  border-color: var(--chips-color-primary, #3b82f6);
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
