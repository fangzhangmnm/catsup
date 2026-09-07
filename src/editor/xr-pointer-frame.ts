// xr-pointer-frame.ts —— PointerFrame 的第二个实例：VR 控制器射线 + 射线周围的角度空间当 800 px 高的虚拟屏。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元；snap-model §7 预留、A13 第 5 条）
//
// 对齐引擎数学零改动：ε（px @800 高）≡ 角度分数（solver.ts REF_VP_H 注），所以只要给它一个「射线发生器 + 角度尺」——
//   angularPx(p) = 以控制器为眼、射线为前向、fovY=VIRTUAL_FOV 的透视投影到 800×800 虚拟屏（光标永远在正中 (400,400)）；
//   ray(x,y) = 过虚拟屏像素的射线（(400,400) 就是控制器射线本身）；viewDir(p) = p→控制器（遮挡：射线打得到的才算看得见）。
// VIRTUAL_FOV 决定 ε 的角度大小：10 px @ 800 高 = fov/80 → 80° 时 1°（手持抖动量级）。playtest 可调。

import type { Pt3 } from "../kernel/kernel.ts";
import { add3, cross3, dot3, normalize3, scale3, sub3 } from "../kernel/geom.ts";
import type { PointerFrame, Ray, ScreenPt, Viewport } from "./pointer-frame.ts";

export const XR_VIRTUAL_VP: Viewport = { w: 800, h: 800 };
export const XR_VIRTUAL_FOV = (80 * Math.PI) / 180;
const WORLD_UP: Pt3 = { x: 0, y: 0, z: 1 };

export class XRPointerFrame implements PointerFrame {
  private origin: Pt3 = { x: 0, y: 0, z: 0 };
  private dir: Pt3 = { x: 0, y: 1, z: 0 };
  private rightV: Pt3 = { x: 1, y: 0, z: 0 };
  private upV: Pt3 = { x: 0, y: 0, z: 1 };
  private downDir: Pt3 | null = null;
  fovY = XR_VIRTUAL_FOV;

  /** 每帧喂控制器射线（世界坐标）；upHint = 控制器的上向量（射线近竖直时决定虚拟屏的滚转）。 */
  set(ray: Ray, upHint?: Pt3): void {
    this.origin = ray.origin;
    this.dir = normalize3(ray.dir);
    let r = cross3(this.dir, WORLD_UP);
    if (Math.hypot(r.x, r.y, r.z) < 1e-3) r = cross3(this.dir, upHint ?? { x: 0, y: 1, z: 0 });
    this.rightV = normalize3(r);
    this.upV = cross3(this.rightV, this.dir);
  }
  current(): Ray { return { origin: this.origin, dir: this.dir }; }
  cursor(): ScreenPt { return { x: XR_VIRTUAL_VP.w / 2, y: XR_VIRTUAL_VP.h / 2 }; }

  /** 手势起点登记（travelPx 用）。 */
  markDown(): void { this.downDir = this.dir; }
  /** 自落笔以来射线转过的角度换算成虚拟屏 px（编辑器的「动没动」判据）。 */
  travelPx(): number {
    if (!this.downDir) return 0;
    const c = Math.max(-1, Math.min(1, dot3(this.downDir, this.dir)));
    return (Math.acos(c) / this.fovY) * XR_VIRTUAL_VP.h;
  }

  ray(x: number, y: number, vp: Viewport): Ray {
    const t = Math.tan(this.fovY / 2);
    const nx = ((x / vp.w) * 2 - 1) * t * (vp.w / vp.h);
    const ny = (1 - (y / vp.h) * 2) * t;
    const d = normalize3(add3(add3(this.dir, scale3(this.rightV, nx)), scale3(this.upV, ny)));
    return { origin: this.origin, dir: d };
  }
  angularPx(p: Pt3, vp: Viewport): ScreenPt {
    const rel = sub3(p, this.origin);
    const zRaw = dot3(rel, this.dir);
    // 手后半球（z ≤ 0）的点：透视投影会跑到 1/z 的另一个 branch（镜像到屏上），钳 z 只是把它压到无穷远附近——
    // 2026-09-07 user 真机「会拾取到 1/z 的 z->-z 平面」：直接判「不在屏上」（远点），永不参赛。整个视口平面模型待退役，
    // 见 ai-docs/20260907-vr-input-reflection.md。
    if (zRaw <= 1e-6) return { x: 1e9, y: 1e9 };
    const z = zRaw;
    const t = Math.tan(this.fovY / 2);
    const sx = dot3(rel, this.rightV) / (z * t * (vp.w / vp.h));
    const sy = dot3(rel, this.upV) / (z * t);
    return { x: (sx * 0.5 + 0.5) * vp.w, y: (0.5 - sy * 0.5) * vp.h };
  }
  viewDir(p: Pt3): Pt3 { return normalize3(sub3(this.origin, p)); }
  forward(): Pt3 { return this.dir; }
}
