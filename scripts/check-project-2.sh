#!/usr/bin/env bash
# Project 2: SDK tsconfig paths
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DETAILS=()

# P2-1
if [ ! -f packages/sdk/tsconfig.json ]; then
  echo "FAIL"
  echo "P2-1: 缺少 packages/sdk/tsconfig.json"
  exit 1
fi

# P2-2 P2-3
if ! grep -q '\$component-a' packages/sdk/tsconfig.json; then
  DETAILS+=("P2-2: compilerOptions.paths 应包含 \$component-a/*")
fi
if ! grep -q '\$component-b' packages/sdk/tsconfig.json; then
  DETAILS+=("P2-3: compilerOptions.paths 应包含 \$component-b/*")
fi

# P2-4
if ! grep -q '"composite"[[:space:]]*:[[:space:]]*true' packages/sdk/tsconfig.json; then
  DETAILS+=("P2-4: compilerOptions.composite 应为 true")
fi

# P2-5
(cd packages/app && pnpm exec tsc --noEmit -p ../../packages/sdk) 2>/dev/null || DETAILS+=("P2-5: tsc --noEmit -p packages/sdk 应通过")

if [ ${#DETAILS[@]} -eq 0 ]; then
  echo "PASS"
  echo "所有检测项通过"
  exit 0
else
  echo "FAIL"
  printf '%s\n' "${DETAILS[@]}"
  exit 1
fi
