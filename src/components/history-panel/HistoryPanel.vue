<script setup lang="ts">
/**
 * 历史面板组件
 * @component HistoryPanel
 * @description 显示撤销/重做操作历史列表，支持点击跳转到特定状态
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useCommandManager } from '@/core/command-manager';
import type { CommandHistory } from '@/core/command-manager';

/** 组件属性 */
interface Props {
  /** 最大显示数量 */
  maxItems?: number;
  /** 是否显示时间 */
  showTime?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
}

/** 组件事件 */
interface Emits {
  /** 跳转到历史记录 */
  (e: 'goto', historyId: string): void;
  /** 撤销操作 */
  (e: 'undo'): void;
  /** 重做操作 */
  (e: 'redo'): void;
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 50,
  showTime: true,
  compact: false,
});

const emit = defineEmits<Emits>();

const commandManager = useCommandManager();

// 状态
const undoHistory = ref<CommandHistory[]>([]);
const redoHistory = ref<CommandHistory[]>([]);
const isLoading = ref(false);
const currentIndex = ref(-1);

// 计算属性
const canUndo = computed(() => commandManager.canUndo());
const canRedo = computed(() => commandManager.canRedo());

const displayHistory = computed(() => {
  // 合并历史记录：重做记录（未来）+ 撤销记录（过去）
  const redo = redoHistory.value.map((h, i) => ({
    ...h,
    type: 'redo' as const,
    index: i,
  }));
  
  const undo = undoHistory.value.map((h, i) => ({
    ...h,
    type: 'undo' as const,
    index: i,
  }));
  
  // 当前位置标记
  const current = undo.length > 0 ? undo.length - 1 : -1;
  currentIndex.value = current;
  
  return [...redo.reverse(), ...undo].slice(0, props.maxItems);
});

// 格式化时间
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 格式化相对时间
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  } else {
    return formatTime(timestamp);
  }
};

// 获取操作描述（模拟 i18n）
const getDescription = (key: string): string => {
  // 开发阶段的简单翻译映射
  const descriptions: Record<string, string> = {
    'command.add_base_card': '添加卡片',
    'command.remove_base_card': '删除卡片',
    'command.move_base_card': '移动卡片',
    'command.update_base_card_config': '更新卡片配置',
    'command.batch_operation': '批量操作',
    'command.create_window': '创建窗口',
    'command.close_window': '关闭窗口',
    'command.move_window': '移动窗口',
    'command.resize_window': '调整窗口大小',
    'command.set_window_state': '设置窗口状态',
    'command.batch_window_operation': '批量窗口操作',
  };
  
  return descriptions[key] || key;
};

// 更新历史记录
const updateHistory = () => {
  undoHistory.value = commandManager.getHistory(props.maxItems);
  redoHistory.value = commandManager.getRedoHistory();
};

// 撤销操作
const handleUndo = async () => {
  if (!canUndo.value || isLoading.value) return;
  
  isLoading.value = true;
  try {
    await commandManager.undo();
    emit('undo');
  } finally {
    isLoading.value = false;
    updateHistory();
  }
};

// 重做操作
const handleRedo = async () => {
  if (!canRedo.value || isLoading.value) return;
  
  isLoading.value = true;
  try {
    await commandManager.redo();
    emit('redo');
  } finally {
    isLoading.value = false;
    updateHistory();
  }
};

// 跳转到特定历史记录
const handleGoto = async (historyId: string) => {
  if (isLoading.value) return;
  
  isLoading.value = true;
  try {
    await commandManager.goToHistory(historyId);
    emit('goto', historyId);
  } finally {
    isLoading.value = false;
    updateHistory();
  }
};

// 清空历史
const handleClear = () => {
  commandManager.clear();
  updateHistory();
};

// 监听状态变化
const handleStateChange = () => {
  updateHistory();
};

onMounted(() => {
  updateHistory();
  
  // 订阅命令管理器事件
  commandManager.on('state:changed', handleStateChange);
  commandManager.on('command:executed', handleStateChange);
  commandManager.on('command:undone', handleStateChange);
  commandManager.on('command:redone', handleStateChange);
  commandManager.on('history:cleared', handleStateChange);
});

onUnmounted(() => {
  // 取消订阅
  commandManager.off('state:changed', handleStateChange);
  commandManager.off('command:executed', handleStateChange);
  commandManager.off('command:undone', handleStateChange);
  commandManager.off('command:redone', handleStateChange);
  commandManager.off('history:cleared', handleStateChange);
});

// 监听 maxItems 变化
watch(() => props.maxItems, () => {
  updateHistory();
});
</script>

