<script setup lang="ts">
/**
 * 插件宿主组件
 * @module components/edit-panel/PluginHost
 * @description 根据基础卡片类型加载对应的编辑组件插件，管理插件生命周期
 * 
 * 设计说明：
 * - 编辑面板只是容器，实际编辑界面由基础卡片插件提供
 * - 根据基础卡片类型动态加载对应的编辑器组件
 */

import { ref, computed, watch, onMounted, onUnmounted, shallowRef, nextTick, defineAsyncComponent, markRaw, type Component } from 'vue';
import { useCardStore, useEditorStore } from '@/core/state';
import DefaultEditor from './DefaultEditor.vue';
import type { EditorPlugin, PluginHostProps } from './types';

// 动态导入富文本编辑器组件（开发阶段直接导入）
// 生产环境应该通过插件系统加载
const RichTextEditorComponent = defineAsyncComponent(() => 
  import('../../../../BasicCardPlugin/Rich-Text-Basic-Card-Plugin/src/editor/RichTextEditor.vue')
);

/** 已注册的编辑器组件映射 */
const editorComponents: Record<string, Component> = {
  'rich-text': RichTextEditorComponent,
  'RichTextCard': RichTextEditorComponent,
};

// ==================== Props ====================
interface Props {
  /** 基础卡片类型 */
  cardType: string;
  /** 基础卡片 ID */
  baseCardId: string;
  /** 当前配置 */
  config: Record<string, unknown>;
}

const props = defineProps<Props>();

// ==================== Emits ====================
const emit = defineEmits<{
  /** 配置变更 */
  'config-change': [config: Record<string, unknown>];
  /** 插件加载完成 */
  'plugin-loaded': [plugin: EditorPlugin | null];
  /** 插件加载失败 */
  'plugin-error': [error: Error];
}>();

// ==================== Stores ====================
const cardStore = useCardStore();
const editorStore = useEditorStore();

// ==================== State ====================
/** 当前加载的插件 */
const currentPlugin = shallowRef<EditorPlugin | null>(null);

/** 插件容器引用 */
const pluginContainerRef = ref<HTMLElement | null>(null);

/** 是否正在加载 */
const isLoading = ref(true);

/** 加载错误 */
const loadError = ref<Error | null>(null);

/** 本地配置副本（用于防抖） */
const localConfig = ref<Record<string, unknown>>({});

/** 防抖定时器 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 防抖延迟（毫秒） */
const DEBOUNCE_DELAY = 300;

/** 自动保存间隔（毫秒） */
const AUTO_SAVE_INTERVAL = 5000;

/** 自动保存定时器 */
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

/** 是否有未保存的更改 */
const hasUnsavedChanges = ref(false);

/** 富文本编辑器状态 */
const editorState = ref({
  content: '',
  selection: null,
  activeFormats: new Set<string>(),
  currentBlock: 'paragraph',
  canUndo: false,
  canRedo: false,
  isDirty: false,
  wordCount: 0,
  isFocused: false,
});

// ==================== Computed ====================
/** 是否使用默认编辑器 */
const useDefaultEditor = computed(() => {
  return !currentPlugin.value && !currentEditorComponent.value;
});

/** 当前基础卡片信息 */
const currentBaseCard = computed(() => {
  const activeCard = cardStore.activeCard;
  if (!activeCard) return null;
  return activeCard.structure.find(bc => bc.id === props.baseCardId) ?? null;
});

/** 加载状态文本 */
const loadingText = computed(() => {
  return 'plugin_host.loading'; // t('plugin_host.loading')
});

/** 错误状态文本 */
const errorText = computed(() => {
  return loadError.value?.message ?? 'plugin_host.error'; // t('plugin_host.error')
});

// ==================== Methods ====================
/**
 * 加载编辑器插件
 */
async function loadPlugin(): Promise<void> {
  isLoading.value = true;
  loadError.value = null;
  
  try {
    // 卸载当前插件
    await unloadPlugin();
    
    // 检查是否有注册的编辑器组件
    const component = editorComponents[props.cardType];
    if (component) {
      // 使用注册的 Vue 组件
      currentEditorComponent.value = markRaw(component);
      currentPlugin.value = null;
      emit('plugin-loaded', null);
      console.log('[PluginHost] 加载编辑器组件:', props.cardType);
    } else {
      // 尝试加载插件
      const plugin = await getEditorPlugin(props.cardType);
      
      if (plugin && pluginContainerRef.value && 'mount' in plugin) {
        // 挂载插件
        await plugin.mount(pluginContainerRef.value, props.config);
        
        // 设置配置变更回调
        if (plugin.onConfigChange) {
          plugin.onConfigChange(handlePluginConfigChange);
        }
        
        currentPlugin.value = plugin;
        currentEditorComponent.value = null;
        emit('plugin-loaded', plugin);
      } else {
        // 没有找到插件，使用默认编辑器
        currentPlugin.value = null;
        currentEditorComponent.value = null;
        emit('plugin-loaded', null);
      }
    }
    
    // 初始化本地配置
    localConfig.value = { ...props.config };
  } catch (error) {
    loadError.value = error instanceof Error ? error : new Error(String(error));
    emit('plugin-error', loadError.value);
    console.error('[PluginHost] 加载插件失败:', error);
  } finally {
    isLoading.value = false;
  }
}

