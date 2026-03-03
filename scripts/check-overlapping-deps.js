#!/usr/bin/env node

/**
 * 重叠依赖检查脚本
 * 遍历子项目中的 package.json，将与根目录重叠的依赖进行输出
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
  log('重叠依赖检查报告', 'blue');
  log('==========================================', 'blue');
  console.log('');

  const rootPkg = path.join(__dirname, '../package.json');
  
  if (!fs.existsSync(rootPkg)) {
    log('错误: 找不到根目录 package.json', 'red');
    process.exit(1);
  }

  // 提取根目录的依赖
  log('提取根目录依赖...', 'blue');
  const rootDeps = getAllDeps(rootPkg);

  console.log('');
  log('==========================================', 'blue');
  log('根目录依赖列表', 'blue');
  log('==========================================', 'blue');
  Object.keys(rootDeps)
    .sort()
    .forEach((dep) => {
      console.log(`  - ${dep}: ${rootDeps[dep]}`);
    });

  // 子项目 package.json 文件
  const subPackages = [
    path.join(__dirname, '../packages/app/package.json'),
    path.join(__dirname, '../packages/sdk/package.json'),
  ];

  // 如果 plugins 目录下有 package.json，也加入
  const pluginPkg = path.join(__dirname, '../plugins/typescript-alias-plugin/package.json');
  if (fs.existsSync(pluginPkg)) {
    subPackages.push(pluginPkg);
  }

  console.log('');
  log('==========================================', 'blue');
  log('检查子项目重叠依赖', 'blue');
  log('==========================================', 'blue');
  console.log('');

  const overlappingDeps = {};

  subPackages.forEach((subPkg) => {
    if (!fs.existsSync(subPkg)) {
      return;
    }

    const pkgName = getPackageName(subPkg);
    log(`检查包: ${pkgName} (${path.relative(process.cwd(), subPkg)})`, 'yellow');
    console.log('----------------------------------------');

    const subDeps = getAllDeps(subPkg);
    const overlapping = {};

    // 检查重叠
    Object.keys(subDeps).forEach((dep) => {
      // 跳过 workspace 依赖
      if (dep.startsWith('@monorepo/') || subDeps[dep] === 'workspace:*') {
        return;
      }

      if (rootDeps[dep]) {
        overlapping[dep] = {
          root: rootDeps[dep],
          sub: subDeps[dep],
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
          const match = versions.root === versions.sub ? '✅' : '⚠️';
          console.log(`  ${match} ${dep}`);
          console.log(`     根目录: ${versions.root}`);
          console.log(`     子项目: ${versions.sub}`);
        });

      // 存储重叠信息
      Object.keys(overlapping).forEach((dep) => {
        if (!overlappingDeps[dep]) {
          overlappingDeps[dep] = [];
        }
        overlappingDeps[dep].push({
          pkg: pkgName,
          root: overlapping[dep].root,
          sub: overlapping[dep].sub,
        });
      });
    } else {
      log('✅ 未发现重叠依赖', 'green');
    }

    console.log('');
  });

  console.log('');
  log('==========================================', 'blue');
  log('重叠依赖汇总与建议', 'blue');
  log('==========================================', 'blue');
  console.log('');

  if (Object.keys(overlappingDeps).length === 0) {
    log('✅ 所有子项目都没有与根目录重叠的依赖', 'green');
  } else {
    log(
      `发现 ${Object.keys(overlappingDeps).length} 个重叠依赖，建议处理：`,
      'yellow'
    );
    console.log('');
    console.log('处理规则：');
    console.log('1. 共享开发时依赖 → 全部移到根 package.json（规则第1条）');
    console.log('2. 需要强制特定版本的依赖 → 使用 pnpm.overrides（规则第2条）');
    console.log('3. 需要发包的工具/类库 → 使用 peerDependencies（规则第3条）');
    console.log(
      '4. 运行时依赖（所有子项目都依赖）→ 提升到根 + 在发包包中声明 peer（规则第4条）'
    );
    console.log('');

    // 生成详细报告
    console.log('详细重叠列表：');
    Object.keys(overlappingDeps)
      .sort()
      .forEach((dep) => {
        console.log(`  - ${dep}`);
        overlappingDeps[dep].forEach((info) => {
          console.log(`    在 ${info.pkg}: 根目录=${info.root}, 子项目=${info.sub}`);
        });
      });
  }

  console.log('');
  log('==========================================', 'blue');
  log('检查完成', 'blue');
  log('==========================================', 'blue');
}

main();
