#!/usr/bin/env node
const path = require('path');
const { reportAll } = require('./lib/reporter');

const PROJECT_IDS = [0, 1, 2, 3, 4, 5, 6, 7];

function parseArg() {
  const arg = process.argv[2] || '0';
  if (arg === 'all') return PROJECT_IDS;
  const range = arg.match(/^(\d):all$/);
  if (range) {
    const start = parseInt(range[1], 10);
    if (start >= 0 && start <= 7) return PROJECT_IDS.filter((n) => n >= start);
  }
  const n = parseInt(arg, 10);
  if (Number.isInteger(n) && n >= 0 && n <= 7) return [n];
  return [0];
}

function run() {
  const ids = parseArg();
  const results = [];

  for (const id of ids) {
    let mod;
    try {
      mod = require(path.join(__dirname, `check-project-${id}.js`));
    } catch (e) {
      results.push({ projectId: id, result: { passed: false, details: [`加载 check-project-${id}.js 失败: ${e.message}`] } });
      continue;
    }
    const runFn = mod.run || mod;
    let result;
    try {
      result = typeof runFn === 'function' ? runFn() : { passed: false, details: ['无 run()'] };
    } catch (e) {
      result = { passed: false, details: [`执行异常: ${e.message}`] };
    }
    if (result && typeof result.then === 'function') {
      console.error('check-project-' + id + '.js 返回了 Promise，当前入口为同步执行，请改为同步 run()');
      result = { passed: false, details: ['脚本返回 Promise，暂不支持'] };
    }
    results.push({ projectId: id, result: result || { passed: false, details: ['无返回'] } });
  }

  const allPassed = reportAll(results);
  process.exit(allPassed ? 0 : 1);
}

run();
