#!/usr/bin/env bash
# Project 3: App 包结构与 Webpack
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DETAILS=()

# P3-1
if [ ! -f packages/app/webpack.config.js ]; then
  DETAILS+=("P3-1: 缺少 packages/app/webpack.config.js")
fi

# P3-2：引用 SDK（直接 @monorepo/sdk 或短路径 $component-a / $component-b）
if [ ! -f packages/app/src/index.ts ]; then
  DETAILS+=("P3-2: 缺少 packages/app/src/index.ts")
else
  if ! grep -q '@monorepo/sdk' packages/app/src/index.ts && \
     ! grep -q '\$component-a' packages/app/src/index.ts && \
     ! grep -q '\$component-b' packages/app/src/index.ts; then
    DETAILS+=("P3-2: src/index.ts 应包含对 @monorepo/sdk 的 import 或短路径 \$component-a / \$component-b")
  fi
fi

# P3-3
if ! grep -q '"build"' packages/app/package.json 2>/dev/null; then
  DETAILS+=("P3-3: package.json 的 scripts 应包含 build")
fi

# P3-4（构建输出重定向，避免混入 PASS/FAIL 判断）
pnpm --filter @monorepo/app run build >/dev/null 2>&1 || DETAILS+=("P3-4: pnpm --filter @monorepo/app run build 应成功")

# P3-5
if [ ! -f packages/app/dist/main.js ]; then
  DETAILS+=("P3-5: 构建后应存在 packages/app/dist/main.js")
else
  # P3-6
  if ! grep -qE 'Button|Card' packages/app/dist/main.js; then
    DETAILS+=("P3-6: 构建产物中应包含 Button/Card 相关代码")
  fi
fi

if [ ${#DETAILS[@]} -eq 0 ]; then
  echo "PASS"
  echo "所有检测项通过"
  exit 0
else
  echo "FAIL"
  printf '%s\n' "${DETAILS[@]}"
  exit 1
fi
