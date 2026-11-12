// 单面 / 双面第四版（ID-2b，计划书 ai-docs/20261104-identity-foundation-plan.md §2.9 / §9）：内置默认背面、新面两侧、翻面、按侧出面、两种身体互转、修复工具、导出说明行的数。
// created 2026-11-04 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel, type Pt3 } from "../src/kernel/kernel.ts";
import { backSideOf } from "../src/kernel/face-sides.ts";
import { ROOT_CONTEXT, Scene, type PoolRef } from "../src/scene/scene.ts";
import { BUILTIN_BACK, BUILTIN_BACK_SLOT } from "../src/scene/builtin-materials.ts";
import { brepSideCounts, brepToMesh, exportSideCounts, meshToBrep } from "../src/scene/kinds.ts";
import { applyOp, faceKey, type Op } from "../src/editor/ops.ts";
import { translation } from "../src/scene/xform.ts";
import { History } from "../src/editor/history.ts";
import { withFront } from "../src/editor/op-locks.ts";
import { extract, castPayload } from "../src/editor/transfer.ts";
import { PoolMesh, type PoolMeshEnv } from "../src/editor/pool-mesh.ts";
import { EditorStreamProvider } from "../src/editor/stream-provider.ts";
import { planOutward, planUnify } from "../src/editor/repairs/orient/plan.ts";
import { flipSides, orientOutward, orientUnify } from "../src/editor/repairs/orient/index.ts";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup, writeGltfModel } from "../src/format/index.ts";
import { BUILTIN_BACK_GUID, BUILTIN_FRONT_GUID, mintGuid } from "../src/format/guid.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { textureBasis, dot3 } from "../src/kernel/geom.ts";
import { oneSided, sceneBox, sceneSided, sceneFingerprint } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const UP = P(0, 0, 1), DOWN = P(0, 0, -1);
const rect = (x = 0, w = 1): [Pt3, Pt3][] => [[P(x, 0), P(x + w, 0)], [P(x + w, 0), P(x + w, w)], [P(x + w, w), P(x, w)], [P(x, w), P(x, 0)]];
const root = (s: Scene): PoolRef => ({ def: s.root, group: null });
const K = (s: Scene): Kernel => s.brep(s.root).kernel;
const backOf = (s: Scene): number => s.brep(s.root).materialSlots.indexOf(BUILTIN_BACK_SLOT);
/** 面的朝外判据：+n 指离中心 = +n 那侧朝外。 */
const outwardBack = (k: Kernel, f: number, c: Pt3): 0 | 1 => { const n = k.planeOf(f)!.plane.n, p = k.faceRings3(f)!.outer[0]; return n.x * (p.x - c.x) + n.y * (p.y - c.y) + n.z * (p.z - c.z) > 0 ? 1 : 0; };
function drawnBox(front: Pt3 = UP, dir = 1): Scene {
  const s = new Scene(new Kernel());
  applyOp(s, { op: "addEdges", at: root(s), segs: rect(), front });
  const k = K(s), f = k.faces()[0].id, n = k.planeOf(f)!.plane.n;
  applyOp(s, { op: "pushpull", at: root(s), face: faceKey(k, f), dist: dir * Math.sign(n.z), front });
  return s;
}
const layersOf = (k: Kernel): string => JSON.stringify(k.toBrep().faceLayers ?? null);

