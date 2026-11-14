// scene/kinds.ts —— kind 登记表（契约 ai-docs/20261024-object-model-contract.md §2 / §5）：每种身体声明可用模式、能 cast 到哪（丢什么）、对齐几何、包围盒。
// 加 kind = 加一条登记，不改既有的；cast 只在表里有的方向上成功、不做部分转换（user 2026-10-24「每个物体有一个kind，可以换，换了要explicit cast op用户点确认」）。
// created 2026-10-24 by Claude Fable 5.1 · 2026-10-27 mesh 身体换成可编辑的 mesh 内核（src/mesh/），brep → mesh 出多边形面不出三角汤（edited by Claude Fable 5.1）
import { HIDE_EDGE, HIDE_POLY, MATERIAL_INDEX, RESERVED_EDGE, RESERVED_FACE, SHARP_EDGE, SMOOTH, SOFT, UV_SEAM, edgeColumn, edgeMarkReader, faceHidden, faceMaterial, givenFaceValues, hiddenColumn, setEdgeMark } from "../mesh/reserved-columns.ts";
import { UV_COLUMN_IDS } from "./uv.ts";
import { cross3, ptKey3, quantize3, sub3, type PlaneParams, type Pt3 } from "../kernel/geom.ts";
import type { BodyKind } from "./body-kind.ts";
import type { Body, BrepBody, DefId, EmptyBody, MeshBody, Scene } from "./scene.ts";
import { reachableDefs } from "./resources.ts";
import { triangulateRings } from "../format/triangulate.ts";
import { MeshKernel, SMOOTH_DEFAULT_NEW } from "../mesh/mesh-kernel.ts";
import { FRESH } from "../mesh/columns.ts";
import { Kernel } from "../kernel/kernel.ts";
import { BUILTIN_BACK_SLOT } from "./builtin-materials.ts";
import { edgeLookOf, keepLookUnderAngle } from "../mesh/edge-smooth.ts";
import { kernelFromTriangles } from "../kernel/from-triangles.ts";
import { emptyGuides } from "./guides.ts";

export type KindModeId = "geometry" | "surface" | "freeform" | "paint" | "object";   // object = 摆放（空物体的工作台）
export interface AlignGeometry { points: Pt3[]; segments: [Pt3, Pt3][]; planes: PlaneParams[]; }
export interface KindDef<B extends Body = Body> {
  readonly id: BodyKind;
  readonly label: string;
  /** 给人看的名字（提示 / 确认框里「转成 X」「是 X」的 X；第 1 版第五节第 1 条：界面不写种类名，从这里取）。label 是登记表里的技术名。 */
  readonly noun: string;
  /** 这种身体可用的编辑模式（空 = 只在物体层摆）。 */
  readonly modes: readonly KindModeId[];
  /** 显式 cast 的去向 + 这个方向可能丢的那几种（第 1 版第五节 4½：名字一套，真转返回的清单不许出这个方向没声明的）。 */
  readonly castsTo: readonly { to: BodyKind; loses: readonly CastLossId[] }[];
  alignGeometry(body: B): AlignGeometry;
  bounds(body: B): { min: Pt3; max: Pt3 } | null;
}

const boundsOf = (pts: Iterable<Pt3>): { min: Pt3; max: Pt3 } | null => {
  let min: Pt3 | null = null, max: Pt3 | null = null;
  for (const p of pts) { if (!min || !max) { min = { ...p }; max = { ...p }; continue; } min = { x: Math.min(min.x, p.x), y: Math.min(min.y, p.y), z: Math.min(min.z, p.z) }; max = { x: Math.max(max.x, p.x), y: Math.max(max.y, p.y), z: Math.max(max.z, p.z) }; }
  return min && max ? { min, max } : null;
};

