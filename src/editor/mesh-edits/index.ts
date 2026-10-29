// mesh-edits/index.ts —— 网格体的菜单动词（mesh.* 族；浮条 / 右键入口，自由建模工作台）。created 2026-10-27 by Claude Opus 5.5
// 工具手势（挤出 / 挪 / 刀……）直接提交 op；这里是不用手势、选了就能点的那一类。第一条 = 环切（刀在一条边上点两下的菜单版，FM10「也加一个模式按钮，免得我不习惯」）。
// 做完的选区走 PlanOut.select（规划时在副本上跑一遍拿新 id；op 确定性 = 提交后同一批）。
import type { Command, MeshUnit } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
import { loopCut as loopCutOp, knife as knifeOp, maxInset, selectionVerts, bevelEdges, bevelVerts, looseBits, duplicateGeometry, fillOrBridge } from "../../mesh/ops/index.ts";
import { snapToSymmetry, type MirrorAxis, type SnapSide } from "../../mesh/mirror.ts";
import { F_SHARP, F_SMOOTH, F_SOFT, type MeshKernel, type SmoothDefaultMode } from "../../mesh/mesh-kernel.ts";
import type { QuantityTag } from "../units.ts";
/** 长度字段：值存米，显示 / − + / 打字按用户选的单位（units.ts）。 */
const LEN: QuantityTag = { q: "length" };

/** 两个点共有的面（最小 id；没有 = null）。 */
function commonFaceOf(m: MeshKernel, a: number, b: number): number | null {
  const fa = new Set<number>(); for (const e of m.vEdges(a)) for (const f of m.eFaces(e)) fa.add(f);
  let best: number | null = null; for (const e of m.vEdges(b)) for (const f of m.eFaces(e)) if (fa.has(f) && (best === null || f < best)) best = f;
  return best;
}

/** 连线（Blender J = Connect Vertex Path 的两点版；user 10-27「blender里面选择两个点之后ctrl j 是连线对吧」——是 J，Ctrl+J 是合并物体）：同一张面上的两个点之间切一刀。 */
export const connect: Command<MeshUnit> = {
  id: "mesh.connect", unit: "mesh", title: "连线",
  defaults: () => ({}),
  params: () => [],
  plan(env, u) {
    if (!u.sel || u.sel.verts.size !== 2 || u.sel.edges.size || u.sel.faces.size) return { ops: [], count: 0 };
    const [a, b] = [...u.sel.verts].sort((x, y) => x - y), m = env.scene.mesh(u.def).kernel;
    if (!m.hasV(a) || !m.hasV(b)) return { ops: [], count: 0 };
    if (m.edgeOf(a, b) >= 0) return { ops: [], count: 0, notes: ["这两个点之间已经有边了"] };
    const f = commonFaceOf(m, a, b);
    if (f === null) return { ops: [], count: 0, notes: ["这两个点不在同一张面上"] };
    const probe = m.clone(); knifeOp(probe, f, [{ v: a }, { v: b }]);
    return { ops: [{ op: "meshKnife", def: u.def, face: f, path: [{ v: a }, { v: b }] }], count: 1, select: { edges: [probe.edgeOf(a, b)] } };
  },
  done: () => "连线：两个点之间切了一刀（新边在选区里）",
  none: "连线：选同一张面上的两个点（J）",
};

export const loopCut: Command<MeshUnit> = {
  id: "mesh.loopCut", unit: "mesh", title: "环切",
  defaults: () => ({}),
  params: () => [],
  plan(env, u) {
    if (!u.sel || u.sel.edges.size !== 1 || u.sel.faces.size) return { ops: [], count: 0 };
    const e = [...u.sel.edges][0], m = env.scene.mesh(u.def).kernel;
    if (!m.hasE(e)) return { ops: [], count: 0 };
    const r = loopCutOp(m.clone(), e, 0.5);
    if (!r.edges.length) return { ops: [], count: 0, notes: ["这条边两侧不是四边形，切不出一圈"] };
    return { ops: [{ op: "meshLoopCut", def: u.def, edge: e, t: 0.5 }], count: r.edges.length, select: { edges: r.edges } };
  },
  done: (n) => `环切：切了一圈 ${n} 条边（在选区里，接着可以移动 / 缩放）`,
  none: "环切：选一条四边形带上的边（只选一条）",
};