describe("新面的两侧（§9.2-D + §9.2½ ③）", () => {
  it("没邻面看 front：法向同号那侧 = 正面（不写），另一侧 = 默认背面；槽表开一格内置", () => {
    const s = new Scene(new Kernel());
    applyOp(s, { op: "addEdges", at: root(s), segs: rect(), front: UP });
    const k = K(s), f = k.faces()[0].id, n = k.planeOf(f)!.plane.n, back = backOf(s);
    assert(back >= 0, "开了内置那一格");
    eq(backSideOf(k, f, back), n.z > 0 ? 1 : 0, "朝下那侧 = 默认背面");
    eq(k.faceMaterialOf(f, n.z > 0 ? 0 : 1), undefined, "正面 = 槽缺（默认正面只有这一种表示）");
    eq(s.materials.length, 0, "内置不进材质表");
    assert(s.materialOfSlot(s.root, backOf(s)) === BUILTIN_BACK);
  });
  it("没 front（老复现包）= 不写：两侧默认正面，今天的样子；同一串老 op 什么层都没有", () => {
    const s = new Scene(new Kernel());
    applyOp(s, { op: "addEdges", at: root(s), segs: rect() });
    const k = K(s), f = k.faces()[0].id;
    applyOp(s, { op: "pushpull", at: root(s), face: faceKey(k, f), dist: 1 });
    eq(layersOf(K(s)), "null"); eq(backOf(s), -1, "槽表没开");
  });
  it("侧视（front 和法向垂直）= 不写", () => {
    const s = new Scene(new Kernel());
    applyOp(s, { op: "addEdges", at: root(s), segs: rect(), front: P(1, 0, 0) });
    eq(layersOf(K(s)), "null");
  });
  it("推拉：底面有朝向 → 盒子全部朝外；往下推 = 反的（看得见，自己翻；SketchUp 同款）", () => {
    const s = drawnBox(), k = K(s), c = P(0.5, 0.5, 0.5);
    eq(k.faces().length, 6);
    for (const f of k.faces()) eq(backSideOf(k, f.id, backOf(s)), outwardBack(k, f.id, c), `面 ${f.id} 朝外`);
    const d = drawnBox(UP, -1), kd = K(d), cd = P(0.5, 0.5, -0.5);
    for (const f of kd.faces()) eq(backSideOf(kd, f.id, backOf(d)), 1 - outwardBack(kd, f.id, cd), `面 ${f.id} 朝里`);
  });
  it("推拉：底面没朝向 + front → 先定底面再灌，盒子朝向一致（各面单独看相机会一半朝里）；底面涂过的那侧不覆盖", () => {
    const s = new Scene(new Kernel());
    applyOp(s, { op: "addEdges", at: root(s), segs: rect() });
    const k = K(s), f = k.faces()[0].id, n = k.planeOf(f)!.plane.n;
    eq(layersOf(k), "null");
    applyOp(s, { op: "pushpull", at: root(s), face: faceKey(k, f), dist: Math.sign(n.z), front: P(0.3, -0.5, 0.8) });
    const k2 = K(s);
    for (const g of k2.faces()) eq(backSideOf(k2, g.id, backOf(s)), outwardBack(k2, g.id, P(0.5, 0.5, 0.5)), `面 ${g.id}`);
    const t = new Scene(new Kernel());
    applyOp(t, { op: "addEdges", at: root(t), segs: rect() });
    applyOp(t, { op: "addMaterial", name: "红", color: [1, 0, 0] });
    const kt = K(t), ft = kt.faces()[0].id, nt = kt.planeOf(ft)!.plane.n, inner = nt.z > 0 ? 1 : 0;
    applyOp(t, { op: "paintFaces", at: root(t), faces: [faceKey(kt, ft)], material: 0, sides: [inner] });
    applyOp(t, { op: "pushpull", at: root(t), face: faceKey(kt, ft), dist: Math.sign(nt.z), front: UP });
    const kk = K(t), cap = kk.faces().find((g) => kk.faceRings3(g.id)!.outer.every((p) => p.z === 1))!;
    eq(t.materialOfSlot(t.root, kk.faceMaterialOf(cap.id, inner))?.name, "红", "涂了的不动");
    for (const g of kk.faces()) if (g.id !== cap.id) eq(backSideOf(kk, g.id, backOf(t)), outwardBack(kk, g.id, P(0.5, 0.5, 0.5)), `新面 ${g.id} 仍朝外`);
  });
  it("邻面优先于 front：连着有朝向的面，方向给反了也跟邻面（没邻面才看意图）", () => {
    const s = new Scene(new Kernel());
    applyOp(s, { op: "addEdges", at: root(s), segs: rect(), front: UP });
    const n = K(s).faces()[0].id, nz = K(s).planeOf(n)!.plane.n.z;
    applyOp(s, { op: "addEdges", at: root(s), segs: [[P(1, 0), P(2, 0)], [P(2, 0), P(2, 1)], [P(2, 1), P(1, 1)]], front: DOWN });
    const k = K(s);
    eq(k.faces().length, 2);
    for (const f of k.faces()) eq(backSideOf(k, f.id, backOf(s)), nz > 0 ? 1 : 0, "共面邻居同一侧朝上");
  });
  it("T 字边不投票：一条边上三张面时不沿它推", () => {
    const s = drawnBox(), k = K(s);
    eq(k.faces().length, 6);
    // 从盒子顶边往外画一张竖着的面（只靠 T 字边连着）→ 邻面给不出；没 front = 不写
    applyOp(s, { op: "addEdges", at: root(s), segs: [[P(0, 0, 1), P(0, 0, 2)], [P(0, 0, 2), P(1, 0, 2)], [P(1, 0, 2), P(1, 0, 1)]] });
    const k2 = K(s), fin = k2.faces().find((f) => k2.faceRings3(f.id)!.outer.some((p) => p.z === 2))!;
    eq(backSideOf(k2, fin.id, backOf(s)), null, "两侧默认正面（只有 T 字边连着：不投票）");
  });
  it("确定性：同一串 op 跑两遍 → 同层逐字；撤销重做逐字回来", () => {
    const run = (): string => layersOf(K(drawnBox(P(0.2, -0.4, 0.9))));
    eq(run(), run());
    const s = new Scene(new Kernel()), h = new History(s);
    let cur = h.commit(s, { op: "addEdges", at: root(s), segs: rect(), front: UP }).scene;
    const after = layersOf(K(cur)), slots = JSON.stringify(cur.brep(cur.root).materialSlots);
    cur = h.undo()!.scene; eq(JSON.stringify(cur.brep(cur.root).materialSlots), "[]", "撤销连槽表一起回去"); eq(layersOf(K(cur)), "null");
    cur = h.redo(cur)!.scene; eq(layersOf(K(cur)), after); eq(JSON.stringify(cur.brep(cur.root).materialSlots), slots);
  });
  it("并面不产生双背面：朝向相反的两张共面面擦掉中间那条边，朝向跟第一张有朝向的面", () => {
    const s = new Scene(new Kernel());
    applyOp(s, { op: "addEdges", at: root(s), segs: rect(0), front: UP });
    applyOp(s, { op: "addEdges", at: root(s), segs: rect(2), front: DOWN });   // 不相连：各看各的 front
    applyOp(s, { op: "addEdges", at: root(s), segs: [[P(1, 0), P(2, 0)], [P(1, 1), P(2, 1)]] });   // 中间连起来：一张新面
    const k = K(s), back = backOf(s);
    const mid = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.x >= 1 && p.x <= 2))!;
    eq(backSideOf(k, mid.id, back), null, "两边朝向相反、边长一样：平票 = 不写");
    const e = k.edges().find((x) => { const a = k.graph.pt(x.a), b = k.graph.pt(x.b); return a.x === 1 && b.x === 1; })!, e2 = k.edges().find((x) => { const a = k.graph.pt(x.a), b = k.graph.pt(x.b); return a.x === 2 && b.x === 2; })!;
    applyOp(s, { op: "eraseEdges", at: root(s), edges: [[k.graph.pt(e.a), k.graph.pt(e.b)], [k.graph.pt(e2.a), k.graph.pt(e2.b)]] });
    const k2 = K(s);
    eq(k2.faces().length, 1, "并成一张");
    assert(backSideOf(k2, k2.faces()[0].id, back) !== null, "一侧正面、一侧默认背面（不是两侧都背面）");
  });
  it("切开继承两侧；withFront 把视线方向写进 op（批里每条都带；已有的不动；别的 op 不碰）", () => {
    const s = new Scene(new Kernel());
    applyOp(s, { op: "addEdges", at: root(s), segs: rect(), front: UP });
    const before = backSideOf(K(s), K(s).faces()[0].id, backOf(s));
    applyOp(s, { op: "addEdges", at: root(s), segs: [[P(0.5, 0), P(0.5, 1)]] });
    const k = K(s); eq(k.faces().length, 2);
    for (const f of k.faces()) eq(backSideOf(k, f.id, backOf(s)), before, "子面继承");
    const view = (): Pt3 => UP, at = root(s);
    const b = withFront({ op: "batch", label: "x", ops: [{ op: "addEdges", at, segs: rect() }, { op: "addEdges", at, segs: rect(), front: DOWN }, { op: "unhideAll" }] }, view) as Extract<Op, { op: "batch" }>;
    eq(JSON.stringify((b.ops[0] as { front?: Pt3 }).front), JSON.stringify(UP)); eq(JSON.stringify((b.ops[1] as { front?: Pt3 }).front), JSON.stringify(DOWN)); eq(b.ops[2].op, "unhideAll");
    const pp = withFront({ op: "pushpull", at, face: [P(0, 0)], dist: 1 }, view) as Extract<Op, { op: "pushpull" }>;
    eq(JSON.stringify(pp.front), JSON.stringify(UP));
  });
});

