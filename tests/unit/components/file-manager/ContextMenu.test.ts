/**
 * ContextMenu 组件测试
 * @module tests/unit/components/file-manager/ContextMenu
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ContextMenu from '@/components/file-manager/ContextMenu.vue';
import type { FileInfo } from '@/core/file-service';

describe('ContextMenu', () => {
  const mockFile: FileInfo = {
    id: 'card-123',
    name: 'test.card',
    path: '/workspace/test.card',
    type: 'card',
    size: 1024,
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: '2026-01-01T00:00:00Z',
    isDirectory: false,
  };

  const mockFolder: FileInfo = {
    id: 'folder-123',
    name: 'Documents',
    path: '/workspace/Documents',
    type: 'folder',
    size: 0,
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: '2026-01-01T00:00:00Z',
    isDirectory: true,
    children: [],
  };

  describe('visibility', () => {
    it('should not render when not visible', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: false,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(false);
    });

    it('should render when visible', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });
  });

  describe('positioning', () => {
    it('should position at specified coordinates', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 150,
          y: 200,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      // Wait for position adjustment
      await wrapper.vm.$nextTick();

      const style = wrapper.find('.context-menu').attributes('style');
      expect(style).toContain('left:');
      expect(style).toContain('top:');
    });
  });

  describe('menu items', () => {
    it('should show new menu items', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const items = wrapper.findAll('.context-menu__item');
      const labels = items.map((item) => item.find('.context-menu__label').text());
      
      expect(labels).toContain('file.new');
    });

    it('should show file operations when files selected', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const items = wrapper.findAll('.context-menu__item');
      const labels = items.map((item) => item.find('.context-menu__label').text());
      
      expect(labels).toContain('file.open');
      expect(labels).toContain('common.cut');
      expect(labels).toContain('common.copy');
      expect(labels).toContain('file.rename');
      expect(labels).toContain('common.delete');
    });

    it('should disable open when multiple files selected', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile, mockFolder],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const openItem = wrapper.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'file.open'
      );

      expect(openItem?.classes()).toContain('context-menu__item--disabled');
    });

    it('should disable rename when multiple files selected', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile, mockFolder],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const renameItem = wrapper.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'file.rename'
      );

      expect(renameItem?.classes()).toContain('context-menu__item--disabled');
    });

    it('should disable paste when no clipboard', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          hasClipboard: false,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const pasteItem = wrapper.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'common.paste'
      );

      expect(pasteItem?.classes()).toContain('context-menu__item--disabled');
    });

    it('should enable paste when clipboard has content', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          hasClipboard: true,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const pasteItem = wrapper.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'common.paste'
      );

      expect(pasteItem?.classes()).not.toContain('context-menu__item--disabled');
    });
  });

  describe('events', () => {
    it('should emit action event when item clicked', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      // Find a non-disabled item without children
      const refreshItem = wrapper.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'file.refresh'
      );

      await refreshItem?.trigger('click');

      expect(wrapper.emitted('action')).toBeTruthy();
      expect(wrapper.emitted('action')![0][0]).toBe('refresh');
    });

    it('should emit close event when item clicked', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          selectedFiles: [mockFile],
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const refreshItem = wrapper.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'file.refresh'
      );

      await refreshItem?.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should not emit action for disabled items', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
          hasClipboard: false,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const pasteItem = wrapper.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'common.paste'
      );

      await pasteItem?.trigger('click');

      expect(wrapper.emitted('action')).toBeFalsy();
    });
  });

  describe('submenu', () => {
    it('should show submenu on hover', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const newItem = wrapper.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'file.new'
      );

      await newItem?.trigger('mouseenter');

      expect(wrapper.find('.context-menu__submenu').exists()).toBe(true);
    });

    it('should emit action when submenu item clicked', async () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      // Hover to show submenu
      const newItem = wrapper.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'file.new'
      );
      await newItem?.trigger('mouseenter');

      // Click submenu item
      const submenu = wrapper.find('.context-menu__submenu');
      const newCardItem = submenu.findAll('.context-menu__item').find((item) => 
        item.find('.context-menu__label').text() === 'file.new_card'
      );
      await newCardItem?.trigger('click');

      expect(wrapper.emitted('action')).toBeTruthy();
      expect(wrapper.emitted('action')![0][0]).toBe('new-card');
    });
  });

  describe('dividers', () => {
    it('should render dividers', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      expect(wrapper.findAll('.context-menu__divider').length).toBeGreaterThan(0);
    });
  });

  describe('keyboard interaction', () => {
    it('should have menu role for accessibility', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      expect(wrapper.find('.context-menu').attributes('role')).toBe('menu');
    });

    it('menu items should have menuitem role', () => {
      const wrapper = mount(ContextMenu, {
        props: {
          visible: true,
          x: 100,
          y: 100,
        },
        global: {
          stubs: {
            teleport: true,
          },
        },
      });

      const items = wrapper.findAll('.context-menu__item');
      items.forEach((item) => {
        expect(item.attributes('role')).toBe('menuitem');
      });
    });
  });
});
