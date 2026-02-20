/** SDK 的 Babel 构建配置（可选，与 tsc / Rollup 对比构建速度） */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: '18' }, modules: 'cjs' }],
    '@babel/preset-typescript',
  ],
};