/** 选中的面（活着的，按 id 升序）。 */
function selFaces(m: MeshKernel, u: MeshUnit): number[] { return u.sel ? [...u.sel.faces].filter((f) => m.hasF(f)).sort((a, b) => a - b) : []; }

/**
 * 插入（右键面的菜单版；工具栏「插入」/ I 键是拖着定宽度的手势版，两个入口同一条 op meshInset）。
 * user 10-27「右键的插入，切环不应该切到工具里面，插入好了应该还是之前的操作模式」「当时我们不是把tool和op解耦了吗」：右键 = 指令 + 马后炮改宽度，不换工具。
 * 宽度默认 = 最小那张面能收的五分之一（1 m 的面 ≈ 10 cm），取到毫米；网格体本地长度（在网格体里编辑时 = 上下文长度）。
 */
export const inset: Command<MeshUnit> = {
  id: "mesh.inset", unit: "mesh", title: "插入",
  defaults(env, units) {
    let lim = Infinity;
    for (const u of units ?? []) { const m = env.scene.mesh(u.def).kernel; for (const f of selFaces(m, u)) lim = Math.min(lim, maxInset(m.facePts(f), m.faceNormal(f))); }
    return { dist: Number.isFinite(lim) && lim > 0 ? Math.max(0.001, Math.round(lim * 0.2 * 1000) / 1000) : 0.1 };
  },
  params: () => [{ key: "dist", def: { kind: "number", label: "宽度", min: 0.001, max: 10000, step: 0.01, quantity: LEN } }],
  plan(env, u, v) {
    const m = env.scene.mesh(u.def).kernel, fs = selFaces(m, u), d = Number(v.dist);
    if (!fs.length || !(d > 0)) return { ops: [], count: 0 };
    return { ops: [{ op: "meshInset", def: u.def, faces: fs, dist: d }], count: fs.length, select: { faces: fs } };   // 里面那几张面留在选区（插入保号：面还是原来的 id）
  },
  done: (n) => `插入：${n} 张面各自往里插了一圈（宽度在马后炮里改）`,
  none: "插入：先选面（工具栏「插入」/ I 键可以拖着定宽度）",
};

/**
 * 设置原点到选择中心（user 10-27「自由建模里面设置原点怎么设置，右键 设置原点到选择中心好了。然后对齐旋转这个比较少见，以后慢慢想」）：
 * 选区的点的平均（= 移动 / 旋转 / 缩放的轴心）当这个网格体的新原点；朝向不动。一条 setAxes（和硬表面「改组件原点」同一条：几何反挪、每份实例补，世界里不动）。
 */
export const originToSelection: Command<MeshUnit> = {
  id: "mesh.originToSelection", unit: "mesh", title: "设置原点到选择中心",
  defaults: () => ({}),
  params: () => [],
  plan(env, u) {
    if (!u.sel) return { ops: [], count: 0 };
    const m = env.scene.mesh(u.def).kernel, vs = selectionVerts(m, u.sel);
    if (!vs.length) return { ops: [], count: 0 };
    let x = 0, y = 0, z = 0;
    for (const v of vs) { const p = m.pt(v); x += p.x; y += p.y; z += p.z; }
    const c = { x: x / vs.length, y: y / vs.length, z: z / vs.length };
    if (Math.hypot(c.x, c.y, c.z) < 1e-9) return { ops: [], count: 0, notes: ["原点已经在选择中心了"] };
    let copies = 0;
    for (const d of env.scene.defs.values()) for (const i of d.instances.values()) if (i.def === u.def) copies++;
    return { ops: [{ op: "setAxes", at: { def: u.def, group: null }, frame: { origin: c, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } } }], count: 1, ...(copies > 1 ? { notes: [`${copies} 份一起换`] } : {}) };
  },
  done: () => "原点换到了选择中心（世界里没动）",
  none: "设置原点：先选点 / 边 / 面",
};

