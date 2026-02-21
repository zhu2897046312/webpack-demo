# Monorepo 工程化技术方案设计文档

**文档类型**：技术实现方案（设计文档）  
**适用项目**：webpack-demo（Monorepo 多包 + SDK 子包 + 主应用 + 自定义 Webpack 插件）  
**参考需求**：基于《说来惭愧，入职的第一个需求居然花了我两多个月？！》中的工程化场景

---

## 一、项目背景与目标

### 1.1 业务/技术背景

在 Monorepo 场景下，主应用（App）需要引用内部 SDK 包中的 UI 模块。若仅通过「长路径 + 手写 alias」方式引用，会带来：

- **路径冗长**：如 `@monorepo/sdk/src/modules/ui/component-a` 难以维护、易出错。
- **配置难以模块化**：各子包路径分散在主项目 Webpack/TS 配置中，无法与 SDK 的 `package.json`、`tsconfig` 统一管理。
- **构建效率**：若 SDK 采用单一重型构建工具（如仅用 Rollup），在开发与 CI 中构建耗时偏长。

### 1.2 目标陈述

| 目标 | 说明 |
|------|------|
| **Alias 模块化** | 将冗长 alias 收敛为短路径（如 `$component-a`、`$component-b`），且由 SDK 侧统一定义、主应用自动复用。 |
| **引用方式标准化** | 采用 `package.json` 的 `exports` + TypeScript 的 `paths` / `references`，替代散落的硬编码路径。 |
| **构建速度可控** | SDK 默认使用较快构建方案（本方案采用 Babel），保留 Rollup 作为对比基线，便于评估与复现「构建慢」问题。 |

### 1.3 范围与边界

- **范围内**：Monorepo 结构、SDK 包导出与构建、主应用 Webpack 构建、短路径解析、类型与增量构建、自动化检测脚本。
- **范围外**：发布 npm、CI/CD 流水线、多环境部署、具体业务组件实现（仅以 Button/Card 示例说明）。

---

## 二、总体架构

### 2.1 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Monorepo 根 (webpack-demo)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  packages/sdk                     packages/app                           │
│  ├── package.json (exports)       ├── package.json (依赖 sdk)            │
│  ├── tsconfig.json (paths)        ├── tsconfig.json (references + paths) │
│  ├── babel.config.js              ├── webpack.config.js                  │
│  ├── src/                         │   └── 使用 TypeScriptAliasPlugin    │
│  │   └── modules/ui/              └── src/                               │
│  │       ├── component-a/             └── index.ts                      │
│  │       └── component-b/                 import from '$component-a'    │
│  └── dist/ (build 产物)                    │                             │
│         ↑                                 │                             │
│         │  Babel + tsc(declarationOnly)    │  Plugin 读取 sdk/tsconfig    │
│         │  或 build:rollup 对比           │  注入 resolve.alias         │
├─────────────────────────────────────────────────────────────────────────┤
│  plugins/typescript-alias-plugin                                         │
│  └── 从 sdk/tsconfig paths 生成 Webpack alias，供 app 解析短路径          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 包依赖关系

- **packages/app**：`devDependencies` 依赖 `@monorepo/sdk: workspace:*`，构建与开发时通过 Webpack 的 alias 解析 `$component-a` / `$component-b` 到 SDK 源码或构建产物。
- **packages/sdk**：无内部业务包依赖，仅对外提供入口与子路径（exports），并产出 `dist/` 与类型声明供 references 与运行时使用。

### 2.3 数据流简述

1. **SDK 侧**：`tsconfig.json` 的 `paths` 定义 `$component-a`、`$component-b` 等短路径 → `package.json` 的 `exports` 声明对外子路径 → 构建（Babel/ Rollup）产出 `dist/` 与 `.d.ts`。
2. **主应用侧**：Webpack 使用 **TypeScriptAliasPlugin**，在构建前读取 `packages/sdk/tsconfig.json` 的 `paths`，转换为 `resolve.alias`，使 `import from '$component-a'` 等解析到 SDK 对应目录。
3. **类型与增量**：App 的 `tsconfig` 通过 `references` 引用 SDK，类型检查与增量构建由 TypeScript 基于 SDK 的 `dist/*.d.ts` 完成。