describe("内置默认背面碰到的地方（§9.2-A）", () => {
  const painted = (): Scene => { const s = new Scene(sceneBox()); oneSided(s, s.root); return s; };
  it("油漆桶可以涂 −2；普通 op 的越界材质照旧拒；两侧都涂 = 双背面", () => {
    const s = new Scene(sceneBox()), k = K(s), f = k.faces()[0].id;
    applyOp(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, f)], material: BUILTIN_BACK_SLOT });
    eq(k.faceMaterialOf(f, 0), backOf(s)); eq(k.faceMaterialOf(f, 1), backOf(s));
    let threw = false; try { applyOp(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, f)], material: 7 }); } catch { threw = true; }
    assert(threw, "不存在的材质拒");
  });
  it("清理材质保住内置那一格（−2 不是下标）", () => {
    const s = painted();
    applyOp(s, { op: "addMaterial", name: "没人用", color: [1, 1, 1] });
    const slots = JSON.stringify(s.brep(s.root).materialSlots);
    applyOp(s, { op: "purgeMaterials", materials: [0] });
    eq(JSON.stringify(s.brep(s.root).materialSlots), slots); eq(s.materials.length, 0);
  });
  it("存盘：槽表引用内置 GUID；材质表里没有内置；读回句柄 −2；再写字节不变", () => {
    const s = sceneSided(), bytes = writeCatsup(documentFromScene(s, "t")), { json } = decodeGlb(bytes) as unknown as { json: any };
    assert(json.extensions.CATSUP_definitions.list[0].materialSlots.includes(BUILTIN_BACK_GUID), "槽表写内置 GUID");
    for (const m of json.materials) assert(![BUILTIN_BACK_GUID, BUILTIN_FRONT_GUID].includes(m.extensions.CATSUP_material.guid), "材质表没有内置");
    assert(!JSON.stringify(json.extensions.CATSUP_definitions).includes(BUILTIN_FRONT_GUID), "默认正面没有第二种表示");
    const back = sceneFromDocument(readCatsup(bytes));
    eq(sceneFingerprint(back), sceneFingerprint(s));
    assert(back.brep(back.root).materialSlots.includes(BUILTIN_BACK_SLOT));
    assert(writeCatsup(documentFromScene(back, "t")).every((b, i) => b === writeCatsup(documentFromScene(back, "t"))[i]), "写两次字节一样");
  });
  it("读：槽表里的内置正面 GUID = 没有 + notes 记一笔；冒充内置的材质现铸身份", () => {
    const s = sceneSided(), g = decodeGlb(writeCatsup(documentFromScene(s, "t"))) as unknown as { json: any; bin: Uint8Array };
    g.json.extensions.CATSUP_definitions.list[0].materialSlots.push(BUILTIN_FRONT_GUID);
    g.json.materials[0].extensions.CATSUP_material.guid = BUILTIN_BACK_GUID;
    const doc = readCatsup(encodeGlb(g.json, g.bin));
    eq(doc.definitions[doc.rootIndex].materialSlots.at(-1), null); eq(doc.readNotes?.builtinFrontSlots, 1);
    assert(doc.materials[0].guid !== BUILTIN_BACK_GUID, "材质表不许有内置");
  });
  it("粘贴：对照表里的内置不进材质表，贴回还是默认背面；转网格体载荷不带背面，转回硬表面长回来", () => {
    const s = drawnBox(), k = K(s);
    const pay = extract(s, ROOT_CONTEXT, { faces: k.faces().map((f) => f.id), edges: [] }, [])!;
    assert(pay.materials?.includes(BUILTIN_BACK), "对照表里有内置");
    const t = new Scene(new Kernel());
    applyOp(t, { op: "paste", at: root(t), brep: pay.brep, materials: pay.materials });
    eq(t.materials.length, 0, "内置不进材质表");
    const kt = K(t);
    for (const f of kt.faces()) eq(backSideOf(kt, f.id, backOf(t)), outwardBack(kt, f.id, P(0.5, 0.5, 0.5)), "贴过来朝向不变");
    const asMesh = castPayload(pay, "mesh");
    eq(asMesh.mesh?.faces.length, 6, "一侧 = 一张面");
    const asBrep = castPayload(asMesh, "brep");
    assert(asBrep.materials?.includes(BUILTIN_BACK), "转回硬表面：另一侧是默认背面");
    const u = new Scene(new Kernel());
    applyOp(u, { op: "paste", at: root(u), brep: asBrep.brep, materials: asBrep.materials });
    const ku = K(u); eq(ku.faces().length, 6);
    for (const f of ku.faces()) eq(backSideOf(ku, f.id, backOf(u)), outwardBack(ku, f.id, P(0.5, 0.5, 0.5)), "往返朝向不变");
  });
  it("粘贴：有意的两面都出（两侧都是默认正面）不被邻面改掉", () => {
    const s = drawnBox();
    const src = new Kernel(); src.addEdges(rect(5));
    applyOp(s, { op: "paste", at: root(s), brep: src.toBrep() });
    const k = K(s), f = k.faces().find((x) => k.faceRings3(x.id)!.outer.every((p) => p.x >= 5))!;
    eq(k.faceMaterialOf(f.id, 0), undefined); eq(k.faceMaterialOf(f.id, 1), undefined);
  });
  it("翻面：两侧互换、几何不动；撤销回来；重做再换", () => {
    const s = drawnBox(), h = new History(s), f = K(s).faces()[0].id, back = backOf(s), side = backSideOf(K(s), f, back);
    const geo = JSON.stringify(K(s).toBrep().vertices);
    let cur = h.commit(s, { op: "flipFaceSides", at: root(s), faces: [faceKey(K(s), f)] }).scene;
    eq(backSideOf(K(cur), f, back), 1 - side!); eq(JSON.stringify(K(cur).toBrep().vertices), geo);
    cur = h.undo()!.scene; eq(backSideOf(K(cur), f, back), side);
    cur = h.redo(cur)!.scene; eq(backSideOf(K(cur), f, back), 1 - side!);
  });
  it("渲染：把一侧从默认正面改成默认背面要重画（内置有自己的 uid）；演示 / 风格预览不画默认背面，双背面的面整张不进缓存", () => {
    const s = new Scene(new Kernel()), p = new EditorStreamProvider(() => false, () => false) as unknown as { env(sc: Scene, d: number, t: boolean): PoolMeshEnv };
    const empty = p.env(s, s.root, false).slotsSig;
    s.brep(s.root).materialSlots = [BUILTIN_BACK_SLOT];
    const withBack = p.env(s, s.root, false).slotsSig;
    assert(withBack !== "0" && withBack !== empty, `内置 uid：${withBack}`);
    const k = new Kernel(); k.addEdges(rect()); const f = k.faces()[0].id;
    const envOf = (cull: boolean): PoolMeshEnv => ({ matOf: (slot) => (slot === 0 ? BUILTIN_BACK : null), mapOf: () => null, slotsSig: "1", faceColor: (m) => (m === BUILTIN_BACK ? (cull ? [-1, -1, -1] : [0.6, 0.7, 0.8]) : [0.8, 0.8, 0.8]), seams: false, edgeColor: () => [0, 0, 0], thick: false, singleSided: false, backLook: cull ? "cull" : "show" });
    k.setFaceMaterial([f], 0, [1]);
    const m = new PoolMesh(); m.sync(k, envOf(false));
    const A = m.groups.get("plain")!.store.arrays;
    assert((A.aColorB as Int8Array)[0] > 0, "编辑时背面有颜色");
    assert(m.sync(k, envOf(true)).full, "换看法 = 全量重建");
    assert((m.groups.get("plain")!.store.arrays.aColorB as Int8Array)[0] < 0, "预览时默认背面不画（负值 = 着色器丢弃）");
    k.setFaceMaterial([f], 0, [0]);
    m.sync(k, envOf(true));
    eq(m.faceRanges(f).length, 0, "双背面整张不进缓存");
  });
});

