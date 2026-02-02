/**
 * 文件操作端到端测试
 * @module tests/e2e/file-operations
 * @description 测试文件导入导出的完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { createEventEmitter, EventEmitter } from '@/core/event-manager';
import {
  FileService,
  getFileService,
  resetFileService,
} from '@/core/file-service';

describe('E2E: 文件导入导出流程', () => {
  let fileService: FileService;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    setActivePinia(createPinia());
    resetFileService();
    eventEmitter = createEventEmitter();
    fileService = getFileService(eventEmitter);
  });

  afterEach(() => {
    resetFileService();
  });

  describe('场景1: 完整的文件创建和组织流程', () => {
    it('应完成文件夹创建、文件创建、组织的完整流程', async () => {
      const events: Array<{ type: string; data: unknown }> = [];
      eventEmitter.on('file:created', (data) => events.push({ type: 'created', data }));
      eventEmitter.on('file:moved', (data) => events.push({ type: 'moved', data }));
      eventEmitter.on('file:renamed', (data) => events.push({ type: 'renamed', data }));

      // Step 1: 创建项目文件夹结构
      const projectFolder = await fileService.createFolder({
        name: '新项目',
        parentPath: '/workspace',
      });
      expect(projectFolder.success).toBe(true);

      const docsFolder = await fileService.createFolder({
        name: '文档',
        parentPath: '/workspace/新项目',
      });
      expect(docsFolder.success).toBe(true);

      const designFolder = await fileService.createFolder({
        name: '设计',
        parentPath: '/workspace/新项目',
      });
      expect(designFolder.success).toBe(true);

      // Step 2: 在文件夹中创建卡片
      const readme = await fileService.createCard({
        name: 'README',
        parentPath: '/workspace/新项目',
      });
      expect(readme.success).toBe(true);
      expect(readme.file?.name).toBe('README.card');

      const designDoc = await fileService.createCard({
        name: '设计文档',
        parentPath: '/workspace/新项目/文档',
      });
      expect(designDoc.success).toBe(true);

      const wireframe = await fileService.createCard({
        name: '线框图',
        parentPath: '/workspace/新项目/设计',
      });
      expect(wireframe.success).toBe(true);

      // Step 3: 创建箱子文件
      const resourceBox = await fileService.createBox({
        name: '资源集合',
        parentPath: '/workspace/新项目',
      });
      expect(resourceBox.success).toBe(true);
      expect(resourceBox.file?.type).toBe('box');

      // Step 4: 重命名文件
      const renameResult = await fileService.renameFile(
        '/workspace/新项目/README.card',
        '项目说明'
      );
      expect(renameResult.success).toBe(true);
      expect(renameResult.file?.name).toBe('项目说明.card');

      // Step 5: 移动文件
      const moveResult = await fileService.moveFile(
        '/workspace/新项目/设计/线框图.card',
        '/workspace/新项目/文档'
      );
      expect(moveResult.success).toBe(true);

      // 验证文件已移动
      const movedFile = await fileService.getFileInfo('/workspace/新项目/文档/线框图.card');
      expect(movedFile).toBeDefined();

      // 验证事件序列
      const createEvents = events.filter((e) => e.type === 'created');
      expect(createEvents.length).toBeGreaterThanOrEqual(5); // 3 folders + 3 cards + 1 box
    });
  });

  describe('场景2: 文件搜索和过滤', () => {
    it('应支持全局搜索', async () => {
      // 创建一些测试文件
      await fileService.createCard({ name: 'Vue 学习笔记', parentPath: '/workspace' });
      await fileService.createCard({ name: 'React 学习笔记', parentPath: '/workspace' });
      await fileService.createCard({ name: 'TypeScript 指南', parentPath: '/workspace' });

      // 搜索包含 "学习" 的文件
      const results = await fileService.searchFiles('学习');

      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach((file) => {
        expect(file.name.includes('学习')).toBe(true);
      });
    });

    it('应支持按类型搜索', async () => {
      await fileService.createCard({ name: '测试卡片', parentPath: '/workspace' });
      await fileService.createBox({ name: '测试箱子', parentPath: '/workspace' });

      // 只搜索卡片
      const cardResults = await fileService.searchFiles('测试', { type: 'card' });
      cardResults.forEach((file) => {
        expect(file.type).toBe('card');
      });

      // 只搜索箱子
      const boxResults = await fileService.searchFiles('测试', { type: 'box' });
      boxResults.forEach((file) => {
        expect(file.type).toBe('box');
      });
    });

    it('应支持在特定路径下搜索', async () => {
      await fileService.createFolder({ name: '搜索测试', parentPath: '/workspace' });
      await fileService.createCard({ name: '范围内文件', parentPath: '/workspace/搜索测试' });
      await fileService.createCard({ name: '范围外文件', parentPath: '/workspace' });

      const results = await fileService.searchFiles('文件', {
        path: '/workspace/搜索测试',
      });

      results.forEach((file) => {
        expect(file.path.startsWith('/workspace/搜索测试')).toBe(true);
      });
    });
  });

  describe('场景3: 剪贴板操作流程', () => {
    it('应完成复制粘贴流程', async () => {
      // 创建源文件
      await fileService.createCard({ name: '待复制文件', parentPath: '/workspace' });

      // 复制到剪贴板
      fileService.copyToClipboard(['/workspace/待复制文件.card']);

      const clipboard = fileService.getClipboard();
      expect(clipboard?.operation).toBe('copy');
      expect(clipboard?.files).toContain('/workspace/待复制文件.card');

      // 粘贴到新位置
      await fileService.createFolder({ name: '目标文件夹', parentPath: '/workspace' });
      const pasteResults = await fileService.paste('/workspace/目标文件夹');

      expect(pasteResults.length).toBe(1);
      expect(pasteResults[0]?.success).toBe(true);

      // 验证原文件仍然存在（复制操作）
      const originalFile = await fileService.getFileInfo('/workspace/待复制文件.card');
      expect(originalFile).toBeDefined();

      // 验证复制的文件存在
      const copiedFile = await fileService.getFileInfo('/workspace/目标文件夹/待复制文件.card');
      expect(copiedFile).toBeDefined();
    });

    it('应完成剪切粘贴流程', async () => {
      // 创建源文件
      await fileService.createCard({ name: '待剪切文件', parentPath: '/workspace' });

      // 剪切到剪贴板
      fileService.cutToClipboard(['/workspace/待剪切文件.card']);

      const clipboard = fileService.getClipboard();
      expect(clipboard?.operation).toBe('cut');

      // 粘贴到新位置
      await fileService.createFolder({ name: '移动目标', parentPath: '/workspace' });
      const pasteResults = await fileService.paste('/workspace/移动目标');

      expect(pasteResults.length).toBe(1);
      expect(pasteResults[0]?.success).toBe(true);

      // 剪贴板应该被清空
      expect(fileService.getClipboard()).toBeNull();
    });

    it('应支持批量操作', async () => {
      // 创建多个源文件
      await fileService.createCard({ name: '批量文件1', parentPath: '/workspace' });
      await fileService.createCard({ name: '批量文件2', parentPath: '/workspace' });
      await fileService.createCard({ name: '批量文件3', parentPath: '/workspace' });

      // 批量复制
      fileService.copyToClipboard([
        '/workspace/批量文件1.card',
        '/workspace/批量文件2.card',
        '/workspace/批量文件3.card',
      ]);

      // 创建目标文件夹并粘贴
      await fileService.createFolder({ name: '批量目标', parentPath: '/workspace' });
      const pasteResults = await fileService.paste('/workspace/批量目标');

      expect(pasteResults.length).toBe(3);
      pasteResults.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('场景4: 文件夹操作', () => {
    it('应支持文件夹展开和折叠', async () => {
      const toggleHandler = vi.fn();
      eventEmitter.on('file:folder-toggled', toggleHandler);

      // 获取初始状态
      const initialFolder = await fileService.getFileInfo('/workspace/项目文档');
      const initialExpanded = initialFolder?.expanded;

      // 切换展开状态
      await fileService.toggleFolderExpanded('/workspace/项目文档');

      expect(toggleHandler).toHaveBeenCalled();

      const toggledFolder = await fileService.getFileInfo('/workspace/项目文档');
      expect(toggledFolder?.expanded).toBe(!initialExpanded);

      // 再次切换
      await fileService.toggleFolderExpanded('/workspace/项目文档');

      const retoggledFolder = await fileService.getFileInfo('/workspace/项目文档');
      expect(retoggledFolder?.expanded).toBe(initialExpanded);
    });

    it('应支持直接设置展开状态', async () => {
      await fileService.setFolderExpanded('/workspace/项目文档', true);

      const expandedFolder = await fileService.getFileInfo('/workspace/项目文档');
      expect(expandedFolder?.expanded).toBe(true);

      await fileService.setFolderExpanded('/workspace/项目文档', false);

      const collapsedFolder = await fileService.getFileInfo('/workspace/项目文档');
      expect(collapsedFolder?.expanded).toBe(false);
    });

    it('应递归删除文件夹', async () => {
      // 创建带内容的文件夹
      await fileService.createFolder({ name: '待删除文件夹', parentPath: '/workspace' });
      await fileService.createCard({ name: '内部文件', parentPath: '/workspace/待删除文件夹' });

      // 删除文件夹
      const result = await fileService.deleteFile('/workspace/待删除文件夹');

      expect(result.success).toBe(true);

      // 验证文件夹和内容都已删除
      const deletedFolder = await fileService.getFileInfo('/workspace/待删除文件夹');
      expect(deletedFolder).toBeNull();
    });
  });

  describe('场景5: 文件系统刷新', () => {
    it('应支持刷新文件系统', async () => {
      const refreshHandler = vi.fn();
      eventEmitter.on('file:refreshed', refreshHandler);

      await fileService.refresh();

      expect(refreshHandler).toHaveBeenCalled();
    });
  });

  describe('场景6: 错误处理', () => {
    it('应处理无效文件名', async () => {
      const result = await fileService.createCard({
        name: 'invalid/name',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('error.invalid_filename');
      expect(result.errorCode).toBe('VAL-1001');
    });

    it('应处理文件不存在', async () => {
      const result = await fileService.deleteFile('/nonexistent/path/file.card');

      expect(result.success).toBe(false);
      expect(result.error).toBe('error.file_not_found');
    });

    it('应处理空剪贴板粘贴', async () => {
      fileService.clearClipboard();

      const results = await fileService.paste('/workspace');

      expect(results.length).toBe(1);
      expect(results[0]?.success).toBe(false);
      expect(results[0]?.error).toBe('error.clipboard_empty');
    });
  });

  describe('场景7: 工作目录管理', () => {
    it('应支持切换工作目录', async () => {
      const dirChangeHandler = vi.fn();
      eventEmitter.on('file:working-directory-changed', dirChangeHandler);

      expect(fileService.getWorkingDirectory()).toBe('/workspace');

      fileService.setWorkingDirectory('/workspace/项目文档');

      expect(fileService.getWorkingDirectory()).toBe('/workspace/项目文档');
      expect(dirChangeHandler).toHaveBeenCalledWith({ path: '/workspace/项目文档' });
    });

    it('应在切换目录后获取对应文件列表', async () => {
      fileService.setWorkingDirectory('/workspace/项目文档');

      const files = await fileService.getFileList();

      // 验证返回的是项目文档目录下的文件
      files.forEach((file) => {
        expect(file.path.startsWith('/workspace/项目文档')).toBe(true);
      });
    });
  });
});
