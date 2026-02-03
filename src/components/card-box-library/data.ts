/**
 * 卡箱库数据定义
 * @module components/card-box-library/data
 */

import type { CardTypeDefinition, LayoutTypeDefinition, CategoryDefinition } from './types';

/** 卡片分类定义 */
export const cardCategories: CategoryDefinition[] = [
  { id: 'text', name: '文本类', icon: '📝' },
  { id: 'media', name: '媒体类', icon: '🎬' },
  { id: 'interactive', name: '交互类', icon: '🎮' },
  { id: 'professional', name: '专业类', icon: '📊' },
  { id: 'content', name: '内容类', icon: '📰' },
  { id: 'info', name: '信息类', icon: '📋' },
];

/** 布局分类定义 */
export const layoutCategories: CategoryDefinition[] = [
  { id: 'basic', name: '基础布局', icon: '📐' },
  { id: 'professional', name: '专业布局', icon: '🎨' },
];

/** 26种基础卡片类型 */
export const cardTypes: CardTypeDefinition[] = [
  // 文本类（3种）
  {
    id: 'rich-text',
    name: '富文本',
    icon: '📄',
    description: '支持格式化的富文本内容',
    category: 'text',
    keywords: ['文本', '富文本', 'rich', 'text', '编辑'],
  },
  {
    id: 'markdown',
    name: 'Markdown',
    icon: '📑',
    description: 'Markdown格式文档',
    category: 'text',
    keywords: ['markdown', 'md', '文档', '笔记'],
  },
  {
    id: 'code',
    name: '代码块',
    icon: '💻',
    description: '代码展示与高亮',
    category: 'text',
    keywords: ['代码', 'code', '编程', '程序'],
  },

  // 媒体类（4种）
  {
    id: 'image',
    name: '图片',
    icon: '🖼️',
    description: '图片展示与查看',
    category: 'media',
    keywords: ['图片', 'image', '照片', '相册'],
  },
  {
    id: 'video',
    name: '视频',
    icon: '🎬',
    description: '视频播放与控制',
    category: 'media',
    keywords: ['视频', 'video', '电影', '播放'],
  },
  {
    id: 'music',
    name: '音乐',
    icon: '🎵',
    description: '音频播放与歌词',
    category: 'media',
    keywords: ['音乐', 'music', '音频', '歌曲'],
  },
  {
    id: '3d-model',
    name: '3D模型',
    icon: '🎲',
    description: '3D模型展示与交互',
    category: 'media',
    keywords: ['3d', '模型', 'model', '三维'],
  },

  // 交互类（5种）
  {
    id: 'list',
    name: '列表',
    icon: '📋',
    description: '可勾选的列表项',
    category: 'interactive',
    keywords: ['列表', 'list', '任务', 'todo'],
  },
  {
    id: 'rating',
    name: '打分',
    icon: '⭐',
    description: '评分与评价',
    category: 'interactive',
    keywords: ['打分', 'rating', '评分', '星级'],
  },
  {
    id: 'webpage',
    name: '网页',
    icon: '🌐',
    description: '嵌入网页内容',
    category: 'interactive',
    keywords: ['网页', 'web', 'iframe', '嵌入'],
  },
  {
    id: 'game',
    name: '游戏',
    icon: '🎮',
    description: '游戏嵌入与交互',
    category: 'interactive',
    keywords: ['游戏', 'game', '互动', '娱乐'],
  },
  {
    id: 'app',
    name: '应用',
    icon: '📱',
    description: '小应用程序',
    category: 'interactive',
    keywords: ['应用', 'app', '程序', '工具'],
  },

  // 专业类（5种）
  {
    id: 'calendar',
    name: '日历',
    icon: '📅',
    description: '日期与事件管理',
    category: 'professional',
    keywords: ['日历', 'calendar', '日程', '事件'],
  },
  {
    id: 'gantt',
    name: '甘特图',
    icon: '📊',
    description: '项目进度管理',
    category: 'professional',
    keywords: ['甘特图', 'gantt', '项目', '进度'],
  },
  {
    id: 'heatmap',
    name: '热力图',
    icon: '🔥',
    description: '数据热力展示',
    category: 'professional',
    keywords: ['热力图', 'heatmap', '数据', '统计'],
  },
  {
    id: 'mindmap',
    name: '思维导图',
    icon: '🧠',
    description: '思维与知识结构',
    category: 'professional',
    keywords: ['思维导图', 'mindmap', '脑图', '结构'],
  },
  {
    id: 'whiteboard',
    name: '白板',
    icon: '🎨',
    description: '自由绘制与标注',
    category: 'professional',
    keywords: ['白板', 'whiteboard', '绘制', '画板'],
  },

  // 内容类（4种）
  {
    id: 'episodes',
    name: '剧集',
    icon: '🎞️',
    description: '连续剧集管理',
    category: 'content',
    keywords: ['剧集', 'episodes', '连续剧', '电视剧'],
  },
  {
    id: 'article',
    name: '图文',
    icon: '📖',
    description: '图文混排内容',
    category: 'content',
    keywords: ['图文', 'article', '文章', '内容'],
  },
  {
    id: 'post',
    name: '帖子',
    icon: '💬',
    description: '社交帖子内容',
    category: 'content',
    keywords: ['帖子', 'post', '动态', '分享'],
  },
  {
    id: 'chat-history',
    name: '聊天记录',
    icon: '💭',
    description: '对话聊天记录',
    category: 'content',
    keywords: ['聊天', 'chat', '对话', '消息'],
  },

  // 信息类（5种）
  {
    id: 'profile',
    name: '名片',
    icon: '👤',
    description: '个人名片信息',
    category: 'info',
    keywords: ['名片', 'profile', '个人', '联系'],
  },
  {
    id: 'product',
    name: '商品',
    icon: '🛒',
    description: '商品信息展示',
    category: 'info',
    keywords: ['商品', 'product', '产品', '购物'],
  },
  {
    id: 'device',
    name: '设备',
    icon: '📟',
    description: '设备信息与状态',
    category: 'info',
    keywords: ['设备', 'device', '硬件', '状态'],
  },
  {
    id: 'location',
    name: '位置',
    icon: '📍',
    description: '地图位置与导航',
    category: 'info',
    keywords: ['位置', 'location', '地图', '导航', '地址'],
  },
  {
    id: 'weather',
    name: '天气',
    icon: '🌤️',
    description: '天气信息展示',
    category: 'info',
    keywords: ['天气', 'weather', '气象', '温度'],
  },
];