// ---------- 默认平滑 + 手标（2026-10-28；纪元账本 FM129 / FM138；判定 = mesh/edge-smooth.ts）----------
// user「明暗同意」「不要叫明暗方式，我们的语义就是几何，和representation没关系。默认平滑之类的？」：网格体一个「默认平滑」（按角度 / 全平滑 / 全是棱）+ 边上的手标压过它。

/** 选区里的边：选中的边 + 选中的面的全部边（活着的，升序）。 */
function selEdges(m: MeshKernel, u: MeshUnit): number[] {
  if (!u.sel) return [];
  const out = new Set<number>();
  for (const e of u.sel.edges) if (m.hasE(e)) out.add(e);
  for (const f of u.sel.faces) if (m.hasF(f)) { const r = m.faceVerts(f); for (let i = 0; i < r.length; i++) { const e = m.edgeOf(r[i], r[(i + 1) % r.length]); if (e >= 0) out.add(e); } }
  return [...out].sort((a, b) => a - b);
}
type EdgeMark = "sharp" | "smooth" | "none";
const MARK_BITS: Record<EdgeMark, number> = { sharp: F_SHARP, smooth: F_SOFT | F_SMOOTH, none: 0 };
function markCommand(mark: EdgeMark, id: `mesh.${string}`, title: string, done: string, none: string): Command<MeshUnit> {
  return {
    id, unit: "mesh", title,
    defaults: () => ({}),
    params: () => [],
    plan(env, u) {
      const m = env.scene.mesh(u.def).kernel, all = F_SHARP | F_SMOOTH | F_SOFT;
      const es = selEdges(m, u).filter((e) => (m.edgeFlags[e] & all) !== MARK_BITS[mark]);   // 已经是这个标的不算
      return es.length ? { ops: [{ op: "meshEdgeMarks", def: u.def, edges: es, mark }], count: es.length } : { ops: [], count: 0 };
    },
    done: (n) => done.replace("N", String(n)),
    none,
  };
}
export const markSharp = markCommand("sharp", "mesh.markSharp", "标成棱", "N 条边标成了棱（不管默认平滑怎么设，这里永远断开、画线）", "标成棱：先选边或面");
export const markSmooth = markCommand("smooth", "mesh.markSmooth", "标成平滑", "N 条边标成了平滑（明暗连续、不画线）", "标成平滑：先选边或面");
export const clearMarks = markCommand("none", "mesh.clearMarks", "清掉手标", "N 条边清掉了手标，交给默认平滑", "清掉手标：选中的边没有手标");

// ---------- 倒角（2026-10-28 FM152；算子 mesh/ops/bevel.ts；user「bevel为什么不做？这个没什么歧义吧。」）----------
// 右键 = 指令（马后炮改宽度 / 段数）；拖着定宽度的手势版 = 插入那一格选了边 / 点（Ctrl+B / Ctrl+Shift+B 键盘起手），同一条 op。

