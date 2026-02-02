<script setup lang="ts">
/**
 * Chips Editor - 根组件
 * @module App
 * @description 编辑器应用入口，集成无限画布布局
 */

import { ref, onMounted, provide, computed } from 'vue';
import { InfiniteCanvas } from '@/layouts';
import { useEditorStore, useUIStore } from '@/core/state';

/** 编辑器状态 Store */
const editorStore = useEditorStore();
const uiStore = useUIStore();

/** 应用状态 */
const isReady = ref(false);
const errorMessage = ref<string | null>(null);

/** 当前布局类型 */
const currentLayout = computed(() => editorStore.currentLayout);

/**
 * 重试处理
 */
function handleRetry(): void {
  globalThis.location.reload();
}

/**
 * 初始化应用
 */
onMounted(async () => {
  try {
    // TODO: 初始化编辑器核心
    // 模拟初始化延迟
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 设置默认布局
    editorStore.setLayout('infinite-canvas');

    isReady.value = true;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Chips Editor] Initialization failed:', error);
  }
});

/** 提供编辑器上下文给子组件 */
provide('editorContext', {
  editorStore,
  uiStore,
});
</script>

<template>
  <div id="chips-editor">
    <!-- 加载状态 -->
    <div
      v-if="!isReady && !errorMessage"
      class="loading-container"
    >
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading Chips Editor...</p>
    </div>

    <!-- 错误状态 -->
    <div
      v-else-if="errorMessage"
      class="error-container"
    >
      <p class="error-title">Failed to load editor</p>
      <p class="error-message">{{ errorMessage }}</p>
      <button
        class="retry-button"
        @click="handleRetry"
      >
        Retry
      </button>
    </div>

    <!-- 编辑器主体 -->
    <template v-else>
      <!-- 无限画布布局 -->
      <InfiniteCanvas v-if="currentLayout === 'infinite-canvas'">
        <template #desktop>
          <!-- 桌面内容由 DesktopLayer 管理 -->
        </template>

        <template #window>
          <!-- 工具窗口内容 -->
          <!-- 文件管理器（Phase5 实现） -->
          <!-- 编辑面板（Phase6 实现） -->
          <!-- 卡箱库（Phase7 实现） -->
        </template>
      </InfiniteCanvas>

      <!-- 工作台布局（Phase9 实现） -->
      <!-- <Workbench v-else-if="currentLayout === 'workbench'" /> -->

      <!-- 未知布局回退 -->
      <div
        v-else
        class="unknown-layout"
      >
        <p>Unknown layout: {{ currentLayout }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
#chips-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--chips-color-background, #fafafa);
}

/* 加载状态样式 */
.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-md, 16px);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--chips-color-border, #e0e0e0);
  border-top-color: var(--chips-color-primary, #3b82f6);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: var(--chips-color-text-secondary, #666666);
  font-size: var(--chips-font-size-sm, 14px);
}

/* 错误状态样式 */
.error-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-lg, 24px);
}

.error-title {
  color: var(--chips-color-error, #ef4444);
  font-size: var(--chips-font-size-lg, 18px);
  font-weight: var(--chips-font-weight-medium, 500);
}

.error-message {
  color: var(--chips-color-text-secondary, #666666);
  text-align: center;
  max-width: 400px;
}

.retry-button {
  margin-top: var(--chips-spacing-md, 16px);
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-lg, 24px);
  background-color: var(--chips-color-primary, #3b82f6);
  color: var(--chips-color-text-on-primary, #ffffff);
  border: none;
  border-radius: var(--chips-radius-md, 6px);
  font-weight: var(--chips-font-weight-medium, 500);
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: var(--chips-color-primary-hover, #2563eb);
}

/* 未知布局回退 */
.unknown-layout {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--chips-color-text-secondary, #666666);
}
</style>
