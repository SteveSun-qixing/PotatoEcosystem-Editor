/**
 * 测试环境设置
 */

import { vi } from 'vitest';

// 全局 mock 设置

// Mock @chips/sdk
vi.mock('@chips/sdk', () => ({
  ChipsSDK: vi.fn().mockImplementation(() => ({
    version: '1.0.0',
  })),
  createSDK: vi.fn().mockResolvedValue({
    version: '1.0.0',
  }),
}));

// Mock @chips/components
vi.mock('@chips/components', () => ({
  version: '0.1.0',
}));

// Mock @chips/foundation
vi.mock('@chips/foundation', () => ({
  version: '1.0.0',
}));

// 全局测试配置
beforeEach(() => {
  // 每个测试前重置 mock
  vi.clearAllMocks();
});

afterEach(() => {
  // 每个测试后清理
});

// 全局测试辅助函数
export function createMockEditor() {
  return {
    config: {
      layout: 'infinite-canvas' as const,
      debug: true,
    },
    state: 'ready' as const,
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    use: vi.fn().mockResolvedValue(undefined),
  };
}
