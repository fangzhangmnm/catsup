// camera.ts —— 正交轨道相机：纯数学、零 three 依赖（用户拍板：3D 库模块解耦慢慢攒，相机独立）。
// 世界约定：z 向上（SU 蓝轴）。渲染适配器（render3.ts）从这里读参数去配 three 的相机；
// 拾取（pick.ts）用这里的 worldToScreen / screenRay——拾取完全不经过 three。

import type { Pt3 } from "../kernel/kernel.ts";
import { add3, cross3, dot3, normalize3, scale3, sub3 } from "../kernel/geom.ts";

export interface Viewport { w: number; h: number; }

const WORLD_UP: Pt3 = { x: 0, y: 0, z: 1 };
const EYE_DIST = 5000; // 正交下 eye 距离只影响 near/far 布置

export class OrbitCamera {
  target: Pt3 = { x: 0, y: 0, z: 0 };
  yaw = -Math.PI / 4;          // 绕 z
  pitch = Math.PI / 6;         // 从地平线抬头
  halfH = 300;                 // 正交半高（世界单位）——zoom 就是改它

  /** target→eye 方向（单位）。 */
  eyeDir(): Pt3 {
    const cp = Math.cos(this.pitch);
    return { x: cp * Math.cos(this.yaw), y: cp * Math.sin(this.yaw), z: Math.sin(this.pitch) };
  }
  eye(): Pt3 { return add3(this.target, scale3(this.eyeDir(), EYE_DIST)); }
  forward(): Pt3 { return scale3(this.eyeDir(), -1); }
  right(): Pt3 { return normalize3(cross3(this.forward(), WORLD_UP)); }
  up(): Pt3 { return cross3(this.right(), this.forward()); }

  orbit(dxPx: number, dyPx: number): void {
    this.yaw -= dxPx * 0.008;
    this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch + dyPx * 0.008));
  }
  pan(dxPx: number, dyPx: number, vp: Viewport): void {
    const perPx = (2 * this.halfH) / vp.h;
    this.target = add3(this.target, add3(scale3(this.right(), -dxPx * perPx), scale3(this.up(), dyPx * perPx)));
  }
  zoomBy(f: number): void {
    this.halfH = Math.max(1, Math.min(1e5, this.halfH * f));
  }

  halfW(vp: Viewport): number { return (this.halfH * vp.w) / vp.h; }

  /** 世界 → 屏幕 px（正交投影到 right/up 平面）。 */
  worldToScreen(p: Pt3, vp: Viewport): { x: number; y: number } {
    const rel = sub3(p, this.target);
    const sx = dot3(rel, this.right()) / this.halfW(vp);
    const sy = dot3(rel, this.up()) / this.halfH;
    return { x: (sx * 0.5 + 0.5) * vp.w, y: (0.5 - sy * 0.5) * vp.h };
  }

  /** 屏幕 px → 世界拾取射线（正交：方向恒为 forward）。 */
  screenRay(x: number, y: number, vp: Viewport): { origin: Pt3; dir: Pt3 } {
    const wx = ((x / vp.w) * 2 - 1) * this.halfW(vp);
    const wy = (1 - (y / vp.h) * 2) * this.halfH;
    const origin = add3(add3(this.eye(), scale3(this.right(), wx)), scale3(this.up(), wy));
    return { origin, dir: this.forward() };
  }
}

/** 射线∩平面（n·p=d）；近平行 → null。 */
export function rayPlane(origin: Pt3, dir: Pt3, n: Pt3, d: number): Pt3 | null {
  const denom = dot3(n, dir);
  if (Math.abs(denom) < 1e-9) return null;
  const t = (d - dot3(n, origin)) / denom;
  return add3(origin, scale3(dir, t));
}

/** 过 anchor 沿 axisDir 的直线上，最接近射线 (r0,rd) 的点（两线公垂）；近平行 → null。 */
export function closestOnAxis(anchor: Pt3, axisDir: Pt3, r0: Pt3, rd: Pt3): Pt3 | null {
  const b = dot3(axisDir, rd);
  const denom = 1 - b * b;
  if (Math.abs(denom) < 1e-9) return null;
  const w = sub3(r0, anchor);
  const t = (dot3(w, axisDir) - b * dot3(w, rd)) / denom;
  return add3(anchor, scale3(axisDir, t));
}
