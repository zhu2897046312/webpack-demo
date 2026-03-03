#!/bin/bash

# 冗余依赖检查脚本
# 遍历所有 package.json，执行 pnpm why 全量输出

set -e

echo "=========================================="
echo "冗余依赖检查报告"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取所有 package.json 文件
PACKAGE_FILES=(
  "./package.json"
  "./packages/app/package.json"
  "./packages/sdk/package.json"
)

# 如果 plugins 目录下有 package.json，也加入
if [ -f "./plugins/typescript-alias-plugin/package.json" ]; then
  PACKAGE_FILES+=("./plugins/typescript-alias-plugin/package.json")
fi

# 存储所有依赖
declare -A ALL_DEPS

# 提取所有依赖
for pkg_file in "${PACKAGE_FILES[@]}"; do
  if [ ! -f "$pkg_file" ]; then
    continue
  fi
  
  pkg_name=$(node -e "console.log(require('$pkg_file').name || 'root')")
  echo -e "${GREEN}检查包: $pkg_name ($pkg_file)${NC}"
  
  # 提取 dependencies 和 devDependencies
  deps=$(node -e "
    const pkg = require('$pkg_file');
    const deps = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};
    console.log(Object.keys(deps).join(' '));
  " 2>/dev/null || echo "")
  
  if [ -n "$deps" ]; then
    for dep in $deps; do
      # 跳过 workspace 依赖
      if [[ "$dep" == @monorepo/* ]] || [[ "$dep" == workspace:* ]]; then
        continue
      fi
      ALL_DEPS["$dep"]="$pkg_name"
    done
  fi
done

echo ""
echo "=========================================="
echo "开始检查每个依赖的使用情况"
echo "=========================================="
echo ""

# 白名单：根目录的跨包共用依赖，不应被标记为冗余
ROOT_SHARED_DEPS_WHITELIST=("typescript" "@types/node")

# 可疑的冗余依赖
declare -a SUSPICIOUS_DEPS=()

# 对每个依赖执行 pnpm why
for dep in "${!ALL_DEPS[@]}"; do
  echo -e "${YELLOW}检查依赖: $dep${NC}"
  echo "----------------------------------------"
  
  # 检查是否在根目录声明
  declared_in_root=false
  if [[ "${ALL_DEPS[$dep]}" == "webpack-demo-monorepo" ]] || [[ "${ALL_DEPS[$dep]}" == "root" ]]; then
    declared_in_root=true
  fi
  
  # 如果是根目录的跨包共用依赖，跳过冗余检查
  skip_check=false
  for whitelist_dep in "${ROOT_SHARED_DEPS_WHITELIST[@]}"; do
    if [[ "$dep" == "$whitelist_dep" ]] && [[ "$declared_in_root" == "true" ]]; then
      echo -e "${BLUE}ℹ️  跳过检查: 根目录跨包共用依赖（白名单）${NC}"
      echo ""
      skip_check=true
      break
    fi
  done
  
  if [[ "$skip_check" == "true" ]]; then
    continue
  fi
  
  # 执行 pnpm why
  why_output=$(pnpm why "$dep" 2>&1 || echo "ERROR: pnpm why failed")
  
  # 分析输出
  if echo "$why_output" | grep -q "Legend:"; then
    # 计算依赖链长度（通过计算缩进或层级）
    dep_count=$(echo "$why_output" | grep -c "devDependencies:\|dependencies:" || echo "0")
    
    # 检查是否只有自己声明
    if echo "$why_output" | grep -q "devDependencies:" && [ "$dep_count" -le 2 ]; then
      # 检查是否被其他包依赖（改进判断逻辑）
      node_modules_count=$(echo "$why_output" | grep -o "node_modules" | wc -l | tr -d ' ')
      if [ "$node_modules_count" -le 1 ]; then
        # 检查是否只在根目录且没有被其他包使用
        if [[ "$declared_in_root" == "true" ]] && ! echo "$why_output" | grep -q "packages/"; then
          # 根目录的依赖需要更谨慎判断，暂时不标记为冗余
          echo -e "${BLUE}ℹ️  根目录依赖，需要人工确认是否冗余${NC}"
        else
          echo -e "${RED}⚠️  可疑冗余依赖: $dep${NC}"
          SUSPICIOUS_DEPS+=("$dep")
        fi
      fi
    fi
    
    echo "$why_output"
  else
    echo "$why_output"
  fi
  
  echo ""
done

echo ""
echo "=========================================="
echo "可疑冗余依赖汇总"
echo "=========================================="
echo ""

if [ ${#SUSPICIOUS_DEPS[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ 未发现明显的冗余依赖${NC}"
else
  echo -e "${RED}发现 ${#SUSPICIOUS_DEPS[@]} 个可疑的冗余依赖：${NC}"
  for dep in "${SUSPICIOUS_DEPS[@]}"; do
    echo "  - $dep (声明在: ${ALL_DEPS[$dep]})"
  done
  echo ""
  echo "建议："
  echo "1. 全局搜索包名: grep -r \"包名\" --include=\"*.ts\" --include=\"*.tsx\" --include=\"*.js\""
  echo "2. 了解包的作用并判断是否真的需要"
  echo "3. 删除后执行 pnpm install 并运行/打包测试"
fi

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
