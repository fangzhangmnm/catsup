// 插入（自由建模；2026-10-27 Claude Opus 5.5）：面各自往里插一圈（等宽）、超过上限按上限、check 干净、op + 撤销往返。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, insetFaces, maxInset } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY, applyPt } from "../src/scene/xform.ts";
import { inset as insetCmd, originToSelection } from "../src/editor/mesh-edits/index.ts";
import type { CommandEnv, MeshUnit } from "../src/editor/commands/command.ts";

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
  it("右键「插入」= 指令 mesh.inset（不换工具；user 10-27「右键的插入，切环不应该切到工具里面」）：默认宽度 = 最小面上限的五分之一、op = meshInset、做完那几张面留在选区；没选面 = 不做", () => {
    const s0 = new Scene(sceneBox()), d = s0.mintDef("盒", sceneBox()); s0.mintInstance(s0.root, null, d.id, IDENTITY);
    const s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene, m = s.mesh(d.id).kernel, f = m.faces()[0];
    const env = { scene: s } as unknown as CommandEnv;
    const u: MeshUnit = { kind: "mesh", def: d.id, sel: { kind: "mesh", verts: new Set(), edges: new Set(), faces: new Set([f]) }, xf: IDENTITY };
    const v = insetCmd.defaults(env, [u]), want = Math.round(maxInset(m.facePts(f), m.faceNormal(f)) * 0.2 * 1000) / 1000;
    eq(v.dist, want);
    const r = insetCmd.plan(env, u, v);
    eq(r.ops.length, 1); eq(r.ops[0].op, "meshInset"); eq(JSON.stringify(r.select), JSON.stringify({ faces: [f] }));
    eq(insetCmd.plan(env, { ...u, sel: { kind: "mesh", verts: new Set(), edges: new Set(), faces: new Set() } }, v).ops.length, 0);
  });
  it("设置原点到选择中心（mesh.originToSelection）：一条 setAxes；世界里不动、原点到了选区点的平均；撤销 = 几何和实例都回去", () => {
    const s0 = new Scene(sceneBox()), d = s0.mintDef("盒", sceneBox()); s0.mintInstance(s0.root, null, d.id, IDENTITY);
    const s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene, h = new History(s), m = s.mesh(d.id).kernel, f = m.faces()[0];
    const inst = [...s.def(s.root).instances.values()].find((i) => i.def === d.id)!;
    const world = (sc: Scene): string => { const i = sc.def(sc.root).instances.get(inst.id)!, k = sc.mesh(d.id).kernel; return k.verts().map((x) => { const p = applyPt(i.xform, k.pt(x)); return `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`; }).sort().join(" "); };
    const local = (sc: Scene): string => { const k = sc.mesh(d.id).kernel; return k.verts().map((x) => JSON.stringify(k.pt(x))).join(" "); };
    const w0 = world(s), l0 = local(s);
    let c = { x: 0, y: 0, z: 0 }; const ring = m.faceVerts(f); for (const x of ring) { const p = m.pt(x); c = { x: c.x + p.x / ring.length, y: c.y + p.y / ring.length, z: c.z + p.z / ring.length }; }
    const u: MeshUnit = { kind: "mesh", def: d.id, sel: { kind: "mesh", verts: new Set(), edges: new Set(), faces: new Set([f]) }, xf: IDENTITY };
    const r = originToSelection.plan({ scene: s } as unknown as CommandEnv, u, {});
    eq(r.ops.length, 1); eq(r.ops[0].op, "setAxes");
    const after = h.commit(s, r.ops[0]).scene;
    eq(world(after), w0, "世界里不动");
    const o = applyPt(after.def(after.root).instances.get(inst.id)!.xform, { x: 0, y: 0, z: 0 });
    assert(Math.hypot(o.x - c.x, o.y - c.y, o.z - c.z) < 1e-9, "原点 = 选中那张面的点的平均");
    const back = h.undo()!.scene;
    eq(world(back), w0, "撤销后世界里也不动"); eq(local(back), l0, "网格体自己的坐标回去了");
  });
});
