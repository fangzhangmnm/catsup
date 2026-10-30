// mesh 显示视图 + 网格体进场景（M2，2026-10-27 Claude Fable 5.1；user「不要monkey patch。基础打扎实」）：
// 契约 scene/kernel-view.ts 由 mesh/mesh-view.ts 真做（记录 = 内核事实、平面 = 环的绕向、自己的改动日志）；WorldView 给 mesh 池开槽；渲染缓存 pool-mesh 对它全量 + 增量；
// brep → mesh 出多边形面（封闭壳朝外、带洞的面三角化且内部边软 + 平滑）；三角汤往返；clone / castDefinition op。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
import { MeshKernel, F_SOFT, F_SMOOTH, FF_HIDDEN } from "../src/mesh/mesh-kernel.ts";
import { addBox, flipFaces, recalcNormals } from "../src/mesh/ops/index.ts";
import { meshViewOf } from "../src/mesh/mesh-view.ts";
import { meshFromTriangles, meshToTriangles } from "../src/mesh/tri-soup.ts";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { brepToMesh } from "../src/scene/kinds.ts";
import { PoolMesh, type PoolMeshEnv } from "../src/editor/pool-mesh.ts";
import { applyOp } from "../src/editor/ops.ts";
import { IDENTITY, WORLD_FRAME } from "../src/scene/xform.ts";
import { sceneBox, sceneHoledOpen } from "./format-scenes.ts";

const env: PoolMeshEnv = { matOf: () => null, slotsSig: "", faceColor: () => [0.5, 0.5, 0.5], edgeColor: () => [0, 0, 0], thick: false, singleSided: true };
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const centroid = (pts: readonly Pt3[]): Pt3 => { let x = 0, y = 0, z = 0; for (const p of pts) { x += p.x; y += p.y; z += p.z; } return { x: x / pts.length, y: y / pts.length, z: z / pts.length }; };
const unitBox = (): { m: MeshKernel; verts: number[]; faces: number[] } => { const m = new MeshKernel(); const { verts, faces } = addBox(m, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }); return { m, verts, faces }; };
const allOutward = (m: MeshKernel): boolean => { const c = centroid(m.verts().map((v) => m.pt(v))); return m.faces().every((f) => { const fc = centroid(m.facePts(f)); return dot(m.faceNormal(f), { x: fc.x - c.x, y: fc.y - c.y, z: fc.z - c.z }) > 0; }); };

describe("mesh 显示视图（契约 kernel-view.ts）", () => {
  it("盒子：点线面记录 = 内核事实；环的有向边一致；平面 = 环的绕向、过形心", () => {
    const { m } = unitBox(), v = meshViewOf(m);
    eq(v.vertices().length, 8); eq(v.edges().length, 12); eq(v.faces().length, 6);
    for (const e of v.edges()) eq(e.faceLinks.length, 2, "盒子每条边两张面");
    for (const f of v.faces()) {
      eq(f.outer.vids.length, 4); eq(f.holes.length, 0);
      f.outer.edges.forEach((d, i) => { const E = v.graph.edge(d.edge); eq(d.forward ? E.a : E.b, f.outer.vids[i], "vids[i] = edges[i] 的起点"); });
      const pl = v.planeOf(f.id)!;
      assert(dot(pl.plane.n, m.faceNormal(f.id)) > 0.999, "平面法向 = 环的绕向");
      const c = centroid(f.outer.vids.map((id) => v.graph.pt(id)));
      assert(Math.abs(dot(pl.plane.n, c) - pl.plane.d) < 1e-9, "平面过形心");
      eq(f.outer.pts.length, 4, "2D 环");
    }
    assert(meshViewOf(m) === v, "同一内核同一视图（身份稳定）");
    eq(v.curves().length, 0); eq(v.isFold(), false);
  });
  it("表按 rev 缓存：改坐标 / 边标记 / 隐藏面后视图跟着变；单面背面没有材质", () => {
    const { m, verts, faces } = unitBox(), v = meshViewOf(m);
    const rev0 = v.rev;
    m.setPos(verts[0], { x: -1, y: -1, z: -1 });
    assert(v.rev > rev0 && v.graph.pt(verts[0]).x === -1 && v.vertices().find((x) => x.id === verts[0])!.x === -1);
    const e = m.edges()[0];
    m.setFlags(e, F_SOFT, true); assert(v.isSoft(e) && v.soft.has(e) && v.edgeLayers.layer("soft").has(e));
    m.setFlags(e, F_SMOOTH, true); assert(v.isSmooth(e) && v.edgeLayers.layer("smooth").has(e));
    m.setFaceFlags(faces[0], FF_HIDDEN, true); assert(v.isFaceHidden(faces[0]) && !v.isFaceHidden(faces[1]));
    m.setFaceMat(faces[1], 3); eq(v.faceMaterialOf(faces[1], 0), 3); eq(v.faceMaterialOf(faces[1], 1), undefined, "单面：背面没有材质");
    eq(v.faceMaterialOf(faces[2], 0), undefined);
  });
});

