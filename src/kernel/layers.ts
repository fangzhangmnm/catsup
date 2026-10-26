// layers.ts —— 属性层登记处（架构自审 0.7 首选，2026-10-21，Claude Fable 5.1）：边层 / 面层的**全部**规则集中在这一个模块。
//
// 边层（EdgeLayers）：名字 → EdgeId 集。知名名字：soft（不画线、平滑组候选）、curve（圆 / 弧近似边：画线）、smooth（跨边插值法向）、hidden。
//   规则只有四条，对每一层一样：① 切割按父传子 ② 删边出集 ③ 新段上落下的边入集 ④ 溶解时两边都有 → 并出的边也有。
//   推拉策略（EDGE_LAYER_POLICY）：帽边继承原边的全部层；侧棱按表——soft/curve/smooth 边的侧棱 = soft+smooth（圆柱侧面不画线、平滑着色）。
// 面层（FaceLayers）：名字 → (FaceId → 整数)。知名名字：material（definition 槽号）、hidden（1 = 隐藏，DT49；边那边是边层 hidden）。
//   规则：按事件血缘——DIVIDE 子膜继承、MERGE / ABSORB 取首个有值的、BURST / FACE_ERASED 清；一对一承继保 id 天然保留。
// 快照形状：edgeLayers = { name: [边下标…] }（有标记的边）；faceLayers = { name: [每面一个值…] }（−1 = 无）。
// 加一个新层 = 在知名名字表加一个字符串（codec 按同一套 u8 / u16 流编码）。
import type { Edge, EdgeId, FaceId } from "./topology.ts";
import type { FaceEvent } from "./face-lifecycle.ts";
import { type Pt3, pointOnSegment3 } from "./geom.ts";
import { INSERT_TOL } from "./subdivide.ts";

export interface Seg3 { readonly a: Pt3; readonly b: Pt3; }

/** 知名边层（开放集：插件 / 用户前缀名也行，codec 原样编码）。 */
export const EDGE_LAYERS = ["soft", "curve", "smooth", "hidden"] as const;
/** 知名面层。 */
export const FACE_LAYERS = ["material", "hidden"] as const;   // hidden = 1（DT49 隐藏的面：不画、不吸、点不中；2026-10-25）
/** 推拉 / 跟随：原边带哪层 → 它扫出的侧棱带哪些层（帽边 = 原边的全部层）。 */
export const EDGE_LAYER_POLICY: Readonly<Record<string, readonly string[]>> = { soft: ["soft", "smooth"], curve: ["soft", "smooth"], smooth: ["soft", "smooth"] };
/**
 * 环上一个顶点的侧棱（riser：顶点沿扫掠方向拉出的那条棱）该带的层：**两侧的环边都带策略层才软**
 * （圆弧内部顶点的侧棱软 + 平滑；圆弧端点 / 直边角点的侧棱硬）。推拉与跟随共用这一条（2026-10-21）。
 */
export function riserLayers(prev: readonly string[], next: readonly string[]): string[] {
  const hit = (ls: readonly string[]): boolean => ls.some((l) => l in EDGE_LAYER_POLICY);
  if (!hit(prev) || !hit(next)) return [];
  const out = new Set<string>();
  for (const l of [...prev, ...next]) for (const r of EDGE_LAYER_POLICY[l] ?? []) out.add(r);
  return [...out];
}

export class EdgeLayers {
  private sets = new Map<string, Set<EdgeId>>();

  names(): string[] { return [...this.sets.keys()].filter((n) => this.sets.get(n)!.size > 0); }
  /** 取（无则建）。 */
  layer(name: string): Set<EdgeId> { let s = this.sets.get(name); if (!s) { s = new Set(); this.sets.set(name, s); } return s; }
  has(name: string, id: EdgeId): boolean { return this.sets.get(name)?.has(id) ?? false; }
  add(name: string, id: EdgeId): void { this.layer(name).add(id); }
  delete(name: string, id: EdgeId): void { this.sets.get(name)?.delete(id); }
  /** 边 id 带的全部层名。 */
  of(id: EdgeId): string[] { const out: string[] = []; for (const [n, s] of this.sets) if (s.has(id)) out.push(n); return out; }

  /** ① 切割按父传子。 */
  onSplit(parent: EdgeId, children: readonly EdgeId[]): void {
    for (const s of this.sets.values()) if (s.delete(parent)) for (const c of children) s.add(c);
  }
  /** ② 删边出集（也用于合并后清旧边）。 */
  onRemove(id: EdgeId): void { for (const s of this.sets.values()) s.delete(id); }
  /** ④ 溶解：ea、eb 都有的层，并出的 ne 也有。 */
  onMerge(ne: EdgeId, ea: EdgeId, eb: EdgeId): void {
    for (const s of this.sets.values()) if (s.has(ea) && s.has(eb)) s.add(ne);
  }
  /** 复制一条边的层到另一条（absorbVertex 搬边用）。 */
  copy(from: EdgeId, to: EdgeId): void { for (const s of this.sets.values()) if (s.has(from)) s.add(to); }
  /** ③ 新段上落下的边入集。 */
  mark(name: string, edges: readonly Edge[], pt: (id: number) => Pt3, segs: readonly Seg3[]): void {
    if (!segs.length) return;
    const s = this.layer(name);
    for (const e of edges) {
      if (s.has(e.id)) continue;
      const pa = pt(e.a), pb = pt(e.b);
      if (segs.some((sg) => pointOnSegment3(pa, sg.a, sg.b, INSERT_TOL) && pointOnSegment3(pb, sg.a, sg.b, INSERT_TOL))) s.add(e.id);
    }
  }
  /** 清掉不在图里的 id。 */
  prune(hasEdge: (id: EdgeId) => boolean): void { for (const s of this.sets.values()) for (const id of [...s]) if (!hasEdge(id)) s.delete(id); }

