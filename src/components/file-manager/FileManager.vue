<script setup lang="ts">
/**
 * 文件管理器主组件
 * @module components/file-manager/FileManager
 * @description 文件管理器主界面，包含工具栏、文件树和状态栏
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import FileTree from './FileTree.vue';
import ContextMenu from './ContextMenu.vue';
import {
  type FileInfo,
  type ClipboardData,
  getFileService,
  isValidFileName,
} from '@/core/file-service';
import { createEventEmitter } from '@/core/event-manager';

interface Props {
  /** 初始工作目录 */
  workingDirectory?: string;
}

const props = withDefaults(defineProps<Props>(), {
  workingDirectory: '/workspace',
});

const emit = defineEmits<{
  /** 打开文件 */
  'open-file': [file: FileInfo];
  /** 创建卡片 */
  'create-card': [file: FileInfo];
  /** 创建箱子 */
  'create-box': [file: FileInfo];
}>();

// 获取文件服务实例（使用临时事件发射器）
const events = createEventEmitter();
const fileService = getFileService(events);

/** 文件树数据 */
const files = ref<FileInfo[]>([]);
/** 选中的文件路径 */
const selectedPaths = ref<string[]>([]);
/** 选中的文件 */
const selectedFiles = computed(() => 
  files.value.length > 0
    ? flattenAllFiles(files.value).filter((f) => selectedPaths.value.includes(f.path))
    : []
);
/** 正在重命名的文件路径 */
const renamingPath = ref<string | null>(null);
/** 搜索关键词 */
const searchQuery = ref('');
/** 搜索输入框引用 */
const searchInputRef = ref<HTMLInputElement | null>(null);
/** 搜索结果 */
const searchResults = ref<FileInfo[]>([]);
/** 是否正在搜索 */
const isSearching = computed(() => searchQuery.value.trim().length > 0);
/** 显示的文件列表 */
const displayFiles = computed(() => 
  isSearching.value ? searchResults.value : files.value
);
/** 是否正在加载 */
const isLoading = ref(false);
/** 上下文菜单状态 */
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
});
/** 剪贴板数据 */
const clipboard = ref<ClipboardData | null>(null);
/** 是否有剪贴板内容 */
const hasClipboard = computed(() => 
  clipboard.value !== null && clipboard.value.files.length > 0
);

/**
 * 扁平化所有文件（包含嵌套）
 */
function flattenAllFiles(fileList: FileInfo[]): FileInfo[] {
  const result: FileInfo[] = [];
  const flatten = (list: FileInfo[]): void => {
    for (const file of list) {
      result.push(file);
      if (file.children) {
        flatten(file.children);
      }
    }
  };
  flatten(fileList);
  return result;
}

/**
 * 加载文件列表
 */
async function loadFiles(): Promise<void> {
  isLoading.value = true;
  try {
    files.value = await fileService.getFileTree();
  } catch (error) {
    console.error('Failed to load files:', error);
  } finally {
    isLoading.value = false;
  }
}

/**
 * 刷新文件列表
 */
async function handleRefresh(): Promise<void> {
  await fileService.refresh();
  await loadFiles();
}

/**
 * 处理文件选择
 */
function handleSelect(paths: string[], _files: FileInfo[]): void {
  selectedPaths.value = paths;
}

/**
 * 处理文件打开
 */
function handleOpen(file: FileInfo): void {
  emit('open-file', file);
}

/**
 * 处理右键菜单
 */
function handleContextMenu(file: FileInfo, event: MouseEvent): void {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
  };
}

/**
 * 关闭右键菜单
 */
function closeContextMenu(): void {
  contextMenu.value.visible = false;
}

/**
 * 处理展开/收起
 */
async function handleToggle(file: FileInfo): Promise<void> {
  await fileService.toggleFolderExpanded(file.path);
  // 重新加载以获取更新后的状态
  files.value = await fileService.getFileTree();
}

/**
 * 处理重命名
 */
async function handleRename(file: FileInfo, newName: string): Promise<void> {
  const result = await fileService.renameFile(file.path, newName);
  if (result.success) {
    await loadFiles();
    renamingPath.value = null;
  } else {
    console.error('Rename failed:', result.error);
  }
}

/**
 * 取消重命名
 */
function handleRenameCancel(): void {
  renamingPath.value = null;
}

/**
 * 处理搜索
 */
async function handleSearch(): Promise<void> {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }

  searchResults.value = await fileService.searchFiles(searchQuery.value);
}

/**
 * 清除搜索
 */
function clearSearch(): void {
  searchQuery.value = '';
  searchResults.value = [];
}

/**
 * 处理上下文菜单操作
 */
