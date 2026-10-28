// mesh-edits/index.ts —— 网格体的菜单动词（mesh.* 族；浮条 / 右键入口，自由建模工作台）。created 2026-10-27 by Claude Opus 5.5
// 工具手势（挤出 / 挪 / 刀……）直接提交 op；这里是不用手势、选了就能点的那一类。第一条 = 环切（刀在一条边上点两下的菜单版，FM10「也加一个模式按钮，免得我不习惯」）。
// 做完的选区走 PlanOut.select（规划时在副本上跑一遍拿新 id；op 确定性 = 提交后同一批）。
import type { Command, MeshUnit } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
import { loopCut as loopCutOp, knife as knifeOp, maxInset, selectionVerts } from "../../mesh/ops/index.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";

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
  params: () => [{ key: "dist", def: { kind: "number", label: "宽度", min: 0.001, max: 10000, step: 0.01, unit: "m" } }],
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

const commands: readonly Command[] = [loopCut as Command, connect as Command, inset as Command, originToSelection as Command];
/** 图标 = stopgap（剪刀；图标库 TODO 已登记 loop-cut）。 */
const actions: readonly Action[] = [
  { id: "mesh.loopCut", icon: "cut", label: (n) => `环切（${n} 条边）`, commands: { mesh: "mesh.loopCut" } },
  { id: "mesh.connect", icon: "line", label: () => "连线（J）", commands: { mesh: "mesh.connect" } },
  { id: "mesh.inset", icon: "selection-expand", label: () => "插入", commands: { mesh: "mesh.inset" } },
  { id: "mesh.originToSelection", icon: "axes", label: () => "设置原点到选择中心", commands: { mesh: "mesh.originToSelection" } },
];
const placements: readonly Placement[] = [{ action: "mesh.loopCut", where: "contextBar", order: 20, modes: ["freeform"] }, { action: "mesh.connect", where: "contextBar", order: 21, modes: ["freeform"] }, { action: "mesh.inset", where: "contextBar", order: 22, modes: ["freeform"] }, { action: "mesh.originToSelection", where: "contextBar", order: 30, modes: ["freeform"] }];

export const meshEdits: Family = { name: "meshEdits", commands, actions, placements };
