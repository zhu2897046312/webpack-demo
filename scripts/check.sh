#!/usr/bin/env bash
# Bustub 风格节点检测 - 主入口（纯 Shell）
# 用法: ./scripts/check.sh [0|1|2|3|4|5|6|7|all|3:all]
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# 解析参数得到要检测的 Project 列表
parse_arg() {
  local arg="${1:-0}"
  if [ "$arg" = "all" ]; then
    echo 0 1 2 3 4 5 6 7
    return
  fi
  if [[ "$arg" =~ ^([0-7]):all$ ]]; then
    local start="${BASH_REMATCH[1]}"
    case $start in
      0) echo 0 1 2 3 4 5 6 7 ;;
      1) echo 1 2 3 4 5 6 7 ;;
      2) echo 2 3 4 5 6 7 ;;
      3) echo 3 4 5 6 7 ;;
      4) echo 4 5 6 7 ;;
      5) echo 5 6 7 ;;
      6) echo 6 7 ;;
      7) echo 7 ;;
      *) echo 0 ;;
    esac
    return
  fi
  if [[ "$arg" =~ ^[0-7]$ ]]; then
    echo "$arg"
    return
  fi
  echo 0
}

# 项目名称
name_for() {
  case "$1" in
    0) echo "Project 0: Monorepo 基础结构" ;;
    1) echo "Project 1: SDK 包结构与 exports" ;;
    2) echo "Project 2: SDK tsconfig paths" ;;
    3) echo "Project 3: App 包结构与 Webpack" ;;
    4) echo "Project 4: App tsconfig references" ;;
    5) echo "Project 5: TypeScriptAliasPlugin" ;;
    6) echo "Project 6: SDK 构建工具替换" ;;
    7) echo "Project 7: 端到端验收" ;;
    *) echo "Project $1" ;;
  esac
}

# 主流程
IDS=($(parse_arg "${1:-0}"))
ALL_PASS=0

echo ""
echo "========== 检测结果 =========="
echo ""

for id in "${IDS[@]}"; do
  name=$(name_for "$id")
  script="$SCRIPT_DIR/check-project-${id}.sh"
  if [ ! -f "$script" ]; then
    echo "✗ $name - 未通过"
    echo "  加载失败: 缺少 check-project-${id}.sh"
    echo ""
    ALL_PASS=1
    continue
  fi
  out=$("$script" 2>&1) || true
  first_line="${out%%$'\n'*}"
  rest="${out#*$'\n'}"

  if [ "$first_line" = "PASS" ]; then
    echo "✓ $name - 通过"
  else
    echo "✗ $name - 未通过"
    ALL_PASS=1
  fi
  while IFS= read -r line; do
    [ -n "$line" ] && echo "  $line"
  done <<< "$rest"
  echo ""
done

echo "=============================="
echo ""
if [ $ALL_PASS -eq 0 ]; then
  echo "全部通过 ✓"
else
  echo "存在未通过项 ✗"
fi
echo ""

exit $ALL_PASS
