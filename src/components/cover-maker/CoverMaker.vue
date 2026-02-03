<script setup lang="ts">
/**
 * 封面快速制作器组件
 * @module components/cover-maker/CoverMaker
 * @description 提供四种封面创建方式：选择图片、粘贴HTML、上传ZIP、快速模板
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type {
  CoverCreationMode,
  TemplateStyle,
  TemplateConfig,
  CoverData,
} from './types';
import TemplateGrid from './TemplateGrid.vue';
import TemplatePreview from './TemplatePreview.vue';
import { generateImageCoverHtml } from './templates';

interface Props {
  /** 卡片 ID */
  cardId: string;
  /** 当前封面 HTML（可选，用于编辑） */
  currentCoverHtml?: string;
  /** 是否显示 */
  visible: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 关闭 */
  close: [];
  /** 保存封面 */
  save: [data: CoverData];
  /** 预览封面 */
  preview: [html: string];
}>();

// ============ 状态 ============

/** 当前创建模式 */
const currentMode = ref<CoverCreationMode>('template');

/** 模式选项 */
const modeOptions: { id: CoverCreationMode; name: string; icon: string; description: string }[] = [
  { id: 'image', name: '选择图片', icon: '🖼️', description: '从本地选择图片文件' },
  { id: 'html', name: '粘贴代码', icon: '📝', description: '直接粘贴 HTML 代码' },
  { id: 'zip', name: '上传压缩包', icon: '📦', description: '上传包含网页的 ZIP' },
  { id: 'template', name: '快速制作', icon: '🎨', description: '选择模板快速生成' },
];

// --- 图片模式状态 ---
const selectedImage = ref<File | null>(null);
const imagePreviewUrl = ref<string | null>(null);

// --- HTML 模式状态 ---
const htmlCode = ref('');

// --- ZIP 模式状态 ---
const selectedZip = ref<File | null>(null);
const zipFileName = ref<string | null>(null);

// --- 模板模式状态 ---
const selectedTemplate = ref<TemplateStyle | null>('minimal-white');
const templateConfig = ref<TemplateConfig>({
  title: '',
  subtitle: '',
  author: '',
  date: '',
});

/** 生成的 HTML 内容（用于模板模式） */
const generatedHtml = ref<string>('');

/** 封面比例选项 */
const coverRatios = [
  { value: '1/1', label: '正方形 (1:1)' },
  { value: '3/4', label: '标准照片 (3:4)' },
  { value: '4/3', label: '横版照片 (4:3)' },
  { value: '9/16', label: '手机比例 (9:16)' },
  { value: '16/9', label: '视频比例 (16:9)' },
  { value: '2/3', label: '书本比例 (2:3)' },
];
const selectedRatio = ref('3/4');

// ============ 计算属性 ============

/** 是否可以保存 */
const canSave = computed(() => {
  switch (currentMode.value) {
    case 'image':
      return selectedImage.value !== null;
    case 'html':
      return htmlCode.value.trim().length > 0;
    case 'zip':
      return selectedZip.value !== null;
    case 'template':
      return selectedTemplate.value !== null && templateConfig.value.title.trim().length > 0;
    default:
      return false;
  }
});

/** 预览 HTML 内容 */
const previewHtml = computed(() => {
  switch (currentMode.value) {
    case 'image':
      if (imagePreviewUrl.value) {
        return generateImageCoverHtml(imagePreviewUrl.value);
      }
      return '';
    case 'html':
      return htmlCode.value;
    case 'template':
      return generatedHtml.value;
    default:
      return '';
  }
});

// ============ 方法 ============

/**
 * 切换创建模式
 */
function switchMode(mode: CoverCreationMode): void {
  currentMode.value = mode;
}

/**
 * 处理图片选择
 */
function handleImageSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (file && file.type.startsWith('image/')) {
    selectedImage.value = file;
    
    // 创建预览 URL
    if (imagePreviewUrl.value) {
      URL.revokeObjectURL(imagePreviewUrl.value);
    }
    imagePreviewUrl.value = URL.createObjectURL(file);
  }
}

/**
 * 清除选中的图片
 */