/** glb 里一个 primitive 的三角形（世界坐标 Z-up 换回来）+ 法向。 */
function trisOf(g: { json: any; bin: Uint8Array }, prim: any): { p: Pt3[]; n?: Pt3[] }[] {
  const acc = (i: number): { a: any; view: DataView; off: number } => { const a = g.json.accessors[i], bv = g.json.bufferViews[a.bufferView]; return { a, view: new DataView(g.bin.buffer, g.bin.byteOffset + (bv.byteOffset ?? 0), bv.byteLength), off: 0 }; };
  const vec = (i: number): Pt3[] => { const { a, view } = acc(i), out: Pt3[] = []; for (let k = 0; k < a.count; k++) { const x = view.getFloat32(k * 12, true), y = view.getFloat32(k * 12 + 4, true), z = view.getFloat32(k * 12 + 8, true); out.push(P(x, -z, y)); } return out; };
  const pos = vec(prim.attributes.POSITION), nor = prim.attributes.NORMAL !== undefined ? vec(prim.attributes.NORMAL) : undefined;
  let idx: number[];
  if (prim.indices !== undefined) { const { a, view } = acc(prim.indices), size = a.componentType === 5121 ? 1 : a.componentType === 5123 ? 2 : 4; idx = []; for (let k = 0; k < a.count; k++) idx.push(size === 1 ? view.getUint8(k) : size === 2 ? view.getUint16(k * 2, true) : view.getUint32(k * 4, true)); } else idx = pos.map((_, i) => i);
  const out: { p: Pt3[]; n?: Pt3[] }[] = [];
  for (let i = 0; i + 2 < idx.length; i += 3) out.push({ p: [pos[idx[i]], pos[idx[i + 1]], pos[idx[i + 2]]], ...(nor ? { n: [nor[idx[i]], nor[idx[i + 1]], nor[idx[i + 2]]] } : {}) });
  return out;
}
const areaN = (t: Pt3[]): Pt3 => { const u = { x: t[1].x - t[0].x, y: t[1].y - t[0].y, z: t[1].z - t[0].z }, v = { x: t[2].x - t[0].x, y: t[2].y - t[0].y, z: t[2].z - t[0].z }; return P(u.y * v.z - u.z * v.y, u.z * v.x - u.x * v.z, u.x * v.y - u.y * v.x); };
const glb = (s: Scene): { json: any; bin: Uint8Array } => decodeGlb(writeGltfModel(documentFromScene(s, "t"), { textures: true, lines: false })) as unknown as { json: any; bin: Uint8Array };
const triPrims = (g: { json: any }): any[] => g.json.meshes.flatMap((m: any) => m.primitives).filter((p: any) => (p.mode ?? 4) === 4);

