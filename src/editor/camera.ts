// camera.ts —— 轨道相机：纯数学、零 three 依赖（用户拍板：3D 库模块解耦慢慢攒，相机独立）。
// 世界约定：z 向上（SU 蓝轴）。渲染适配器（render3.ts）从这里读参数去配 three 的相机；
// 拾取/求解（pick.ts / solver.ts）用这里的 worldToScreen / screenRay / viewDirAt——完全不经过 three。
//
// 投影两制（2026-09-06 user「做 perspective camera 吧」，edited by Claude Fable 5.1）：
//   - ortho：老样子，halfH = 正交半高（世界单位）。测试/探针全部默认此制，数值一字不改。
//   - persp：halfH 语义不变 = **target 深度处**的视野半高；眼距 = halfH / tan(fov/2)。
//     zoom 仍是「改 halfH」（等价于 dolly），pan 的 px→世界换算在 target 深度处与正交完全一致。
//   对齐引擎的模型投影无关（snap-model §7 预留）：屏距 ε 走 worldToScreen，射线走 screenRay，
//   遮挡走 viewDirAt(p)（正交=常向量，透视=p→眼）。
//   **height + aspect 老 GL 约定**（user 2026-09-06）：相机只由「竖直量 + 视口宽高比」定义——透视=fovY（gluPerspective 的 fovy），
//   正交=halfH；横向永远 = 竖直量 × aspect。吸附 ε 因此以视口高度为分母（solver.epsScale），≡ fovY 的角度分数。

import type { Pt3 } from "../kernel/kernel.ts";
import { add3, cross3, dot3, normalize3, scale3, sub3 } from "../kernel/geom.ts";

export interface Viewport { w: number; h: number; }
export type Projection = "ortho" | "persp";

const WORLD_UP: Pt3 = { x: 0, y: 0, z: 1 };
const EYE_DIST_ORTHO = 5000; // 正交下 eye 距离只影响 near/far 布置
const NEAR_MIN = 0.5;        // 透视：眼前的点投影退化，near 之内一律钳到 near（不产生 NaN）

export class OrbitCamera {
  target: Pt3 = { x: 0, y: 0, z: 0 };
  yaw = -Math.PI / 4;          // 绕 z
  pitch = Math.PI / 6;         // 从地平线抬头
  halfH = 300;                 // 视野半高（世界单位，target 深度处）——zoom 就是改它
  projection: Projection = "ortho";
  fovY = (50 * Math.PI) / 180; // 透视竖直视场角（SU 默认 35° 偏窄；50° 更像 Blender 默认镜头）

  /** target→eye 方向（单位）。 */
  eyeDir(): Pt3 {
    const cp = Math.cos(this.pitch);
    return { x: cp * Math.cos(this.yaw), y: cp * Math.sin(this.yaw), z: Math.sin(this.pitch) };
  }
  /** 眼到 target 的距离（透视=由 halfH 与 fov 推出；正交=常数）。 */
  eyeDist(): number {
    return this.projection === "persp" ? this.halfH / Math.tan(this.fovY / 2) : EYE_DIST_ORTHO;
  }
  eye(): Pt3 { return add3(this.target, scale3(this.eyeDir(), this.eyeDist())); }
  forward(): Pt3 { return scale3(this.eyeDir(), -1); }
  right(): Pt3 { return normalize3(cross3(this.forward(), WORLD_UP)); }
  up(): Pt3 { return cross3(this.right(), this.forward()); }

  /** 从 p 望向眼睛的单位方向（遮挡判定用；正交=eyeDir 常向量）。 */
  viewDirAt(p: Pt3): Pt3 {
    if (this.projection !== "persp") return this.eyeDir();
    return normalize3(sub3(this.eye(), p));
  }

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
  /** 朝光标缩放：target 深度平面上光标下的世界点保持钉在光标下（两制同式）。 */
  zoomAt(f: number, sx: number, sy: number, vp: Viewport): void {
    const wx = ((sx / vp.w) * 2 - 1) * this.halfW(vp);
    const wy = (1 - (sy / vp.h) * 2) * this.halfH;
    const P = add3(add3(this.target, scale3(this.right(), wx)), scale3(this.up(), wy));
    const before = this.halfH;
    this.zoomBy(f);
    const k = this.halfH / before;
    this.target = add3(P, scale3(sub3(this.target, P), k));
  }

