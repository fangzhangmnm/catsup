// 「开始画」在数据上做什么 + 改了模型新面自动铺上（贴图主线 1-3b，施工单 ai-docs/20261110-paint-workorders-8.md 第七节 A–G）。created 2026-11-10 by Claude Opus 5.5
// 指令在真的 History 上提交；收尾（paint-upkeep.ts）照编辑器 commitIn 的顺序接：改写 → 提交前记 → 提交 → 收尾补进同一步。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, loopCuts } from "../src/mesh/ops/index.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { isSymmetric } from "../src/mesh/mirror.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey, OpRejected, type Op } from "../src/editor/ops.ts";
import { History, OpApplyError } from "../src/editor/history.ts";
import { extractForCopy } from "../src/editor/transfer.ts";
import { upkeepAfter, upkeepRewrite, upkeepSnapshot } from "../src/editor/paint-upkeep.ts";
import { OTHER_DEF_PAINT } from "../src/editor/paint-ops.ts";
import { meshBodyIssues, paintUvOf, unplacedPaintFaces, PAINT_CANT_MOVE } from "../src/scene/paint.ts";
import { layoutFaces } from "../src/paint/layout.ts";
import { documentFromScene } from "../src/format/scene-doc.ts";
import { writeCatsup } from "../src/format/write.ts";
import { mintGuid } from "../src/format/guid.ts";
import { COLOR_VALUE, paintIn } from "../src/format/document.ts";
import { IDENTITY, translation } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
import { uvAt, uvBoxes } from "../src/scene/uv.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });

/** 根上一份网格体组件（定义 = 长方体转过来的；内核换成 build 给的）。 */
function meshScene(build: (m: MeshKernel) => void, s0 = new Scene()): { s: Scene; def: number; inst: number } {
  const d = s0.mintDef("网格", sceneBox()), inst = s0.mintInstance(s0.root, null, d.id, IDENTITY);
  const s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene, m = new MeshKernel();
  build(m); s.mesh(d.id).kernel = m;
  return { s, def: d.id, inst: inst.id };
}
/** 编辑器 commitIn 那几步的复刻：改写 → 记 → 提交 → 收尾补进同一步。返回提示行那句。 */
function rig(build: (m: MeshKernel) => void) {
  const base = meshScene(build);
  let cur = base.s;
  const h = new History(cur), lastSide = new Map<number, -1 | 1>();
  const env = { get scene() { return cur; }, get mirrors() { return cur.meshMirrors; }, lastSide, merging: false };
  const step = (op0: Op): string => {
    const op = upkeepRewrite(env, op0), snaps = upkeepSnapshot(env, op);
    cur = h.commit(cur, op, false).scene;
    return snaps ? upkeepAfter(env, op, snaps, (o) => { cur = h.commit(cur, o, true).scene; }) : "";
  };
  const undo = (): void => { const r = h.undo(); if (r) cur = r.scene; };
  const redo = (): void => { const r = h.redo(cur); if (r) cur = r.scene; };
  return { get s() { return cur; }, def: base.def, inst: base.inst, h, step, undo, redo, k: () => cur.mesh(base.def).kernel };
}
const startOp = (def: number, faces: number[], o: Partial<Extract<Op, { op: "startPaint" }>> = {}): Extract<Op, { op: "startPaint" }> => ({
  op: "startPaint", def, faces, uvSet: mintGuid(), textureGuid: mintGuid(), materialGuid: mintGuid(), names: { uvSet: "UV", paint: "画", material: "画的材质" }, color: [0.8, 0.7, 0.6], ...o,
});
const num = (v: unknown): unknown => (v instanceof Float32Array || v instanceof Float64Array || v instanceof Int32Array || v instanceof Uint8Array || v instanceof Uint32Array ? Array.from(v as ArrayLike<number>, (x) => (Number.isNaN(x) ? "NaN" : x)) : typeof v === "number" && Number.isNaN(v) ? "NaN" : v);
/** 逐位比用：内核快照（含列）+ uvSets + 槽表 + 材质表 + 贴图表。 */
const canon = (s: Scene, def: number): string => {
  const b = s.mesh(def);
  return JSON.stringify({ k: b.kernel.toSnapshot(), uv: [...s.uvSets.entries()], slots: b.materialSlots, mats: s.materials, tex: [...s.textures.entries()] }, (_k, v) => num(v));
};
/** 整个场景（拒绝之后一个字节不变用）。 */
const sceneCanon = (s: Scene): string => JSON.stringify({ defs: [...s.defs.values()].map((d) => ({ id: d.id, guid: d.guid, name: d.name, kind: d.body.kind, inst: [...d.instances.values()], mesh: d.body.kind === "mesh" ? canon(s, d.id) : null })), mats: s.materials, tex: [...s.textures.keys()] }, (_k, v) => num(v));
const rejected = (fn: () => unknown, re?: RegExp): string => {
  try { fn(); } catch (e) { const c = e instanceof OpApplyError ? e.cause : e; assert(c instanceof OpRejected, `应当是规矩拒绝（OpRejected），实得 ${String((c as Error)?.message ?? c)}`); const m = (c as Error).message; if (re) assert(re.test(m), `原因：${m}`); return m; }
  throw new Error("应当拒绝却做成了");
};
const valuesOf = (k: MeshKernel, g: string, sl: readonly string[]): Map<string, string> => { const out = new Map<string, string>(); for (const f of k.faces()) { const v = uvAt(k, sl, f, g); if (v) out.set(k.faceVerts(f).join(","), Array.from(v).join(",")); } return out; };
const boxMesh = (m: MeshKernel): void => { addBox(m, P(0, 0, 0), P(2, 1, 1)); };
const uvOf = (s: Scene, def: number): string => s.mesh(def).uvSetSlots[0];   // 施工单十八：排法表在场景层；第 1½ 刀：网格体上一张速查表（这里每个网格体只在一套上）

