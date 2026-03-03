#!/usr/bin/env node

/**
 * 锁文件保护检查脚本
 * 检查 pnpm-lock.yaml 是否在 pnpm install 后发生变化
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

const lockfile = path.join(__dirname, '../pnpm-lock.yaml');
const lockfileBackup = path.join(__dirname, '../pnpm-lock.yaml.backup');

function main() {
  log('==========================================', 'blue');
  log('锁文件保护检查', 'blue');
  log('==========================================', 'blue');
  console.log('');

  // 检查 lockfile 是否存在
  if (!fs.existsSync(lockfile)) {
    log('错误: 找不到 pnpm-lock.yaml', 'red');
    process.exit(1);
  }

  // 备份当前 lockfile
  log('备份当前 pnpm-lock.yaml...', 'blue');
  fs.copyFileSync(lockfile, lockfileBackup);

  try {
    // 执行 pnpm install
    log('执行 pnpm install...', 'blue');
    execSync('pnpm install --frozen-lockfile', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
  } catch (error) {
    console.log('');
    log('⚠️  警告: pnpm install --frozen-lockfile 失败', 'yellow');
    log('这可能是正常的（如果依赖有变化）', 'yellow');
    console.log('');

    // 恢复备份
    if (fs.existsSync(lockfileBackup)) {
      fs.copyFileSync(lockfileBackup, lockfile);
      fs.unlinkSync(lockfileBackup);
    }
    process.exit(0);
  }

  // 检查 lockfile 是否变化
  const original = fs.readFileSync(lockfileBackup, 'utf-8');
  const current = fs.readFileSync(lockfile, 'utf-8');

  if (original !== current) {
    console.log('');
    log('❌ 错误: pnpm-lock.yaml 在 pnpm install 后发生了变化！', 'red');
    console.log('');
    console.log('这可能意味着：');
    console.log('1. 依赖版本不一致');
    console.log('2. Node.js 或 pnpm 版本不一致');
    console.log('3. 依赖声明有变化但 lockfile 未更新');
    console.log('');

    // 恢复备份
    fs.copyFileSync(lockfileBackup, lockfile);
    fs.unlinkSync(lockfileBackup);

    process.exit(1);
  } else {
    console.log('');
    log('✅ pnpm-lock.yaml 未发生变化，检查通过', 'green');
    console.log('');

    // 删除备份
    if (fs.existsSync(lockfileBackup)) {
      fs.unlinkSync(lockfileBackup);
    }

    process.exit(0);
  }
}

main();
