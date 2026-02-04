<script setup lang="ts">
/**
 * CardSettingsDialog 重构版本
 * @module components/card-settings/CardSettingsDialog
 * 
 * 重构要点：
 * 1. 移除所有业务逻辑，只保留UI交互
 * 2. 通过 SDK 调用所有功能
 * 3. 使用组合式组件拆分功能
 * 4. 遵循中心路由原则
 */

import { ref, computed, watch } from 'vue';
import { useCardStore } from '@/core/state';
import { ChipsSDK } from '@chips/sdk';
import { ExportPanel } from './panels';
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
  close: [];
  save: [];
}>();

// 初始化 SDK
const sdk = new ChipsSDK();
sdk.initialize().catch(console.error);

const cardStore = useCardStore();

// 获取卡片信息
const cardInfo = computed(() => cardStore.openCards.get(props.cardId));

// 选项卡
const selectedTab = ref<'basic' | 'cover' | 'theme' | 'export'>('basic');

// 基本信息
const editName = ref('');
const editTags = ref<string[]>([]);
const newTag = ref('');

// 封面
const showCoverMaker = ref(false);

// 主题
const themes = ref<{ id: string; name: string }[]>([
  { id: 'default', name: '默认主题' },
]);
const selectedTheme = ref('default');

// 监听可见性，初始化数据
watch(
  () => props.visible,
  (visible) => {
    if (visible && cardInfo.value) {
      editName.value = cardInfo.value.metadata.name || '';
      editTags.value = [...(cardInfo.value.metadata.tags || [])].map((t) =>
        Array.isArray(t) ? t.join('/') : t
      );
      selectedTheme.value = cardInfo.value.metadata.theme || 'default';
    }
  },
  { immediate: true }
);

/**
 * 保存设置
 * 通过 SDK 更新卡片元数据
 */
