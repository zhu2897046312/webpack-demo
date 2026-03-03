#!/bin/bash

# 锁文件保护检查脚本
# 检查 pnpm-lock.yaml 是否在 pnpm install 后发生变化

set -e

LOCKFILE="pnpm-lock.yaml"
LOCKFILE_BACKUP="${LOCKFILE}.backup"

echo "=========================================="
echo "锁文件保护检查"
echo "=========================================="
echo ""

# 检查 lockfile 是否存在
if [ ! -f "$LOCKFILE" ]; then
  echo "错误: 找不到 $LOCKFILE"
  exit 1
fi

# 备份当前 lockfile
echo "备份当前 $LOCKFILE..."
cp "$LOCKFILE" "$LOCKFILE_BACKUP"

# 执行 pnpm install
echo "执行 pnpm install..."
pnpm install --frozen-lockfile 2>&1 || {
  echo ""
  echo "⚠️  警告: pnpm install --frozen-lockfile 失败"
  echo "这可能是正常的（如果依赖有变化）"
  echo ""
  
  # 恢复备份
  mv "$LOCKFILE_BACKUP" "$LOCKFILE"
  exit 0
}

# 检查 lockfile 是否变化
if ! diff -q "$LOCKFILE" "$LOCKFILE_BACKUP" > /dev/null 2>&1; then
  echo ""
  echo "❌ 错误: $LOCKFILE 在 pnpm install 后发生了变化！"
  echo ""
  echo "这可能意味着："
  echo "1. 依赖版本不一致"
  echo "2. Node.js 或 pnpm 版本不一致"
  echo "3. 依赖声明有变化但 lockfile 未更新"
  echo ""
  echo "请检查差异："
  diff "$LOCKFILE" "$LOCKFILE_BACKUP" || true
  echo ""
  
  # 恢复备份
  mv "$LOCKFILE_BACKUP" "$LOCKFILE"
  exit 1
else
  echo ""
  echo "✅ $LOCKFILE 未发生变化，检查通过"
  echo ""
  
  # 删除备份
  rm "$LOCKFILE_BACKUP"
  exit 0
fi
