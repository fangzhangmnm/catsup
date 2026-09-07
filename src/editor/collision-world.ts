// collision-world.ts —— 内核膜 → player 的 WorldQuery（多边形汤，不是三角汤：膜本来就是平面多边形含洞，球/线段对它求最近点/求交
// 用不着三角化，也就不用碰 three 的 earcut）。零 three、零 DOM，node 直测。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元）
//
// 原则：几何默认全参与碰撞（user 2026-09-07：「geometry 是默认有碰撞的，除非用户 override or assign proxy」；override/proxy 元数据留给
// component 纪元）。膜是双面的：法向符号无意义，坡度看 |n.z|。安全地板 = min(0, 模型最低 z)。
// 规模：小模型暴力 + AABB 粗筛；>N 面再上 BVH（现阶段模型几十上百面，够用）。
// 重建时机：checkpoint 变了（Editor.revision 变）才 rebuild——手势中（live 预演）不重建，与 player 的 freeze/coyote 同一口径：
// 世界只在 commit 后惩罚玩家。

import type { Kernel, Pt3 } from "../kernel/kernel.ts";
import { type Pt, type PlaneParams, dot3, pointInRing, sub3 } from "../kernel/geom.ts";
import type { WorldHit, WorldQuery } from "../player/world-query.ts";

interface FaceRec {
  plane: PlaneParams;
  basis: { u: Pt3; v: Pt3 };
  outer2: readonly Pt[];
  holes2: readonly (readonly Pt[])[];
  rings3: Pt3[][];          // outer + holes 的 3D 环（边最近点用）
  min: Pt3; max: Pt3;       // AABB
}

const EPS_DENOM = 1e-9;

function closestOnSegment3(p: Pt3, a: Pt3, b: Pt3): Pt3 {
  const ab = sub3(b, a);
  const l2 = dot3(ab, ab);
  if (l2 === 0) return a;
  const t = Math.max(0, Math.min(1, dot3(sub3(p, a), ab) / l2));
  return { x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t };
}

export class KernelCollisionWorld implements WorldQuery {
  private faces: FaceRec[] = [];
  private floor = 0;
  /** 已吃进来的 Editor.revision（调用方比对以决定要不要 rebuild）。 */
  revision = -1;

  constructor(k?: Kernel, revision = 0) { if (k) this.rebuild(k, revision); }

  rebuild(k: Kernel, revision = 0): void {
    this.revision = revision;
    this.faces = [];
    let minZ = 0;
    for (const v of k.vertices()) if (v.z < minZ) minZ = v.z;
    this.floor = minZ;
    for (const f of k.faces()) {
      const rec = k.planeOf(f.id);
      const rings = k.faceRings3(f.id);
      if (!rec || !rings || rings.outer.length < 3) continue;
      const rings3 = [rings.outer, ...rings.holes];
      const min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
      for (const p of rings.outer) {
        if (p.x < min.x) min.x = p.x; if (p.y < min.y) min.y = p.y; if (p.z < min.z) min.z = p.z;
        if (p.x > max.x) max.x = p.x; if (p.y > max.y) max.y = p.y; if (p.z > max.z) max.z = p.z;
      }
      this.faces.push({ plane: rec.plane, basis: rec.basis, outer2: f.outer.pts, holes2: f.holes.map((h) => h.pts), rings3, min, max });
    }
  }

  faceCount(): number { return this.faces.length; }
  floorZ(): number { return this.floor; }

  private inside(fr: FaceRec, p: Pt3): boolean {
    const q = { x: dot3(p, fr.basis.u), y: dot3(p, fr.basis.v) };
    if (!pointInRing(q, fr.outer2)) return false;
    for (const h of fr.holes2) if (pointInRing(q, h)) return false;
    return true;
  }

