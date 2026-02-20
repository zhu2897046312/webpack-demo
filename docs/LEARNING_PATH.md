# 学习路线与前置知识

> 基于需求项目，你已掌握 Webpack，还需补充的知识体系

---

## 一、你已掌握 ✓

- **Webpack**：配置、打包流程、基本概念

---

## 二、需要边做边学的内容

### 2.1 优先级 P0：必须掌握

| 知识领域 | 学习目的 | 推荐学习顺序 | 参考链接 |
|---------|---------|--------------|----------|
| **package.json exports** | 定义包的导出路径，实现 `import '@monorepo/sdk/component-a'` | 第 1 天 | [Node.js 官方文档](https://nodejs.org/api/packages.html#package-entry-points) |
| **tsconfig.json paths** | 定义 TypeScript 路径别名（`$component-a/*` 等） | 第 1 天 | TypeScript 官方文档 |
| **tsconfig.json references** | 项目间引用、增量编译、类型共享 | 第 2 天 | [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) |
| **Monorepo 概念** | 多包管理、workspace、依赖关系 | 第 1 天 | pnpm workspace / npm workspace |
| **Webpack 插件开发** | 手写插件，解析 tsconfig 并注入 alias | 第 3–5 天 | [撸一个 webpack 插件](https://juejin.cn/post/6844903713312604173) |

### 2.2 优先级 P1：建议掌握（理解原理）

| 知识领域 | 学习目的 | 何时学 |
|---------|---------|--------|
| **Babel** | 理解编译流程、 preset、插件 | 理解插件原理时 |
| **AST（抽象语法树）** | 理解代码解析、转换、插件机制 | 深入插件时 |
| **tsc（TypeScript Compiler）** | 理解类型检查、transformer | 需要自定义编译时 |
| **Rollup** | 了解 SDK 当前/备选构建方案 | 替换构建工具时 |
| **tsup** | 备选 SDK 构建工具（TypeScript 快速打包） | 选型时 |
| **Gulp** | 备选 SDK 构建方案（流水线式任务） | 选型时 |

### 2.3 优先级 P2：扩展了解

| 知识领域 | 作用 |
|---------|------|
| **CommonJS vs ESM** | 理解 exports 中 import/require 的区别 |
| **模块化原理** | [从构建产物洞悉模块化原理](https://juejin.cn/post/7147365025047379981) |
| **Tapable** | 理解 Webpack 的 hooks 机制 |

---

## 三、学习路线建议

### 3.1 最小可行路径（1–2 周可开工）

```
第 1 周：配置与概念
├── Day 1–2：package.json exports + tsconfig paths
├── Day 3–4：tsconfig references + Monorepo 基础
└── Day 5–7：Webpack Plugin 基础 + Tapable

第 2 周：实现与调试
├── Day 1–3：手写 TypeScriptAliasPlugin
├── Day 4–5：联调、调试、修复
└── Day 6–7：文档整理、总结
```

### 3.2 深入路线（有时间时）

```
Babel → AST → tsc transformer → 插件开发原理 → Rollup/tsup 对比
```

---

## 四、关键知识点速查

### 4.1 package.json exports

```json
{
  "exports": {
    ".": "./src/index.ts",           // 默认导出
    "./component-a": "./src/modules/ui/component-a/index.ts"
  }
}
```

- `"."`：默认导出（`import '@pkg'`）
- `"./xxx"`：子路径导出（`import '@pkg/component-a'`）

### 4.2 tsconfig paths

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "$component-a/*": ["./src/modules/ui/component-a/*"]
    }
  }
}
```

- 编译器与 IDE 都根据 `paths` 解析路径
- Webpack 默认不读 tsconfig，需通过插件或 `tsconfig-paths-webpack-plugin` 对接

### 4.3 tsconfig references

```json
{
  "references": [
    { "path": "../sdk" }
  ]
}
```

- 被引用项目需设置 `"composite": true`
- 用于增量编译、类型共享、构建顺序

### 4.4 Webpack Plugin 要点

- 使用 `compiler.hooks.afterResolve` 在解析阶段插入逻辑
- 读取依赖包目录下的 `tsconfig.json`，解析 `paths`
- 把 `paths` 映射为 `resolve.alias` 并合并到 resolver

---

## 五、常用命令与工具

| 命令/工具 | 用途 |
|----------|------|
| `pnpm install` | 安装依赖（推荐 pnpm workspace） |
| `pnpm -r build` | 递归构建所有包 |
| `tsc -b` | 按 references 增量构建 |
| `tsc --noEmit` | 仅类型检查，不输出文件 |