---

## 三、技术选型与依据

### 3.1 包管理与 Monorepo

| 选型 | 说明 |
|------|------|
| **pnpm workspace** | 依赖隔离与提升、`workspace:*` 协议引用子包，与当前工程一致。 |
| **根 tsconfig.base.json** | 公共编译选项，各子包通过 `extends` 复用，减少重复。 |

### 3.2 SDK 构建

| 选型 | 说明 |
|------|------|
| **默认：Babel + tsc --emitDeclarationOnly** | Babel 负责 TS→JS 转译，tsc 仅产出类型声明；满足「构建速度」需求，且与常见前端栈一致。 |
| **可选：Rollup** | 保留 `build:rollup`，用于与默认方案对比构建时间、复现「慢」的基线。 |
| **可选：tsc 全量** | `build:tsc` 供需纯 tsc 产出或与部分工具链兼容时使用。 |

### 3.3 主应用构建

| 选型 | 说明 |
|------|------|
| **Webpack 5** | 与需求中的「主项目 Webpack」一致；配合 ts-loader、devServer 支持开发与生产构建。 |
| **自定义 TypeScriptAliasPlugin** | 将 SDK 的 tsconfig `paths` 转为 Webpack `resolve.alias`，实现短路径由 SDK 定义、主应用自动复用，避免主应用手写冗长 alias。 |

### 3.4 验证与质量

| 选型 | 说明 |
|------|------|
| **分阶段检测脚本** | Bash（check-project-*.sh）+ Node（check-project-*.js），按 Project 0～7 分步验证，与 Bustub 风格教程一致。 |
| **通过标准** | 每阶段有明确检测项（如 P3-2 引用 SDK、P5 短路径可解析、P6 构建产物与构建时间），脚本通过即视为该节点达标。 |

---

## 四、模块设计

### 4.1 packages/sdk（SDK 包）

**职责**：对外提供 UI 模块（示例：component-a、component-b）的源码与构建产物，并定义短路径与导出契约。

| 内容 | 设计要点 |
|------|----------|
| **package.json** | `name: "@monorepo/sdk"`；`exports` 声明 `.`、`./component-a`、`./component-b` 的 import/require/default；`main`/`types` 指向 `dist/`；scripts：`build`（Babel+tsc 类型）、`build:rollup`、`build:tsc`。 |
| **tsconfig.json** | `composite: true` 支持 project references；`baseUrl` + `paths` 定义 `$component-a/*`、`$component-b/*` 等，供 IDE 与 Plugin 读取。 |
| **构建** | 默认 `build`：Babel 将 `src/` 转译到 `dist/`，再 `tsc --emitDeclarationOnly` 生成 `.d.ts`；目录结构与 `src/` 一致，满足 `exports` 中 require 指向的路径。 |

### 4.2 packages/app（主应用）

**职责**：消费 SDK，通过短路径引用组件，并完成 Webpack 构建与开发服务。

| 内容 | 设计要点 |
|------|----------|
| **package.json** | 依赖 `@monorepo/sdk: workspace:*`；scripts：`build`（webpack）、`start`（devServer）。 |
| **tsconfig.json** | `references: [{ path: "../sdk" }]`；`paths` 可与 Plugin 注入的 alias 对齐（如需要可配置 `@/*` 等）；构建时可由 ts-loader 使用单独 config（如 tsconfig.webpack.json）做 transpileOnly。 |
| **webpack.config.js** | entry 为 `src/index.ts`；resolve.alias 由 **TypeScriptAliasPlugin.getAlias()** 提供；plugins 中注册 **TypeScriptAliasPlugin**；module 使用 ts-loader；devServer 配置静态目录与端口。 |

