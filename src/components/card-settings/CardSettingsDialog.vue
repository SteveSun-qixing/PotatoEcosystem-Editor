<script setup lang="ts">
/**
 * 卡片设置对话框组件
 * @module components/card-settings/CardSettingsDialog
 * @description 提供复合卡片的设置功能，包括名称、主题、封面、标签、导出等
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useCardStore } from '@/core/state';
import { useWorkspaceService } from '@/core/workspace-service';
import CoverMaker from '@/components/cover-maker/CoverMaker.vue';
import type { CoverData } from '@/components/cover-maker/types';

interface Props {
  /** 卡片 ID */
  cardId: string;
  /** 是否显示 */
  visible: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** 关闭对话框 */
  close: [];
  /** 保存设置 */
  save: [];
}>();

const cardStore = useCardStore();
const workspaceService = useWorkspaceService();

// 获取卡片信息
const cardInfo = computed(() => cardStore.openCards.get(props.cardId));

// 编辑状态
const editName = ref('');
const editTags = ref<string[]>([]);
const newTag = ref('');
const selectedTab = ref<'basic' | 'cover' | 'theme' | 'export'>('basic');

// 封面设置 - 使用 CoverMaker 组件
const showCoverMaker = ref(false);

// 主题选项 - 只保留默认主题，后续通过 ThemeAPI 加载用户安装的主题
const themes = ref<{ id: string; name: string; installed: boolean }[]>([
  { id: 'default', name: '默认主题', installed: true },
]);
const selectedTheme = ref('default');
const isLoadingThemes = ref(false);

// 导出状态
const exportProgress = ref(0);
const exportStatus = ref<'idle' | 'exporting' | 'success' | 'error'>('idle');
const exportMessage = ref('');

/**
 * 格式化时间戳
 * @param timestamp - ISO 时间字符串或时间戳
 * @returns 格式化后的本地时间字符串 YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(timestamp: string | number | undefined): string {
  if (!timestamp) return '-';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '-';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 初始化编辑数据
watch(
  () => props.visible,
  (visible) => {
    if (visible && cardInfo.value) {
      editName.value = cardInfo.value.metadata.name || '';
      editTags.value = [...(cardInfo.value.metadata.tags || [])].map(t => 
        Array.isArray(t) ? t.join('/') : t
      );
      selectedTheme.value = cardInfo.value.metadata.theme || 'default';
      // 重置导出状态
      exportProgress.value = 0;
      exportStatus.value = 'idle';
      exportMessage.value = '';
      // 加载主题列表
      loadThemes();
    }
  },
  { immediate: true }
);

/**
 * 加载主题列表
 * TODO: 集成 ThemeAPI 获取真实主题列表
 */
async function loadThemes(): Promise<void> {
  isLoadingThemes.value = true;
  try {
    // TODO: 当 ThemeAPI 实现后，替换为真实的 API 调用
    // const themeApi = new ThemeAPI(connector, logger, config);
    // const allThemes = await themeApi.getAll();
    // themes.value = allThemes.map(t => ({ id: t.id, name: t.name, installed: true }));
    
    // 暂时只保留默认主题
    themes.value = [
      { id: 'default', name: '默认主题', installed: true },
    ];
  } catch (error) {
    console.error('Failed to load themes:', error);
  } finally {
    isLoadingThemes.value = false;
  }
}

/**
 * 处理上传主题
 */
function handleUploadTheme(): void {
  // TODO: 实现主题上传功能
  // 1. 打开文件选择对话框
  // 2. 验证主题包格式
  // 3. 调用 ThemeAPI.install()
  alert('主题上传功能即将推出');
}

/**
 * 保存设置
 */
function handleSave(): void {
  if (!cardInfo.value) return;

  // 更新卡片元数据（已移除 description）
  cardStore.updateCardMetadata(props.cardId, {
    name: editName.value.trim() || cardInfo.value.metadata.name,
    tags: editTags.value,
    theme: selectedTheme.value,
  });

  // 同步更新工作区文件名
  const newName = editName.value.trim();
  if (newName && newName !== cardInfo.value.metadata.name) {
    workspaceService.renameFile(props.cardId, `${newName}.card`);
  }

  emit('save');
  emit('close');
}

