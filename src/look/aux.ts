// look/aux.ts —— 画风翻译器的辅助几何那一半（窄接口设计稿 §7.1；账本 T124）。created 2026-10-29 by Claude Opus 5.5
// user 10-29「画风翻译器也需要定义辅助几何」「小栗鼠不应该认识gizmos」「原则上一切都得按照渲染分辨率画，然后跳过某一层后处理……都得白名单」。
//
// 三方各说各的话：
//   · 编辑器只说「这是什么」：语义种类（AuxRole，闭集）+ 几何 + 颜色角色（AuxColor，闭集）。没有线宽、深度、层、颜色值。
//   · 这里（画风表）把种类翻成小栗鼠认的 GL 量（线宽 / 深度模式 / 透明度 / 叠放次序 / 点的形状……），把颜色角色翻成颜色值。
//     一张标准表 + 每个画风的覆盖（STYLE_AUX，按小栗鼠的画风 id）。写实 / 线稿 = 标准表原样。
//   · 小栗鼠只认 GL 量，不认识 gizmo / 顶点 / 量角器这些词。
// 一条线想换样子 = 改这里的一行；编辑器里不许出现 GL 量（守卫测试 test/aux-look-guard.test.ts）。
// 第 1 步（这一版）= 纯搬家：表里的值逐字照搬以前编辑器里的 LOOK / DOT / MARK / TRI 和散落的颜色常数，画面一个像素不变。
import type { MarkerGeom, OverlayItem, OverlayLabel, OverlayLines, OverlayMarker, OverlayPoints, OverlayTris } from "../minccino/index.ts";
import { PALETTE, hexToLinear } from "../minccino/index.ts";

// ---------------- 颜色角色（闭集）→ 颜色值 ----------------
/** 标准色板：每个颜色角色一个值（0xRRGGBB，sRGB）。画风覆盖其中几项（STYLE_AUX.palette）。 */
const STANDARD_PALETTE = {
  ink: 0x111111,            // 黑线（卷尺量线、量角器参考边、交点类吸附）
  neutral: 0x888888,        // 不属于哪根轴的线（锁面时的另一根 / u v）
  disabled: 0x8a8a8a,       // 切不出来的刀线
  edge: PALETTE.edge,       // 断口小垂线（= 边线色）
  selected: PALETTE.edgeSelected,   // 选中（点 / 参考几何 / 刀线可切）
  scrub: PALETTE.edgeHot,   // 刮擦 / 悬停将删
  warn: PALETTE.edgeWarn,   // 检查：微折软边
  axisX: PALETTE.axisX, axisY: PALETTE.axisY, axisZ: PALETTE.axisZ,
  construct: 0x8b5cf6,      // 构造类：量角器圈、充能点
  chargedExt: 0xd4d0f5,     // 充能边的淡延长线
  mirror: 0x8b5cf6,         // 镜像中缝上的点
  guide: 0x6b7280,          // 参考线 / 参考点
  softEdge: 0x6e6e6e,       // 自由建模的平滑边淡线
  vert: 0x2a2a2a,           // 自由建模的全部顶点
  faceDotOn: 0x566cc5, faceDotOff: 0x545454,   // X 光面点：选中 / 没选（以前在编辑器里按 faceSelected × (0.6, 0.6, 0.85) 现算，落到同一个 8 位值）
  gizmo: 0x2b6cb0, gizmoHot: 0xd97706, gizmoUniform: 0x777777, gizmoCenter: 0x333333,
  angle: 0xd97706,          // 量角器量出来的那根边
  handle: 0x2e8b57, handleHot: 0xd97706,   // 缩放柄
  ok: 0x2e8b57, bad: 0xcc3333,             // 落点 / 胶囊：能放 / 不能放
  // 吸附（SU 的老规矩：端点绿、中点青、在边上红、在面上蓝、推断紫）
  snapEndpoint: 0x2e8b57, snapMid: 0x00a5a5, snapEdge: 0xcc3333, snapFace: 0x2b6cb0, snapInfer: 0x8b5cf6,
  snapIntersect: 0x111111, snapStep: 0xd97706, snapGuide: 0x6b7280, snapGrid: 0x9ca3af,
} as const;
export type AuxColor = keyof typeof STANDARD_PALETTE;

