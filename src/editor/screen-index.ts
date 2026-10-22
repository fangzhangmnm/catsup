// screen-index.ts —— 按相机态缓存的屏幕索引（#14 性能第二轮后半，2026-10-21，Claude Fable 5.1）。
// 求解器每次悬停都要「指针附近有哪些顶点 / 边 / 膜」：以前逐个算屏距 O(V+E+F)；这里把全部顶点投影一次（相机不动就复用），
// 顶点 / 边 / 膜按屏幕格（CELL px）登记，查询只看指针附近的格。返回的是**超集**，调用方照旧做精确屏距 / 遮挡判定（无损）。
// 缓存键 = 视图对象（同一 revision 的 WorldView 是同一个对象）+ 相机戳（左上 / 右下两条射线 + 视口）。XR 帧没有投影 → 不建索引（退回全扫）。
import type { Edge, Face, FaceId, Vertex } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";

const CELL = 48;
const BIG_CELLS = 400;   // 屏幕包围盒盖过这么多格的膜（地面那种）进「常驻」表，不逐格登记
const key = (ix: number, iy: number): number => ix * 65536 + iy + 2147483648;

export class ScreenIndex {
  private vcells = new Map<number, Vertex[]>();
  private ecells = new Map<number, Edge[]>();
  private fcells = new Map<number, Face[]>();
  private bigFaces: Face[] = [];
  private constructor(k: GeomView, pf: PointerFrame, vp: Viewport) {
    const proj = (p: { x: number; y: number; z: number }, v: Viewport): { x: number; y: number } | null => pf.project!(p, v);   // 绑住 this（直接取方法引用会丢）
    const pos = new Map<number, { x: number; y: number }>();
    for (const v of k.vertices()) {
      const p = proj({ x: v.x, y: v.y, z: v.z }, vp);
      if (!p) continue;
      pos.set(v.id, p);
      const kk = key(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
      (this.vcells.get(kk) ?? this.vcells.set(kk, []).get(kk)!).push(v);
    }
    for (const e of k.edges()) {
      const a = pos.get(e.a), b = pos.get(e.b);
      if (!a || !b) continue;
      const seen = new Set<number>();
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2)));
      for (let i = 0; i <= n; i++) {
        const t = i / n, kk = key(Math.floor((a.x + (b.x - a.x) * t) / CELL), Math.floor((a.y + (b.y - a.y) * t) / CELL));
        if (seen.has(kk)) continue;
        seen.add(kk);
        (this.ecells.get(kk) ?? this.ecells.set(kk, []).get(kk)!).push(e);
      }
    }
    for (const f of k.faces()) {
      const rings = k.faceRings3(f.id);
      if (!rings) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, ok = true;
      for (const p3 of rings.outer) { const p = proj(p3, vp); if (!p) { ok = false; break; } if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
      if (!ok) { this.bigFaces.push(f); continue; }
      const ix0 = Math.floor(x0 / CELL), iy0 = Math.floor(y0 / CELL), ix1 = Math.floor(x1 / CELL), iy1 = Math.floor(y1 / CELL);
      if ((ix1 - ix0 + 1) * (iy1 - iy0 + 1) > BIG_CELLS) { this.bigFaces.push(f); continue; }
      for (let ix = ix0; ix <= ix1; ix++) for (let iy = iy0; iy <= iy1; iy++) { const kk = key(ix, iy); (this.fcells.get(kk) ?? this.fcells.set(kk, []).get(kk)!).push(f); }
    }
  }

  private gather<T extends { id: number }>(cells: Map<number, T[]>, sx: number, sy: number, r: number): T[] {
    const ix0 = Math.floor((sx - r) / CELL), ix1 = Math.floor((sx + r) / CELL), iy0 = Math.floor((sy - r) / CELL), iy1 = Math.floor((sy + r) / CELL);
    const seen = new Set<number>(); const out: T[] = [];
    for (let ix = ix0; ix <= ix1; ix++) for (let iy = iy0; iy <= iy1; iy++) {
      const list = cells.get(key(ix, iy));
      if (list) for (const it of list) if (!seen.has(it.id)) { seen.add(it.id); out.push(it); }
    }
    return out;
  }
  verticesNear(sx: number, sy: number, r: number): Vertex[] { return this.gather(this.vcells, sx, sy, r); }
  edgesNear(sx: number, sy: number, r: number): Edge[] { return this.gather(this.ecells, sx, sy, r); }
  facesNear(sx: number, sy: number, r: number): Face[] { const out = this.gather(this.fcells, sx, sy, r); for (const f of this.bigFaces) out.push(f); return out; }

  // ---- 缓存：视图对象 × 相机戳 ----
  private static cache = new WeakMap<object, { stamp: string; idx: ScreenIndex }>();
  static for(k: GeomView, pf: PointerFrame, vp: Viewport): ScreenIndex | null {
    if (!pf.project) return null;
    const r0 = pf.ray(0, 0, vp), r1 = pf.ray(vp.w, vp.h, vp);
    const f = (n: number): string => n.toFixed(5);
    const stamp = `${vp.w}x${vp.h}|${f(r0.origin.x)},${f(r0.origin.y)},${f(r0.origin.z)}|${f(r0.dir.x)},${f(r0.dir.y)},${f(r0.dir.z)}|${f(r1.origin.x)},${f(r1.origin.y)},${f(r1.origin.z)}|${f(r1.dir.x)},${f(r1.dir.y)},${f(r1.dir.z)}`;
    const hit = ScreenIndex.cache.get(k);
    if (hit && hit.stamp === stamp) return hit.idx;
    const idx = new ScreenIndex(k, pf, vp);
    ScreenIndex.cache.set(k, { stamp, idx });
    return idx;
  }
}
export type { FaceId };