async function handleContextMenuAction(actionId: string, targetFiles: FileInfo[]): Promise<void> {
  const targetPath = targetFiles[0]?.isDirectory 
    ? targetFiles[0].path 
    : fileService.getWorkingDirectory();

  switch (actionId) {
    case 'new-card': {
      const result = await fileService.createCard({
        name: 'file.untitled_card',
        parentPath: targetPath,
      });
      if (result.success && result.file) {
        await loadFiles();
        // 自动进入重命名状态
        renamingPath.value = result.file.path;
        emit('create-card', result.file);
      }
      break;
    }

    case 'new-box': {
      const result = await fileService.createBox({
        name: 'file.untitled_box',
        parentPath: targetPath,
      });
      if (result.success && result.file) {
        await loadFiles();
        renamingPath.value = result.file.path;
        emit('create-box', result.file);
      }
      break;
    }

    case 'new-folder': {
      const result = await fileService.createFolder({
        name: 'file.new_folder_name',
        parentPath: targetPath,
      });
      if (result.success && result.file) {
        await loadFiles();
        renamingPath.value = result.file.path;
      }
      break;
    }

    case 'open':
      if (targetFiles[0]) {
        handleOpen(targetFiles[0]);
      }
      break;

    case 'cut':
      fileService.cutToClipboard(targetFiles.map((f) => f.path));
      clipboard.value = fileService.getClipboard();
      break;

    case 'copy':
      fileService.copyToClipboard(targetFiles.map((f) => f.path));
      clipboard.value = fileService.getClipboard();
      break;

    case 'paste':
      await fileService.paste(targetPath);
      clipboard.value = fileService.getClipboard();
      await loadFiles();
      break;

    case 'rename':
      if (targetFiles[0]) {
        renamingPath.value = targetFiles[0].path;
      }
      break;

    case 'delete':
      for (const file of targetFiles) {
        await fileService.deleteFile(file.path);
      }
      selectedPaths.value = [];
      await loadFiles();
      break;

    case 'refresh':
      await handleRefresh();
      break;

    case 'reveal':
      // TODO: 实现在资源管理器中显示
      console.log('Reveal in finder:', targetFiles[0]?.path);
      break;
  }
}

/**
 * 处理快捷键
 */
function handleKeyDown(event: KeyboardEvent): void {
  // 如果正在重命名，不处理快捷键
  if (renamingPath.value) return;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  switch (event.key) {
    case 'Delete':
    case 'Backspace':
      if (selectedFiles.value.length > 0) {
        event.preventDefault();
        handleContextMenuAction('delete', selectedFiles.value);
      }
      break;

    case 'F2':
      if (selectedFiles.value.length === 1) {
        event.preventDefault();
        renamingPath.value = selectedFiles.value[0]!.path;
      }
      break;

    case 'F5':
      event.preventDefault();
      handleRefresh();
      break;

    case 'c':
      if (modKey && selectedFiles.value.length > 0) {
        event.preventDefault();
        handleContextMenuAction('copy', selectedFiles.value);
      }
      break;

    case 'x':
      if (modKey && selectedFiles.value.length > 0) {
        event.preventDefault();
        handleContextMenuAction('cut', selectedFiles.value);
      }
      break;

    case 'v':
      if (modKey && hasClipboard.value) {
        event.preventDefault();
        handleContextMenuAction('paste', selectedFiles.value);
      }
      break;

    case 'f':
      if (modKey) {
        event.preventDefault();
        searchInputRef.value?.focus();
      }
      break;

    case 'Enter':
      if (selectedFiles.value.length === 1) {
        const file = selectedFiles.value[0]!;
        if (file.isDirectory) {
          handleToggle(file);
        } else {
          handleOpen(file);
        }
      }
      break;

    case 'Escape':
      if (isSearching.value) {
        clearSearch();
      }
      break;
  }
}

// 监听搜索关键词变化
watch(searchQuery, handleSearch);

// 挂载时加载文件
onMounted(async () => {
  await loadFiles();
  window.addEventListener('keydown', handleKeyDown);
});