describe("开始画（1-3b 测试 A）", () => {
  it("做完：uvSets 多一行、贴图表多一行（分层、没有字节、layout = { uvSet } 指着这一套排法）、材质多一个、这些面走画、每个角有位置、自检没毛病；撤销 / 重做 / 重放逐位", () => {
    const r = rig(boxMesh), faces = r.k().faces(), before = canon(r.s, r.def), t0 = r.s.textures.size, m0 = r.s.materials.length;
    const op = startOp(r.def, faces), sBefore = r.s.clone();
    eq(r.step(op), "", "收尾没话说");
    const row = r.s.uvSets.get(op.uvSet)!;
    eq(r.s.uvSets.size, 1); assert(row && row.width === 1024 && row.height === 1024 && row.pxPerM > 0, `一行：${JSON.stringify(row)}`);
    eq(r.s.textures.size, t0 + 1); eq(r.s.materials.length, m0 + 1);
    const tex = r.s.textures.get(op.textureGuid)!;
    eq(tex.content.kind, "layered"); eq((tex.content as { ora: unknown }).ora, null, "新建的画没有字节"); eq(tex.sizeM, undefined, "没有 sizeM");
    eq(JSON.stringify(tex.layout), JSON.stringify({ uvSet: op.uvSet }), "layout = { uvSet }（施工单十八 3.3：画挂在排法上，不记定义）");
    eq(JSON.stringify(r.s.materials[m0].channels), JSON.stringify({ color: [op.textureGuid] }));
    for (const f of faces) { eq(paintUvOf(r.s, r.def, f), op.uvSet, `面 ${f} 走画`); assert(uvAt(r.k(), r.s.mesh(r.def).uvSetSlots, f, op.uvSet), `面 ${f} 有位置`); }
    eq(meshBodyIssues(r.s, r.def).join("；"), "", "自检");
    const after = canon(r.s, r.def);
    r.undo(); eq(canon(r.s, r.def), before, "撤销逐位回到原样");
    r.redo(); eq(canon(r.s, r.def), after, "重做逐位");
    eq(canon(applyOp(sBefore, op).scene, r.def), after, "同一条指令在副本上重放逐位相同");
  });
  it("给了密度：照这个密度铺、记进那一行；没给 = 1024 见方里放得下的最大密度", () => {
    const r = rig(boxMesh);
    r.step(startOp(r.def, r.k().faces(), { density: 100 }));
    eq(r.s.uvSets.get(uvOf(r.s, r.def))!.pxPerM, 100);
  });
  it("画布边长（2026-11-11 开始画时选）：canvas = 256 → 256 见方里放得下的最大密度；不给 = 1024（老指令流重放不变）", () => {
    const a = rig(boxMesh); a.step(startOp(a.def, a.k().faces(), { canvas: 256 }));
    const ua = a.s.uvSets.get(uvOf(a.s, a.def))!;
    const b = rig(boxMesh); b.step(startOp(b.def, b.k().faces()));
    const ub = b.s.uvSets.get(uvOf(b.s, b.def))!;
    eq(`${ua.width}x${ua.height}`, "256x256"); eq(`${ub.width}x${ub.height}`, "1024x1024", "不给 = 1024 见方");
    assert(ua.pxPerM < ub.pxPerM, `256 见方的密度 ${ua.pxPerM} 比 1024 的 ${ub.pxPerM} 小`);
  });
  it("拒绝（什么都不改、说清原因）：不是网格体；一张活着的面都没有；GUID 已经有了；铺不下", () => {
    const r = rig(boxMesh), faces = r.k().faces(), s0 = sceneCanon(r.s);
    rejected(() => r.step(startOp(r.s.root, [0])), /只能用在网格体上/);
    rejected(() => r.step(startOp(r.def, [9999])), /一张都不在了/);
    r.step(startOp(r.def, faces.slice(0, 2)));
    const s1 = sceneCanon(r.s), uv = uvOf(r.s, r.def), tex = r.s.materials[r.s.materials.length - 1].channels!.color[0];
    rejected(() => r.step(startOp(r.def, faces, { uvSet: uv })), /已经有了/);
    rejected(() => r.step(startOp(r.def, faces, { textureGuid: tex })), /已经有了/);
    rejected(() => r.step(startOp(r.def, faces, { materialGuid: r.s.materials[0]?.guid ?? r.s.materials[r.s.materials.length - 1].guid })), /已经有了/);
    rejected(() => r.step(startOp(r.def, faces, { density: 1e6 })), /铺不下/);
    eq(sceneCanon(r.s), s1, "拒绝之后场景一个字节不变");
    assert(s0 !== s1, "前面那一次真的做成了");
  });
});