  clone(): EdgeLayers { const c = new EdgeLayers(); for (const [n, s] of this.sets) if (s.size) c.sets.set(n, new Set(s)); return c; }
  /** 快照：名字 → 有标记的边下标（按给定边序）。 */
  toIndex(edgeIds: readonly EdgeId[]): Record<string, number[]> | undefined {
    const out: Record<string, number[]> = {};
    for (const [n, s] of this.sets) { const idx: number[] = []; edgeIds.forEach((id, i) => { if (s.has(id)) idx.push(i); }); if (idx.length) out[n] = idx; }
    return Object.keys(out).length ? out : undefined;
  }
  /** 装载：下标表 → 集（下标越界 = 文件坏）。 */
  static fromIndex(rec: Readonly<Record<string, readonly number[]>> | undefined, edgeIds: readonly EdgeId[], fail: (msg: string) => never): EdgeLayers {
    const L = new EdgeLayers();
    if (!rec) return L;
    for (const [n, idx] of Object.entries(rec)) for (const i of idx) { if (!(i in edgeIds)) fail(`edge layer "${n}" index ${i} out of range`); L.add(n, edgeIds[i]); }
    return L;
  }
}

export class FaceLayers {
  private maps = new Map<string, Map<FaceId, number>>();

  names(): string[] { return [...this.maps.keys()].filter((n) => this.maps.get(n)!.size > 0); }
  layer(name: string): Map<FaceId, number> { let m = this.maps.get(name); if (!m) { m = new Map(); this.maps.set(name, m); } return m; }
  get(name: string, id: FaceId): number | undefined { return this.maps.get(name)?.get(id); }
  set(name: string, id: FaceId, v: number): void { this.layer(name).set(id, v); }
  delete(name: string, id: FaceId): void { this.maps.get(name)?.delete(id); }
  /** 一张面的全部层值。 */
  of(id: FaceId): Record<string, number> { const out: Record<string, number> = {}; for (const [n, m] of this.maps) { const v = m.get(id); if (v !== undefined) out[n] = v; } return out; }
  setAll(id: FaceId, vals: Readonly<Record<string, number>> | undefined): void { if (vals) for (const [n, v] of Object.entries(vals)) if (v >= 0) this.set(n, id, v); }

  /** 按事件血缘：DIVIDE 子膜继承、MERGE / ABSORB 取首个有值的、死膜清。 */
  applyEvents(events: readonly FaceEvent[]): void {
    for (const m of this.maps.values()) {
      for (const ev of events) {
        if (ev.type === "DIVIDE") { const v = m.get(ev.from); m.delete(ev.from); if (v !== undefined) for (const c of ev.into) m.set(c, v); }
        else if (ev.type === "MERGE") { let v: number | undefined; for (const f of ev.from) { if (v === undefined) v = m.get(f); m.delete(f); } if (v !== undefined) m.set(ev.into, v); }
        else if (ev.type === "ABSORB") { const v = m.get(ev.from); m.delete(ev.from); if (v !== undefined) m.set(ev.into, v); }
        else if (ev.type === "BURST" || ev.type === "FACE_ERASED") m.delete(ev.face);
      }
    }
  }
  prune(hasFace: (id: FaceId) => boolean): void { for (const m of this.maps.values()) for (const id of [...m.keys()]) if (!hasFace(id)) m.delete(id); }
  clone(): FaceLayers { const c = new FaceLayers(); for (const [n, m] of this.maps) if (m.size) c.maps.set(n, new Map(m)); return c; }
  /** 快照：名字 → 每面一个值（−1 = 无），按给定面序。 */
  toIndex(faceIds: readonly FaceId[]): Record<string, number[]> | undefined {
    const out: Record<string, number[]> = {};
    for (const [n, m] of this.maps) { const vals = faceIds.map((id) => m.get(id) ?? -1); if (vals.some((v) => v >= 0)) out[n] = vals; }
    return Object.keys(out).length ? out : undefined;
  }
  static fromIndex(rec: Readonly<Record<string, readonly number[]>> | undefined, faceIds: readonly FaceId[]): FaceLayers {
    const L = new FaceLayers();
    if (!rec) return L;
    for (const [n, vals] of Object.entries(rec)) vals.forEach((v, i) => { if (v >= 0 && i in faceIds) L.set(n, faceIds[i], v); });
    return L;
  }
}
