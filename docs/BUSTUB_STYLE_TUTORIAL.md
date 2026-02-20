# Monorepo 工程化项目 · Bustub 风格分步教程

> 参考 CMU Bustub 教学模式：分阶段递进实现、每阶段有明确检测目标、脚本自动验证通过与否

---

## 一、教学理念与结构说明

### 1.1 Bustub 教学模式特点

| 特点 | 说明 |
|------|------|
| **分阶段递进** | 从零到完整项目，拆成多个可独立完成的小阶段 |
| **每阶段可验证** | 每个阶段有明确、可量化的通过标准 |
| **脚本自动检测** | 使用测试脚本自动判断是否通过该节点 |
| **先易后难** | 先搭基础结构，再做复杂逻辑，最后做插件与优化 |

### 1.2 项目节点总览

```
Project 0: Monorepo 基础结构        → 检测：workspace 与依赖安装
Project 1: SDK 包结构与 exports     → 检测：exports 配置与子路径导出
Project 2: SDK tsconfig paths       → 检测：paths 配置与类型解析
Project 3: App 包结构与 Webpack     → 检测：App 构建成功、引用 SDK
Project 4: App tsconfig references  → 检测：references 配置与增量构建
Project 5: TypeScriptAliasPlugin    → 检测：$component-a 短路径可解析
Project 6: SDK 构建工具替换         → 检测：Rollup/tsup 构建产物正确
Project 7: 端到端验收               → 检测：build + start 全流程通过
```

### 1.3 测试脚本使用方式（纯 Shell）

检测脚本为 **Shell（bash）**，位于 `scripts/check.sh` 与 `scripts/check-project-*.sh`。

**要求**：本机已安装 `bash`，且 `pnpm` 在 PATH 中（涉及构建的节点会调用 `pnpm`、`tsc`）。

```bash
# 在项目根目录执行

# 检测单个节点
pnpm test:check 0    # 或: bash scripts/check.sh 0
pnpm test:check 1
# ...

# 检测全部节点
pnpm test:check all  # 或: bash scripts/check.sh all

# 从某节点检测到结束
pnpm test:check 3:all   # 或: bash scripts/check.sh 3:all
```

---

## 二、各项目节点详细说明

---

### Project 0：Monorepo 基础结构

#### 学习目标

- 理解 Monorepo 与 pnpm workspace 的概念
- 能够创建并配置 pnpm workspace
- 能够使用 workspace 协议引用子包

#### 任务清单

1. 创建根目录 `package.json`，包含 `private: true`、`scripts`
2. 创建 `pnpm-workspace.yaml`，声明 `packages: ['packages/*']`
3. 创建 `tsconfig.base.json`，作为共享 TS 配置
4. 创建 `packages/sdk` 目录及 `package.json`（name: `@monorepo/sdk`）
5. 创建 `packages/app` 目录及 `package.json`（name: `@monorepo/app`，devDependencies 包含 `@monorepo/sdk: workspace:*`）
6. 执行 `pnpm install`，确认依赖正确安装

#### 检测目标

| 检测项 | 标准 |
|--------|------|
| P0-1 | 存在 `pnpm-workspace.yaml`，且 `packages` 包含 `packages/*` |
| P0-2 | 根目录存在 `package.json`，且 `private` 为 `true` |
| P0-3 | `packages/sdk/package.json` 存在，且 `name` 为 `@monorepo/sdk` |
| P0-4 | `packages/app/package.json` 存在，且 `devDependencies` 中有 `@monorepo/sdk: workspace:*` |
| P0-5 | 执行 `pnpm install` 成功，且 `pnpm list @monorepo/sdk` 能列出 sdk 包 |
| P0-6 | 根目录存在 `tsconfig.base.json` |

#### 测试脚本设计

- 脚本路径：`scripts/check-project-0.js` 或 `scripts/check.js --project=0`
- 检测逻辑：
  1. 读取 `pnpm-workspace.yaml`，解析 `packages` 字段
  2. 读取根 `package.json`，检查 `private`
  3. 读取 `packages/sdk/package.json`、`packages/app/package.json`，检查 name 与依赖
  4. 执行 `pnpm list @monorepo/sdk -r`，检查返回码与输出
- 通过条件：所有检测项通过

---

### Project 1：SDK 包结构与 exports

#### 学习目标

- 理解 `package.json` 的 `exports` 字段
- 能够配置包的默认导出与子路径导出
- 理解 `import` 与 `require` 条件导出

#### 任务清单

1. 在 `packages/sdk` 下创建 `src/index.ts`、`src/modules/ui/component-a/index.ts`、`src/modules/ui/component-b/index.ts`
2. 在 `packages/sdk/package.json` 中配置 `exports`：
   - `"."` 导出主入口
   - `"./component-a"` 导出 component-a
   - `"./component-b"` 导出 component-b
