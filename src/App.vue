<script setup lang="ts">
/**
 * Chips Editor - 根组件
 * @module App
 * @description 编辑器应用入口，集成无限画布布局
 */

import { ref, onMounted, onUnmounted, provide, computed } from 'vue';
import { InfiniteCanvas, Workbench } from '@/layouts';
import { useEditorStore, useUIStore, useCardStore } from '@/core/state';
import { useWindowManager } from '@/core/window-manager';
import { useWorkspaceService } from '@/core/workspace-service';
import { FileManager } from '@/components/file-manager';
import { EditPanel } from '@/components/edit-panel';
import { CardBoxLibrary, type DragData } from '@/components/card-box-library';
import type { CardWindowConfig, ToolWindowConfig } from '@/types';

/** 编辑器状态 Store */
const editorStore = useEditorStore();
const uiStore = useUIStore();
const cardStore = useCardStore();
const windowManager = useWindowManager();
const workspaceService = useWorkspaceService();

/** 应用状态 */
const isReady = ref(false);
const errorMessage = ref<string | null>(null);

/** 当前布局类型 */
const currentLayout = computed(() => editorStore.currentLayout);

/** 窗口尺寸 */
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1400);
const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 900);

/**
 * 初始化工具窗口到 uiStore
 */
function initializeToolWindows(): void {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1400;
  const h = typeof window !== 'undefined' ? window.innerHeight : 900;

  // 文件管理器
  const fileManagerConfig: ToolWindowConfig = {
    id: 'file-manager',
    type: 'tool',
    component: 'FileManager',
    title: '文件管理器',
    icon: '📁',
    position: { x: 20, y: 20 },
    size: { width: 280, height: 500 },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: false, // 工具窗口不需要关闭按钮
    minimizable: true,
  };

  // 编辑面板
  const editPanelConfig: ToolWindowConfig = {
    id: 'edit-panel',
    type: 'tool',
    component: 'EditPanel',
    title: '编辑面板',
    icon: '✏️',
    position: { x: w - 340, y: 20 },
    size: { width: 320, height: 500 },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: false, // 工具窗口不需要关闭按钮
    minimizable: true,
  };

  // 卡箱库
  const cardBoxLibraryConfig: ToolWindowConfig = {
    id: 'card-box-library',
    type: 'tool',
    component: 'CardBoxLibrary',
    title: '卡箱库',
    icon: '📦',
    position: { x: 20, y: h - 350 },
    size: { width: 400, height: 300 },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: false, // 工具窗口不需要关闭按钮
    minimizable: true,
  };

  // 注册工具窗口到 uiStore
  uiStore.addWindow(fileManagerConfig);
  uiStore.addWindow(editPanelConfig);
  uiStore.addWindow(cardBoxLibraryConfig);
}

/** 卡片计数器（用于生成默认名称） */
let cardCounter = 0;

/** 更新窗口尺寸 */
function updateWindowSize(): void {
  windowWidth.value = window.innerWidth;
  windowHeight.value = window.innerHeight;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 处理拖放创建卡片/箱子
 * @param data - 拖放数据
 * @param worldPosition - 世界坐标位置
 */
async function handleDropCreate(
  data: DragData,
  worldPosition: { x: number; y: number }
): Promise<void> {
  console.log('[App] 拖放创建:', data, '位置:', worldPosition);

  if (data.type === 'card') {
    // 创建复合卡片
    await createCompositeCard(data, worldPosition);
  } else if (data.type === 'layout') {
    // 创建箱子
    await createBox(data, worldPosition);
  }
}

/**
 * 创建复合卡片
 * @param data - 基础卡片类型数据
 * @param position - 桌面位置
 */
async function createCompositeCard(
  data: DragData,
  position: { x: number; y: number }
): Promise<void> {
  cardCounter++;
  const cardName = `未命名卡片 ${cardCounter}`;
  const cardId = generateId();
  const windowId = `window-${cardId}`;
  const timestamp = new Date().toISOString();

  // 创建基础卡片数据
  const baseCardId = generateId();
  const baseCard = {
    id: baseCardId,
    type: data.typeId, // 基础卡片类型 ID（如 'rich-text'）
    config: {},
  };

  // 创建卡片数据并添加到 cardStore
  cardStore.addCard({
    id: cardId,
    metadata: {
      chip_standards_version: '1.0',
      card_id: cardId,
      name: cardName,
      created_at: timestamp,
      modified_at: timestamp,
    },
    structure: {
      structure: [baseCard],
      manifest: {
        card_count: 1,
        resource_count: 0,
        resources: [],
      },
    },
  });

  // 设置为活动卡片
  cardStore.setActiveCard(cardId);

  // 创建卡片窗口配置
  const windowConfig: CardWindowConfig = {
    id: windowId,
    type: 'card',
    cardId: cardId,
    title: cardName,
    icon: '🃏',
    position: { x: position.x, y: position.y },
    size: { width: 360, height: 500 },
    state: 'normal',
    zIndex: 100,
    resizable: true,
    draggable: true,
    closable: true,
    minimizable: true,
    isEditing: true, // 默认进入编辑模式
  };

  // 添加窗口到 uiStore
  uiStore.addWindow(windowConfig);
  uiStore.focusWindow(windowId);

  // 创建工作区文件记录（使用相同的 cardId 确保数据同步）
  await workspaceService.createCard(cardName, { type: data.typeId }, cardId);

  console.log('[App] 已创建复合卡片:', cardName, 'ID:', cardId, '包含基础卡片:', data.name);
}

/**
 * 创建箱子
 * @param data - 布局类型数据
 * @param position - 桌面位置
 */
async function createBox(
  data: DragData,
  position: { x: number; y: number }
): Promise<void> {
  // TODO: 实现箱子创建逻辑
  console.log('[App] 创建箱子:', data.name, '布局类型:', data.typeId, '位置:', position);
  
  // 暂时创建一个工作区文件记录
  await workspaceService.createBox(`新箱子 ${cardCounter++}`, data.typeId);
}

onMounted(() => {
  window.addEventListener('resize', updateWindowSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowSize);
});

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
    // 初始化工作区服务
    await workspaceService.initialize();

    // 初始化工具窗口到 uiStore
    initializeToolWindows();

    // 模拟初始化延迟
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 设置默认布局
    editorStore.setLayout('infinite-canvas');

    isReady.value = true;
    console.log('[Chips Editor] 初始化完成');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Chips Editor] Initialization failed:', error);
  }
});

/** 提供编辑器上下文给子组件 */
provide('editorContext', {
  editorStore,
  uiStore,
  cardStore,
  workspaceService,
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
      <InfiniteCanvas 
        v-if="currentLayout === 'infinite-canvas'"
        @drop-create="handleDropCreate"
      >
        <template #desktop>
          <!-- 卡片窗口由 DesktopLayer 自动渲染 -->
        </template>

        <!-- 工具窗口内容通过具名插槽提供给 WindowLayer -->
        <template #tool-FileManager>
          <FileManager />
        </template>

        <template #tool-EditPanel>
          <EditPanel />
        </template>

        <template #tool-CardBoxLibrary>
          <CardBoxLibrary />
        </template>
      </InfiniteCanvas>

      <!-- 工作台布局 -->
      <Workbench v-else-if="currentLayout === 'workbench'" />

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
