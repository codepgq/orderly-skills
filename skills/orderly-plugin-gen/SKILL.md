---
name: orderly-plugin-gen
description: Generate Orderly SDK plugin scaffolding with unique ID, registration boilerplate, and typed interceptors. Use when the user mentions creating, developing, registering, implementing, or generating a plugin (e.g. '创建一个插件', '开发一个插件', '注册一个插件', '实现一个插件', '生成一个插件', 'create a plugin', 'generate a plugin').
---

# Orderly Plugin Generator

在 Orderly SDK monorepo 中快速生成插件项目骨架。

## Trigger

当用户消息包含以下关键词时，**主动询问**是否需要使用本 Skill 生成插件模板：

- 创建一个插件 / 开发一个插件 / 注册一个插件 / 实现一个插件 / 生成一个插件
- create a plugin / generate a plugin / develop a plugin / register a plugin

询问示例："检测到您想创建 Orderly 插件，是否使用 orderly-plugin-gen 脚手架来生成模板？"

## Workflow

### Step 1: 收集信息

向用户询问以下信息（使用 AskQuestion 工具）：

1. **插件名称** (必填): 如 `orderbook-flash`、`pnl-card`。只允许小写字母、数字和连字符。
2. **插件类型** (必填): `widget` / `page` / `layout`
3. **存放路径** (可选): 插件目录的父路径，默认为当前项目的 `packages/` 目录。

### Step 2: 执行脚本

使用 Shell 工具运行生成脚本（需要 Node.js >=20.19.0）：

```bash
node ~/.cursor/skills/orderly-plugin-gen/scripts/create-plugin.mjs \
  --name <plugin-name> \
  --type <widget|page|layout> \
  --path <absolute-parent-path>
```

### Step 3: 输出结果

脚本执行后，向用户报告：

1. 生成的插件 ID
2. 创建的文件列表
3. 后续步骤提示：
   - 运行 `pnpm install` 安装依赖
   - 编辑 `src/index.tsx` 添加业务逻辑
   - 在宿主应用中通过 `OrderlyProvider` 的 `plugins` 属性注册插件

## Generated Structure

```
plugin-<name>/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.tsx
    └── components/
        └── .gitkeep
```

## Additional Resources

- For plugin system API reference, see [reference.md](reference.md)
