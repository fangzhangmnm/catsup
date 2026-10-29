// minccino/overlay/ —— 叠加层契约（骨架稿 v2 不变量 7：编辑器画的「第五样东西」——选中 / 悬停 / 吸附 / 锁轴线 / 面点 / 尺规 / gizmo；
// 屏幕空间恒定大小 + 深度感知 + 文字 + 永远在上的开关；风格可认领选中色）。
// 分工：**内容归编辑器**（哪几段线、什么颜色、什么键），**量尺归引擎**（OverlayCtx：一像素多长、视野多远、相机的右 / 上 / 前——XR 里按角尺寸、桌面按深度，
// 编辑器不用知道是哪种），**画归后端**（LINE_STYLES 表里的材质参数）。created 2026-10-29 by Claude Fable 5.1（步 6a：线段族；点 / 标记 / 文字 / 选中高亮 = 6b / 6c）
import type { Vec3 } from "../contract/geometry.ts";
import type { MaterialRef } from "../contract/stream.ts";

/** 一组线段（世界坐标，a b 成对）；颜色 = 每顶点线性空间 rgb（null = 用 color 整组一色）；key 没变 = 后端不重建几何。 */
export interface OverlayLines {
  readonly kind: "lines";
  readonly id: string;
  readonly style: LineStyleId;
  readonly key: string;
  readonly positions: readonly number[];
  readonly colors: readonly number[] | null;
  /** 整组一色（style.vertexColors = false 的那几种）；每帧可变、不进 key。 */
  readonly color?: number;
}
/** 一组点（世界坐标）；style 定大小 / 形状 / 往相机拉多少 / 颜色；faceDot 那种每点一色 = colors（**sRGB 浮点**，点的 shader 直接出，不过色彩管理）。 */
export interface OverlayPoints {
  readonly kind: "points";
  readonly id: string;
  readonly style: PointStyleId;
  readonly key: string;
  readonly positions: readonly number[];
  readonly colors?: readonly number[] | null;
}
/** 一个实心标记（球 / 方块 / 锥 / 环 / 方片）：位置 + 缩放 + 颜色 + 朝向（朝向的矩阵数学归后端：upTo = 让 +Y 指向 dir；basis = 按三根轴摆）。每帧可变、不进 key。 */
export interface OverlayMarker {
  readonly kind: "marker";
  readonly id: string;
  readonly style: MarkerStyleId;
  readonly at: Vec3;
  readonly scale: number | Vec3;
  readonly color: number;
  readonly orient?: { readonly kind: "upTo"; readonly dir: Vec3 } | { readonly kind: "basis"; readonly x: Vec3; readonly y: Vec3; readonly z: Vec3 };
}
/** 一组三角（世界坐标，每 3 个点一个）；key 没变不重建。 */
export interface OverlayTris {
  readonly kind: "tris";
  readonly id: string;
  readonly style: TrisStyleId;
  readonly key: string;
  readonly positions: readonly number[];
}
/** 一块文字：挂在 3D 某一点、固定屏幕大小（排版 / 光栅化归后端 label-raster）。 */
export interface OverlayLabel {
  readonly kind: "label";
  readonly id: string;
  readonly text: string;
  readonly at: Vec3;
  readonly style: "scale";
  readonly anchor?: "below" | "above" | "left" | "right" | "center";
  readonly gapPx?: number;
  readonly occlude?: boolean;
}
/**
 * 面高亮（选中 / 悬停；6c）：三角 + 法线 + 每顶点 sRGB 颜色（膜 shader 直接出，不过色彩管理）。
 * `slot` 给了 = 挂在那个放置槽（Placement.slot）的节点下：**池本地坐标**、和那个槽的面同一个材质同一个深度偏移、画在面之后——GPU 算出的深度逐位相同，
 * 后画的赢 = 换颜色，没有 z-fighting（内容方要给和面本身同一组三角）。`slot = null` = 世界坐标、覆盖层材质压在各槽面上；
 * `material` 给了 = 带贴图的面（世界坐标 + uv；引擎只拿 material 当贴图的钥匙）。key 没变不重建。
 */
