// minccino/overlay/ —— 叠加层契约（骨架稿 v2 不变量 7：编辑器 / 玩家 / 游戏画的「第五样东西」——辅助几何；屏幕空间恒定大小 + 深度感知 + 永远在上的开关）。
// 分工：**内容归提交方**（哪几段线、什么颜色、什么键），**量尺归引擎**（OverlayCtx：一像素多长、视野多远、相机的右 / 上 / 前——XR 里按角尺寸、桌面按深度，
// 提交方不用知道是哪种），**画归后端**。created 2026-10-29 by Claude Fable 5.1（步 6a / 6b / 6c）
//
// 窄接口（刀 a，v0.17.17；user 10-29「小仓鼠不应该认识编辑器。它只认识最少的东西，不应该有graphics.drawgizmosline这种东西，接口要窄！」）：
// 引擎这边**没有样式表、没有编辑器的名字**（以前的 LINE_STYLES 是 lock / gizmo / protractor… 一张编辑器词表）。每个 item 自带几个 GL 层面的画法参数：
// 线宽 / 点大小、深度模式（visible 测深度并前拉 · through 压最上 · hidden 只画被挡住的那段）、透明度、叠放次序（layer）。
// 「锁轴线 = 细 · 压最上 · 0.75」这种话留在提交方自己的表里（src/editor/overlay-lines.ts LOOK）。设计稿 ai-docs/20261029-narrow-interface-design.md。
import type { Vec3 } from "../contract/geometry.ts";

/** 深度模式（GL 概念）：visible = 测深度 + 前拉（共面时线赢面）；through = 不测、压在最上；hidden = 深度**大于**才画 = 只画被挡住的那段（隐线，T73）。 */
export type DepthMode = "visible" | "through" | "hidden";

/** 一组线段（世界坐标，a b 成对）；颜色 = 每顶点线性空间 rgb（null = 用 color 整组一色）；key 没变 = 后端不重建几何。 */
export interface OverlayLines {
  readonly kind: "lines";
  readonly id: string;
  readonly key: string;
  readonly positions: readonly number[];
  readonly colors: readonly number[] | null;
  /** 整组一色（colors = null 时）；每帧可变、不进 key。 */
  readonly color?: number;
  /** 线宽（CSS px；后端按设备像素比折算）；`"edge"` = 跟线稿粗细走（断口小垂线那种「鼓包」）。 */
  readonly widthPx: number | "edge";
  readonly depth: DepthMode;
  /** < 1 = 半透明。 */
  readonly alpha?: number;
  /** 叠放次序（大的后画）；默认 0。 */
  readonly layer?: number;
  /** through 默认不写深度；要写 = true。 */
  readonly depthWrite?: boolean;
  /** 不另建材质，用后端自己的边线材质（线宽跟线稿粗细走、SU 轮廓线 shader、X 光下换透视那份）；widthPx / depth 只是说明。 */
  readonly shared?: "edge";
}
/** 一组点（世界坐标）；sizePx = CSS px；shape 圆 / 方；pull = 往相机拉的系数（null = 不拉）；color null = 每点一色（colors，**sRGB 浮点**，点的 shader 直接出）。 */
export interface OverlayPoints {
  readonly kind: "points";
  readonly id: string;
  readonly key: string;
  readonly positions: readonly number[];
  readonly colors?: readonly number[] | null;
  readonly sizePx: number;
  readonly shape: "round" | "square";
  readonly pull: number | null;
  readonly color: number | null;
  readonly depth: "visible" | "through";
  readonly alpha?: number;
  readonly layer?: number;
}
export type MarkerGeom = "sphere" | "sphereHalf" | "box" | "cone" | "ring" | "plane";
/** 一个实心标记：几何形状 + 位置 + 缩放 + 颜色 + 朝向（朝向的矩阵数学归后端：upTo = 让 +Y 指向 dir；basis = 按三根轴摆）。每帧可变。 */
export interface OverlayMarker {
  readonly kind: "marker";
  readonly id: string;
  readonly geom: MarkerGeom;
  readonly at: Vec3;
  readonly scale: number | Vec3;
  readonly color: number;
  readonly orient?: { readonly kind: "upTo"; readonly dir: Vec3 } | { readonly kind: "basis"; readonly x: Vec3; readonly y: Vec3; readonly z: Vec3 };
  readonly depth: "visible" | "through";
  readonly depthWrite?: boolean;
  readonly alpha?: number;
  readonly doubleSide?: boolean;
  readonly layer?: number;
}
/** 一组三角（世界坐标，每 3 个点一个）；key 没变不重建。 */
export interface OverlayTris {
  readonly kind: "tris";
  readonly id: string;
  readonly key: string;
  readonly positions: readonly number[];
  readonly color: number;
  readonly alpha?: number;
  readonly doubleSide?: boolean;
  readonly depth: "visible" | "through";
  readonly layer?: number;
}
/** 一块文字：挂在 3D 某一点、固定屏幕大小（排版 / 光栅化归后端 label-raster）。刀 e 退役（文字 = 折线）。 */
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
export type OverlayItem = OverlayLines | OverlayPoints | OverlayMarker | OverlayTris | OverlayLabel;

/** 引擎给提交方的量尺：都按当前视图（XR = HMD 位置 + 角尺寸；桌面 = 相机深度 / 正交半高）。 */
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

/** 0xRRGGBB → 线性空间 rgb（= three Color.setHex 在默认色彩管理下的值；公式和 three ColorManagement.SRGBToLinear 逐字一样，结果位级相同）。 */
export function hexToLinear(hex: number): [number, number, number] {
  const f = (c: number): number => (c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4));
  return [f(((hex >> 16) & 255) / 255), f(((hex >> 8) & 255) / 255), f((hex & 255) / 255)];
}
