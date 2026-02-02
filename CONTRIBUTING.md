# 贡献指南

感谢你对 Chips Editor 项目的关注！我们欢迎所有形式的贡献。

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [问题反馈](#问题反馈)

---

## 行为准则

本项目遵循 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。参与本项目即表示你同意遵守该准则。

**核心原则**：
- 尊重所有参与者
- 使用友好和包容的语言
- 接受建设性的批评
- 关注对社区最有利的事情

---

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请创建一个 [Issue](https://github.com/chips-ecosystem/chips-editor/issues/new?template=bug_report.md)。

在报告时，请包含：
- **Bug 描述**：清晰简洁地描述问题
- **复现步骤**：详细的步骤来复现问题
- **期望行为**：你期望发生什么
- **实际行为**：实际发生了什么
- **截图**：如果适用，添加截图
- **环境信息**：
  - 操作系统和版本
  - Node.js 版本
  - npm 版本
  - 浏览器（如适用）

### 提出功能建议

如果你有新功能的想法，请创建一个 [Issue](https://github.com/chips-ecosystem/chips-editor/issues/new?template=feature_request.md)。

请描述：
- **功能概述**：你希望实现什么功能
- **使用场景**：这个功能解决什么问题
- **建议的解决方案**：你认为应该如何实现
- **替代方案**：你考虑过的其他方案

### 贡献代码

我们欢迎代码贡献！请遵循下面的开发流程。

### 改进文档

文档改进同样重要！你可以：
- 修正错别字
- 改进描述
- 添加示例
- 翻译文档

---

## 开发流程

### 1. Fork 仓库

点击 GitHub 页面右上角的 "Fork" 按钮。

### 2. 克隆你的 Fork

```bash
git clone https://github.com/YOUR_USERNAME/chips-editor.git
cd chips-editor
```

### 3. 添加上游仓库

```bash
git remote add upstream https://github.com/chips-ecosystem/chips-editor.git
```

### 4. 创建分支

```bash
# 同步主分支
git checkout main
git pull upstream main

# 创建功能分支
git checkout -b feature/your-feature-name
```

**分支命名规范**：
- `feature/xxx` - 新功能
- `fix/xxx` - Bug 修复
- `docs/xxx` - 文档修改
- `refactor/xxx` - 代码重构
- `test/xxx` - 测试相关

### 5. 安装依赖

```bash
npm install
```

### 6. 开发

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 运行类型检查
npm run typecheck

# 运行代码检查
npm run lint
```

### 7. 提交更改

```bash
git add .
git commit -m "feat(module): 添加新功能"
```

### 8. 推送分支

```bash
git push origin feature/your-feature-name
```

### 9. 创建 Pull Request

在 GitHub 上创建 Pull Request，填写相关信息。

---

## 代码规范

### TypeScript 规范

- 使用 TypeScript 严格模式
- 为所有公共 API 添加类型定义
- 避免使用 `any`，优先使用 `unknown`
- 使用接口定义对象类型

```typescript
// ✅ 好的做法
interface UserOptions {
  name: string;
  age?: number;
}

function createUser(options: UserOptions): User {
  // ...
}

// ❌ 避免
function createUser(options: any) {
  // ...
}
```

### Vue 规范

- 使用 Composition API
- 组件文件使用 PascalCase
- 使用 `<script setup>` 语法
- Props 和 Emits 添加类型定义

```vue
<script setup lang="ts">
interface Props {
  title: string;
  count?: number;
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
});

const emit = defineEmits<{
  (e: 'update', value: number): void;
}>();
</script>

<template>
  <div class="my-component">
    {{ title }}
  </div>
</template>

<style scoped>
.my-component {
  /* 样式 */
}
</style>
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名（组件） | PascalCase | `CardWindow.vue` |
| 文件名（工具） | kebab-case | `canvas-utils.ts` |
| 类名 | PascalCase | `WindowManager` |
| 函数名 | camelCase | `createWindow` |
| 常量 | UPPER_SNAKE_CASE | `MAX_HISTORY_SIZE` |
| 接口名 | PascalCase | `WindowConfig` |
| 类型别名 | PascalCase | `LayoutType` |

### 注释规范

使用 JSDoc 风格的注释：

```typescript
/**
 * 创建新窗口
 * 
 * @param cardId - 卡片 ID
 * @param options - 窗口配置选项
 * @returns 窗口 ID
 * 
 * @example
 * ```typescript
 * const windowId = createWindow('card-123', { title: '我的卡片' });
 * ```
 */
function createWindow(cardId: string, options?: WindowOptions): string {
  // ...
}
```

### CSS 规范

- 使用 CSS 变量定义主题色
- 避免使用 `!important`
- 组件样式使用 `scoped`
- 类名使用 BEM 命名

```css
/* 使用 CSS 变量 */
.card-window {
  background-color: var(--bg-primary);
  border-radius: var(--radius-md);
}

/* BEM 命名 */
.card-window__header {
  /* ... */
}

.card-window__header--focused {
  /* ... */
}
```

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| 类型 | 描述 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档修改 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建相关 |
| `ci` | CI 配置 |
| `chore` | 其他修改 |
| `revert` | 回滚提交 |

### Scope 范围

- `core` - 核心模块
- `layout` - 布局系统
- `window` - 窗口管理
- `file` - 文件管理
- `edit-panel` - 编辑面板
- `card-box` - 卡箱库
- `dock` - 程序坞
- `drag-drop` - 拖放系统
- `command` - 命令系统
- `plugin` - 插件系统
- `deps` - 依赖更新

### 示例

```bash
# 新功能
git commit -m "feat(window): 添加窗口平铺布局功能"

# Bug 修复
git commit -m "fix(drag-drop): 修复拖放时坐标计算错误"

# 文档
git commit -m "docs(readme): 更新安装说明"

# 重构
git commit -m "refactor(core): 重构编辑器初始化流程"

# 带 body 的提交
git commit -m "feat(layout): 添加工作台布局

- 实现左侧文件面板
- 实现右侧属性面板
- 支持面板大小调整

Closes #123"
```

---

## Pull Request 流程

### 创建 PR

1. 确保你的分支是从最新的 `main` 分支创建的
2. 确保所有测试通过
3. 确保代码检查通过
4. 填写 PR 模板

### PR 标题

使用与提交相同的格式：

```
feat(module): 添加新功能
```

### PR 描述

请包含：
- **变更说明**：清晰描述做了什么修改
- **动机和背景**：为什么要做这个修改
- **测试**：如何测试这些修改
- **截图**：如果是 UI 修改，请添加截图
- **相关 Issue**：关联的 Issue 编号

### 代码审查

- 至少需要一位维护者的批准
- 所有 CI 检查必须通过
- 解决所有审查意见

### 合并

- 使用 Squash and Merge
- 确保提交信息符合规范

---

## 问题反馈

### 获取帮助

- **GitHub Discussions**: 提问和讨论
- **Issue**: 报告 Bug 或功能建议
- **邮件**: dev@chips-ecosystem.io

### 响应时间

我们会尽快响应：
- Bug 报告：3 个工作日内
- 功能建议：1 周内
- Pull Request：1 周内

---

## 致谢

感谢所有贡献者的付出！

---

**维护团队**: Chips 生态核心团队  
**最后更新**: 2026-02-02