### 4.3 plugins/typescript-alias-plugin（自定义 Webpack 插件）

**职责**：从 SDK 的 `tsconfig.json` 读取 `paths`，转换为 Webpack `resolve.alias`，使主应用无需手写 SDK 子路径。

| 内容 | 设计要点 |
|------|----------|
| **输入** | 构造函数接收 `rootPath`（Monorepo 根目录）；默认从 `rootPath/packages/sdk/tsconfig.json` 读取配置。 |
| **逻辑** | 解析 `compilerOptions.baseUrl` 与 `compilerOptions.paths`；将每个 path key（如 `$component-a/*`）转为无通配符的别名 key，将 value 转为基于 baseUrl 的绝对路径；在 `apply(compiler)` 中合并到 `compiler.options.resolve.alias`。 |
| **对外 API** | `TypeScriptAliasPlugin` 类（apply）；静态方法 `getAlias(options)` 便于在 webpack 配置中同步获取 alias 对象（用于 resolve.alias 预填充）。 |

---

## 五、核心流程与数据流

### 5.1 短路径解析流程（开发/构建）

1. App 源码中写 `import { Button } from '$component-a'`。
2. Webpack 解析模块时，resolve 阶段使用 `resolve.alias`；TypeScriptAliasPlugin 已把 `$component-a` 指向 SDK 内 `component-a` 的绝对路径（来自 sdk/tsconfig paths）。
3. Webpack 加载对应 TS 文件，经 ts-loader 转译，最终打包进 app 的 bundle。

### 5.2 类型与 project references

1. SDK 构建后产出 `dist/**/*.js` 与 `dist/**/*.d.ts`。
2. App 的 tsconfig 通过 `references` 引用 SDK 包；TypeScript 使用 SDK 的 `.d.ts` 做类型检查与增量构建。
3. 若 App 使用 tsconfig.webpack.json 且 `transpileOnly: true`，类型检查可单独通过 `tsc -b` 或 IDE 完成。

### 5.3 SDK 构建流程（默认）

1. 执行 `pnpm --filter @monorepo/sdk run build`。
2. Babel 读取 `babel.config.js`（preset-env、preset-typescript），将 `src/**/*.ts` 输出到 `dist/`，保持目录结构。
3. 执行 `tsc --emitDeclarationOnly`，仅生成 `.d.ts` 到 `dist/`，不重复产出 JS。
4. 产物满足 `exports` 中 `require` 与 `default` 指向的路径，以及 App 的 project references。

---

## 六、构建与发布策略

### 6.1 SDK 构建方式

| 命令 | 用途 | 说明 |
|------|------|------|
| `pnpm --filter @monorepo/sdk run build` | 默认 | Babel 转译 + tsc 类型声明，兼顾速度与类型。 |
| `pnpm --filter @monorepo/sdk run build:rollup` | 对比 | Rollup 打包，用于与默认方案对比构建时间。 |
| `pnpm --filter @monorepo/sdk run build:tsc` | 可选 | 仅 tsc 全量编译。 |

### 6.2 主应用构建与开发

- **构建**：`pnpm --filter @monorepo/app run build`，依赖 SDK 的 `dist/` 或通过 alias 解析的源码；建议先执行 SDK 的 `build`（或由根 workspace 脚本按序执行）。
- **开发**：`pnpm --filter @monorepo/app run start`，devServer 使用同一套 alias 与 ts-loader，支持热更新。

### 6.3 全量构建顺序

推荐顺序：先构建 SDK（产出 dist + 类型），再构建 App。例如根目录 scripts：`pnpm --filter @monorepo/sdk run build && pnpm --filter @monorepo/app run build`。

---

## 七、验证与质量保障

### 7.1 分阶段检测（Project 0～7）

