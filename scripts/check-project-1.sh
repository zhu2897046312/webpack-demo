#!/usr/bin/env bash
# Project 1: SDK 包结构与 exports
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DETAILS=()

# P1-1
if [ ! -f packages/sdk/package.json ]; then
  echo "FAIL"
  echo "缺少 packages/sdk/package.json"
  exit 1
fi
if ! grep -q '"exports"' packages/sdk/package.json; then
  DETAILS+=("P1-1: package.json 缺少 exports 字段")
fi

# P1-2: exports["."] 有 import/require/default
if ! grep -qE '"\."|"import"|"require"|"default"' packages/sdk/package.json; then
  DETAILS+=("P1-2: exports[\".\"] 需配置 import/require/default 之一")
fi

# P1-3 P1-4
if ! grep -q 'component-a' packages/sdk/package.json; then
  DETAILS+=("P1-3: exports[\"./component-a\"] 存在且指向 component-a")
fi
if ! grep -q 'component-b' packages/sdk/package.json; then
  DETAILS+=("P1-4: exports[\"./component-b\"] 存在且指向 component-b")
fi

# P1-5 P1-6
if [ ! -f packages/sdk/src/modules/ui/component-a/index.ts ]; then
  DETAILS+=("P1-5: 缺少 packages/sdk/src/modules/ui/component-a/index.ts")
fi
if [ ! -f packages/sdk/src/modules/ui/component-b/index.ts ]; then
  DETAILS+=("P1-6: 缺少 packages/sdk/src/modules/ui/component-b/index.ts")
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
