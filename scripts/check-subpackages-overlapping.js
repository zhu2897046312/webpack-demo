#!/usr/bin/env node

/**
 * 子项目间重叠依赖检查脚本
 * 检查子项目（app、sdk）之间的依赖重叠情况
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getAllDeps(pkgPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
  } catch (error) {
    return {};
  }
}

function getPackageName(pkgPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.name || path.basename(path.dirname(pkgPath));
  } catch (error) {
    return 'unknown';
  }
}

// 主函数
function main() {
  log('==========================================', 'blue');
  log('子项目间重叠依赖检查报告', 'blue');
  log('==========================================', 'blue');
  console.log('');

  // 子项目 package.json 文件
  const subPackages = [
    {
      path: path.join(__dirname, '../packages/app/package.json'),
      name: '@monorepo/app',
      role: '主项目入口',
    },
    {
      path: path.join(__dirname, '../packages/sdk/package.json'),
      name: '@monorepo/sdk',
      role: 'SDK 子模块',
    },
  ];

  // 提取所有子项目的依赖
  const packageDeps = {};
  subPackages.forEach((pkgInfo) => {
    if (!fs.existsSync(pkgInfo.path)) {
      return;
    }

    const deps = getAllDeps(pkgInfo.path);
    packageDeps[pkgInfo.name] = {
      ...pkgInfo,
      deps,
    };

    log(`提取 ${pkgInfo.name} (${pkgInfo.role}) 的依赖...`, 'cyan');
    Object.keys(deps)
      .sort()
      .forEach((dep) => {
        // 跳过 workspace 依赖
        if (dep.startsWith('@monorepo/') || deps[dep] === 'workspace:*') {
          return;
        }
        console.log(`  - ${dep}: ${deps[dep]}`);
      });
  });

  console.log('');
  log('==========================================', 'blue');
  log('检查子项目间重叠依赖', 'blue');
  log('==========================================', 'blue');
  console.log('');

  const overlappingDeps = {};
  const packageNames = Object.keys(packageDeps);

  // 两两比较子项目的依赖
  for (let i = 0; i < packageNames.length; i++) {
    for (let j = i + 1; j < packageNames.length; j++) {
      const pkg1Name = packageNames[i];
      const pkg2Name = packageNames[j];
      const pkg1 = packageDeps[pkg1Name];
      const pkg2 = packageDeps[pkg2Name];

      log(
        `比较: ${pkg1.name} (${pkg1.role}) vs ${pkg2.name} (${pkg2.role})`,
        'yellow'
      );
      console.log('----------------------------------------');

      const overlapping = {};
      const pkg1Deps = pkg1.deps;
      const pkg2Deps = pkg2.deps;

      // 检查重叠
      Object.keys(pkg1Deps).forEach((dep) => {
        // 跳过 workspace 依赖
        if (dep.startsWith('@monorepo/') || pkg1Deps[dep] === 'workspace:*') {
          return;
        }

        if (pkg2Deps[dep]) {
          overlapping[dep] = {
            [pkg1Name]: pkg1Deps[dep],
            [pkg2Name]: pkg2Deps[dep],
          };
        }
      });

      const overlapCount = Object.keys(overlapping).length;

      if (overlapCount > 0) {
        log(`发现 ${overlapCount} 个重叠依赖：`, 'red');
        Object.keys(overlapping)
          .sort()
          .forEach((dep) => {
            const versions = overlapping[dep];
            const match =
              versions[pkg1Name] === versions[pkg2Name] ? '✅' : '⚠️';
            console.log(`  ${match} ${dep}`);
            console.log(`     ${pkg1Name}: ${versions[pkg1Name]}`);
            console.log(`     ${pkg2Name}: ${versions[pkg2Name]}`);
          });

        // 存储重叠信息
        Object.keys(overlapping).forEach((dep) => {
          if (!overlappingDeps[dep]) {
            overlappingDeps[dep] = {};
          }
          overlappingDeps[dep][`${pkg1Name} vs ${pkg2Name}`] =
            overlapping[dep];
        });
      } else {
        log('✅ 未发现重叠依赖', 'green');
      }

      console.log('');
    }
  }

  console.log('');
  log('==========================================', 'blue');
  log('重叠依赖汇总与建议', 'blue');
  log('==========================================', 'blue');
  console.log('');

  if (Object.keys(overlappingDeps).length === 0) {
    log('✅ 所有子项目之间都没有重叠依赖', 'green');
  } else {
    log(
      `发现 ${Object.keys(overlappingDeps).length} 个子项目间重叠依赖，建议处理：`,
      'yellow'
    );
    console.log('');
    console.log('处理规则（以 app 为主项目入口）：');
    console.log(
      '1. 如果 app 和 sdk 都依赖 → 提升到根目录 package.json（规则第1条）'
    );
    console.log(
      '2. 如果版本不一致 → 使用 pnpm.overrides 统一版本（规则第2条）'
    );
    console.log(
      '3. 如果仅构建工具重叠 → 考虑统一构建工具或保持独立（根据实际需求）'
    );
    console.log('');

    // 生成详细报告
    console.log('详细重叠列表：');
    Object.keys(overlappingDeps)
      .sort()
      .forEach((dep) => {
        console.log(`  - ${dep}`);
        Object.keys(overlappingDeps[dep]).forEach((comparison) => {
          const versions = overlappingDeps[dep][comparison];
          const [pkg1, pkg2] = comparison.split(' vs ');
          const match = versions[pkg1] === versions[pkg2] ? '✅' : '⚠️';
          console.log(`    ${match} ${comparison}`);
          console.log(`      ${pkg1}: ${versions[pkg1]}`);
          console.log(`      ${pkg2}: ${versions[pkg2]}`);
        });
      });

    console.log('');
    log('建议操作：', 'cyan');
    console.log('1. 对于版本一致的重叠依赖，考虑提升到根目录');
    console.log('2. 对于版本不一致的重叠依赖，使用 pnpm.overrides 统一');
    console.log('3. 对于构建工具类依赖，根据实际需求决定是否统一');
  }

  console.log('');
  log('==========================================', 'blue');
  log('检查完成', 'blue');
  log('==========================================', 'blue');
}

main();
