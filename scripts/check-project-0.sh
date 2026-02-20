#!/usr/bin/env bash
# Project 0: Monorepo 基础结构
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DETAILS=()

# P0-1
if [ ! -f pnpm-workspace.yaml ]; then
  DETAILS+=("P0-1: 缺少 pnpm-workspace.yaml")
else
  if ! grep -q "packages/\*" pnpm-workspace.yaml 2>/dev/null; then
    DETAILS+=("P0-1: pnpm-workspace.yaml 的 packages 应包含 packages/*")
  fi
fi

# P0-2
if [ ! -f package.json ]; then
  DETAILS+=("P0-2: 根目录缺少 package.json")
else
  if ! grep -qE '"private"[[:space:]]*:[[:space:]]*true' package.json; then
    DETAILS+=("P0-2: 根 package.json 的 private 应为 true")
  fi
fi

# P0-3
if [ ! -f packages/sdk/package.json ]; then
  DETAILS+=("P0-3: 缺少 packages/sdk/package.json")
else
  if ! grep -q '"name"[[:space:]]*:[[:space:]]*"@monorepo/sdk"' packages/sdk/package.json; then
    DETAILS+=("P0-3: packages/sdk/package.json 的 name 应为 @monorepo/sdk")
  fi
fi

# P0-4
if [ ! -f packages/app/package.json ]; then
  DETAILS+=("P0-4: 缺少 packages/app/package.json")
else
  if ! grep -q 'workspace:\*' packages/app/package.json || ! grep -q '@monorepo/sdk' packages/app/package.json; then
    DETAILS+=("P0-4: packages/app 的 devDependencies 应包含 @monorepo/sdk: workspace:*")
  fi
fi

# P0-5: 已配置 workspace 依赖即通过；实际安装请执行 pnpm install
if ! grep -qE '@monorepo/sdk|workspace:\*' packages/app/package.json 2>/dev/null; then
  DETAILS+=("P0-5: packages/app 应依赖 @monorepo/sdk: workspace:*")
fi

# P0-6
if [ ! -f tsconfig.base.json ]; then
  DETAILS+=("P0-6: 根目录缺少 tsconfig.base.json")
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
