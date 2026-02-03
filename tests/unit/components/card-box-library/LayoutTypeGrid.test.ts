/**
 * LayoutTypeGrid 组件测试
 * @module tests/unit/components/card-box-library/LayoutTypeGrid
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LayoutTypeGrid from '@/components/card-box-library/LayoutTypeGrid.vue';
import { layoutTypes, getLayoutTypesByCategory } from '@/components/card-box-library/data';
import type { LayoutTypeDefinition, DragData } from '@/components/card-box-library/types';

describe('LayoutTypeGrid', () => {
  describe('rendering', () => {
    it('should render all categories by default', () => {
      const wrapper = mount(LayoutTypeGrid);

      const categories = wrapper.findAll('.layout-type-grid__category');
      expect(categories).toHaveLength(2);
    });

    it('should render all 8 layout types', () => {
      const wrapper = mount(LayoutTypeGrid);

      const items = wrapper.findAll('.layout-type-grid__item');
      expect(items).toHaveLength(8);
    });

    it('should render category headers with icon, name, and count', () => {
      const wrapper = mount(LayoutTypeGrid);

      const firstCategory = wrapper.find('.layout-type-grid__category-header');
      expect(firstCategory.find('.layout-type-grid__category-icon').exists()).toBe(true);
      expect(firstCategory.find('.layout-type-grid__category-name').exists()).toBe(true);
      expect(firstCategory.find('.layout-type-grid__category-count').exists()).toBe(true);
    });

    it('should render item with icon, name, and description', () => {
      const wrapper = mount(LayoutTypeGrid);

      const firstItem = wrapper.find('.layout-type-grid__item');
      expect(firstItem.find('.layout-type-grid__item-icon').exists()).toBe(true);
      expect(firstItem.find('.layout-type-grid__item-name').exists()).toBe(true);
      expect(firstItem.find('.layout-type-grid__item-desc').exists()).toBe(true);
    });

    it('should have draggable attribute on items', () => {
      const wrapper = mount(LayoutTypeGrid);

      const firstItem = wrapper.find('.layout-type-grid__item');
      expect(firstItem.attributes('draggable')).toBe('true');
    });

    it('should have title attribute with description', () => {
      const wrapper = mount(LayoutTypeGrid);

      const firstItem = wrapper.find('.layout-type-grid__item');
      expect(firstItem.attributes('title')).toBeTruthy();
    });
  });

  describe('with custom types prop', () => {
    it('should render only provided types', () => {
      const customTypes: LayoutTypeDefinition[] = [
        layoutTypes[0], // 列表
        layoutTypes[1], // 网格
      ];

      const wrapper = mount(LayoutTypeGrid, {
        props: { types: customTypes, showCategories: false },
      });

      const items = wrapper.findAll('.layout-type-grid__item');
      expect(items).toHaveLength(2);
    });

    it('should group provided types by category when showCategories is true', () => {
      const basicTypes = getLayoutTypesByCategory('basic');

      const wrapper = mount(LayoutTypeGrid, {
        props: { types: basicTypes, showCategories: true },
      });

      const categories = wrapper.findAll('.layout-type-grid__category');
      expect(categories).toHaveLength(1);

      const items = wrapper.findAll('.layout-type-grid__item');
      expect(items).toHaveLength(4);
    });

    it('should not show category headers when showCategories is false', () => {
      const wrapper = mount(LayoutTypeGrid, {
        props: { types: layoutTypes, showCategories: false },
      });

      expect(wrapper.find('.layout-type-grid__category-header').exists()).toBe(false);
    });
  });

  describe('drag events', () => {
    it('should emit dragStart event on dragstart', async () => {
      const wrapper = mount(LayoutTypeGrid);

      const firstItem = wrapper.find('.layout-type-grid__item');
      await firstItem.trigger('dragstart');

      expect(wrapper.emitted('dragStart')).toBeTruthy();
      expect(wrapper.emitted('dragStart')).toHaveLength(1);
    });

    it('should emit correct drag data', async () => {
      const wrapper = mount(LayoutTypeGrid);

      const firstItem = wrapper.find('.layout-type-grid__item');
      await firstItem.trigger('dragstart');

      const emitted = wrapper.emitted('dragStart');
      expect(emitted).toBeTruthy();

      const [data, event] = emitted![0] as [DragData, DragEvent];
      expect(data.type).toBe('layout');
      expect(data.typeId).toBe(layoutTypes[0].id);
      expect(data.name).toBe(layoutTypes[0].name);
    });

    it('should emit dragStart for filtered types', async () => {
      const professionalTypes = getLayoutTypesByCategory('professional');

      const wrapper = mount(LayoutTypeGrid, {
        props: { types: professionalTypes, showCategories: false },
      });

      const item = wrapper.find('.layout-type-grid__item');
      await item.trigger('dragstart');

      const emitted = wrapper.emitted('dragStart');
      expect(emitted).toBeTruthy();

      const [data] = emitted![0] as [DragData, DragEvent];
      expect(data.typeId).toBe(professionalTypes[0].id);
    });
  });

  describe('category count', () => {
    it('should show correct count for each category', () => {
      const wrapper = mount(LayoutTypeGrid);

      const counts = wrapper.findAll('.layout-type-grid__category-count');

      // 基础布局 4 种
      expect(counts[0].text()).toBe('4');
      // 专业布局 4 种
      expect(counts[1].text()).toBe('4');
    });
  });

  describe('empty state', () => {
    it('should render nothing when types is empty array', () => {
      const wrapper = mount(LayoutTypeGrid, {
        props: { types: [], showCategories: false },
      });

      expect(wrapper.findAll('.layout-type-grid__item')).toHaveLength(0);
    });

    it('should not show category when all types in category are filtered out', () => {
      // 只提供专业布局
      const professionalTypes = getLayoutTypesByCategory('professional');

      const wrapper = mount(LayoutTypeGrid, {
        props: { types: professionalTypes, showCategories: true },
      });

      const categories = wrapper.findAll('.layout-type-grid__category');
      // 只应该显示 1 个分类（专业布局）
      expect(categories).toHaveLength(1);
    });
  });

  describe('layout specific features', () => {
    it('should show description for each layout type', () => {
      const wrapper = mount(LayoutTypeGrid);

      const descriptions = wrapper.findAll('.layout-type-grid__item-desc');
      expect(descriptions).toHaveLength(8);

      descriptions.forEach((desc) => {
        expect(desc.text()).toBeTruthy();
      });
    });

    it('should render correct icon for list layout', () => {
      const wrapper = mount(LayoutTypeGrid);

      const items = wrapper.findAll('.layout-type-grid__item');
      const listItem = items[0];

      const icon = listItem.find('.layout-type-grid__item-icon');
      expect(icon.text()).toBe('📜'); // 列表布局图标
    });

    it('should render correct icon for grid layout', () => {
      const wrapper = mount(LayoutTypeGrid);

      const items = wrapper.findAll('.layout-type-grid__item');
      const gridItem = items[1];

      const icon = gridItem.find('.layout-type-grid__item-icon');
      expect(icon.text()).toBe('⊞'); // 网格布局图标
    });
  });
});