/** 8种箱子布局类型 */
export const layoutTypes: LayoutTypeDefinition[] = [
  // 基础布局（4种）
  {
    id: 'list-layout',
    name: '列表',
    icon: '📜',
    description: '垂直或水平列表排列',
    category: 'basic',
    keywords: ['列表', 'list', '排列', '线性'],
  },
  {
    id: 'grid-layout',
    name: '网格',
    icon: '⊞',
    description: '固定网格排列',
    category: 'basic',
    keywords: ['网格', 'grid', '方格', '均匀'],
  },
  {
    id: 'waterfall-layout',
    name: '瀑布流',
    icon: '🌊',
    description: '瀑布流算法排列',
    category: 'basic',
    keywords: ['瀑布流', 'waterfall', 'masonry', '流式'],
  },
  {
    id: 'canvas-layout',
    name: '无限桌面',
    icon: '🖥️',
    description: '自由摆放的无限画布',
    category: 'basic',
    keywords: ['桌面', 'canvas', '画布', '自由'],
  },

  // 专业布局（4种）
  {
    id: 'timeline-layout',
    name: '时间线',
    icon: '⏱️',
    description: '按时间顺序排列',
    category: 'professional',
    keywords: ['时间线', 'timeline', '时间', '历史'],
  },
  {
    id: 'bookshelf-layout',
    name: '书架',
    icon: '📚',
    description: '模拟书架展示',
    category: 'professional',
    keywords: ['书架', 'bookshelf', '书籍', '阅读'],
  },
  {
    id: 'profile-layout',
    name: '个人主页',
    icon: '🏠',
    description: '个人主页区块布局',
    category: 'professional',
    keywords: ['主页', 'profile', '个人', '空间'],
  },
  {
    id: 'moments-layout',
    name: '朋友圈',
    icon: '👥',
    description: '社交动态流布局',
    category: 'professional',
    keywords: ['朋友圈', 'moments', '动态', '社交'],
  },
];

/**
 * 根据分类获取卡片类型
 * @param category - 分类ID
 * @returns 卡片类型列表
 */
export function getCardTypesByCategory(category: string): CardTypeDefinition[] {
  return cardTypes.filter((type) => type.category === category);
}

/**
 * 根据分类获取布局类型
 * @param category - 分类ID
 * @returns 布局类型列表
 */
export function getLayoutTypesByCategory(category: string): LayoutTypeDefinition[] {
  return layoutTypes.filter((type) => type.category === category);
}

/**
 * 搜索卡片类型
 * @param query - 搜索关键词
 * @returns 匹配的卡片类型列表
 */
export function searchCardTypes(query: string): CardTypeDefinition[] {
  if (!query.trim()) return cardTypes;

  const lowerQuery = query.toLowerCase();
  return cardTypes.filter((type) => {
    return (
      type.name.toLowerCase().includes(lowerQuery) ||
      type.description.toLowerCase().includes(lowerQuery) ||
      type.keywords.some((keyword) => keyword.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * 搜索布局类型
 * @param query - 搜索关键词
 * @returns 匹配的布局类型列表
 */
export function searchLayoutTypes(query: string): LayoutTypeDefinition[] {
  if (!query.trim()) return layoutTypes;

  const lowerQuery = query.toLowerCase();
  return layoutTypes.filter((type) => {
    return (
      type.name.toLowerCase().includes(lowerQuery) ||
      type.description.toLowerCase().includes(lowerQuery) ||
      type.keywords.some((keyword) => keyword.toLowerCase().includes(lowerQuery))
    );
  });
}
