// look/aux.ts —— 画风翻译器的辅助几何那一半（窄接口设计稿 §7.1；账本 T124）。created 2026-10-29 by Claude Opus 5.5
// user 10-29「画风翻译器也需要定义辅助几何」「小栗鼠不应该认识gizmos」「原则上一切都得按照渲染分辨率画，然后跳过某一层后处理……都得白名单」。
//
// 三方各说各的话：
//   · 编辑器只说「这是什么」：语义种类（AuxRole，闭集）+ 几何 + 颜色角色（AuxColor，闭集）。没有线宽、深度、层、颜色值。
//   · 这里（画风表）把种类翻成小栗鼠认的 GL 量（线宽 / 深度模式 / 透明度 / 叠放次序 / 点的形状……），把颜色角色翻成颜色值。
//     一张标准表 + 每个画风的覆盖（STYLE_AUX，按小栗鼠的画风 id）。写实 / 线稿 = 标准表原样。
//   · 小栗鼠只认 GL 量，不认识 gizmo / 顶点 / 量角器这些词。
// 一条线想换样子 = 改这里的一行；编辑器里不许出现 GL 量（守卫测试 test/aux-look-guard.test.ts）。
// 第 1 步（v0.17.34）= 纯搬家：表里的值逐字照搬以前编辑器里的 LOOK / DOT / MARK / TRI 和散落的颜色常数。
// 第 2 步（v0.17.35）：没有「叠加层那一遍」了——每行可写 stage（排在后处理之后）/ resolution（原分辨率），**缺省 = 跟内容一起、主分辨率，标准表一行都没写**；
// 世界里的字（空场景的「1 m」）在这里排成折线（stroke-font.ts），引擎不认识文字。
import type { MarkerGeom, OverlayCtx, OverlayItem, OverlayLines, OverlayMarker, OverlayPoints, OverlayTris, Vec3 } from "../minccino/index.ts";
import { PALETTE, PRESETS, hexToLinear } from "../minccino/index.ts";
import { strokeText, textWidthEm } from "./stroke-font.ts";

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
  axisX: PALETTE.axisX, axisY: PALETTE.axisY, axisZ: PALETTE.axisZ,   // 参考轴（小三轴 / 刻度 / 锁轴线 / 轴向吸附）：画风可以换（Tron = 主色调）
  gizmoX: PALETTE.axisX, gizmoY: PALETTE.axisY, gizmoZ: PALETTE.axisZ,   // 变换 gizmo 的 XYZ：操作用的通用语言，不跟画风走
  construct: 0x8b5cf6,      // 构造类：量角器圈、充能点
  chargedExt: 0xd4d0f5,     // 充能边的淡延长线
  mirror: 0x8b5cf6,         // 镜像中缝上的点
  guide: 0x6b7280,          // 参考线 / 参考点
  softEdge: 0x6e6e6e,       // 自由建模的平滑边淡线
  vert: 0x2a2a2a,           // 自由建模的全部顶点
  faceDotOn: 0xd8323a, faceDotOff: 0x545454,   // X 光面点：选中（= 选中红，2026-10-29 选中统一红）/ 没选
  gizmo: 0x2b6cb0, gizmoHot: 0xd97706, gizmoUniform: 0x777777, gizmoCenter: 0x333333,
  angle: 0xd97706,          // 量角器量出来的那根边
  handle: 0x2e8b57, handleHot: 0xd97706,   // 缩放柄
  ok: 0x2e8b57, bad: 0xcc3333,             // 落点 / 胶囊：能放 / 不能放
  // 吸附（SU 的老规矩：端点绿、中点青、在边上红、在面上蓝、推断紫）
  snapEndpoint: 0x2e8b57, snapMid: 0x00a5a5, snapEdge: 0xcc3333, snapFace: 0x2b6cb0, snapInfer: 0x8b5cf6,
  snapIntersect: 0x111111, snapStep: 0xd97706, snapGuide: 0x6b7280, snapGrid: 0x9ca3af,
  labelInk: 0x7a776f,       // 世界里的小字（空场景的「1 m」）
  paper: PALETTE.background,   // 字的底板 = 画布背景（「背景颜色的小字」盖住后面的网格线）；画风有自己的背景色时自动跟它（col()）
} as const;
export type AuxColor = keyof typeof STANDARD_PALETTE;