3. 编写简单导出逻辑（如 `Button`、`Card` 等）

#### 检测目标

| 检测项 | 标准 |
|--------|------|
| P1-1 | `packages/sdk/package.json` 存在 `exports` 字段 |
| P1-2 | `exports["."]` 配置正确（有 import/require/default 之一） |
| P1-3 | `exports["./component-a"]` 存在且指向 `component-a` 目录 |
| P1-4 | `exports["./component-b"]` 存在且指向 `component-b` 目录 |
| P1-5 | `packages/sdk/src/modules/ui/component-a/index.ts` 存在 |
| P1-6 | `packages/sdk/src/modules/ui/component-b/index.ts` 存在 |
| P1-7 | 可通过 `require('@monorepo/sdk/component-a')` 或等价方式解析（在 app 中 import 不报错） |

#### 测试脚本设计

- 脚本路径：`scripts/check-project-1.js`
- 检测逻辑：
  1. 解析 `packages/sdk/package.json` 的 `exports`
  2. 检查 `exports["."]`、`exports["./component-a"]`、`exports["./component-b"]`
  3. 检查对应源文件是否存在
  4. （可选）在临时脚本中 `import '@monorepo/sdk/component-a'`，执行不报错

---

### Project 2：SDK tsconfig paths

#### 学习目标

- 理解 `tsconfig.json` 的 `paths` 与 `baseUrl`
- 能够为 SDK 内部配置路径别名（如 `$component-a/*`）
- 理解 `composite` 与项目引用

#### 任务清单

1. 创建 `packages/sdk/tsconfig.json`，继承 `../../tsconfig.base.json`
2. 配置 `compilerOptions.paths`：
   - `$component-a/*` → `./src/modules/ui/component-a/*`
   - `$component-b/*` → `./src/modules/ui/component-b/*`
   - `@sdk/*` → `./src/*`
3. 配置 `compilerOptions.composite: true`
4. 在 SDK 内部使用 `$component-a` 或 `@sdk` 引用，验证可编译

#### 检测目标

| 检测项 | 标准 |
|--------|------|
| P2-1 | `packages/sdk/tsconfig.json` 存在 |
| P2-2 | `compilerOptions.paths` 包含 `$component-a/*` |
| P2-3 | `compilerOptions.paths` 包含 `$component-b/*` |
| P2-4 | `compilerOptions.composite` 为 `true` |
| P2-5 | 在 SDK 任意文件中使用 `$component-a` 或 `@sdk` 引用，`tsc --noEmit -p packages/sdk` 通过 |

#### 测试脚本设计

- 脚本路径：`scripts/check-project-2.js`
- 检测逻辑：
  1. 解析 `packages/sdk/tsconfig.json` 的 `compilerOptions.paths`、`composite`
  2. 执行 `pnpm exec tsc --noEmit -p packages/sdk`，检查退出码为 0

---

### Project 3：App 包结构与 Webpack

#### 学习目标

- 能够使用 Webpack 构建 TypeScript 项目
- 能够通过 `@monorepo/sdk` 或子路径引用 SDK
- 理解 ts-loader 与 tsconfig 的配合

#### 任务清单

1. 创建 `packages/app/src/index.ts`
2. 在 `index.ts` 中 `import { Button, Card } from '@monorepo/sdk'` 或使用子路径
3. 配置 `packages/app/webpack.config.js`：entry、output、resolve、ts-loader
4. 配置 `packages/app/package.json`：devDependencies 含 webpack、webpack-cli、ts-loader、typescript
5. 执行 `pnpm --filter @monorepo/app run build` 成功

#### 检测目标

| 检测项 | 标准 |
|--------|------|
| P3-1 | `packages/app/webpack.config.js` 存在 |
| P3-2 | `packages/app/src/index.ts` 存在，且包含对 `@monorepo/sdk` 的 import |
| P3-3 | `packages/app/package.json` 的 scripts 包含 `build` |
| P3-4 | 执行 `pnpm --filter @monorepo/app run build` 退出码为 0 |
| P3-5 | `packages/app/dist/main.js` 或等价产物存在 |
| P3-6 | 构建产物中能搜索到 Button/Card 相关代码（或运行时正确输出） |

#### 测试脚本设计

- 脚本路径：`scripts/check-project-3.js`
- 检测逻辑：
  1. 检查 webpack.config.js、src/index.ts、package.json
  2. 执行 `pnpm --filter @monorepo/app run build`
  3. 检查 dist 目录下是否有 main.js 等产物

---

### Project 4：App tsconfig references

#### 学习目标

- 理解 `tsconfig.json` 的 `references` 字段
- 能够配置主项目对 SDK 的项目引用
- 理解 `composite` 与增量编译

