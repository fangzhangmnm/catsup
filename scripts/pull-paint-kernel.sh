#!/usr/bin/env bash
# pull-paint-kernel.sh —— 把画画内核从 WeebPaint 的某个提交原样拷进 src/paint/kernel/（贴图主线 0-1；created 2026-11-10 by Claude Opus 5.5）。
#
#   bash scripts/pull-paint-kernel.sh <WeebPaint 的提交>      （画画仓默认 = ../20260524 WeebPaint；WEEBPAINT_REPO=<路径> 可改）
#
# 规矩（施工单 ai-docs/20261110-paint-workorders-1.md 0-1）：
#   · 只按提交读画画仓（git archive），不读那边的工作目录——那边签出的是什么、有没有没提交的改动，都不影响拷出来的东西。
#   · 拷什么 = 那个提交里的 test/kernel-tests.json（内核范围 + 第三方库文件 + 测试辅助 + 内核自己的测试），相对位置原样
#     （src/paint/kernel/ 当成一个小「仓根」：内核文件里的相对 import 一个字都不用改）。
#   · 写 src/paint/kernel/KERNEL-MANIFEST.json：来源提交、画画版本、每个文件的 sha256。守卫 test/paint-kernel-guard.test.ts 只拿它对仓内的文件（不读画画仓）。
#   · 内核只在画画仓改；这里的文件手改了哈希守卫就红。要收新内核 = 用新提交号再跑一遍本脚本。
set -euo pipefail
COMMIT="${1:?usage: bash scripts/pull-paint-kernel.sh <WeebPaint commit>}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WP="${WEEBPAINT_REPO:-$HERE/../20260524 WeebPaint}"
# 在副本文件夹（.claude/worktrees/…）里跑时，../20260524 WeebPaint 不存在：往上找到家族根再找
if [ ! -d "$WP/.git" ] && [ ! -f "$WP/.git" ]; then
  d="$HERE"; while [ "$d" != "/" ]; do if [ -d "$d/20260524 WeebPaint" ]; then WP="$d/20260524 WeebPaint"; break; fi; d="$(dirname "$d")"; done
fi
git -C "$WP" rev-parse --verify --quiet "$COMMIT^{commit}" >/dev/null || { echo "[pull-paint-kernel] ✗ $WP 里没有提交 $COMMIT" >&2; exit 1; }
SHA="$(git -C "$WP" rev-parse "$COMMIT^{commit}")"
LIST_JSON="$(git -C "$WP" show "$SHA:test/kernel-tests.json")"
VERSION="$(git -C "$WP" show "$SHA:src/version.ts" | sed -n 's/.*WEEBPAINT_VERSION = "\([^"]*\)".*/\1/p')"
# 要拷的路径（kernelDirs 整个文件夹；excludeDirs 解开后删；其余精确到文件）
mapfile -t PATHS < <(node -e '
  const j = JSON.parse(process.argv[1]);
  for (const p of [...j.kernelDirs, ...j.kernelFiles, ...j.vendor, ...j.helpers, ...j.tests, j.runner, "test/kernel-tests.json"]) console.log(p);
' "$LIST_JSON" | sort -u)
mapfile -t EXCLUDE < <(node -e 'for (const p of JSON.parse(process.argv[1]).excludeDirs) console.log(p);' "$LIST_JSON")

DEST="$HERE/src/paint/kernel"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git -C "$WP" archive --format=tar "$SHA" -- "${PATHS[@]}" | tar -x -C "$TMP"
for e in "${EXCLUDE[@]}"; do rm -rf "$TMP/$e"; done
rm -rf "$DEST"; mkdir -p "$DEST"
cp -a "$TMP/." "$DEST/"
# 清单：每个文件的 sha256（按路径排序；不含清单自己）
node -e '
  const fs = require("fs"), path = require("path"), crypto = require("crypto");
  const [dest, sha, version, wp] = process.argv.slice(1);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = {};
  for (const f of walk(dest).map((x) => path.relative(dest, x).split(path.sep).join("/")).sort()) files[f] = crypto.createHash("sha256").update(fs.readFileSync(path.join(dest, f))).digest("hex");
  const m = { about: "Paint kernel copied verbatim from WeebPaint by scripts/pull-paint-kernel.sh. Do not edit here: change it in WeebPaint, then pull again. test/paint-kernel-guard.test.ts checks every hash.", source: { repo: "WeebPaint", commit: sha, version }, files };
  fs.writeFileSync(path.join(dest, "KERNEL-MANIFEST.json"), JSON.stringify(m, null, 2) + "\n");
  console.log(`[pull-paint-kernel] ✓ ${Object.keys(files).length} 个文件 ← WeebPaint ${version} @ ${sha.slice(0, 7)}（${path.basename(wp)}）`);
' "$DEST" "$SHA" "$VERSION" "$WP"