  halfW(vp: Viewport): number { return (this.halfH * vp.w) / vp.h; }

  /** 世界 → 屏幕 px。透视：眼前 near 之内的点按 near 深度投影（有限值，不 NaN）。 */
  worldToScreen(p: Pt3, vp: Viewport): { x: number; y: number } {
    if (this.projection === "persp") {
      const rel = sub3(p, this.eye());
      const z = Math.max(dot3(rel, this.forward()), NEAR_MIN);
      const t = Math.tan(this.fovY / 2);
      const sx = dot3(rel, this.right()) / (z * t * (vp.w / vp.h));
      const sy = dot3(rel, this.up()) / (z * t);
      return { x: (sx * 0.5 + 0.5) * vp.w, y: (0.5 - sy * 0.5) * vp.h };
    }
    const rel = sub3(p, this.target);
    const sx = dot3(rel, this.right()) / this.halfW(vp);
    const sy = dot3(rel, this.up()) / this.halfH;
    return { x: (sx * 0.5 + 0.5) * vp.w, y: (0.5 - sy * 0.5) * vp.h };
  }

  /** 屏幕 px → 世界拾取射线（正交：方向恒为 forward；透视：过眼点的发散射线）。 */
  screenRay(x: number, y: number, vp: Viewport): { origin: Pt3; dir: Pt3 } {
    if (this.projection === "persp") {
      const t = Math.tan(this.fovY / 2);
      const nx = ((x / vp.w) * 2 - 1) * t * (vp.w / vp.h);
      const ny = (1 - (y / vp.h) * 2) * t;
      const dir = normalize3(add3(add3(this.forward(), scale3(this.right(), nx)), scale3(this.up(), ny)));
      return { origin: this.eye(), dir };
    }
    const wx = ((x / vp.w) * 2 - 1) * this.halfW(vp);
    const wy = (1 - (y / vp.h) * 2) * this.halfH;
    const origin = add3(add3(this.eye(), scale3(this.right(), wx)), scale3(this.up(), wy));
    return { origin, dir: this.forward() };
  }

  /** 视图预置（SU 视图菜单同款；yaw 以 +X 为 0、逆时针；pitch 正=俯视）。 */
  setView(name: "iso" | "top" | "front" | "right" | "back" | "left"): void {
    switch (name) {
      case "iso": this.yaw = -Math.PI / 4; this.pitch = 0.61; break;
      case "top": this.yaw = -Math.PI / 2; this.pitch = 1.55; break;
      case "front": this.yaw = -Math.PI / 2; this.pitch = 0; break;   // 从 -Y（南）看向 +Y
      case "back": this.yaw = Math.PI / 2; this.pitch = 0; break;
      case "right": this.yaw = 0; this.pitch = 0; break;             // 从 +X 看
      case "left": this.yaw = Math.PI; this.pitch = 0; break;
    }
  }

  /** 缩放到包住一组点（空集=回原点默认尺度）。 */
  fitPoints(pts: readonly Pt3[], vp: Viewport, fallbackHalfH = 220): void {
    if (!pts.length) { this.target = { x: 0, y: 0, z: 0 }; this.halfH = fallbackHalfH; return; }
    let cx = 0, cy = 0, cz = 0;
    for (const p of pts) { cx += p.x; cy += p.y; cz += p.z; }
    this.target = { x: cx / pts.length, y: cy / pts.length, z: cz / pts.length };
    const r = this.right(), u = this.up();
    let ex = 0, ey = 0;
    for (const p of pts) {
      const rel = sub3(p, this.target);
      ex = Math.max(ex, Math.abs(dot3(rel, r)));
      ey = Math.max(ey, Math.abs(dot3(rel, u)));
    }
    const aspect = vp.w / vp.h;
    this.halfH = Math.max(10, Math.max(ey, ex / aspect) * 1.25);
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