function clearImage(): void {
  selectedImage.value = null;
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
    imagePreviewUrl.value = null;
  }
}

/**
 * 处理 ZIP 选择
 */
function handleZipSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (file && (file.type === 'application/zip' || file.name.endsWith('.zip'))) {
    selectedZip.value = file;
    zipFileName.value = file.name;
  }
}

/**
 * 清除选中的 ZIP
 */
function clearZip(): void {
  selectedZip.value = null;
  zipFileName.value = null;
}

/**
 * 处理模板生成的 HTML
 */
function handleHtmlGenerated(html: string): void {
  generatedHtml.value = html;
}

/**
 * 处理保存
 */
async function handleSave(): Promise<void> {
  if (!canSave.value) return;
  
  let coverData: CoverData;
  
  switch (currentMode.value) {
    case 'image':
      if (!selectedImage.value) return;
      const imageBuffer = await selectedImage.value.arrayBuffer();
      coverData = {
        mode: 'image',
        imageData: {
          filename: selectedImage.value.name,
          data: new Uint8Array(imageBuffer),
          mimeType: selectedImage.value.type,
        },
      };
      break;
      
    case 'html':
      coverData = {
        mode: 'html',
        htmlContent: htmlCode.value,
      };
      break;
      
    case 'zip':
      if (!selectedZip.value) return;
      const zipBuffer = await selectedZip.value.arrayBuffer();
      coverData = {
        mode: 'zip',
        zipData: {
          data: new Uint8Array(zipBuffer),
          entryFile: 'index.html',
        },
      };
      break;
      
    case 'template':
      if (!selectedTemplate.value) return;
      coverData = {
        mode: 'template',
        htmlContent: generatedHtml.value,
        templateConfig: {
          templateId: selectedTemplate.value,
          config: { ...templateConfig.value },
        },
      };
      break;
      
    default:
      return;
  }
  
  emit('save', coverData);
  emit('close');
}

/**
 * 处理取消
 */
function handleCancel(): void {
  emit('close');
}

/**
 * 处理点击遮罩关闭
 */
function handleOverlayClick(event: MouseEvent): void {
  if ((event.target as HTMLElement).classList.contains('cover-maker-overlay')) {
    handleCancel();
  }
}

/**
 * 处理全局键盘事件
 */
function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.visible) {
    handleCancel();
  }
}