describe("导出：要出几侧就几张面（§2.9 / §9.2½ ①）", () => {
  it("一侧朝外的盒子：12 个三角，绕向全朝外；默认背面不出", () => {
    const s = new Scene(sceneBox(1, 1)); oneSided(s, s.root);
    const g = glb(s), tris = triPrims(g).flatMap((p) => trisOf(g, p));
    eq(tris.length, 12);
    for (const t of tris) { const n = areaN(t.p), c = P((t.p[0].x + t.p[1].x + t.p[2].x) / 3 - 0.5, (t.p[0].y + t.p[1].y + t.p[2].y) / 3 - 0.5, (t.p[0].z + t.p[1].z + t.p[2].z) / 3 - 0.5); assert(dot3(n, c) > 0, "朝外"); }
  });
  it("两侧默认正面 = 两面都出（24 个三角，一半朝里）；双背面整张不出；glTF 材质一律单面", () => {
    const s = new Scene(sceneBox(1, 1)), g = glb(s), tris = triPrims(g).flatMap((p) => trisOf(g, p));
    eq(tris.length, 24);
    const k = K(s), wall = k.faces()[0].id;
    applyOp(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, wall)], material: BUILTIN_BACK_SLOT });
    const g2 = glb(s); eq(triPrims(g2).flatMap((p) => trisOf(g2, p)).length, 20, "少一张面的两层");
    applyOp(s, { op: "addMaterial", name: "红", color: [1, 0, 0] });
    applyOp(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, k.faces()[1].id)], material: 0, sides: [0] });
    const g3 = glb(s);
    assert(g3.json.materials.every((m: any) => m.doubleSided === undefined), "材质不标双面");
  });
  it("真材质那侧：逐角 NORMAL 和绕向一致、朝它那一侧；另一侧默认正面 = 无材质的一层", () => {
    const s = new Scene(sceneBox(1, 1)), k = K(s), top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 1))!, n = k.planeOf(top.id)!.plane.n;
    applyOp(s, { op: "addMaterial", name: "红", color: [1, 0, 0] });
    for (const f of k.faces()) if (f.id !== top.id) applyOp(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, f.id)], material: BUILTIN_BACK_SLOT });
    const up = n.z > 0 ? 0 : 1;
    applyOp(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, top.id)], material: 0, sides: [up] });
    const g = glb(s), prims = triPrims(g), red = prims.find((p) => p.material === 0)!, plain = prims.find((p) => p.material === undefined)!;
    const tr = trisOf(g, red); eq(tr.length, 2);
    for (const t of tr) { assert(areaN(t.p).z > 0, "绕向朝上"); for (const nn of t.n!) assert(nn.z > 0.99, "法向朝上"); }
    const tp = trisOf(g, plain); eq(tp.length, 2);
    for (const t of tp) assert(areaN(t.p).z < 0, "默认正面那层朝下");
  });
  it("贴图 UV 按那一侧的铺法（各侧从自己那侧看不镜像）", () => {
    const s = new Scene(sceneBox(1, 1)), k = K(s), top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 1))!, n = k.planeOf(top.id)!.plane.n, back = n.z > 0 ? 1 : 0;
    const tex = mintGuid();
    applyOp(s, { op: "addTexture", guid: tex, name: "图", mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]), sizeM: [2, 2] });
    applyOp(s, { op: "addMaterial", name: "图", color: [1, 1, 1], channels: { color: [tex] } });
    applyOp(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, top.id)], material: 0, sides: [back] });
    const g = glb(s), p = triPrims(g).find((x) => x.material === 0)!, basis = textureBasis(back === 1 ? P(-n.x, -n.y, -n.z) : n);
    const a = g.json.accessors[p.attributes.TEXCOORD_0], bv = g.json.bufferViews[a.bufferView], view = new DataView(g.bin.buffer, g.bin.byteOffset + (bv.byteOffset ?? 0), bv.byteLength);
    const tri = trisOf(g, p)[0];
    eq(+view.getFloat32(0, true).toFixed(5), +(dot3(tri.p[0], basis.u) / 2).toFixed(5));
    eq(+view.getFloat32(4, true).toFixed(5), +(1 - dot3(tri.p[0], basis.v) / 2).toFixed(5));
  });
  it("说明行的数：N 张两侧都出、其中 M 张材质不同、K 张整张不出；一份定义只算一次", () => {
    const c = exportSideCounts(sceneSided());
    eq(c.both, 1, "顶面"); eq(c.differ, 1, "两侧不同真材质"); eq(c.neither, 1, "墙");
    const legacy = exportSideCounts(new Scene(sceneBox()));
    eq(legacy.both, 6); eq(legacy.differ, 0); eq(legacy.neither, 0);
    const s = drawnBox(); eq(exportSideCounts(s).both, 0, "新画的盒子一张都不多");
  });
  it("说明行在场景里数（§12 C3）：两种量法一份算法；隐藏的面导出不算、转网格体照算；孤儿定义不算；only = 只数这几个；一份定义摆几次都算一次", () => {
    const s = new Scene(sceneBox()), at = root(s), k = K(s);
    applyOp(s, { op: "makeComponent", at, faces: k.faces().map((f) => faceKey(k, f.id)), edges: [], name: "盒" });
    const box = [...s.defs.keys()].find((id) => id !== s.root)!;
    applyOp(s, { op: "placeInstance", at, definition: box, xform: translation(P(5, 0, 0)) });
    eq(exportSideCounts(s).both, 6, "摆两份 = 6 张，不是 12");
    eq(exportSideCounts(s, [box]).both, 6, "only");
    eq(exportSideCounts(s, [s.root]).both, 6, "根够得着它");
    const kb = s.brep(box).kernel, hid = kb.faces()[0].id;
    kb.setFaceHidden([hid], true);
    eq(exportSideCounts(s).both, 5, "隐藏的面导出不算（bake 不出）");
    eq(brepSideCounts(s.brep(box)).both, 6, "转网格体隐藏的照算");
    eq(brepSideCounts(s.brep(box), { skipHidden: true }).both, 5);
    kb.setFaceHidden([hid], false);
    for (const i of [...s.def(s.root).instances.keys()]) applyOp(s, { op: "eraseInstance", def: s.root, instance: i });
    eq(exportSideCounts(s).both, 0, "没人摆的定义 = 孤儿，不导出就不算");
    eq(exportSideCounts(s, [box]).both, 6, "点名了照算");
  });
  it("导出表单的选择跟文件走（desk 1.4）：导出过才写、读回原样、只留字符串；老文件没有这个键", () => {
    const doc = documentFromScene(new Scene(sceneBox()), "t");
    assert(!("exportModel" in (decodeGlb(writeCatsup(doc)) as unknown as { json: any }).json.extensions.CATSUP_desk), "没导出过不写");
    doc.desk.exportModel = { format: "glb", scope: "sel", lines: "none" };
    const bytes = writeCatsup(doc), back = readCatsup(bytes);
    eq(JSON.stringify(back.desk.exportModel), JSON.stringify({ format: "glb", scope: "sel", lines: "none" }));
    const g = decodeGlb(bytes) as unknown as { json: any; bin: Uint8Array };
    g.json.extensions.CATSUP_desk.exportModel.lines = 3;
    eq(JSON.stringify(readCatsup(encodeGlb(g.json, g.bin)).desk.exportModel), JSON.stringify({ format: "glb", scope: "sel" }), "坏值丢掉");
  });
  it("工程文件也按侧出（三方看到的 = 导出的）", () => {
    const s = drawnBox(), { json } = decodeGlb(writeCatsup(documentFromScene(s, "t"))) as unknown as { json: any };
    const prim = json.meshes[0].primitives.find((p: any) => p.mode === 4);
    eq(json.accessors[prim.indices].count, 36, "6 面 × 2 三角 × 3");
  });
});