export interface OverlayFaces {
  readonly kind: "faces";
  readonly id: string;
  readonly key: string;
  readonly slot: string | null;
  readonly positions: readonly number[];
  readonly normals: readonly number[];
  readonly colors: readonly number[];
  readonly material?: MaterialRef | null;
  readonly uvs?: readonly number[] | null;
}
export type OverlayItem = OverlayLines | OverlayPoints | OverlayMarker | OverlayTris | OverlayLabel | OverlayFaces;

/** 点的样式（= 现状四种 Points 的 shader 参数：CSS px 大小、圆 / 方、往相机拉的系数、颜色 null = 每点一色、不做深度测试、透明度、画序）。 */
export interface PointStyle { readonly sizePx: number; readonly shape: "round" | "square"; readonly pull: number | null; readonly color: number | null; readonly depthTest: boolean; readonly alpha: number; readonly renderOrder: number }
export const POINT_STYLES = {
  selVert: { sizePx: 9, shape: "round", pull: 0.994, color: 0x2b6cb0, depthTest: true, alpha: 1, renderOrder: 4 },      // 选中的点（PALETTE.edgeSelected）
  vert: { sizePx: 5, shape: "round", pull: 0.996, color: 0x2a2a2a, depthTest: true, alpha: 1, renderOrder: 3 },         // 全部顶点（PALETTE.edge）
  faceDot: { sizePx: 6, shape: "square", pull: null, color: null, depthTest: false, alpha: 0.9, renderOrder: 5 },       // X 光面点：每点一色、不被挡
  seam: { sizePx: 7, shape: "round", pull: 0.995, color: 0x8b5cf6, depthTest: true, alpha: 1, renderOrder: 3.5 },      // 镜像中缝上的点（MIRROR_COLOR）
} as const satisfies Record<string, PointStyle>;
export type PointStyleId = keyof typeof POINT_STYLES;

/** 标记的样式（= 现状各 Mesh 的几何 + MeshBasicMaterial 参数）。 */
export interface MarkerStyle { readonly geom: "sphere" | "sphereHalf" | "box" | "cone" | "ring" | "plane"; readonly depthTest: boolean; readonly depthWrite: boolean; readonly transparent: boolean; readonly opacity: number; readonly doubleSide: boolean; readonly renderOrder: number; readonly frustumCulled: boolean }
const onTopMarker = (geom: MarkerStyle["geom"], renderOrder: number, extra: Partial<MarkerStyle> = {}): MarkerStyle => ({ geom, depthTest: false, depthWrite: false, transparent: false, opacity: 1, doubleSide: false, renderOrder, frustumCulled: true, ...extra });
export const MARKER_STYLES = {
  snap: { geom: "sphere", depthTest: true, depthWrite: true, transparent: false, opacity: 1, doubleSide: false, renderOrder: 0, frustumCulled: true },   // 吸附小球（走深度测试）
  landing: { geom: "ring", depthTest: false, depthWrite: true, transparent: true, opacity: 0.85, doubleSide: true, renderOrder: 9, frustumCulled: true },   // teleport 落点环
  handle: onTopMarker("box", 10),                                                       // 缩放柄（14 个小方块）
  xgCube: onTopMarker("box", 12, { frustumCulled: false }),                             // 变换 gizmo：轴上 / 等比 / 中心的块
  xgCenter: onTopMarker("sphereHalf", 12, { frustumCulled: false }),
  xgCone: onTopMarker("cone", 12, { frustumCulled: false }),                            // 箭头锥
  xgPlane: onTopMarker("plane", 12, { transparent: true, opacity: 0.85, doubleSide: true, frustumCulled: false }),   // 平面（双轴）缩放片
} as const satisfies Record<string, MarkerStyle>;
export type MarkerStyleId = keyof typeof MARKER_STYLES;

/** 三角组的样式。 */
export interface TrisStyle { readonly color: number; readonly transparent: boolean; readonly opacity: number; readonly doubleSide: boolean; readonly depthTest: boolean; readonly depthWrite: boolean; readonly renderOrder: number }
export const TRIS_STYLES = {
  gizmoQuad: { color: 0x2b6cb0, transparent: true, opacity: 0.12, doubleSide: true, depthTest: false, depthWrite: false, renderOrder: 10 },   // 平面 gizmo 的半透明方块
} as const satisfies Record<string, TrisStyle>;
export type TrisStyleId = keyof typeof TRIS_STYLES;