export const BREP_KIND: KindDef<BrepBody> = {
  id: "brep", label: "肥皂膜", noun: "硬表面体",
  modes: ["geometry", "surface"],
  castsTo: [{ to: "mesh", loses: ["holed-faces", "back-only-faces", "fold-edges", "curves", "groups", "guides"] }, { to: "empty", loses: ["material-slots", "guides"] }],
  alignGeometry(b) {
    const k = b.kernel, points = k.vertices().map((v) => ({ x: v.x, y: v.y, z: v.z }));
    const segments = k.edges().map((e) => [k.graph.pt(e.a), k.graph.pt(e.b)] as [Pt3, Pt3]);
    const planes = k.faces().map((f) => k.planeOf(f.id)!.plane);
    return { points, segments, planes };
  },
  bounds(b) { return boundsOf(b.kernel.vertices()); },
};
export const MESH_KIND: KindDef<MeshBody> = {
  id: "mesh", label: "网格", noun: "网格体",
  modes: ["freeform", "surface", "paint"],   // paint = 画画（贴图主线 1-7）   // surface = 表面（油漆桶）：W-12（2026-11-11）起网格体的面也能涂   // 自由建模工作台（modes/freeform.ts；2026-10-27 接缝：壳 + 选择；刀 / 拉 / 环切 = M4 Opus）
  castsTo: [{ to: "brep", loses: ["nonplanar-faces", "wires", "edge-marks", "seams", "smooth-default", "mirror", "uv-sets", "mixed-hidden", "lost-hidden-edges", "attr-columns"] }, { to: "empty", loses: ["material-slots", "mirror", "smooth-default", "uv-sets"] }],   // 隐藏的面 / 边照带（统筹 11-13 b）；带不过去的那种（背靠背一藏一露）转之前问：meshToBrepCheck
  alignGeometry(b) {
    const m = b.kernel, points = m.verts().map((v) => m.pt(v));
    const look = edgeLookOf(m), hid = edgeMarkReader(m, HIDE_EDGE);   // 每条边都问：三列一次拿在手里
    const segments = m.edges().filter((e) => !look.soft(e) && !hid(e)).map((e) => [m.pt(m.edgeA[e]), m.pt(m.edgeB[e])] as [Pt3, Pt3]);   // 画线的边（默认平滑 + 手标判，FM129）
    return { points, segments, planes: [] };
  },
  bounds(b) { const m = b.kernel; return boundsOf(m.verts().map((v) => m.pt(v))); },
};
/** 空物体（第 1 版第四节）：没有几何、没有编辑模式之外的「摆放」（modes/object.ts）；转去硬表面 / 网格体不丢东西（反方向只在自己没有几何时可用，丢的是那种身体才有的设置，见 BREP / MESH 的 castsTo）。 */
export const EMPTY_KIND: KindDef<EmptyBody> = {
  id: "empty", label: "空物体", noun: "空物体",
  modes: ["object"],
  castsTo: [{ to: "brep", loses: [] }, { to: "mesh", loses: [] }],
  alignGeometry() { return { points: [], segments: [], planes: [] }; },
  bounds() { return null; },
};
export const KINDS: Readonly<Record<BodyKind, KindDef>> = { brep: BREP_KIND as KindDef, mesh: MESH_KIND as KindDef, empty: EMPTY_KIND as KindDef };
export const kindOfBody = (b: Body): KindDef => KINDS[b.kind];
export function canCast(from: BodyKind, to: BodyKind): { ok: true; loses: readonly CastLossId[] } | { ok: false; why: string } {
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
 * 藏（统筹 11-13 b）：落到一张膜上的网格面全藏着 = 这张膜藏；有藏有露（背靠背的两张一张藏一张露、或者叠着的面被切过）= 膜只能整张藏或整张露 → 露着。
 * 返回会这样露出来的藏面有几张（按网格体的面数，不按膜数；转之前问的就是这个数）。
 */
function carryMeshSides(kernel: Kernel, m: MeshKernel, tris: ArrayLike<number>, faceOfTri: ArrayLike<number>, backSlot: () => number): number {
  interface Src { a: Pt3; b: Pt3; c: Pt3; n: Pt3; slot: number; hid: boolean; f: number }
  const src: Src[] = [], byCorners = new Map<string, Src[]>(), hide: number[] = [], shown = new Set<number>();
  const cornersKey = (pts: readonly Pt3[]): string => pts.map((p) => ptKey3(quantize3(p))).sort().join("|");
  for (let i = 0; i + 2 < tris.length; i += 3) {
    const f = faceOfTri[i / 3];
    const a = m.pt(tris[i]), b = m.pt(tris[i + 1]), c = m.pt(tris[i + 2]), s: Src = { a, b, c, n: cross3(sub3(b, a), sub3(c, a)), slot: faceMaterial(m, f), hid: faceHidden(m, f), f };
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
    const h = hits.filter((x) => x.hid);
    if (h.length === hits.length) hide.push(f.id); else for (const x of h) shown.add(x.f);
  }
  if (hide.length) kernel.setFaceHidden(hide, true);
  return shown.size;
}
/**
 * 网格体上藏着的边落回膜的边（统筹 11-13 b）：两头的点量化后是同一对 = 同一条；被结算机切开的 = 膜的边两头都落在那条藏边的线段上。在并共面的三角形之前跑（藏着的边不并掉，见 meshToBrepWith）。
 * 返回带不过去的条数（两头的点被并掉了之类）；不挨面的裸线不算（裸线整条不转，丢掉清单里写着）。
 */
function carryHiddenEdges(kernel: Kernel, m: MeshKernel): number {
  const hid = edgeMarkReader(m, HIDE_EDGE), key = (a: Pt3, b: Pt3): string => { const x = ptKey3(quantize3(a)), y = ptKey3(quantize3(b)); return x < y ? `${x}|${y}` : `${y}|${x}`; };
  const want = new Map<string, readonly [Pt3, Pt3]>();
  for (const e of m.edges()) if (hid(e) && m.eFaces(e).length) { const a = m.pt(m.edgeA[e]), b = m.pt(m.edgeB[e]); want.set(key(a, b), [a, b]); }
  if (!want.size) return 0;
  const on: number[] = [], got = new Set<string>(), rest: { id: number; a: Pt3; b: Pt3 }[] = [];
  for (const e of kernel.edges()) { const a = kernel.graph.pt(e.a), b = kernel.graph.pt(e.b), k = key(a, b); if (want.has(k)) { on.push(e.id); got.add(k); } else rest.push({ id: e.id, a, b }); }
  const onSeg = (p: Pt3, [a, b]: readonly [Pt3, Pt3]): boolean => { const ab = sub3(b, a), ap = sub3(p, a), L = dot(ab, ab); if (L <= 0) return false; const t = dot(ap, ab) / L; if (t < -1e-9 || t > 1 + 1e-9) return false; const d = sub3(ap, { x: ab.x * t, y: ab.y * t, z: ab.z * t }); return dot(d, d) <= 1e-12; };
  let lost = 0;
  for (const [k, seg] of want) { if (got.has(k)) continue; const pieces = rest.filter((r) => onSeg(r.a, seg) && onSeg(r.b, seg)); if (pieces.length) on.push(...pieces.map((r) => r.id)); else lost++; }
  if (on.length) kernel.setEdgeLayer("hidden", on, true);
  return lost;
}
/**
 * mesh → brep：三角化（约束 Delaunay，同屏幕）→ 导入那条「三角形 → 膜」管线（kernel/from-triangles.ts：量化合点 → 分平面 → 整批装 → 谓词挑脏的交结算机）。
 * 共面的三角形并成一张膜（盒子回来还是 6 张；两侧不一样的不并）；不平的 n 边形折成平面块、块之间按 softDeg 变软。
 * 两侧（计划书 §2.9「这是这种身体的表示法」）：环朝的那侧 = 它的材质 / 默认正面，另一侧 = 默认背面；重合反向的两张面并成一张膜、材质各落各侧。brep → mesh → brep 两侧都保住。
 * 藏（统筹 11-13 b；以前藏着的面不带 = 悄悄少了）：藏着的面照转、膜照藏，藏着的边照藏（carryMeshSides / carryHiddenEdges）；藏没藏不一样的不并、藏着的边不并掉。
 * 带不过去的两种数在返回值里（mixedHidden = 和露着的面合成一张膜、只好露出来的藏面张数；lostHiddenEdges = 对不上的藏边条数）：「转回硬表面体」转之前问（meshToBrepCheck）。
 */
export function meshToBrepWith(b: MeshBody, softDeg: number): { body: BrepBody; mixedHidden: number; lostHiddenEdges: number } {
  const m = b.kernel, verts = m.verts(), idx = new Map<number, number>(verts.map((v, i) => [v, i]));
  const positions = verts.map((v) => m.pt(v));
  const { tris, faceOfTri } = m.triangles();
  const t: number[] = [];
  for (let i = 0; i < tris.length; i += 3) t.push(idx.get(tris[i])!, idx.get(tris[i + 1])!, idx.get(tris[i + 2])!);
  const { kernel } = kernelFromTriangles(positions, t, { softDeg });
  const slots = [...b.materialSlots];
  const mixedHidden = carryMeshSides(kernel, m, tris, faceOfTri, () => { let i = slots.indexOf(BUILTIN_BACK_SLOT); if (i < 0) { i = slots.length; slots.push(BUILTIN_BACK_SLOT); } return i; });
  const lostHiddenEdges = carryHiddenEdges(kernel, m);
  kernel.faceLayers.backSlot = slots.indexOf(BUILTIN_BACK_SLOT);
  // 共面的三角形并回一张膜（和 FM80「软边两侧 180° 自动并掉」同一个判定 = Kernel.flatSoftMergeable：软边、恰两张不同的膜、同一平面、两侧材质相同、藏没藏相同、边本身没藏）→ 擦边机 MERGE；
  // 盒子回来还是 6 张、不留谜语人软边；两侧不一样 / 一藏一露 / 藏着的边 = 留着（统筹 11-13：两处判法收成一处，以前这里多看几样、挪一下点那边又并掉）
  const flat = kernel.edges().filter((e) => kernel.flatSoftMergeable(e.id)).map((e) => e.id);
  if (flat.length) kernel.eraseEdges(flat);
  return { body: { kind: "brep", kernel, groups: new Map(), nextGroup: 1, materialSlots: slots, guides: emptyGuides() }, mixedHidden, lostHiddenEdges };
}
export function meshToBrep(b: MeshBody, softDeg: number): BrepBody { return meshToBrepWith(b, softDeg).body; }
/**
 * 「转回硬表面体」转之前要问的数（统筹 11-13 b：带不过去的转之前明着说、让人选）：和真转是同一份算法（照转一遍、只要数）。
 * 网格体上一张藏面、一条挨面的藏边都没有 = 不用转就知道是 0（不藏东西的网格体不多花时间）。
 */
export function meshToBrepCheck(b: MeshBody, softDeg: number): { mixedHidden: number; lostHiddenEdges: number } {
  const m = b.kernel, fc = hiddenColumn(m), ec = edgeColumn(m, HIDE_EDGE);
  const any = (!!fc && m.faces().some((f) => fc.data[f] === 1)) || (!!ec && m.edges().some((e) => ec.data[e] === 1 && m.eFaces(e).length > 0));
  if (!any) return { mixedHidden: 0, lostHiddenEdges: 0 };
  const r = meshToBrepWith(b, softDeg);
  return { mixedHidden: r.mixedHidden, lostHiddenEdges: r.lostHiddenEdges };
}
/** 显式 cast（op 层调用）：只认登记表里的方向。opts.softDeg = mesh → brep 的软边角度（缺 = 20°）；opts.mirrored = 这个网格体开着对称（设置住在场景上，身体里看不到）。
 *  返回转好的身体 + 这一次带不过去的东西（castLosses 同一份算法；第 1 版第五节 4½）。返回了这个方向没声明的 = 抛（程序错误）。 */
export function castBody(body: Body, to: BodyKind, opts: CastOpts): { body: Body; losses: readonly CastLoss[] } {
  const c = canCast(body.kind, to);
  if (!c.ok) throw new Error(`cast: ${c.why}`);
  if (body.kind === "empty") return { body: to === "brep"   // 空物体 → 有几何的种类：一份空的身体（子物体挂在定义上，不归身体管，照留）
    ? { kind: "brep", kernel: new Kernel(), groups: new Map(), nextGroup: 1, materialSlots: [], guides: emptyGuides() }
    : { kind: "mesh", kernel: new MeshKernel(), materialSlots: [], uvSetSlots: [] }, losses: [] };
  if (to === "empty") {   // → 空物体：只在自己没有几何时（第 1 版第五节第 4 条；有几何 = 明说拒绝，不悄悄丢）
    if (!bodyBare(body)) throw new Error("cast: 还有几何，转不成空物体（空物体只装子物体）");
    return { body: { kind: "empty", materialSlots: [] }, losses: declared(body.kind, to, lossesOf(body, to, opts)) };
  }
  if (body.kind === "brep" && to === "mesh") return { body: brepToMesh(body), losses: declared("brep", to, lossesOf(body, to, opts)) };
  if (body.kind === "mesh" && to === "brep") {
    const r = meshToBrepWith(body, opts.softDeg ?? 20);
    return { body: r.body, losses: declared("mesh", to, lossesOf(body, to, opts, r)) };
  }
  throw new Error(`cast: ${body.kind} → ${to} 登记了却没有实现（内部）`);
}

// ---- 换种类带不过去什么：只算一处（第 1 版施工单第五节 4½，统筹 11-13 夜钉的接口） ----
/** 一种带不过去的东西一个名字（字面量联合，不是开放集）。 */
export type CastLossId =
  | "holed-faces" | "back-only-faces" | "fold-edges" | "curves" | "groups" | "guides"   // 硬表面体那边才有的（画图坐标架住在定义的头上，转种类照带，不在这里）
  | "nonplanar-faces" | "wires" | "edge-marks" | "seams" | "smooth-default" | "mirror" | "uv-sets" | "mixed-hidden" | "lost-hidden-edges" | "attr-columns"   // 网格体那边才有的
  | "material-slots";   // 转成空物体：有面的种类都有
/** 这一次带不过去的一样东西；0 个的不出现。设置这类不可数的 count = 1。 */
export interface CastLoss { readonly what: CastLossId; readonly count: number }
/** mirrored 必填（统筹 11-13 夜：可选的话新加一个入口忘了传，对称这一样就少报、没人拦）：对称设置住在场景的表上、不在身体上，只有调转换的那一层知道（载荷那几处明写 false）。 */
export interface CastOpts { readonly softDeg?: number; readonly mirrored: boolean }
/** 每一种叫什么、按什么数（label = 「可能丢」列表里那几个字；unit = 数量的量词，空 = 不可数的设置）。 */
const LOSS_WORDS: Readonly<Record<CastLossId, { readonly label: string; readonly unit: string; readonly how?: string }>> = {
  "holed-faces": { label: "带洞的面", unit: "张", how: "变成三角形，内部的边软 + 平滑" },
  "back-only-faces": { label: "两侧都是默认背面的面", unit: "张", how: "不出面" },
  "fold-edges": { label: "折线", unit: "条", how: "变成软 + 平滑的边" },
  curves: { label: "曲线实体", unit: "条", how: "圆 / 弧 / 焊接链变回一段段的边" },
  groups: { label: "组分区", unit: "个", how: "组里的几何并进来，组没了" },
  guides: { label: "参考线 / 参考点", unit: "个" },
  "nonplanar-faces": { label: "不平的面", unit: "张", how: "折成平面块，块之间加软边" },
  wires: { label: "裸线", unit: "条", how: "不属于任何面的边" },
  "edge-marks": { label: "棱 / 平滑的手标", unit: "条", how: "改按弯折角度重判" },
  seams: { label: "接缝标记", unit: "条" },
  "smooth-default": { label: "默认平滑的设置", unit: "" },
  mirror: { label: "对称设置", unit: "" },
  "uv-sets": { label: "贴图坐标的表", unit: "套" },
  "mixed-hidden": { label: "藏着的面", unit: "张", how: "和背靠背 / 叠着的露着的面合成一张膜，只好露出来" },
  "lost-hidden-edges": { label: "藏着的边", unit: "条", how: "两头的点并掉了，「藏」对不上" },
  "attr-columns": { label: "自己加的属性列", unit: "列" },
  "material-slots": { label: "材质槽表", unit: "个" },
};
/**
 * 每个种类自己的载荷有哪几样（第五节 4½ 第 5 条；和第四节「一个定义 = 每个种类都一样的头 + 这个种类自己的载荷」同一张：头〔guid / 名字 / 子物体……〕不在这里）。
 * 加载荷 / 加属性列 = 这里加一样 + 下面每个转换方向写明去向（守卫 test/cast-losses.test.ts：少一样 = 红）。
 */
export const KIND_PAYLOAD = {
  brep: ["rules", "faces", "face-sides", "hidden-faces", "holes", "edges", "soft-edges", "hidden-edges", "fold-edges", "curves", "groups", "guides", "material-slots"],
  mesh: ["faces", "face-materials", "hidden-faces", "nonplanar-faces", "edges", "edge-marks", "hidden-edges", "seams", "wires", "smooth-default", "mirror", "uv-sets", "attr-columns", "material-slots"],
  empty: [],
} as const;
export type PayloadOf<K extends BodyKind> = (typeof KIND_PAYLOAD)[K][number];
/** 一样载荷转过去的去向：带过去 / 换算成什么 / 丢（数得出来的那一种，可能是一部分）/ 有就转不了（转成空物体只在没有几何时）。 */
export type CastFate = "carried" | { readonly converted: string } | { readonly lost: CastLossId } | { readonly blocks: string };
/** 网格体内核上的保留列各属于哪一样载荷（守卫：保留列一个不落）。 */
export const MESH_COLUMN_PAYLOAD: Readonly<Record<string, PayloadOf<"mesh">>> = {
  [HIDE_POLY.id]: "hidden-faces", [MATERIAL_INDEX.id]: "face-materials", [SHARP_EDGE.id]: "edge-marks", [SMOOTH.id]: "edge-marks", [SOFT.id]: "edge-marks", [UV_SEAM.id]: "seams", [HIDE_EDGE.id]: "hidden-edges",
  ...Object.fromEntries([...UV_COLUMN_IDS].map((id) => [id, "uv-sets" as const])),   // 贴图坐标那两列的名字只在 scene/uv.ts（守卫 paint-start-guard ⑦）
};
const NO_GEOM = { blocks: "还有几何，转不成空物体" } as const;
/** 每个转换方向上每一样的去向（第五节 4½ 第 5 条）。丢的那几样 = 这个方向 castsTo 声明的「可能丢」（守卫对账）。 */
export const CAST_FATES: { readonly [F in BodyKind]: { readonly [T in BodyKind]?: { readonly [P in PayloadOf<F>]: CastFate } } } = {
  brep: {
    mesh: {
      rules: { converted: "网格体没有这套规矩（推拉 / 偏移 / 跟随不可用）；转回硬表面体时照回来，不算丢" }, faces: { lost: "back-only-faces" }, "face-sides": { converted: "按侧出面：一侧一张，两侧都出 = 叠着的两张；两侧都是默认背面的那张不出（= 丢的那几张）" }, "hidden-faces": "carried", holes: { lost: "holed-faces" },
      edges: "carried", "soft-edges": { converted: "软 + 平滑的手标；默认平滑 = 按角度 30°" }, "hidden-edges": "carried", "fold-edges": { lost: "fold-edges" }, curves: { lost: "curves" },
      groups: { lost: "groups" }, guides: { lost: "guides" }, "material-slots": "carried",
    },
    empty: {
      rules: { converted: "空物体没有几何，规矩不适用" }, faces: NO_GEOM, "face-sides": NO_GEOM, "hidden-faces": NO_GEOM, holes: NO_GEOM, edges: NO_GEOM, "soft-edges": NO_GEOM, "hidden-edges": NO_GEOM,
      "fold-edges": NO_GEOM, curves: NO_GEOM, groups: NO_GEOM, guides: { lost: "guides" }, "material-slots": { lost: "material-slots" },
    },
  },
  mesh: {
    brep: {
      faces: { converted: "三角化后共面的并回一张膜" }, "face-materials": { converted: "落回膜的两侧" }, "hidden-faces": { lost: "mixed-hidden" }, "nonplanar-faces": { lost: "nonplanar-faces" },
      edges: "carried", "edge-marks": { lost: "edge-marks" }, "hidden-edges": { lost: "lost-hidden-edges" }, seams: { lost: "seams" }, wires: { lost: "wires" }, "smooth-default": { lost: "smooth-default" },
      mirror: { lost: "mirror" }, "uv-sets": { lost: "uv-sets" }, "attr-columns": { lost: "attr-columns" }, "material-slots": "carried",
    },
    empty: {
      faces: NO_GEOM, "face-materials": NO_GEOM, "hidden-faces": NO_GEOM, "nonplanar-faces": NO_GEOM, edges: NO_GEOM, "edge-marks": NO_GEOM, "hidden-edges": NO_GEOM, seams: NO_GEOM, wires: NO_GEOM,
      "smooth-default": { lost: "smooth-default" }, mirror: { lost: "mirror" }, "uv-sets": { lost: "uv-sets" }, "attr-columns": NO_GEOM, "material-slots": { lost: "material-slots" },
    },
  },
  empty: { brep: {}, mesh: {} },
};
/** 「可能丢」列表里的名字（物体窗口照声明列，不为开窗口转一遍）。 */
export const lossLabel = (id: CastLossId): string => LOSS_WORDS[id].label;
/** 给人看的一句；全仓只此一处造句。 */
export function lossText(l: CastLoss): string {
  const w = LOSS_WORDS[l.what], n = w.unit ? `${l.count} ${w.unit}` : "";
  return `${w.label}${n ? ` ${n}` : ""}${w.how ? `（${w.how}）` : ""}`;
}
/** 一串连起来（询问里逐条列）；空 = 「不丢东西」。 */
export const lossesText = (ls: readonly CastLoss[]): string => (ls.length ? ls.map(lossText).join("；") : "不丢东西");
/** 几份清单并成一份（同一样的数加起来；粘贴 / 移到…的载荷里好几块几何各转各的）。 */
export function sumLosses(lists: readonly (readonly CastLoss[])[]): readonly CastLoss[] {
  const by = new Map<CastLossId, number>();
  for (const ls of lists) for (const l of ls) by.set(l.what, (by.get(l.what) ?? 0) + l.count);
  return [...by].filter(([, n]) => n > 0).map(([what, count]) => ({ what, count }));
}
/** 只问不转：和真转同一份算法（网格体转硬表面有藏东西时照转一遍，只要清单）。 */
export function castLosses(body: Body, to: BodyKind, opts: CastOpts): readonly CastLoss[] {
  const c = canCast(body.kind, to);
  if (!c.ok || body.kind === "empty") return [];
  if (to === "empty" && !bodyBare(body)) return [];   // 转不了（有几何）：问的人自己看 canCast / bodyBare，这里没有「这一次」的数
  return declared(body.kind, to, lossesOf(body, to, opts));
}
/** 自己没有几何（挂着子物体不算）。 */
export function bodyBare(b: Body): boolean {
  if (b.kind === "empty") return true;
  return b.kind === "mesh" ? b.kernel.faceCount() === 0 && b.kernel.edges().length === 0 : b.kernel.faces().length === 0 && b.kernel.edges().length === 0 && b.groups.size === 0;
}
/** 清单里每一样都得是这个方向声明过的（「可能丢」和「这一次丢」同一组名字，漂不开）；0 个的去掉。 */
function declared(from: BodyKind, to: BodyKind, ls: readonly CastLoss[]): readonly CastLoss[] {
  const allowed = KINDS[from].castsTo.find((x) => x.to === to)?.loses ?? [];
  for (const l of ls) if (l.count > 0 && !allowed.includes(l.what)) throw new Error(`cast: ${from} → ${to} 返回了没声明的丢失 ${l.what}（内部）`);
  return ls.filter((l) => l.count > 0);
}
const guideCount = (g: { lines: unknown[]; points: unknown[]; circles?: unknown[]; spheres?: unknown[] }): number => g.lines.length + g.points.length + (g.circles?.length ?? 0) + (g.spheres?.length ?? 0);
const isPlanarRing = (pts: readonly Pt3[]): boolean => {
  if (pts.length <= 3) return true;
  const n = newell(pts), L = Math.hypot(n.x, n.y, n.z);
  if (L <= 1e-12) return true;
  const u = { x: n.x / L, y: n.y / L, z: n.z / L }, d0 = dot(u, pts[0]);
  return pts.every((p) => Math.abs(dot(u, p) - d0) <= 1e-6);
};
/** 每个方向逐样数（真转传 r = 网格体转硬表面已经算好的两个藏东西的数，不再转第二遍）。 */
function lossesOf(body: Exclude<Body, EmptyBody>, to: BodyKind, opts: CastOpts, r?: { mixedHidden: number; lostHiddenEdges: number }): CastLoss[] {
  const out: CastLoss[] = [], add = (what: CastLossId, count: number): void => { if (count > 0) out.push({ what, count }); };
  if (body.kind === "brep") {
    const pools = [body.kernel, ...[...body.groups.values()].map((g) => g.kernel)];   // 硬表面的规矩不算丢：转回来照回来（回得来的不算，和默认平滑同一条）
    if (to === "mesh") {
      add("holed-faces", pools.reduce((n, k) => n + k.faces().filter((f) => (k.face(f.id)?.holes.length ?? 0) > 0).length, 0));
      add("back-only-faces", brepSideCounts(body).neither);
      add("fold-edges", pools.reduce((n, k) => n + k.edges().filter((e) => k.isFold(e.id)).length, 0));
      add("curves", pools.reduce((n, k) => n + k.curves().length, 0));
      add("groups", body.groups.size);
    } else add("material-slots", body.materialSlots.length);
    add("guides", guideCount(body.guides) + [...body.groups.values()].reduce((n, g) => n + guideCount(g.guides), 0));
    return out;
  }
  const m = body.kernel;
  if (to === "brep") {
    add("nonplanar-faces", m.faces().filter((f) => !isPlanarRing(m.faceVerts(f).map((v) => m.pt(v)))).length);
    add("wires", m.edges().filter((e) => m.eFaces(e).length === 0).length);
    const sharp = edgeMarkReader(m, SHARP_EDGE), smooth = edgeMarkReader(m, SMOOTH), soft = edgeMarkReader(m, SOFT), seam = edgeMarkReader(m, UV_SEAM);
    add("edge-marks", m.edges().filter((e) => sharp(e) || smooth(e) || soft(e)).length);
    add("seams", m.edges().filter((e) => seam(e)).length);
    const known = new Set([...RESERVED_FACE, ...RESERVED_EDGE].map((d) => d.id).concat([...UV_COLUMN_IDS]));
    add("attr-columns", m.columnDefs().filter((d) => !known.has(d.id)).length);
    const h = r ?? meshToBrepCheck(body, opts.softDeg ?? 20);
    add("mixed-hidden", h.mixedHidden);
    add("lost-hidden-edges", h.lostHiddenEdges);
  } else add("material-slots", body.materialSlots.length);
  const sd = m.smoothDefault, back = to === "brep" ? { mode: "angle", deg: 30 } : SMOOTH_DEFAULT_NEW;   // 转回来时它会被设成什么（硬表面 → 网格体 = 按角度 30°；空物体 → 网格体 = 新网格体的默认）：一样 = 回得来，不算丢
  add("smooth-default", sd.mode === back.mode && (sd.mode !== "angle" || sd.deg === back.deg) ? 0 : 1);
  add("mirror", opts.mirrored ? 1 : 0);
  add("uv-sets", body.uvSetSlots.length);
  return out;
}