const lenOf = (m: MeshKernel, e: number): number => { const a = m.pt(m.edgeA[e]), b = m.pt(m.edgeB[e]); return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); };
/** 默认宽度 = 最短那条相关边的十分之一，取到毫米（≥ 1 mm）。 */
const defaultWidth = (shortest: number): number => (Number.isFinite(shortest) && shortest > 0 ? Math.max(0.001, Math.round(shortest * 0.1 * 1000) / 1000) : 0.05);
const bevelNotes = (r: { clamped: boolean; width: number; skipped: number }, what: string): string[] => [
  ...(r.clamped ? [`宽度被限到 ${Math.round(r.width * 1000) / 1000} m（再宽会穿过别的边）`] : []),
  ...(r.skipped ? [`${r.skipped} ${what}没倒（要两侧都有面、四周围满面；网格边缘上的不行）`] : []),
];
export const bevel: Command<MeshUnit> = {
  id: "mesh.bevel", unit: "mesh", title: "倒角",
  defaults(env, units) {
    let lo = Infinity;
    for (const u of units ?? []) { const m = env.scene.mesh(u.def).kernel; for (const e of selEdges(m, u)) lo = Math.min(lo, lenOf(m, e)); }
    return { width: defaultWidth(lo), segments: 1 };
  },
  params: () => [{ key: "width", def: { kind: "number", label: "宽度", min: 0.001, max: 10000, step: 0.01, quantity: LEN } }, { key: "segments", def: { kind: "number", label: "段数", min: 1, max: 32, step: 1 } }],
  quickCount: (env, u) => selEdges(env.scene.mesh(u.def).kernel, u).length,   // 菜单露不露：不在副本上真倒一遍
  plan(env, u, v) {
    const m = env.scene.mesh(u.def).kernel, es = selEdges(m, u), w = Number(v.width), seg = Math.round(Number(v.segments));
    if (!es.length || !(w > 0) || !(seg >= 1)) return { ops: [], count: 0 };
    const r = bevelEdges(m.clone(), es, w, seg);
    if (!r.faces.length) return { ops: [], count: 0, notes: bevelNotes(r, "条边") };
    return { ops: [{ op: "meshBevel", def: u.def, edges: es, width: w, segments: seg }], count: es.length - r.skipped, select: { faces: r.faces }, notes: bevelNotes(r, "条边") };
  },
  done: (n, _x, v) => `倒角：${n} 条边（${Number(v.segments) > 1 ? `${Number(v.segments)} 段圆角` : "一刀切平"}；宽度 / 段数在马后炮里改）`,
  none: "倒角：先选边（选面 = 倒它的边；点选点用「倒角（点）」）",
};
export const bevelPoints: Command<MeshUnit> = {
  id: "mesh.bevelVerts", unit: "mesh", title: "倒角（点）",
  defaults(env, units) {
    let lo = Infinity;
    for (const u of units ?? []) { const m = env.scene.mesh(u.def).kernel; for (const x of u.sel?.verts ?? []) if (m.hasV(x)) for (const e of m.vEdges(x)) lo = Math.min(lo, lenOf(m, e)); }
    return { width: defaultWidth(lo) };
  },
  params: () => [{ key: "width", def: { kind: "number", label: "宽度", min: 0.001, max: 10000, step: 0.01, quantity: LEN } }],
  quickCount: (env, u) => (u.sel && !u.sel.edges.size && !u.sel.faces.size ? [...u.sel.verts].filter((x) => env.scene.mesh(u.def).kernel.hasV(x)).length : 0),
  plan(env, u, v) {
    const m = env.scene.mesh(u.def).kernel, w = Number(v.width);
    if (!u.sel || u.sel.edges.size || u.sel.faces.size || !(w > 0)) return { ops: [], count: 0 };
    const vs = [...u.sel.verts].filter((x) => m.hasV(x)).sort((a, b) => a - b);
    if (!vs.length) return { ops: [], count: 0 };
    const r = bevelVerts(m.clone(), vs, w);
    if (!r.faces.length) return { ops: [], count: 0, notes: bevelNotes(r, "个点") };
    return { ops: [{ op: "meshBevelVerts", def: u.def, verts: vs, width: w }], count: vs.length - r.skipped, select: { faces: r.faces }, notes: bevelNotes(r, "个点") };
  },
  done: (n) => `倒角（点）：${n} 个角切掉了（宽度在马后炮里改）`,
  none: "倒角（点）：只选点",
};

// ---------- 合并到中心（Blender M → 到中心；2026-10-28 user「选择多个点的时候右键可以merge to center」）----------
export const mergeCenter: Command<MeshUnit> = {
  id: "mesh.mergeCenter", unit: "mesh", title: "合并到中心",
  defaults: () => ({}),
  params: () => [],
  quickCount: (env, u) => { if (!u.sel) return 0; const n = selectionVerts(env.scene.mesh(u.def).kernel, u.sel).length; return n >= 2 ? n : 0; },
  plan(env, u) {
    if (!u.sel) return { ops: [], count: 0 };
    const vs = selectionVerts(env.scene.mesh(u.def).kernel, u.sel).sort((a, b) => a - b);   // 选的点 + 选中的边 / 面的点（Blender 同）
    return vs.length >= 2 ? { ops: [{ op: "meshMerge", def: u.def, verts: vs }], count: vs.length, select: { verts: [vs[0]] } } : { ops: [], count: 0 };
  },
  done: (n) => `合并到中心：${n} 个点并成一个`,
  none: "合并到中心：先选两个以上的点（或边 / 面）",
};