<template>
  <div class="history-panel" :class="{ compact }">
    <!-- 工具栏 -->
    <div class="history-toolbar">
      <button
        class="history-btn"
        :disabled="!canUndo || isLoading"
        title="撤销 (Ctrl+Z)"
        @click="handleUndo"
      >
        <span class="history-btn-icon">↶</span>
        <span v-if="!compact" class="history-btn-text">撤销</span>
      </button>
      
      <button
        class="history-btn"
        :disabled="!canRedo || isLoading"
        title="重做 (Ctrl+Shift+Z)"
        @click="handleRedo"
      >
        <span class="history-btn-icon">↷</span>
        <span v-if="!compact" class="history-btn-text">重做</span>
      </button>
      
      <div class="history-toolbar-spacer"></div>
      
      <button
        class="history-btn history-btn-clear"
        :disabled="displayHistory.length === 0"
        title="清空历史"
        @click="handleClear"
      >
        <span class="history-btn-icon">🗑</span>
      </button>
    </div>
    
    <!-- 历史列表 -->
    <div v-if="displayHistory.length > 0" class="history-list">
      <div
        v-for="(item, index) in displayHistory"
        :key="item.id"
        class="history-item"
        :class="{
          'history-item--current': item.type === 'undo' && item.index === currentIndex,
          'history-item--redo': item.type === 'redo',
          'history-item--undo': item.type === 'undo',
        }"
        @click="handleGoto(item.id)"
      >
        <div class="history-item-indicator">
          <span v-if="item.type === 'undo' && item.index === currentIndex" class="current-marker">●</span>
          <span v-else class="history-marker">○</span>
        </div>
        
        <div class="history-item-content">
          <div class="history-item-description">
            {{ getDescription(item.description) }}
          </div>
          <div v-if="showTime && !compact" class="history-item-time">
            {{ formatRelativeTime(item.timestamp) }}
          </div>
        </div>
        
        <div v-if="item.type === 'redo'" class="history-item-badge">
          待重做
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="history-empty">
      <div class="history-empty-icon">📋</div>
      <div class="history-empty-text">暂无操作历史</div>
    </div>
    
    <!-- 状态栏 -->
    <div class="history-status">
      <span>撤销: {{ undoHistory.length }}</span>
      <span class="history-status-divider">|</span>
      <span>重做: {{ redoHistory.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary, #ffffff);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
}

.history-panel.compact {
  font-size: var(--font-size-small, 12px);
}

/* 工具栏 */
.history-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  padding: var(--spacing-sm, 8px);
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  background: var(--color-bg-secondary, #f5f5f5);
}

.history-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  border: none;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-bg-primary, #ffffff);
  color: var(--color-text-primary, #333333);
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.history-btn:hover:not(:disabled) {
  background: var(--color-bg-hover, #e8e8e8);
}

.history-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-btn-icon {
  font-size: var(--font-size-medium, 14px);
}

.history-btn-text {
  font-size: var(--font-size-small, 12px);
}

.history-btn-clear {
  background: transparent;
}

.history-btn-clear:hover:not(:disabled) {
  background: var(--color-danger-light, #ffebee);
  color: var(--color-danger, #f44336);
}

.history-toolbar-spacer {
  flex: 1;
}

/* 历史列表 */
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xs, 4px);
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-sm, 8px);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: background-color 0.2s;
}

.history-item:hover {
  background: var(--color-bg-hover, #f0f0f0);
}

.history-item--current {
  background: var(--color-primary-light, #e3f2fd);
}

.history-item--current:hover {
  background: var(--color-primary-light, #e3f2fd);
}

.history-item--redo {
  opacity: 0.6;
}

.history-item-indicator {
  width: 16px;
  text-align: center;
  color: var(--color-text-secondary, #666666);
}

.current-marker {
  color: var(--color-primary, #2196f3);
}

.history-item-content {
  flex: 1;
  min-width: 0;
}

.history-item-description {
  font-size: var(--font-size-small, 12px);
  color: var(--color-text-primary, #333333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-time {
  font-size: var(--font-size-xs, 10px);
  color: var(--color-text-tertiary, #999999);
  margin-top: 2px;
}

.history-item-badge {
  font-size: var(--font-size-xs, 10px);
  padding: 2px 6px;
  background: var(--color-warning-light, #fff3e0);
  color: var(--color-warning, #ff9800);
  border-radius: var(--radius-sm, 4px);
}

/* 空状态 */
.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary, #999999);
}

.history-empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-sm, 8px);
}

.history-empty-text {
  font-size: var(--font-size-small, 12px);
}

/* 状态栏 */
.history-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  border-top: 1px solid var(--color-border, #e0e0e0);
  background: var(--color-bg-secondary, #f5f5f5);
  font-size: var(--font-size-xs, 10px);
  color: var(--color-text-tertiary, #999999);
}

.history-status-divider {
  color: var(--color-border, #e0e0e0);
}

/* 紧凑模式调整 */
.compact .history-toolbar {
  padding: var(--spacing-xs, 4px);
}

.compact .history-btn {
  padding: 2px 6px;
}

.compact .history-item {
  padding: var(--spacing-xs, 4px);
}

.compact .history-status {
  padding: 2px var(--spacing-xs, 4px);
}
</style>
