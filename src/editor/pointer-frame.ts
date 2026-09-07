// pointer-frame.ts —— 指针帧：对齐引擎 / 拾取唯一认识的「指针」形状（A2 分层重构①，2026-09-07 落地；
// **A17 虚拟屏 sunset 2026-09-08：从「坐标图」改成「度量」，edited by Claude Fable 5.1**）。
// created 2026-09-07 by Claude Fable 5.1
//
// 求解器的核心是 **射线 + 距离度量**。它不再看任何屏幕坐标：只问「光标到这个点/这条线段/这个环有多远」「锚点处光标方向与某世界方向
// 的图向夹角」。**单位显式声明**（user 2026-09-08：「可怕的是 implicit unit…不能 implicit 依赖，而不是 explicit defined」）：
//   桌面（OrbitCamera）的度量单位 = **fovY 的 1/800**（视口高度分数 ≡ 竖直视场角分数；user 拍板用 fov 度而不是 css px，大屏 css px 会很大），
//   数值上等于 800 px 高视口里的 px；VR（XRPointerFrame）的度量单位 = **度**（手柄射线周围的球面角距）。
// 两个帧是**同一个基契约的两个实现**（不是 VR 继承桌面）：VR 的容差常量集独立，不被 PC 手感参数劫持。
// **没有虚拟屏**——VR 输入只有 (origin, dir)。user 2026-09-08：「需要投影平面的时候 explicit，no 静默。如果你只能看见 pointer，
// 那么你就只有 origin 和 dir」「每一个有物理意义的参数应该都是从物理意义定义的」。
// 每个帧带自己的容差集（eps）：桌面 px 常量（solver.EPS × vp.h/800）、VR 度常量（xr-pointer-frame.ts EPS_VR_DEG）——两套各自可调、互不牵动。
//
// 契约（solver / pick / editor 只用这些）：
//   ray(x, y, vp)                 过光标的射线（VR：永远是手柄射线，(x, y) 只是光标坐标的名义载体）。
//   distTo(x, y, p, vp)           光标到世界点 p 的度量距离。
//   distToSeg(x, y, a, b, vp, ∞)  光标到线段 [a,b]（∞=无限直线）的度量距离 + 最近参数 t∈[0,1]。
//   distBetween(p, q, vp)         两世界点在度量上的距离（单位法向的「每米多少度量」换算用）。
//   distToRing(x, y, ring, vp)    光标到闭合环的距离：环内 = 0，否则到最近边（近擦膜）。
//   dirCos(x, y, anchor, dirs, vp) 锚点处「光标方向」与各世界方向的图向 |cos|（宽锥三轴）；退化 → null。
//   viewDir(p)                    从 p 望向射线原点的单位方向（遮挡判定；可见性从拿枪的手判）。
//   forward()                     指针前向（平面挑选的「面向度」；VR = 头向）。
//   eps?(vp)                      本帧容差集；缺省 = 桌面 px。

import type { Pt3 } from "../kernel/kernel.ts";

export interface Viewport { w: number; h: number; }
export interface Ray { origin: Pt3; dir: Pt3; }
export interface ScreenPt { x: number; y: number; }

/** 容差集（本帧自己的量纲）：point/edge/line/combo = 求解器候选 ε；hit = 实体拾取；snap = 取点基准；planeNear = 近擦膜；tap/drag = 手势判定。 */
export interface EpsSet {
  point: number; edge: number; line: number; combo: number;
  hit: number; snap: number; planeNear: number; tap: number; drag: number;
}

export interface PointerFrame {
  ray(x: number, y: number, vp: Viewport): Ray;
  distTo(x: number, y: number, p: Pt3, vp: Viewport): number;
  distToSeg(x: number, y: number, a: Pt3, b: Pt3, vp: Viewport, infinite?: boolean): { d: number; t: number };
  distBetween(p: Pt3, q: Pt3, vp: Viewport): number;
  distToRing(x: number, y: number, ring: readonly Pt3[], vp: Viewport): number;
  dirCos(x: number, y: number, anchor: Pt3, dirs: readonly Pt3[], vp: Viewport): (number | null)[];
  viewDir(p: Pt3): Pt3;
  forward(): Pt3;
  eps?(vp: Viewport): EpsSet;
}
