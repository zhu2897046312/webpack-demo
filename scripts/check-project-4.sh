#!/usr/bin/env bash
# Project 4: App tsconfig references
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DETAILS=()

if [ ! -f packages/app/tsconfig.json ]; then
  echo "FAIL"
  echo "缺少 packages/app/tsconfig.json"
  exit 1
fi

# P4-1
if ! grep -q '"references"' packages/app/tsconfig.json; then
  DETAILS+=("P4-1: tsconfig.json 应存在 references 字段")
fi

# P4-2
if ! grep -q '"../sdk"' packages/app/tsconfig.json && ! grep -q '"./../sdk"' packages/app/tsconfig.json; then
  DETAILS+=("P4-2: references 应包含 { \"path\": \"../sdk\" }")
fi

# P4-3
if ! grep -q '"@/' packages/app/tsconfig.json && ! grep -q '"@sdk' packages/app/tsconfig.json; then
  DETAILS+=("P4-3: compilerOptions.paths 应包含 @/* 或 @sdk/*")
fi

# P4-4（references 依赖 sdk 的 dist，先构建 sdk 再 tsc）
pnpm --filter @monorepo/sdk run build >/dev/null 2>&1
P44_OK=0
(cd packages/app && pnpm exec tsc --noEmit) >/dev/null 2>&1 && P44_OK=1
[ "$P44_OK" -eq 0 ] && (cd packages/app && pnpm exec tsc -b .) >/dev/null 2>&1 && P44_OK=1
[ "$P44_OK" -eq 0 ] && DETAILS+=("P4-4: tsc --noEmit 或 tsc -b 应通过")

if [ ${#DETAILS[@]} -eq 0 ]; then
  echo "PASS"
  echo "所有检测项通过"
  exit 0
else
  echo "FAIL"
  printf '%s\n' "${DETAILS[@]}"
  exit 1
fi