describe("转网格体 / 转回硬表面（§2.9 / §9.2-F）", () => {
  it("一侧 = 一张面朝它；两侧都出 = 两张共用点；默认背面不出；数报得对", () => {
    const s = sceneSided(), b = s.brep(s.root), m = brepToMesh(b).kernel;
    eq(m.faceCount(), 5 - 1 + 2, "4 张一层 + 顶面两层 − 墙没了");
    eq(m.vertexCount(), 8, "共用点");
    eq(JSON.stringify(brepSideCounts(b)), JSON.stringify({ both: 1, differ: 1, neither: 1 }));
    assert(m.faces().every((f) => m.faceMat[f] === -1 || b.materialSlots[m.faceMat[f]] !== BUILTIN_BACK_SLOT), "网格面不引用默认背面");
  });
  it("brep → mesh → brep：两侧材质保住；单层回来另一侧 = 默认背面；老白模两层回来还是两侧默认正面", () => {
    const s = sceneSided(), k0 = K(s), body = s.brep(s.root), back0 = backOf(s);
    const sideOf = (k: Kernel, slots: readonly number[], f: number, side: 0 | 1): string => { const v = k.faceMaterialOf(f, side); if (v === undefined) return "front"; const h = slots[v]; return h === BUILTIN_BACK_SLOT ? "back" : String(h); };
    const sig = (k: Kernel, slots: readonly number[]): string => k.faces().map((f) => { const p = k.faceRings3(f.id)!.outer, n = k.planeOf(f.id)!.plane.n, key = [p.reduce((a, q) => a + q.x, 0) / p.length, p.reduce((a, q) => a + q.y, 0) / p.length, p.reduce((a, q) => a + q.z, 0) / p.length].map((x) => x.toFixed(3)).join(","); const up = n.x + n.y + n.z > 0; return `${key}:${sideOf(k, slots, f.id, up ? 0 : 1)}/${sideOf(k, slots, f.id, up ? 1 : 0)}`; }).sort().join(" ");
    void back0;
    const before = k0.faces().filter((f) => !(k0.faceMaterialOf(f.id, 0) === backOf(s) && k0.faceMaterialOf(f.id, 1) === backOf(s)));
    eq(before.length, 5);
    const r = meshToBrep(brepToMesh(body), 20);
    eq(r.kernel.faces().length, 5, "6 − 双背面那张");
    const expect = sig(k0, body.materialSlots).split(" ").filter((x) => !x.endsWith(":back/back")).join(" ");
    eq(sig(r.kernel, r.materialSlots), expect);
    const old = new Scene(sceneBox(1, 1)), r2 = meshToBrep(brepToMesh(old.brep(old.root)), 20);
    eq(r2.kernel.faces().length, 6); eq(layersOf(r2.kernel), "null", "两层合回一张膜、两侧默认正面");
    eq(r2.materialSlots.includes(BUILTIN_BACK_SLOT), false, "没开默认背面那一格");
  });
  it("转换指令：网格体的面就是这些面（不合并、不修）；再转回来", () => {
    const s = new Scene(sceneBox(1, 1));
    applyOp(s, { op: "castDefinition", def: s.root, to: "mesh" });
    eq(s.mesh(s.root).kernel.faceCount(), 12, "老白模：12 张面，想单面先点「自动朝外」");
    const dist: Record<number, number> = {}; for (const e of s.mesh(s.root).kernel.edges()) { const n = s.mesh(s.root).kernel.eFaces(e).length; dist[n] = (dist[n] ?? 0) + 1; }
    eq(JSON.stringify(dist), '{"4":12}', "两层共用点：每条边挂 4 张面");
  });
});

