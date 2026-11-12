#!/usr/bin/env bash
# scripts/ship-main.sh —— 把一个分支合进 main，推两个远端（github = 开发版 / 公开仓，origin = OneDrive 备份）。created 2026-11-12 by Claude Opus 5.5
# 起因（统筹 11-12 定的规矩：同一类岔子出现第二次就定规矩）：v0.19.67、v0.19.68 两次一模一样——main 上多了别人的提交、快进失败，
#   失败被 `| tail` 吞掉（set -e 只看管道最后一个命令），后面两个 push 照跑，推上去的是 main 原样、自己的版本没上。以后合 + 推只走这个脚本，不手敲命令串。
# 做什么（任何一步不对就停、说清楚差在哪，什么都不推）：
#   1. main 上有别人的提交（常态：统筹随时在 main 上提交文档）→ 先看它们碰没碰随 app 发出去的东西：碰了 = 停（要重新构建、升号）；只是文档 / 测试 / 脚本 = 把分支接到 main 上（rebase）再合。
#   2. 推之前核对：这次要推的里面改了随 app 发出去的东西 → 版本号必须比远端的新，而且升号那个提交之后不许再改随 app 发出去的东西；
#      index.html 指着的包在树里。只改文档 / 测试 / 脚本的不要求升号（家规「版本号约定」：只改文档 / 测试 / 脚本的不升）。
#   3. main 快进到分支 → 推 github → 推 origin。
# 用法：bash scripts/ship-main.sh <分支> [--check]      （在哪个 checkout 里跑都行；分支要 checkout 在某个工作目录里、那里没有没提交的改动）
#   --check = 只核对（含第 1 步的接上），不合、不推。
# 红线组照家族发版规矩另跑（scripts/probe-sweep.mjs --redline --at=<提交>），这个脚本不跑测试。
set -euo pipefail
die() { echo "[ship-main] 停：$*" >&2; exit 1; }
say() { echo "[ship-main] $*"; }
BR="${1:-}"; CHECK="${2:-}"; [ -n "$BR" ] || die "用法：bash scripts/ship-main.sh <分支> [--check]"
[ "$BR" != "main" ] || die "要合的是一个分支，不是 main 自己"
git rev-parse --verify --quiet "refs/heads/$BR" >/dev/null || die "没有分支 $BR"
# 不随 app 发出去的路径（改了它们不要求升号）：文档、测试、脚本、生成的接口头文件、人类区
NONSHIP='^(ai-docs/|test/|scripts/|api/|journals?/|private/)|\.md$'
shipping() { grep -vE "$NONSHIP" || true; }   # 读标准输入：只留随 app 发出去的路径（没有 = 空；grep 一个都没留下的退出码 1 不算失败）

WT="$(git worktree list --porcelain)"
MAIN_DIR="$(printf '%s\n' "$WT" | awk '/^worktree /{print substr($0,10); exit}')"
BR_DIR="$(printf '%s\n' "$WT" | awk -v b="branch refs/heads/$BR" '/^worktree /{w=substr($0,10)} $0==b{print w}')"
[ -n "$BR_DIR" ] || die "分支 $BR 没有 checkout 在任何工作目录里（rebase 要在那里做）"
[ "$(git -C "$MAIN_DIR" rev-parse --abbrev-ref HEAD)" = "main" ] || die "主目录 $MAIN_DIR 现在不在 main 上"
[ -z "$(git -C "$BR_DIR" status --porcelain --untracked-files=no)" ] || die "$BR_DIR 里有没提交的改动，先提交或放回去"

# 远端：github 上的 main 不许比本地 main 新（远端和本地错位 = 家规不许，先弄清楚再说）
git -C "$MAIN_DIR" fetch --quiet github main
[ "$(git rev-list --count main..github/main)" = "0" ] || die "github 上的 main 有本地 main 没有的提交（$(git log --oneline -3 main..github/main | tr '\n' ' ')）：先弄清楚是谁推的"

# 1. main 上有分支没有的提交 → 先接上
EXTRA="$(git rev-list --count "$BR..main")"
if [ "$EXTRA" != "0" ]; then
  say "main 上有 $EXTRA 个分支没有的提交：$(git log --format='%h %s' "$BR..main" | cut -c1-60 | tr '\n' ' ')"
  OTHERS="$(git diff --name-only "$BR...main" | shipping)"
  [ -z "$OTHERS" ] || die "main 上别人的提交改了随 app 发出去的东西（$(echo "$OTHERS" | tr '\n' ' ')）：先接上、重新构建、升号，再来"
  say "它们只碰文档 / 测试 / 脚本 → 把 $BR 接到 main 上"
  git -C "$BR_DIR" rebase --quiet main || { git -C "$BR_DIR" rebase --abort || true; die "rebase 有冲突，已经退回原样：在 $BR_DIR 里手动接上再来"; }
fi
git merge-base --is-ancestor main "$BR" || die "接完之后 main 还不是 $BR 的祖先，快进不了"

# 2. 推之前核对版本号和包
CHANGED="$(git diff --name-only github/main "$BR" | shipping)"
if [ -n "$CHANGED" ]; then
  verOf() { git show "$1:src/version.ts" | grep -o 'APP_VERSION = "[^"]*"' | cut -d'"' -f2; }
  V_OLD="$(verOf github/main)"; V_NEW="$(verOf "$BR")"
  [ "$V_OLD" != "$V_NEW" ] || die "改了随 app 发出去的东西（$(echo "$CHANGED" | head -5 | tr '\n' ' ')…），版本号没升（远端和这次都是 $V_NEW）：先 bash bump.sh 再构建"
  LASTV="$(git log -1 --format=%H "$BR" -- src/version.ts)"
  AFTER="$(git diff --name-only "$LASTV" "$BR" | shipping)"
  [ -z "$AFTER" ] || die "升号那个提交（$(git log -1 --format='%h %s' "$LASTV" | cut -c1-50)）之后又改了随 app 发出去的东西：$(echo "$AFTER" | tr '\n' ' ')——要再升一次号、重新构建"
  BUNDLE="$(git show "$BR:index.html" | grep -o 'dist/catsup-[0-9a-f]*\.mjs' | head -1)"
  [ -n "$BUNDLE" ] || die "index.html 里找不到包"
  git cat-file -e "$BR:$BUNDLE" 2>/dev/null || die "index.html 指着 $BUNDLE，树里没有：先 bash scripts/build.sh 再提交"
  say "随 app 发出去的有改动：$V_OLD → $V_NEW，包 $BUNDLE"
else
  say "这次只改文档 / 测试 / 脚本，不要求升号"
fi

# 3. 合、推
if [ "$CHECK" = "--check" ]; then say "核对都过了（--check：不合、不推）"; exit 0; fi
git -C "$MAIN_DIR" merge --ff-only --quiet "$BR"
say "main 快进到 $(git log -1 --format='%h %s' main | cut -c1-70)"
git -C "$MAIN_DIR" push --quiet github main
git -C "$MAIN_DIR" push --quiet origin main
say "推完：github 和 origin 的 main = $(git rev-parse --short main)"