describe("改了模型新面自动铺上（1-3b 测试 B）", () => {
  const ops: [string, (r: ReturnType<typeof rig>) => Op][] = [
    ["挤出", (r) => ({ op: "meshExtrude", def: r.def, faces: [r.k().faces()[0]], offset: P(0, 0, 0.3) })],
    ["倒角", (r) => ({ op: "meshBevel", def: r.def, edges: [r.k().edges()[0]], width: 0.1, segments: 2 })],
    ["内缩", (r) => ({ op: "meshInset", def: r.def, faces: [r.k().faces()[1]], dist: 0.1 })],
    ["环切", (r) => ({ op: "meshLoopCut", def: r.def, edge: r.k().edges()[0], t: 0.4, cuts: 2 })],
    ["刀", (r) => { const f = r.k().faces()[2], ring = r.k().faceVerts(f); return { op: "meshKnife", def: r.def, face: f, path: [{ v: ring[0] }, { v: ring[2] }] }; }],
    ["细分", (r) => ({ op: "meshSubdivide", def: r.def, levels: 1 })],
    ["复制面", (r) => ({ op: "meshDuplicate", def: r.def, faces: [r.k().faces()[3]] })],
  ];
  for (const [name, mk] of ops) it(`${name}：做完没有「走画但没有位置」的面；原来有位置、形状没变的面角上一个数都没变；自检没毛病；撤销一次回到这一步之前`, () => {
    const r = rig(boxMesh);
    r.step(startOp(r.def, r.k().faces()));
    const uv = uvOf(r.s, r.def), before = canon(r.s, r.def), vals = valuesOf(r.k(), uv, r.s.mesh(r.def).uvSetSlots);
    const note = r.step(mk(r));
    eq(note, "", "没有放不下的、没有丢了画的");
    eq([...unplacedPaintFaces(r.s, r.def, null).values()].flat().length, 0, "没有走画但没有位置的面");
    for (const [ring, v] of valuesOf(r.k(), uv, r.s.mesh(r.def).uvSetSlots)) if (vals.has(ring)) eq(v, vals.get(ring), `形状没变的面 ${ring} 角上的数没变`);
    eq(meshBodyIssues(r.s, r.def).join("；"), "", "自检");
    r.undo(); eq(canon(r.s, r.def), before, "撤销一次回到这一步之前");
  });
  it("并面丢了画在提示行上说：溶解两张各有一块的面之间的边 → 「有 1 张面的画没带过来」，并出来的那张重新补一块", () => {
    const r = rig(boxMesh);
    r.step(startOp(r.def, r.k().faces()));
    const k = r.k(), e = k.edges().find((x) => k.eFaces(x).length === 2)!;
    const note = r.step({ op: "meshDelete", def: r.def, edges: [e], dissolve: true });
    assert(/1 张面的画没带过来/.test(note), `提示行：${note}`);
    eq([...unplacedPaintFaces(r.s, r.def, null).values()].flat().length, 0, "并出来的那张补上了位置");
  });
  it("合并点让画过的面塌掉（属性地基轮第二步）：提示行说「合并之后有 1 张面塌掉了、被去掉（其中 1 张上有画）」；撤销一下全回来", () => {
    const r = rig(boxMesh);
    r.step(startOp(r.def, r.k().faces()));
    const before = canon(r.s, r.def), k = r.k(), f = k.faces()[0], ring = k.faceVerts(f);
    const note = r.step({ op: "meshMerge", def: r.def, verts: [ring[0], ring[2]] });   // 一张四边形的对角两点合并 = 这张面塌了（两条刺都还挂着别的面）
    assert(!r.k().hasF(f), "那张面没了");
    assert(note.includes("合并之后有 1 张面塌掉了、被去掉（其中 1 张上有画）"), `提示行：${note}`);
    r.undo(); eq(canon(r.s, r.def), before, "撤销一下全回来");
  });
});

