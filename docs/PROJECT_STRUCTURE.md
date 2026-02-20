# 项目结构设计

> Monorepo 模拟项目结构，用于实现文章中的工程化需求

---

## 一、目录结构

```
webpack-demo/
├── package.json              # 根 package.json（workspace 配置）
├── pnpm-workspace.yaml       # pnpm workspace 配置
├── tsconfig.base.json        # 基础 tsconfig
│
├── docs/                     # 项目文档
│   ├── REQUIREMENTS.md       # 需求文档
│   ├── LEARNING_PATH.md      # 学习路线
│   └── PROJECT_STRUCTURE.md  # 本文件
│
├── packages/
│   ├── sdk/                  # SDK 子包（被引用的库）
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── rollup.config.js  # 或 tsup.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       └── modules/
│   │           └── ui/
│   │               ├── component-a/
│   │               │   └── index.ts
│   │               └── component-b/
│   │                   └── index.ts
│   │
│   └── app/                  # 主应用（引用 SDK）
│       ├── package.json
│       ├── tsconfig.json
│       ├── webpack.config.js
│       ├── src/
│       │   ├── index.ts
│       │   └── App.tsx       # 示例：使用 SDK 组件
│       └── dist/
│
└── plugins/                  # 自定义 Webpack 插件（可选独立目录）
    └── typescript-alias-plugin/
        └── index.js
```

---

## 二、包依赖关系

```
packages/app
    └── depends on → packages/sdk (devDependency)

packages/sdk
    └── 无内部依赖
```

---

## 三、关键配置文件说明

### 3.1 根目录

| 文件 | 作用 |
|------|------|
| `package.json` | workspace 声明、公共 scripts |
| `pnpm-workspace.yaml` | 定义 workspace 包路径 |
| `tsconfig.base.json` | 共享的 TypeScript 基础配置 |

### 3.2 packages/sdk

| 文件 | 作用 |
|------|------|
| `package.json` | name、exports、main、types |
| `tsconfig.json` | paths、composite、outDir |
| `rollup.config.js` | 打包为 ESM/CommonJS（可后续换成 tsup） |

### 3.3 packages/app

| 文件 | 作用 |
|------|------|
| `package.json` | 依赖 @monorepo/sdk、webpack |
| `tsconfig.json` | paths、references 指向 sdk |
| `webpack.config.js` | 使用 TypeScriptAliasPlugin |

---

## 四、核心文件内容预览

### 4.1 pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
```

### 4.2 packages/sdk/package.json 关键字段

```json
{
  "name": "@monorepo/sdk",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./component-a": "./src/modules/ui/component-a/index.ts",
    "./component-b": "./src/modules/ui/component-b/index.ts"
  }
}
```

### 4.3 packages/app/package.json 关键字段

```json
{
  "name": "@monorepo/app",
  "dependencies": {},
  "devDependencies": {
    "@monorepo/sdk": "workspace:*",
    "webpack": "^5.x",
    "webpack-cli": "^5.x"
  }
}
```

---

## 五、构建与开发流程

### 5.1 首次搭建

```bash
pnpm install
pnpm --filter @monorepo/sdk build
pnpm --filter @monorepo/app build
```

### 5.2 开发模式

```bash
# 终端1：SDK 监听模式（如有 watch）
pnpm --filter @monorepo/sdk dev

# 终端2：App 开发服务器
pnpm --filter @monorepo/app start
```

### 5.3 生产构建

```bash
pnpm -r run build
```

---

## 六、实现顺序建议

1. 创建 Monorepo 基础结构（根 package.json、pnpm-workspace.yaml）
2. 搭建 `packages/sdk`（源码 + exports + tsconfig paths）
3. 搭建 `packages/app`（webpack + tsconfig references）
4. 实现 `TypeScriptAliasPlugin` 并接入 app 的 webpack
5. 验证：app 中 `import from '$component-a'` 能正确解析
6. （可选）将 SDK 构建从 Rollup 迁移到 tsup 等工具
