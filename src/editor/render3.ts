// editor/render3.ts —— 转出口（Tron 第一刀步 5，2026-10-29 Claude Fable 5.1）：three 后端本体搬进了 src/minccino/backend/three/render3.ts，
// 编辑器 / app 这边的 import 路径不变。步 6 叠加层契约落地后这个口子收窄成「视图 + 叠加层 + 流」三样。
export { Renderer3, PALETTE, LINE_WEIGHTS, POOL_AXES_PX, LOCK_LINE_SPAN_PX, faceTriangles, type ViewState, type LineStyle, type XRFacade, type XRHand } from "../minccino/backend/three/render3.ts";
export { overlayItems } from "./overlay.ts";   // 叠加层（编辑器侧：线 / 点 / 标记 / 三角 / 文字；步 6a / 6b）
