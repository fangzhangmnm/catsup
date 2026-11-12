// gesture-consts.ts —— 工具共用的两个小常量，从 editor.ts 搬出（2026-10-28 Claude Fable 5.1）：工具模块以前为了拿它们运行时 import 编辑器本体，
// 整层工具就没法在 node 里无头加载（立场表守卫 test/stance.test.ts 要加载各工作台的手势模块）。editor.ts 仍转出它们给老调用方。
import type { Pt3 } from "../kernel/geom.ts";
import type { EpsSet, PointerFrame, Viewport } from "./pointer-frame.ts";
import { worldPerPx } from "./plane-gizmo.ts";
import { STICKY_R } from "../kernel/subdivide.ts";
export const SNAP_LABELS: Record<string, string> = {
  endpoint: "端点", midpoint: "中点", "on-edge": "边上", origin: "原点",
  "axis-x": "X 轴", "axis-y": "Y 轴", "axis-z": "Z 轴",
  align: "共轴", "align-combo": "共轴角点", "edge-align": "边上·共轴", intersection: "交点", "cross-line": "交线",
  "h-stop": "高度咬合", "on-face": "面上",
  "on-guide": "参考线上", "guide-point": "参考点", "guide-cross": "参考线交点",
  "grid-point": "格点", increment: "整数长度", "on-extension": "延长线上",
  center: "圆心", "pool-origin": "轴原点",
};

/** 手势最短长度（米）：短于它 = 没动。**正在退役**（统筹 11-12，做小零件：写死 1 厘米 = 放大做毫米零件时什么都拖不出来）——新代码问 gestureMinLen；
 *  剩下的四十来处在下一版逐个换掉（先分类：「手势动没动」→ gestureMinLen；「几何太小不成立」→ 几何容差）。没有屏幕的帧（VR）gestureMinLen 自己退回它。 */
export const MIN_GESTURE_LEN = 0.01;
/**
 * 这一处手势最短算多长（统筹 11-12 定的规矩：拖出来的东西「动没动」按屏幕像素判，不按世界长度）：拖动门槛（eps.drag，屏幕像素）换成 p 这一点的世界长度。
 * 放大看（一格几百像素）它很小，做毫米零件拖得出来；缩小看它大，手抖不会拖出一截。没有屏幕投影的帧（VR）= 退回 MIN_GESTURE_LEN。
 * 只管「拖的这一下算不算动了」；吸到的、取整出来的、键入的数不看它（只要几何上成立）。
 */
export function gestureMinLen(ctx: { frame(): PointerFrame; vp(): Viewport; eps(): EpsSet }, p: Pt3): number {
  const w = worldPerPx(ctx.frame(), ctx.vp(), p);
  return w === null ? MIN_GESTURE_LEN : ctx.eps().drag * w;
}
/** 几何上成立的最短长度 = 内核的身份分辨率（STICKY_R = 3 µm：再短内核也会把两个点并成一个）。吸到的、取整出来的、键入的数只看它（统筹 11-12）。 */
export const GEOM_MIN_LEN = STICKY_R;
/**
 * 这一下够不够长（统筹 11-12 的规矩，B）：光标这一下有吸附结果（点 / 边 / 格点 / 整格……）= 只要几何上成立；自由拖的 = 不到这一处的手势门槛就当没动。
 * snapped 不给 = 问 ctx.currentSnap()（工具都把这一下的吸附结果写进 setSnap）。
 */
export function longEnough(ctx: { frame(): PointerFrame; vp(): Viewport; eps(): EpsSet; currentSnap(): { kind: string | null } | null }, at: Pt3, len: number, snapped?: boolean): boolean {
  return Math.abs(len) >= ((snapped ?? !!ctx.currentSnap()?.kind) ? GEOM_MIN_LEN : gestureMinLen(ctx, at));
}
