# 输出检测结果
# 用法: report_one 0 PASS "所有检测项通过"
#       report_one 3 FAIL "P3-1: 缺少 webpack.config.js"
# 或逐行: report_one 0 FAIL; echo "  - P0-1: ..."; echo "  - P0-2: ..."

PROJECT_NAMES_0="Project 0: Monorepo 基础结构"
PROJECT_NAMES_1="Project 1: SDK 包结构与 exports"
PROJECT_NAMES_2="Project 2: SDK tsconfig paths"
PROJECT_NAMES_3="Project 3: App 包结构与 Webpack"
PROJECT_NAMES_4="Project 4: App tsconfig references"
PROJECT_NAMES_5="Project 5: TypeScriptAliasPlugin"
PROJECT_NAMES_6="Project 6: SDK 构建工具替换"
PROJECT_NAMES_7="Project 7: 端到端验收"

report_one() {
  local id="$1"
  local status="$2"  # PASS or FAIL
  local name_var="PROJECT_NAMES_${id}"
  local name="${!name_var:-Project $id}"
  if [ "$status" = "PASS" ]; then
    echo ""
    echo "✓ $name - 通过"
  else
    echo ""
    echo "✗ $name - 未通过"
  fi
  shift 2
  while [ $# -gt 0 ]; do
    echo "  $1"
    shift
  done
}

report_header() {
  echo ""
  echo "========== 检测结果 =========="
  echo ""
}

report_footer() {
  echo ""
  echo "=============================="
  echo ""
}

report_summary() {
  if [ "$1" = "0" ]; then
    echo "全部通过 ✓"
  else
    echo "存在未通过项 ✗"
  fi
}
