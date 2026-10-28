// scene/kinds.ts —— kind 登记表（契约 ai-docs/20261024-object-model-contract.md §2 / §5）：每种身体声明可用模式、能 cast 到哪（丢什么）、对齐几何、包围盒。
// 加 kind = 加一条登记，不改既有的；cast 只在表里有的方向上成功、不做部分转换（user 2026-10-24「每个物体有一个kind，可以换，换了要explicit cast op用户点确认」）。
// created 2026-10-24 by Claude Fable 5.1 · 2026-10-27 mesh 身体换成可编辑的 mesh 内核（src/mesh/），brep → mesh 出多边形面不出三角汤（edited by Claude Fable 5.1）
import type { Pt3 } from "../kernel/geom.ts";
import type { PlaneParams } from "../kernel/geom.ts";
import type { BodyKind } from "./body-kind.ts";
import type { Body, BrepBody, MeshBody } from "./scene.ts";
import { triangulateRings } from "../format/triangulate.ts";
import { MeshKernel, F_SOFT, F_SMOOTH, F_HIDDEN, F_WIRE, FF_HIDDEN } from "../mesh/mesh-kernel.ts";
import { recalcNormals } from "../mesh/ops/orient.ts";
import { edgeSoft, keepLookUnderAngle } from "../mesh/edge-smooth.ts";
import { kernelFromTriangles } from "../kernel/from-triangles.ts";
import { emptyGuides } from "./guides.ts";

export type KindModeId = "geometry" | "surface" | "freeform";
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
  castsTo: [{ to: "mesh", loses: ["拓扑公理（共面即同面、重合即同点；推拉 / 偏移 / 跟随不再可用）", "带洞的面（变成三角形，内部的边软 + 平滑）", "背面材质（mesh 单面）", "折线（变成软 + 平滑的边）", "曲线实体（圆 / 弧 / 焊接链）", "组分区", "参考几何"] }],
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
  modes: ["freeform"],   // 自由建模工作台（modes/freeform.ts；2026-10-27 接缝：壳 + 选择；刀 / 拉 / 环切 = M4 Opus）
  castsTo: [{ to: "brep", loses: ["不平的面（折成平面块，块之间加软边）", "隐藏的面", "裸线（不属于任何面的边）", "面的材质", "软边 / 平滑标记（改按弯折角度重判）"] }],
  alignGeometry(b) {
    const m = b.kernel, points = m.verts().map((v) => m.pt(v));
    const segments = m.edges().filter((e) => !edgeSoft(m, e) && !(m.edgeFlags[e] & F_HIDDEN)).map((e) => [m.pt(m.edgeA[e]), m.pt(m.edgeB[e])] as [Pt3, Pt3]);   // 画线的边（默认平滑 + 手标判，FM129）
    return { points, segments, planes: [] };
  },
  bounds(b) { const m = b.kernel; return boundsOf(m.verts().map((v) => m.pt(v))); },
};
export const KINDS: Readonly<Record<BodyKind, KindDef>> = { brep: BREP_KIND as KindDef, mesh: MESH_KIND as KindDef };
export const kindOfBody = (b: Body): KindDef => KINDS[b.kind];
export function canCast(from: BodyKind, to: BodyKind): { ok: true; loses: readonly string[] } | { ok: false; why: string } {
  if (from === to) return { ok: false, why: "已经是这种身体" };
  const c = KINDS[from].castsTo.find((x) => x.to === to);
  return c ? { ok: true, loses: c.loses } : { ok: false, why: `还没有 ${KINDS[from].label} → ${KINDS[to].label} 这条路` };
}

const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const newell = (pts: readonly Pt3[]): Pt3 => { let x = 0, y = 0, z = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; x += (a.y - b.y) * (a.z + b.z); y += (a.z - b.z) * (a.x + b.x); z += (a.x - b.x) * (a.y + b.y); } return { x, y, z }; };

/**
 * brep → mesh：一张膜 = 一张多边形面（环绕膜的法向 +n 逆时针 = 正面朝 +n，和 brep 渲染的正面一致）；带洞的膜三角化（mesh 的面不带洞），三角形之间的内部边软 + 平滑（看起来还是一张面）；
 * 边标记照搬（软 / 平滑 / 隐藏；折线 = 软 + 平滑）；悬空的边 = 裸线；隐藏的面照旧隐藏；材质槽照抄（正面那槽）。失败（某膜三角化不了）= 整个 cast 拒。
 */
