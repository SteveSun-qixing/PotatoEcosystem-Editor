<script setup lang="ts">
/**
 * ExportPanel 导出面板组件
 * @module components/card-settings/panels/ExportPanel
 * 
 * 只负责导出UI交互，所有业务逻辑通过 useCardExport composable 处理
 */

import { ref, watch } from 'vue';
import { useCardExport, type ExportFormat, type ExportOptions } from '@/composables/useCardExport';
import type { ChipsSDK } from '@chips/sdk';

interface Props {
  /** 卡片 ID */
  cardId: string;
  /** SDK 实例 */
  sdk: ChipsSDK;
  /** 默认导出路径 */
  defaultOutputPath?: string;
}

const props = defineProps<Props>();

// 使用 useCardExport composable
const { status, progress, message, executeExport, cancelExport, reset } = useCardExport(
  props.sdk
);

// 导出选项
const outputPath = ref(props.defaultOutputPath || '');
const selectedFormat = ref<ExportFormat>('html');

// 格式特定选项
const includeAssets = ref(true);
const compress = ref(false);
const imageFormat = ref<'png' | 'jpg'>('png');
const imageQuality = ref(90);
const scale = ref(1);
const pageFormat = ref<'a4' | 'a5' | 'letter'>('a4');
const orientation = ref<'portrait' | 'landscape'>('portrait');

// 监听默认路径变化
watch(
  () => props.defaultOutputPath,
  (newPath) => {
    if (newPath) {
      outputPath.value = newPath;
    }
  }
);

/**
 * 执行导出
 */
async function handleExport(format: ExportFormat): Promise<void> {
  if (!outputPath.value) {
    message.value = '请指定输出路径';
    return;
  }

  selectedFormat.value = format;

  // 构建导出选项
  const options: ExportOptions = {
    outputPath: outputPath.value,
  };

  // 根据格式添加特定选项
  switch (format) {
    case 'card':
      options.includeResources = true;
      options.compress = compress.value;
      break;

    case 'html':
      options.includeAssets = includeAssets.value;
      break;

    case 'pdf':
      options.pageFormat = pageFormat.value;
      options.orientation = orientation.value;
      break;

    case 'image':
      options.format = imageFormat.value;
      options.quality = imageQuality.value;
      options.scale = scale.value;
      break;
  }

  // 执行导出
  await executeExport(props.cardId, format, options);
}

/**
 * 取消导出
 */
async function handleCancel(): Promise<void> {
  const cancelled = await cancelExport();
  if (!cancelled) {
    console.warn('Failed to cancel export');
  }
}
</script>

<template>
  <div class="export-panel">
    <!-- 输出路径设置 -->
    <div class="export-panel__field">
      <label class="export-panel__label">输出路径</label>
      <input
        v-model="outputPath"
        type="text"
        class="export-panel__input"
        placeholder="指定导出文件的路径"
        :disabled="status === 'exporting'"
      />
    </div>

    <!-- 导出格式选择 -->
    <div class="export-panel__field">
      <label class="export-panel__label">导出格式</label>
      <div class="export-panel__format-grid">
        <!-- .card 文件 -->
        <button
          type="button"
          class="export-panel__format-btn"
          :disabled="status === 'exporting'"
          @click="handleExport('card')"
        >
          <span class="export-panel__format-icon">📦</span>
          <div class="export-panel__format-info">
            <span class="export-panel__format-title">卡片文件</span>
            <span class="export-panel__format-desc">.card 格式</span>
          </div>
        </button>

        <!-- HTML 网页 -->
        <button
          type="button"
          class="export-panel__format-btn"
          :disabled="status === 'exporting'"
          @click="handleExport('html')"
        >
          <span class="export-panel__format-icon">🌐</span>
          <div class="export-panel__format-info">
            <span class="export-panel__format-title">网页</span>
            <span class="export-panel__format-desc">HTML 格式</span>
          </div>
        </button>

        <!-- PDF 文档 -->
        <button
          type="button"
          class="export-panel__format-btn"
          :disabled="status === 'exporting'"
          @click="handleExport('pdf')"
        >
          <span class="export-panel__format-icon">📄</span>
          <div class="export-panel__format-info">
            <span class="export-panel__format-title">文档</span>
            <span class="export-panel__format-desc">PDF 格式</span>
          </div>
        </button>

        <!-- 图片 -->
        <button
          type="button"
          class="export-panel__format-btn"
          :disabled="status === 'exporting'"
          @click="handleExport('image')"
        >
          <span class="export-panel__format-icon">🖼️</span>
          <div class="export-panel__format-info">
            <span class="export-panel__format-title">图片</span>
            <span class="export-panel__format-desc">PNG/JPG 格式</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 格式特定选项 -->
    <div v-if="selectedFormat === 'html'" class="export-panel__options">
      <label class="export-panel__checkbox">
        <input v-model="includeAssets" type="checkbox" :disabled="status === 'exporting'" />
        <span>包含资源文件</span>
      </label>
    </div>

    <div v-if="selectedFormat === 'pdf'" class="export-panel__options">
      <div class="export-panel__option-row">
        <label class="export-panel__option-label">页面格式</label>
        <select v-model="pageFormat" class="export-panel__select" :disabled="status === 'exporting'">
          <option value="a4">A4</option>
          <option value="a5">A5</option>
          <option value="letter">Letter</option>
        </select>
      </div>
      <div class="export-panel__option-row">
        <label class="export-panel__option-label">页面方向</label>
        <select
          v-model="orientation"
          class="export-panel__select"
          :disabled="status === 'exporting'"
        >
          <option value="portrait">纵向</option>
          <option value="landscape">横向</option>
        </select>
      </div>
    </div>

    <div v-if="selectedFormat === 'image'" class="export-panel__options">
      <div class="export-panel__option-row">
        <label class="export-panel__option-label">图片格式</label>
        <select v-model="imageFormat" class="export-panel__select" :disabled="status === 'exporting'">
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
        </select>
      </div>
      <div class="export-panel__option-row">
        <label class="export-panel__option-label">缩放比例</label>
        <input
          v-model.number="scale"
          type="number"
          min="1"
          max="4"
          step="0.5"
          class="export-panel__input-small"
          :disabled="status === 'exporting'"
        />
      </div>
    </div>

    <!-- 进度显示 -->
    <div v-if="status !== 'idle'" class="export-panel__progress-container">
      <div class="export-panel__progress-bar">
        <div
          class="export-panel__progress-fill"
          :style="{ width: `${progress}%` }"
          :class="{
            'export-panel__progress-fill--success': status === 'success',
            'export-panel__progress-fill--error': status === 'error',
          }"
        ></div>
      </div>
      <p
        class="export-panel__progress-message"
        :class="{
          'export-panel__progress-message--success': status === 'success',
          'export-panel__progress-message--error': status === 'error',
        }"
      >
        {{ message }}
      </p>

      <!-- 取消按钮 -->
      <button
        v-if="status === 'exporting'"
        type="button"
        class="export-panel__cancel-btn"
        @click="handleCancel"
      >
        取消导出
      </button>
    </div>
  </div>
