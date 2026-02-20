# Monorepo 工程化需求文档

> 基于掘金文章《说来惭愧，入职的第一个需求居然花了我两多个月？！》梳理的项目需求与实施指南

---

## 一、需求背景

### 1.1 问题描述

在一个 **Monorepo** 项目中存在以下问题：

| 问题 | 描述 |
|------|------|
| **Alias 冗长** | SDK 子项目通过 alias 被其他项目引用时，路径非常冗长，难以维护 |
| **无法模块化** | 长路径的 alias 配置无法简洁地拆分和复用 |
| **构建速度慢** | 当前构建工具（Rollup）打包速度不理想 |

### 1.2 核心需求

1. **Alias 模块化**：将冗长的 alias 配置简化为短路径
2. **更换引用方式**：从复杂的 alias 改为 `package.json exports` + `tsconfig references`
3. **更换 SDK 构建工具**：从 Rollup 迁移到更快的构建方案（如 tsup/Gulp/自定义工具）

**本 demo 的对应实现**：详见 [PROJECT_STATUS.md](./PROJECT_STATUS.md)。SDK 默认使用 **Babel** 构建（快），`build:rollup` 用于与 Babel 对比构建速度。

---

## 二、Alias 模块化示例

### 2.1 改造前

```javascript
// 冗长的 alias 配置
const aliasBefore = {
  "@monorepo/sdk/src/modules/ui/component-a/*": "./src/module/ui/component-a/*",
  "@monorepo/sdk/src/modules/ui/component-b/*": "./src/module/ui/component-b/*",
};
```

### 2.2 改造后

```javascript
// 简洁的模块化 alias
const aliasAfter = {
  "$component-a/*": "./src/module/ui/component-a/*",
  "$component-b/*": "./src/module/ui/component-b/*",
};
```

### 2.3 使用效果

```javascript
// 引用方代码中
import { Button } from '$component-a';  // 简洁！
// 而非
import { Button } from '@monorepo/sdk/src/modules/ui/component-a';  // 冗长
```

---

## 三、技术方案概览

### 3.1 涉及配置与工具

| 配置/工具 | 作用 |
|----------|------|
| `package.json` → `exports` | 定义包的导出路径，支持 import/require 条件导出 |
| `tsconfig.json` → `paths` | 定义 TypeScript 路径别名，供编译器和 IDE 使用 |
| `tsconfig.json` → `references` | 定义项目间引用关系，支持增量编译和类型检查 |
| Webpack Plugin | 解析 SDK 的 tsconfig paths，动态注册到主项目的 alias 中 |

### 3.2 整体流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         Monorepo 结构                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   packages/sdk/                    packages/app/                  │
│   ├── package.json (exports)       ├── package.json               │
│   ├── tsconfig.json (paths)        ├── tsconfig.json              │
│   └── src/                         │   (paths + references)       │
│       └── modules/                 └── src/                       │
│           └── ui/                      └── index.ts               │
│               ├── component-a/             import from '$component-a'
│               └── component-b/             ↓                       │
│                                            Webpack Plugin          │
│                                            读取 sdk/tsconfig       │
│                                            注入 alias              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、具体实施步骤

### 4.1 SDK 包配置

#### Step 1：`packages/sdk/tsconfig.json` - 配置 paths

```json
{
  "compilerOptions": {
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@sdk/*": ["./src/*"],
      "$component-a/*": ["./src/modules/ui/component-a/*"],
      "$component-b/*": ["./src/modules/ui/component-b/*"]
    }
  }
}
```

#### Step 2：`packages/sdk/package.json` - 配置 exports

```json
{
  "name": "@monorepo/sdk",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./component-a": {
      "import": "./src/modules/ui/component-a/index.ts",
      "require": "./dist/modules/ui/component-a/index.js"
    },
    "./component-b": {
      "import": "./src/modules/ui/component-b/index.ts",
      "require": "./dist/modules/ui/component-b/index.js"
    }
  }
}
```

### 4.2 主项目（App）配置

#### Step 1：`packages/app/tsconfig.json` - paths + references

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@sdk/*": ["../sdk/src/*"]
    }
  },
  "references": [
    { "path": "../sdk" }
  ]
}
```

#### Step 2：Webpack 配置 - 使用自定义 Plugin

```javascript
// 手写 Webpack 插件，在 afterResolve 阶段
// 1. 读取 devDependencies 中的 @monorepo/sdk
// 2. 找到 node_modules/@monorepo/sdk/tsconfig.json
// 3. 解析 paths 字段
// 4. 注入到 compiler 的 resolve.alias 中
```

### 4.3 Webpack 插件核心逻辑

```javascript
class TypeScriptAliasPlugin {
  constructor(options) {
    this.rootPath = options.rootPath;
  }

  apply(compiler) {
    compiler.hooks.afterResolve.tapAsync('TypeScriptAliasPlugin', (data, callback) => {
      // 1. 获取 package.json 的 devDependencies
      // 2. 遍历 monorepo 内的包（如 @monorepo/sdk）
      // 3. 读取各包的 tsconfig.json，提取 paths
      // 4. 将 paths 转换为 Webpack resolve.alias 格式
      // 5. 合并到当前 resolver
      callback(null, data);
    });
  }
}
```

---

## 五、需求拆分建议

| 阶段 | 需求 | 预估工作量 |
|------|------|-----------|
| 1 | SDK 包结构搭建 + exports + tsconfig paths | 1–2 天 |
| 2 | 主项目 tsconfig references + paths | 0.5 天 |
| 3 | 手写 Webpack 插件实现 alias 自动注入 | 2–3 天 |
| 4 | SDK 构建工具替换（Rollup → tsup/其他） | 1–2 天 |
| 5 | 联调、构建、start 测试 | 1–2 天 |
| 6 | （可选）主项目构建工具升级 | 视项目而定 |
| 7 | （可选）CI/CD 流水线 + 机器人通知 | 1–2 天 |

---

## 六、验收标准

- [ ] SDK 可通过 `$component-a`、`$component-b` 等短路径被主项目引用
- [ ] 主项目 `npm run build` 成功，产物正常
- [ ] 主项目 `npm run start` 成功，热更新正常
- [ ] TypeScript 类型检查通过
- [ ] Lint fix 能正确识别 SDK 的 alias 路径