// ============ 生命周期 ============

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      // 重置状态
      // 保持上次选择的模式
    }
  }
);

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  // 清理图片预览 URL
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="cover-maker-overlay"
        @click="handleOverlayClick"
      >
        <div class="cover-maker">
          <!-- 头部 -->
          <div class="cover-maker__header">
            <h2 class="cover-maker__title">封面制作器</h2>
            <button
              class="cover-maker__close"
              type="button"
              aria-label="关闭"
              @click="handleCancel"
            >
              ✕
            </button>
          </div>

          <!-- 模式选择 -->
          <div class="cover-maker__modes">
            <button
              v-for="mode in modeOptions"
              :key="mode.id"
              type="button"
              :class="[
                'cover-maker__mode-btn',
                { 'cover-maker__mode-btn--active': currentMode === mode.id }
              ]"
              @click="switchMode(mode.id)"
            >
              <span class="cover-maker__mode-icon">{{ mode.icon }}</span>
              <span class="cover-maker__mode-name">{{ mode.name }}</span>
            </button>
          </div>

          <!-- 内容区域 -->
          <div class="cover-maker__content">
            <!-- 左侧：表单 -->
            <div class="cover-maker__form">
              <!-- 图片模式 -->
              <div v-if="currentMode === 'image'" class="cover-maker__section">
                <p class="cover-maker__description">
                  选择一张图片作为封面，图片将保存到卡片的 cardcover 文件夹中。
                </p>
                
                <div class="cover-maker__upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    class="cover-maker__file-input"
                    @change="handleImageSelect"
                  />
                  <div v-if="!selectedImage" class="cover-maker__upload-placeholder">
                    <span class="cover-maker__upload-icon">🖼️</span>
                    <span class="cover-maker__upload-text">点击或拖放图片到此处</span>
                    <span class="cover-maker__upload-hint">支持 JPG、PNG、GIF、WebP</span>
                  </div>
                  <div v-else class="cover-maker__upload-selected">
                    <img
                      v-if="imagePreviewUrl"
                      :src="imagePreviewUrl"
                      class="cover-maker__image-thumb"
                      alt="预览"
                    />
                    <div class="cover-maker__file-info">
                      <span class="cover-maker__file-name">{{ selectedImage.name }}</span>
                      <button
                        type="button"
                        class="cover-maker__file-remove"
                        @click="clearImage"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- HTML 模式 -->
              <div v-if="currentMode === 'html'" class="cover-maker__section">
                <p class="cover-maker__description">
                  直接粘贴 HTML 代码作为封面，适合有前端开发经验的用户。
                </p>
                
                <div class="cover-maker__field">
                  <label class="cover-maker__label">HTML 代码</label>
                  <textarea
                    v-model="htmlCode"
                    class="cover-maker__code-input"
                    placeholder="在此粘贴 HTML 代码..."
                    rows="12"
                    spellcheck="false"
                  />
                </div>
              </div>

              <!-- ZIP 模式 -->
              <div v-if="currentMode === 'zip'" class="cover-maker__section">
                <p class="cover-maker__description">
                  上传包含网页文件的 ZIP 压缩包，系统将解压到 cardcover 文件夹，并使用其中的 index.html 作为封面入口。
                </p>
                
                <div class="cover-maker__upload-area">
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    class="cover-maker__file-input"
                    @change="handleZipSelect"
                  />
                  <div v-if="!selectedZip" class="cover-maker__upload-placeholder">
                    <span class="cover-maker__upload-icon">📦</span>
                    <span class="cover-maker__upload-text">点击或拖放 ZIP 文件到此处</span>
                    <span class="cover-maker__upload-hint">压缩包内需包含 index.html</span>
                  </div>
                  <div v-else class="cover-maker__upload-selected">
                    <span class="cover-maker__zip-icon">📦</span>
                    <div class="cover-maker__file-info">
                      <span class="cover-maker__file-name">{{ zipFileName }}</span>
                      <button
                        type="button"
                        class="cover-maker__file-remove"
                        @click="clearZip"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                </div>
                
                <div class="cover-maker__notice">
                  <span class="cover-maker__notice-icon">ℹ️</span>
                  <span class="cover-maker__notice-text">
                    ZIP 压缩包将解压到 cardcover/ 目录，封面入口文件必须命名为 index.html
                  </span>
                </div>
              </div>

              <!-- 模板模式 -->
              <div v-if="currentMode === 'template'" class="cover-maker__section">
                <p class="cover-maker__description">
                  从预设模板中选择一个风格，填写文字内容，快速生成封面。
                </p>

                <!-- 模板选择 -->
                <div class="cover-maker__field">
                  <label class="cover-maker__label">选择模板风格</label>
                  <TemplateGrid v-model="selectedTemplate" />
                </div>

                <!-- 内容填写 -->
                <div class="cover-maker__field">
                  <label class="cover-maker__label">
                    主标题
                    <span class="cover-maker__required">*</span>
                  </label>
                  <input
                    v-model="templateConfig.title"
                    type="text"
                    class="cover-maker__input"
                    placeholder="输入封面主标题"
                  />
                </div>

                <div class="cover-maker__field">
                  <label class="cover-maker__label">副标题</label>
                  <input
                    v-model="templateConfig.subtitle"
                    type="text"
                    class="cover-maker__input"
                    placeholder="输入副标题（可选）"
                  />
                </div>

                <div class="cover-maker__field-row">
                  <div class="cover-maker__field">
                    <label class="cover-maker__label">作者</label>
                    <input
                      v-model="templateConfig.author"
                      type="text"
                      class="cover-maker__input"
                      placeholder="作者名称"
                    />
                  </div>
                  <div class="cover-maker__field">
                    <label class="cover-maker__label">日期</label>
                    <input
                      v-model="templateConfig.date"
                      type="text"
                      class="cover-maker__input"
                      placeholder="如 2026-02-03"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：预览 -->
            <div class="cover-maker__preview-panel">
              <div class="cover-maker__preview-header">
                <label class="cover-maker__label">封面比例</label>
                <select v-model="selectedRatio" class="cover-maker__select">
                  <option
                    v-for="ratio in coverRatios"
                    :key="ratio.value"
                    :value="ratio.value"
                  >
                    {{ ratio.label }}
                  </option>
                </select>
              </div>

              <TemplatePreview
                v-if="currentMode === 'template'"
                :template-id="selectedTemplate"
                :config="templateConfig"
                :aspect-ratio="selectedRatio"
                @html-generated="handleHtmlGenerated"
              />
              
              <TemplatePreview
                v-else-if="currentMode === 'html'"
                :template-id="null"
                :config="{ title: '' }"
                :custom-html="htmlCode"
                :aspect-ratio="selectedRatio"
              />
              
              <TemplatePreview
                v-else-if="currentMode === 'image' && imagePreviewUrl"
                :template-id="null"
                :config="{ title: '' }"
                :custom-html="previewHtml"
                :aspect-ratio="selectedRatio"
              />
              
              <div v-else class="cover-maker__preview-placeholder">
                <span class="cover-maker__preview-placeholder-icon">👁️</span>
                <span class="cover-maker__preview-placeholder-text">
                  {{ currentMode === 'zip' ? '上传 ZIP 后自动预览' : '选择内容后预览' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 底部 -->
          <div class="cover-maker__footer">
            <button
              type="button"
              class="cover-maker__btn cover-maker__btn--secondary"
              @click="handleCancel"
            >
              取消
            </button>
            <button
              type="button"
              class="cover-maker__btn cover-maker__btn--primary"
              :disabled="!canSave"
              @click="handleSave"
            >
              保存封面
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cover-maker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.cover-maker {
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-lg, 12px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cover-maker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--chips-color-border, #e5e5e5);
}

.cover-maker__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--chips-color-text-primary, #1a1a1a);
  margin: 0;
}

.cover-maker__close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--chips-radius-sm, 4px);
  cursor: pointer;
  font-size: 16px;
  color: var(--chips-color-text-secondary, #666);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
}

