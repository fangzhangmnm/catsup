#!/usr/bin/env bash
# scripts/build.sh —— src/app/main.ts → dist/catsup-<hash>.mjs；in-place 改 index.html 引新 hash。
# created by Claude Fable 5 2026-09-01（playground 版）；**0.3 app 壳纪元重写 2026-09-06 by Claude Fable 5.1**（家族 content-hash 形，抄 WebXiaoHeiWu）
# （bundle 名 catsup-；service-worker.js 的 install regex 必须跟它一致。）
# 用法：编辑 src/ → bash scripts/build.sh → git commit；上线走 scripts/push-dist.sh（→ catsup 公仓 /dev/）
set -euo pipefail
cd "$(dirname "$0")/.."

ENTRY="./src/app/main.ts"
OUT_DIR="./dist"
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
  mv "$TMP/package/bin/esbuild" "$ESBUILD"; chmod +x "$ESBUILD"; rm -rf "$TMP"
fi

# 0. 类型检查门（esbuild 只 strip 不检查；tsc 才是真护栏）
TSC="./node_modules/.bin/tsc"
if [ -x "$TSC" ]; then
  echo "[build] 类型检查 tsc --noEmit…"
  "$TSC" --noEmit -p tsconfig.json || { echo "[build] ✗ 类型检查失败，已挡下构建。" >&2; exit 1; }
  echo "[build] ✓ 类型通过"
else
  echo "[build] ⚠ 未装 tsc（node_modules 缺）——跳过类型检查。装一下：npm install" >&2
fi

# 0.5 experiments 隔离 lint（可丢区 write-only：src/、test/ 永不 import experiments/）
echo "[build] experiments 隔离 lint…"
EXP_HITS=$(grep -rnE "(from|import)[[:space:]]*\(?[[:space:]]*['\"][^'\"]*experiments/" src test --include='*.ts' --include='*.mjs' 2>/dev/null || true)
if [ -n "$EXP_HITS" ]; then echo "[build] ✗ src/test 不得 import experiments/：" >&2; echo "$EXP_HITS" >&2; exit 1; fi
echo "[build] ✓ experiments 隔离干净"

# 0.6 ghost-world lint（user 2026-09-03 立法：旧 snapshot 禁入对齐引擎——世界只准经 liveWorld()）
if grep -nE 'snapPoint\(this\.checkpoint|pickEntity\(this\.checkpoint|drawPlaneAt\(this\.checkpoint|rectFirstPlane\(this\.checkpoint|resolveRectPlane\(this\.checkpoint' src/editor/editor.ts; then
  echo "[build] ✗ 旧鬼进对齐引擎（上列行）——世界必须经 liveWorld()" >&2; exit 1
fi
echo "[build] ✓ 对齐引擎无旧鬼"

# 0.7 three 边界 lint：three 只准出现在 src/editor/render3.ts（相机/拾取/求解零 three）
THREE_HITS=$(grep -rlE "from ['\"](three|\.\./vendor/three)" src --include='*.ts' | grep -v "^src/editor/render3.ts" || true)
if [ -n "$THREE_HITS" ]; then echo "[build] ✗ three 越界（只准 src/editor/render3.ts）：" >&2; echo "$THREE_HITS" >&2; exit 1; fi
echo "[build] ✓ three 只在 render3.ts"

# 0.8 图标 sprite 内联对账
python3 scripts/inline-sprites.py --check || { echo "[build] ✗ 图标 sprite 未内联/已陈旧 — 跑: python3 scripts/inline-sprites.py" >&2; exit 1; }

mkdir -p "$OUT_DIR"
TMP_OUT="$OUT_DIR/catsup-tmp.mjs"

# 1. esbuild bundle（three 走 alias 指向 vendored 文件）
"$ESBUILD" "$ENTRY" --bundle --format=esm --target=es2020 --minify --sourcemap=linked --tree-shaking=true \
  --alias:three=./src/vendor/three/three.module.js \
  --outfile="$TMP_OUT"

# 2. content hash → 文件名
HASH=$(sha256sum "$TMP_OUT" | awk '{print substr($1, 1, 12)}')
OUT="$OUT_DIR/catsup-$HASH.mjs"
mv "$TMP_OUT" "$OUT"
mv "$TMP_OUT.map" "$OUT.map"
sed -i "s|sourceMappingURL=$(basename "$TMP_OUT").map|sourceMappingURL=catsup-$HASH.mjs.map|" "$OUT"
find "$OUT_DIR" -maxdepth 1 -name 'catsup-*.mjs' -not -name "catsup-$HASH.mjs" -delete
find "$OUT_DIR" -maxdepth 1 -name 'catsup-*.mjs.map' -not -name "catsup-$HASH.mjs.map" -delete

# 3. index.html 指向新 hash
sed -i -E "s|src=\"\./dist/catsup-[a-z0-9-]+\.mjs\"|src=\"./dist/catsup-$HASH.mjs\"|" index.html
grep -q "catsup-$HASH.mjs" index.html || { echo "[build] ✗ index.html bundle reference not updated" >&2; exit 1; }

echo "[build] $OUT ($(stat -c%s "$OUT") bytes, hash=$HASH)"
echo "[build] 本地看：python3 -m http.server 8765 → http://localhost:8765/"
