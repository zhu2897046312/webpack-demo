const { fileExists, readJson, runCommandCapture, resolveRoot } = require('./lib/utils');

function run() {
  const details = [];
  const tsconfig = readJson('packages/app/tsconfig.json');

  if (!fileExists(resolveRoot('packages/app/tsconfig.json'))) {
    return { passed: false, details: ['缺少 packages/app/tsconfig.json'] };
  }

  const refs = tsconfig && tsconfig.references;
  if (!refs || !Array.isArray(refs)) {
    details.push('P4-1: tsconfig.json 应存在 references 字段');
  } else {
    const hasSdk = refs.some((r) => r.path === '../sdk' || r.path === './../sdk');
    if (!hasSdk) {
      details.push('P4-2: references 应包含 { "path": "../sdk" }');
    }
  }

  const paths = (tsconfig && tsconfig.compilerOptions && tsconfig.compilerOptions.paths) || {};
  const hasPath = paths['@/*'] || paths['@sdk/*'];
  if (!hasPath) {
    details.push('P4-3: compilerOptions.paths 应包含 @/* 或 @sdk/*');
  }

  const tscResult = runCommandCapture('pnpm exec tsc --noEmit -p .', {
    silent: true,
    cwd: resolveRoot('packages/app'),
  });
  if (!tscResult.ok) {
    const tscBResult = runCommandCapture('pnpm exec tsc -b -p .', {
      silent: true,
      cwd: resolveRoot('packages/app'),
    });
    if (!tscBResult.ok) {
      details.push('P4-4: tsc --noEmit -p packages/app 或 tsc -b -p packages/app 应通过');
    }
  }

  const passed = details.length === 0;
  if (passed) details.push('所有检测项通过');
  return { passed, details };
}

module.exports = { run };