async function handleSave(): Promise<void> {
  if (!cardInfo.value) return;

  try {
    // 通过 SDK 更新卡片
    await sdk.card.update(props.cardId, {
      metadata: {
        name: editName.value.trim() || cardInfo.value.metadata.name,
        tags: editTags.value,
        theme: selectedTheme.value,
        modified_at: new Date().toISOString(),
      },
    });

    // 本地状态更新
    cardStore.updateCardMetadata(props.cardId, {
      name: editName.value.trim() || cardInfo.value.metadata.name,
      tags: editTags.value,
      theme: selectedTheme.value,
    });

    emit('save');
    emit('close');
  } catch (error) {
    console.error('Failed to save card settings:', error);
  }
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
 * 打开封面制作器
 */
function openCoverMaker(): void {
  showCoverMaker.value = true;
}

/**
 * 处理封面保存
 * 通过 SDK 保存封面到卡片
 */
async function handleCoverSave(data: CoverData): Promise<void> {
  try {
    // TODO: 通过 SDK 的 CoverAPI 保存封面
    // await sdk.cover.save(props.cardId, data);
    console.log('Cover saved:', data);
    showCoverMaker.value = false;
  } catch (error) {
    console.error('Failed to save cover:', error);
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="card-settings-overlay" @click.self="handleCancel">
        <div class="card-settings-dialog">
          <!-- 头部 -->
          <div class="dialog-header">
            <h2>卡片设置</h2>
            <button type="button" class="close-btn" @click="handleCancel">✕</button>
          </div>

          <!-- 选项卡 -->
          <div class="dialog-tabs">
            <button
              :class="['tab', { active: selectedTab === 'basic' }]"
              type="button"
              @click="selectedTab = 'basic'"
            >
              基本信息
            </button>
            <button
              :class="['tab', { active: selectedTab === 'cover' }]"
              type="button"
              @click="selectedTab = 'cover'"
            >
              封面
            </button>
            <button
              :class="['tab', { active: selectedTab === 'theme' }]"
              type="button"
              @click="selectedTab = 'theme'"
            >
              主题
            </button>
            <button
              :class="['tab', { active: selectedTab === 'export' }]"
              type="button"
              @click="selectedTab = 'export'"
            >
              导出
            </button>
          </div>

          <!-- 内容区域 -->
          <div class="dialog-content">
            <!-- 基本信息 -->
            <div v-show="selectedTab === 'basic'" class="panel">
              <div class="field">
                <label>卡片名称</label>
                <input v-model="editName" type="text" placeholder="输入卡片名称" />
              </div>

              <div class="field">
                <label>标签</label>
                <div class="tag-input">
                  <input
                    v-model="newTag"
                    type="text"
                    placeholder="输入标签后按回车"
                    @keydown.enter="addTag"
                  />
                  <button type="button" @click="addTag">添加</button>
                </div>
                <div v-if="editTags.length > 0" class="tags">
                  <span v-for="(tag, index) in editTags" :key="index" class="tag">
                    {{ tag }}
                    <button type="button" @click="removeTag(index)">✕</button>
                  </span>
                </div>
              </div>
            </div>

            <!-- 封面 -->
            <div v-show="selectedTab === 'cover'" class="panel">
              <button type="button" class="action-btn" @click="openCoverMaker">
                🎨 打开封面制作器
              </button>
            </div>

            <!-- 主题 -->
            <div v-show="selectedTab === 'theme'" class="panel">
              <div class="theme-grid">
                <button
                  v-for="theme in themes"
                  :key="theme.id"
                  type="button"
                  :class="['theme-item', { selected: selectedTheme === theme.id }]"
                  @click="selectedTheme = theme.id"
                >
                  {{ theme.name }}
                </button>
              </div>
            </div>

            <!-- 导出 - 使用 ExportPanel 组件 -->
            <div v-show="selectedTab === 'export'" class="panel">
              <ExportPanel
                :card-id="cardId"
                :sdk="sdk"
                :default-output-path="`/exports/${cardInfo?.metadata.name || 'card'}`"
              />
            </div>
          </div>

          <!-- 底部 -->
          <div class="dialog-footer">
            <button type="button" class="btn btn-secondary" @click="handleCancel">
              取消
            </button>
            <button type="button" class="btn btn-primary" @click="handleSave">保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 封面制作器 -->
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
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.card-settings-dialog {
  width: 600px;
  max-height: 80vh;
  background: var(--color-surface, #fff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.dialog-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--radius-md, 6px);
  transition: background 0.2s;
}

.close-btn:hover {
  background: var(--color-bg-hover, #f5f5f5);
}

.dialog-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 24px 0;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.tab {
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary, #666);
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  color: var(--color-text-primary, #333);
}

.tab.active {
  color: var(--color-primary, #3b82f6);
  border-bottom-color: var(--color-primary, #3b82f6);
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-size: 14px;
  font-weight: 500;
}

.field input {
  padding: 8px 12px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--radius-md, 6px);
  font-size: 14px;
}

.tag-input {
  display: flex;
  gap: 8px;
}

.tag-input input {
  flex: 1;
}

.tag-input button {
  padding: 8px 16px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--radius-md, 6px);
  background: var(--color-surface, #fff);
  cursor: pointer;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--color-bg-secondary, #f0f9ff);
  color: var(--color-primary, #3b82f6);
  border-radius: var(--radius-full, 999px);
  font-size: 13px;
}

.tag button {
  border: none;
  background: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}

.tag button:hover {
  opacity: 1;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.theme-item {
  padding: 16px;
  border: 2px solid var(--color-border, #ddd);
  border-radius: var(--radius-md, 8px);
  background: var(--color-surface, #fff);
  cursor: pointer;
  transition: all 0.2s;
}

.theme-item:hover {
  border-color: var(--color-primary, #3b82f6);
}

.theme-item.selected {
  border-color: var(--color-primary, #3b82f6);
  background: var(--color-bg-hover, #f0f9ff);
}

.action-btn {
  padding: 12px 20px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--radius-md, 8px);
  background: var(--color-surface, #fff);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--color-bg-hover, #f5f5f5);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: var(--radius-md, 6px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--color-surface, #fff);
  color: var(--color-text-primary, #333);
  border: 1px solid var(--color-border, #ddd);
}

.btn-secondary:hover {
  background: var(--color-bg-hover, #f5f5f5);
}

.btn-primary {
  background: var(--color-primary, #3b82f6);
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-primary-dark, #2563eb);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
