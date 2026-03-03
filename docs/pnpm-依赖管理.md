# Pnpm + Monorepo 依赖管理方案

> 基于当前项目架构的依赖管理策略、规范与可选扩展方案

---

## 一、需求背景

团队项目采用 **pnpm + Monorepo**，存在以下依赖管理问题：

| 问题 | 描述 |
|------|------|
| **根与子包依赖混乱** | 根目录与各子项目依赖管理不当，存在大量重叠依赖、无用依赖 |
| **多版本并存** | 经 webpack-bundle-analyzer 等分析，存在同一包多版本问题，需要统一 |
| **Lock 未及时更新** | 合码后 `pnpm-lock.yaml` 常被忽略更新，依赖或 Node 版本不一致时，易导致多人开发冲突（预期通过 CI 约束） |

**目标**：

- 将 **App 的主要依赖** 以及 **SDK 子模块相关依赖** 尽量统一到根目录管理，减少重复安装、便于版本统一。
- **App 若作为 SDK 对外发包**：依赖提升到根后，发包产物中不包含 node_modules，需提供脚本或文档，让使用方知晓并安装所需依赖（或由脚本生成依赖清单）。

---

## 二、当前项目架构

### 2.1 Workspace 定义

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

- **纳入 workspace 的包**：`packages/sdk`、`packages/app`。
- **未纳入**：`plugins/typescript-alias-plugin` 为源码目录，由 app 通过相对路径引用，不参与 workspace 依赖解析。

### 2.2 包依赖关系

```
根 (webpack-demo-monorepo)
 ├── packages/app
 │    └── devDependencies: @monorepo/sdk (workspace:*), cross-env, ts-loader, ts-node, typescript, webpack, webpack-cli, webpack-dev-server
 └── packages/sdk
      └── devDependencies: typescript, rollup, @rollup/plugin-typescript, babel 系列
```

- **App** 通过 `workspace:*` 引用 SDK，构建与开发时由 TypeScriptAliasPlugin 解析短路径。
- **SDK** 无内部 workspace 依赖，仅对外提供 exports 与构建产物。

### 2.3 根目录依赖（当前）

| 依赖 | 用途 |
|------|------|
| `@types/node` | 根目录及插件等 TS 类型 |
| `typescript` | 根目录 tsc（如 `build:plugin`）、各子包可复用版本 |

根目录仅保留**与多包共用或根级脚本**相关的依赖，其余放在对应子包中，避免根 package 膨胀。

### 2.4 引擎约束

```json
"engines": {
  "node": ">=18.0.0",
  "pnpm": ">=8.0.0"
}
```

便于统一开发与 CI 环境，减少因 Node/pnpm 版本差异导致的安装或构建差异。

---

## 三、解决方案

### 3.1 初步方案

采用 **pnpm** 的依赖管理机制：

- **硬链接**：同一版本包在磁盘只存一份，通过硬链接在 `node_modules/.pnpm` 中复用，节省空间并加快安装。
- **符号链接**：各子包 `node_modules` 中通过符号链接指向 `.pnpm` 中的包，实现依赖隔离与提升可控。

在此基础上，通过「依赖分层」「Lock 规范」「可选提升策略」形成完整方案。

### 3.2 详细方案

#### 3.2.1 依赖分层策略

| 层级 | 放置位置 | 说明 |
|------|----------|------|
| **跨包共用** | 根 `devDependencies` | 如 TypeScript、@types/node 等各包或根脚本都会用到的版本，便于统一版本、减少重复 |
| **包私有** | 各子包 `dependencies` / `devDependencies` | 仅该包使用的构建工具、运行时依赖（如 app 的 webpack、sdk 的 rollup/babel） |

**当前实践**：根目录只保留少量共用依赖；app 与 sdk 各自声明构建与开发依赖，避免根目录堆积未用依赖。

#### 3.2.2 多版本统一

- 使用 **pnpm.overrides**（根 `package.json`）统一指定某包的版本，避免同一依赖多版本并存：

```json
{
  "pnpm": {
    "overrides": {
      "typescript": "^5.7.0"
    }
  }
}
```

- 仅在确实需要统一版本时使用；过度使用可能影响子包兼容性。
- 可通过 `pnpm why <pkg>`、构建分析工具（如 webpack-bundle-analyzer）排查多版本后再决定是否加入 overrides。

