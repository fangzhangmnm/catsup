#!/usr/bin/env bash
# scripts/push-dist.sh —— **过渡期工具**：把构建产物拼进本仓 `gh-pages` 分支（Pages 从该分支根服务；`/` = prod、`/dev/` = dev）。
# created 2026-09-06 by Claude Fable 5.1；同日 user 拍板改走公开工坊道（源码+ai-docs 全公开，WeebPaint 同款）——
#   正式部署 = .github/workflows/deploy.yml（main→/dev/，prod→/）；它落地（gh 拿到 workflow scope）后本脚本退役、gh-pages 分支删除。
#   硬规则 #5：prod 道必须人类明确指令。
# 用法：bash scripts/push-dist.sh dev    → 推 /dev/（AI 例行，随 build 走）
#       bash scripts/push-dist.sh prod   → 推 /（**必须先获得人类明确指令——AI 永不自行运行**）
# 机制：.site/（gitignored）= 公仓 main 的本地 checkout；只搬 index.html + 静态壳件 + dist/；不重 build、不搬源码/ai-docs/journals。
set -euo pipefail
cd "$(dirname "$0")/.."

LANE="${1:-dev}"
SITE_REPO="fangzhangmnm/catsup"
SITE_BRANCH="gh-pages"
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

# 1-2. 本地 checkout（同仓 gh-pages 分支）
if [ ! -d "$SITE_DIR/.git" ]; then
  rm -rf "$SITE_DIR"
  git clone -q -b "$SITE_BRANCH" "https://github.com/$SITE_REPO.git" "$SITE_DIR" 2>/dev/null || { mkdir -p "$SITE_DIR"; git -C "$SITE_DIR" init -q -b "$SITE_BRANCH"; git -C "$SITE_DIR" remote add origin "https://github.com/$SITE_REPO.git"; }
fi
if git -C "$SITE_DIR" ls-remote --exit-code --heads origin "$SITE_BRANCH" >/dev/null 2>&1; then
  git -C "$SITE_DIR" fetch -q origin "$SITE_BRANCH"
  git -C "$SITE_DIR" checkout -q -B "$SITE_BRANCH" "origin/$SITE_BRANCH"
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

Composed GitHub Pages tree for **CatsUp** (interim, until deploy.yml lands). Source lives on `main`.

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
git -C "$SITE_DIR" push -q -u origin "$SITE_BRANCH"
echo "[site] pushed $LANE $VERSION → https://fangzhangmnm.github.io/catsup/$([ "$LANE" = dev ] && echo dev/)"
echo "[site] Pages 源 = $SITE_BRANCH 分支根（过渡期）"
