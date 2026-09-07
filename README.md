# CatsUp

肥皂膜建模：画线成面，推拉成体。一个 SketchUp 式的开源网页建模器（PWA），iPad 一等公民。
created 2026-09-06 by Claude Fable 5.1（公开工坊道首日；内容由 user 过目后修订）

- **开发版（随 main 更新）**：https://fangzhangmnm.github.io/catsup/dev/
- 正式版：尚未发布（0.3 纪元，无持久化，模型只活在内存里；OBJ 是唯一逃生口）

## 现状（as-of v0.3.0 / 2026-09-06）

- 几何内核 = 肥皂膜五公理（`src/kernel/`，立宪页 `ai-docs/20260902-kernel-constitution.md`）：画线、矩形、移动（sticky geometry）、推拉（覆盖代数 XOR）、橡皮；face-finding 与膜生命周期事件全自动。
- 对齐引擎（`src/editor/solver.ts`）：端点/中点/边上/原点/轴/共轴/交点/交线，屏幕像素 ε，膜遮挡过滤，pp 双通道吸附。
- 渲染：three（vendored）Workbench 雏形，透视/正交两制。
- 这是一个**公开工坊**：`ai-docs/` 是 AI 时代的 source，与代码一起公开；`journals/` 是人类区，不进仓。

## 跑起来

```
npm install          # 只为 tsc 类型门；运行时零 npm 依赖
npm test             # node 24 直跑 test/
bash scripts/build.sh
python3 -m http.server 8765   # 开 http://localhost:8765/
```

## 读什么

1. `CLAUDE.md`（仓库纪律、纪元、上线道）
2. `ai-docs/20260902-kernel-constitution.md`（改核心必回写）
3. `ai-docs/20260906-app-shell-epoch-landing.md`（0.3 落地 + 遗留清单）
4. `ai-docs/20260906-far-horizon-golden-format-and-ontology.md`（远景与格式判断）

License：MIT（与 WeebPaint 对齐，user 2026-09-06 拍板；见 `LICENSE`）。three.js 与图标库各自 MIT/ISC，见 `src/vendor/three/LICENSE` 与 `assets/icons.svg` 头注释。
