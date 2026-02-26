const path = require('path');
const fs = require('fs');

/**
 * 从 tsconfig 读取 paths，注入到 Webpack resolve.alias，实现短路径统一管理。
 * 优先使用根 tsconfig.base.json（与 TypeScript/IDE 一致）；若不存在或无 paths，则回退到 packages/sdk/tsconfig.json。
 * @param {Object} options
 * @param {string} [options.rootPath] - Monorepo 根目录
 * @param {string} [options.tsconfigPath] - 根 tsconfig 路径，默认 rootPath/tsconfig.base.json
 * @param {boolean} [options.sourceMode=true] - true: 指向 src 源码；false: 指向 dist 产物
 */
class TypeScriptAliasPlugin {
  constructor(options = {}) {
    this.rootPath = options.rootPath || process.cwd();
    this.tsconfigPath = options.tsconfigPath || path.join(this.rootPath, 'tsconfig.base.json');
    this.sourceMode = options.sourceMode !== false;
  }

  apply(compiler) {
    const alias = this.collectAlias();
    if (Object.keys(alias).length === 0) return;
    const resolve = compiler.options.resolve || (compiler.options.resolve = {});
    resolve.alias = { ...(resolve.alias || {}), ...alias };
  }

  collectAlias() {
    const fromBase = this.collectAliasFromBase();
    if (Object.keys(fromBase).length > 0) return fromBase;
    return this.collectAliasFromSdk();
  }

  /** 从根 tsconfig.base.json 读取，路径相对 rootPath 解析；无文件或无 paths 时返回 {} */
  collectAliasFromBase() {
    if (!fs.existsSync(this.tsconfigPath)) return {};
    let config;
    try {
      config = JSON.parse(fs.readFileSync(this.tsconfigPath, 'utf8'));
    } catch {
      return {};
    }
    const paths = (config.compilerOptions && config.compilerOptions.paths) || {};
    if (Object.keys(paths).length === 0) return {};
    const alias = {};
    for (const [key, values] of Object.entries(paths)) {
      const pattern = key.replace(/\*$/, '').replace(/\/$/, '');
      if (!pattern || !Array.isArray(values) || !values[0]) continue;
      let target = values[0].replace(/\*$/, '');
      if (!this.sourceMode && target.includes('packages/sdk/src/')) {
        target = target.replace('packages/sdk/src/', 'packages/sdk/dist/');
      }
      alias[pattern] = path.resolve(this.rootPath, target);
    }
    return alias;
  }

  /** 从 packages/sdk/tsconfig.json 读取（回退数据源），路径相对 SDK 目录解析 */
  collectAliasFromSdk() {
    const sdkPath = path.resolve(this.rootPath, 'packages/sdk');
    const tsconfigPath = path.join(sdkPath, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) return {};
    let config;
    try {
      config = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    } catch {
      return {};
    }
    const baseUrl = path.resolve(sdkPath, (config.compilerOptions && config.compilerOptions.baseUrl) || '.');
    const paths = (config.compilerOptions && config.compilerOptions.paths) || {};
    const alias = {};
    for (const [key, values] of Object.entries(paths)) {
      const pattern = key.replace(/\*$/, '').replace(/\/$/, '');
      if (!pattern || !Array.isArray(values) || !values[0]) continue;
      let target = values[0].replace(/\*$/, '');
      if (!this.sourceMode && target.startsWith('./src/')) {
        target = './dist/' + target.slice(6);
      }
      alias[pattern] = path.resolve(baseUrl, target);
    }
    return alias;
  }
}

TypeScriptAliasPlugin.getAlias = function (options) {
  const p = new TypeScriptAliasPlugin(options);
  return p.collectAlias();
};

module.exports = { TypeScriptAliasPlugin };
module.exports.TypeScriptAliasPlugin = TypeScriptAliasPlugin;