- **Project 0**：Monorepo 与 workspace、依赖安装。
- **Project 1**：SDK 包结构与 exports、子路径导出。
- **Project 2**：SDK tsconfig paths 与类型解析。
- **Project 3**：App 包结构与 Webpack、引用 SDK（直接 `@monorepo/sdk` 或短路径 `$component-a`/`$component-b`）、构建成功、产物含 Button/Card。
- **Project 4**：App tsconfig references 与增量构建。
- **Project 5**：TypeScriptAliasPlugin 使 `$component-a`/`$component-b` 可解析。
- **Project 6**：SDK 构建产物正确（Babel/Rollup）、默认构建在限定时间内完成（构建速度）。
- **Project 7**：端到端 build + start 全流程。

### 7.2 检测实现方式

- 脚本：`scripts/check-project-*.sh`（Bash）、`scripts/check-project-*.js`（Node）；入口 `scripts/check.sh` 支持按节点号或区间执行。
- 根 package.json：`pnpm test:check 0`～`7`、`pnpm test:check all`、`pnpm test:check 3:all` 等。

### 7.3 通过标准（摘要）

- 各节点对应文档见 `docs/BUSTUB_STYLE_TUTORIAL.md`；每项检测有明确 Px-y 标准（如 P3-2 引用 SDK、P6-5 构建时间）。全部检测项通过即该节点通过。

---

## 八、风险与后续扩展

### 8.1 风险与缓解

| 风险 | 缓解 |
|------|------|
| SDK 仅 Babel 转译、不做类型擦除外的复杂转换 | 本方案定位为库的快速构建；若有高级需求（如 tree-shaking 单入口 bundle）可保留或选用 Rollup/tsup。 |
| Plugin 依赖 sdk 路径与 tsconfig 结构 | 约定 `packages/sdk/tsconfig.json` 与 paths 格式；若调整目录需同步更新 Plugin 或通过配置注入路径。 |
| 多包时 Plugin 需读取多个 tsconfig | 当前实现针对单 SDK；扩展时可遍历 workspace 依赖，合并多个包的 paths 生成 alias。 |

### 8.2 后续扩展建议

- **CI**：在流水线中按序执行 `sdk build` → `app build`，并跑 `pnpm test:check all`（或按需跑部分节点）。
- **Lint/格式化**：ESLint/Prettier 对 `$component-a` 等路径的解析，需保证与 tsconfig paths 或 ESLint 的 import resolver 一致。
- **发布**：若 SDK 需发布 npm，可增加 version、files、publishConfig 等，并保证 `exports` 与构建产物一致。

---

## 附录

### A. 文档与脚本索引

| 文档/脚本 | 说明 |
|-----------|------|
| docs/REQUIREMENTS.md | 需求与实施步骤概要 |
| docs/PROJECT_STATUS.md | 当前实现与构建方式对照 |
| docs/PROJECT_STRUCTURE.md | 目录结构与配置说明 |
| docs/BUSTUB_STYLE_TUTORIAL.md | 分阶段教程与检测项详解 |
| docs/TECHNICAL_DESIGN.md | 本技术方案设计文档 |
| scripts/check.sh、check-project-*.sh/.js | 分节点自动检测 |

### B. 关键配置示例（摘要）

- **SDK exports**（package.json）：`"."`、`"./component-a"`、`"./component-b"` 分别映射 import/require 到 `src/` 或 `dist/`。
- **SDK paths**（tsconfig.json）：`"$component-a/*": ["./src/modules/ui/component-a/*"]` 等。
- **App webpack**：`resolve.alias = TypeScriptAliasPlugin.getAlias({ rootPath: monorepoRoot })`，并 `plugins: [new TypeScriptAliasPlugin({ rootPath: monorepoRoot })]`。

### C. 参考文献

- 掘金文章：《说来惭愧，入职的第一个需求居然花了我两多个月？！》（Monorepo 工程化需求场景）
- Node/TypeScript：package.json `exports`、tsconfig `paths`/`references`
- Webpack：resolve.alias、自定义 Plugin 的 apply 与 resolve 阶段
