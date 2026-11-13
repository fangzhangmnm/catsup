// scene/kinds.ts —— kind 登记表（契约 ai-docs/20261024-object-model-contract.md §2 / §5）：每种身体声明可用模式、能 cast 到哪（丢什么）、对齐几何、包围盒。
// 加 kind = 加一条登记，不改既有的；cast 只在表里有的方向上成功、不做部分转换（user 2026-10-24「每个物体有一个kind，可以换，换了要explicit cast op用户点确认」）。
// created 2026-10-24 by Claude Fable 5.1 · 2026-10-27 mesh 身体换成可编辑的 mesh 内核（src/mesh/），brep → mesh 出多边形面不出三角汤（edited by Claude Fable 5.1）
import { HIDE_EDGE, SMOOTH, SOFT, edgeMark, faceHidden, faceMaterial, givenFaceValues, setEdgeMark } from "../mesh/reserved-columns.ts";
import { cross3, ptKey3, quantize3, sub3, type PlaneParams, type Pt3 } from "../kernel/geom.ts";
import type { BodyKind } from "./body-kind.ts";
import type { Body, BrepBody, DefId, MeshBody, Scene } from "./scene.ts";
import { reachableDefs } from "./resources.ts";
import { triangulateRings } from "../format/triangulate.ts";
import { MeshKernel } from "../mesh/mesh-kernel.ts";
import { FRESH } from "../mesh/columns.ts";
import type { Kernel } from "../kernel/kernel.ts";
import { BUILTIN_BACK_SLOT } from "./builtin-materials.ts";
import { edgeSoft, keepLookUnderAngle } from "../mesh/edge-smooth.ts";
import { kernelFromTriangles } from "../kernel/from-triangles.ts";
import { emptyGuides } from "./guides.ts";

