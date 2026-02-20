const { fileExists, readJson, runCommandCapture, resolveRoot } = require('./lib/utils');

function run() {
  const details = [];
  const sdkPkg = readJson('packages/sdk/package.json');

  if (!sdkPkg || !sdkPkg.scripts || !sdkPkg.scripts.build) {
    details.push('P6-1: packages/sdk 应有 build 脚本');
  } else {
    const buildScript = sdkPkg.scripts.build;
    if (/^\s*echo\s+/.test(buildScript) || buildScript.includes('echo "') || buildScript.includes("echo '")) {
      details.push('P6-1: SDK 的 build 脚本应为实际构建（非简单 echo）');
    }
  }

  const sdkBuildResult = runCommandCapture('pnpm --filter @monorepo/sdk run build', { silent: true, timeout: 60000 });
  if (!sdkBuildResult.ok) {
    details.push('P6-2: pnpm --filter @monorepo/sdk run build 应成功');
  }

  const distIndex = resolveRoot('packages/sdk/dist/index.js');
  if (!fileExists(distIndex)) {
    details.push('P6-3: packages/sdk/dist 下应存在 index.js 或等价产物');
  }

  const appBuildResult = runCommandCapture('pnpm --filter @monorepo/app run build', { silent: true, timeout: 60000 });
  if (!appBuildResult.ok) {
    details.push('P6-4: pnpm --filter @monorepo/app run build 仍应成功');
  }

  const passed = details.length === 0;
  if (passed) details.push('所有检测项通过');
  return { passed, details };
}

module.exports = { run };
