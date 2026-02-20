# 公共工具函数，供 check-project-*.sh 使用
# 使用前: ROOT="$(cd "$(dirname "$0")/../.." && pwd)" 或 source 本文件后设置 ROOT

file_exists() {
  [ -f "$1" ]
}

# 检查文件内容是否包含某模式（grep -q）
file_contains() {
  file_exists "$1" && grep -q "$2" "$1"
}

# 执行命令，返回码 0 为成功。用法: run_cmd "pnpm list @monorepo/sdk -r"
run_cmd() {
  (
    if [ -n "$ROOT" ]; then cd "$ROOT" || true; fi
    "$@"
  )
}

# 执行命令并捕获输出与退出码。退出码在 RUN_CMD_EXIT 中（调用方需先 unset RUN_CMD_EXIT）
run_cmd_capture() {
  RUN_CMD_EXIT=0
  RUN_CMD_OUTPUT=""
  if [ -n "$ROOT" ]; then
    RUN_CMD_OUTPUT=$(cd "$ROOT" && "$@" 2>&1) || RUN_CMD_EXIT=$?
  else
    RUN_CMD_OUTPUT=$("$@" 2>&1) || RUN_CMD_EXIT=$?
  fi
  return $RUN_CMD_EXIT
}
