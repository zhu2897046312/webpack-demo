# TypeScript Alias Plugin

**源码**：`index.ts`（唯一维护文件）  
**构建**：在仓库根目录执行 `pnpm run build:plugin`，会由 `index.ts` 编译到 **dist/index.js**。  
Webpack 通过 `require('.../typescript-alias-plugin/dist')` 加载产物，修改插件逻辑请改 `index.ts` 后重新执行上述命令。
