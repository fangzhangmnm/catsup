// 拉（自由建模的挤出；2026-10-27 Claude Opus 5.5）：边 / 点的挤出 + extrudeAndOffset + meshExtrude op + 撤销往返。
// 不变量：挤出后 MeshKernel.check() 干净；边挤出的新面和原来那张面在共用边上方向相反（法向一致）；同一份内核 + 同一组参数 → 同一批新 id（重放确定）。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, F_WIRE } from "../src/mesh/mesh-kernel.ts";
import { addBox, extrudeEdges, extrudeVerts, extrudeAndOffset, extrudeAlongNormals, extrudeNormalDirs } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY } from "../src/scene/xform.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const quad = (): MeshKernel => { const k = new MeshKernel(); const v = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)].map((p) => k.addVertex(p)); k.addFace(v); return k; };
/** 共用边 (a, b) 在两张面里的走向：一个 a→b、一个 b→a = 法向一致。 */
const opposite = (k: MeshKernel, f1: number, f2: number, a: number, b: number): boolean => {
  const dir = (f: number): number => { const r = k.faceVerts(f), i = r.indexOf(a); return r[(i + 1) % r.length] === b ? 1 : r[(i - 1 + r.length) % r.length] === b ? -1 : 0; };
  return dir(f1) * dir(f2) === -1;
};

describe("拉：边 / 点的挤出", () => {
  it("边界边挤出：长一张四边形、和原面在共用边上方向相反、check 干净", () => {
    const k = quad(), f0 = k.faces()[0], e = k.edgeOf(0, 1);
    const r = extrudeEdges(k, [e]);
    eq(r.sides.length, 1); eq(r.newVerts.size, 2); eq(k.faceCount(), 2);
    assert(opposite(k, f0, r.sides[0], 0, 1), "共用边 0-1 两边走向相反");
    eq(k.check().join("\n"), "");
  });
  it("相连的两条边一起挤：共用的端点只复制一次", () => {
    const k = quad(), r = extrudeEdges(k, [k.edgeOf(0, 1), k.edgeOf(1, 2)]);
    eq(r.newVerts.size, 3); eq(r.sides.length, 2); eq(k.check().join("\n"), "");
  });
  it("点挤出：新点 + 一条裸线", () => {
    const k = quad(), r = extrudeVerts(k, [2]);
    const n = r.newVerts.get(2)!, e = k.edgeOf(2, n);
    assert(e >= 0 && (k.edgeFlags[e] & F_WIRE) !== 0, "裸线"); eq(k.check().join("\n"), "");
  });
  it("extrudeAndOffset：面优先；新点整体平移；克隆上跑两遍 = 同一批 id（重放确定）", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const top = k.faces().find((f) => k.faceVerts(f).every((v) => k.pt(v).z === 1))!;
    const a = k.clone(), b = k.clone();
    const ra = extrudeAndOffset(a, { faces: [top], edges: [0] }, P(0, 0, 0.5)), rb = extrudeAndOffset(b, { faces: [top] }, P(0, 0, 0.5));
    eq(JSON.stringify([...ra.newVerts]), JSON.stringify([...rb.newVerts]));
    eq(a.faceCount(), 10); eq(a.vertexCount(), 12);
    assert(a.faceVerts(top).every((v) => a.pt(v).z === 1.5), "顶面上去了");
    eq(a.check().join("\n"), "");
  });
});

describe("挤出边 / 点默认垂直（user 10-27「默认垂直」）", () => {
  const box = (): MeshKernel => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); return k; };
  const vAt = (k: MeshKernel, x: number, y: number, z: number): number => k.verts().find((v) => { const p = k.pt(v); return p.x === x && p.y === y && p.z === z; })!;
  it("盒子顶面前沿那条边：两侧 +Z 和 −Y → (0, −1, 1)/√2；挤出后两个新点都沿它走", () => {
    const k = box(), e = k.edgeOf(vAt(k, 0, 0, 1), vAt(k, 1, 0, 1)), d = extrudeNormalDirs(k, { edges: [e] });
    for (const n of d.values()) { eq(+n.x.toFixed(6), 0); eq(+(n.y + n.z).toFixed(6), 0); assert(n.z > 0.7, `${JSON.stringify(n)}`); }
    const r = extrudeAlongNormals(k, { edges: [e] }, Math.SQRT2);
    for (const [src, nv] of r.newVerts) { const a = k.pt(src), b = k.pt(nv); eq([b.x - a.x, b.y - a.y, b.z - a.z].map((x) => +x.toFixed(6)).join(","), "0,-1,1"); }
    eq(k.check().join("\n"), "");
  });
  it("角点：三张面 +X −Y +Z → (1, −1, 1)/√3；孤立的点 = +Z", () => {
    const k = box(), c = vAt(k, 1, 0, 1), n = extrudeNormalDirs(k, { verts: [c] }).get(c)!;
    eq([n.x, n.y, n.z].map((x) => +(x * Math.sqrt(3)).toFixed(6)).join(","), "1,-1,1");
    const lone = k.addVertex(P(5, 5, 5)); eq(JSON.stringify(extrudeNormalDirs(k, { verts: [lone] }).get(lone)), JSON.stringify(P(0, 0, 1)));
  });
});

describe("拉：meshExtrude op + 撤销", () => {
  it("op 只认网格体；提交 = 一步、撤 / 重做逐字；全量重放同结果", () => {
    const s0 = new Scene(sceneBox()), d = s0.mintDef("盒", sceneBox());
    s0.mintInstance(s0.root, null, d.id, IDENTITY);
    const s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene, h = new History(s), m = s.mesh(d.id).kernel;
    const top = m.faces().find((f) => m.faceVerts(f).every((v) => Math.abs(m.pt(v).z - Math.max(...m.verts().map((x) => m.pt(x).z))) < 1e-9))!;
    const canon = (): string => JSON.stringify({ v: m.verts().map((v) => [v, m.pt(v)]), f: m.faces().map((f) => m.faceVerts(f)) });
    const c0 = canon(), f0 = m.faceCount();
    h.commit(s, { op: "meshExtrude", def: d.id, faces: [top], offset: P(0, 0, 1) });
    eq(m.faceCount(), f0 + 4); const c1 = canon();
    h.undo(); eq(canon(), c0); h.redo(s); eq(canon(), c1);
    eq(JSON.stringify(h.replay().mesh(d.id).kernel.faces().map((f) => h.replay().mesh(d.id).kernel.faceVerts(f))), JSON.stringify(m.faces().map((f) => m.faceVerts(f))));
    let threw = ""; try { applyOp(s, { op: "meshExtrude", def: s.root, faces: [0], offset: P(0, 0, 1) }); } catch (e) { threw = (e as Error).name; }
    eq(threw, "OpTargetError");
  });
  it("along（边 / 点垂直）走 op 也一样：重放同结果", () => {
    const s0 = new Scene(sceneBox()), d = s0.mintDef("盒", sceneBox());
    s0.mintInstance(s0.root, null, d.id, IDENTITY);
    const s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene, h = new History(s), m = s.mesh(d.id).kernel;
    h.commit(s, { op: "meshExtrude", def: d.id, edges: [m.edges()[0]], along: 0.3 });
    eq(m.check().join("\n"), ""); eq(JSON.stringify(h.replay().mesh(d.id).kernel.verts().map((v) => h.replay().mesh(d.id).kernel.pt(v))), JSON.stringify(m.verts().map((v) => m.pt(v))));
  });
});