#### 任务清单

1. 在 `packages/app/tsconfig.json` 中配置 `references: [{ path: "../sdk" }]`
2. 配置 `compilerOptions.paths`：`@/*`、`@sdk/*` 指向正确路径
3. 执行 `tsc -b` 或 `tsc --build` 能成功构建（若有 emit）
4. IDE 能正确识别 SDK 类型（可选，脚本难以检测）

#### 检测目标

| 检测项 | 标准 |
|--------|------|
| P4-1 | `packages/app/tsconfig.json` 存在 `references` 字段 |
| P4-2 | `references` 包含 `{ "path": "../sdk" }` |
| P4-3 | `compilerOptions.paths` 包含 `@/*` 或 `@sdk/*` |
| P4-4 | 执行 `pnpm exec tsc -b -p packages/app` 退出码为 0（或 project references 配置正确） |

#### 测试脚本设计

- 脚本路径：`scripts/check-project-4.js`
- 检测逻辑：
  1. 解析 `packages/app/tsconfig.json` 的 `references`、`paths`
  2. 执行 `pnpm exec tsc -b -p packages/app`（若 app 配置了 composite），或 `tsc --noEmit -p packages/app`

---

### Project 5：TypeScriptAliasPlugin

#### 学习目标

- 理解 Webpack 插件的基本结构与 `apply(compiler)`
- 理解 `compiler.hooks.afterResolve` 或 `resolve` 相关 hook
- 能够读取依赖包的 `tsconfig.json` 并解析 `paths`
- 能够将 `paths` 转换为 Webpack `resolve.alias` 并注入

#### 任务清单

1. 创建 `plugins/typescript-alias-plugin/index.js`（或 `packages/app` 内的插件）
2. 实现 `TypeScriptAliasPlugin` 类，包含 `constructor(options)` 和 `apply(compiler)`
3. 在插件中：读取 `@monorepo/sdk` 的 `tsconfig.json`，提取 `paths`
4. 将 `paths` 转换为 Webpack `resolve.alias` 格式（如 `$component-a` → 绝对路径）
5. 在 `packages/app/webpack.config.js` 中注册该插件
6. 修改 `packages/app/src/index.ts`，使用 `import { Button } from '$component-a'` 等短路径
7. 执行 `pnpm --filter @monorepo/app run build` 成功

#### 检测目标

| 检测项 | 标准 |
|--------|------|
| P5-1 | 存在 `plugins/typescript-alias-plugin/index.js` 或等价插件文件 |
| P5-2 | 插件类导出为 `TypeScriptAliasPlugin` 或等价名称 |
| P5-3 | `webpack.config.js` 中使用了该插件 |
| P5-4 | `packages/app/src/index.ts` 包含 `import ... from '$component-a'` 或 `'$component-b'` |
| P5-5 | 执行 `pnpm --filter @monorepo/app run build` 退出码为 0 |
| P5-6 | 构建产物能正确输出（如 console 打印 Button/Card 结果） |

#### 测试脚本设计

- 脚本路径：`scripts/check-project-5.js`
- 检测逻辑：
  1. 检查插件文件存在、webpack 配置中注册了插件
  2. 检查 `src/index.ts` 是否包含 `$component-a` 或 `$component-b` 的 import
  3. 执行 build，检查退出码
  4. （可选）执行构建产物，检查输出是否包含预期内容

---

### Project 6：SDK 构建工具替换

#### 学习目标

- 能够使用 Rollup 或 tsup 构建 SDK
- 理解 ESM/CommonJS 双格式输出
- 理解 `exports` 与构建产物的对应关系

#### 任务清单

1. 为 `packages/sdk` 配置 Rollup 或 tsup
2. 配置输出：`dist/index.js`、`dist/index.d.ts`，以及 component-a、component-b 的产物
3. 更新 `packages/sdk/package.json` 的 `exports`，使 `require` 指向 `dist/` 下的产物
4. 执行 `pnpm --filter @monorepo/sdk run build` 成功
5. `packages/app` 的 build 仍然成功（引用 dist 或源码均可）

#### 检测目标

| 检测项 | 标准 |
|--------|------|
| P6-1 | `packages/sdk` 的 build 脚本非简单 echo，能产生实际构建 |
| P6-2 | 执行 `pnpm --filter @monorepo/sdk run build` 退出码为 0 |
| P6-3 | `packages/sdk/dist` 下存在 `index.js` 或等价产物 |
| P6-4 | 执行 `pnpm --filter @monorepo/app run build` 仍成功 |

#### 测试脚本设计

- 脚本路径：`scripts/check-project-6.js`
- 检测逻辑：
  1. 检查 sdk 的 build 脚本内容（非 echo）
  2. 执行 sdk build，检查 dist 目录
  3. 执行 app build，检查退出码

