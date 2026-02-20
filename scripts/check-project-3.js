const { fileExists, readFile, readJson, runCommandCapture, resolveRoot } = require('./lib/utils');

function run() {
  const details = [];

  if (!fileExists(resolveRoot('packages/app/webpack.config.js'))) {
    details.push('P3-1: 缺少 packages/app/webpack.config.js');
  }

  const indexContent = readFile('packages/app/src/index.ts');
  if (!fileExists(resolveRoot('packages/app/src/index.ts'))) {
    details.push('P3-2: 缺少 packages/app/src/index.ts');
  } else if (!indexContent.includes('@monorepo/sdk')) {
    details.push('P3-2: src/index.ts 应包含对 @monorepo/sdk 的 import');
  }

  const appPkg = readJson('packages/app/package.json');
  if (!appPkg || !appPkg.scripts || !appPkg.scripts.build) {
    details.push('P3-3: package.json 的 scripts 应包含 build');
  }

  const buildResult = runCommandCapture('pnpm --filter @monorepo/app run build', { silent: true, timeout: 60000 });
  if (!buildResult.ok) {
    details.push('P3-4: pnpm --filter @monorepo/app run build 应成功');
  }

  const distMain = resolveRoot('packages/app/dist/main.js');
  if (!fileExists(distMain)) {
    details.push('P3-5: 构建后应存在 packages/app/dist/main.js');
  } else {
    const mainContent = readFile('packages/app/dist/main.js');
    if (!mainContent.includes('Button') && !mainContent.includes('Card')) {
      details.push('P3-6: 构建产物中应包含 Button/Card 相关代码');
    }
  }

  const passed = details.length === 0;
  if (passed) details.push('所有检测项通过');
  return { passed, details };
}

module.exports = { run };
