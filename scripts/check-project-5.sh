#!/usr/bin/env bash
# Project 5: TypeScriptAliasPlugin
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DETAILS=()

# P5-1: 认可插件源码 index.ts 或编译产物
if [ ! -f plugins/typescript-alias-plugin/index.ts ] && [ ! -f plugins/typescript-alias-plugin/dist/index.js ] && [ ! -f plugins/typescript-alias-plugin/index.js ] && [ ! -f packages/app/plugins/typescript-alias-plugin/index.js ]; then
  DETAILS+=("P5-1: 应存在 plugins/typescript-alias-plugin/index.ts（源码）或等价插件文件")
fi

# P5-2 P5-3: 若有插件文件则检查内容
PLUGIN_FILE=""
[ -f plugins/typescript-alias-plugin/index.ts ] && PLUGIN_FILE="plugins/typescript-alias-plugin/index.ts"
[ -z "$PLUGIN_FILE" ] && [ -f plugins/typescript-alias-plugin/dist/index.js ] && PLUGIN_FILE="plugins/typescript-alias-plugin/dist/index.js"
[ -z "$PLUGIN_FILE" ] && [ -f plugins/typescript-alias-plugin/index.js ] && PLUGIN_FILE="plugins/typescript-alias-plugin/index.js"
[ -z "$PLUGIN_FILE" ] && [ -f packages/app/plugins/typescript-alias-plugin/index.js ] && PLUGIN_FILE="packages/app/plugins/typescript-alias-plugin/index.js"
if [ -n "$PLUGIN_FILE" ]; then
  if ! grep -qE 'TypeScriptAliasPlugin|typescriptAliasPlugin' "$PLUGIN_FILE"; then
    DETAILS+=("P5-2: 插件类应导出为 TypeScriptAliasPlugin 或等价名称")
  fi
fi

WEBPACK_CFG="packages/app/webpack.config.ts"
[ ! -f "$WEBPACK_CFG" ] && WEBPACK_CFG="packages/app/webpack.config.js"
if ! grep -qE 'TypeScriptAliasPlugin|typescript-alias-plugin|typescriptAliasPlugin' "$WEBPACK_CFG" 2>/dev/null; then
  DETAILS+=("P5-3: webpack.config.ts / webpack.config.js 应使用该插件")
fi

# P5-4
if [ -f packages/app/src/index.ts ]; then
  if ! grep -q '\$component-a' packages/app/src/index.ts || ! grep -q '\$component-b' packages/app/src/index.ts; then
    DETAILS+=("P5-4: src/index.ts 应包含 import ... from '\$component-a' 或 '\$component-b'")
  fi
fi

# P5-5
pnpm --filter @monorepo/app run build >/dev/null 2>&1 || DETAILS+=("P5-5: pnpm --filter @monorepo/app run build 应成功")

# P5-6
[ ! -f packages/app/dist/main.js ] && DETAILS+=("P5-6: 构建后应存在 dist/main.js")

if [ ${#DETAILS[@]} -eq 0 ]; then
  echo "PASS"
  echo "所有检测项通过"
  exit 0
else
  echo "FAIL"
  printf '%s\n' "${DETAILS[@]}"
  exit 1
fi
