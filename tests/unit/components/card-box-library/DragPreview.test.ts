/**
 * DragPreview 组件测试
 * @module tests/unit/components/card-box-library/DragPreview
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DragPreview from '@/components/card-box-library/DragPreview.vue';
import type { DragData } from '@/components/card-box-library/types';

describe('DragPreview', () => {
  describe('rendering', () => {
    it('should render card type preview', () => {
      const data: DragData = { type: 'card', typeId: 'rich-text', name: '富文本' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      expect(wrapper.find('.drag-preview').exists()).toBe(true);
      expect(wrapper.find('.drag-preview__card').exists()).toBe(true);
    });

    it('should render layout type preview', () => {
      const data: DragData = { type: 'layout', typeId: 'grid-layout', name: '网格' };
      const position = { x: 150, y: 250 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      expect(wrapper.find('.drag-preview').exists()).toBe(true);
    });

    it('should show correct icon for card type', () => {
      const data: DragData = { type: 'card', typeId: 'video', name: '视频' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const icon = wrapper.find('.drag-preview__icon');
      expect(icon.exists()).toBe(true);
      expect(icon.text()).toBe('🎬'); // 视频图标
    });

    it('should show correct icon for layout type', () => {
      const data: DragData = { type: 'layout', typeId: 'waterfall-layout', name: '瀑布流' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const icon = wrapper.find('.drag-preview__icon');
      expect(icon.exists()).toBe(true);
      expect(icon.text()).toBe('🌊'); // 瀑布流图标
    });

    it('should show name in preview', () => {
      const data: DragData = { type: 'card', typeId: 'markdown', name: 'Markdown' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const name = wrapper.find('.drag-preview__name');
      expect(name.text()).toBe('Markdown');
    });

    it('should show hint for card type', () => {
      const data: DragData = { type: 'card', typeId: 'image', name: '图片' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const hint = wrapper.find('.drag-preview__hint');
      expect(hint.text()).toContain('卡片');
    });

    it('should show hint for layout type', () => {
      const data: DragData = { type: 'layout', typeId: 'list-layout', name: '列表' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const hint = wrapper.find('.drag-preview__hint');
      expect(hint.text()).toContain('箱子');
    });
  });

  describe('positioning', () => {
    it('should apply position style', () => {
      const data: DragData = { type: 'card', typeId: 'code', name: '代码块' };
      const position = { x: 300, y: 400 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      const preview = wrapper.find('.drag-preview');
      const style = preview.attributes('style');

      expect(style).toContain('left: 300px');
      expect(style).toContain('top: 400px');
    });

    it('should update position when props change', async () => {
      const data: DragData = { type: 'card', typeId: 'music', name: '音乐' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      await wrapper.setProps({ position: { x: 500, y: 600 } });

      const preview = wrapper.find('.drag-preview');
      const style = preview.attributes('style');

      expect(style).toContain('left: 500px');
      expect(style).toContain('top: 600px');
    });
  });

  describe('unknown type handling', () => {
    it('should not render when card type is not found', () => {
      const data: DragData = { type: 'card', typeId: 'unknown-type', name: '未知' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      expect(wrapper.find('.drag-preview').exists()).toBe(false);
    });

    it('should not render when layout type is not found', () => {
      const data: DragData = { type: 'layout', typeId: 'unknown-layout', name: '未知' };
      const position = { x: 100, y: 200 };

      const wrapper = mount(DragPreview, {
        props: { data, position },
      });

      expect(wrapper.find('.drag-preview').exists()).toBe(false);
    });
  });

  describe('all card types', () => {
    const cardTypeIds = [
      'rich-text',
      'markdown',
      'code',
      'image',
      'video',
      'music',
      '3d-model',
      'list',
      'rating',
      'webpage',
      'game',
      'app',
      'calendar',
      'gantt',
      'heatmap',
      'mindmap',
      'whiteboard',
      'episodes',
      'article',
      'post',
      'chat-history',
      'profile',
      'product',
      'device',
      'location',
      'weather',
    ];

    cardTypeIds.forEach((typeId) => {
      it(`should render preview for card type: ${typeId}`, () => {
        const data: DragData = { type: 'card', typeId, name: typeId };
        const position = { x: 100, y: 200 };

        const wrapper = mount(DragPreview, {
          props: { data, position },
        });

        expect(wrapper.find('.drag-preview').exists()).toBe(true);
        expect(wrapper.find('.drag-preview__icon').text()).toBeTruthy();
      });
    });
  });

  describe('all layout types', () => {
    const layoutTypeIds = [
      'list-layout',
      'grid-layout',
      'waterfall-layout',
      'canvas-layout',
      'timeline-layout',
      'bookshelf-layout',
      'profile-layout',
      'moments-layout',
    ];

    layoutTypeIds.forEach((typeId) => {
      it(`should render preview for layout type: ${typeId}`, () => {
        const data: DragData = { type: 'layout', typeId, name: typeId };
        const position = { x: 100, y: 200 };

        const wrapper = mount(DragPreview, {
          props: { data, position },
        });

        expect(wrapper.find('.drag-preview').exists()).toBe(true);
        expect(wrapper.find('.drag-preview__icon').text()).toBeTruthy();
      });
    });
  });
});
