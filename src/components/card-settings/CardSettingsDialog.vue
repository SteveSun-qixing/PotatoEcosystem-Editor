<script setup lang="ts">
/**
 * 卡片设置对话框组件
 * @module components/card-settings/CardSettingsDialog
 * @description 提供复合卡片的设置功能，包括名称、主题、封面、标签、导出等
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useCardStore, type CardInfo, type BaseCardInfo } from '@/core/state';
import { useWorkspaceService } from '@/core/workspace-service';
import { conversionService } from '@/services/conversion-service';
import CoverMaker from '@/components/cover-maker/CoverMaker.vue';
import type { CoverData } from '@/components/cover-maker/types';
import JSZip from 'jszip';

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

// 开发文件服务器地址
const DEV_FILE_SERVER = 'http://localhost:3456';
const FILE_SERVER_URL = DEV_FILE_SERVER; // 转换 API 使用
const EXPORT_DIR = '/ProductFinishedProductTestingSpace/ExternalEnvironment';

// 导入 CardFileData 类型
import type { CardFileData } from '@/services/conversion-service';

/**
 * 保存卡片到工作区
 * 在导出前自动保存，确保工作区数据是最新的
 */
async function saveCardToWorkspace(cardId: string, cardPath: string, card: CardInfo): Promise<void> {
  // 辅助函数：YAML 序列化
  const toYaml = (obj: unknown, indent = 0): string => {
    const spaces = '  '.repeat(indent);
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || 
          obj.includes("'") || obj.includes('"') || obj.startsWith(' ') ||
          obj.endsWith(' ') || obj === '') {
        return `"${obj.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      }
      return obj;
    }
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map(item => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const entries = Object.entries(item as Record<string, unknown>);
          if (entries.length === 0) return `${spaces}- {}`;
          const firstEntry = entries[0]!;
          const [firstKey, firstVal] = firstEntry;
          const firstValue = typeof firstVal === 'object' && firstVal !== null
            ? `\n${toYaml(firstVal, indent + 2)}`
            : ` ${toYaml(firstVal, 0)}`;
          const firstLine = `${spaces}- ${firstKey}:${firstValue}`;
          const restLines = entries.slice(1).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              if (Array.isArray(value) && value.length === 0) return `${spaces}  ${key}: []`;
              if (!Array.isArray(value) && Object.keys(value).length === 0) return `${spaces}  ${key}: {}`;
              return `${spaces}  ${key}:\n${toYaml(value, indent + 2)}`;
            }
            return `${spaces}  ${key}: ${toYaml(value, 0)}`;
          });
          return [firstLine, ...restLines].join('\n');
        }
        return `${spaces}- ${toYaml(item, 0)}`;
      }).join('\n');
    }
    if (typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>);
      if (entries.length === 0) return '{}';
      return entries.map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value) && value.length === 0) return `${spaces}${key}: []`;
          if (!Array.isArray(value) && Object.keys(value).length === 0) return `${spaces}${key}: {}`;
          return `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
        }
        return `${spaces}${key}: ${toYaml(value, indent)}`;
      }).join('\n');
    }
    return String(obj);
  };
  
  // 辅助函数：写入文件
  const writeFile = async (filePath: string, content: string) => {
    await fetch(`${DEV_FILE_SERVER}/file/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  };
  
  // 辅助函数：创建目录
  const mkdir = async (dirPath: string) => {
    await fetch(`${DEV_FILE_SERVER}/mkdir/${encodeURIComponent(dirPath)}`, {
      method: 'POST',
    });
  };
  
  // 创建目录结构
  await mkdir(cardPath);
  await mkdir(`${cardPath}/.card`);
  await mkdir(`${cardPath}/content`);
  await mkdir(`${cardPath}/cardcover`);
  
  // 写入 metadata.yaml
  const metadata = {
    card_id: cardId,
    name: card.metadata.name,
    created_at: card.metadata.created_at,
    modified_at: new Date().toISOString(),
    theme_id: card.metadata.theme || '薯片官方：默认主题',
    tags: card.metadata.tags || [],
    chips_standards_version: '1.0.0',
  };
  await writeFile(`${cardPath}/.card/metadata.yaml`, toYaml(metadata));
  
  // 写入 structure.yaml
  const structure = {
    structure: card.structure.map(bc => ({ id: bc.id, type: bc.type })),
    manifest: {
      card_count: card.structure.length,
      resource_count: 0,
      resources: [],
    },
  };
  await writeFile(`${cardPath}/.card/structure.yaml`, toYaml(structure));
  
  // 写入 cover.html
  const escapedName = card.metadata.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const coverHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedName}</title>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
    .card-name { font-size: 18px; font-weight: 500; color: #333; }
  </style>
</head>
<body>
  <div class="card-name">${escapedName}</div>
</body>
</html>`;
  await writeFile(`${cardPath}/.card/cover.html`, coverHtml);
  
  // 写入每个基础卡片的配置
  for (const baseCard of card.structure) {
    const basicCardConfig = {
      type: baseCard.type,
      data: baseCard.config || {},
    };
    await writeFile(`${cardPath}/content/${baseCard.id}.yaml`, toYaml(basicCardConfig));
  }
  
  console.log(`[SaveCard] 卡片已保存到工作区: ${cardPath}`);
}

/**
 * 从工作区读取卡片文件夹结构
 * 返回 Base64 编码的文件数据数组
 */
async function readCardFromWorkspace(cardPath: string): Promise<CardFileData[]> {
  // 使用专门的 card-files API 读取卡片目录（包括 .card 隐藏目录）
  const response = await fetch(`${DEV_FILE_SERVER}/card-files/${encodeURIComponent(cardPath)}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '读取失败' }));
    throw new Error(`读取卡片目录失败: ${error.error || response.statusText}`);
  }
  
  const data = await response.json();
  return data.files || [];
}

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
 * 检查文件服务器是否可用
 */
async function checkFileServer(): Promise<boolean> {
  try {
    const response = await fetch(`${DEV_FILE_SERVER}/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 将路径转换为文件服务器的相对路径
 * 文件服务器根目录是 ProductFinishedProductTestingSpace
 */
function toServerPath(fullPath: string): string {
  // 移除前导的虚拟路径前缀
  let relativePath = fullPath;
  if (fullPath.startsWith('/ProductFinishedProductTestingSpace/')) {
    relativePath = fullPath.replace('/ProductFinishedProductTestingSpace/', '');
  }
  // URL 编码每个路径段
  return relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

/**
 * 通过文件服务器写入文件（文本）
 */
async function writeFileToServer(filePath: string, content: string): Promise<void> {
  const serverPath = toServerPath(filePath);
  console.log('[Export] 写入文件:', serverPath);
  const response = await fetch(`${DEV_FILE_SERVER}/file/${serverPath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`写入文件失败: ${response.status} - ${error}`);
  }
}

/**
 * 通过文件服务器写入二进制文件
 */
async function writeBinaryFileToServer(filePath: string, data: Uint8Array): Promise<void> {
  const serverPath = toServerPath(filePath);
  console.log('[Export] 写入二进制文件:', serverPath, `(${data.length} bytes)`);
  
  // 将 Uint8Array 转换为 base64
  let binary = '';
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const base64 = btoa(binary);
  
  const response = await fetch(`${DEV_FILE_SERVER}/file/${serverPath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: base64, binary: true }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`写入二进制文件失败: ${response.status} - ${error}`);
  }
}

/**
 * 通过文件服务器创建目录
 */
async function mkdirOnServer(dirPath: string): Promise<void> {
  const serverPath = toServerPath(dirPath);
  console.log('[Export] 创建目录:', serverPath);
  const response = await fetch(`${DEV_FILE_SERVER}/mkdir/${serverPath}`, {
    method: 'POST',
  });
  if (!response.ok) {
    console.warn('[Export] 创建目录可能失败:', response.status);
  }
}

/**
 * 检查文件是否存在（通过文件服务器）
 * @param filePath - 完整文件路径
 * @returns 文件是否存在
 */
async function checkFileExistsOnServer(filePath: string): Promise<boolean> {
  try {
    const serverPath = toServerPath(filePath);
    const response = await fetch(`${DEV_FILE_SERVER}/exists/${serverPath}`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      const data = await response.json();
      return data.exists === true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 检查目录是否存在（通过文件服务器）
 * @param dirPath - 完整目录路径
 * @returns 目录是否存在
 */
async function checkDirectoryExistsOnServer(dirPath: string): Promise<boolean> {
  try {
    const serverPath = toServerPath(dirPath);
    const response = await fetch(`${DEV_FILE_SERVER}/exists/${serverPath}`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      const data = await response.json();
      return data.exists === true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 清理文件名中的非法字符
 * @param name - 原始名称
 * @returns 清理后的名称
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
}

/**
 * 生成唯一文件名（检查重名并自动添加编号）
 * @param baseName - 基础文件名（不含扩展名）
 * @param extension - 扩展名（包含点）
 * @param directory - 目标目录
 * @returns 唯一的文件名和完整路径
 */
async function generateUniqueFileName(
  baseName: string,
  extension: string,
  directory: string
): Promise<{ fileName: string; fullPath: string }> {
  const cleanBaseName = sanitizeFileName(baseName);
  const separator = '_';
  const maxAttempts = 1000;

  // 首先尝试原始文件名
  const originalFileName = `${cleanBaseName}${extension}`;
  const originalPath = `${directory}/${originalFileName}`;

  const exists = await checkFileExistsOnServer(originalPath);
  if (!exists) {
    return { fileName: originalFileName, fullPath: originalPath };
  }

  // 原始文件名已存在，尝试添加编号
  for (let i = 1; i <= maxAttempts; i++) {
    const numberedFileName = `${cleanBaseName}${separator}${i}${extension}`;
    const numberedPath = `${directory}/${numberedFileName}`;
    const numberedExists = await checkFileExistsOnServer(numberedPath);
    if (!numberedExists) {
      return { fileName: numberedFileName, fullPath: numberedPath };
    }
  }

  // 超过最大尝试次数，使用时间戳作为后备方案
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fallbackFileName = `${cleanBaseName}${separator}${timestamp}${extension}`;
  return { fileName: fallbackFileName, fullPath: `${directory}/${fallbackFileName}` };
}

/**
 * 生成唯一目录名（检查重名并自动添加编号）
 * @param baseName - 基础目录名
 * @param parentDirectory - 父目录
 * @returns 唯一的目录名和完整路径
 */
async function generateUniqueDirectoryName(
  baseName: string,
  parentDirectory: string
): Promise<{ directoryName: string; fullPath: string }> {
  const cleanBaseName = sanitizeFileName(baseName);
  const separator = '_';
  const maxAttempts = 1000;

  // 首先尝试原始目录名
  const originalPath = `${parentDirectory}/${cleanBaseName}`;

  const exists = await checkDirectoryExistsOnServer(originalPath);
  if (!exists) {
    return { directoryName: cleanBaseName, fullPath: originalPath };
  }

  // 原始目录名已存在，尝试添加编号
  for (let i = 1; i <= maxAttempts; i++) {
    const numberedName = `${cleanBaseName}${separator}${i}`;
    const numberedPath = `${parentDirectory}/${numberedName}`;
    const numberedExists = await checkDirectoryExistsOnServer(numberedPath);
    if (!numberedExists) {
      return { directoryName: numberedName, fullPath: numberedPath };
    }
  }

  // 超过最大尝试次数，使用时间戳作为后备方案
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fallbackName = `${cleanBaseName}${separator}${timestamp}`;
  return { directoryName: fallbackName, fullPath: `${parentDirectory}/${fallbackName}` };
}

/**
 * 将对象转换为 YAML 格式（简单实现）
 */
function toYaml(obj: Record<string, unknown>, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        result += `${spaces}${key}: []\n`;
      } else if (typeof value[0] === 'object') {
        result += `${spaces}${key}:\n`;
        for (const item of value) {
          result += `${spaces}-   ${toYaml(item as Record<string, unknown>, indent + 2).trim().replace(/\n/g, `\n${spaces}    `)}\n`;
        }
      } else {
        result += `${spaces}${key}:\n`;
        for (const item of value) {
          result += `${spaces}- ${JSON.stringify(item)}\n`;
        }
      }
    } else if (typeof value === 'object') {
      result += `${spaces}${key}:\n${toYaml(value as Record<string, unknown>, indent + 1)}`;
    } else if (typeof value === 'string') {
      result += `${spaces}${key}: ${JSON.stringify(value)}\n`;
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }
  
  return result;
}

/**
 * 生成导出用的 HTML 内容
 * @param cardName - 卡片名称
 * @param cardId - 卡片 ID
 * @param card - 卡片信息
 */
function generateExportHTML(cardName: string, cardId: string, card: CardInfo): string {
  const tags = card.metadata.tags || [];
  const baseCards = card.structure || [];
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cardName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.8;
      color: #333;
      background: #f5f5f5;
      padding: 40px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 48px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 16px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 16px;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 32px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .meta p {
      margin: 6px 0;
    }
    .meta strong {
      color: #333;
    }
    .content {
      margin-top: 24px;
    }
    .content h2 {
      font-size: 20px;
      color: #1a1a1a;
      margin: 24px 0 16px;
      padding-left: 12px;
      border-left: 4px solid #3b82f6;
    }
    .base-card {
      background: #fafafa;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
    }
    .base-card-type {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .base-card-content {
      color: #374151;
      font-size: 15px;
    }
    .tags {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .tag {
      display: inline-block;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 13px;
      margin: 4px 4px 4px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${cardName}</h1>
    <div class="meta">
      <p><strong>卡片 ID:</strong> ${cardId}</p>
      <p><strong>创建时间:</strong> ${card.metadata.created_at ? new Date(card.metadata.created_at).toLocaleString('zh-CN') : '未知'}</p>
      <p><strong>导出时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    <div class="content">
      <h2>卡片内容</h2>
      ${baseCards.length > 0 ? baseCards.map((bc: BaseCardInfo) => `
        <div class="base-card">
          <span class="base-card-type">${getBaseCardTypeName(bc.type)}</span>
          <div class="base-card-content">
            ${bc.type === 'rich-text' && bc.config?.content_text 
              ? bc.config.content_text 
              : `<em style="color:#999">暂无内容</em>`}
          </div>
        </div>
      `).join('') : '<p style="color:#999;text-align:center;padding:40px">此卡片暂无内容</p>'}
    </div>
    ${tags.length > 0 ? `
    <div class="tags">
      ${tags.map((tag: string | string[]) => 
        `<span class="tag">${Array.isArray(tag) ? tag.join('/') : tag}</span>`
      ).join('')}
    </div>` : ''}
    <div class="footer">
      由 Chips Editor 导出 · ${new Date().toLocaleDateString('zh-CN')}
    </div>
  </div>
</body>
</html>`;
}

/**
 * 获取基础卡片类型名称
 */
function getBaseCardTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    'rich-text': '富文本',
    'markdown': 'Markdown',
    'image': '图片',
    'video': '视频',
    'audio': '音频',
    'code': '代码',
    'list': '列表',
  };
  return typeNames[type] || type;
}

/**
 * 执行导出操作
 * @param format - 导出格式
 */
async function handleExport(format: 'card' | 'html' | 'pdf' | 'image'): Promise<void> {
  if (exportStatus.value === 'exporting') return;
  if (!cardInfo.value) {
    exportStatus.value = 'error';
    exportMessage.value = '卡片数据不存在';
    return;
  }
  
  exportStatus.value = 'exporting';
  exportProgress.value = 0;
  exportMessage.value = `正在导出为 ${format.toUpperCase()} 格式...`;
  
  try {
    // 检查文件服务器
    const serverAvailable = await checkFileServer();
    if (!serverAvailable) {
      throw new Error('文件服务器不可用，请确保开发服务器正在运行');
    }
    
    exportProgress.value = 10;
    
    const cardName = cardInfo.value.metadata.name || '未命名卡片';
    const cardId = props.cardId;
    
    if (format === 'card') {
      // 导出为 .card 文件（ZIP 格式）
      exportMessage.value = '创建卡片包...';
      exportProgress.value = 20;
      
      // 使用 JSZip 创建 ZIP 文件
      const zip = new JSZip();
      
      // 准备元数据
      const metadata = {
        card_id: cardId,
        name: cardName,
        created_at: cardInfo.value.metadata.created_at || new Date().toISOString(),
        modified_at: new Date().toISOString(),
        theme_id: cardInfo.value.metadata.theme || '薯片官方：默认主题',
        tags: cardInfo.value.metadata.tags || [],
        chips_standards_version: '1.0.0',
      };
      
      // 准备结构信息
      const structure = cardInfo.value.structure || {
        structure: [],
        manifest: { card_count: 0, resource_count: 0, resources: [] },
      };
      
      // 准备封面 HTML
      const coverHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .card-name {
      color: white;
      font-size: 24px;
      font-weight: 600;
      text-align: center;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="card-name">${cardName}</div>
</body>
</html>`;
      
      exportProgress.value = 40;
      exportMessage.value = '添加文件到卡片包...';
      
      // 添加文件到 ZIP
      zip.file('.card/metadata.yaml', toYaml(metadata));
      zip.file('.card/structure.yaml', toYaml(structure));
      zip.file('.card/cover.html', coverHtml);
      
      // 创建空的 content 和 cardcover 目录
      zip.folder('content');
      zip.folder('cardcover');
      
      exportProgress.value = 60;
      exportMessage.value = '生成卡片文件...';
      
      // 生成 ZIP 文件
      const zipData = await zip.generateAsync({
        type: 'uint8array',
        compression: 'STORE', // .card 文件使用存储模式（不压缩）
      });
      
      exportProgress.value = 80;
      exportMessage.value = '检查文件名并保存...';
      
      // 生成唯一文件名（使用卡片名称，重名时自动添加编号）
      const { fileName, fullPath } = await generateUniqueFileName(cardName, '.card', EXPORT_DIR);
      await writeBinaryFileToServer(fullPath, zipData);
      
      exportProgress.value = 100;
      exportStatus.value = 'success';
      exportMessage.value = `导出完成！保存至: ExternalEnvironment/${fileName}`;
      
    } else if (format === 'html') {
      // HTML 导出 - 完整流程：保存 → 构建数据 → 传递给转换模块
      exportMessage.value = '保存当前卡片...';
      exportProgress.value = 5;
      
      // 1. 先保存当前卡片到工作区
      const cardPath = cardInfo.value.filePath || cardId;
      console.log('[Export] 步骤1: 保存卡片到工作区:', cardPath);
      
      try {
        await saveCardToWorkspace(cardId, cardPath, cardInfo.value);
        console.log('[Export] 卡片已保存到:', cardPath);
      } catch (e) {
        console.error('[Export] 保存卡片失败:', e);
        throw new Error(`保存卡片失败: ${e instanceof Error ? e.message : '未知错误'}`);
      }
      
      exportMessage.value = '读取卡片数据...';
      exportProgress.value = 20;
      
      // 2. 从工作区读取卡片文件夹结构
      console.log('[Export] 步骤2: 读取工作区卡片数据');
      const cardFiles = await readCardFromWorkspace(cardPath);
      console.log('[Export] 读取了', cardFiles.length, '个文件');
      
      // 3. 生成唯一目录名
      const { directoryName } = await generateUniqueDirectoryName(cardName, EXPORT_DIR);
      const outputPath = `ExternalEnvironment/${directoryName}`;
      
      exportMessage.value = '调用转换服务...';
      exportProgress.value = 40;
      
      // 4. 将文件数据传递给转换服务（通过 FileConverter → CardtoHTMLPlugin）
      console.log('[Export] 步骤3: 调用转换服务，传递', cardFiles.length, '个文件');
      
      const result = await conversionService.convertToHTML({
        cardId: cardId,
        cardFiles: cardFiles,  // 直接传递卡片文件数据
        outputPath: outputPath,
        includeAssets: true,
        ...(cardInfo.value.metadata.theme && { themeId: cardInfo.value.metadata.theme }),
      });
      
      exportProgress.value = 90;
      
      if (!result.success) {
        console.error('[Export] HTML 转换失败:', result.error);
        throw new Error(result.error || 'HTML 转换失败');
      }
      
      console.log('[Export] HTML 转换成功:', result);
      
      exportProgress.value = 100;
      exportStatus.value = 'success';
      exportMessage.value = `导出完成！保存至: ${outputPath}/`;
      
    } else if (format === 'pdf') {
      // PDF 导出 - 通过开发服务器转换
      exportMessage.value = '检查文件名...';
      exportProgress.value = 15;
      
      // 生成唯一文件名（使用卡片名称，重名时自动添加编号）
      const { fileName: pdfFileName, fullPath: pdfFullPath } = await generateUniqueFileName(cardName, '.pdf', EXPORT_DIR);
      
      exportMessage.value = '生成 HTML 内容...';
      exportProgress.value = 20;
      
      // 生成 HTML 内容
      const htmlContent = generateExportHTML(cardName, cardId, cardInfo.value);
      
      exportProgress.value = 40;
      exportMessage.value = '转换为 PDF...';
      
      // 调用转换 API（使用相对于 ExternalEnvironment 的路径）
      const outputPath = `ExternalEnvironment/${pdfFileName}`;
      const response = await fetch(`${FILE_SERVER_URL}/convert/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          outputPath,
          options: {
            format: 'A4',
            printBackground: true,
            margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
          },
        }),
      });
      
      exportProgress.value = 90;
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'PDF 转换失败');
      }
      
      exportProgress.value = 100;
      exportStatus.value = 'success';
      exportMessage.value = `导出完成！保存至: ExternalEnvironment/${pdfFileName}`;
      
    } else if (format === 'image') {
      // 图片导出 - 通过开发服务器转换
      exportMessage.value = '检查文件名...';
      exportProgress.value = 15;
      
      // 生成唯一文件名（使用卡片名称，重名时自动添加编号）
      const { fileName: imageFileName, fullPath: imageFullPath } = await generateUniqueFileName(cardName, '.png', EXPORT_DIR);
      
      exportMessage.value = '生成 HTML 内容...';
      exportProgress.value = 20;
      
      // 生成 HTML 内容
      const htmlContent = generateExportHTML(cardName, cardId, cardInfo.value);
      
      exportProgress.value = 40;
      exportMessage.value = '转换为图片...';
      
      // 调用转换 API（使用相对于 ExternalEnvironment 的路径）
      const outputPath = `ExternalEnvironment/${imageFileName}`;
      const response = await fetch(`${FILE_SERVER_URL}/convert/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          outputPath,
          options: {
            width: 800,
            height: 600,
            scale: 2,
            fullPage: true,
            type: 'png',
          },
        }),
      });
      
      exportProgress.value = 90;
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '图片转换失败');
      }
      
      exportProgress.value = 100;
      exportStatus.value = 'success';
      exportMessage.value = `导出完成！保存至: ExternalEnvironment/${imageFileName}`;
    }
    
    // 成功后 5 秒重置状态
    if (exportStatus.value === 'success') {
      setTimeout(() => {
        if (exportStatus.value === 'success') {
          exportStatus.value = 'idle';
          exportProgress.value = 0;
          exportMessage.value = '';
        }
      }, 5000);
    }
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
