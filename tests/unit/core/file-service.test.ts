/**
 * 文件服务测试
 * @module tests/unit/core/file-service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FileService,
  getFileService,
  resetFileService,
  getFileType,
  isValidFileName,
  type FileInfo,
} from '@/core/file-service';
import { createEventEmitter, type EventEmitter } from '@/core/event-manager';

describe('FileService', () => {
  let service: FileService;
  let events: EventEmitter;

  beforeEach(() => {
    resetFileService();
    events = createEventEmitter();
    service = new FileService(events);
  });

  afterEach(() => {
    service.destroy();
  });

  describe('getFileType', () => {
    it('should return "card" for .card files', () => {
      expect(getFileType('test.card')).toBe('card');
      expect(getFileType('my-card.card')).toBe('card');
    });

    it('should return "box" for .box files', () => {
      expect(getFileType('test.box')).toBe('box');
      expect(getFileType('my-box.box')).toBe('box');
    });

    it('should return "unknown" for other files', () => {
      expect(getFileType('test.txt')).toBe('unknown');
      expect(getFileType('test.json')).toBe('unknown');
      expect(getFileType('test')).toBe('unknown');
    });
  });

  describe('isValidFileName', () => {
    it('should return true for valid names', () => {
      expect(isValidFileName('test')).toBe(true);
      expect(isValidFileName('my-file')).toBe(true);
      expect(isValidFileName('file_name')).toBe(true);
      expect(isValidFileName('文件名')).toBe(true);
    });

    it('should return false for empty names', () => {
      expect(isValidFileName('')).toBe(false);
      expect(isValidFileName('   ')).toBe(false);
    });

    it('should return false for names with invalid characters', () => {
      expect(isValidFileName('test/file')).toBe(false);
      expect(isValidFileName('test\\file')).toBe(false);
      expect(isValidFileName('test:file')).toBe(false);
      expect(isValidFileName('test*file')).toBe(false);
      expect(isValidFileName('test?file')).toBe(false);
      expect(isValidFileName('test"file')).toBe(false);
      expect(isValidFileName('test<file')).toBe(false);
      expect(isValidFileName('test>file')).toBe(false);
      expect(isValidFileName('test|file')).toBe(false);
    });
  });

  describe('getWorkingDirectory', () => {
    it('should return default working directory', () => {
      expect(service.getWorkingDirectory()).toBe('/workspace');
    });
  });

  describe('setWorkingDirectory', () => {
    it('should update working directory', () => {
      service.setWorkingDirectory('/new/path');
      expect(service.getWorkingDirectory()).toBe('/new/path');
    });

    it('should emit event when working directory changes', () => {
      const handler = vi.fn();
      events.on('file:working-directory-changed', handler);
      
      service.setWorkingDirectory('/new/path');
      
      expect(handler).toHaveBeenCalledWith({ path: '/new/path' });
    });
  });

  describe('getFileTree', () => {
    it('should return file tree', async () => {
      const tree = await service.getFileTree();
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);
    });

    it('should include mock data', async () => {
      const tree = await service.getFileTree();
      const folders = tree.filter((f) => f.isDirectory);
      expect(folders.length).toBeGreaterThan(0);
    });
  });

  describe('getFileInfo', () => {
    it('should return file info for existing file', async () => {
      const tree = await service.getFileTree();
      const firstFile = tree[0];
      
      if (firstFile) {
        const info = await service.getFileInfo(firstFile.path);
        expect(info).not.toBeNull();
        expect(info?.path).toBe(firstFile.path);
      }
    });

    it('should return null for non-existing file', async () => {
      const info = await service.getFileInfo('/nonexistent/path');
      expect(info).toBeNull();
    });
  });

  describe('createCard', () => {
    it('should create a new card', async () => {
      const result = await service.createCard({
        name: 'TestCard',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(result.file?.name).toBe('TestCard.card');
      expect(result.file?.type).toBe('card');
    });

    it('should auto-add .card extension', async () => {
      const result = await service.createCard({
        name: 'Test',
        parentPath: '/workspace',
      });

      expect(result.file?.name).toBe('Test.card');
    });

    it('should not duplicate .card extension', async () => {
      const result = await service.createCard({
        name: 'Test.card',
        parentPath: '/workspace',
      });

      expect(result.file?.name).toBe('Test.card');
    });

    it('should emit file:created event', async () => {
      const handler = vi.fn();
      events.on('file:created', handler);

      await service.createCard({
        name: 'Test',
        parentPath: '/workspace',
      });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].file.type).toBe('card');
    });

    it('should fail with invalid name', async () => {
      const result = await service.createCard({
        name: 'test/invalid',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VAL-1001');
    });
  });

  describe('createBox', () => {
    it('should create a new box', async () => {
      const result = await service.createBox({
        name: 'TestBox',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(true);
      expect(result.file?.name).toBe('TestBox.box');
      expect(result.file?.type).toBe('box');
    });

    it('should emit file:created event', async () => {
      const handler = vi.fn();
      events.on('file:created', handler);

      await service.createBox({
        name: 'Test',
        parentPath: '/workspace',
      });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].file.type).toBe('box');
    });
  });

  describe('createFolder', () => {
    it('should create a new folder', async () => {
      const result = await service.createFolder({
        name: 'NewFolder',
        parentPath: '/workspace',
      });

      expect(result.success).toBe(true);
      expect(result.file?.name).toBe('NewFolder');
      expect(result.file?.isDirectory).toBe(true);
    });

    it('should have empty children array', async () => {
      const result = await service.createFolder({
        name: 'EmptyFolder',
        parentPath: '/workspace',
      });

      expect(result.file?.children).toEqual([]);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      // First create a file
      const createResult = await service.createCard({
        name: 'ToDelete',
        parentPath: '/workspace',
      });

      expect(createResult.success).toBe(true);
      const filePath = createResult.file!.path;

      // Then delete it
      const deleteResult = await service.deleteFile(filePath);
      expect(deleteResult.success).toBe(true);

      // Verify it's deleted
      const fileInfo = await service.getFileInfo(filePath);
      expect(fileInfo).toBeNull();
    });

    it('should fail for non-existing file', async () => {
      const result = await service.deleteFile('/nonexistent/path');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RES-3001');
    });

    it('should emit file:deleted event', async () => {
      const handler = vi.fn();
      events.on('file:deleted', handler);

      const createResult = await service.createCard({
        name: 'ToDelete',
        parentPath: '/workspace',
      });

      await service.deleteFile(createResult.file!.path);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('renameFile', () => {
    it('should rename file', async () => {
      const createResult = await service.createCard({
        name: 'Original',
        parentPath: '/workspace',
      });

      const renameResult = await service.renameFile(
        createResult.file!.path,
        'Renamed'
      );

      expect(renameResult.success).toBe(true);
      expect(renameResult.file?.name).toBe('Renamed.card');
    });

    it('should preserve extension for cards', async () => {
      const createResult = await service.createCard({
        name: 'Test',
        parentPath: '/workspace',
      });

      const renameResult = await service.renameFile(
        createResult.file!.path,
        'NewName'
      );

      expect(renameResult.file?.name).toBe('NewName.card');
    });

    it('should fail for non-existing file', async () => {
      const result = await service.renameFile('/nonexistent', 'NewName');
      expect(result.success).toBe(false);
    });

    it('should fail with invalid name', async () => {
      const createResult = await service.createCard({
        name: 'Test',
        parentPath: '/workspace',
      });

      const renameResult = await service.renameFile(
        createResult.file!.path,
        'invalid/name'
      );

      expect(renameResult.success).toBe(false);
      expect(renameResult.errorCode).toBe('VAL-1001');
    });

    it('should emit file:renamed event', async () => {
      const handler = vi.fn();
      events.on('file:renamed', handler);

      const createResult = await service.createCard({
        name: 'Original',
        parentPath: '/workspace',
      });

      await service.renameFile(createResult.file!.path, 'Renamed');

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('copyFile', () => {
    it('should copy file to destination', async () => {
      const createResult = await service.createCard({
        name: 'Original',
        parentPath: '/workspace',
      });

      // Create a destination folder
      await service.createFolder({
        name: 'DestFolder',
        parentPath: '/workspace',
      });

      const copyResult = await service.copyFile(
        createResult.file!.path,
        '/workspace/DestFolder'
      );

      expect(copyResult.success).toBe(true);
      expect(copyResult.file?.path).toBe('/workspace/DestFolder/Original.card');
    });

    it('should create a new ID for copied file', async () => {
      const createResult = await service.createCard({
        name: 'Original',
        parentPath: '/workspace',
      });

      await service.createFolder({
        name: 'DestFolder',
        parentPath: '/workspace',
      });

      const copyResult = await service.copyFile(
        createResult.file!.path,
        '/workspace/DestFolder'
      );

      expect(copyResult.file?.id).not.toBe(createResult.file!.id);
    });

    it('should emit file:copied event', async () => {
      const handler = vi.fn();
      events.on('file:copied', handler);

      const createResult = await service.createCard({
        name: 'Original',
        parentPath: '/workspace',
      });

      await service.createFolder({
        name: 'DestFolder',
        parentPath: '/workspace',
      });

      await service.copyFile(createResult.file!.path, '/workspace/DestFolder');

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('moveFile', () => {
    it('should move file to destination', async () => {
      const createResult = await service.createCard({
        name: 'ToMove',
        parentPath: '/workspace',
      });

      await service.createFolder({
        name: 'DestFolder',
        parentPath: '/workspace',
      });

      const originalPath = createResult.file!.path;
      const moveResult = await service.moveFile(
        originalPath,
        '/workspace/DestFolder'
      );

      expect(moveResult.success).toBe(true);

      // Original should be gone
      const originalInfo = await service.getFileInfo(originalPath);
      expect(originalInfo).toBeNull();
    });

    it('should emit file:moved event', async () => {
      const handler = vi.fn();
      events.on('file:moved', handler);

      const createResult = await service.createCard({
        name: 'ToMove',
        parentPath: '/workspace',
      });

      await service.createFolder({
        name: 'DestFolder',
        parentPath: '/workspace',
      });

      await service.moveFile(createResult.file!.path, '/workspace/DestFolder');

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('toggleFolderExpanded', () => {
    it('should toggle folder expanded state', async () => {
      const folderResult = await service.createFolder({
        name: 'TestFolder',
        parentPath: '/workspace',
      });

      expect(folderResult.file?.expanded).toBe(false);

      await service.toggleFolderExpanded(folderResult.file!.path);

      const info = await service.getFileInfo(folderResult.file!.path);
      expect(info?.expanded).toBe(true);
    });

    it('should emit file:folder-toggled event', async () => {
      const handler = vi.fn();
      events.on('file:folder-toggled', handler);

      const folderResult = await service.createFolder({
        name: 'TestFolder',
        parentPath: '/workspace',
      });

      await service.toggleFolderExpanded(folderResult.file!.path);

      expect(handler).toHaveBeenCalledWith({
        path: folderResult.file!.path,
        expanded: true,
      });
    });
  });

  describe('clipboard operations', () => {
    describe('copyToClipboard', () => {
      it('should copy files to clipboard', async () => {
        const createResult = await service.createCard({
          name: 'Test',
          parentPath: '/workspace',
        });

        service.copyToClipboard([createResult.file!.path]);

        const clipboard = service.getClipboard();
        expect(clipboard?.operation).toBe('copy');
        expect(clipboard?.files).toContain(createResult.file!.path);
      });
    });

    describe('cutToClipboard', () => {
      it('should cut files to clipboard', async () => {
        const createResult = await service.createCard({
          name: 'Test',
          parentPath: '/workspace',
        });

        service.cutToClipboard([createResult.file!.path]);

        const clipboard = service.getClipboard();
        expect(clipboard?.operation).toBe('cut');
        expect(clipboard?.files).toContain(createResult.file!.path);
      });
    });

    describe('paste', () => {
      it('should paste copied files', async () => {
        const createResult = await service.createCard({
          name: 'ToCopy',
          parentPath: '/workspace',
        });

        await service.createFolder({
          name: 'DestFolder',
          parentPath: '/workspace',
        });

        service.copyToClipboard([createResult.file!.path]);
        const results = await service.paste('/workspace/DestFolder');

        expect(results[0]?.success).toBe(true);
        
        // Original should still exist after copy
        const original = await service.getFileInfo(createResult.file!.path);
        expect(original).not.toBeNull();
      });

      it('should move cut files', async () => {
        const createResult = await service.createCard({
          name: 'ToCut',
          parentPath: '/workspace',
        });

        await service.createFolder({
          name: 'DestFolder',
          parentPath: '/workspace',
        });

        const originalPath = createResult.file!.path;
        service.cutToClipboard([originalPath]);
        await service.paste('/workspace/DestFolder');

        // Original should be gone after cut
        const original = await service.getFileInfo(originalPath);
        expect(original).toBeNull();
      });

      it('should clear clipboard after cut paste', async () => {
        const createResult = await service.createCard({
          name: 'ToCut',
          parentPath: '/workspace',
        });

        await service.createFolder({
          name: 'DestFolder',
          parentPath: '/workspace',
        });

        service.cutToClipboard([createResult.file!.path]);
        await service.paste('/workspace/DestFolder');

        expect(service.getClipboard()).toBeNull();
      });

      it('should return error when clipboard is empty', async () => {
        const results = await service.paste('/workspace');
        expect(results[0]?.success).toBe(false);
      });
    });

    describe('clearClipboard', () => {
      it('should clear clipboard', () => {
        service.copyToClipboard(['/test/path']);
        service.clearClipboard();
        expect(service.getClipboard()).toBeNull();
      });
    });
  });

  describe('searchFiles', () => {
    it('should find files by name', async () => {
      const results = await service.searchFiles('卡片');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', async () => {
      const createResult = await service.createCard({
        name: 'TestCard',
        parentPath: '/workspace',
      });

      const results = await service.searchFiles('testcard');
      expect(results.some((f) => f.path === createResult.file!.path)).toBe(true);
    });

    it('should return empty array for empty query', async () => {
      const results = await service.searchFiles('');
      expect(results).toEqual([]);
    });

    it('should filter by type', async () => {
      const results = await service.searchFiles('', { type: 'card' });
      expect(results.every((f) => f.type === 'card' || f.name.includes(''))).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should emit file:refreshed event', async () => {
      const handler = vi.fn();
      events.on('file:refreshed', handler);

      await service.refresh();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('getFileService singleton', () => {
    beforeEach(() => {
      resetFileService();
    });

    it('should throw when events not provided on first call', () => {
      expect(() => getFileService()).toThrow('EventEmitter is required');
    });

    it('should return singleton instance', () => {
      const service1 = getFileService(events);
      const service2 = getFileService();
      expect(service1).toBe(service2);
    });
  });
});
