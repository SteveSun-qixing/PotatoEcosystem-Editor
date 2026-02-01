<script setup lang="ts">
  /**
   * Chips Editor - 根组件
   */
  import { ref, onMounted } from 'vue';

  // 应用状态
  const isReady = ref(false);
  const errorMessage = ref<string | null>(null);

  // 重试处理
  const handleRetry = () => {
    globalThis.location.reload();
  };

  // 初始化应用
  onMounted(async () => {
    try {
      // TODO: 初始化编辑器核心
      // 模拟初始化延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      isReady.value = true;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Chips Editor] Initialization failed:', error);
    }
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
    <div
      v-else
      class="editor-container"
    >
      <!-- 编辑器内容将在后续阶段实现 -->
      <div class="welcome-message">
        <h1>Chips Editor</h1>
        <p>Card editing engine initialized successfully</p>
        <p class="version">v1.0.0</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
  #chips-editor {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-background);
  }

  /* 加载状态样式 */
  .loading-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  /* 错误状态样式 */
  .error-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg);
  }

  .error-title {
    color: var(--color-error);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-medium);
  }

  .error-message {
    color: var(--color-text-secondary);
    text-align: center;
    max-width: 400px;
  }

  .retry-button {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: var(--color-primary);
    color: var(--color-text-on-primary);
    border-radius: var(--radius-md);
    font-weight: var(--font-weight-medium);
    transition: background-color var(--transition-fast);
  }

  .retry-button:hover {
    background-color: var(--color-primary-hover);
  }

  /* 编辑器容器 */
  .editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* 欢迎信息 */
  .welcome-message {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    text-align: center;
  }

  .welcome-message h1 {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .welcome-message p {
    color: var(--color-text-secondary);
  }

  .welcome-message .version {
    font-size: var(--font-size-xs);
    color: var(--color-text-disabled);
  }
</style>
