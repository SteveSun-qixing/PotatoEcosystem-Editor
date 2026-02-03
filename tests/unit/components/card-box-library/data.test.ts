/**
 * 卡箱库数据测试
 * @module tests/unit/components/card-box-library/data
 */

import { describe, it, expect } from 'vitest';
import {
  cardCategories,
  layoutCategories,
  cardTypes,
  layoutTypes,
  getCardTypesByCategory,
  getLayoutTypesByCategory,
  searchCardTypes,
  searchLayoutTypes,
} from '@/components/card-box-library/data';

describe('Card Box Library Data', () => {
  describe('cardCategories', () => {
    it('should have 6 card categories', () => {
      expect(cardCategories).toHaveLength(6);
    });

    it('should have correct category IDs', () => {
      const categoryIds = cardCategories.map((c) => c.id);
      expect(categoryIds).toEqual([
        'text',
        'media',
        'interactive',
        'professional',
        'content',
        'info',
      ]);
    });

    it('should have name and icon for each category', () => {
      cardCategories.forEach((category) => {
        expect(category.name).toBeTruthy();
        expect(category.icon).toBeTruthy();
      });
    });
  });

  describe('layoutCategories', () => {
    it('should have 2 layout categories', () => {
      expect(layoutCategories).toHaveLength(2);
    });

    it('should have correct category IDs', () => {
      const categoryIds = layoutCategories.map((c) => c.id);
      expect(categoryIds).toEqual(['basic', 'professional']);
    });
  });

  describe('cardTypes', () => {
    it('should have 26 card types', () => {
      expect(cardTypes).toHaveLength(26);
    });

    it('should have text category with 3 types', () => {
      const textTypes = cardTypes.filter((t) => t.category === 'text');
      expect(textTypes).toHaveLength(3);
      expect(textTypes.map((t) => t.id)).toEqual(['rich-text', 'markdown', 'code']);
    });

    it('should have media category with 4 types', () => {
      const mediaTypes = cardTypes.filter((t) => t.category === 'media');
      expect(mediaTypes).toHaveLength(4);
      expect(mediaTypes.map((t) => t.id)).toEqual(['image', 'video', 'music', '3d-model']);
    });

    it('should have interactive category with 5 types', () => {
      const interactiveTypes = cardTypes.filter((t) => t.category === 'interactive');
      expect(interactiveTypes).toHaveLength(5);
    });

    it('should have professional category with 5 types', () => {
      const professionalTypes = cardTypes.filter((t) => t.category === 'professional');
      expect(professionalTypes).toHaveLength(5);
    });

    it('should have content category with 4 types', () => {
      const contentTypes = cardTypes.filter((t) => t.category === 'content');
      expect(contentTypes).toHaveLength(4);
    });

    it('should have info category with 5 types', () => {
      const infoTypes = cardTypes.filter((t) => t.category === 'info');
      expect(infoTypes).toHaveLength(5);
    });

    it('should have required fields for each type', () => {
      cardTypes.forEach((type) => {
        expect(type.id).toBeTruthy();
        expect(type.name).toBeTruthy();
        expect(type.icon).toBeTruthy();
        expect(type.description).toBeTruthy();
        expect(type.category).toBeTruthy();
        expect(type.keywords).toBeInstanceOf(Array);
        expect(type.keywords.length).toBeGreaterThan(0);
      });
    });
  });

  describe('layoutTypes', () => {
    it('should have 8 layout types', () => {
      expect(layoutTypes).toHaveLength(8);
    });

    it('should have basic category with 4 types', () => {
      const basicTypes = layoutTypes.filter((t) => t.category === 'basic');
      expect(basicTypes).toHaveLength(4);
      expect(basicTypes.map((t) => t.id)).toEqual([
        'list-layout',
        'grid-layout',
        'waterfall-layout',
        'canvas-layout',
      ]);
    });

    it('should have professional category with 4 types', () => {
      const professionalTypes = layoutTypes.filter((t) => t.category === 'professional');
      expect(professionalTypes).toHaveLength(4);
      expect(professionalTypes.map((t) => t.id)).toEqual([
        'timeline-layout',
        'bookshelf-layout',
        'profile-layout',
        'moments-layout',
      ]);
    });

    it('should have required fields for each type', () => {
      layoutTypes.forEach((type) => {
        expect(type.id).toBeTruthy();
        expect(type.name).toBeTruthy();
        expect(type.icon).toBeTruthy();
        expect(type.description).toBeTruthy();
        expect(type.category).toBeTruthy();
        expect(type.keywords).toBeInstanceOf(Array);
        expect(type.keywords.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getCardTypesByCategory', () => {
    it('should return correct types for text category', () => {
      const types = getCardTypesByCategory('text');
      expect(types).toHaveLength(3);
      expect(types.every((t) => t.category === 'text')).toBe(true);
    });

    it('should return correct types for media category', () => {
      const types = getCardTypesByCategory('media');
      expect(types).toHaveLength(4);
      expect(types.every((t) => t.category === 'media')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const types = getCardTypesByCategory('unknown');
      expect(types).toHaveLength(0);
    });
  });

  describe('getLayoutTypesByCategory', () => {
    it('should return correct types for basic category', () => {
      const types = getLayoutTypesByCategory('basic');
      expect(types).toHaveLength(4);
      expect(types.every((t) => t.category === 'basic')).toBe(true);
    });

    it('should return correct types for professional category', () => {
      const types = getLayoutTypesByCategory('professional');
      expect(types).toHaveLength(4);
      expect(types.every((t) => t.category === 'professional')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const types = getLayoutTypesByCategory('unknown');
      expect(types).toHaveLength(0);
    });
  });

  describe('searchCardTypes', () => {
    it('should return all types for empty query', () => {
      const results = searchCardTypes('');
      expect(results).toHaveLength(26);
    });

    it('should return all types for whitespace query', () => {
      const results = searchCardTypes('   ');
      expect(results).toHaveLength(26);
    });

    it('should find types by name', () => {
      const results = searchCardTypes('视频');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.id === 'video')).toBe(true);
    });

    it('should find types by description', () => {
      const results = searchCardTypes('播放');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find types by keywords', () => {
      const results = searchCardTypes('markdown');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.id === 'markdown')).toBe(true);
    });

    it('should be case insensitive', () => {
      const results1 = searchCardTypes('MARKDOWN');
      const results2 = searchCardTypes('markdown');
      expect(results1).toEqual(results2);
    });

    it('should return empty array for no matches', () => {
      const results = searchCardTypes('xyz123不存在的类型');
      expect(results).toHaveLength(0);
    });

    it('should find multiple types with common keyword', () => {
      // 搜索"展示"应该匹配多个类型（3D模型展示、商品展示、天气展示等）
      const results = searchCardTypes('展示');
      expect(results.length).toBeGreaterThan(1);
    });
  });

  describe('searchLayoutTypes', () => {
    it('should return all types for empty query', () => {
      const results = searchLayoutTypes('');
      expect(results).toHaveLength(8);
    });

    it('should return all types for whitespace query', () => {
      const results = searchLayoutTypes('   ');
      expect(results).toHaveLength(8);
    });

    it('should find types by name', () => {
      const results = searchLayoutTypes('瀑布流');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.id === 'waterfall-layout')).toBe(true);
    });

    it('should find types by description', () => {
      const results = searchLayoutTypes('时间');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find types by keywords', () => {
      const results = searchLayoutTypes('grid');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.id === 'grid-layout')).toBe(true);
    });

    it('should be case insensitive', () => {
      const results1 = searchLayoutTypes('GRID');
      const results2 = searchLayoutTypes('grid');
      expect(results1).toEqual(results2);
    });

    it('should return empty array for no matches', () => {
      const results = searchLayoutTypes('xyz123不存在的布局');
      expect(results).toHaveLength(0);
    });
  });
});