.cover-maker__close:hover {
  background: var(--chips-color-surface-hover, rgba(0, 0, 0, 0.05));
}

.cover-maker__modes {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--chips-color-border, #e5e5e5);
  background: var(--chips-color-surface-secondary, #f9f9f9);
}

.cover-maker__mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--chips-color-border, #e5e5e5);
  background: var(--chips-color-surface, #ffffff);
  border-radius: var(--chips-radius-md, 8px);
  cursor: pointer;
  font-size: 14px;
  color: var(--chips-color-text-primary, #1a1a1a);
  transition: all 0.15s;
}

.cover-maker__mode-btn:hover {
  border-color: var(--chips-color-primary-light, rgba(59, 130, 246, 0.5));
}

.cover-maker__mode-btn--active {
  border-color: var(--chips-color-primary, #3b82f6);
  background: var(--chips-color-primary-light, rgba(59, 130, 246, 0.1));
  color: var(--chips-color-primary, #3b82f6);
}

.cover-maker__mode-icon {
  font-size: 16px;
}

.cover-maker__mode-name {
  font-weight: 500;
}

.cover-maker__content {
  flex: 1;
  display: flex;
  gap: 24px;
  padding: 20px;
  overflow: hidden;
}

.cover-maker__form {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.cover-maker__preview-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover-maker__preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cover-maker__section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cover-maker__description {
  font-size: 14px;
  color: var(--chips-color-text-secondary, #666);
  margin: 0;
  line-height: 1.5;
}

.cover-maker__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cover-maker__field-row {
  display: flex;
  gap: 12px;
}

.cover-maker__field-row .cover-maker__field {
  flex: 1;
}

.cover-maker__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--chips-color-text-primary, #1a1a1a);
}

.cover-maker__required {
  color: var(--chips-color-error, #ef4444);
  margin-left: 2px;
}

.cover-maker__input,
.cover-maker__select {
  padding: 10px 12px;
  border: 1px solid var(--chips-color-border, #e5e5e5);
  border-radius: var(--chips-radius-sm, 4px);
  font-size: 14px;
  color: var(--chips-color-text-primary, #1a1a1a);
  background: var(--chips-color-surface, #ffffff);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.cover-maker__input:focus,
.cover-maker__select:focus {
  outline: none;
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.cover-maker__code-input {
  padding: 12px;
  border: 1px solid var(--chips-color-border, #e5e5e5);
  border-radius: var(--chips-radius-sm, 4px);
  font-size: 13px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: var(--chips-color-text-primary, #1a1a1a);
  background: var(--chips-color-surface-secondary, #f9f9f9);
  resize: vertical;
  line-height: 1.5;
}

.cover-maker__code-input:focus {
  outline: none;
  border-color: var(--chips-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.cover-maker__upload-area {
  position: relative;
  border: 2px dashed var(--chips-color-border, #e5e5e5);
  border-radius: var(--chips-radius-md, 8px);
  padding: 32px 24px;
  text-align: center;
  transition: border-color 0.15s, background-color 0.15s;
}

.cover-maker__upload-area:hover {
  border-color: var(--chips-color-primary-light, rgba(59, 130, 246, 0.5));
  background: var(--chips-color-primary-light, rgba(59, 130, 246, 0.02));
}

.cover-maker__file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.cover-maker__upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.cover-maker__upload-icon {
  font-size: 32px;
}

.cover-maker__upload-text {
  font-size: 14px;
  color: var(--chips-color-text-primary, #1a1a1a);
}

.cover-maker__upload-hint {
  font-size: 12px;
  color: var(--chips-color-text-tertiary, #999);
}

.cover-maker__upload-selected {
  display: flex;
  align-items: center;
  gap: 16px;
  pointer-events: none;
}

.cover-maker__image-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--chips-radius-sm, 4px);
}

.cover-maker__zip-icon {
  font-size: 48px;
}

.cover-maker__file-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
}

.cover-maker__file-name {
  font-size: 14px;
  color: var(--chips-color-text-primary, #1a1a1a);
  word-break: break-all;
}

.cover-maker__file-remove {
  padding: 4px 8px;
  border: none;
  background: var(--chips-color-error-light, rgba(239, 68, 68, 0.1));
  color: var(--chips-color-error, #ef4444);
  border-radius: var(--chips-radius-sm, 4px);
  font-size: 12px;
  cursor: pointer;
  pointer-events: auto;
  transition: background-color 0.15s;
}

.cover-maker__file-remove:hover {
  background: var(--chips-color-error-light, rgba(239, 68, 68, 0.2));
}

.cover-maker__notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: var(--chips-color-info-light, rgba(59, 130, 246, 0.05));
  border-radius: var(--chips-radius-sm, 4px);
}

.cover-maker__notice-icon {
  flex-shrink: 0;
}

.cover-maker__notice-text {
  font-size: 13px;
  color: var(--chips-color-text-secondary, #666);
  line-height: 1.4;
}

.cover-maker__preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 300px;
  border: 1px dashed var(--chips-color-border, #e5e5e5);
  border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface-secondary, #f9f9f9);
}

.cover-maker__preview-placeholder-icon {
  font-size: 32px;
  opacity: 0.5;
}

.cover-maker__preview-placeholder-text {
  font-size: 14px;
  color: var(--chips-color-text-tertiary, #999);
}

.cover-maker__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--chips-color-border, #e5e5e5);
}

.cover-maker__btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--chips-radius-sm, 4px);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.15s, opacity 0.15s;
}

.cover-maker__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cover-maker__btn--secondary {
  background: var(--chips-color-surface-secondary, #f0f0f0);
  color: var(--chips-color-text-primary, #1a1a1a);
}

.cover-maker__btn--secondary:hover:not(:disabled) {
  background: var(--chips-color-surface-hover, #e5e5e5);
}

.cover-maker__btn--primary {
  background: var(--chips-color-primary, #3b82f6);
  color: white;
}

.cover-maker__btn--primary:hover:not(:disabled) {
  background: var(--chips-color-primary-dark, #2563eb);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-active .cover-maker,
.fade-leave-active .cover-maker {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-from .cover-maker,
.fade-leave-to .cover-maker {
  transform: scale(0.95);
  opacity: 0;
}
</style>
