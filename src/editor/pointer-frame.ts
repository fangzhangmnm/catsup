// pointer-frame.ts —— 指针帧：对齐引擎 / 拾取唯一认识的「指针」形状（A2 分层重构①，2026-09-07 落地）。
// created 2026-09-07 by Claude Fable 5.1
//
// 求解器的核心本来就是 **射线 + 角距**（ε = 视口高度分数 ≡ 角度分数，见 solver.ts REF_VP_H）：
// 桌面屏幕只是「射线发生器 + 角度尺」的一个实例（OrbitCamera），VR 控制器是第二个实例（XRPointerFrame：
// 控制器射线 + 射线周围的角度空间当 800 px 高的虚拟屏）。user 2026-09-07：「不维护两套：为什么不是 2d mode 用射线的语义？」
// —— 所以接口用射线词汇，不叫 ViewProjection / worldToScreen（桌面味）。
//
// 契约（solver / pick 只用这四个）：
//   ray(x, y, vp)      过角度尺上 (x, y) px 的射线；(x, y) = 光标时就是指针射线本身。
//   angularPx(p, vp)   世界点在角度尺上的 px 坐标（桌面 = 屏幕像素；VR = 虚拟屏像素）。屏距 = ε 的量纲。
//   viewDir(p)         从 p 望向眼/发射点的单位方向（遮挡判定用；正交 = 常向量）。
//   forward()          指针前向（平面挑选的「面向度」用）。
// 数值零变化：OrbitCamera 的实现就是原 worldToScreen / screenRay / viewDirAt 改名。

import type { Pt3 } from "../kernel/kernel.ts";

export interface Viewport { w: number; h: number; }
export interface Ray { origin: Pt3; dir: Pt3; }
export interface ScreenPt { x: number; y: number; }

export interface PointerFrame {
  ray(x: number, y: number, vp: Viewport): Ray;
  angularPx(p: Pt3, vp: Viewport): ScreenPt;
  viewDir(p: Pt3): Pt3;
  forward(): Pt3;
}
