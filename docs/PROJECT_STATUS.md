# 项目现状梳理

> 对照需求文档，当前 demo 已覆盖内容与「构建速度」解决方案说明

---

## 一、需求对照

| 需求 | 状态 | 说明 |
|------|------|------|
| **Alias 冗长** | ✅ 已解决 | 通过 `$component-a`、`$component-b` 短路径 + TypeScriptAliasPlugin |
| **无法模块化** | ✅ 已解决 | `package.json` exports + `tsconfig` paths/references |
| **构建速度慢（Rollup）** | ✅ 已解决 | SDK 默认使用 **Babel** 构建（快），可选 **Rollup** 作对比 |

---

## 二、「构建速度慢」解决方案

### 2.1 需求原文

- **问题**：当前构建工具（Rollup）打包速度不理想  
- **目标**：更换 SDK 构建工具，从 Rollup 迁移到更快的方案  

### 2.2 当前实现

- **默认构建**：`packages/sdk` 使用 **Babel** 作为默认构建（`pnpm --filter @monorepo/sdk run build`），Babel 转译 TS → JS，再 `tsc --emitDeclarationOnly` 产出 `.d.ts`，满足 project references 与类型。
- **对比 Rollup**：保留 **Rollup** 用于构建速度对比（`pnpm --filter @monorepo/sdk run build:rollup`）：
  - 配置：`packages/sdk/rollup.config.js`
  - 产出：`dist/index.js`（CJS）、`dist/index.mjs`（ESM）

### 2.3 构建方式对比

| 命令 | 工具 | 说明 |
|------|------|------|
| `pnpm --filter @monorepo/sdk run build` | **Babel** + tsc | **默认**，Babel 转译 + 类型声明，用于日常开发与 CI |
| `pnpm --filter @monorepo/sdk run build:rollup` | Rollup | **对比**，用于与 Babel 对比构建速度 |
| `pnpm --filter @monorepo/sdk run build:tsc` | tsc | 可选，仅 tsc 全量编译 |

### 2.4 使用 Webpack

- 主应用（app）已使用 Webpack；SDK 默认 Babel、可选 Rollup 对比，一般库不常用 Webpack 打包。

---

## 三、项目结构速览

```
webpack-demo/
├── packages/
│   ├── sdk/           # 默认 Babel 构建，可选 rollup（build:rollup）对比
│   └── app/           # Webpack + TypeScriptAliasPlugin
├── plugins/
│   └── typescript-alias-plugin/
└── docs/
    ├── REQUIREMENTS.md
    ├── PROJECT_STATUS.md   # 本文件
    └── ...
```

---

## 四、相关文档

- 需求与方案细节：[REQUIREMENTS.md](./REQUIREMENTS.md)
- 分步教程与检测：[BUSTUB_STYLE_TUTORIAL.md](./BUSTUB_STYLE_TUTORIAL.md)
- 学习路线：[LEARNING_PATH.md](./LEARNING_PATH.md)