export type KindModeId = "geometry" | "surface" | "freeform" | "paint";
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
  castsTo: [{ to: "mesh", loses: ["拓扑公理（共面即同面、重合即同点；推拉 / 偏移 / 跟随不再可用）", "带洞的面（变成三角形，内部的边软 + 平滑）", "默认背面那一侧（不出面）", "折线（变成软 + 平滑的边）", "曲线实体（圆 / 弧 / 焊接链）", "组分区", "参考几何"] }],
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
  modes: ["freeform", "surface", "paint"],   // paint = 画画（贴图主线 1-7）   // surface = 表面（油漆桶）：W-12（2026-11-11）起网格体的面也能涂   // 自由建模工作台（modes/freeform.ts；2026-10-27 接缝：壳 + 选择；刀 / 拉 / 环切 = M4 Opus）
  castsTo: [{ to: "brep", loses: ["不平的面（折成平面块，块之间加软边）", "隐藏的面", "裸线（不属于任何面的边）", "软边 / 平滑标记（改按弯折角度重判）"] }],
  alignGeometry(b) {
    const m = b.kernel, points = m.verts().map((v) => m.pt(v));
    const segments = m.edges().filter((e) => !edgeSoft(m, e) && !edgeMark(m, e, HIDE_EDGE)).map((e) => [m.pt(m.edgeA[e]), m.pt(m.edgeB[e])] as [Pt3, Pt3]);   // 画线的边（默认平滑 + 手标判，FM129）
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

/** 这个槽是内置默认背面吗（槽表 = 这具身体的；粘贴载荷转换时槽号就是对照表的编号，槽表由 transfer.ts 按对照表造）。 */
const slotIsBack = (slots: readonly number[]) => (slot: number): boolean => slot >= 0 && slots[slot] === BUILTIN_BACK_SLOT;
/** 转网格体要披露的数（计划书 §9.2½ ②：转换不问，只报）：N 张面两侧都出（= 两张叠着的面）、其中 M 张材质不同、K 张两侧都是默认背面（转过去就没了）。隐藏的面照算（隐藏照样转）。 */
export interface BrepSideCounts { both: number; differ: number; neither: number }
/**
 * 一份算法两处用（计划书 §12 C3）：N 张面两侧都出、其中 M 张两侧材质不同、K 张两侧都是默认背面（整张不出）。按材质比，不按槽号比（和 bake 看到的一样）。
 * skipHidden = 隐藏的面不算（导出：bake 不出隐藏面）；转网格体隐藏的照转，所以照算。
 */
export function brepSideCounts(b: BrepBody, opts: { skipHidden?: boolean } = {}, into: BrepSideCounts = { both: 0, differ: 0, neither: 0 }): BrepSideCounts {
  const isBack = slotIsBack(b.materialSlots), out = into;
  for (const k of [b.kernel, ...[...b.groups.values()].map((g) => g.kernel)]) for (const f of k.faces()) {
    if (opts.skipHidden && k.isFaceHidden(f.id)) continue;
    const sF = k.faceMaterialOf(f.id, 0) ?? -1, sB = k.faceMaterialOf(f.id, 1) ?? -1, bF = isBack(sF), bB = isBack(sB);
    if (bF && bB) out.neither++;
    else if (!bF && !bB) { out.both++; if ((b.materialSlots[sF] ?? -1) !== (b.materialSlots[sB] ?? -1)) out.differ++; }
  }
  return out;
}
/** 导出表单的说明行：从根（或选中物件的定义）沿实例引用走一遍，一份定义只算一次；网格体的面 = 文件里的面，一张面一个朝向，不算。O(这些定义的面数)，不序列化模型。 */
export function exportSideCounts(s: Scene, only?: readonly DefId[]): BrepSideCounts {
  const out: BrepSideCounts = { both: 0, differ: 0, neither: 0 };
  for (const id of reachableDefs(s, only ?? [s.root])) { const b = s.def(id).body; if (b.kind === "brep") brepSideCounts(b, { skipHidden: true }, out); }
  return out;
}
/** 一个 brep 池 → 往网格里加（自己的点表；面 / 裸线 / 边标记照搬）。要出几侧就几张面（共用点，和导入焊点一致）：一侧 = 一张面，绕向朝它、材质是它那一侧的；默认背面不出。 */
function addBrepPool(m: MeshKernel, k: Kernel, isBack: (slot: number) => boolean): void {
  const vid = new Map<number, number>();
  const vi = (id: number): number => { let i = vid.get(id); if (i === undefined) { i = m.addVertex(k.graph.pt(id)); vid.set(id, i); } return i; };
  const brepEdge = new Set<string>();
  for (const e of k.edges()) brepEdge.add(e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`);
  for (const f of k.faces()) {
    const F = k.face(f.id)!, rec = k.planeOf(f.id)!, n = rec.plane.n, hidden = k.isFaceHidden(f.id);
    const sides = ([[1, k.faceMaterialOf(f.id, 0) ?? -1], [-1, k.faceMaterialOf(f.id, 1) ?? -1]] as const).filter(([, slot]) => !isBack(slot));
    if (!sides.length) continue;   // 两侧都是默认背面：这张面没了（brepSideCounts.neither 报数）
    const add = (ring: number[]): void => { for (const [sgn, slot] of sides) { const r = dot(newell(ring.map((v) => m.pt(v))), n) * sgn < 0 ? [...ring].reverse() : ring; m.addFace(r, { kind: "fresh", face: givenFaceValues(m, { material: slot, hidden }) });   /* 硬表面转网格体 = 凭空来的（材质、隐藏照给） */ } };
    if (!F.holes.length) { add(F.outer.vids.map(vi)); continue; }
    const outer = F.outer.vids, holes = F.holes.map((h) => h.vids), all = [...new Set([...outer, ...holes.flat()])];
    const local = new Map<number, number>(all.map((v, i) => [v, i]));
    const tris = triangulateRings(all.map((v) => k.graph.pt(v)), rec.plane, outer.map((v) => local.get(v)!), holes.map((h) => h.map((v) => local.get(v)!)));
    if (!tris.length) throw new Error(`cast: face ${f.id} could not be triangulated`);
    for (const [a, b2, c] of tris) add([vi(all[a]), vi(all[b2]), vi(all[c])]);
  }
  for (const e of k.edges()) {
    if (e.faceLinks.length === 0) m.setWire(m.ensureEdge(vi(e.a), vi(e.b)), true);
  }
  const brepIdOf = new Map<number, number>([...vid].map(([b2, mm]) => [mm, b2]));
  for (const me of m.edges()) {
    if (!brepIdOf.has(m.edgeA[me]) || !brepIdOf.has(m.edgeB[me])) continue;   // 别的池的边
    const a = brepIdOf.get(m.edgeA[me])!, bb = brepIdOf.get(m.edgeB[me])!, key = a < bb ? `${a}-${bb}` : `${bb}-${a}`;
    if (!brepEdge.has(key)) { setEdgeMark(m, me, SOFT, true); setEdgeMark(m, me, SMOOTH, true); continue; }   // 三角化出来的内部边：看不见、明暗连续
    const eid = k.graph.vertex(a).edges;
    for (const x of eid) { const E = k.graph.edge(x); if ((E.a === a && E.b === bb) || (E.a === bb && E.b === a)) { if (k.isSoft(x) || k.isFold(x)) setEdgeMark(m, me, SOFT, true); if (k.isSmooth(x) || k.isFold(x)) setEdgeMark(m, me, SMOOTH, true); if (k.isEdgeHidden(x)) setEdgeMark(m, me, HIDE_EDGE, true); } }   // 硬表面的边层照给（给定的值，按保留名写）
  }
}
/**
 * brep → mesh（单面 / 双面第四版，计划书 §2.9 / §9.2-F；user 11-04「要出几侧就几张面」）：每张膜按侧出面，绕向 = 那一侧朝外（网格体一张面一个朝向）；两侧都出 = 两张重合反向的面（共用点）；默认背面不出。
 * 带洞的膜三角化（mesh 的面不带洞），三角形之间的内部边软 + 平滑（看起来还是一张面）；边标记照搬（软 / 平滑 / 隐藏；折线 = 软 + 平滑）；悬空的边 = 裸线；隐藏的面照旧隐藏；组里的几何一起并进来（组分区丢掉）。失败（某膜三角化不了）= 整个 cast 拒。
 * 不再做法向一致化（recalcNormals）：哪侧朝外是用户看得见、自己定的（默认背面 / 修复「自动朝外」），不猜。
 */
export function brepToMesh(b: BrepBody): MeshBody {
  const m = new MeshKernel(), isBack = slotIsBack(b.materialSlots);
  // 根池 + 每个组的池（组 = 分区、不是物体：几何本来就在定义坐标里，并进来就行；2026-10-28 以前只转根池 = 组里的几何静默丢了。各池各自的点，不焊）
  addBrepPool(m, b.kernel, isBack);
  for (const g of [...b.groups.values()].sort((x, y) => x.id - y.id)) addBrepPool(m, g.kernel, isBack);
  keepLookUnderAngle(m, 30);   // 默认平滑 = 按角度 30°（FM129）；SU 里本来硬、夹角又小于 30° 的边手标成棱 = 转过来样子不变，之后新长的几何跟着默认平滑走
  return { kind: "mesh", kernel: m, materialSlots: [...b.materialSlots], uvSetSlots: [] };
}
/** p 落在三角形 abc 里（p 已知在它的平面上；重心坐标都 ≥ −容差）。 */
const inTriangle = (p: Pt3, a: Pt3, b: Pt3, c: Pt3): boolean => {
  const v0 = sub3(c, a), v1 = sub3(b, a), v2 = sub3(p, a), d00 = dot(v0, v0), d01 = dot(v0, v1), d02 = dot(v0, v2), d11 = dot(v1, v1), d12 = dot(v1, v2), det = d00 * d11 - d01 * d01;
  if (det <= 0) return false;
  const u = (d11 * d02 - d01 * d12) / det, v = (d00 * d12 - d01 * d02) / det;
  return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6;
};
/**
 * 网格的面落回膜的两侧（计划书 §9.3-6）：网格面朝着的那一侧 = 它的材质或默认正面，没有网格面朝着的那一侧 = 默认背面；重合反向的两张面（内核按三个点去重成一张膜）材质各落各侧。
 * 认法：干净的三角形按三个角认回来；被结算机切过的按面里一个点落在哪些三角形里认。在并共面的三角形之前跑（并的时候要比两侧）。
 */
function carryMeshSides(kernel: Kernel, m: MeshKernel, tris: ArrayLike<number>, faceOfTri: ArrayLike<number>, backSlot: () => number): void {
  interface Src { a: Pt3; b: Pt3; c: Pt3; n: Pt3; slot: number }
  const src: Src[] = [], byCorners = new Map<string, Src[]>();
  const cornersKey = (pts: readonly Pt3[]): string => pts.map((p) => ptKey3(quantize3(p))).sort().join("|");
  for (let i = 0; i + 2 < tris.length; i += 3) {
    const f = faceOfTri[i / 3];
    if (faceHidden(m, f)) continue;
    const a = m.pt(tris[i]), b = m.pt(tris[i + 1]), c = m.pt(tris[i + 2]), s: Src = { a, b, c, n: cross3(sub3(b, a), sub3(c, a)), slot: faceMaterial(m, f) };
    src.push(s);
    const key = cornersKey([a, b, c]), list = byCorners.get(key);
    if (list) list.push(s); else byCorners.set(key, [s]);
  }
  for (const f of kernel.faces()) {
    const rings = kernel.faceRings3(f.id)!, plane = kernel.planeOf(f.id)!.plane;
    let hits = !rings.holes.length && rings.outer.length === 3 ? byCorners.get(cornersKey(rings.outer)) : undefined;
    if (!hits) {   // 被切过：取面里一个点（第一个三角形的重心）
      const pts = [...rings.outer], outer = rings.outer.map((_, i) => i), holes: number[][] = [];
      for (const h of rings.holes) { holes.push(h.map((_, i) => pts.length + i)); pts.push(...h); }
      const t = triangulateRings(pts, plane, outer, holes)[0];
      if (!t) continue;
      const p = { x: (pts[t[0]].x + pts[t[1]].x + pts[t[2]].x) / 3, y: (pts[t[0]].y + pts[t[1]].y + pts[t[2]].y) / 3, z: (pts[t[0]].z + pts[t[1]].z + pts[t[2]].z) / 3 };
      const onPlane = (q: Pt3): boolean => Math.abs(dot(q, plane.n) - plane.d) <= 1e-3;
      hits = src.filter((s) => onPlane(s.a) && onPlane(s.b) && onPlane(s.c) && (inTriangle(p, s.a, s.b, s.c) || inTriangle(p, s.a, s.c, s.b)));
    }
    if (!hits.length) continue;
    const onSide: [number | null, number | null] = [null, null];   // 这一侧朝着它的网格面的槽；null = 没有网格面朝这侧
    for (const s of hits) { const side = dot(s.n, plane.n) >= 0 ? 0 : 1; if (onSide[side] === null || onSide[side]! < 0) onSide[side] = s.slot; }
    for (const side of [0, 1] as const) { const v = onSide[side]; if (v === null) kernel.setFaceMaterial([f.id], backSlot(), [side]); else if (v >= 0) kernel.setFaceMaterial([f.id], v, [side]); }
  }
}
/**
 * mesh → brep：三角化（约束 Delaunay，同屏幕）→ 导入那条「三角形 → 膜」管线（kernel/from-triangles.ts：量化合点 → 分平面 → 整批装 → 谓词挑脏的交结算机）。
 * 共面的三角形并成一张膜（盒子回来还是 6 张；两侧不一样的不并）；不平的 n 边形折成平面块、块之间按 softDeg 变软；隐藏的面不带。
 * 两侧（计划书 §2.9「这是这种身体的表示法」）：环朝的那侧 = 它的材质 / 默认正面，另一侧 = 默认背面；重合反向的两张面并成一张膜、材质各落各侧。brep → mesh → brep 两侧都保住。
 */
export function meshToBrep(b: MeshBody, softDeg: number): BrepBody {
  const m = b.kernel, verts = m.verts(), idx = new Map<number, number>(verts.map((v, i) => [v, i]));
  const positions = verts.map((v) => m.pt(v));
  const { tris, faceOfTri } = m.triangles();
  const t: number[] = [];
  for (let i = 0; i < tris.length; i += 3) { if (faceHidden(m, faceOfTri[i / 3])) continue; t.push(idx.get(tris[i])!, idx.get(tris[i + 1])!, idx.get(tris[i + 2])!); }
  const { kernel } = kernelFromTriangles(positions, t, { softDeg });
  const slots = [...b.materialSlots];
  carryMeshSides(kernel, m, tris, faceOfTri, () => { let i = slots.indexOf(BUILTIN_BACK_SLOT); if (i < 0) { i = slots.length; slots.push(BUILTIN_BACK_SLOT); } return i; });
  kernel.faceLayers.backSlot = slots.indexOf(BUILTIN_BACK_SLOT);
  const sameSides = (x: number, y: number): boolean => kernel.faceMaterialOf(x, 0) === kernel.faceMaterialOf(y, 0) && kernel.faceMaterialOf(x, 1) === kernel.faceMaterialOf(y, 1);
  // 共面的三角形并回一张膜（同 FM80「软边两侧 180° 自动并掉」：软边、恰两张不同的膜、同一平面 → 擦边机 MERGE）；盒子回来还是 6 张、不留谜语人软边
  const flat = kernel.edges().filter((e) => { if (!kernel.isSoft(e.id) || e.faceLinks.length !== 2 || e.faceLinks[0] === e.faceLinks[1]) return false; const pa = kernel.planeOf(e.faceLinks[0]), pb = kernel.planeOf(e.faceLinks[1]); return !!pa && !!pb && pa.id === pb.id && sameSides(e.faceLinks[0], e.faceLinks[1]); }).map((e) => e.id);
  if (flat.length) kernel.eraseEdges(flat);
  return { kind: "brep", kernel, groups: new Map(), nextGroup: 1, materialSlots: slots, guides: emptyGuides() };
}
/** 显式 cast（op 层调用）：只认登记表里的方向。opts.softDeg = mesh → brep 的软边角度（缺 = 20°）。 */
export function castBody(body: Body, to: BodyKind, opts?: { softDeg?: number }): Body {
  const c = canCast(body.kind, to);
  if (!c.ok) throw new Error(`cast: ${c.why}`);
  if (body.kind === "brep" && to === "mesh") return brepToMesh(body);
  if (body.kind === "mesh" && to === "brep") return meshToBrep(body, opts?.softDeg ?? 20);
  throw new Error(`cast: ${body.kind} → ${to} 登记了却没有实现（内部）`);
}