/**
 * 卸载当前插件
 */
async function unloadPlugin(): Promise<void> {
  if (currentPlugin.value) {
    try {
      // 保存未保存的更改
      if (hasUnsavedChanges.value) {
        await saveConfig();
      }
      
      await currentPlugin.value.unmount();
    } catch (error) {
      console.error('Failed to unmount plugin:', error);
    }
    currentPlugin.value = null;
  }
  
  // 清空容器
  if (pluginContainerRef.value) {
    pluginContainerRef.value.innerHTML = '';
  }
}

/**
 * 获取编辑器插件
 * 检查是否有注册的编辑器组件
 */
async function getEditorPlugin(cardType: string): Promise<EditorPlugin | null> {
  // 检查是否有注册的编辑器组件
  if (editorComponents[cardType]) {
    // 返回一个标记，表示使用注册的组件
    return {
      type: 'component',
      component: editorComponents[cardType],
    } as unknown as EditorPlugin;
  }
  return null;
}

/** 当前使用的编辑器组件 */
const currentEditorComponent = shallowRef<Component | null>(null);

/** 是否使用插件组件 */
const usePluginComponent = computed(() => {
  return currentEditorComponent.value !== null;
});

/**
 * 处理插件配置变更
 */
function handlePluginConfigChange(newConfig: Record<string, unknown>): void {
  localConfig.value = { ...newConfig };
  hasUnsavedChanges.value = true;
  debouncedEmitChange();
}

/**
 * 处理默认编辑器配置变更
 */
function handleDefaultConfigChange(newConfig: Record<string, unknown>): void {
  localConfig.value = { ...newConfig };
  hasUnsavedChanges.value = true;
  debouncedEmitChange();
}

/**
 * 处理富文本编辑器内容变更
 */
function handleEditorContentChange(html: string): void {
  localConfig.value = { 
    ...localConfig.value, 
    content_text: html,
    content_source: 'inline',
  };
  editorState.value.content = html;
  editorState.value.isDirty = true;
  hasUnsavedChanges.value = true;
  debouncedEmitChange();
}

/**
 * 防抖发送配置变更
 */
function debouncedEmitChange(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    emitConfigChange();
  }, DEBOUNCE_DELAY);
}

/**
 * 发送配置变更事件
 */
function emitConfigChange(): void {
  emit('config-change', { ...localConfig.value });
  
  // 更新 store 中的卡片配置
  updateStoreConfig();
}

/**
 * 更新 Store 中的配置
 */
function updateStoreConfig(): void {
  const activeCard = cardStore.activeCard;
  if (!activeCard) return;
  
  const baseCardIndex = activeCard.structure.findIndex(bc => bc.id === props.baseCardId);
  if (baseCardIndex === -1) return;
  
  // 创建新的 structure 数组
  const newStructure = [...activeCard.structure];
  newStructure[baseCardIndex] = {
    ...newStructure[baseCardIndex],
    config: { ...localConfig.value },
  };
  
  // 更新 store
  cardStore.updateCardStructure(activeCard.id, newStructure);
  editorStore.markUnsaved();
}

/**
 * 保存配置
 */
async function saveConfig(): Promise<void> {
  if (!hasUnsavedChanges.value) return;
  
  emitConfigChange();
  hasUnsavedChanges.value = false;
}

/**
 * 启动自动保存
 */
function startAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }
  
  autoSaveTimer = setInterval(() => {
    if (hasUnsavedChanges.value) {
      saveConfig();
    }
  }, AUTO_SAVE_INTERVAL);
}

/**
 * 停止自动保存
 */
function stopAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

/**
 * 重新加载插件
 */
async function reload(): Promise<void> {
  await loadPlugin();
}

// ==================== Watchers ====================
// 监听卡片类型变化
watch(() => props.cardType, async () => {
  await loadPlugin();
});

// 监听基础卡片 ID 变化
watch(() => props.baseCardId, async () => {
  await loadPlugin();
});

// 监听外部配置变化
watch(() => props.config, (newConfig) => {
  // 只有在没有本地更改时才同步外部配置
  if (!hasUnsavedChanges.value) {
    localConfig.value = { ...newConfig };
    
    // 如果有插件，更新插件配置
    if (currentPlugin.value) {
      currentPlugin.value.setConfig(newConfig);
    }
  }
}, { deep: true });

// ==================== Lifecycle ====================
onMounted(async () => {
  await nextTick();
  await loadPlugin();
  startAutoSave();
});

onUnmounted(async () => {
  // 清理防抖定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  // 停止自动保存
  stopAutoSave();
  
  // 卸载插件
  await unloadPlugin();
});

// ==================== Expose ====================
defineExpose({
  isLoading,
  loadError,
  currentPlugin,
  hasUnsavedChanges,
  reload,
  saveConfig,
});
</script>

