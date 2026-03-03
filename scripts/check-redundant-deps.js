#!/usr/bin/env node

/**
 * 冗余依赖检查脚本
 * 遍历所有 package.json，执行 pnpm why 全量输出
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    return Object.keys(deps).filter((dep) => {
      // 跳过 workspace 依赖
      return !dep.startsWith('@monorepo/') && deps[dep] !== 'workspace:*';
    });
  } catch (error) {
    return [];
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

// 白名单：根目录的跨包共用依赖，不应被标记为冗余
const ROOT_SHARED_DEPS_WHITELIST = [
  'typescript',
  '@types/node',
  // 可以继续添加其他跨包共用的工具依赖
];

function checkDependency(dep, declaredInRoot) {
  // 如果是根目录的跨包共用依赖，直接跳过冗余检查
  if (declaredInRoot && ROOT_SHARED_DEPS_WHITELIST.includes(dep)) {
    return {
      output: '',
      isSuspicious: false,
      depCount: 0,
      skipReason: '根目录跨包共用依赖（白名单）',
    };
  }

  try {
    const output = execSync(`pnpm why ${dep}`, {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });

    // 分析输出
    const lines = output.split('\n');
    const hasLegend = lines.some((line) => line.includes('Legend:'));
    const depCount = lines.filter((line) =>
      line.includes('devDependencies:') || line.includes('dependencies:')
    ).length;

    // 检查是否只有自己声明
    // 改进判断逻辑：如果依赖在根目录且被其他包间接使用，不应标记为冗余
    const isOnlyInRoot = output.includes('webpack-demo-monorepo@') && 
                         !output.includes('packages/') &&
                         depCount <= 2;

    // 检查是否被其他包依赖（通过 node_modules 路径判断）
    const hasOtherDependents = output.includes('node_modules') && 
                               output.split('node_modules').length > 2;

    // 检查是否只有自己声明且没有被其他包使用
    const isSuspicious =
      hasLegend &&
      depCount <= 2 &&
      !hasOtherDependents &&
      !isOnlyInRoot && // 根目录的依赖需要更谨慎判断
      lines.filter((line) => line.trim().startsWith(dep)).length <= 2;

    return {
      output,
      isSuspicious,
      depCount,
    };
  } catch (error) {
    return {
      output: error.message || 'ERROR: pnpm why failed',
      isSuspicious: false,
      depCount: 0,
    };
  }
}

// 主函数
function main() {
  log('==========================================', 'blue');
  log('冗余依赖检查报告', 'blue');
  log('==========================================', 'blue');
  console.log('');

  // 获取所有 package.json 文件
  const packageFiles = [
    path.join(__dirname, '../package.json'),
    path.join(__dirname, '../packages/app/package.json'),
    path.join(__dirname, '../packages/sdk/package.json'),
  ];

  // 如果 plugins 目录下有 package.json，也加入
  const pluginPkg = path.join(
    __dirname,
    '../plugins/typescript-alias-plugin/package.json'
  );
  if (fs.existsSync(pluginPkg)) {
    packageFiles.push(pluginPkg);
  }

  // 存储所有依赖
  const allDeps = new Set();
  const depToPackage = {};
  const depDeclaredInRoot = {};

  // 提取所有依赖
  packageFiles.forEach((pkgFile) => {
    if (!fs.existsSync(pkgFile)) {
      return;
    }

    const pkgName = getPackageName(pkgFile);
    const isRoot = pkgFile.includes('package.json') && 
                   !pkgFile.includes('packages/') && 
                   !pkgFile.includes('plugins/');
    
    log(`检查包: ${pkgName} (${path.relative(process.cwd(), pkgFile)})`, 'green');

    const deps = getAllDeps(pkgFile);
    deps.forEach((dep) => {
      allDeps.add(dep);
      if (!depToPackage[dep]) {
        depToPackage[dep] = [];
      }
      depToPackage[dep].push(pkgName);
      
      // 记录是否在根目录声明
      if (isRoot) {
        depDeclaredInRoot[dep] = true;
      }
    });
  });

  console.log('');
  log('==========================================', 'blue');
  log('开始检查每个依赖的使用情况', 'blue');
  log('==========================================', 'blue');
  console.log('');

  const suspiciousDeps = [];

  // 对每个依赖执行 pnpm why
  Array.from(allDeps)
    .sort()
    .forEach((dep) => {
      log(`检查依赖: ${dep}`, 'yellow');
      console.log('----------------------------------------');

      const declaredInRoot = depDeclaredInRoot[dep] || false;
      const result = checkDependency(dep, declaredInRoot);

      if (result.skipReason) {
        log(`ℹ️  跳过检查: ${result.skipReason}`, 'blue');
        console.log('');
        return;
      }

      if (result.isSuspicious) {
        log(`⚠️  可疑冗余依赖: ${dep}`, 'red');
        suspiciousDeps.push(dep);
      }

      if (result.output) {
        console.log(result.output);
      }
      console.log('');
    });

  console.log('');
  log('==========================================', 'blue');
  log('可疑冗余依赖汇总', 'blue');
  log('==========================================', 'blue');
  console.log('');

  if (suspiciousDeps.length === 0) {
    log('✅ 未发现明显的冗余依赖', 'green');
  } else {
    log(`发现 ${suspiciousDeps.length} 个可疑的冗余依赖：`, 'red');
    suspiciousDeps.forEach((dep) => {
      console.log(`  - ${dep} (声明在: ${depToPackage[dep].join(', ')})`);
    });
    console.log('');
    console.log('建议：');
    console.log(
      '1. 全局搜索包名: grep -r "包名" --include="*.ts" --include="*.tsx" --include="*.js"'
    );
    console.log('2. 了解包的作用并判断是否真的需要');
    console.log('3. 删除后执行 pnpm install 并运行/打包测试');
  }

  console.log('');
  log('==========================================', 'blue');
  log('检查完成', 'blue');
  log('==========================================', 'blue');
}

main();
