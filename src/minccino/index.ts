// minccino/index.ts —— 引擎的门牌（边界标准：外面只从这里 import；three 关在 backend/three/）。created 2026-10-29 by Claude Fable 5.1
export type { Vec3, Xform12, Mat4 } from "./contract/geometry.ts";
export { IDENTITY_XFORM } from "./contract/geometry.ts";
export type { Chunk, ChunkKind, ChunkArray, ChunkAttr, ChunkDirty, MaterialRef, Placement, FrustumBand, PullBudget, StreamQuery, StreamFrame, StreamProvider } from "./contract/stream.ts";
export type { View, ViewCamera, RenderTarget, ViewBudget, QualityTier, BackgroundBudget } from "./contract/view.ts";
export { DEFAULT_VIEW_BUDGET } from "./contract/view.ts";
export type { Measurement, CostTable, DegradeStep, BackendCaps } from "./contract/cost.ts";
export type { PassDecl, FramePlan } from "./graph/frame-graph.ts";
export { planFrame } from "./graph/frame-graph.ts";
export type { Backend } from "./backend/backend.ts";
export type { OverlayItem, OverlayLines, OverlayPoints, OverlayMarker, OverlayTris, OverlayLabel, OverlayCtx, LineStyle as OverlayLineStyle, LineStyleId, PointStyle, PointStyleId, MarkerStyle, MarkerStyleId, TrisStyle, TrisStyleId } from "./overlay/index.ts";
export { LINE_STYLES, POINT_STYLES, MARKER_STYLES, TRIS_STYLES, hexToLinear } from "./overlay/index.ts";