describe("修复：翻面 / 统一朝向 / 自动朝外（§9.3-4）", () => {
  const env = (s: Scene) => ({ scene: s } as never);
  const faceSel = (faces: number[]) => ({ kind: "brep" as const, faces: new Set(faces), edges: new Set<number>(), guides: new Set<number>(), verts: new Set<number>() });
  it("自动朝外：老白模盒子里面涂默认背面（只写，不碰几何）；再跑一次没事做；一步撤销", () => {
    const s = new Scene(sceneBox(1, 1)), k = K(s);
    const r = orientOutward.plan(env(s), { kind: "brep", at: root(s), sel: null, xf: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0] }, { curvature: 3 });
    eq(r.count, 6);
    let cur = s; for (const op of r.ops) cur = applyOp(cur, op).scene;
    for (const f of k.faces()) eq(backSideOf(k, f.id, backOf(cur)), outwardBack(k, f.id, P(0.5, 0.5, 0.5)), `面 ${f.id}`);
    eq(orientOutward.plan(env(cur), { kind: "brep", at: root(cur), sel: null, xf: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0] }, { curvature: 3 }).count, 0, "幂等");
  });
  it("自动朝外：朝里的盒子翻回来；一张平面 = 片，不动，报数；涂过的那侧不覆盖", () => {
    const s = drawnBox(UP, -1), k = K(s);
    const p = planOutward(k, backOf(s), null, { minCurvature: 3 * Math.PI });
    eq(p.flip.length, 6); eq(p.back.length, 0); eq(p.shells, 1);
    const t = new Scene(new Kernel()); applyOp(t, { op: "addEdges", at: root(t), segs: rect() });
    const q = planOutward(K(t), backOf(t), null, { minCurvature: 3 * Math.PI });
    eq(q.sheets, 1); eq(q.flip.length + q.back.length, 0);
    const u = new Scene(sceneBox(1, 1)), ku = K(u);
    applyOp(u, { op: "addMaterial", name: "红", color: [1, 0, 0] });
    const f0 = ku.faces()[0].id;
    applyOp(u, { op: "paintFaces", at: root(u), faces: [faceKey(ku, f0)], material: 0, sides: [(1 - outwardBack(ku, f0, P(0.5, 0.5, 0.5))) as 0 | 1] });
    applyOp(u, { op: "paintFaces", at: root(u), faces: [faceKey(ku, f0)], material: 0 });   // 两侧都涂：朝里那侧不许被盖
    const v = planOutward(ku, backOf(u), null, { minCurvature: 3 * Math.PI });
    eq(v.stuck, 1); eq(v.back.length, 5);
  });
  it("自动朝外：开窗的房子仍是壳（开口边上的点不算）；鼓的阈值可调", () => {
    const s = new Scene(sceneBox(2, 2)), k = K(s);
    const wall = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.y === 0))!;
    k.addEdges([[P(0.5, 0, 0.5), P(1.5, 0, 0.5)], [P(1.5, 0, 0.5), P(1.5, 0, 1.5)], [P(1.5, 0, 1.5), P(0.5, 0, 1.5)], [P(0.5, 0, 1.5), P(0.5, 0, 0.5)]]);
    const win = k.faces().find((f) => f.id !== wall.id && k.faceRings3(f.id)!.outer.every((p) => p.y === 0 && p.x >= 0.5 && p.x <= 1.5 && p.z >= 0.5 && p.z <= 1.5))!;
    k.eraseFaces([win.id]);
    const p = planOutward(k, -1, null, { minCurvature: 3 * Math.PI });
    eq(p.shells, 1, "开窗不改变它"); eq(p.back.length, 6);
    const q = planOutward(k, -1, null, { minCurvature: 4.5 * Math.PI });
    eq(q.sheets, 1, "阈值调高就当片");
  });
  it("统一朝向：以选中面为准沿恰好两张面的边灌；选中面没朝向 = 说清楚、不猜；T 字边不过", () => {
    const s = drawnBox(), k = K(s), [a, b] = k.faces().map((f) => f.id);
    const at = root(s);
    applyOp(s, { op: "flipFaceSides", at, faces: [faceKey(k, b)] });
    const p = planUnify(k, backOf(s), [a]);
    eq(p.flip.join(","), String(b)); eq(p.noSeed, false);
    const u = orientUnify.plan(env(s), { kind: "brep", at, sel: faceSel([a]), xf: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0] }, {});
    eq(u.count, 1); eq(u.ops[0].op, "flipFaceSides");
    const t = new Scene(sceneBox(1, 1));
    const n = orientUnify.plan(env(t), { kind: "brep", at: root(t), sel: faceSel([K(t).faces()[0].id]), xf: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0] }, {});
    eq(n.count, 0); assert(/分不出/.test(n.notes?.[0] ?? ""), "说清楚");
    eq(flipSides.plan(env(s), { kind: "brep", at, sel: null, xf: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0] }, {}).count, 0, "翻面只认选中的面");
  });
});