describe("画布加高（1-3b 测试 C）", () => {
  it("一直加新面（按一格多大开的画，fit = density；施工单十六第四节）：高按 256 的倍数涨、已有的角不变；到上限之后放不下的面没有值、张数对、建模那一步照样做成", () => {
    const N = 24;
    const r = rig((m) => { for (let i = 0; i < N; i++) { const z = i * 3; m.addFace([P(0, 0, z), P(10, 0, z), P(10, 2, z), P(0, 2, z)].map((p) => m.addVertex(p)), -1, FRESH); } });
    const faces = r.k().faces();
    r.step(startOp(r.def, [faces[0]], { density: 100, fit: "density" }));   // 1000 × 200 一块：画布 1024 × 256（接近正方形、够用的最小宽高）
    const uv = uvOf(r.s, r.def), mat = r.s.materials.length - 1;
    eq(r.s.uvSets.get(uv)!.height, 256);
    let full = 0;
    for (let i = 1; i < N; i++) {
      const vals = valuesOf(r.k(), uv, r.s.mesh(r.def).uvSetSlots);
      const note = r.step({ op: "meshPaintFaces", def: r.def, faces: [faces[i]], material: mat });
      const H = r.s.uvSets.get(uv)!.height;
      eq(H % 256, 0, "高是 256 的倍数"); assert(H <= 4096, "不过上限");
      for (const [ring, v] of vals) eq(valuesOf(r.k(), uv, r.s.mesh(r.def).uvSetSlots).get(ring), v, "已有的角不变");
      eq(r.k().faceMat[faces[i]], r.s.mesh(r.def).materialSlots.indexOf(mat), "建模那一步（换材质）照样做成");
      if (!uvAt(r.k(), r.s.mesh(r.def).uvSetSlots, faces[i], uv)) { full++; assert(new RegExp(`有 ${full} 张面在画布上放不下`).test(note) || /放不下/.test(note), `提示行：${note}`); }
    }
    assert(full > 0, "加到上限之后真的有放不下的");
    eq([...unplacedPaintFaces(r.s, r.def, null).values()].flat().length, full, "放不下的张数对");
    eq(r.s.uvSets.get(uv)!.height, 4096, "到了上限");
  });
  it("按总大小开的画（缺 fit，施工单十六第四节）：画布不自己变大——加面只在现有宽高里找地方，找不到的先没有位置，提示行说这张画定的是多大", () => {
    const N = 6;
    const r = rig((m) => { for (let i = 0; i < N; i++) { const z = i * 3; m.addFace([P(0, 0, z), P(10, 0, z), P(10, 2, z), P(0, 2, z)].map((p) => m.addVertex(p)), -1, FRESH); } });
    const faces = r.k().faces();
    r.step(startOp(r.def, [faces[0]], { density: 50 }));   // 老入口：给了密度、没给 fit = 按总大小（500 × 100 一块，画布 1024 × 256：一行两块、两行 = 放得下四块）
    const uv = uvOf(r.s, r.def), mat = r.s.materials.length - 1;
    eq(r.s.uvSets.get(uv)!.fit, "size", "按总大小开的 = fit size（施工单十八：fit 必写）");
    let note = "";
    for (let i = 1; i < N; i++) note = r.step({ op: "meshPaintFaces", def: r.def, faces: [faces[i]], material: mat }) || note;
    eq(r.s.uvSets.get(uv)!.height, 256, "画布没变大");
    const left = [...unplacedPaintFaces(r.s, r.def, null).values()].flat().length;
    eq(left, 2, "六张面：四张放进去了、两张先没有位置");
    assert(/这张画定的是 1024 × 256，不自己变大/.test(note), `提示行：${note}`);
  });
  it("按一格多大开（fit = density）：画布接近正方形、够用的最小；那一套记 fit；每张面的边长 ÷（空间里的边长 × 密度）都在 [cos 45°, 1]", () => {
    const r = rig(boxMesh), fs = r.k().faces();
    r.step(startOp(r.def, fs, { density: 40, fit: "density", arrange: "patches" }));
    const uv = uvOf(r.s, r.def), row = r.s.uvSets.get(uv)!;
    eq(row.fit, "density"); eq(row.pxPerM, 40);
    assert(row.height <= row.width && row.width <= 512, `画布 ${row.width} × ${row.height}`);
    const k = r.k(), cos = Math.cos(Math.PI / 4);
    for (const f of fs) { const p = k.facePts(f), v = uvAt(k, r.s.mesh(r.def).uvSetSlots, f, uv)!, n = p.length; for (let i = 0; i < n; i++) { const j = (i + 1) % n, w = Math.hypot(p[j].x - p[i].x, p[j].y - p[i].y, p[j].z - p[i].z), c = Math.hypot(v[2 * j] - v[2 * i], v[2 * j + 1] - v[2 * i + 1]) / (w * 40); assert(c >= cos - 1e-6 && c <= 1 + 1e-6, `面 ${f} 边 ${i}：${c}`); } }
  });
});

