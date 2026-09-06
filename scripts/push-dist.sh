#!/usr/bin/env bash
# scripts/push-dist.sh —— 把构建产物推到 site 公仓 catsup（GitHub Pages 从 main 分支根直接服务；无 workflow）。
# created 2026-09-06 by Claude Fable 5.1 —— 家族「site 仓道」首案（家族 CLAUDE.md 家/出货模型：源仓私有，另开公仓只收构建产物；
#   `/` = prod、`/dev/` = dev；硬规则 #5 映射为「push site 仓根必问」）。
# 用法：bash scripts/push-dist.sh dev    → 推 /dev/（AI 例行，随 build 走）
#       bash scripts/push-dist.sh prod   → 推 /（**必须先获得人类明确指令——AI 永不自行运行**）
# 机制：.site/（gitignored）= 公仓 main 的本地 checkout；只搬 index.html + 静态壳件 + dist/；不重 build、不搬源码/ai-docs/journals。
set -euo pipefail
cd "$(dirname "$0")/.."

LANE="${1:-dev}"
SITE_REPO="fangzhangmnm/catsup"
SITE_DIR=".site"
FILES=(index.html styles.css manifest.webmanifest service-worker.js icon-192.png icon-512.png apple-touch-icon-180.png)
DIRS=(dist)

case "$LANE" in dev|prod) ;; *) echo "用法: $0 dev|prod" >&2; exit 2 ;; esac
if [ "$LANE" = prod ] && [ "${CATSUP_PROD_OK:-}" != "yes" ]; then
  echo "✗ push prod = 硬规则 #5：需要人类明确指令。人类批准后：CATSUP_PROD_OK=yes bash scripts/push-dist.sh prod" >&2; exit 3
fi

# 0. 构建新鲜度：index.html 引用的 bundle 必须存在（防 stale bundle 事故，2026-09-02 踩过）
BUNDLE=$(grep -oE 'dist/catsup-[a-z0-9]+\.mjs' index.html | head -1 || true)
[ -n "$BUNDLE" ] && [ -f "$BUNDLE" ] || { echo "✗ index.html 引用的 bundle 不存在（$BUNDLE）——先 bash scripts/build.sh" >&2; exit 1; }
for f in "${FILES[@]}"; do [ -f "$f" ] || { echo "✗ 缺 $f" >&2; exit 1; }; done
VERSION=$(grep -oE 'APP_VERSION = "[^"]+"' src/version.ts | cut -d'"' -f2)
SRC_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "?")

# 1. 公仓存在？没有就建（public，只收产物）
if ! gh repo view "$SITE_REPO" >/dev/null 2>&1; then
  echo "[site] 建公仓 $SITE_REPO…"
  gh repo create "$SITE_REPO" --public --description "CatsUp — build artifacts only (source repo is private). / = prod, /dev/ = dev"
fi

# 2. 本地 checkout
if [ ! -d "$SITE_DIR/.git" ]; then
  rm -rf "$SITE_DIR"
  git clone -q "https://github.com/$SITE_REPO.git" "$SITE_DIR" 2>/dev/null || { mkdir -p "$SITE_DIR"; git -C "$SITE_DIR" init -q -b main; git -C "$SITE_DIR" remote add origin "https://github.com/$SITE_REPO.git"; }
fi
if git -C "$SITE_DIR" ls-remote --exit-code --heads origin main >/dev/null 2>&1; then
  git -C "$SITE_DIR" fetch -q origin main
  git -C "$SITE_DIR" checkout -q -B main origin/main
fi

# 3. 搬产物（只清自己那条道；prod 道不碰 dev/，dev 道不碰根）
if [ "$LANE" = prod ]; then TARGET="$SITE_DIR"; else TARGET="$SITE_DIR/dev"; fi
mkdir -p "$TARGET"
for f in "${FILES[@]}"; do rm -f "$TARGET/$f"; cp "$f" "$TARGET/$f"; done
for d in "${DIRS[@]}"; do rm -rf "$TARGET/$d"; mkdir -p "$TARGET/$d"; cp "$d"/catsup-*.mjs "$TARGET/$d/"; done   # .map 不上线
touch "$SITE_DIR/.nojekyll"
if [ ! -f "$SITE_DIR/README.md" ]; then
  cat > "$SITE_DIR/README.md" <<EOF
# catsup

Build artifacts of **CatsUp** (a soap-film / SketchUp-style web modeler). Until graduation this GitHub repo only receives built output (the source stays private), pushed by \`scripts/push-dist.sh\`.

- \`/\` = prod (none yet)
- \`/dev/\` = dev → https://fangzhangmnm.github.io/catsup/dev/

Do not edit files here by hand.
EOF
fi

# 4. commit + push
git -C "$SITE_DIR" add -A
if git -C "$SITE_DIR" diff --cached --quiet; then echo "[site] 无变化（$LANE 已是 $VERSION $BUNDLE）"; exit 0; fi
git -C "$SITE_DIR" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" commit -q -m "deploy $LANE $VERSION ($BUNDLE, src $SRC_SHA)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git -C "$SITE_DIR" push -q -u origin main
echo "[site] pushed $LANE $VERSION → https://fangzhangmnm.github.io/catsup/$([ "$LANE" = dev ] && echo dev/)"
echo "[site] 首次：若 Pages 未开，跑 gh api -X POST repos/$SITE_REPO/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'"
