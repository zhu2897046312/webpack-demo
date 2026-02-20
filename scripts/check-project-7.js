const { fileExists, runCommandCapture, resolveRoot } = require('./lib/utils');

function run() {
  const details = [];

  const buildResult = runCommandCapture('pnpm -r run build', { silent: true, timeout: 120000 });
  if (!buildResult.ok) {
    details.push('P7-1: pnpm -r run build 应成功');
  }

  const distMain = resolveRoot('packages/app/dist/main.js');
  if (fileExists(distMain)) {
    const nodeResult = runCommandCapture(`node "${distMain}"`, { silent: true, timeout: 5000 });
    if (!nodeResult.ok && nodeResult.code !== undefined) {
      details.push('P7-3: 构建产物应可被 Node 执行（无语法错误）');
    }
  }

  const passed = details.length === 0;
  if (passed) details.push('所有检测项通过');
  details.push('提示: P7-2 请手动执行 pnpm --filter @monorepo/app run start 验证');
  return { passed, details };
}

module.exports = { run };
