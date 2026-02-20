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

# P6-2
pnpm --filter @monorepo/sdk run build >/dev/null 2>&1 || DETAILS+=("P6-2: pnpm --filter @monorepo/sdk run build 应成功")

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
