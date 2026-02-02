<script setup lang="ts">
/**
 * 缩放控制器组件
 * @module layouts/infinite-canvas/ZoomControl
 * @description 提供缩放滑块、按钮和预设值选择功能
 */

import { computed } from 'vue';

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
 * @param e - 输入事件
 */
function handleSliderChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  const value = target.valueAsNumber;
  emit('zoomTo', value / 100);
}

/**
 * 选择预设值
 * @param e - 变化事件
 */
function handlePresetSelect(e: Event): void {
  const target = e.target as HTMLSelectElement;
  const value = Number(target.value);
  emit('zoomTo', value / 100);
}
</script>

<template>
  <div class="zoom-control">
    <!-- 缩小按钮 -->
    <button
      class="zoom-control__button"
      :disabled="!canZoomOut"
      :title="'缩小 (Ctrl+-)'"
      @click="emit('zoomOut')"
    >
      −
    </button>

    <!-- 缩放滑块 -->
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

    <!-- 放大按钮 -->
    <button
      class="zoom-control__button"
      :disabled="!canZoomIn"
      :title="'放大 (Ctrl++)'"
      @click="emit('zoomIn')"
    >
      +
    </button>

    <!-- 缩放百分比显示 -->
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
      :title="'重置视图 (Ctrl+0)'"
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
</template>

<style scoped>
.zoom-control {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-lg, 8px);
  box-shadow: var(--chips-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
  z-index: 1000;
}

.zoom-control__button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  background: var(--chips-color-surface-variant, #f5f5f5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  color: var(--chips-color-text-primary, #1a1a1a);
  transition: background-color 0.2s;
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
  padding: 0 12px;
  font-size: 12px;
}

.zoom-control__slider-container {
  width: 100px;
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
  width: 12px;
  height: 12px;
  background: var(--chips-color-primary, #3b82f6);
  border-radius: 50%;
  cursor: pointer;
}

.zoom-control__slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--chips-color-primary, #3b82f6);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.zoom-control__value {
  min-width: 60px;
}

.zoom-control__select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--chips-color-border, #e0e0e0);
  border-radius: var(--chips-radius-sm, 4px);
  background: var(--chips-color-surface, #ffffff);
  font-size: 12px;
  cursor: pointer;
  color: var(--chips-color-text-primary, #1a1a1a);
}

.zoom-control__select:focus {
  outline: none;
  border-color: var(--chips-color-primary, #3b82f6);
}
</style>