describe("网格体进场景", () => {
  it("WorldView 给 mesh 池开槽：点线面进推断世界、经实例变换；隐藏的面不进", () => {
    const s = new Scene(sceneBox());
    const d = s.mintDef("网格", new Kernel()); d.body = brepToMesh(s.brep(s.root));
    s.mintInstance(s.root, null, d.id, [1, 0, 0, 10, 0, 1, 0, 0, 0, 0, 1, 0]);
    const wv = new WorldView(s, ROOT_CONTEXT);
    eq(wv.slots.length, 2); eq(wv.faces().length, 12); eq(wv.vertices().length, 16); eq(wv.edges().length, 24);
    const meshFaces = [...wv.slotFaces(1)];
    eq(meshFaces.length, 6);
    const xs = meshFaces.flatMap((f) => f.outer.vids.map((id) => wv.graph.pt(id).x));
    assert(Math.min(...xs) >= 10 - 1e-9, "网格体的点经实例变换（x ≥ 10）");
    eq(wv.faceMaterial(meshFaces[0].id), null);
    d.body.kernel.setFaceFlags(d.body.kernel.faces()[0], FF_HIDDEN, true);
    eq([...new WorldView(s, ROOT_CONTEXT).slotFaces(1)].length, 5, "隐藏的面不进推断世界");
  });
  it("castDefinition op：brep 定义 → mesh；clone 深拷贝内核；pointsOfDef 读得到网格体的点", () => {
    const s = new Scene(sceneBox());
    const d = s.mintDef("盒", sceneBox()); s.mintInstance(s.root, null, d.id, [1, 0, 0, 5, 0, 1, 0, 0, 0, 0, 1, 0]);
    const r = applyOp(s, { op: "castDefinition", def: d.id, to: "mesh" });
    eq(r.scene.kindOf(d.id), "mesh"); eq(r.scene.mesh(d.id).kernel.faceCount(), 6);
    eq(r.scene.pointsOfDef(d.id).length, 8);
    const c = r.scene.clone();
    assert(c.mesh(d.id).kernel !== r.scene.mesh(d.id).kernel, "clone = 深拷贝");
    eq(c.mesh(d.id).kernel.faceCount(), 6);
    let threw = false; try { c.kernelOf({ def: d.id, group: null }); } catch { threw = true; } assert(threw, "kernelOf 仍只认 brep");
    assert(c.viewOf({ def: d.id, group: null }).faces().length === 6, "viewOf 对两种身体都成立");
  });
});