// ---------- 复制 / 补洞桥接 / 翻转法线（2026-10-28 夜 user「12做」「67放右键」；算子 mesh/ops/duplicate.ts、geometry.ts flipFaces）----------
const sorted = (xs: Iterable<number>, alive: (x: number) => boolean): number[] => [...xs].filter(alive).sort((a, b) => a - b);
const selOf = (k: MeshKernel, u: MeshUnit): { faces: number[]; edges: number[]; verts: number[] } => (u.sel ? { faces: sorted(u.sel.faces, (f) => k.hasF(f)), edges: sorted(u.sel.edges, (e) => k.hasE(e)), verts: sorted(u.sel.verts, (v) => k.hasV(v)) } : { faces: [], edges: [], verts: [] });
export const duplicate: Command<MeshUnit> = {
  id: "mesh.duplicate", unit: "mesh", title: "复制",
  defaults: () => ({}), params: () => [],
  quickCount: (env, u) => { const s = selOf(env.scene.mesh(u.def).kernel, u); return s.faces.length || s.edges.length || s.verts.length; },
  plan(env, u) {
    const k = env.scene.mesh(u.def).kernel, s = selOf(k, u), n = s.faces.length || s.edges.length || s.verts.length;
    if (!n) return { ops: [], count: 0 };
    const probe = k.clone(), r = duplicateGeometry(probe, s);   // 先在副本上跑拿新 id（提交 = 同一份内核 + 同一组参数 = 同一批 id）
    const sel = s.faces.length ? { faces: r.faces } : s.edges.length ? { edges: r.edges } : { verts: r.verts };
    return { ops: [{ op: "meshDuplicate", def: u.def, ...(s.faces.length ? { faces: s.faces } : {}), ...(s.edges.length ? { edges: s.edges } : {}), ...(s.verts.length ? { verts: s.verts } : {}) }], count: n, select: sel };
  },
  done: (n) => `复制了 ${n} 处（叠在原处，新的在选区里）：按 G 或者用移动工具挪开；Shift+D = 复制并接着挪`,
  none: "复制：先选要复制的点 / 边 / 面",
};
export const fill: Command<MeshUnit> = {
  id: "mesh.fill", unit: "mesh", title: "补洞 / 桥接",
  defaults: () => ({}), params: () => [],
  quickCount: (env, u) => { const k = env.scene.mesh(u.def).kernel, r = fillOrBridge(k.clone(), selOf(k, u)); return typeof r === "string" ? 0 : r.faces.length; },
  plan(env, u) {
    const k = env.scene.mesh(u.def).kernel, s = selOf(k, u), probe = k.clone(), r = fillOrBridge(probe, s);
    if (typeof r === "string") return { ops: [], count: 0 };
    return { ops: [{ op: "meshFill", def: u.def, ...(s.edges.length ? { edges: s.edges } : { verts: s.verts }) }], count: r.faces.length, select: { faces: r.faces } };
  },
  done: (n) => (n === 1 ? "补洞：补了一张面" : `桥接：连了 ${n} 张四边形`),
  none: "补洞 / 桥接：先选一圈开口的边（补洞）或者两圈点数一样的边（桥接）",
};
export const flipNormals: Command<MeshUnit> = {
  id: "mesh.flipNormals", unit: "mesh", title: "翻转法线",
  defaults: () => ({}), params: () => [],
  quickCount: (env, u) => selOf(env.scene.mesh(u.def).kernel, u).faces.length,
  plan(env, u) { const s = selOf(env.scene.mesh(u.def).kernel, u); return s.faces.length ? { ops: [{ op: "meshFlip", def: u.def, faces: s.faces }], count: s.faces.length } : { ops: [], count: 0 }; },
  done: (n) => `翻转了 ${n} 张面的朝向`,
  none: "翻转法线：先选面",
};

