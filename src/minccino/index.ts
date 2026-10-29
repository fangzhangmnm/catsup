// minccino/index.ts —— 引擎的门牌（边界标准：外面只从这里 import；three 关在 backend/three/）。created 2026-10-29 by Claude Fable 5.1
export type { Vec3, Xform12, Mat4, Frame3 } from "./contract/geometry.ts";
export { IDENTITY_XFORM, WORLD_FRAME3 } from "./contract/geometry.ts";
export type { Chunk, ChunkKind, ChunkArray, ChunkAttr, ChunkDirty, ChunkSide, ChunkStyle, MaterialRef, Placement, FrustumBand, PullBudget, StreamQuery, StreamFrame, StreamProvider } from "./contract/stream.ts";
export type { View, ViewCamera, RenderTarget, ViewBudget, QualityTier, BackgroundBudget, ViewportSize, CameraSource } from "./contract/view.ts";
export { DEFAULT_VIEW_BUDGET } from "./contract/view.ts";
export type { Measurement, CostTable, DegradeStep, BackendCaps } from "./contract/cost.ts";
export type { PassDecl, FramePlan } from "./graph/frame-graph.ts";
export { planFrame } from "./graph/frame-graph.ts";
export type { Backend, FrameInput, Mark, FaceSlot } from "./backend/backend.ts";
export type { OverlayItem, OverlayLines, OverlayPoints, OverlayMarker, OverlayTris, OverlayLabel, OverlayCtx, DepthMode, MarkerGeom } from "./overlay/index.ts";
export { hexToLinear } from "./overlay/index.ts";
export { PALETTE } from "./palette.ts";
export { NOOP_PERF, type PerfSink } from "./perf.ts";
export { PRESETS, PRESET_IDS, isPresetId, isStyled, presetPasses, type Preset, type PresetId, type PixelOutlinePost, type FlatShade, type AoParams, type TronShade, type BloomPost, type PbrShade, type EnvLight, type SurfaceLayer } from "./preset/index.ts";
export { ENV_RECIPES, SURFACE_RECIPES, type EnvRecipe, type SurfaceRecipe, type EnvRecipeId, type SurfaceRecipeId } from "./paintshop/index.ts";
export { checkBudget, type BudgetReport, type BudgetAxis } from "./budget.ts";
export { initPowerSensing, powerState, onPowerChange, setBatteryAware, type PowerState } from "./device.ts";
export { MaterialRegistry, createMaterialRegistry, BASE_SLOTS, GRADE_SCHOOL_READS, type SemanticMaterial, type ChannelDef, type ChannelValue, type CraftTag, type SlotDef, type SlotValue, type SlotValues, type Translation, type PipelineReads } from "./material/index.ts";
