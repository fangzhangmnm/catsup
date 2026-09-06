#!/usr/bin/env bash
# 唯一版本号在 src/version.ts（esbuild inline 进 bundle）。用法: ./bump.sh v0.3.0-2026-09-06
set -e
NEW="${1:?usage: ./bump.sh vM.m.p-YYYY-MM-DD}"
cd "$(dirname "$0")"
sed -i "s/APP_VERSION = \"[^\"]*\"/APP_VERSION = \"$NEW\"/" src/version.ts
echo "bumped to $NEW:"; grep -H "APP_VERSION" src/version.ts