// ---------------- 语义种类（闭集）→ GL 量 ----------------
/** 画在哪一步（小栗鼠契约 OverlayLines.pass 等；第 2 步换成 stage / resolution）。 */
type LineLook = Pick<OverlayLines, "widthPx" | "depth" | "alpha" | "layer" | "depthWrite" | "shared" | "pass">;
type PointLook = Pick<OverlayPoints, "sizePx" | "shape" | "pull" | "depth" | "alpha" | "layer" | "pass">;
type MarkerLook = Pick<OverlayMarker, "geom" | "depth" | "depthWrite" | "alpha" | "doubleSide" | "layer">;
type TriLook = Pick<OverlayTris, "alpha" | "doubleSide" | "depth" | "layer">;
const HINT_PX = 1.2, ARC_PX = 2.5;
const plain = (widthPx: number): LineLook => ({ widthPx, depth: "visible" });
const onTop = (widthPx: number, layer: number, alpha?: number): LineLook => (alpha === undefined ? { widthPx, depth: "through", layer } : { widthPx, depth: "through", layer, alpha });
const LINE_LOOKS = {
  snapHint: plain(HINT_PX),
  teleportArc: plain(ARC_PX),
  capsule: { widthPx: ARC_PX, depth: "through", depthWrite: true, layer: 9 },
  protractor: plain(HINT_PX),
  guide: plain(HINT_PX),
  tape: plain(HINT_PX),
  knife: onTop(HINT_PX + 0.5, 10),
  charged: plain(HINT_PX),
  softEdge: { widthPx: 1, depth: "visible", pass: "content" },   // 平滑边淡线 = 模型的样子
  /** 断口小垂线 / 轴刻度：线宽跟线稿粗细走（鼓包，不是另一种线）。 */
  tick: { widthPx: "edge", depth: "visible" },
  poolAxes: onTop(HINT_PX, 10),
  emptyAxes: onTop(HINT_PX, 10),
  originAxes: onTop(HINT_PX, 10, 0.4),
  lock: onTop(HINT_PX, 11, 0.75),
  planeGizmo: onTop(HINT_PX * 1.5, 11),
  xformGizmo: onTop(HINT_PX * 1.5, 11),
  /** 线块里没有的高亮边（被刮擦 / 检查标的软边）：后端边线自己的材质（shared），定死最后画（layer 2）。 */
  markedEdge: { widthPx: 1.6, depth: "visible", layer: 2, shared: "edge", pass: "content" },
} as const satisfies Record<string, LineLook>;
const POINT_LOOKS = {
  selVert: { sizePx: 9, shape: "round", pull: 0.994, depth: "visible", layer: 4, pass: "content" },
  vert: { sizePx: 5, shape: "round", pull: 0.996, depth: "visible", layer: 3, pass: "content" },
  faceDot: { sizePx: 6, shape: "square", pull: null, depth: "through", alpha: 0.9, layer: 5, pass: "content" },   // X 光面点：不被挡
  seam: { sizePx: 7, shape: "round", pull: 0.995, depth: "visible", layer: 3.5, pass: "content" },
} as const satisfies Record<string, PointLook>;
const MARKER_LOOKS = {
  snap: { geom: "sphere", depth: "visible" },
  landing: { geom: "ring", depth: "through", depthWrite: true, alpha: 0.85, doubleSide: true, layer: 9 },
  handle: { geom: "box", depth: "through", layer: 10 },
  xgCube: { geom: "box", depth: "through", layer: 12 },
  xgCenter: { geom: "sphereHalf", depth: "through", layer: 12 },
  xgCone: { geom: "cone", depth: "through", layer: 12 },
  xgPlane: { geom: "plane", depth: "through", alpha: 0.85, doubleSide: true, layer: 12 },
} as const satisfies Record<string, MarkerLook & { geom: MarkerGeom }>;
const TRI_LOOKS = {
  gizmoQuad: { alpha: 0.12, doubleSide: true, depth: "through", layer: 10 },
} as const satisfies Record<string, TriLook>;
export type LineRole = keyof typeof LINE_LOOKS;
export type PointRole = keyof typeof POINT_LOOKS;
export type MarkerRole = keyof typeof MARKER_LOOKS;
export type TriRole = keyof typeof TRI_LOOKS;

