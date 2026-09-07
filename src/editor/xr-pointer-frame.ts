// xr-pointer-frame.ts —— VR 指针帧：手柄射线 (origin, dir) + 球面角距度量。**没有虚拟屏**（A17 sunset 2026-09-08，edited by Claude Fable 5.1）。
// created 2026-09-07 by Claude Fable 5.1
//
// 度量 = 以射线原点为球心的角距（度）：点 = ∠(dir, p−o)（全球面单值，手后半球自然 > 90°，没有 1/z 的 branch）；线段 = 到大圆弧的
// 球面距离（足点在弧内取 asin|dir·n|，否则取端点）；无限直线 = 到过原点与该直线的大圆的距离；环 = 射线∩环所在平面落在环内 → 0，
// 否则到最近边。方向比较（宽锥三轴）在锚点方向的切平面上做：光标方向与轴方向都取 ⟂ 锚点方向的分量——这就是「拖动角度」在 origin+dir
// 下的良定义。容差集 EPS_VR_DEG 是**独立的角度常量**（user 2026-09-08 调参纪律：不从视场或任何共享旋钮推导），playtest 各自调。
// (x, y) 参数一律忽略：光标坐标只是编辑器状态机的名义载体（XR_NOMINAL_VP 的正中）。

import type { Pt3 } from "../kernel/kernel.ts";
import { add3, cross3, dot3, len3, normalize3, planeBasis, planeFromPoints, pointInRing, projectToPlane, scale3, sub3 } from "../kernel/geom.ts";
import { closestOnAxis, rayPlane } from "./camera.ts";
import type { EpsSet, PointerFrame, Ray, ScreenPt, Viewport } from "./pointer-frame.ts";

/** 光标坐标的名义载体（不是屏幕）：编辑器把指针位置存成 (x, y)，VR 里恒为正中。 */
export const XR_NOMINAL_VP: Viewport = { w: 800, h: 800 };
/** VR 容差集（度）。独立常量，各自 playtest；手柄姿态抖动量级 ≈ 0.5°。 */
export const EPS_VR_DEG: EpsSet = { point: 1.0, edge: 0.7, line: 0.5, combo: 1.2, hit: 1.0, snap: 0.8, planeNear: 2.0, tap: 0.4, drag: 1.2 };
const DEG = 180 / Math.PI;
const clamp1 = (x: number): number => Math.max(-1, Math.min(1, x));
/** 两单位向量夹角（度）：atan2(|a×b|, a·b)——0° 附近比 acos 精确得多。 */
const angBetween = (a: Pt3, b: Pt3): number => Math.atan2(len3(cross3(a, b)), dot3(a, b)) * DEG;

export class XRPointerFrame implements PointerFrame {
  private origin: Pt3 = { x: 0, y: 0, z: 0 };
  private dir: Pt3 = { x: 0, y: 1, z: 0 };
  private headDir: Pt3 | null = null;
  private downDir: Pt3 | null = null;

  /** 每帧喂手柄射线（世界坐标）；headDir = 头显前向（只喂 forward() = 选对齐平面；命中/角距/遮挡全从手）。 */
  set(ray: Ray, _upHint?: Pt3, headDir?: Pt3): void {
    this.headDir = headDir ? normalize3(headDir) : null;
    this.origin = ray.origin;
    this.dir = normalize3(ray.dir);
  }
  current(): Ray { return { origin: this.origin, dir: this.dir }; }
  cursor(): ScreenPt { return { x: XR_NOMINAL_VP.w / 2, y: XR_NOMINAL_VP.h / 2 }; }
  markDown(): void { this.downDir = this.dir; }
  /** 自落笔以来射线转过的角度（度）——编辑器的「动没动」判据（与 eps.tap / eps.drag 同量纲）。 */
  travel(): number {
    if (!this.downDir) return 0;
    return angBetween(this.downDir, this.dir);
  }

  private u(p: Pt3): Pt3 { return normalize3(sub3(p, this.origin)); }
  private angDeg(u: Pt3): number { return angBetween(this.dir, u); }

