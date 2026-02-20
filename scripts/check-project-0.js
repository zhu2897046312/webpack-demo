const { fileExists, readJson, readWorkspacePackages, runCommandCapture, resolveRoot } = require('./lib/utils');

function run() {
  const details = [];

  if (!fileExists(resolveRoot('pnpm-workspace.yaml'))) {
    details.push('P0-1: 缺少 pnpm-workspace.yaml');
  } else {
    const packages = readWorkspacePackages();
    if (!packages.some((p) => p.includes('packages/*'))) {
      details.push('P0-1: pnpm-workspace.yaml 的 packages 应包含 packages/*');
    }
  }

  const rootPkg = readJson('package.json');
  if (!rootPkg) {
    details.push('P0-2: 根目录缺少 package.json');
  } else if (rootPkg.private !== true) {
    details.push('P0-2: 根 package.json 的 private 应为 true');
  }

  const sdkPkg = readJson('packages/sdk/package.json');
  if (!sdkPkg) {
    details.push('P0-3: 缺少 packages/sdk/package.json');
  } else if (sdkPkg.name !== '@monorepo/sdk') {
    details.push('P0-3: packages/sdk/package.json 的 name 应为 @monorepo/sdk');
  }

  const appPkg = readJson('packages/app/package.json');
  if (!appPkg) {
    details.push('P0-4: 缺少 packages/app/package.json');
  } else {
    const dep = (appPkg.devDependencies || appPkg.dependencies || {})['@monorepo/sdk'];
    if (!dep || !dep.includes('workspace:')) {
      details.push('P0-4: packages/app 的 devDependencies 应包含 @monorepo/sdk: workspace:*');
    }
  }

  const listResult = runCommandCapture('pnpm list @monorepo/sdk -r', { silent: true });
  if (!listResult.ok || !listResult.stdout.includes('@monorepo/sdk')) {
    details.push('P0-5: 请先执行 pnpm install，且 pnpm list @monorepo/sdk -r 能列出 sdk');
  }

  if (!fileExists(resolveRoot('tsconfig.base.json'))) {
    details.push('P0-6: 根目录缺少 tsconfig.base.json');
  }

  const passed = details.length === 0;
  if (passed) details.push('所有检测项通过');
  return { passed, details };
}

module.exports = { run };
