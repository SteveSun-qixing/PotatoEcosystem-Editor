/**
 * CardTypeGrid 组件测试
 * @module tests/unit/components/card-box-library/CardTypeGrid
 */

import { describe, it, expect, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import CardTypeGrid from '@/components/card-box-library/CardTypeGrid.vue';
import { cardTypes, getCardTypesByCategory } from '@/components/card-box-library/data';
import type { CardTypeDefinition, DragData } from '@/components/card-box-library/types';

describe('CardTypeGrid', () => {
  describe('rendering', () => {
    it('should render all categories by default', () => {
      const wrapper = mount(CardTypeGrid);

      const categories = wrapper.findAll('.card-type-grid__category');
      expect(categories).toHaveLength(6);
    });

    it('should render all 26 card types', () => {
      const wrapper = mount(CardTypeGrid);

      const items = wrapper.findAll('.card-type-grid__item');
      expect(items).toHaveLength(26);
    });

    it('should render category headers with icon, name, and count', () => {
      const wrapper = mount(CardTypeGrid);

      const firstCategory = wrapper.find('.card-type-grid__category-header');
      expect(firstCategory.find('.card-type-grid__category-icon').exists()).toBe(true);
      expect(firstCategory.find('.card-type-grid__category-name').exists()).toBe(true);
      expect(firstCategory.find('.card-type-grid__category-count').exists()).toBe(true);
    });

    it('should render item with icon and name', () => {
      const wrapper = mount(CardTypeGrid);

      const firstItem = wrapper.find('.card-type-grid__item');
      expect(firstItem.find('.card-type-grid__item-icon').exists()).toBe(true);
      expect(firstItem.find('.card-type-grid__item-name').exists()).toBe(true);
    });

    it('should have draggable attribute on items', () => {
      const wrapper = mount(CardTypeGrid);

      const firstItem = wrapper.find('.card-type-grid__item');
      expect(firstItem.attributes('draggable')).toBe('true');
    });

    it('should have title attribute with description', () => {
      const wrapper = mount(CardTypeGrid);

      const firstItem = wrapper.find('.card-type-grid__item');
      expect(firstItem.attributes('title')).toBeTruthy();
    });
  });

  describe('with custom types prop', () => {
    it('should render only provided types', () => {
      const customTypes: CardTypeDefinition[] = [
        cardTypes[0], // 富文本
        cardTypes[1], // Markdown
      ];

      const wrapper = mount(CardTypeGrid, {
        props: { types: customTypes, showCategories: false },
      });

      const items = wrapper.findAll('.card-type-grid__item');
      expect(items).toHaveLength(2);
    });

    it('should group provided types by category when showCategories is true', () => {
      const textTypes = getCardTypesByCategory('text');

      const wrapper = mount(CardTypeGrid, {
        props: { types: textTypes, showCategories: true },
      });

      const categories = wrapper.findAll('.card-type-grid__category');
      expect(categories).toHaveLength(1);

      const items = wrapper.findAll('.card-type-grid__item');
      expect(items).toHaveLength(3);
    });

    it('should not show category headers when showCategories is false', () => {
      const wrapper = mount(CardTypeGrid, {
        props: { types: cardTypes, showCategories: false },
      });

      expect(wrapper.find('.card-type-grid__category-header').exists()).toBe(false);
    });
  });

  describe('drag events', () => {
    it('should emit dragStart event on dragstart', async () => {
      const wrapper = mount(CardTypeGrid);

      const firstItem = wrapper.find('.card-type-grid__item');
      await firstItem.trigger('dragstart');

      expect(wrapper.emitted('dragStart')).toBeTruthy();
      expect(wrapper.emitted('dragStart')).toHaveLength(1);
    });

    it('should emit correct drag data', async () => {
      const wrapper = mount(CardTypeGrid);

      const firstItem = wrapper.find('.card-type-grid__item');
      await firstItem.trigger('dragstart');

      const emitted = wrapper.emitted('dragStart');
      expect(emitted).toBeTruthy();

      const [data, event] = emitted![0] as [DragData, DragEvent];
      expect(data.type).toBe('card');
      expect(data.typeId).toBe(cardTypes[0].id);
      expect(data.name).toBe(cardTypes[0].name);
    });

    it('should emit dragStart for filtered types', async () => {
      const customTypes = [cardTypes[5]]; // video

      const wrapper = mount(CardTypeGrid, {
        props: { types: customTypes, showCategories: false },
      });

      const item = wrapper.find('.card-type-grid__item');
      await item.trigger('dragstart');

      const emitted = wrapper.emitted('dragStart');
      expect(emitted).toBeTruthy();

      const [data] = emitted![0] as [DragData, DragEvent];
      expect(data.typeId).toBe(customTypes[0].id);
    });
  });

  describe('category count', () => {
    it('should show correct count for each category', () => {
      const wrapper = mount(CardTypeGrid);

      const counts = wrapper.findAll('.card-type-grid__category-count');

      // 文本类 3 种
      expect(counts[0].text()).toBe('3');
      // 媒体类 4 种
      expect(counts[1].text()).toBe('4');
      // 交互类 5 种
      expect(counts[2].text()).toBe('5');
      // 专业类 5 种
      expect(counts[3].text()).toBe('5');
      // 内容类 4 种
      expect(counts[4].text()).toBe('4');
      // 信息类 5 种
      expect(counts[5].text()).toBe('5');
    });
  });

  describe('empty state', () => {
    it('should render nothing when types is empty array', () => {
      const wrapper = mount(CardTypeGrid, {
        props: { types: [], showCategories: false },
      });

      expect(wrapper.findAll('.card-type-grid__item')).toHaveLength(0);
    });

    it('should not show category when all types in category are filtered out', () => {
      // 只提供媒体类
      const mediaTypes = getCardTypesByCategory('media');

      const wrapper = mount(CardTypeGrid, {
        props: { types: mediaTypes, showCategories: true },
      });

      const categories = wrapper.findAll('.card-type-grid__category');
      // 只应该显示 1 个分类（媒体类）
      expect(categories).toHaveLength(1);
    });
  });
});