---

### Project 7：端到端验收

#### 学习目标

- 确保整体构建链路正确
- 确保开发服务器可正常启动
- 综合验收所有功能

#### 任务清单

1. 执行 `pnpm -r run build` 成功
2. 执行 `pnpm --filter @monorepo/app run start`，开发服务器能在 3–5 秒内启动
3. 在浏览器访问对应端口，页面或控制台无致命错误
4. （可选）热更新正常

#### 检测目标

| 检测项 | 标准 |
|--------|------|
| P7-1 | `pnpm -r run build` 退出码为 0 |
| P7-2 | `pnpm --filter @monorepo/app run start` 能启动，且在 10 秒内返回监听端口（可超时检测） |
| P7-3 | 构建产物无语法错误（可通过 Node 执行 main.js 检查） |

#### 测试脚本设计

- 脚本路径：`scripts/check-project-7.js`
- 检测逻辑：
  1. 执行 `pnpm -r run build`
  2. 后台启动 dev server，等待数秒，检测端口或进程，然后终止
  3. 使用 Node 执行 `packages/app/dist/main.js`，检查无异常退出

---

## 三、测试脚本架构设计

### 3.1 目录结构（Shell 版）

```
webpack-demo/
├── scripts/
│   ├── check.sh              # 主入口：解析参数，调用对应 check-project-N.sh
│   ├── check-project-0.sh
│   ├── check-project-1.sh
│   ├── ...
│   ├── check-project-7.sh
│   └── lib/
│       ├── utils.sh          # 通用工具（可选）
│       └── reporter.sh       # 输出格式（主入口内联）
```

### 3.2 主入口 check.js 逻辑

```javascript
// 用法: node scripts/check.js [0|1|2|...|7|all|3:all]
// 0-7: 检测单个 Project
// all: 检测 Project 0 到 7
// 3:all: 从 Project 3 开始检测到 7
const project = process.argv[2] || '0';
// 解析 project，调用对应 check-project-N.js
// 汇总结果，process.exit(通过 ? 0 : 1)
```

### 3.3 单个检测脚本规范

- 每个 `check-project-N.js` 导出 `run()` 或作为可执行脚本
- 返回 `{ passed: boolean, details: string[] }`
- 使用 `lib/utils.js` 读取文件、执行命令
- 使用 `lib/reporter.js` 输出格式化的通过/失败信息

### 3.4 根 package.json scripts

```json
{
  "scripts": {
    "test:check": "bash scripts/check.sh",
    "test:check:0": "bash scripts/check.sh 0",
    "test:check:all": "bash scripts/check.sh all"
  }
}
```

用法示例：

```bash
pnpm test:check 0
pnpm test:check all
pnpm test:check 3:all
```

---

## 四、学习节奏建议

| 阶段 | 建议用时 | 说明 |
|------|----------|------|
| Project 0 | 0.5 天 | 若已有基础结构，可快速过 |
| Project 1 | 0.5–1 天 | 重点理解 exports |
| Project 2 | 0.5 天 | 理解 paths、composite |
| Project 3 | 1 天 | Webpack + ts-loader 配置 |
| Project 4 | 0.5 天 | references 配置 |
| Project 5 | 2–3 天 | 插件开发，难度最高 |
| Project 6 | 1–2 天 | Rollup/tsup 选型与配置 |
| Project 7 | 0.5 天 | 联调与验收 |

---

## 五、文档与脚本落地顺序

1. 先输出本文档（`BUSTUB_STYLE_TUTORIAL.md`）作为总纲
2. 实现 `scripts/check.js` 与 `scripts/lib/utils.js`、`reporter.js`
3. 按 Project 0 → 7 顺序实现各 `check-project-N.js`
4. 在根 `package.json` 中增加 `test:check` 等脚本
5. 后续可根据实际项目结构调整检测逻辑与通过标准

---

## 六、快速自检清单

完成每个 Project 后，可先用以下清单自检，再跑脚本：

- [ ] Project 0：`pnpm install` 成功，`pnpm list @monorepo/sdk` 有输出
- [ ] Project 1：`packages/sdk/package.json` 有 exports，子路径文件存在
- [ ] Project 2：`packages/sdk/tsconfig.json` 有 paths，`tsc -p packages/sdk --noEmit` 通过
- [ ] Project 3：`pnpm --filter @monorepo/app run build` 成功，dist 有产物
- [ ] Project 4：`packages/app/tsconfig.json` 有 references，`tsc -b` 或 `--noEmit` 通过
- [ ] Project 5：`import from '$component-a'` 可用，build 成功
- [ ] Project 6：sdk build 产生 dist，app build 仍成功
- [ ] Project 7：`pnpm -r run build` 成功，`pnpm --filter @monorepo/app run start` 可启动