// 卸载时清理
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="file-manager">
    <!-- 工具栏 -->
    <div class="file-manager__toolbar">
      <div class="file-manager__toolbar-left">
        <button
          class="file-manager__btn file-manager__btn--icon"
          title="file.new_card"
          @click="handleContextMenuAction('new-card', [])"
        >
          🃏
        </button>
        <button
          class="file-manager__btn file-manager__btn--icon"
          title="file.new_box"
          @click="handleContextMenuAction('new-box', [])"
        >
          📦
        </button>
        <button
          class="file-manager__btn file-manager__btn--icon"
          title="file.new_folder"
          @click="handleContextMenuAction('new-folder', [])"
        >
          📁
        </button>
        <div class="file-manager__toolbar-divider"></div>
        <button
          class="file-manager__btn file-manager__btn--icon"
          title="file.refresh"
          :disabled="isLoading"
          @click="handleRefresh"
        >
          🔄
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="file-manager__search">
        <span class="file-manager__search-icon">🔍</span>
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          class="file-manager__search-input"
          placeholder="file.search_placeholder"
        />
        <button
          v-if="searchQuery"
          class="file-manager__search-clear"
          @click="clearSearch"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 文件树 -->
    <div class="file-manager__content">
      <div v-if="isLoading" class="file-manager__loading">
        <span class="file-manager__loading-spinner">⏳</span>
        <span>file.loading</span>
      </div>

      <FileTree
        v-else
        :files="displayFiles"
        :selected-paths="selectedPaths"
        :renaming-path="renamingPath"
        :search-query="searchQuery"
        :multi-select="true"
        @select="handleSelect"
        @open="handleOpen"
        @contextmenu="handleContextMenu"
        @toggle="handleToggle"
        @rename="handleRename"
        @rename-cancel="handleRenameCancel"
      />
    </div>

    <!-- 状态栏 -->
    <div class="file-manager__statusbar">
      <template v-if="isSearching">
        <span>file.search_results</span>
        <span class="file-manager__statusbar-count">{{ searchResults.length }}</span>
      </template>
      <template v-else>
        <span v-if="selectedPaths.length > 0">
          file.selected_count
          <span class="file-manager__statusbar-count">{{ selectedPaths.length }}</span>
        </span>
        <span v-else>
          file.total_items
          <span class="file-manager__statusbar-count">{{ flattenAllFiles(files).length }}</span>
        </span>
      </template>
    </div>

    <!-- 上下文菜单 -->
    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :selected-files="selectedFiles"
      :has-clipboard="hasClipboard"
      @close="closeContextMenu"
      @action="handleContextMenuAction"
    />
  </div>
</template>

<style scoped>
.file-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--chips-color-bg-secondary, #f8f9fa);
}

/* 工具栏 */
.file-manager__toolbar {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-sm, 8px);
  padding: var(--chips-spacing-sm, 8px);
  background-color: var(--chips-color-bg-primary, #fff);
  border-bottom: 1px solid var(--chips-color-border-light, #f0f0f0);
}

.file-manager__toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
}

.file-manager__toolbar-divider {
  width: 1px;
  height: 20px;
  background-color: var(--chips-color-border, #e0e0e0);
  margin: 0 var(--chips-spacing-xs, 4px);
}

.file-manager__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--chips-spacing-xs, 4px);
  border: none;
  background: transparent;
  border-radius: var(--chips-radius-sm, 4px);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.file-manager__btn:hover:not(:disabled) {
  background-color: var(--chips-color-bg-hover, rgba(0, 0, 0, 0.05));
}

.file-manager__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-manager__btn--icon {
  width: 28px;
  height: 28px;
  font-size: 16px;
}

/* 搜索框 */
.file-manager__search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  background-color: var(--chips-color-bg-secondary, #f5f5f5);
  border-radius: var(--chips-radius-sm, 4px);
  border: 1px solid transparent;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.file-manager__search:focus-within {
  background-color: var(--chips-color-bg-primary, #fff);
  border-color: var(--chips-color-primary, #1890ff);
}

.file-manager__search-icon {
  font-size: 12px;
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text-primary, #1a1a1a);
  outline: none;
}

.file-manager__search-input::placeholder {
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: var(--chips-color-text-tertiary, #999);
  color: var(--chips-color-bg-primary, #fff);
  border-radius: var(--chips-radius-full, 9999px);
  font-size: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.file-manager__search-clear:hover {
  background-color: var(--chips-color-text-secondary, #666);
}

/* 内容区 */
.file-manager__content {
  flex: 1;
  overflow: hidden;
  background-color: var(--chips-color-bg-primary, #fff);
}

/* 加载状态 */
.file-manager__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--chips-spacing-sm, 8px);
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__loading-spinner {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 状态栏 */
.file-manager__statusbar {
  display: flex;
  align-items: center;
  gap: var(--chips-spacing-xs, 4px);
  padding: var(--chips-spacing-xs, 4px) var(--chips-spacing-sm, 8px);
  background-color: var(--chips-color-bg-secondary, #f8f9fa);
  border-top: 1px solid var(--chips-color-border-light, #f0f0f0);
  font-size: var(--chips-font-size-xs, 12px);
  color: var(--chips-color-text-tertiary, #999);
}

.file-manager__statusbar-count {
  font-weight: var(--chips-font-weight-medium, 500);
  color: var(--chips-color-text-secondary, #666);
}
</style>
