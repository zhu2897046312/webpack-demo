# Monorepo 工程化需求模拟项目

> 基于掘金文章《说来惭愧，入职的第一个需求居然花了我两多个月？！》的模拟实现项目

## 一、项目简介

本项目模拟企业级 Monorepo 工程化需求，实现：

1. **Alias 模块化**：将冗长的 SDK 引用路径简化为 `$component-a` 等短路径
2. **package.json exports**：通过 `exports` 字段定义包的导出
3. **tsconfig references**：项目间引用与增量编译
4. **自定义 Webpack 插件**：解析 tsconfig paths，自动注入 alias

## 二、文档导航

| 文档 | 说明 |
|------|------|
| [REQUIREMENTS.md](./docs/REQUIREMENTS.md) | 需求背景、技术方案、实施步骤 |
| [LEARNING_PATH.md](./docs/LEARNING_PATH.md) | 学习路线与前置知识（你已学 Webpack，还需学什么） |
| [PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) | 项目目录结构、依赖关系、配置文件 |

## 三、项目结构（计划）

```
webpack-demo/
├── docs/                 # 项目文档
├── packages/
│   ├── sdk/             # SDK 子包
│   └── app/             # 主应用
└── plugins/             # 自定义 Webpack 插件
```

## 四、前置知识

- **已掌握**：Webpack
- **需补充**：`package.json exports`、`tsconfig paths/references`、Monorepo、Webpack 插件开发

详见 [LEARNING_PATH.md](./docs/LEARNING_PATH.md)。

## 五、快速开始

> 当前阶段为文档与结构规划，待代码搭建完成后再补充具体命令。

```bash
# 安装依赖
pnpm install

# 构建
pnpm -r run build

# 开发
pnpm --filter @monorepo/app start
```

---

参考资料：

- [原文链接](https://juejin.cn/post/7310549035965186102)
- [Webpack 插件开发](https://juejin.cn/post/6844903713312604173)
