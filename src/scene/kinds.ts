// scene/kinds.ts —— kind 登记表（契约 ai-docs/20261024-object-model-contract.md §2 / §5）：每种身体声明可用模式、能 cast 到哪（丢什么）、对齐几何、包围盒。
// 加 kind = 加一条登记，不改既有的；cast 只在表里有的方向上成功、不做部分转换（user 2026-10-24「每个物体有一个kind，可以换，换了要explicit cast op用户点确认」）。
// created 2026-10-24 by Claude Fable 5.1
import type { Pt3 } from "../kernel/geom.ts";
import type { PlaneParams } from "../kernel/geom.ts";
import type { BodyKind } from "./body-kind.ts";
import type { Body, BrepBody, MeshBody } from "./scene.ts";
import { triangulateRings } from "../format/triangulate.ts";

export type KindModeId = "geometry" | "surface";
export interface AlignGeometry { points: Pt3[]; segments: [Pt3, Pt3][]; planes: PlaneParams[]; }
export interface KindDef<B extends Body = Body> {
  readonly id: BodyKind;
  readonly label: string;
  /** 这种身体可用的编辑模式（空 = 只在物体层摆）。 */
  readonly modes: readonly KindModeId[];
  /** 显式 cast 的去向 + 丢失清单（确认面文案的来源）。 */
  readonly castsTo: readonly { to: BodyKind; loses: readonly string[] }[];
  alignGeometry(body: B): AlignGeometry;
  bounds(body: B): { min: Pt3; max: Pt3 } | null;
}

const boundsOf = (pts: Iterable<Pt3>): { min: Pt3; max: Pt3 } | null => {
  let min: Pt3 | null = null, max: Pt3 | null = null;
  for (const p of pts) { if (!min || !max) { min = { ...p }; max = { ...p }; continue; } min = { x: Math.min(min.x, p.x), y: Math.min(min.y, p.y), z: Math.min(min.z, p.z) }; max = { x: Math.max(max.x, p.x), y: Math.max(max.y, p.y), z: Math.max(max.z, p.z) }; }
  return min && max ? { min, max } : null;
};

export const BREP_KIND: KindDef<BrepBody> = {
  id: "brep", label: "肥皂膜",
  modes: ["geometry", "surface"],
  castsTo: [{ to: "mesh", loses: ["拓扑（面 / 边身份，推拉 / 偏移 / 跟随不再可用）", "曲线实体（圆 / 弧 / 焊接链）", "软边 / 平滑组标记", "组分区", "参考几何"] }],
  alignGeometry(b) {
    const k = b.kernel, points = k.vertices().map((v) => ({ x: v.x, y: v.y, z: v.z }));
    const segments = k.edges().map((e) => [k.graph.pt(e.a), k.graph.pt(e.b)] as [Pt3, Pt3]);
    const planes = k.faces().map((f) => k.planeOf(f.id)!.plane);
    return { points, segments, planes };
  },
  bounds(b) { return boundsOf(b.kernel.vertices()); },
};
export const MESH_KIND: KindDef<MeshBody> = {
  id: "mesh", label: "网格",
  modes: [],
  castsTo: [],   // mesh → brep：要平面多边形 + 流形，以后做；没有就是拒
  alignGeometry(m) {
    const points: Pt3[] = [];
    for (let i = 0; i + 2 < m.positions.length; i += 3) points.push({ x: m.positions[i], y: m.positions[i + 1], z: m.positions[i + 2] });
    const seen = new Set<string>(), segments: [Pt3, Pt3][] = [];
    for (let t = 0; t + 2 < m.indices.length; t += 3) for (let k = 0; k < 3; k++) { const a = m.indices[t + k], b = m.indices[t + ((k + 1) % 3)]; const key = a < b ? `${a}-${b}` : `${b}-${a}`; if (seen.has(key)) continue; seen.add(key); segments.push([points[a], points[b]]); }
    return { points, segments, planes: [] };
  },
  bounds(m) { const pts: Pt3[] = []; for (let i = 0; i + 2 < m.positions.length; i += 3) pts.push({ x: m.positions[i], y: m.positions[i + 1], z: m.positions[i + 2] }); return boundsOf(pts); },
};
export const KINDS: Readonly<Record<BodyKind, KindDef>> = { brep: BREP_KIND as KindDef, mesh: MESH_KIND as KindDef };
export const kindOfBody = (b: Body): KindDef => KINDS[b.kind];
export function canCast(from: BodyKind, to: BodyKind): { ok: true; loses: readonly string[] } | { ok: false; why: string } {
  if (from === to) return { ok: false, why: "已经是这种身体" };
  const c = KINDS[from].castsTo.find((x) => x.to === to);
  return c ? { ok: true, loses: c.loses } : { ok: false, why: `还没有 ${KINDS[from].label} → ${KINDS[to].label} 这条路` };
}

/** brep → mesh：每张膜按 triangulateRings 三角化，材质槽照抄，每三角记面的材质槽。失败（某膜三角化不了）= 整个 cast 拒。 */
export function brepToMesh(b: BrepBody): MeshBody {
  const k = b.kernel;
  const pos: number[] = [], idx: number[] = [], tri: number[] = [];
  const vid = new Map<number, number>();
  const vi = (id: number): number => { let i = vid.get(id); if (i === undefined) { const p = k.graph.pt(id); i = pos.length / 3; pos.push(p.x, p.y, p.z); vid.set(id, i); } return i; };
  for (const f of k.faces()) {
    const F = k.face(f.id)!, rec = k.planeOf(f.id)!;
    const outer = F.outer.vids, holes = F.holes.map((h) => h.vids);
    const all = [...new Set([...outer, ...holes.flat()])];
    const local = new Map<number, number>(all.map((v, i) => [v, i]));
    const tris = triangulateRings(all.map((v) => k.graph.pt(v)), rec.plane, outer.map((v) => local.get(v)!), holes.map((h) => h.map((v) => local.get(v)!)));
    const slot = k.faceMaterialOf(f.id);
    for (const [a, b2, c] of tris) { idx.push(vi(all[a]), vi(all[b2]), vi(all[c])); tri.push(slot === undefined || slot < 0 ? 0xffff : slot); }
  }
  return { kind: "mesh", positions: new Float32Array(pos), indices: new Uint32Array(idx), triMaterial: new Uint16Array(tri), materialSlots: [...b.materialSlots] };
}
/** 显式 cast（op 层调用）：只认登记表里的方向。 */
export function castBody(body: Body, to: BodyKind): Body {
  const c = canCast(body.kind, to);
  if (!c.ok) throw new Error(`cast: ${c.why}`);
  if (body.kind === "brep" && to === "mesh") return brepToMesh(body);
  throw new Error(`cast: ${body.kind} → ${to} 登记了却没有实现（内部）`);
}
