# TypeScriptAliasPlugin 演示录屏指南

用于导师演示：如何展示插件、如何解决“背景问题”（长路径、重复打包），以及如何用开关切换源码/产物引用。

## 录屏前准备

1. 在项目根目录执行：`pnpm install`（若未安装依赖）
2. 开发模式默认使用**源码引用**，无需先打包 SDK

## 推荐录屏步骤

### 1. 展示“源码引用”模式（默认）

```bash
cd packages/app
pnpm start
# 或从根目录: pnpm --filter @monorepo/app run start
```

- 浏览器打开后，顶部会显示 **「当前: 源码引用 (src)」** 和按钮 **「查看插件说明 / 如何切换」**
- 点击按钮，展开说明：
  - 当前模式：Webpack 直接转译 SDK 源码，无需先打包 SDK
  - 解决背景问题：长路径、重复打包 → 短路径 + 开发时跳过 SDK 打包，一次转译
  - 切换方式：通过环境变量 `USE_SOURCE_ALIAS` 控制

### 2. 展示“产物引用”模式（可选）

1. 先构建 SDK 产物：  
   `pnpm --filter @monorepo/sdk run build`
2. 停止当前 dev server（Ctrl+C），再以 dist 模式启动：  
   - **Bash / WSL**：`USE_SOURCE_ALIAS=false pnpm --filter @monorepo/app run start`
   - **PowerShell**：`$env:USE_SOURCE_ALIAS="false"; pnpm --filter @monorepo/app run start`
3. 刷新页面，应显示 **「当前: 产物引用 (dist)」**，说明插件已按开关指向 dist

### 3. 口播/字幕可强调的点

- **背景问题**：Monorepo 里用长路径引用 SDK、每次改 SDK 都要先打包，开发慢。
- **插件作用**：把短路径（如 `$component-a`）转成 Webpack 的 resolve.alias，开发时可直接指向 **src**，一次转译。
- **开关**：插件支持 `sourceMode`（环境变量 `USE_SOURCE_ALIAS`），开发用 src、发布/CI 可用 dist，便于演示和对比。

## 录屏工具建议

- Windows：Xbox Game Bar（Win+G）、或 OBS Studio
- Mac：QuickTime 屏幕录制、或 OBS
- 只录浏览器窗口即可，时长约 1～2 分钟

## 开关说明（给导师/评委看）

| 环境变量 / 行为           | 插件 sourceMode | 别名指向   | 适用场景     |
|---------------------------|-----------------|------------|--------------|
| 默认（不设置）            | true            | SDK 的 src | 本地开发     |
| `USE_SOURCE_ALIAS=false` | false           | SDK 的 dist| 生产/CI 演示 |