describe("换走再换回来（1-3b 测试 D）", () => {
  it("面从画换成普通材质再换回画：角上的数和原来逐位相同、没有新占一块", () => {
    const r = rig(boxMesh);
    r.step(startOp(r.def, r.k().faces()));
    const uv = uvOf(r.s, r.def), paint = r.s.materials.length - 1, f = r.k().faces()[2], v0 = Array.from(uvAt(r.k(), r.s.mesh(r.def).uvSetSlots, f, uv)!).join(), boxes0 = uvBoxes(r.k(), r.s.mesh(r.def).uvSetSlots, uv).length;
    r.step({ op: "addMaterial", name: "红", color: [1, 0, 0] });
    r.step({ op: "meshPaintFaces", def: r.def, faces: [f], material: r.s.materials.length - 1 });
    eq(paintUvOf(r.s, r.def, f), null, "换走了：不走画");
    eq(Array.from(uvAt(r.k(), r.s.mesh(r.def).uvSetSlots, f, uv)!).join(), v0, "角上的数留着");
    r.step({ op: "meshPaintFaces", def: r.def, faces: [f], material: paint });
    eq(paintUvOf(r.s, r.def, f), uv, "换回来：走画");
    eq(Array.from(uvAt(r.k(), r.s.mesh(r.def).uvSetSlots, f, uv)!).join(), v0, "还是原来那一块");
    eq(uvBoxes(r.k(), r.s.mesh(r.def).uvSetSlots, uv).length, boxes0, "没有新占一块");
  });
});

