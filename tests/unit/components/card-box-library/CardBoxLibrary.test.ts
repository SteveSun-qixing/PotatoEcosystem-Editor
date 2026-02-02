/**
 * CardBoxLibrary 组件测试
 * @module tests/unit/components/card-box-library/CardBoxLibrary
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import CardBoxLibrary from '@/components/card-box-library/CardBoxLibrary.vue';
import CardTypeGrid from '@/components/card-box-library/CardTypeGrid.vue';
import LayoutTypeGrid from '@/components/card-box-library/LayoutTypeGrid.vue';
import { cardTypes, layoutTypes } from '@/components/card-box-library/data';
import { resetGlobalDragCreate } from '@/components/card-box-library/use-drag-create';
import type { DragData } from '@/components/card-box-library/types';

describe('CardBoxLibrary', () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    resetGlobalDragCreate();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('rendering', () => {
    it('should render search input', () => {
      wrapper = mount(CardBoxLibrary);

      expect(wrapper.find('.card-box-library__search-input').exists()).toBe(true);
    });

    it('should render tabs', () => {
      wrapper = mount(CardBoxLibrary);

      const tabs = wrapper.findAll('.card-box-library__tab');
      expect(tabs).toHaveLength(2);
    });

    it('should render cards tab as active by default', () => {
      wrapper = mount(CardBoxLibrary);

      const tabs = wrapper.findAll('.card-box-library__tab');
      expect(tabs[0].classes()).toContain('card-box-library__tab--active');
      expect(tabs[1].classes()).not.toContain('card-box-library__tab--active');
    });

    it('should render CardTypeGrid by default', () => {
      wrapper = mount(CardBoxLibrary);

      expect(wrapper.findComponent(CardTypeGrid).exists()).toBe(true);
      expect(wrapper.findComponent(LayoutTypeGrid).exists()).toBe(false);
    });

    it('should render hint text', () => {
      wrapper = mount(CardBoxLibrary);

      expect(wrapper.find('.card-box-library__hint').exists()).toBe(true);
    });

    it('should show correct count in card tab', () => {
      wrapper = mount(CardBoxLibrary);

      const cardTab = wrapper.findAll('.card-box-library__tab')[0];
      const count = cardTab.find('.card-box-library__tab-count');
      expect(count.text()).toBe('26');
    });

    it('should show correct count in box tab', () => {
      wrapper = mount(CardBoxLibrary);

      const boxTab = wrapper.findAll('.card-box-library__tab')[1];
      const count = boxTab.find('.card-box-library__tab-count');
      expect(count.text()).toBe('8');
    });
  });

  describe('tab switching', () => {
    it('should switch to boxes tab when clicked', async () => {
      wrapper = mount(CardBoxLibrary);

      const tabs = wrapper.findAll('.card-box-library__tab');
      await tabs[1].trigger('click');

      expect(tabs[0].classes()).not.toContain('card-box-library__tab--active');
      expect(tabs[1].classes()).toContain('card-box-library__tab--active');
    });

    it('should render LayoutTypeGrid when boxes tab is active', async () => {
      wrapper = mount(CardBoxLibrary);

      const tabs = wrapper.findAll('.card-box-library__tab');
      await tabs[1].trigger('click');

      expect(wrapper.findComponent(CardTypeGrid).exists()).toBe(false);
      expect(wrapper.findComponent(LayoutTypeGrid).exists()).toBe(true);
    });

    it('should switch back to cards tab', async () => {
      wrapper = mount(CardBoxLibrary);

      const tabs = wrapper.findAll('.card-box-library__tab');
      await tabs[1].trigger('click');
      await tabs[0].trigger('click');

      expect(wrapper.findComponent(CardTypeGrid).exists()).toBe(true);
      expect(wrapper.findComponent(LayoutTypeGrid).exists()).toBe(false);
    });

    it('should update hint text when switching tabs', async () => {
      wrapper = mount(CardBoxLibrary);

      const hint = wrapper.find('.card-box-library__hint-text');
      expect(hint.text()).toContain('卡片');

      const tabs = wrapper.findAll('.card-box-library__tab');
      await tabs[1].trigger('click');

      expect(hint.text()).toContain('箱子');
    });
  });

  describe('search functionality', () => {
    it('should filter card types when searching', async () => {
      wrapper = mount(CardBoxLibrary);

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      await input.setValue('视频');
      await nextTick();

      const cardGrid = wrapper.findComponent(CardTypeGrid);
      const types = cardGrid.props('types');
      expect(types?.some((t) => t.id === 'video')).toBe(true);
      expect(types?.length).toBeLessThan(26);
    });

    it('should filter layout types when searching on boxes tab', async () => {
      wrapper = mount(CardBoxLibrary);

      // 切换到箱子标签页
      const tabs = wrapper.findAll('.card-box-library__tab');
      await tabs[1].trigger('click');

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      await input.setValue('瀑布流');
      await nextTick();

      const layoutGrid = wrapper.findComponent(LayoutTypeGrid);
      const types = layoutGrid.props('types');
      expect(types?.some((t) => t.id === 'waterfall-layout')).toBe(true);
      expect(types?.length).toBeLessThan(8);
    });

    it('should show clear button when search has value', async () => {
      wrapper = mount(CardBoxLibrary);

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      await input.setValue('test');
      await nextTick();

      expect(wrapper.find('.card-box-library__search-clear').exists()).toBe(true);
    });

    it('should not show clear button when search is empty', () => {
      wrapper = mount(CardBoxLibrary);

      expect(wrapper.find('.card-box-library__search-clear').exists()).toBe(false);
    });

    it('should clear search when clear button is clicked', async () => {
      wrapper = mount(CardBoxLibrary);

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      await input.setValue('test');
      await nextTick();

      const clearButton = wrapper.find('.card-box-library__search-clear');
      await clearButton.trigger('click');

      expect(input.element.value).toBe('');
    });

    it('should show empty state when no search results', async () => {
      wrapper = mount(CardBoxLibrary);

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      await input.setValue('xyz不存在的类型123');
      await nextTick();

      expect(wrapper.find('.card-box-library__empty').exists()).toBe(true);
    });

    it('should not show categories when searching', async () => {
      wrapper = mount(CardBoxLibrary);

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      await input.setValue('视频');
      await nextTick();

      const cardGrid = wrapper.findComponent(CardTypeGrid);
      expect(cardGrid.props('showCategories')).toBe(false);
    });

    it('should update search placeholder based on active tab', async () => {
      wrapper = mount(CardBoxLibrary);

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      expect(input.attributes('placeholder')).toContain('卡片');

      const tabs = wrapper.findAll('.card-box-library__tab');
      await tabs[1].trigger('click');

      expect(input.attributes('placeholder')).toContain('布局');
    });
  });

  describe('drag events', () => {
    it('should emit dragStart event when CardTypeGrid emits dragStart', async () => {
      wrapper = mount(CardBoxLibrary);

      const cardGrid = wrapper.findComponent(CardTypeGrid);
      const dragData: DragData = { type: 'card', typeId: 'rich-text', name: '富文本' };

      await cardGrid.vm.$emit('dragStart', dragData, {} as DragEvent);

      expect(wrapper.emitted('dragStart')).toBeTruthy();
      expect(wrapper.emitted('dragStart')![0][0]).toEqual(dragData);
    });

    it('should emit dragStart event when LayoutTypeGrid emits dragStart', async () => {
      wrapper = mount(CardBoxLibrary);

      // 切换到箱子标签页
      const tabs = wrapper.findAll('.card-box-library__tab');
      await tabs[1].trigger('click');

      const layoutGrid = wrapper.findComponent(LayoutTypeGrid);
      const dragData: DragData = { type: 'layout', typeId: 'grid-layout', name: '网格' };

      await layoutGrid.vm.$emit('dragStart', dragData, {} as DragEvent);

      expect(wrapper.emitted('dragStart')).toBeTruthy();
      expect(wrapper.emitted('dragStart')![0][0]).toEqual(dragData);
    });
  });

  describe('tab count updates', () => {
    it('should update card count when searching', async () => {
      wrapper = mount(CardBoxLibrary);

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      await input.setValue('视频');
      await nextTick();

      const cardTab = wrapper.findAll('.card-box-library__tab')[0];
      const count = cardTab.find('.card-box-library__tab-count');

      const countValue = parseInt(count.text());
      expect(countValue).toBeLessThan(26);
      expect(countValue).toBeGreaterThan(0);
    });

    it('should update layout count when searching', async () => {
      wrapper = mount(CardBoxLibrary);

      // 切换到箱子标签页
      const tabs = wrapper.findAll('.card-box-library__tab');
      await tabs[1].trigger('click');

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      await input.setValue('瀑布');
      await nextTick();

      const boxTab = wrapper.findAll('.card-box-library__tab')[1];
      const count = boxTab.find('.card-box-library__tab-count');

      const countValue = parseInt(count.text());
      expect(countValue).toBeLessThan(8);
      expect(countValue).toBeGreaterThan(0);
    });
  });

  describe('empty action', () => {
    it('should clear search when empty action is clicked', async () => {
      wrapper = mount(CardBoxLibrary);

      const input = wrapper.find<HTMLInputElement>('.card-box-library__search-input');
      await input.setValue('xyz不存在的类型123');
      await nextTick();

      const emptyAction = wrapper.find('.card-box-library__empty-action');
      await emptyAction.trigger('click');

      expect(input.element.value).toBe('');
      expect(wrapper.find('.card-box-library__empty').exists()).toBe(false);
    });
  });
});