describe("brep → mesh", () => {
  it("组里的几何一起进网格体、住在组里的实例挂回根上（2026-10-28：以前只转根池 = 组里的静默丢了、实例指着不存在的组）", () => {
    const s = new Scene(sceneBox()), g = s.mintGroup(s.root, null, sceneBox(), WORLD_FRAME), part = s.mintDef("件", new Kernel());
    const inst = s.mintInstance(s.root, g.id, part.id, IDENTITY);
    eq(brepToMesh(s.brep(s.root)).kernel.faceCount(), 12, "根池 6 + 组里 6");
    applyOp(s, { op: "castDefinition", def: s.root, to: "mesh" });
    eq(s.def(s.root).body.kind, "mesh"); eq(s.def(s.root).instances.get(inst.id)!.parent, null, "实例挂回根");
  });
  it("盒子：6 张四边形、12 条硬边、8 点；法向一律朝外（封闭壳）", () => {
    const s = new Scene(sceneBox()), m = brepToMesh(s.brep(s.root)).kernel;
    eq(m.faceCount(), 6); eq(m.edgeCount(), 12); eq(m.vertexCount(), 8);
    for (const e of m.edges()) eq(m.edgeFlags[e], 0, "盒子的边都是硬边");
    for (const f of m.faces()) eq(m.faceVerts(f).length, 4);
    assert(allOutward(m), "封闭壳朝外");
    eq(m.check().length, 0);
  });
  it("带洞的面：三角化，内部边软 + 平滑，看得见的边数 = brep 看得见的边数", () => {
    const s = new Scene(sceneHoledOpen()), k = s.brep(s.root).kernel, m = brepToMesh(s.brep(s.root)).kernel;
    assert(k.faces().some((f) => k.face(f.id)!.holes.length > 0), "样本有带洞的面");
    assert(m.faceCount() > k.faces().length, "带洞的面变成了几张三角形");
    const visible = m.edges().filter((e) => !(m.edgeFlags[e] & F_SOFT)).length;
    eq(visible, k.edges().filter((e) => !k.isSoft(e.id)).length);
    for (const e of m.edges()) if (m.edgeFlags[e] & F_SOFT) assert(m.edgeFlags[e] & F_SMOOTH, "内部边软 + 平滑");
    eq(m.check().length, 0);
  });
  it("recalcNormals：翻乱的盒子一次摆正、朝外；再跑一次不动", () => {
    const { m, faces } = unitBox();
    flipFaces(m, [faces[0], faces[3]]);
    assert(!allOutward(m));
    const r = recalcNormals(m);
    assert(r.flipped > 0 && r.components === 1 && allOutward(m));
    eq(recalcNormals(m).flipped, 0);
    // 开口片：种子面的朝向不动，邻面跟它一致
    const open = new MeshKernel(); const a = open.addVertex({ x: 0, y: 0, z: 0 }), b = open.addVertex({ x: 1, y: 0, z: 0 }), c = open.addVertex({ x: 1, y: 1, z: 0 }), d2 = open.addVertex({ x: 0, y: 1, z: 0 }), e2 = open.addVertex({ x: 2, y: 0, z: 0 }), f2 = open.addVertex({ x: 2, y: 1, z: 0 });
    open.addFace([a, b, c, d2]); open.addFace([c, f2, e2, b]);   // 第二张顺时针：和第一张同向走 b→c = 不一致
    eq(recalcNormals(open).flipped, 1);
    assert(open.faceNormal(open.faces()[0]).z > 0 && open.faceNormal(open.faces()[1]).z > 0);
  });
  it("三角汤往返：盒子 → 12 个三角形 → 12 张三角面；材质槽保留；退化三角形计数", () => {
    const { m, faces } = unitBox();
    m.setFaceMat(faces[0], 2);
    const soup = meshToTriangles(m);
    eq(soup.indices.length, 36); eq(soup.positions.length, 24);
    const back = meshFromTriangles(soup);
    eq(back.skipped, 0); eq(back.kernel.faceCount(), 12);
    eq(back.kernel.faces().filter((f) => back.kernel.faceMat[f] === 2).length, 2);
    eq(meshFromTriangles({ positions: new Float32Array([0, 0, 0, 1, 0, 0]), indices: new Uint32Array([0, 1, 1, 0, 0, 5]) }).skipped, 2);
  });
});

describe("渲染缓存接网格体（pool-mesh）", () => {
  it("全量：6 面 12 线、单面；增量：挪一个点只重建它周围的 3 张面；软边后线少一条；预演副本沿族谱仍是增量", () => {
    const { m, verts } = unitBox(), v = meshViewOf(m), pm = new PoolMesh();
    const r1 = pm.sync(v, env);
    assert(r1.full); eq(r1.faces, 6); eq(r1.edges, 12); assert(pm.singleSided); eq(pm.lines.count, 12);
    m.setPos(verts[0], { x: -0.5, y: -0.5, z: -0.5 });
    const r2 = pm.sync(v, env);
    assert(!r2.full, "改坐标 = 增量"); eq(r2.faces, 3);
    m.setFlags(m.edges()[0], F_SOFT, true);
    const r3 = pm.sync(v, env);
    assert(!r3.full); eq(pm.lines.count, 12, "软边仍在线批里（v0.18.8 起：只在转成外轮廓时画，I12）");
    const soft = pm.lines.range(m.edges()[0]); assert(!!soft, "软边有记录");
    const fl = (pm.lines as unknown as { arrays: Record<string, Float32Array> }).arrays.aFlag;
    assert(fl[soft![0]] >= 10 && fl[soft![0] + 1] >= 10, `软边两个顶点的旗都 ≥ 10（只在外轮廓画）：${fl[soft![0]]}`);
    const m2 = m.clone(); m2.setPos(verts[1], { x: 1.5, y: 0, z: 0 });
    const r4 = pm.sync(meshViewOf(m2), env);
    assert(!r4.full, "克隆的族谱接得上原件：增量"); eq(r4.faces, 3);
    const r5 = pm.sync(v, env);
    assert(!r5.full, "切回原件也是增量");
    const r6 = pm.sync(v, { ...env, singleSided: false });
    assert(r6.full, "单面 ↔ 双面变了 = 全量");
  });
});
