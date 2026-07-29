#!/usr/bin/env bash
# scripts/build.sh —— playground bundle（Phase 0 无部署：无 dist/、无 content-hash、无 sed index.html）。
# 骨架抄 WebPaint scripts/build.sh（esbuild auto-curl + tsc 门 + grep lint）。
# 用法：编辑 src/ → 跑这个 → 浏览器开 src/playground/index.html（file:// 即可，无 SW）。

set -euo pipefail
cd "$(dirname "$0")/.."

ENTRY="./src/playground/main.ts"
OUT="./src/playground/bundle.js"
ESBUILD_VER="0.24.0"
ESBUILD="./tools/esbuild/esbuild"

# 没 esbuild 自动 curl 一份（tools/ gitignored；tools/=构建工具，区别于运行时 vendor）
if [ ! -x "$ESBUILD" ]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)   plat="linux-x64" ;;
    Linux-aarch64)  plat="linux-arm64" ;;
    Darwin-arm64)   plat="darwin-arm64" ;;
    Darwin-x86_64)  plat="darwin-x64" ;;
    *) echo "[build] 未知平台 $(uname -s)-$(uname -m)，手动放 esbuild 进 $ESBUILD" >&2; exit 1 ;;
  esac
  echo "[build] 拉 esbuild $plat-$ESBUILD_VER..."
  mkdir -p tools/esbuild
  TMP=$(mktemp -d)
  curl -sL "https://registry.npmjs.org/@esbuild/${plat}/-/${plat}-${ESBUILD_VER}.tgz" | tar -xz -C "$TMP"
  mv "$TMP/package/bin/esbuild" "$ESBUILD"
  chmod +x "$ESBUILD"
  rm -rf "$TMP"
fi

# 0. 类型检查门（esbuild 只 strip 不检查；tsc 才是真护栏）。
#    没装 tsc（裸 clone 未 npm i）→ 大声警告但不挡构建；装了就强制过。
TSC="./node_modules/.bin/tsc"
if [ -x "$TSC" ]; then
  echo "[build] 类型检查 tsc --noEmit…"
  "$TSC" --noEmit -p tsconfig.json || { echo "[build] ✗ 类型检查失败，已挡下构建。" >&2; exit 1; }
  echo "[build] ✓ 类型通过"
else
  echo "[build] ⚠ 未装 tsc（node_modules 缺）——跳过类型检查。装一下：npm install" >&2
fi

# 0.5 experiments 隔离 lint（可丢区 write-only：src/、test/ 永不 import experiments/）。
#     零依赖 grep 实现（家族纪律：不为一条规则引 eslint/dep-cruiser）。
echo "[build] experiments 隔离 lint…"
EXP_HITS=$(grep -rnE "(from|import)[[:space:]]*\(?[[:space:]]*['\"][^'\"]*experiments/" src test --include='*.ts' --include='*.mjs' 2>/dev/null || true)
if [ -n "$EXP_HITS" ]; then
  echo "[build] ✗ src/test 不得 import experiments/（可丢区 write-only）：" >&2
  echo "$EXP_HITS" >&2
  exit 1
fi
echo "[build] ✓ experiments 隔离干净"

# 1. bundle（iife，直接 <script src> 引；无 hash——Phase 0 本地开发无缓存问题）
"$ESBUILD" "$ENTRY" \
  --bundle --format=iife --target=es2020 \
  --sourcemap \
  --outfile="$OUT"

size=$(stat -c%s "$OUT" 2>/dev/null || wc -c < "$OUT")
echo "[build] $OUT ($size bytes)"
echo "[build] 完成。浏览器开 src/playground/index.html"
