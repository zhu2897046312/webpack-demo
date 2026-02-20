const { fileExists, readFile, runCommandCapture, resolveRoot } = require('./lib/utils');

function run() {
  const details = [];

  const pluginPath = resolveRoot('plugins/typescript-alias-plugin/index.js');
  const pluginPathAlt = resolveRoot('packages/app/plugins/typescript-alias-plugin/index.js');
  const hasPlugin = fileExists(pluginPath) || fileExists(pluginPathAlt);
  if (!hasPlugin) {
    details.push('P5-1: 应存在 plugins/typescript-alias-plugin/index.js 或等价插件文件');
  } else {
    const pluginContent = readFile(fileExists(pluginPath) ? 'plugins/typescript-alias-plugin/index.js' : 'packages/app/plugins/typescript-alias-plugin/index.js');
    if (!pluginContent.includes('TypeScriptAliasPlugin') && !pluginContent.includes('typescriptAliasPlugin')) {
      details.push('P5-2: 插件类应导出为 TypeScriptAliasPlugin 或等价名称');
    }
  }

  const webpackContent = readFile('packages/app/webpack.config.js');
  if (!webpackContent.includes('TypeScriptAliasPlugin') && !webpackContent.includes('typescript-alias-plugin') && !webpackContent.includes('typescriptAliasPlugin')) {
    details.push('P5-3: webpack.config.js 应使用该插件');
  }

  const indexContent = readFile('packages/app/src/index.ts');
  const hasShortPath = indexContent.includes("'$component-a'") || indexContent.includes('"$component-a"') ||
    indexContent.includes("'$component-b'") || indexContent.includes('"$component-b"');
  if (!hasShortPath) {
    details.push("P5-4: src/index.ts 应包含 import ... from '$component-a' 或 '$component-b'");
  }

  const buildResult = runCommandCapture('pnpm --filter @monorepo/app run build', { silent: true, timeout: 60000 });
  if (!buildResult.ok) {
    details.push('P5-5: pnpm --filter @monorepo/app run build 应成功');
  }

  const distMain = resolveRoot('packages/app/dist/main.js');
  if (!fileExists(distMain)) {
    details.push('P5-6: 构建后应存在 dist/main.js');
  }

  const passed = details.length === 0;
  if (passed) details.push('所有检测项通过');
  return { passed, details };
}

module.exports = { run };
