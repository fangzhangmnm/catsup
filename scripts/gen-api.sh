#!/usr/bin/env bash
# gen-api.sh —— 家族 API .h ritual（家族 CLAUDE.md「API .h ritual」；参考实现 = WeebPaint scripts/gen-api.sh）：
# api/ = tsc 生成的 .d.ts 纯签名树（C 头文件等价物，给人看）；去掉测试噪音。发版 / 重构交付 / 加大功能时重打。生成物勿手改。
# created 2026-10-26 by Claude Opus 5.5（之前 api/ 是手动跑 tsc 生成的，仓里没脚本）
set -euo pipefail
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
npx tsc -p . --declaration --emitDeclarationOnly --noEmit false --outDir "$tmp"
rm -rf api/src && mkdir -p api && cp -r "$tmp/src" api/src
# 画画内核（src/paint/kernel/）是从画画仓原样拷来的：接口的正本在画画仓的 api/，这里不重复一份（Fable 11-10 审 1-0½）
rm -rf api/src/paint/kernel && { rmdir api/src/paint 2>/dev/null || true; }
rm -rf "$tmp"
echo "[gen-api] api/src ← $(find api/src -name '*.d.ts' | wc -l) 个 .d.ts"
