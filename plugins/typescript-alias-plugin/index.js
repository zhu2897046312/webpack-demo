const path = require('path');
const fs = require('fs');

/**
 * 从 SDK 的 tsconfig.json 读取 paths，注入到 Webpack resolve.alias，
 * 使主项目可通过 $component-a、$component-b 等短路径引用 SDK 源码。
 */
class TypeScriptAliasPlugin {
  constructor(options = {}) {
    this.rootPath = options.rootPath || process.cwd();
  }

  apply(compiler) {
    const alias = this.collectAlias();
    if (Object.keys(alias).length === 0) return;
    const resolve = compiler.options.resolve || (compiler.options.resolve = {});
    resolve.alias = { ...(resolve.alias || {}), ...alias };
  }

  collectAlias() {
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
      const target = values[0].replace(/\*$/, '');
      const absolute = path.resolve(baseUrl, target);
      alias[pattern] = absolute;
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
