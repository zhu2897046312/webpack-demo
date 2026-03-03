# Pnpm + Monorepo 依赖治理方案

> 基于当前项目架构的依赖管理策略、规范与可选扩展方案
> 文档参考：https://juejin.cn/post/7358267939441950720
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

```
webpack-demo/
├── packages/
│   ├── app/           # 主项目入口（Webpack + TypeScriptAliasPlugin）
│   │   └── package.json
│   └── sdk/           # SDK 子模块（默认 Babel 构建，可选 rollup）
│       └── package.json
├── plugins/
│   └── typescript-alias-plugin/
├── scripts/
│   ├── check-redundant-deps.js           # 冗余依赖检查脚本（Node.js 版本）
│   ├── check-redundant-deps.sh           # 冗余依赖检查脚本（Bash 版本）
│   ├── check-overlapping-deps.js         # 与根目录重叠依赖检查（Node.js 版本）
│   ├── check-overlapping-deps.sh          # 与根目录重叠依赖检查（Bash 版本）
│   ├── check-subpackages-overlapping.js  # 子项目间重叠依赖检查（Node.js 版本）
│   ├── check-lockfile.js                 # 锁文件保护检查脚本（Node.js 版本）
│   └── check-lockfile.sh                 # 锁文件保护检查脚本（Bash 版本）
└── package.json
```

### 2.0 项目定位

- **app**：主项目入口，负责应用构建、开发服务器、生产打包
- **sdk**：SDK 子模块，提供可复用的组件和工具，被 app 引用
- **根目录**：管理跨包共用的工具依赖（如 TypeScript、@types/node）

### 2.1 Workspace 定义

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

- **纳入 workspace 的包**：`packages/sdk`、`packages/app`。
- **未纳入**：`plugins/typescript-alias-plugin` 为源码目录，由 app 通过相对路径引用，不参与 workspace 依赖解析。

### 2.2 引擎约束

```json
"engines": {
  "node": ">=18.0.0",
  "pnpm": ">=8.0.0"
}
```

便于统一开发与 CI 环境，减少因 Node/pnpm 版本差异导致的安装或构建差异。

---

## 三、依赖治理方案

### 3.1 冗余依赖治理

#### 3.1.1 检查流程（完整 5 步 + 自动化）

1. **运行脚本**：一次性遍历所有 package.json，执行 `pnpm why` 全量输出
2. **分析报告**：查看"依赖链很短、只有自己声明、没被其他包依赖"的可疑冗余依赖
3. **全局搜索包名**：`grep -r "包名" --include="*.ts" --include="*.tsx" --include="*.js"`
4. **了解包的作用**：判断是否真的需要
5. **删除并测试**：删除后执行 `pnpm install` 并运行/打包测试
6. **验证**：测试覆盖仍不放心 → 再跑单元测试/CI

#### 3.1.2 使用脚本

项目提供了两种版本的脚本（功能相同，选择适合你环境的版本）：

**Node.js 版本（推荐，跨平台）：**
```bash
# 检查冗余依赖
pnpm run dep:check:redundant
# 或
node scripts/check-redundant-deps.js
```

**Bash 版本（Linux/macOS/Git Bash）：**
```bash
# 需要先赋予执行权限（仅首次）
chmod +x scripts/check-redundant-deps.sh

# 执行检查
bash scripts/check-redundant-deps.sh
# 或直接执行（Linux/macOS）
./scripts/check-redundant-deps.sh
```

脚本会自动：
- 遍历所有 package.json（根目录、packages/app、packages/sdk、plugins）
- 对每个依赖执行 `pnpm why` 分析
- 标记可疑的冗余依赖（依赖链短、仅自己声明）
- 输出详细报告和建议

### 3.2 重叠依赖治理

#### 3.2.1 重叠依赖类型

项目中的重叠依赖分为两类：

1. **子项目与根目录的重叠**：子项目依赖与根目录依赖重叠
2. **子项目之间的重叠**：app 与 sdk 之间的依赖重叠

#### 3.2.2 处理规则（以 app 为主项目入口）

| 规则 | 处理方式 | 说明 |
|------|----------|------|
| **规则1** | 共享开发时依赖 → 全部移到根 package.json | 如 TypeScript、@types/node 等跨包共用依赖 |
| **规则2** | 需要强制特定版本的依赖 → 使用 `pnpm.overrides` | 统一版本，避免多版本并存 |
| **规则3** | app 和 sdk 都依赖的包 → 提升到根目录 | 减少重复安装，统一版本管理 |
| **规则4** | 仅构建工具重叠 → 根据实际需求决定 | 如 app 用 webpack，sdk 用 rollup/babel，可保持独立 |
| **规则5** | 需要发包的工具/类库 → 使用 `peerDependencies` | 让使用方自行安装，避免重复打包 |
| **规则6** | 运行时依赖（所有子项目都依赖）→ 提升到根 + 在发包包中声明 peer | 减少重复安装 |

#### 3.2.3 使用脚本

**检查子项目与根目录的重叠依赖：**

项目提供了两种版本的脚本（功能相同，选择适合你环境的版本）：

**Node.js 版本（推荐，跨平台）：**
```bash
# 检查与根目录的重叠依赖
pnpm run dep:check:overlapping
# 或
node scripts/check-overlapping-deps.js
```

**Bash 版本（Linux/macOS/Git Bash）：**
```bash
# 需要先赋予执行权限（仅首次）
chmod +x scripts/check-overlapping-deps.sh

# 执行检查
bash scripts/check-overlapping-deps.sh
# 或直接执行（Linux/macOS）
./scripts/check-overlapping-deps.sh
```

脚本会自动：
- 提取根目录的所有依赖
- 检查各子项目是否有与根目录重叠的依赖
- 对比版本是否一致
- 输出重叠列表和处理建议

**检查子项目之间的重叠依赖（app vs sdk）：**

```bash
# 检查子项目间的重叠依赖
pnpm run dep:check:subpackages
# 或
node scripts/check-subpackages-overlapping.js
```

脚本会自动：
- 提取 app 和 sdk 的所有依赖
- 检查两者之间的重叠依赖
- 对比版本是否一致
- 输出重叠列表和处理建议（以 app 为主项目入口）

### 3.3 锁文件保护

#### 3.3.1 核心目的

保证任何开发者在拉取代码后，执行 `pnpm install` 不会导致 `pnpm-lock.yaml` 发生更新。

#### 3.3.2 实施方案

1. **限制版本**：通过 `engines` 字段限制 Node.js 和 pnpm 版本
2. **本地检查**：在提交前检查 lockfile 是否变化
3. **CI 检查**：在 CI 流水线上使用 `--frozen-lockfile` 检查

#### 3.3.3 使用脚本

项目提供了两种版本的脚本（功能相同，选择适合你环境的版本）：

**Node.js 版本（推荐，跨平台）：**
```bash
# 检查锁文件是否变化
pnpm run dep:check:lockfile
# 或
node scripts/check-lockfile.js
```

**Bash 版本（Linux/macOS/Git Bash）：**
```bash
# 需要先赋予执行权限（仅首次）
chmod +x scripts/check-lockfile.sh

# 执行检查
bash scripts/check-lockfile.sh
# 或直接执行（Linux/macOS）
./scripts/check-lockfile.sh
```

脚本会：
- 备份当前 `pnpm-lock.yaml`
- 执行 `pnpm install --frozen-lockfile`
- 检查 lockfile 是否变化
- 如有变化则报错并恢复备份

---