// ---------------- 语义种类（闭集）→ GL 量 ----------------
/** 每行 = 小栗鼠认的 GL 量；stage / resolution 缺省（= 跟内容一起、主分辨率）就不写——写了就是白名单上的一行（守卫测试逐行打印）。 */
type LineLook = Pick<OverlayLines, "widthPx" | "depth" | "alpha" | "layer" | "depthWrite" | "shared" | "stage" | "resolution">;
type PointLook = Pick<OverlayPoints, "sizePx" | "shape" | "pull" | "depth" | "alpha" | "layer" | "stage" | "resolution">;
type MarkerLook = Pick<OverlayMarker, "geom" | "depth" | "depthWrite" | "alpha" | "doubleSide" | "layer" | "stage" | "resolution">;
type TriLook = Pick<OverlayTris, "alpha" | "doubleSide" | "depth" | "layer" | "stage" | "resolution">;
/** 字：字号（CSS px；主分辨率被下采样时至少 minMainPx 格高）、底板留白（CSS px）、墨色 / 底板色角色。 */
interface TextLook { readonly emPx: number; readonly minMainPx: number; readonly padX: number; readonly padY: number; readonly ink: AuxColor; readonly plate: AuxColor | null }
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
  softEdge: { widthPx: 1, depth: "visible" },   // 平滑边淡线 = 模型的样子
  /** 断口小垂线 / 轴刻度：线宽跟线稿粗细走（鼓包，不是另一种线）。 */
  tick: { widthPx: "edge", depth: "visible" },
  poolAxes: onTop(HINT_PX, 10),
  emptyAxes: onTop(HINT_PX, 10),
  originAxes: onTop(HINT_PX, 10, 0.4),
  lock: onTop(HINT_PX, 11, 0.75),
  planeGizmo: onTop(HINT_PX * 1.5, 11),
  xformGizmo: onTop(HINT_PX * 1.5, 11),
  /** 线块里没有的高亮边（被刮擦 / 检查标的软边）：后端边线自己的材质（shared），定死最后画（layer 2）。 */
  markedEdge: { widthPx: 1.6, depth: "visible", layer: 2, shared: "edge" },
  /** 世界里的字（折线；排版在 translateAux 里）。 */
  text: { widthPx: 1, depth: "visible", layer: 3 },
} as const satisfies Record<string, LineLook>;
// 白名单第一批（2026-10-29 Opus；user「像素里面点应该遮住线，而不是被线遮住」）：顶点类的点排在后处理之后画（stage 1）——还在同一张小图、同一块深度，
// 只是不被像素描边涂成线色、不被 1-bit 抖、不发光。没有后处理的画风里 stage 不起作用（一遍画完，点本来就压在线上面）。
const POINT_LOOKS = {
  selVert: { sizePx: 9, shape: "round", pull: 0.994, depth: "visible", layer: 4, stage: 1 },
  vert: { sizePx: 5, shape: "round", pull: 0.996, depth: "visible", layer: 3, stage: 1 },
  faceDot: { sizePx: 6, shape: "square", pull: null, depth: "through", alpha: 0.9, layer: 5, stage: 1 },   // X 光面点：不被挡
  seam: { sizePx: 7, shape: "round", pull: 0.995, depth: "visible", layer: 3.5, stage: 1 },
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
  /** 字的底板。 */
  textPlate: { doubleSide: true, depth: "visible", layer: 2.9 },
} as const satisfies Record<string, TriLook>;
const TEXT_LOOKS = {
  /** 空场景 X 轴上一格处的「1 m」（以前的位图字样式 scale：11 px、#7a776f、底色 = 背景、留白 3 / 1）。 */
  unitLabel: { emPx: 11, minMainPx: 8, padX: 3, padY: 1, ink: "labelInk", plate: "paper" },
} as const satisfies Record<string, TextLook>;
export type LineRole = keyof typeof LINE_LOOKS;
export type PointRole = keyof typeof POINT_LOOKS;
export type MarkerRole = keyof typeof MARKER_LOOKS;
export type TriRole = keyof typeof TRI_LOOKS;
export type TextRole = keyof typeof TEXT_LOOKS;