export function brepToMesh(b: BrepBody): MeshBody {
  const k = b.kernel, m = new MeshKernel();
  const vid = new Map<number, number>();
  const vi = (id: number): number => { let i = vid.get(id); if (i === undefined) { i = m.addVertex(k.graph.pt(id)); vid.set(id, i); } return i; };
  const brepEdge = new Set<string>();
  for (const e of k.edges()) brepEdge.add(e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`);
  for (const f of k.faces()) {
    const F = k.face(f.id)!, rec = k.planeOf(f.id)!, n = rec.plane.n, slot = k.faceMaterialOf(f.id, 0) ?? -1, hidden = k.isFaceHidden(f.id);
    const add = (ring: number[]): void => { if (dot(newell(ring.map((v) => m.pt(v))), n) < 0) ring.reverse(); const fid = m.addFace(ring, slot); if (hidden) m.setFaceFlags(fid, FF_HIDDEN, true); };
    if (!F.holes.length) { add(F.outer.vids.map(vi)); continue; }
    const outer = F.outer.vids, holes = F.holes.map((h) => h.vids), all = [...new Set([...outer, ...holes.flat()])];
    const local = new Map<number, number>(all.map((v, i) => [v, i]));
    const tris = triangulateRings(all.map((v) => k.graph.pt(v)), rec.plane, outer.map((v) => local.get(v)!), holes.map((h) => h.map((v) => local.get(v)!)));
    if (!tris.length) throw new Error(`cast: face ${f.id} could not be triangulated`);
    for (const [a, b2, c] of tris) add([vi(all[a]), vi(all[b2]), vi(all[c])]);
  }
  for (const e of k.edges()) {
    if (e.faceLinks.length === 0) { const me = m.ensureEdge(vi(e.a), vi(e.b)); m.setEdgeFlags(me, m.edgeFlags[me] | F_WIRE); }
  }
  const brepIdOf = new Map<number, number>([...vid].map(([b2, mm]) => [mm, b2]));
  for (const me of m.edges()) {
    const a = brepIdOf.get(m.edgeA[me])!, bb = brepIdOf.get(m.edgeB[me])!, key = a < bb ? `${a}-${bb}` : `${bb}-${a}`;
    if (!brepEdge.has(key)) { m.setEdgeFlags(me, m.edgeFlags[me] | F_SOFT | F_SMOOTH); continue; }   // 三角化出来的内部边：看不见、明暗连续
    const eid = k.graph.vertex(a).edges;
    let fl = m.edgeFlags[me];
    for (const x of eid) { const E = k.graph.edge(x); if ((E.a === a && E.b === bb) || (E.a === bb && E.b === a)) { if (k.isSoft(x)) fl |= F_SOFT; if (k.isSmooth(x)) fl |= F_SMOOTH; if (k.isFold(x)) fl |= F_SOFT | F_SMOOTH; if (k.isEdgeHidden(x)) fl |= F_HIDDEN; } }
    if (fl !== m.edgeFlags[me]) m.setEdgeFlags(me, fl);
  }
  recalcNormals(m);   // brep 的平面法向是规范化符号的，不是朝外：封闭壳朝外、开口片按种子面一致化
  keepLookUnderAngle(m, 30);   // 默认平滑 = 按角度 30°（FM129）；SU 里本来硬、夹角又小于 30° 的边手标成棱 = 转过来样子不变，之后新长的几何跟着默认平滑走
  return { kind: "mesh", kernel: m, materialSlots: [...b.materialSlots] };
}
/**
 * mesh → brep：三角化（约束 Delaunay，同屏幕）→ 导入那条「三角形 → 膜」管线（kernel/from-triangles.ts：量化合点 → 分平面 → 整批装 → 谓词挑脏的交结算机）。
 * 共面的三角形并成一张膜（盒子回来还是 6 张）；不平的 n 边形折成平面块、块之间按 softDeg 变软；隐藏的面不带；材质不带（披露在 castsTo.loses）。
 */
export function meshToBrep(b: MeshBody, softDeg: number): BrepBody {
  const m = b.kernel, verts = m.verts(), idx = new Map<number, number>(verts.map((v, i) => [v, i]));
  const positions = verts.map((v) => m.pt(v));
  const { tris, faceOfTri } = m.triangles();
  const t: number[] = [];
  for (let i = 0; i < tris.length; i += 3) { if (m.faceFlags[faceOfTri[i / 3]] & FF_HIDDEN) continue; t.push(idx.get(tris[i])!, idx.get(tris[i + 1])!, idx.get(tris[i + 2])!); }
  const { kernel } = kernelFromTriangles(positions, t, { softDeg });
  // 共面的三角形并回一张膜（同 FM80「软边两侧 180° 自动并掉」：软边、恰两张不同的膜、同一平面 → 擦边机 MERGE）；盒子回来还是 6 张、不留谜语人软边
  const flat = kernel.edges().filter((e) => { if (!kernel.isSoft(e.id) || e.faceLinks.length !== 2 || e.faceLinks[0] === e.faceLinks[1]) return false; const pa = kernel.planeOf(e.faceLinks[0]), pb = kernel.planeOf(e.faceLinks[1]); return !!pa && !!pb && pa.id === pb.id; }).map((e) => e.id);
  if (flat.length) kernel.eraseEdges(flat);
  return { kind: "brep", kernel, groups: new Map(), nextGroup: 1, materialSlots: [...b.materialSlots], guides: emptyGuides() };
}
/** 显式 cast（op 层调用）：只认登记表里的方向。opts.softDeg = mesh → brep 的软边角度（缺 = 20°）。 */
export function castBody(body: Body, to: BodyKind, opts?: { softDeg?: number }): Body {
  const c = canCast(body.kind, to);
  if (!c.ok) throw new Error(`cast: ${c.why}`);
  if (body.kind === "brep" && to === "mesh") return brepToMesh(body);
  if (body.kind === "mesh" && to === "brep") return meshToBrep(body, opts?.softDeg ?? 20);
  throw new Error(`cast: ${body.kind} → ${to} 登记了却没有实现（内部）`);
}