  ray(_x: number, _y: number, _vp: Viewport): Ray { return { origin: this.origin, dir: this.dir }; }
  distTo(_x: number, _y: number, p: Pt3, _vp?: Viewport): number { return this.angDeg(this.u(p)); }
  distToSeg(_x: number, _y: number, a: Pt3, b: Pt3, _vp: Viewport, infinite = false): { d: number; t: number } {
    const ab = sub3(b, a), abl = len3(ab);
    if (abl < 1e-12) return { d: this.distTo(0, 0, a), t: 0 };
    const abu = scale3(ab, 1 / abl);
    if (infinite) {
      const n = cross3(sub3(a, this.origin), abu);
      const nl = len3(n);
      if (nl < 1e-12) return { d: 0, t: 0 };   // 直线穿过原点：射线就在它的大圆上
      const d = Math.asin(clamp1(Math.abs(dot3(this.dir, n) / nl))) * DEG;
      const q = closestOnAxis(a, abu, this.origin, this.dir);
      return { d, t: q ? dot3(sub3(q, a), abu) / abl : 0 };
    }
    const ua = this.u(a), ub = this.u(b);
    const n = cross3(ua, ub);
    const nl = len3(n);
    const ends = (): { d: number; t: number } => {
      const da = this.angDeg(ua), db = this.angDeg(ub);
      return da <= db ? { d: da, t: 0 } : { d: db, t: 1 };
    };
    if (nl < 1e-9) return ends();
    const nn = scale3(n, 1 / nl);
    const dn = dot3(this.dir, nn);
    const f = sub3(this.dir, scale3(nn, dn));
    const fl = len3(f);
    if (fl < 1e-12) return ends();
    const fn = scale3(f, 1 / fl);
    if (dot3(cross3(ua, fn), nn) >= 0 && dot3(cross3(fn, ub), nn) >= 0) {
      const d = Math.asin(clamp1(Math.abs(dn))) * DEG;
      const q = closestOnAxis(a, abu, this.origin, fn);
      const t = q ? Math.max(0, Math.min(1, dot3(sub3(q, a), abu) / abl)) : 0;
      return { d, t };
    }
    return ends();
  }
  distBetween(p: Pt3, q: Pt3, _vp?: Viewport): number { return angBetween(this.u(p), this.u(q)); }
  distToRing(_x: number, _y: number, ring: readonly Pt3[], vp: Viewport): number {
    if (ring.length >= 3) {
      let pl = null;
      for (let i = 0; i + 2 < ring.length && !pl; i++) pl = planeFromPoints(ring[i], ring[i + 1], ring[i + 2]);
      if (pl) {
        const hit = rayPlane(this.origin, this.dir, pl.n, pl.d);
        if (hit && dot3(sub3(hit, this.origin), this.dir) > 0) {
          const basis = planeBasis(pl);
          if (pointInRing(projectToPlane(hit, basis), ring.map((p) => projectToPlane(p, basis)))) return 0;
        }
      }
    }
    let best = Infinity;
    for (let i = 0; i < ring.length; i++) best = Math.min(best, this.distToSeg(0, 0, ring[i], ring[(i + 1) % ring.length], vp).d);
    return best;
  }
  dirCos(_x: number, _y: number, anchor: Pt3, dirs: readonly Pt3[], _vp?: Viewport): (number | null)[] {
    const a = this.u(anchor);
    const t = sub3(this.dir, scale3(a, dot3(this.dir, a)));
    const tl = len3(t);
    if (tl < 1e-9) return dirs.map(() => null);
    return dirs.map((d) => {
      const a2 = this.u(add3(anchor, scale3(d, 0.01)));
      const t2 = sub3(a2, scale3(a, dot3(a2, a)));
      const l2 = len3(t2);
      if (l2 < 1e-12) return null;
      return Math.abs(dot3(t, t2)) / (tl * l2);
    });
  }
  viewDir(p: Pt3): Pt3 { return normalize3(sub3(this.origin, p)); }
  /** 平面挑选用的前向 = 头（没有头显姿态时退回手）。 */
  forward(): Pt3 { return this.headDir ?? this.dir; }
  eps(): EpsSet { return EPS_VR_DEG; }
}
