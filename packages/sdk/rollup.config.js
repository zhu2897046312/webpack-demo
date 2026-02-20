const typescript = require('@rollup/plugin-typescript');
const path = require('path');

/** SDK 的 Rollup 构建配置（可选，用于与 tsc 构建速度对比） */
module.exports = {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.js', format: 'cjs', sourcemap: true },
    { file: 'dist/index.mjs', format: 'es', sourcemap: true },
  ],
  plugins: [
    typescript({ tsconfig: path.join(__dirname, 'tsconfig.json') }),
  ],
  external: [],
};
