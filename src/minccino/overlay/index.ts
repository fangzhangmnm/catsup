// minccino/overlay/ —— 叠加层契约（骨架稿 v2 不变量 7：编辑器画的「第五样东西」——选中 / 悬停 / 吸附 / 锁轴线 / 面点 / 尺规 / gizmo；
// 屏幕空间恒定大小 + 深度感知 + 文字 + 永远在上的开关；风格可认领选中色）。
// 分工：**内容归编辑器**（哪几段线、什么颜色、什么键），**量尺归引擎**（OverlayCtx：一像素多长、视野多远、相机的右 / 上 / 前——XR 里按角尺寸、桌面按深度，
// 编辑器不用知道是哪种），**画归后端**（LINE_STYLES 表里的材质参数）。created 2026-10-29 by Claude Fable 5.1（步 6a：线段族；点 / 标记 / 文字 / 选中高亮 = 6b / 6c）
import type { Vec3 } from "../contract/geometry.ts";

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
export type OverlayItem = OverlayLines;

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
}
const HINT_PX = 1.2, ARC_PX = 2.5, SOFT_EDGE_PX = 1;
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
} as const satisfies Record<string, LineStyle>;
export type LineStyleId = keyof typeof LINE_STYLES;

/** 0xRRGGBB → 线性空间 rgb（= three Color.setHex 在默认色彩管理下的值；公式和 three ColorManagement.SRGBToLinear 逐字一样，结果位级相同）。 */
export function hexToLinear(hex: number): [number, number, number] {
  const f = (c: number): number => (c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4));
  return [f(((hex >> 16) & 255) / 255), f(((hex >> 8) & 255) / 255), f((hex & 255) / 255)];
}
