#!/usr/bin/env bash
# Project 6: SDK 构建工具替换
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DETAILS=()

# P6-1: build 脚本非简单 echo
if [ -f packages/sdk/package.json ]; then
  if grep -q '"build"' packages/sdk/package.json; then
    BUILD_SCRIPT=$(grep '"build"' packages/sdk/package.json | head -1)
    if echo "$BUILD_SCRIPT" | grep -qE 'echo\s+"|echo\s+'"'"''; then
      DETAILS+=("P6-1: SDK 的 build 脚本应为实际构建（非简单 echo）")
    fi
  fi
fi

# P6-2 / P6-5: sdk build 成功且在 60 秒内完成（构建速度）
if command -v timeout >/dev/null 2>&1; then
  timeout 60 pnpm --filter @monorepo/sdk run build >/dev/null 2>&1
  EXIT=$?
  if [ "$EXIT" -eq 124 ]; then
    DETAILS+=("P6-5: SDK 默认构建应在 60 秒内完成（构建速度未达标）")
  elif [ "$EXIT" -ne 0 ]; then
    DETAILS+=("P6-2: pnpm --filter @monorepo/sdk run build 应成功")
  fi
else
  pnpm --filter @monorepo/sdk run build >/dev/null 2>&1 || DETAILS+=("P6-2: pnpm --filter @monorepo/sdk run build 应成功")
fi

# P6-3
if [ ! -f packages/sdk/dist/index.js ]; then
  DETAILS+=("P6-3: packages/sdk/dist 下应存在 index.js 或等价产物")
fi

# P6-4
pnpm --filter @monorepo/app run build >/dev/null 2>&1 || DETAILS+=("P6-4: pnpm --filter @monorepo/app run build 仍应成功")

if [ ${#DETAILS[@]} -eq 0 ]; then
  echo "PASS"
  echo "所有检测项通过"
  exit 0
else
  echo "FAIL"
  printf '%s\n' "${DETAILS[@]}"
  exit 1
fi