/** 引擎给编辑器的量尺：都按当前视图（XR = HMD 位置 + 角尺寸；桌面 = 相机深度 / 正交半高）。 */
export interface OverlayCtx {
  /** 这一点处一个 CSS 像素多长（世界米）。 */
  worldPerPx(p: Vec3): number;
  /** 无限长直线能画多远（过 p、方向 dir）：从离视野中心最近的那点往两边各「视野范围 + 到中心的距离」。 */
  infLine(p: Vec3, dir: Vec3): readonly [Vec3, Vec3];
  /** 无限长线的缓存键（视野范围按对数分档、中心按范围量化）。 */
  reachKey(): string;
  readonly target: Vec3;
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  /** 边线宽（设备像素）和设备像素比（断口小垂线的半长跟边线宽走）。 */
  readonly lineWeightPx: number;
  readonly dpr: number;
}

/** 线的样式（= three LineMaterial 的参数；表的**声明顺序 = 材质创建顺序**，three 画家排序平手时按材质 id——别乱序）。 */
export interface LineStyle {
  readonly widthPx: number;
  readonly vertexColors: boolean;
  readonly offset: boolean;
  readonly depthTest: boolean;
  readonly depthWrite: boolean;
  readonly transparent?: boolean;
  readonly opacity?: number;
  readonly renderOrder: number;
  /** 不另建材质，用后端自己的那份（`"edge"` = 边线材质：线宽跟线稿粗细走、SU 轮廓线 shader、X 光下换成不做深度测试那份）。widthPx 等只是说明。 */
  readonly shared?: "edge";
}
const HINT_PX = 1.2, ARC_PX = 2.5, SOFT_EDGE_PX = 1, EDGE_PX = 1.6;
const plain = (widthPx: number, vertexColors = true): LineStyle => ({ widthPx, vertexColors, offset: true, depthTest: true, depthWrite: true, renderOrder: 0 });
const onTop = (widthPx: number, renderOrder: number, extra: Partial<LineStyle> = {}): LineStyle => ({ widthPx, vertexColors: true, offset: false, depthTest: false, depthWrite: false, renderOrder, ...extra });
export const LINE_STYLES = {
  hint: plain(HINT_PX),
  arc: plain(ARC_PX, false),
  capsule: { widthPx: ARC_PX, vertexColors: false, offset: false, depthTest: false, depthWrite: true, renderOrder: 9 } satisfies LineStyle,
  protractor: plain(HINT_PX),
  guide: plain(HINT_PX),
  tape: plain(HINT_PX),
  knife: onTop(HINT_PX + 0.5, 10),
  charged: plain(HINT_PX),
  soft: plain(SOFT_EDGE_PX),
  tick: plain(HINT_PX),
  poolAxes: onTop(HINT_PX, 10),
  emptyAxes: onTop(HINT_PX, 10),
  originAxes: onTop(HINT_PX, 10, { transparent: true, opacity: 0.4 }),
  lock: onTop(HINT_PX, 11, { transparent: true, opacity: 0.75 }),
  gizmo: onTop(HINT_PX * 1.5, 11),
  xg: onTop(HINT_PX * 1.5, 11),
  /** 选中 / 刮擦 / 悬停 / 检查的边（6c）：后端边线自己的材质（shared），定死最后画（renderOrder 2）= 盖得住底下同材质的黑边（probe-erase-red）。不建材质 → 不动上面各样式的材质创建顺序。 */
  edge: { widthPx: EDGE_PX, vertexColors: true, offset: true, depthTest: true, depthWrite: true, renderOrder: 2, shared: "edge" },
} as const satisfies Record<string, LineStyle>;
export type LineStyleId = keyof typeof LINE_STYLES;

/** 0xRRGGBB → 线性空间 rgb（= three Color.setHex 在默认色彩管理下的值；公式和 three ColorManagement.SRGBToLinear 逐字一样，结果位级相同）。 */
export function hexToLinear(hex: number): [number, number, number] {
  const f = (c: number): number => (c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4));
  return [f(((hex >> 16) & 255) / 255), f(((hex >> 8) & 255) / 255), f((hex & 255) / 255)];
}