// ---------- 细分（2026-10-28 FM133；算子 mesh/ops/subdivide.ts；user「工具式的subdiv反而可以，不就是破坏性吗」）----------
/** 一次细分后面数 = 每张 n 边形变 n 张四边形；之后每次 × 4。 */
const facesAfter = (m: MeshKernel, levels: number): number => { let n = 0; for (const f of m.faces()) n += m.faceVerts(f).length; return n * 4 ** Math.max(0, levels - 1); };
export const subdivideCmd: Command<MeshUnit> = {
  id: "mesh.subdivide", unit: "mesh", title: "细分",
  defaults: () => ({ levels: 1 }),
  params: () => [{ key: "levels", def: { kind: "number", label: "次数", min: 1, max: 4, step: 1 } }],
  quickCount: () => 1,   // 整个网格体（不看选区）
  estimate(env, units, v) {   // 面数 × 4 一次：大了先问（家族「慢的事先问」）
    let n = 0; for (const u of units) n += facesAfter(env.scene.mesh(u.def).kernel, Math.round(Number(v.levels)));
    return n > 200_000 ? { seconds: n / 150_000, what: `细分以后大约 ${Math.round(n / 1000)} 千张面` } : null;
  },
  plan(env, u, v) {
    const m = env.scene.mesh(u.def).kernel, levels = Math.max(1, Math.min(4, Math.round(Number(v.levels))));
    const loose = looseBits(m);
    if (loose) return { ops: [], count: 0, notes: [`网格体里有 ${loose} 条裸线 / 孤立的点：细分只认面，先删掉它们或接到面上`] };
    if (!m.faceCount()) return { ops: [], count: 0 };
    const notes = m.smoothDefault.mode !== "smooth" ? ["要看起来圆：右键「默认平滑 › 全部平滑」（想留棱的边标成棱，细分也会留着）"] : [];
    return { ops: [{ op: "meshSubdivide", def: u.def, levels }], count: facesAfter(m, levels), notes };
  },
  done: (n, _x, v) => `细分 ${Number(v.levels)} 次：现在 ${n} 张面（手标的棱和网格边缘当折痕；次数在马后炮里改）`,
  none: "细分：先进一个网格体",
};

// ---------- 对称对齐（2026-10-28 FM136；user「然后可以只对选择区域修复镜像snap吗」；Blender Snap to Symmetry）----------
const AXES: Record<string, MirrorAxis> = { x: 0, y: 1, z: 2 };
const SIDE_LABEL: Record<SnapSide, string> = { auto: "选区重心那边", flip: "另一边", average: "两边取平均" };
export const symmetrySnap: Command<MeshUnit> = {
  id: "mesh.symmetrySnap", unit: "mesh", title: "对称对齐",
  defaults: () => ({ axis: "x", tol: 0.01, side: "auto" }),
  params: () => [
    { key: "axis", def: { kind: "enum", label: "镜像面", values: [{ id: "x", label: "X" }, { id: "y", label: "Y" }, { id: "z", label: "Z" }] } },
    { key: "tol", def: { kind: "number", label: "容差", min: 0.0001, max: 1, step: 0.001, quantity: LEN } },
    { key: "side", def: { kind: "enum", label: "以哪边为准", values: (["auto", "flip", "average"] as const).map((id) => ({ id, label: SIDE_LABEL[id] })) } },
  ],
  quickCount: (env, u) => (u.sel ? selectionVerts(env.scene.mesh(u.def).kernel, u.sel).length : 0),
  plan(env, u, v) {
    if (!u.sel) return { ops: [], count: 0 };
    const m = env.scene.mesh(u.def).kernel, vs = selectionVerts(m, u.sel).sort((a, b) => a - b), axis = AXES[String(v.axis)] ?? 0, tol = Number(v.tol), side = (String(v.side) as SnapSide);
    if (!vs.length || !(tol > 0)) return { ops: [], count: 0 };
    const r = snapToSymmetry(m.clone(), vs, axis, tol, side);
    const notes = r.unpaired ? [`${r.unpaired} 个点在容差里找不到对面，没动（拓扑不对称的修不了，用「强行对称」）`] : [];
    if (!r.pairs && !r.pinned) return { ops: [], count: 0, notes };
    return { ops: [{ op: "meshSymmetrySnap", def: u.def, verts: vs, axis, tol, mode: side }], count: r.pairs + r.pinned, notes };
  },
  done: (n, _x, v) => `对称对齐：${n} 处对齐了（以${SIDE_LABEL[String(v.side) as SnapSide] ?? "选区重心那边"}为准；镜像面 / 容差 / 哪边为准在马后炮里改）`,
  none: "对称对齐：先选点 / 边 / 面",
};

