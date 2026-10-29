// editor/render3.ts —— 编辑器到渲染器的转出口（Tron 第一刀步 5 立，6c 收窄；2026-10-29 Claude Fable 5.1）：three 后端本体住 src/minccino/backend/three/render3.ts，
// 编辑器 / app 这边的 import 路径不变。6c 起这个口子只剩三样：后端类（Renderer3 + 线稿粗细 / XR 面）、引擎的调色板、编辑器自己的视图状态与叠加层（ViewState / frameInput /
// overlayItems / faceTriangles / 两个屏幕像素常量都住编辑器侧，引擎不认识它们）。
export { Renderer3, LINE_WEIGHTS, type LineStyle, type XRFacade, type XRHand } from "../minccino/backend/three/render3.ts";
export { PALETTE } from "../minccino/index.ts";
export { type ViewState, frameInput } from "./view-state.ts";
export { overlayItems } from "./overlay.ts";
export { POOL_AXES_PX, LOCK_LINE_SPAN_PX } from "./overlay-lines.ts";
export { faceTriangles } from "./face-triangles.ts";