#### 3.2.3 pnpm-lock.yaml 与 CI

| 项 | 说明 |
|----|------|
| **提交 lock** | `pnpm-lock.yaml` 必须纳入版本控制，合码时一起提交，保证所有人安装结果一致 |
| **CI 安装** | CI 中执行 `pnpm install --frozen-lockfile`（或 `ci`），禁止修改 lock，若依赖变更未同步 lock 则失败 |
| **Node/pnpm 版本** | 使用 `engines` 或 CI 中指定 Node/pnpm 版本，与本地约定一致 |

这样可避免「合码后 lock 未更新」导致的依赖冲突。

#### 3.2.4 依赖提升与「全部提到根」的取舍

- pnpm 默认**不会**把子包依赖提升到根 `node_modules`，而是按依赖图安装在 `.pnpm` 并链接到各包，**已能减少重复磁盘占用**。
- 若希望「更多依赖在根声明、子包少写」：
  - 可将**公共构建/类型依赖**（如 typescript、部分 @types/*）只在根声明，子包不重复写；
  - 子包仍可正常使用（pnpm 会从根 hoist 到子包可访问位置，取决于配置）。
- **当前项目**：采用「根只放少量共用依赖，子包各自声明」的折中方式，结构清晰、职责明确；若后续要更强「提升到根」，再在根增加依赖并视情况用 `pnpm.overrides` 统一版本。

#### 3.2.5 App 作为 SDK 发包时的依赖清单

若 App 构建产物会作为 SDK 对外提供，而依赖又多在根或 app 的 devDependencies 中，则：

- 发包产物中通常**不包含** node_modules，使用方需自行安装依赖。
- 可提供以下一种或多种方式：
  - **脚本**：根据 app 的构建入口与实际用到的包，生成 `peerDependencies` 或 `dependencies` 清单，或输出「使用方需执行的 `pnpm add xxx`」说明；
  - **文档**：在 README 或发布说明中列出「使用前请安装：xxx」；
  - **构建时嵌入**：若为私有场景，可在打包时把依赖清单写入产物目录的 `package.json`，供使用方 `pnpm install`。

具体实现可根据「App 是作为可运行包还是纯库」再细化，本方案仅做方向性约定。

---

## 四、与本项目一致的配置要点

### 4.1 根 package.json

- **scripts**：通过 `pnpm -r run build`、`pnpm --filter @monorepo/<包名> run <脚本>` 驱动各子包；根提供 `build`、`build:sdk`、`build:app`、`dev`、`build:plugin`、`test:check:*` 等。
- **devDependencies**：仅放跨包/根脚本共用依赖（当前为 `@types/node`、`typescript`）。
- **engines**：约定 Node、pnpm 最低版本。

### 4.2 子包 package.json

- **app**：`devDependencies` 中 `@monorepo/sdk: "workspace:*"`，其余为构建与开发工具（webpack、ts-loader、ts-node、cross-env 等）。
- **sdk**：`main`、`types`、`exports` 指向 dist；`devDependencies` 为构建用（typescript、rollup、babel 等）。

### 4.3 常用命令

| 场景 | 命令 |
|------|------|
| 安装全部依赖 | `pnpm install` |
| 递归构建 | `pnpm -r run build` 或 `pnpm run build` |
| 仅构建 SDK | `pnpm --filter @monorepo/sdk run build` |
| 仅构建 App | `pnpm --filter @monorepo/app run build` |
| 开发 | `pnpm run dev` 或 `pnpm --filter @monorepo/app run start` |
| 插件构建 | `pnpm run build:plugin` |
| 检测 | `pnpm test:check all` 或 `pnpm test:check 5` 等 |

---

## 五、CI 与规范建议

1. **必须提交** `pnpm-lock.yaml`，合码前确保本地 `pnpm install` 后 lock 已更新。
2. **CI 安装**使用 `pnpm install --frozen-lockfile`（或 `pnpm ci`），失败时要求开发者本地更新依赖并提交 lock。
3. **可选**：CI 中校验 `engines`（如通过 `pnpm exec node -e "process.exit(require('./package.json').engines.node ? 0 : 1)"` 或第三方工具），避免 Node/pnpm 版本与约定不符。
4. **多版本排查**：定期或 MR 内用 `pnpm why <包名>`、构建分析工具检查重复版本，必要时通过 `pnpm.overrides` 收敛版本。

---