const SMOOTH_LABEL: Record<SmoothDefaultMode, string> = { angle: "按角度", smooth: "全部平滑", hard: "全部是棱" };
/** 默认平滑的三档各一条指令（菜单里一档一行；已经是这一档的不露，按角度那条永远露、马后炮里改角度）。 */
function smoothDefaultCommand(mode: SmoothDefaultMode): Command<MeshUnit> {
  return {
    id: `mesh.smooth.${mode}` as const, unit: "mesh", title: `默认平滑：${SMOOTH_LABEL[mode]}`,
    defaults(env, units) { const u = units?.[0]; const sd = u ? env.scene.mesh(u.def).kernel.smoothDefault : null; return { deg: sd && sd.mode === "angle" ? sd.deg : 30 }; },
    params: () => (mode === "angle" ? [{ key: "deg", def: { kind: "number", label: "小于这个角度算平滑", min: 1, max: 179, step: 1, unit: "°" } }] : []),
    plan(env, u, v) {
      const sd = env.scene.mesh(u.def).kernel.smoothDefault, deg = mode === "angle" ? Number(v.deg) : sd.deg;
      if (!(deg > 0 && deg < 180)) return { ops: [], count: 0 };
      if (mode !== "angle" && sd.mode === mode) return { ops: [], count: 0, notes: [`已经是${SMOOTH_LABEL[mode]}了`] };
      return { ops: [{ op: "meshSmoothDefault", def: u.def, mode, deg }], count: 1 };
    },
    done: (_n, _x, v) => (mode === "angle" ? `默认平滑：两张面夹角小于 ${Number(v?.deg ?? 30)}° 的边算平滑（手标的边不受影响）` : `默认平滑：${SMOOTH_LABEL[mode]}（手标的边不受影响）`),
    none: "默认平滑：先进一个网格体",
  };
}
export const smoothByAngle = smoothDefaultCommand("angle"), smoothAll = smoothDefaultCommand("smooth"), smoothNone = smoothDefaultCommand("hard");

const commands: readonly Command[] = [duplicate as Command, fill as Command, flipNormals as Command, loopCut as Command, connect as Command, inset as Command, originToSelection as Command,
  bevel as Command, bevelPoints as Command, symmetrySnap as Command, mergeCenter as Command, subdivideCmd as Command, markSharp as Command, markSmooth as Command, clearMarks as Command, smoothByAngle as Command, smoothAll as Command, smoothNone as Command];
