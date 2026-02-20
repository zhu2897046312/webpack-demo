#!/usr/bin/env bash
# Project 7: 端到端验收
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DETAILS=()

# P7-1
pnpm -r run build >/dev/null 2>&1 || DETAILS+=("P7-1: pnpm -r run build 应成功")

# P7-3
if [ -f packages/app/dist/main.js ]; then
  node packages/app/dist/main.js 2>/dev/null || DETAILS+=("P7-3: 构建产物应可被 Node 执行（无语法错误）")
fi

if [ ${#DETAILS[@]} -eq 0 ]; then
  echo "PASS"
  echo "所有检测项通过"
  echo "提示: P7-2 请手动执行 pnpm --filter @monorepo/app run start 验证"
  exit 0
else
  echo "FAIL"
  printf '%s\n' "${DETAILS[@]}"
  echo "提示: P7-2 请手动执行 pnpm --filter @monorepo/app run start 验证"
  exit 1
fi