/**
 * 取消设置
 */
function handleCancel(): void {
  emit('close');
}

/**
 * 添加标签
 */
function addTag(): void {
  const tag = newTag.value.trim();
  if (tag && !editTags.value.includes(tag)) {
    editTags.value.push(tag);
    newTag.value = '';
  }
}

/**
 * 删除标签
 */
function removeTag(index: number): void {
  editTags.value.splice(index, 1);
}

/**
 * 处理键盘事件
 */
function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    addTag();
  }
}

/**
 * 处理 Escape 键关闭
 */
function handleGlobalKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.visible && !showCoverMaker.value) {
    handleCancel();
  }
}

/**
 * 处理点击遮罩关闭
 */
function handleOverlayClick(e: MouseEvent): void {
  if ((e.target as HTMLElement).classList.contains('card-settings-overlay')) {
    handleCancel();
  }
}

/**
 * 打开封面制作器
 */
function openCoverMaker(): void {
  showCoverMaker.value = true;
}

/**
 * 处理封面保存
 */
function handleCoverSave(data: CoverData): void {
  // TODO: 调用 SDK 保存封面到卡片文件夹
  console.log('Cover saved:', data);
  showCoverMaker.value = false;
}

/**
 * 执行导出操作
 * @param format - 导出格式
 */