/** 图标 = stopgap（剪刀；图标库 TODO 已登记 loop-cut）。 */
const actions: readonly Action[] = [
  { id: "mesh.duplicate", icon: "copy", label: (n) => `复制（${n}）`, commands: { mesh: "mesh.duplicate" } },
  { id: "mesh.fill", icon: "fill-hole", label: (n) => (n === 1 ? "补洞" : `桥接（${n} 张面）`), commands: { mesh: "mesh.fill" } },
  { id: "mesh.flipNormals", icon: "flip-horizontal", label: (n) => `翻转法线（${n} 张面）`, commands: { mesh: "mesh.flipNormals" } },
  { id: "mesh.loopCut", icon: "cut", label: (n) => `环切（${n} 条边）`, commands: { mesh: "mesh.loopCut" } },
  { id: "mesh.connect", icon: "line", label: () => "连线（J）", commands: { mesh: "mesh.connect" } },
  { id: "mesh.inset", icon: "selection-expand", label: () => "插入", commands: { mesh: "mesh.inset" } },
  { id: "mesh.originToSelection", icon: "axes", label: () => "设置原点到选择中心", commands: { mesh: "mesh.originToSelection" } },
  { id: "mesh.bevel", icon: "selection-expand", label: (n) => `倒角（${n} 条边）`, commands: { mesh: "mesh.bevel" } },
  { id: "mesh.bevelVerts", icon: "selection-expand", label: (n) => `倒角（${n} 个点）`, commands: { mesh: "mesh.bevelVerts" } },
  { id: "mesh.subdivide", icon: "collection", label: () => "细分（Catmull-Clark）…", commands: { mesh: "mesh.subdivide" } },
  { id: "mesh.symmetrySnap", icon: "axes", label: (n) => `对称对齐（${n} 个点）`, commands: { mesh: "mesh.symmetrySnap" } },
  { id: "mesh.mergeCenter", icon: "target", label: (n) => `合并到中心（${n} 个点）`, commands: { mesh: "mesh.mergeCenter" } },
  { id: "mesh.markSharp", icon: "line", label: (n) => `标成棱（${n} 条边）`, commands: { mesh: "mesh.markSharp" } },
  { id: "mesh.markSmooth", icon: "line", label: (n) => `标成平滑（${n} 条边）`, commands: { mesh: "mesh.markSmooth" } },
  { id: "mesh.clearMarks", icon: "line", label: (n) => `清掉手标（${n} 条边）`, commands: { mesh: "mesh.clearMarks" } },
  { id: "mesh.smooth.angle", icon: "circle", label: () => "默认平滑：按角度…", commands: { mesh: "mesh.smooth.angle" } },
  { id: "mesh.smooth.smooth", icon: "circle", label: () => "默认平滑：全部平滑", commands: { mesh: "mesh.smooth.smooth" } },
  { id: "mesh.smooth.hard", icon: "circle", label: () => "默认平滑：全部是棱", commands: { mesh: "mesh.smooth.hard" } },
];
const placements: readonly Placement[] = [{ action: "mesh.loopCut", where: "contextBar", order: 20, modes: ["freeform"] }, { action: "mesh.connect", where: "contextBar", order: 21, modes: ["freeform"] }, { action: "mesh.inset", where: "contextBar", order: 22, modes: ["freeform"] },
  { action: "mesh.bevel", where: "contextBar", order: 23, modes: ["freeform"] }, { action: "mesh.bevelVerts", where: "contextBar", order: 24, modes: ["freeform"] }, { action: "mesh.originToSelection", where: "contextBar", order: 30, modes: ["freeform"] },
  { action: "mesh.mergeCenter", where: "contextBar", order: 25, modes: ["freeform"] },
  { action: "mesh.duplicate", where: "contextBar", order: 26, modes: ["freeform"] }, { action: "mesh.fill", where: "contextBar", order: 27, modes: ["freeform"] },
  { action: "mesh.flipNormals", where: "contextBar", order: 28, modes: ["freeform"] },
  { action: "mesh.subdivide", where: "objectWindow", order: 36 },   // 细分 / 默认平滑 = 物体级 → 物体窗口（user 10-28「镜像细分默认平滑这些都收到选窗里面」）
  { action: "mesh.symmetrySnap", where: "contextBar", order: 38, modes: ["freeform"], submenu: { label: "镜像", item: "对称对齐…" } },
  { action: "mesh.markSharp", where: "contextBar", order: 40, modes: ["freeform"], submenu: { label: "手标", item: "标成棱" } },
  { action: "mesh.markSmooth", where: "contextBar", order: 41, modes: ["freeform"], submenu: { label: "手标", item: "标成平滑" } },
  { action: "mesh.clearMarks", where: "contextBar", order: 42, modes: ["freeform"], submenu: { label: "手标", item: "清掉手标（交给默认平滑）" } },
  { action: "mesh.smooth.angle", where: "objectWindow", order: 45, submenu: { label: "默认平滑", item: "按角度…" } },
  { action: "mesh.smooth.smooth", where: "objectWindow", order: 46, submenu: { label: "默认平滑", item: "全部平滑" } },
  { action: "mesh.smooth.hard", where: "objectWindow", order: 47, submenu: { label: "默认平滑", item: "全部是棱" } }];

export const meshEdits: Family = { name: "meshEdits", commands, actions, placements };
