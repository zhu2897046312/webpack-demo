const { fileExists, readJson, resolveRoot } = require('./lib/utils');

function run() {
  const details = [];
  const sdkPkg = readJson('packages/sdk/package.json');

  if (!sdkPkg) {
    return { passed: false, details: ['缺少 packages/sdk/package.json'] };
  }

  if (!sdkPkg.exports) {
    details.push('P1-1: package.json 缺少 exports 字段');
  } else {
    const e = sdkPkg.exports;
    const dot = e['.'];
    const dotStr = typeof dot === 'string' ? dot : (dot && (dot.import || dot.require || dot.default));
    if (!dotStr) {
      details.push('P1-2: exports["."] 需配置 import/require/default 之一');
    }

    const ca = e['./component-a'];
    const caStr = typeof ca === 'string' ? ca : (ca && (ca.import || ca.require || ca.default));
    if (!caStr || !caStr.includes('component-a')) {
      details.push('P1-3: exports["./component-a"] 存在且指向 component-a');
    }

    const cb = e['./component-b'];
    const cbStr = typeof cb === 'string' ? cb : (cb && (cb.import || cb.require || cb.default));
    if (!cbStr || !cbStr.includes('component-b')) {
      details.push('P1-4: exports["./component-b"] 存在且指向 component-b');
    }
  }

  if (!fileExists(resolveRoot('packages/sdk/src/modules/ui/component-a/index.ts'))) {
    details.push('P1-5: 缺少 packages/sdk/src/modules/ui/component-a/index.ts');
  }
  if (!fileExists(resolveRoot('packages/sdk/src/modules/ui/component-b/index.ts'))) {
    details.push('P1-6: 缺少 packages/sdk/src/modules/ui/component-b/index.ts');
  }

  const passed = details.length === 0;
  if (passed) details.push('所有检测项通过');
  return { passed, details };
}

module.exports = { run };
