// screen-index.ts —— 按相机态缓存的屏幕索引（#14 性能第二轮后半，2026-10-21，Claude Fable 5.1）。
// 求解器 / 拾取每次都要「指针附近有哪些顶点 / 边 / 膜」：以前逐个算屏距 O(V+E+F)；这里把顶点投影一次，
// 顶点 / 边 / 膜按屏幕格（CELL px）登记，查询只看指针附近的格。返回的是**超集**，调用方照旧做精确屏距 / 遮挡判定（无损）。
// **按槽的 part 缓存（池级局部性）**：合成视图每个槽的世界几何是一个缓存单元（world-view.ts SlotPart），子索引按 (part 对象, 相机戳) 缓存——
// 手势预演 / 拖池每帧都是新视图对象，但没变的槽 part 没变 → 子索引直接复用，只重建变了的那个槽。裸 GeomView（没有 parts）= 一个子索引全扫。
// XR 帧没有投影 → 不建索引（退回全扫）。
import type { Edge, Face, FaceId, Pt3, Vertex } from "../kernel/kernel.ts";
import type { GeomView, SlotPart, WorldView } from "../scene/world-view.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
import { perf } from "./perf-stats.ts";

const CELL = 48;
const BIG_CELLS = 400;   // 屏幕包围盒盖过这么多格的膜（地面那种）进「常驻」表，不逐格登记
const key = (ix: number, iy: number): number => ix * 65536 + iy + 2147483648;
type Proj = (p: Pt3) => { x: number; y: number } | null;

class SubIndex {
  readonly vcells = new Map<number, Vertex[]>();
  readonly ecells = new Map<number, Edge[]>();
  readonly fcells = new Map<number, Face[]>();
  readonly bigFaces: Face[] = [];
  constructor(verts: Iterable<Vertex>, edges: Iterable<Edge>, faces: Iterable<Face>, ringPts: (f: Face) => Pt3[] | undefined, proj: Proj) {
    const pos = new Map<number, { x: number; y: number }>();
    for (const v of verts) {
      const p = proj(v);
      if (!p) continue;
      pos.set(v.id, p);
      const kk = key(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
      (this.vcells.get(kk) ?? this.vcells.set(kk, []).get(kk)!).push(v);
    }
    for (const e of edges) {
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
    for (const f of faces) {
      const ring = ringPts(f);
      if (!ring) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, ok = true;
      for (const p3 of ring) { const p = proj(p3); if (!p) { ok = false; break; } if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
      if (!ok) { this.bigFaces.push(f); continue; }
      const ix0 = Math.floor(x0 / CELL), iy0 = Math.floor(y0 / CELL), ix1 = Math.floor(x1 / CELL), iy1 = Math.floor(y1 / CELL);
      if ((ix1 - ix0 + 1) * (iy1 - iy0 + 1) > BIG_CELLS) { this.bigFaces.push(f); continue; }
      for (let ix = ix0; ix <= ix1; ix++) for (let iy = iy0; iy <= iy1; iy++) { const kk = key(ix, iy); (this.fcells.get(kk) ?? this.fcells.set(kk, []).get(kk)!).push(f); }
    }
  }
}

const SUB_CACHE = new WeakMap<object, { stamp: string; sub: SubIndex }>();
const VIEW_CACHE = new WeakMap<object, { stamp: string; idx: ScreenIndex }>();

export class ScreenIndex {
  private readonly subs: readonly SubIndex[];
  private constructor(subs: readonly SubIndex[]) { this.subs = subs; }   // 不用参数属性：node strip-types 不支持

  private gather<T extends { id: number }>(pick: (s: SubIndex) => Map<number, T[]>, sx: number, sy: number, r: number, extra?: (s: SubIndex) => readonly T[]): T[] {
    const ix0 = Math.floor((sx - r) / CELL), ix1 = Math.floor((sx + r) / CELL), iy0 = Math.floor((sy - r) / CELL), iy1 = Math.floor((sy + r) / CELL);
    const out: T[] = [];
    for (const s of this.subs) {
      const cells = pick(s);
      if (cells.size) {
        const seen = new Set<number>();
        for (let ix = ix0; ix <= ix1; ix++) for (let iy = iy0; iy <= iy1; iy++) {
          const list = cells.get(key(ix, iy));
          if (list) for (const it of list) if (!seen.has(it.id)) { seen.add(it.id); out.push(it); }
        }
      }
      if (extra) for (const it of extra(s)) out.push(it);
    }
    return out;
  }
  verticesNear(sx: number, sy: number, r: number): Vertex[] { return this.gather((s) => s.vcells, sx, sy, r); }
  edgesNear(sx: number, sy: number, r: number): Edge[] { return this.gather((s) => s.ecells, sx, sy, r); }
  facesNear(sx: number, sy: number, r: number): Face[] { return this.gather((s) => s.fcells, sx, sy, r, (s) => s.bigFaces); }

  // ---- 缓存：视图对象 × 相机戳；子索引按 part 对象 × 相机戳 ----
  static for(k: GeomView, pf: PointerFrame, vp: Viewport): ScreenIndex | null {
    if (!pf.project) return null;
    const r0 = pf.ray(0, 0, vp), r1 = pf.ray(vp.w, vp.h, vp);
    const f = (n: number): string => n.toFixed(5);
    const stamp = `${vp.w}x${vp.h}|${f(r0.origin.x)},${f(r0.origin.y)},${f(r0.origin.z)}|${f(r0.dir.x)},${f(r0.dir.y)},${f(r0.dir.z)}|${f(r1.origin.x)},${f(r1.origin.y)},${f(r1.origin.z)}|${f(r1.dir.x)},${f(r1.dir.y)},${f(r1.dir.z)}`;
    const hit = VIEW_CACHE.get(k);
    if (hit && hit.stamp === stamp) return hit.idx;
    const proj: Proj = (p) => pf.project!(p, vp);   // 绑住 this（直接取方法引用会丢）
    const parts = (k as Partial<WorldView>).parts;
    let subs: SubIndex[];
    const t0 = performance.now();
    let built = 0;
    if (parts) {
      subs = parts.map((part) => {
        const h = SUB_CACHE.get(part);
        if (h && h.stamp === stamp) return h.sub;
        built++;
        const ringPts = (face: Face): Pt3[] | undefined => {
          const out: Pt3[] = [];
          for (const d of face.outer.edges) { const e = part.edges.get(d.edge); const v = e && part.verts.get(d.forward ? e.a : e.b); if (!v) return undefined; out.push(v); }
          return out;
        };
        // 隐藏的边 / 点（DT49）不进索引 = 吸不到、点不中（图里还在，可见面的环要查它）
        const verts = part.hiddenVerts.size ? [...part.verts.values()].filter((v) => !part.hiddenVerts.has(v.id)) : part.verts.values();
        const edges = part.hiddenEdges.size ? [...part.edges.values()].filter((e) => !part.hiddenEdges.has(e.id)) : part.edges.values();
        const sub = new SubIndex(verts, edges, part.faces.values(), ringPts, proj);
        SUB_CACHE.set(part, { stamp, sub });
        return sub;
      });
    } else {
      built = 1;
      subs = [new SubIndex(k.vertices(), k.edges(), k.faces(), (face) => k.faceRings3(face.id)?.outer, proj)];
    }
    perf.last["snap.index"] = performance.now() - t0;
    perf.last["snap.indexN"] = (perf.last["snap.indexN"] ?? 0) + built;
    const idx = new ScreenIndex(subs);
    VIEW_CACHE.set(k, { stamp, idx });
    return idx;
  }
}
export type { FaceId };
