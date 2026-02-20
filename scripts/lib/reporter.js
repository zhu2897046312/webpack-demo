const PROJECT_NAMES = {
  0: 'Project 0: Monorepo 基础结构',
  1: 'Project 1: SDK 包结构与 exports',
  2: 'Project 2: SDK tsconfig paths',
  3: 'Project 3: App 包结构与 Webpack',
  4: 'Project 4: App tsconfig references',
  5: 'Project 5: TypeScriptAliasPlugin',
  6: 'Project 6: SDK 构建工具替换',
  7: 'Project 7: 端到端验收',
};

function report(projectId, result) {
  const name = PROJECT_NAMES[projectId] || `Project ${projectId}`;
  const { passed, details = [] } = result;
  const icon = passed ? '✓' : '✗';
  const status = passed ? '通过' : '未通过';
  console.log('');
  console.log(`${icon} ${name} - ${status}`);
  if (details.length) {
    details.forEach((d) => console.log(`  ${passed ? '  ' : '-'} ${d}`));
  }
  return passed;
}

function reportAll(results) {
  console.log('\n========== 检测结果 ==========\n');
  let allPassed = true;
  results.forEach((r, i) => {
    if (!report(r.projectId, r.result)) allPassed = false;
  });
  console.log('\n==============================\n');
  console.log(allPassed ? '全部通过 ✓' : '存在未通过项 ✗');
  return allPassed;
}

module.exports = {
  PROJECT_NAMES,
  report,
  reportAll,
};