describe("强行对称（1-3b 测试 E）", () => {
  /** 中缝上已经切开的长方体（−1..1 沿 x，在 x = 0 有一圈边）+ 强行对称。 */
  const sym = () => {
    const r = rig((m) => { addBox(m, P(-1, 0, 0), P(1, 1, 1)); const e = m.edges().find((x) => Math.abs(m.pt(m.edgeA[x]).x - m.pt(m.edgeB[x]).x) > 1.5)!; loopCuts(m, e, 1, 0.5); });
    r.h.commit(r.s, { op: "setMeshMirror", def: r.def, mirror: { mode: "force", axis: 0 } });
    assert(isSymmetric(r.k(), 0), "起手对称");
    return r;
  };
  const side = (k: MeshKernel, f: number): number => Math.sign(k.faceVerts(f).reduce((a, v) => a + k.pt(v).x, 0));
  /** 每张面的镜像面在画布上是同一块（角的 [u, v] 集合一样）。 */
  const pairsSame = (k: MeshKernel, uv: string, sl: readonly string[]): string[] => {
    const key = (f: number): string => k.faceVerts(f).map((v) => { const p = k.pt(v); return `${(-p.x).toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`; }).sort().join("|");
    const own = (f: number): string => k.faceVerts(f).map((v) => { const p = k.pt(v); return `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`; }).sort().join("|");
    const byPos = new Map(k.faces().map((f) => [own(f), f])), bad: string[] = [];
    const uvSet = (f: number): string => { const v = uvAt(k, sl, f, uv); return v ? Array.from({ length: v.length / 2 }, (_, i) => `${v[2 * i]},${v[2 * i + 1]}`).sort().join("|") : "none"; };
    for (const f of k.faces()) { const g = byPos.get(key(f)); if (g === undefined) bad.push(`面 ${f} 没有镜像`); else if (uvSet(f) !== uvSet(g)) bad.push(`面 ${f} 和 ${g} 在画布上不是同一块`); }
    return bad;
  };
  const distinctBoxes = (k: MeshKernel, uv: string, sl: readonly string[]): number => { const b = uvBoxes(k, sl, uv), s = new Set<string>(); for (let i = 0; i < b.length; i += 4) s.add(Array.from(b.subarray(i, i + 4)).join()); return s.size; };

  it("开始画（两半都给）：只铺留着的那半（密度 = 只铺这半时的密度、占的块数 = 这半的面数）；两半在画布上是同一块；一次撤销回到原样", () => {
    const r = sym(), k0 = r.k().clone(), before = canon(r.s, r.def);
    const all = r.k().faces(), plus = all.filter((f) => side(r.k(), f) > 0);
    r.step(startOp(r.def, all));
    const uv = uvOf(r.s, r.def), k = r.k();
    eq([...unplacedPaintFaces(r.s, r.def, null).values()].flat().length, 0, "走画的面都有位置");
    eq(pairsSame(k, uv, r.s.mesh(r.def).uvSetSlots).join("；"), "", "两半同一块");
    eq(distinctBoxes(k, uv, r.s.mesh(r.def).uvSetSlots), plus.length, "丢掉的那半没占画布");
    eq(r.s.uvSets.get(uv)!.pxPerM, (layoutFaces(k0, plus) as { density: number }).density, "密度 = 只铺留着那半时的");
    assert(isSymmetric(k, 0), "还对称");
    r.undo(); eq(canon(r.s, r.def), before, "一次撤销回到原样");
  });
  it("在画过的一半上挤出：新面只给这半铺、另一半照抄；一次撤销回到这一步之前", () => {
    const r = sym();
    r.step(startOp(r.def, r.k().faces()));
    const uv = uvOf(r.s, r.def), before = canon(r.s, r.def), n0 = distinctBoxes(r.k(), uv, r.s.mesh(r.def).uvSetSlots);
    const end = r.k().faces().find((f) => r.k().faceVerts(f).every((v) => r.k().pt(v).x > 0.99))!;
    r.step({ op: "meshExtrude", def: r.def, faces: [end], offset: P(0.5, 0, 0) });
    const k = r.k(), added = distinctBoxes(k, uv, r.s.mesh(r.def).uvSetSlots) - n0;
    eq([...unplacedPaintFaces(r.s, r.def, null).values()].flat().length, 0, "走画的面都有位置");
    eq(pairsSame(k, uv, r.s.mesh(r.def).uvSetSlots).join("；"), "", "两半同一块");
    assert(isSymmetric(k, 0), "还对称");
    eq(added, 4, "只给留着那半的四张侧面各铺一块（另一半照抄）");
    r.undo(); eq(canon(r.s, r.def), before, "一次撤销回到这一步之前");
  });
  it("两半都换成画（形状本来对称）：只给留着那半铺，补一次对称化让另一半照抄", () => {
    const r = sym(), all = r.k().faces(), top = all.filter((f) => r.k().faceVerts(f).every((v) => r.k().pt(v).z > 0.99));
    r.step(startOp(r.def, top, { density: 50, fit: "density" }));   // 按一格多大开：加面放不下时画布能长大（按总大小开的不长，施工单十六第四节）
    const uv = uvOf(r.s, r.def), paint = r.s.materials.length - 1, n0 = distinctBoxes(r.k(), uv, r.s.mesh(r.def).uvSetSlots), before = canon(r.s, r.def);
    const bottom = r.k().faces().filter((f) => r.k().faceVerts(f).every((v) => r.k().pt(v).z < 0.01));
    eq(bottom.length, 2, "底面两半各一张");
    r.step({ op: "meshPaintFaces", def: r.def, faces: bottom, material: paint });
    const k = r.k();
    eq([...unplacedPaintFaces(r.s, r.def, null).values()].flat().length, 0, "走画的面都有位置");
    eq(pairsSame(k, uv, r.s.mesh(r.def).uvSetSlots).join("；"), "", "两半同一块");
    eq(distinctBoxes(k, uv, r.s.mesh(r.def).uvSetSlots) - n0, 1, "只占了一块（丢掉的那半没占）");
    r.undo(); eq(canon(r.s, r.def), before, "一次撤销回到原样");
  });
});