// ---------------- 编辑器交过来的语义项 ----------------
/** 一组线段（世界坐标，a b 成对）：colors = 每段一个颜色角色；没给 = 整组 color。 */
export interface AuxLines { readonly kind: "lines"; readonly role: LineRole; readonly id: string; readonly key: string; readonly positions: readonly number[]; readonly colors?: readonly AuxColor[]; readonly color?: AuxColor }
/** 一组点：colors = 每点一个颜色角色；没给 = 整组 color。 */
export interface AuxPoints { readonly kind: "points"; readonly role: PointRole; readonly id: string; readonly key: string; readonly positions: readonly number[]; readonly colors?: readonly AuxColor[]; readonly color?: AuxColor }
export interface AuxMarker { readonly kind: "marker"; readonly role: MarkerRole; readonly id: string; readonly at: OverlayMarker["at"]; readonly scale: OverlayMarker["scale"]; readonly color: AuxColor; readonly orient?: OverlayMarker["orient"] }
export interface AuxTris { readonly kind: "tris"; readonly role: TriRole; readonly id: string; readonly key: string; readonly positions: readonly number[]; readonly color: AuxColor }
/** 世界里的字（第 2 步换成折线字、引擎不再认识文字）。 */
export type AuxLabel = OverlayLabel;
export type AuxItem = AuxLines | AuxPoints | AuxMarker | AuxTris | AuxLabel;

// ---------------- 画风覆盖 ----------------
interface StyleAux {
  readonly palette?: Partial<Record<AuxColor, number>>;
  readonly lines?: Partial<Record<LineRole, Partial<LineLook>>>;
  readonly points?: Partial<Record<PointRole, Partial<PointLook>>>;
  readonly markers?: Partial<Record<MarkerRole, Partial<MarkerLook>>>;
  readonly tris?: Partial<Record<TriRole, Partial<TriLook>>>;
}
/** 画风 id（小栗鼠的预设 id）→ 覆盖。没有的画风 = 标准表原样。 */
const STYLE_AUX: Readonly<Record<string, StyleAux>> = {};

const NONE: StyleAux = {};
const lin = (hex: number): [number, number, number] => hexToLinear(hex);
const srgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

/** 这个画风里一个颜色角色的值。 */
export function auxColor(style: string, c: AuxColor): number { return (STYLE_AUX[style] ?? NONE).palette?.[c] ?? STANDARD_PALETTE[c]; }

/** 编辑器的语义项 → 小栗鼠的叠加层项（按画风查表）。键带上画风：换画风 = 颜色可能变了，后端重建。 */
export function translateAux(items: readonly AuxItem[], style: string): OverlayItem[] {
  const S = STYLE_AUX[style] ?? NONE, col = (c: AuxColor): number => S.palette?.[c] ?? STANDARD_PALETTE[c];
  const out: OverlayItem[] = [];
  for (const it of items) {
    switch (it.kind) {
      case "lines": {
        const look = { ...LINE_LOOKS[it.role], ...S.lines?.[it.role] };
        let colors: number[] | null = null;
        if (it.colors) { colors = []; for (const c of it.colors) { const [r, g, b] = lin(col(c)); colors.push(r, g, b, r, g, b); } }
        out.push({ kind: "lines", id: it.id, key: `${it.key}|${style}`, positions: it.positions, colors, ...(it.color !== undefined ? { color: col(it.color) } : {}), ...look } as OverlayLines);
        break;
      }
      case "points": {
        const look = { ...POINT_LOOKS[it.role], ...S.points?.[it.role] };
        const colors = it.colors ? it.colors.flatMap((c) => srgb(col(c))) : null;   // 点的 shader 直接出 sRGB
        out.push({ kind: "points", id: it.id, key: `${it.key}|${style}`, positions: it.positions, colors, color: it.color !== undefined ? col(it.color) : null, ...look } as OverlayPoints);
        break;
      }
      case "marker": {
        const look = { ...MARKER_LOOKS[it.role], ...S.markers?.[it.role] };
        out.push({ kind: "marker", id: it.id, at: it.at, scale: it.scale, color: col(it.color), ...(it.orient ? { orient: it.orient } : {}), ...look } as OverlayMarker);
        break;
      }
      case "tris": {
        const look = { ...TRI_LOOKS[it.role], ...S.tris?.[it.role] };
        out.push({ kind: "tris", id: it.id, key: `${it.key}|${style}`, positions: it.positions, color: col(it.color), ...look } as OverlayTris);
        break;
      }
      default: out.push(it);
    }
  }
  return out;
}
