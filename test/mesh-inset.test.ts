// 插入（自由建模；2026-10-27 Claude Opus 5.5）：面各自往里插一圈（等宽）、超过上限按上限、check 干净、op + 撤销往返。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, insetFaces, maxInset } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY } from "../src/scene/xform.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const topOf = (k: MeshKernel): number => k.faces().find((f) => k.faceVerts(f).every((v) => k.pt(v).z === 1))!;

describe("插入（insetFaces）", () => {
  it("盒子顶面插 0.1：里面一张 0.8 × 0.8、外面一圈四张四边形、都在顶面平面上、check 干净", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const top = topOf(k);
    insetFaces(k, [top], 0.1);
    eq(k.faceCount(), 10); eq(k.vertexCount(), 12);
    const inner = k.faceVerts(top).map((v) => k.pt(v));
    eq(inner.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`).sort().join(" "), ["0.100000,0.100000,1.000000", "0.100000,0.900000,1.000000", "0.900000,0.100000,1.000000", "0.900000,0.900000,1.000000"].join(" "));
    eq(k.check().join("\n"), "");
  });
  it("超过上限按上限（形心到边 × 0.98）：不自交", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const top = topOf(k), cap = maxInset(k.faceVerts(top).map((v) => k.pt(v)), k.faceNormal(top));
    assert(Math.abs(cap - 0.49) < 1e-9, `上限 ${cap}`);
    insetFaces(k, [top], 5);
    const xs = k.faceVerts(top).map((v) => k.pt(v).x);
    assert(Math.max(...xs) - Math.min(...xs) > 0, "没塌成一个点"); eq(k.check().join("\n"), "");
  });
  it("meshInset op + 撤销：一步、逐字回去、重放同结果", () => {
    const s0 = new Scene(sceneBox()), d = s0.mintDef("盒", sceneBox()); s0.mintInstance(s0.root, null, d.id, IDENTITY);
    const s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene, h = new History(s), m = s.mesh(d.id).kernel;
    const canon = (): string => JSON.stringify({ v: m.verts().map((v) => [v, m.pt(v)]), f: m.faces().map((f) => m.faceVerts(f)) });
    const c0 = canon();
    h.commit(s, { op: "meshInset", def: d.id, faces: [m.faces()[0]], dist: 0.05 });
    eq(m.faceCount(), 10); const c1 = canon();
    h.undo(); eq(canon(), c0); h.redo(s); eq(canon(), c1);
  });
});