// ---------------- 编辑器交过来的语义项 ----------------
/** 一组线段（世界坐标，a b 成对）：colors = 每段一个颜色角色；没给 = 整组 color。 */
export interface AuxLines { readonly kind: "lines"; readonly role: LineRole; readonly id: string; readonly key: string; readonly positions: readonly number[]; readonly colors?: readonly AuxColor[]; readonly color?: AuxColor }
/** 一组点：colors = 每点一个颜色角色；没给 = 整组 color。 */
export interface AuxPoints { readonly kind: "points"; readonly role: PointRole; readonly id: string; readonly key: string; readonly positions: readonly number[]; readonly colors?: readonly AuxColor[]; readonly color?: AuxColor }
export interface AuxMarker { readonly kind: "marker"; readonly role: MarkerRole; readonly id: string; readonly at: OverlayMarker["at"]; readonly scale: OverlayMarker["scale"]; readonly color: AuxColor; readonly orient?: OverlayMarker["orient"] }
export interface AuxTris { readonly kind: "tris"; readonly role: TriRole; readonly id: string; readonly key: string; readonly positions: readonly number[]; readonly color: AuxColor }
/** 世界里的一行字：挂在 at、面朝相机、固定屏幕大小；anchor = 字在点的哪一侧，gapPx = 和点之间留几 CSS px。 */
export interface AuxText { readonly kind: "text"; readonly role: TextRole; readonly id: string; readonly text: string; readonly at: Vec3; readonly anchor: "below" | "above" | "left" | "right" | "center"; readonly gapPx?: number }
export type AuxItem = AuxLines | AuxPoints | AuxMarker | AuxTris | AuxText;

// ---------------- 画风覆盖 ----------------
interface StyleAux {
  readonly palette?: Partial<Record<AuxColor, number>>;
  readonly lines?: Partial<Record<LineRole, Partial<LineLook>>>;
  readonly points?: Partial<Record<PointRole, Partial<PointLook>>>;
  readonly markers?: Partial<Record<MarkerRole, Partial<MarkerLook>>>;
  readonly tris?: Partial<Record<TriRole, Partial<TriLook>>>;
}
/** 画风 id（小栗鼠的预设 id）→ 覆盖。没有的画风 = 标准表原样。 */
const STYLE_AUX: Readonly<Record<string, StyleAux>> = {
  /** Tron：参考轴（小三轴 / 刻度 / 锁轴线）用主色调（user 10-29「tron三色轴换成主色调」；地面的三根在预设 light.axisColors）；gizmo 的 XYZ 照旧红绿蓝。 */
  tron: { palette: { axisX: 0x3fe6ff, axisY: 0x3fe6ff, axisZ: 0x3fe6ff } },
  /** 1-bit 线稿：点排在抖动之后（不被抖），所以它们的颜色直接是墨（不然画布上多出第三种颜色；选中色走画风的标记色，也是墨）。 */
  onebit: { palette: { vert: 0x111111, faceDotOn: 0x111111, faceDotOff: 0x111111, mirror: 0x111111 }, points: { faceDot: { alpha: 1 } } },   // 半透明会混出第三种颜色
};

const NONE: StyleAux = {};
const lin = (hex: number): [number, number, number] => hexToLinear(hex);
const srgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

/** 这个画风里一个颜色角色的值（底板色没被覆盖时跟画风的背景色走）。选中 / 将删 / 检查不在这：引擎每帧算好放在 ctx.status（视口设置 > 画风 > 全局默认、闪已换好），translateAux 直接用。 */
export function auxColor(style: string, c: AuxColor): number {
  const o = (STYLE_AUX[style] ?? NONE).palette?.[c];
  if (o !== undefined) return o;
  if (c === "paper") return (PRESETS as Readonly<Record<string, { light: { background: number | null } }>>)[style]?.light.background ?? STANDARD_PALETTE.paper;
  return STANDARD_PALETTE[c];
}