describe("拒绝的那几处（1-3b 测试 F）", () => {
  /** 根里摆两份网格体：A 带画（开始画过），B 不带。 */
  const two = () => {
    const r = rig(boxMesh);
    r.step(startOp(r.def, r.k().faces()));
    const s = r.s, B = s.mintDef("B", sceneBox()), ib = s.mintInstance(s.root, null, B.id, translation({ x: 5, y: 0, z: 0 }));
    const s2 = applyOp(s, { op: "castDefinition", def: B.id, to: "mesh" }).scene;
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); s2.mesh(B.id).kernel = k;
    return { r, s: s2, A: r.def, ia: r.inst, B: B.id, ib: ib.id };
  };
  const ROOT = (s: Scene) => ({ def: s.root, group: null });
  it("并物件 / 把面分成新物件 / 变成独立的 / 炸开网格体组件 / 网格体转硬表面：都拒，场景一个字节不变", () => {
    const { s, A, ia, B, ib } = two(), c0 = sceneCanon(s), faces = s.mesh(A).kernel.faces();
    const cases: [string, Op][] = [
      ["并物件", { op: "mergeObject", at: ROOT(s), target: ib, source: ia }],
      ["分成新物件", { op: "separateObject", at: ROOT(s), instance: ia, def: A, faces: faces.slice(0, 2), name: "分" }],
      ["变成独立的", { op: "makeUnique", def: s.root, instance: ia }],
      ["炸开", { op: "explode", at: ROOT(s), instance: ia }],
      ["转硬表面", { op: "castDefinition", def: A, to: "brep" }],
    ];
    for (const [name, op] of cases) { eq(rejected(() => new History(s).commit(s, op)), PAINT_CANT_MOVE, name); eq(sceneCanon(s), c0, `${name}：场景一个字节不变`); }
    // 不带画的那份照常
    assert(!!applyOp(s.clone(), { op: "makeUnique", def: s.root, instance: ib }), "不带画的物件照常变成独立的");
    void B;
  });
  it("复制、粘贴：拷带着画的面 = 拒（剪切走拷贝也不会先删）；粘贴带着画的散面 / 跨文件带着画 = 拒；同一份文件里拷整个物件照贴", () => {
    const { s, A, ia } = two(), faces = s.mesh(A).kernel.faces(), c0 = sceneCanon(s);
    const inA = { chain: [ia], group: null };
    const blocked = extractForCopy(s, inA, { faces, edges: [] }, []);
    assert(!!blocked && "blocked" in blocked && blocked.blocked === PAINT_CANT_MOVE, "拷带着画的面 = 拒");
    // 同一份文件里拷整个物件（实例）：照贴
    const whole = extractForCopy(s, { chain: [], group: null }, { faces: [], edges: [] }, [{ kind: "instance", instance: ia }]);
    assert(!!whole && !("blocked" in whole), "整个物件照拷");
    const pasted = applyOp(s.clone(), { op: "paste", at: ROOT(s), ...(whole as object) } as Op).scene;
    eq(pasted.def(pasted.root).instances.size, s.def(s.root).instances.size + 1, "同一份文件里贴出另一份摆放");
    // 跨文件：目标里没有那张画的定义 → 拒
    const other = new Scene(), c1 = sceneCanon(other);
    eq(rejected(() => new History(other).commit(other, { op: "paste", at: ROOT(other), ...(whole as object) } as Op)), PAINT_CANT_MOVE, "跨文件带着画 = 拒");
    eq(sceneCanon(other), c1, "目标场景一个字节不变");
    // 散面带着画的材质：拒（造一份载荷：一张面、材质 = 画）
    const paintMat = s.materials[s.materials.length - 1], tex = s.textures.get(paintMat.channels!.color[0])!;
    const frag: Op = { op: "paste", at: ROOT(s), mesh: { verts: [P(0, 0, 9), P(1, 0, 9), P(1, 1, 9)], faces: [{ ring: [0, 1, 2], mat: 0 }], edges: [] }, materials: [paintMat], textures: [tex] } as Op;
    const m2 = meshScene(boxMesh, s.clone());
    eq(rejected(() => new History(m2.s).commit(m2.s, { ...frag, at: { def: m2.def, group: null } } as Op)), PAINT_CANT_MOVE, "散面带着画 = 拒");
    eq(sceneCanon(s), c0, "源场景一个字节不变");
  });
  it("审后补：同一份文件里贴整个物件、内容不一样又选了「断开」/「更新」= 拒（画会落到别的定义里 / 跟着换掉的身体丢了）；「留这里的」照贴", () => {
    const { s, A, ia } = two();
    const whole = extractForCopy(s, { chain: [], group: null }, { faces: [], edges: [] }, [{ kind: "instance", instance: ia }]) as Record<string, unknown>;
    const k = s.mesh(A).kernel, v0 = k.verts()[0], p0 = k.pt(v0);
    k.setPos(v0, { x: p0.x + 0.25, y: p0.y, z: p0.z });   // 拷完之后这边改了：两边内容不一样（粘贴会问）
    const c0 = sceneCanon(s);
    for (const entries of ["detach", "update"] as const) {
      eq(rejected(() => new History(s).commit(s, { op: "paste", at: ROOT(s), ...whole, merge: { entries } } as Op)), PAINT_CANT_MOVE, entries);
      eq(sceneCanon(s), c0, `${entries}：场景一个字节不变`);
    }
    const kept = applyOp(s.clone(), { op: "paste", at: ROOT(s), ...whole, merge: { entries: "keep" } } as Op).scene;
    eq(kept.def(kept.root).instances.size, s.def(s.root).instances.size + 1, "留这里的：照贴（共用同一张画）");
  });
  it("审后补：整个定义带着贴图坐标、但现在没有面走画（全换走了）：变成独立的 / 炸开 / 跨文件粘贴照样拒（搬到别处要给那几套铸新身份，归 1-3d）", () => {
    const { s, A, ia } = two();
    const s2 = applyOp(s, { op: "meshPaintFaces", def: A, faces: s.mesh(A).kernel.faces(), material: null }).scene;
    eq(s2.mesh(A).kernel.faces().filter((f) => paintUvOf(s2, A, f) !== null).length, 0, "没有面走画了");
    const c0 = sceneCanon(s2);
    eq(rejected(() => new History(s2).commit(s2, { op: "makeUnique", def: s2.root, instance: ia })), PAINT_CANT_MOVE, "变成独立的");
    eq(rejected(() => new History(s2).commit(s2, { op: "explode", at: ROOT(s2), instance: ia })), PAINT_CANT_MOVE, "炸开");
    eq(sceneCanon(s2), c0, "场景一个字节不变");
    // 1-2½ 起文件形状带着贴图坐标：画的材质和贴图都清掉，定义只剩没人引用的那一套坐标；跨文件贴整个物件 = 要新建一个带着贴图坐标的定义 → 照样拒（铸新身份归 1-3d）；同一份文件里贴另一份摆放照贴
    const paintIdx = s2.materials.length - 1, texG = s2.materials[paintIdx].channels!.color[0];
    let s3 = applyOp(s2, { op: "purgeMaterials", materials: [paintIdx] }).scene;
    s3 = applyOp(s3, { op: "purgeTextures", textures: [texG] }).scene;
    assert(s3.mesh(A).uvSetSlots.length > 0 && !s3.materials.some((m) => paintIn(s3.textures, m)), "只剩贴图坐标，没有画");
    const whole = extractForCopy(s3, { chain: [], group: null }, { faces: [], edges: [] }, [{ kind: "instance", instance: ia }]);
    assert(!!whole && !("blocked" in whole), "整个物件照拷");
    const other = new Scene(), c1 = sceneCanon(other);
    eq(rejected(() => new History(other).commit(other, { op: "paste", at: ROOT(other), ...(whole as object) } as Op)), PAINT_CANT_MOVE, "跨文件 = 拒");
    eq(sceneCanon(other), c1, "目标场景一个字节不变");
    const pasted = applyOp(s3.clone(), { op: "paste", at: ROOT(s3), ...(whole as object) } as Op).scene;
    eq(pasted.def(pasted.root).instances.size, s3.def(s3.root).instances.size + 1, "同一份文件里贴另一份摆放照贴");
  });
  it("别的定义的画换不上来；硬表面的面换不成画", () => {
    const { s, A, B } = two(), paint = s.materials.length - 1, c0 = sceneCanon(s);
    eq(rejected(() => new History(s).commit(s, { op: "meshPaintFaces", def: B, faces: [s.mesh(B).kernel.faces()[0]], material: paint })), OTHER_DEF_PAINT, "别的定义的画");
    eq(sceneCanon(s), c0, "场景一个字节不变");
    void A;
    const bd = s.mintDef("硬", sceneBox()), k = s.kernelOf({ def: bd.id, group: null }), f0 = k.faces()[0].id;
    rejected(() => new History(s).commit(s, { op: "paintFaces", at: { def: bd.id, group: null }, faces: [faceKey(k, f0)], material: paint }), /硬表面的面不能换成画/);
  });
});