</template>

<style scoped>
.export-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.export-panel__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.export-panel__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #333);
}

.export-panel__input {
  padding: 8px 12px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--radius-md, 6px);
  font-size: 14px;
  transition: border-color 0.2s;
}

.export-panel__input:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
}

.export-panel__input:disabled {
  background: var(--color-bg-disabled, #f5f5f5);
  cursor: not-allowed;
}

.export-panel__format-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.export-panel__format-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid var(--color-border, #ddd);
  border-radius: var(--radius-md, 8px);
  background: var(--color-surface, #fff);
  cursor: pointer;
  transition: all 0.2s;
}

.export-panel__format-btn:hover:not(:disabled) {
  border-color: var(--color-primary, #3b82f6);
  background: var(--color-bg-hover, #f0f9ff);
}

.export-panel__format-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-panel__format-icon {
  font-size: 32px;
}

.export-panel__format-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.export-panel__format-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #333);
}

.export-panel__format-desc {
  font-size: 12px;
  color: var(--color-text-secondary, #666);
}

.export-panel__options {
  padding: 16px;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: var(--radius-md, 8px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-panel__checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.export-panel__option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.export-panel__option-label {
  font-size: 14px;
  color: var(--color-text-primary, #333);
}

.export-panel__select,
.export-panel__input-small {
  padding: 6px 10px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--radius-sm, 4px);
  font-size: 14px;
}

.export-panel__input-small {
  width: 80px;
}

.export-panel__progress-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: var(--radius-md, 8px);
}

.export-panel__progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-bg-tertiary, #e5e7eb);
  border-radius: var(--radius-full, 999px);
  overflow: hidden;
}

.export-panel__progress-fill {
  height: 100%;
  background: var(--color-primary, #3b82f6);
  transition: width 0.3s ease, background 0.3s ease;
}

.export-panel__progress-fill--success {
  background: var(--color-success, #10b981);
}

.export-panel__progress-fill--error {
  background: var(--color-error, #ef4444);
}

.export-panel__progress-message {
  font-size: 14px;
  color: var(--color-text-secondary, #666);
  text-align: center;
}

.export-panel__progress-message--success {
  color: var(--color-success, #10b981);
}

.export-panel__progress-message--error {
  color: var(--color-error, #ef4444);
}

.export-panel__cancel-btn {
  align-self: center;
  padding: 6px 16px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--radius-md, 6px);
  background: var(--color-surface, #fff);
  color: var(--color-text-primary, #333);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.export-panel__cancel-btn:hover {
  background: var(--color-bg-hover, #f5f5f5);
}
</style>