/** 一行字 → 一组线（折线字）+ 一块底板（两个三角），排在点的哪一侧按 anchor；大小按 CSS px 换成世界长度（这一点处一像素多长），面朝相机。 */
function layoutText(it: AuxText, ctx: OverlayCtx, col: (c: AuxColor) => number, style: string): OverlayItem[] {
  const T: TextLook = TEXT_LOOKS[it.role], wpp = ctx.worldPerPx(it.at), R = ctx.right, U = ctx.up;
  const emPx = Math.max(T.emPx, T.minMainPx * ctx.pixelCss), padX = Math.max(T.padX, ctx.pixelCss), padY = Math.max(T.padY, ctx.pixelCss);
  const w = textWidthEm(it.text) * emPx + padX * 2, h = 0.7 * emPx + padY * 2, gap = it.gapPx ?? 3;
  // 底板左下角（屏幕 px，相对挂点）
  const [x0, y0] = it.anchor === "below" ? [-w / 2, -gap - h] : it.anchor === "above" ? [-w / 2, gap] : it.anchor === "left" ? [-gap - w, -h / 2] : it.anchor === "right" ? [gap, -h / 2] : [-w / 2, -h / 2];
  const at = (x: number, y: number): Vec3 => ({ x: it.at.x + (R.x * x + U.x * y) * wpp, y: it.at.y + (R.y * x + U.y * y) * wpp, z: it.at.z + (R.z * x + U.z * y) * wpp });
  const key = `${it.text}|${emPx}|${wpp.toExponential(3)}|${R.x.toFixed(4)},${R.y.toFixed(4)},${R.z.toFixed(4)}|${U.x.toFixed(4)},${U.y.toFixed(4)},${U.z.toFixed(4)}|${it.at.x},${it.at.y},${it.at.z}|${it.anchor}|${style}`;
  const out: OverlayItem[] = [];
  if (T.plate) {
    const a = at(x0, y0), b = at(x0 + w, y0), c = at(x0 + w, y0 + h), d = at(x0, y0 + h);
    out.push({ kind: "tris", id: `${it.id}/plate`, key, positions: [a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z], color: col(T.plate), ...TRI_LOOKS.textPlate });
  }
  out.push({ kind: "lines", id: it.id, key, positions: strokeText(it.text, at(x0 + padX, y0 + padY), R, U, emPx * wpp), colors: null, color: col(T.ink), ...LINE_LOOKS.text } as OverlayLines);
  return out;
}

/** 编辑器的语义项 → 小栗鼠的辅助几何项（按 ctx.style 这个画风查表；字按 ctx 的量尺排）。键带上画风：换画风 = 颜色可能变了，后端重建。 */
export function translateAux(items: readonly AuxItem[], ctx: OverlayCtx): OverlayItem[] {
  const style = ctx.style, S = STYLE_AUX[style] ?? NONE, st = ctx.status;
  const col = (c: AuxColor): number => (c === "selected" ? st.selected : c === "scrub" ? st.scrub : c === "warn" ? st.warn : auxColor(style, c));   // 状态色 = 引擎那一份（面 / 边的标记材质同一组）
  const bk = `|${st.selected.toString(16)}.${st.scrub.toString(16)}.${st.warn.toString(16)}`;   // 状态色变了（换设置 / 闪的拍）：每顶点色烘在几何里的要换几何
  const out: OverlayItem[] = [];
  for (const it of items) {
    switch (it.kind) {
      case "lines": {
        const look = { ...LINE_LOOKS[it.role], ...S.lines?.[it.role] };
        let colors: number[] | null = null;
        if (it.colors) { colors = []; for (const c of it.colors) { const [r, g, b] = lin(col(c)); colors.push(r, g, b, r, g, b); } }
        out.push({ kind: "lines", id: it.id, key: `${it.key}|${style}${bk}`, positions: it.positions, colors, ...(it.color !== undefined ? { color: col(it.color) } : {}), ...look } as OverlayLines);
        break;
      }
      case "points": {
        const look = { ...POINT_LOOKS[it.role], ...S.points?.[it.role] };
        const colors = it.colors ? it.colors.flatMap((c) => srgb(col(c))) : null;   // 点的 shader 直接出 sRGB
        out.push({ kind: "points", id: it.id, key: `${it.key}|${style}${bk}`, positions: it.positions, colors, color: it.color !== undefined ? col(it.color) : null, ...look } as OverlayPoints);
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
      case "text": out.push(...layoutText(it, ctx, col, style)); break;
    }
  }
  return out;
}