async function handleExport(format: 'card' | 'html' | 'pdf' | 'image'): Promise<void> {
  if (exportStatus.value === 'exporting') return;
  
  exportStatus.value = 'exporting';
  exportProgress.value = 0;
  exportMessage.value = `正在导出为 ${format.toUpperCase()} 格式...`;
  
  try {
    // TODO: 集成 ConversionAPI
    // const conversionApi = new ConversionAPI(connector, logger, config);
    // const result = await conversionApi.convert(cardInfo.value, format, {
    //   onProgress: (progress) => {
    //     exportProgress.value = progress.progress;
    //     exportMessage.value = progress.currentStep || '';
    //   }
    // });
    
    // 模拟导出过程
    for (let i = 0; i <= 100; i += 20) {
      exportProgress.value = i;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    exportStatus.value = 'success';
    exportMessage.value = '导出完成！';
    
    // 3 秒后重置状态
    setTimeout(() => {
      if (exportStatus.value === 'success') {
        exportStatus.value = 'idle';
        exportProgress.value = 0;
        exportMessage.value = '';
      }
    }, 3000);
  } catch (error) {
    exportStatus.value = 'error';
    exportMessage.value = `导出失败: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

// 全局键盘事件
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="card-settings-overlay"
        @click="handleOverlayClick"
      >
        <div class="card-settings-dialog">
          <!-- 对话框头部 -->
          <div class="card-settings-dialog__header">
            <h2 class="card-settings-dialog__title">卡片设置</h2>
            <button
              class="card-settings-dialog__close"
              type="button"
              aria-label="关闭"
              @click="handleCancel"
            >
              ✕
            </button>
          </div>

          <!-- 选项卡导航 -->
          <div class="card-settings-dialog__tabs">
            <button
              :class="['card-settings-dialog__tab', { 'card-settings-dialog__tab--active': selectedTab === 'basic' }]"
              type="button"
              @click="selectedTab = 'basic'"
            >
              基本信息
            </button>
            <button
              :class="['card-settings-dialog__tab', { 'card-settings-dialog__tab--active': selectedTab === 'cover' }]"
              type="button"
              @click="selectedTab = 'cover'"
            >
              封面设置
            </button>
            <button
              :class="['card-settings-dialog__tab', { 'card-settings-dialog__tab--active': selectedTab === 'theme' }]"
              type="button"
              @click="selectedTab = 'theme'"
            >
              主题
            </button>
            <button
              :class="['card-settings-dialog__tab', { 'card-settings-dialog__tab--active': selectedTab === 'export' }]"
              type="button"
              @click="selectedTab = 'export'"
            >
              导出
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="card-settings-dialog__content">
            <!-- 基本信息 -->
            <div v-show="selectedTab === 'basic'" class="card-settings-dialog__section">
              <div class="card-settings-dialog__field">
                <label class="card-settings-dialog__label">卡片名称</label>
                <input
                  v-model="editName"
                  type="text"
                  class="card-settings-dialog__input"
                  placeholder="输入卡片名称"
                />
              </div>

              <!-- 标签：输入框在上，标签列表在下 -->
              <div class="card-settings-dialog__field">
                <label class="card-settings-dialog__label">标签</label>
                <div class="card-settings-dialog__tag-input">
                  <input
                    v-model="newTag"
                    type="text"
                    class="card-settings-dialog__input"
                    placeholder="输入标签后按回车添加"
                    @keydown="handleKeydown"
                  />
                  <button
                    type="button"
                    class="card-settings-dialog__tag-add"
                    @click="addTag"
                  >
                    添加
                  </button>
                </div>
                <div v-if="editTags.length > 0" class="card-settings-dialog__tags">
                  <span
                    v-for="(tag, index) in editTags"
                    :key="index"
                    class="card-settings-dialog__tag"
                  >
                    {{ tag }}
                    <button
                      type="button"
                      class="card-settings-dialog__tag-remove"
                      @click="removeTag(index)"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              </div>

              <div class="card-settings-dialog__field">
                <label class="card-settings-dialog__label">元数据</label>
                <div class="card-settings-dialog__metadata">
                  <div class="card-settings-dialog__metadata-item">
                    <span class="card-settings-dialog__metadata-label">卡片 ID:</span>
                    <span class="card-settings-dialog__metadata-value">{{ cardId }}</span>
                  </div>
                  <div class="card-settings-dialog__metadata-item">
                    <span class="card-settings-dialog__metadata-label">创建时间:</span>
                    <span class="card-settings-dialog__metadata-value">{{ formatDateTime(cardInfo?.metadata.created_at) }}</span>
                  </div>
                  <div class="card-settings-dialog__metadata-item">
                    <span class="card-settings-dialog__metadata-label">修改时间:</span>
                    <span class="card-settings-dialog__metadata-value">{{ formatDateTime(cardInfo?.metadata.modified_at) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 封面设置 - 集成 CoverMaker -->
            <div v-show="selectedTab === 'cover'" class="card-settings-dialog__section">
              <p class="card-settings-dialog__description">
                封面是卡片的外观展示，支持多种创建方式。
              </p>
              
              <div class="card-settings-dialog__cover-options">
                <button
                  type="button"
                  class="card-settings-dialog__cover-option"
                  @click="openCoverMaker"
                >
                  <span class="card-settings-dialog__cover-option-icon">🎨</span>
                  <div class="card-settings-dialog__cover-option-content">
                    <span class="card-settings-dialog__cover-option-title">封面制作器</span>
                    <span class="card-settings-dialog__cover-option-desc">
                      选择图片、粘贴代码、上传压缩包或使用模板快速制作
                    </span>
                  </div>
                </button>
              </div>
              
              <div class="card-settings-dialog__cover-info">
                <span class="card-settings-dialog__cover-info-icon">ℹ️</span>
                <span class="card-settings-dialog__cover-info-text">
                  封面制作器支持四种方式：选择图片、粘贴 HTML 代码、上传 ZIP 压缩包、快速模板制作
                </span>
              </div>
            </div>

            <!-- 主题设置 - 移除虚假数据，添加上传按钮 -->
            <div v-show="selectedTab === 'theme'" class="card-settings-dialog__section">
              <div class="card-settings-dialog__theme-header">
                <label class="card-settings-dialog__label">选择主题</label>
                <button
                  type="button"
                  class="card-settings-dialog__theme-upload-btn"
                  @click="handleUploadTheme"
                >
                  📤 上传主题
                </button>
              </div>
              
              <div v-if="isLoadingThemes" class="card-settings-dialog__loading">
                正在加载主题列表...
              </div>
              
              <div v-else class="card-settings-dialog__theme-grid">
                <button
                  v-for="theme in themes"
                  :key="theme.id"
                  type="button"
                  :class="['card-settings-dialog__theme-item', { 'card-settings-dialog__theme-item--selected': selectedTheme === theme.id }]"
                  @click="selectedTheme = theme.id"
                >
                  <span class="card-settings-dialog__theme-preview"></span>
                  <span class="card-settings-dialog__theme-name">{{ theme.name }}</span>
                </button>
              </div>
              
              <div v-if="themes.length === 1" class="card-settings-dialog__theme-hint">
                <span class="card-settings-dialog__theme-hint-icon">💡</span>
                <span class="card-settings-dialog__theme-hint-text">
                  您可以上传自定义主题包来扩展可用主题
                </span>
              </div>
            </div>

            <!-- 导出设置 - 集成 ConversionAPI -->
            <div v-show="selectedTab === 'export'" class="card-settings-dialog__section">
              <div class="card-settings-dialog__field">
                <label class="card-settings-dialog__label">导出格式</label>
                <div class="card-settings-dialog__export-options">
                  <button
                    type="button"
                    class="card-settings-dialog__export-btn"
                    :disabled="exportStatus === 'exporting'"
                    @click="handleExport('card')"
                  >
                    <span class="card-settings-dialog__export-icon">📦</span>
                    <span class="card-settings-dialog__export-text">导出为 .card 文件</span>
                  </button>
                  <button
                    type="button"
                    class="card-settings-dialog__export-btn"
                    :disabled="exportStatus === 'exporting'"
                    @click="handleExport('html')"
                  >
                    <span class="card-settings-dialog__export-icon">🌐</span>
                    <span class="card-settings-dialog__export-text">导出为网页 (HTML)</span>
                  </button>
                  <button
                    type="button"
                    class="card-settings-dialog__export-btn"
                    :disabled="exportStatus === 'exporting'"
                    @click="handleExport('pdf')"
                  >
                    <span class="card-settings-dialog__export-icon">📄</span>
                    <span class="card-settings-dialog__export-text">导出为 PDF</span>
                  </button>
                  <button
                    type="button"
                    class="card-settings-dialog__export-btn"
                    :disabled="exportStatus === 'exporting'"
                    @click="handleExport('image')"
                  >
                    <span class="card-settings-dialog__export-icon">🖼️</span>
                    <span class="card-settings-dialog__export-text">导出为图片</span>
                  </button>
                </div>
              </div>
              
              <!-- 导出进度 -->
              <div v-if="exportStatus !== 'idle'" class="card-settings-dialog__export-progress">
                <div class="card-settings-dialog__progress-bar">
                  <div
                    class="card-settings-dialog__progress-fill"
                    :style="{ width: `${exportProgress}%` }"
                    :class="{
                      'card-settings-dialog__progress-fill--success': exportStatus === 'success',
                      'card-settings-dialog__progress-fill--error': exportStatus === 'error'
                    }"
                  ></div>
                </div>
                <p
                  class="card-settings-dialog__progress-message"
                  :class="{
                    'card-settings-dialog__progress-message--success': exportStatus === 'success',
                    'card-settings-dialog__progress-message--error': exportStatus === 'error'
                  }"
                >
                  {{ exportMessage }}
                </p>
              </div>
            </div>
          </div>

          <!-- 对话框底部 -->
          <div class="card-settings-dialog__footer">
            <button
              type="button"
              class="card-settings-dialog__btn card-settings-dialog__btn--secondary"
              @click="handleCancel"
            >
              取消
            </button>
            <button
              type="button"
              class="card-settings-dialog__btn card-settings-dialog__btn--primary"
              @click="handleSave"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- 封面制作器对话框 -->
    <CoverMaker
      :card-id="cardId"
      :visible="showCoverMaker"
      @close="showCoverMaker = false"
      @save="handleCoverSave"
    />
  </Teleport>
</template>

<style scoped>
.card-settings-overlay {
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

/* 固定窗口大小 560x600px */
.card-settings-dialog {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1));
  width: 560px;
  height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-settings-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md, 16px) var(--spacing-lg, 20px);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  flex-shrink: 0;
}

.card-settings-dialog__title {
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-bold, 600);
  color: var(--color-text-primary, #111827);
  margin: 0;
}

.card-settings-dialog__close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: 16px;
  color: var(--color-text-secondary, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast, 150ms ease);
}

.card-settings-dialog__close:hover {
  background: rgba(0, 0, 0, 0.05);
}

.card-settings-dialog__tabs {
  display: flex;
  gap: var(--spacing-xs, 4px);
  padding: var(--spacing-sm, 8px) var(--spacing-lg, 20px);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-background-secondary, #f9fafb);
  flex-shrink: 0;
}

.card-settings-dialog__tab {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-secondary, #6b7280);
  transition: all var(--transition-fast, 150ms ease);
}

.card-settings-dialog__tab:hover {
  background: rgba(0, 0, 0, 0.05);
}

.card-settings-dialog__tab--active {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.card-settings-dialog__tab--active:hover {
  background: var(--color-primary-hover, #2563eb);
}

/* 内容区使用 min-height 确保滚动 */
.card-settings-dialog__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg, 20px);
  min-height: 0;
}

.card-settings-dialog__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 20px);
}

.card-settings-dialog__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.card-settings-dialog__label {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-primary, #111827);
}

.card-settings-dialog__description {
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
  line-height: var(--line-height-normal, 1.5);
}

.card-settings-dialog__input,
.card-settings-dialog__select {
  padding: 10px 12px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-primary, #111827);
  background: var(--color-surface, #ffffff);
  transition: border-color var(--transition-fast, 150ms ease), box-shadow var(--transition-fast, 150ms ease);
}

.card-settings-dialog__input:focus,
.card-settings-dialog__select:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 标签样式 - 列表在输入框下方 */
.card-settings-dialog__tag-input {
  display: flex;
  gap: var(--spacing-sm, 8px);
}

.card-settings-dialog__tag-input .card-settings-dialog__input {
  flex: 1;
}

.card-settings-dialog__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm, 8px);
  margin-top: var(--spacing-xs, 4px);
}

.card-settings-dialog__tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary, #3b82f6);
  border-radius: var(--radius-full, 9999px);
  font-size: 13px;
}

.card-settings-dialog__tag-remove {
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  font-size: 10px;
  color: var(--color-primary, #3b82f6);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast, 150ms ease);
}

.card-settings-dialog__tag-remove:hover {
  background: rgba(59, 130, 246, 0.2);
}

.card-settings-dialog__tag-add {
  padding: 10px var(--spacing-md, 16px);
  border: none;
  background: var(--color-primary, #3b82f6);
  color: white;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm, 14px);
  transition: background-color var(--transition-fast, 150ms ease);
}

.card-settings-dialog__tag-add:hover {
  background: var(--color-primary-hover, #2563eb);
}

/* 元数据样式 */
.card-settings-dialog__metadata {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  padding: 12px;
  background: var(--color-background-secondary, #f9fafb);
  border-radius: var(--radius-sm, 4px);
}

.card-settings-dialog__metadata-item {
  display: flex;
  gap: var(--spacing-sm, 8px);
  font-size: 13px;
}

.card-settings-dialog__metadata-label {
  color: var(--color-text-secondary, #6b7280);
  min-width: 80px;
}

.card-settings-dialog__metadata-value {
  color: var(--color-text-primary, #111827);
  word-break: break-all;
  font-family: 'SF Mono', Monaco, monospace;
}

/* 封面选项卡样式 */
.card-settings-dialog__cover-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.card-settings-dialog__cover-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
  border: 2px solid var(--color-border, #e5e7eb);
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--transition-fast, 150ms ease), background-color var(--transition-fast, 150ms ease);
}

.card-settings-dialog__cover-option:hover {
  border-color: var(--color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.02);
}

.card-settings-dialog__cover-option-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.card-settings-dialog__cover-option-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-settings-dialog__cover-option-title {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-primary, #111827);
}

.card-settings-dialog__cover-option-desc {
  font-size: 13px;
  color: var(--color-text-secondary, #6b7280);
}

.card-settings-dialog__cover-info {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm, 8px);
  padding: 12px;
  background: rgba(59, 130, 246, 0.05);
  border-radius: var(--radius-sm, 4px);
  margin-top: var(--spacing-sm, 8px);
}

.card-settings-dialog__cover-info-icon {
  flex-shrink: 0;
}

.card-settings-dialog__cover-info-text {
  font-size: 13px;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.4;
}

/* 主题选项卡样式 */
.card-settings-dialog__theme-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md, 16px);
}

.card-settings-dialog__theme-upload-btn {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border: 1px dashed var(--color-border, #e5e7eb);
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-primary, #111827);
  transition: border-color var(--transition-fast, 150ms ease), background-color var(--transition-fast, 150ms ease);
}

.card-settings-dialog__theme-upload-btn:hover {
  border-color: var(--color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.05);
}

.card-settings-dialog__loading {
  text-align: center;
  padding: var(--spacing-lg, 24px);
  color: var(--color-text-secondary, #6b7280);
  font-size: var(--font-size-sm, 14px);
}

.card-settings-dialog__theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.card-settings-dialog__theme-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: 12px;
  border: 2px solid var(--color-border, #e5e7eb);
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: border-color var(--transition-fast, 150ms ease);
}

.card-settings-dialog__theme-item:hover {
  border-color: rgba(59, 130, 246, 0.5);
}

.card-settings-dialog__theme-item--selected {
  border-color: var(--color-primary, #3b82f6);
}

.card-settings-dialog__theme-preview {
  width: 60px;
  height: 40px;
  background: linear-gradient(135deg, #e0e0e0, #f5f5f5);
  border-radius: var(--radius-sm, 4px);
}

.card-settings-dialog__theme-name {
  font-size: 12px;
  color: var(--color-text-primary, #111827);
}

.card-settings-dialog__theme-hint {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm, 8px);
  padding: 12px;
  background: rgba(245, 158, 11, 0.05);
  border-radius: var(--radius-sm, 4px);
  margin-top: var(--spacing-md, 16px);
}

.card-settings-dialog__theme-hint-icon {
  flex-shrink: 0;
}

.card-settings-dialog__theme-hint-text {
  font-size: 13px;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.4;
}

/* 导出选项卡样式 */
.card-settings-dialog__export-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.card-settings-dialog__export-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px var(--spacing-md, 16px);
  border: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-primary, #111827);
  text-align: left;
  transition: border-color var(--transition-fast, 150ms ease), background-color var(--transition-fast, 150ms ease);
}

.card-settings-dialog__export-btn:hover:not(:disabled) {
  border-color: var(--color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.05);
}

.card-settings-dialog__export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-settings-dialog__export-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.card-settings-dialog__export-text {
  flex: 1;
}

/* 导出进度样式 */
.card-settings-dialog__export-progress {
  margin-top: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
  background: var(--color-background-secondary, #f9fafb);
  border-radius: var(--radius-sm, 4px);
}

.card-settings-dialog__progress-bar {
  height: 8px;
  background: var(--color-border, #e5e7eb);
  border-radius: var(--radius-full, 9999px);
  overflow: hidden;
}

.card-settings-dialog__progress-fill {
  height: 100%;
  background: var(--color-primary, #3b82f6);
  border-radius: var(--radius-full, 9999px);
  transition: width 0.3s ease;
}

.card-settings-dialog__progress-fill--success {
  background: var(--color-success, #10b981);
}

.card-settings-dialog__progress-fill--error {
  background: var(--color-error, #ef4444);
}

.card-settings-dialog__progress-message {
  margin: var(--spacing-sm, 8px) 0 0 0;
  font-size: 13px;
  color: var(--color-text-secondary, #6b7280);
}

.card-settings-dialog__progress-message--success {
  color: var(--color-success, #10b981);
}

.card-settings-dialog__progress-message--error {
  color: var(--color-error, #ef4444);
}

/* 底部按钮 */
.card-settings-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: var(--spacing-md, 16px) var(--spacing-lg, 20px);
  border-top: 1px solid var(--color-border, #e5e7eb);
  flex-shrink: 0;
}

.card-settings-dialog__btn {
  padding: 10px var(--spacing-lg, 20px);
  border: none;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-medium, 500);
  transition: background-color var(--transition-fast, 150ms ease);
}

.card-settings-dialog__btn--secondary {
  background: var(--color-background-secondary, #f0f0f0);
  color: var(--color-text-primary, #111827);
}

.card-settings-dialog__btn--secondary:hover {
  background: var(--color-border, #e5e7eb);
}

.card-settings-dialog__btn--primary {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.card-settings-dialog__btn--primary:hover {
  background: var(--color-primary-hover, #2563eb);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-active .card-settings-dialog,
.fade-leave-active .card-settings-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-from .card-settings-dialog,
.fade-leave-to .card-settings-dialog {
  transform: scale(0.95);
  opacity: 0;
}
</style>