<template>
  <div class="plugin-host">
    <!-- 加载状态 -->
    <Transition name="plugin-host-fade">
      <div
        v-if="isLoading"
        class="plugin-host__loading"
      >
        <div class="plugin-host__spinner"></div>
        <span class="plugin-host__loading-text">{{ loadingText }}</span>
      </div>
    </Transition>
    
    <!-- 错误状态 -->
    <Transition name="plugin-host-fade">
      <div
        v-if="!isLoading && loadError"
        class="plugin-host__error"
      >
        <div class="plugin-host__error-icon">⚠️</div>
        <p class="plugin-host__error-text">{{ errorText }}</p>
        <button
          class="plugin-host__retry-btn"
          type="button"
          @click="reload"
        >
          重试
        </button>
      </div>
    </Transition>
    
    <!-- 注册的编辑器组件 -->
    <div
      v-if="!isLoading && !loadError && usePluginComponent && currentEditorComponent"
      class="plugin-host__editor-component"
    >
      <component
        :is="currentEditorComponent"
        :initial-content="(localConfig.content_text as string) || ''"
        :options="{ toolbar: true, autoSave: true, placeholder: '在此输入内容...' }"
        :on-content-change="handleEditorContentChange"
      />
    </div>
    
    <!-- 插件容器（用于挂载原生插件） -->
    <div
      v-show="!isLoading && !loadError && currentPlugin && !usePluginComponent"
      ref="pluginContainerRef"
      class="plugin-host__container"
    ></div>
    
    <!-- 默认编辑器 -->
    <Transition name="plugin-host-fade">
      <div
        v-if="!isLoading && !loadError && useDefaultEditor && currentBaseCard"
        class="plugin-host__default-editor"
      >
        <DefaultEditor
          :base-card="currentBaseCard"
          :mode="'form'"
          @config-change="handleDefaultConfigChange"
        />
      </div>
    </Transition>
    
    <!-- 未保存指示器 -->
    <Transition name="plugin-host-fade">
      <div
        v-if="hasUnsavedChanges"
        class="plugin-host__unsaved-indicator"
        title="有未保存的更改"
      >
        <span class="plugin-host__unsaved-dot"></span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ==================== 容器 ==================== */
/* 编辑面板只提供容器，界面完全由插件设计 */
.plugin-host {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ==================== 加载状态 ==================== */
.plugin-host__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--chips-color-surface, #ffffff);
  z-index: 10;
}

.plugin-host__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--chips-color-border, #e0e0e0);
  border-top-color: var(--chips-color-primary, #3b82f6);
  border-radius: 50%;
  animation: plugin-host-spin 0.8s linear infinite;
}

@keyframes plugin-host-spin {
  to {
    transform: rotate(360deg);
  }
}

.plugin-host__loading-text {
  margin-top: var(--chips-spacing-md, 12px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-secondary, #666666);
}

/* ==================== 错误状态 ==================== */
.plugin-host__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--chips-spacing-xl, 32px);
  background: var(--chips-color-surface, #ffffff);
  text-align: center;
  z-index: 10;
}

.plugin-host__error-icon {
  font-size: 48px;
  margin-bottom: var(--chips-spacing-md, 12px);
}

.plugin-host__error-text {
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-error, #ef4444);
  margin: 0 0 var(--chips-spacing-md, 12px);
}

.plugin-host__retry-btn {
  padding: var(--chips-spacing-sm, 8px) var(--chips-spacing-md, 12px);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-primary, #3b82f6);
  background: transparent;
  border: 1px solid var(--chips-color-primary, #3b82f6);
  border-radius: var(--chips-radius-sm, 4px);
  cursor: pointer;
  transition: background-color var(--chips-transition-fast, 0.15s) ease,
              color var(--chips-transition-fast, 0.15s) ease;
}

.plugin-host__retry-btn:hover {
  background: var(--chips-color-primary, #3b82f6);
  color: var(--chips-color-on-primary, #ffffff);
}

/* ==================== 插件容器 ==================== */
.plugin-host__container {
  flex: 1;
  overflow: auto;
}

/* ==================== 编辑器组件 ==================== */
/* 插件容器 - 布局完全由插件自己控制 */
.plugin-host__editor-component {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ==================== 默认编辑器 ==================== */
.plugin-host__default-editor {
  flex: 1;
  overflow: auto;
}

/* ==================== 未保存指示器 ==================== */
.plugin-host__unsaved-indicator {
  position: absolute;
  top: var(--chips-spacing-sm, 8px);
  right: var(--chips-spacing-sm, 8px);
  z-index: 15;
}

.plugin-host__unsaved-dot {
  display: block;
  width: 8px;
  height: 8px;
  background: var(--chips-color-warning, #f59e0b);
  border-radius: 50%;
  animation: plugin-host-pulse 1.5s ease-in-out infinite;
}

@keyframes plugin-host-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

/* ==================== 过渡动画 ==================== */
.plugin-host-fade-enter-active,
.plugin-host-fade-leave-active {
  transition: opacity var(--chips-transition-fast, 0.15s) ease;
}

.plugin-host-fade-enter-from,
.plugin-host-fade-leave-to {
  opacity: 0;
}
</style>
