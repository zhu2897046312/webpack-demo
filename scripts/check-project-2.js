const { fileExists, readJson, runCommandCapture, resolveRoot } = require('./lib/utils');

function run() {
  const details = [];
  const tsconfig = readJson('packages/sdk/tsconfig.json');

  if (!fileExists(resolveRoot('packages/sdk/tsconfig.json'))) {
    return { passed: false, details: ['P2-1: 缺少 packages/sdk/tsconfig.json'] };
  }

  const paths = (tsconfig && tsconfig.compilerOptions && tsconfig.compilerOptions.paths) || {};
  if (!paths['$component-a/*'] && !paths['$component-a']) {
    details.push('P2-2: compilerOptions.paths 应包含 $component-a/*');
  }
  if (!paths['$component-b/*'] && !paths['$component-b']) {
    details.push('P2-3: compilerOptions.paths 应包含 $component-b/*');
  }

  const composite = tsconfig && tsconfig.compilerOptions && tsconfig.compilerOptions.composite;
  if (composite !== true) {
    details.push('P2-4: compilerOptions.composite 应为 true');
  }

  const tscResult = runCommandCapture('pnpm exec tsc --noEmit -p ../../packages/sdk', {
    silent: true,
    cwd: resolveRoot('packages/app'),
  });
  if (!tscResult.ok) {
    details.push('P2-5: tsc --noEmit -p packages/sdk 应通过');
    if (tscResult.stderr) details.push(tscResult.stderr.trim().split('\n')[0]);
  }

  const passed = details.length === 0;
  if (passed) details.push('所有检测项通过');
  return { passed, details };
}

module.exports = { run };
