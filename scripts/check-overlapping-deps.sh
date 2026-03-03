#!/bin/bash

# 重叠依赖检查脚本
# 遍历子项目中的 package.json，将与根目录重叠的依赖进行输出

set -e

echo "=========================================="
echo "重叠依赖检查报告"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 根目录 package.json
ROOT_PKG="./package.json"

if [ ! -f "$ROOT_PKG" ]; then
  echo -e "${RED}错误: 找不到根目录 package.json${NC}"
  exit 1
fi

# 提取根目录的依赖
echo -e "${BLUE}提取根目录依赖...${NC}"
ROOT_DEPS=$(node -e "
  const pkg = require('$ROOT_PKG');
  const deps = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};
  console.log(JSON.stringify(deps));
" 2>/dev/null)

# 子项目 package.json 文件
SUB_PACKAGES=(
  "./packages/app/package.json"
  "./packages/sdk/package.json"
)

# 如果 plugins 目录下有 package.json，也加入
if [ -f "./plugins/typescript-alias-plugin/package.json" ]; then
  SUB_PACKAGES+=("./plugins/typescript-alias-plugin/package.json")
fi

echo ""
echo "=========================================="
echo "根目录依赖列表"
echo "=========================================="
echo "$ROOT_DEPS" | node -e "
  const deps = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
  Object.keys(deps).sort().forEach(dep => {
    console.log(\`  - \${dep}: \${deps[dep]}\`);
  });
"

echo ""
echo "=========================================="
echo "检查子项目重叠依赖"
echo "=========================================="
echo ""

# 存储重叠依赖信息
declare -A OVERLAPPING_DEPS

for sub_pkg in "${SUB_PACKAGES[@]}"; do
  if [ ! -f "$sub_pkg" ]; then
    continue
  fi
  
  pkg_name=$(node -e "console.log(require('$sub_pkg').name || 'unknown')" 2>/dev/null || echo "unknown")
  
  echo -e "${YELLOW}检查包: $pkg_name ($sub_pkg)${NC}"
  echo "----------------------------------------"
  
  # 提取子项目的依赖
  sub_deps=$(node -e "
    const pkg = require('$sub_pkg');
    const deps = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};
    console.log(JSON.stringify(deps));
  " 2>/dev/null || echo "{}")
  
  # 检查重叠
  overlapping=$(node -e "
    const rootDeps = $ROOT_DEPS;
    const subDeps = $sub_deps;
    const overlapping = {};
    
    Object.keys(subDeps).forEach(dep => {
      if (rootDeps[dep]) {
        overlapping[dep] = {
          root: rootDeps[dep],
          sub: subDeps[dep]
        };
      }
    });
    
    console.log(JSON.stringify(overlapping));
  " 2>/dev/null || echo "{}")
  
  # 显示重叠依赖
  overlap_count=$(echo "$overlapping" | node -e "
    const obj = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(Object.keys(obj).length);
  " 2>/dev/null || echo "0")
  
  if [ "$overlap_count" -gt 0 ]; then
    echo -e "${RED}发现 $overlap_count 个重叠依赖：${NC}"
    echo "$overlapping" | node -e "
      const obj = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
      Object.keys(obj).sort().forEach(dep => {
        const versions = obj[dep];
        const match = versions.root === versions.sub ? '✅' : '⚠️';
        console.log(\`  \${match} \${dep}\`);
        console.log(\`     根目录: \${versions.root}\`);
        console.log(\`     子项目: \${versions.sub}\`);
      });
    "
    
    # 存储重叠信息
    echo "$overlapping" | node -e "
      const obj = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
      Object.keys(obj).forEach(dep => {
        console.log(\`\${dep}:\${require('$sub_pkg').name}:\${obj[dep].root}:\${obj[dep].sub}\`);
      });
    " | while IFS=':' read -r dep pkg root_ver sub_ver; do
      if [ -z "${OVERLAPPING_DEPS[$dep]}" ]; then
        OVERLAPPING_DEPS["$dep"]="$pkg:$root_ver:$sub_ver"
      else
        OVERLAPPING_DEPS["$dep"]="${OVERLAPPING_DEPS[$dep]}|$pkg:$root_ver:$sub_ver"
      fi
    done
  else
    echo -e "${GREEN}✅ 未发现重叠依赖${NC}"
  fi
  
  echo ""
done

echo ""
echo "=========================================="
echo "重叠依赖汇总与建议"
echo "=========================================="
echo ""

if [ ${#OVERLAPPING_DEPS[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ 所有子项目都没有与根目录重叠的依赖${NC}"
else
  echo -e "${YELLOW}发现 ${#OVERLAPPING_DEPS[@]} 个重叠依赖，建议处理：${NC}"
  echo ""
  echo "处理规则："
  echo "1. 共享开发时依赖 → 全部移到根 package.json（规则第1条）"
  echo "2. 需要强制特定版本的依赖 → 使用 pnpm.overrides（规则第2条）"
  echo "3. 需要发包的工具/类库 → 使用 peerDependencies（规则第3条）"
  echo "4. 运行时依赖（所有子项目都依赖）→ 提升到根 + 在发包包中声明 peer（规则第4条）"
  echo ""
  
  # 生成详细报告
  echo "详细重叠列表："
  for dep in "${!OVERLAPPING_DEPS[@]}"; do
    echo "  - $dep"
    info="${OVERLAPPING_DEPS[$dep]}"
    IFS='|' read -ra entries <<< "$info"
    for entry in "${entries[@]}"; do
      IFS=':' read -r pkg root_ver sub_ver <<< "$entry"
      echo "    在 $pkg: 根目录=$root_ver, 子项目=$sub_ver"
    done
  done
fi

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