  /** 逐面顺序推（RealHome 同款：推完一面更新球心再看下一面——共享边不会被两张膜各推一次）。返回总位移。 */
  pushOut(c0: Pt3, r: number): Pt3 | null {
    const c = { x: c0.x, y: c0.y, z: c0.z };
    let any = false;
    for (const fr of this.faces) {
      if (c.x + r < fr.min.x || c.x - r > fr.max.x || c.y + r < fr.min.y || c.y - r > fr.max.y || c.z + r < fr.min.z || c.z - r > fr.max.z) continue;
      const n = fr.plane.n;
      const s = dot3(n, c) - fr.plane.d;
      if (Math.abs(s) >= r) continue;
      const foot = { x: c.x - n.x * s, y: c.y - n.y * s, z: c.z - n.z * s };
      if (this.inside(fr, foot)) {
        const sign = s >= 0 ? 1 : -1;
        const k = sign * (r - Math.abs(s));
        c.x += n.x * k; c.y += n.y * k; c.z += n.z * k; any = true;
        continue;
      }
      // 环外：最近边
      let best: Pt3 | null = null, bd = r;
      for (const ring of fr.rings3) {
        for (let i = 0; i < ring.length; i++) {
          const q = closestOnSegment3(c, ring[i], ring[(i + 1) % ring.length]);
          const d = Math.hypot(c.x - q.x, c.y - q.y, c.z - q.z);
          if (d < bd) { bd = d; best = q; }
        }
      }
      if (best && bd > 1e-12) {
        const k = (r - bd) / bd;
        c.x += (c.x - best.x) * k; c.y += (c.y - best.y) * k; c.z += (c.z - best.z) * k; any = true;
      }
    }
    return any ? { x: c.x - c0.x, y: c.y - c0.y, z: c.z - c0.z } : null;
  }

  floorBelow(x: number, y: number, zTop: number, zMin: number, minNz: number): number | null {
    let best: number | null = this.floor <= zTop + 1e-9 && this.floor >= zMin - 1e-9 ? this.floor : null;
    for (const fr of this.faces) {
      const n = fr.plane.n;
      if (Math.abs(n.z) < minNz) continue;
      if (x < fr.min.x - 1e-9 || x > fr.max.x + 1e-9 || y < fr.min.y - 1e-9 || y > fr.max.y + 1e-9) continue;
      if (fr.max.z < zMin - 1e-9 || fr.min.z > zTop + 1e-9) continue;
      const z = (fr.plane.d - n.x * x - n.y * y) / n.z;
      if (z > zTop + 1e-9 || z < zMin - 1e-9) continue;
      if (best !== null && z <= best) continue;
      if (this.inside(fr, { x, y, z })) best = z;
    }
    return best;
  }

  segmentHit(a: Pt3, b: Pt3): WorldHit | null {
    let best: WorldHit | null = null;
    const d = sub3(b, a);
    // 安全地板
    if (Math.abs(d.z) > EPS_DENOM) {
      const t = (this.floor - a.z) / d.z;
      if (t >= 0 && t <= 1) best = { p: { x: a.x + d.x * t, y: a.y + d.y * t, z: this.floor }, n: { x: 0, y: 0, z: 1 }, t };
    }
    const sMin = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) };
    const sMax = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) };
    for (const fr of this.faces) {
      if (sMax.x < fr.min.x || sMin.x > fr.max.x || sMax.y < fr.min.y || sMin.y > fr.max.y || sMax.z < fr.min.z || sMin.z > fr.max.z) continue;
      const n = fr.plane.n;
      const denom = dot3(n, d);
      if (Math.abs(denom) < EPS_DENOM) continue;
      const t = (fr.plane.d - dot3(n, a)) / denom;
      if (t < 0 || t > 1) continue;
      if (best && t >= best.t) continue;
      const p = { x: a.x + d.x * t, y: a.y + d.y * t, z: a.z + d.z * t };
      if (!this.inside(fr, p)) continue;
      best = { p, n, t };
    }
    return best;
  }
}