describe("存盘（1-3b 测试 G；1-2½ 起贴图坐标真的写）", () => {
  it("带着贴图坐标的网格体：文件形状里带着那一套（1-2½）；画还没有字节 → 写盘照旧抛（1-8）", () => {
    const r = rig(boxMesh);
    r.step(startOp(r.def, r.k().faces()));
    const doc = documentFromScene(r.s, "画"), md = doc.definitions.find((d) => d.kind === "mesh")!.mesh!;
    eq(md.uv?.sets.length ?? 0, 1, "文件形状带着那一套贴图坐标（MeshDoc.uv）");
    let msg = ""; try { writeCatsup(doc); } catch (e) { msg = String((e as Error).message); }
    assert(/no bytes/.test(msg) && /should have encoded a blank one/.test(msg), `原因：${msg}`);   // 1-8b 起存盘的钉点先编一份空白的；直接调写盘碰到 null 照旧抛
  });
  it("没有字节的分层贴图：写盘抛、原因写明白（画的字节进文件是 1-8）", () => {
    const s = new Scene();
    s.addTexture({ guid: mintGuid(), name: "空画", value: COLOR_VALUE, content: { kind: "layered", ora: null }, layout: { definition: "x", uvSet: "y" } });
    let msg = ""; try { writeCatsup(documentFromScene(s, "空")); } catch (e) { msg = String((e as Error).message); }
    assert(/no bytes/.test(msg) && /should have encoded a blank one/.test(msg), `原因：${msg}`);   // 1-8b 起存盘的钉点先编一份空白的；直接调写盘碰到 null 照旧抛
  });
  it("不带这两样的文件照常写（逐字节和改之前一样由冻结样本那一套测试钉着）", () => {
    const s = meshScene(boxMesh).s;
    assert(writeCatsup(documentFromScene(s, "普通")).length > 0, "照常写");
  });
});
