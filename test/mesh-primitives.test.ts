// 右键新建的基本体（2026-10-27 Claude Opus 5.5；纪元账本 FM120）：封闭体面一律朝外、平面朝 +z、check 干净；原点：立方体 / 圆柱 / 圆锥 / 平面在底面中心、球在球心；
// addMeshObject op = 新的网格体组件（定义 + 一份实例），撤销回去。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addPrimitive, type PrimitiveKind } from "../src/mesh/ops/index.ts";
import { meshDocFromKernel } from "../src/mesh/mesh-doc.ts";
import { Scene } from "../src/scene/scene.ts";
import { History } from "../src/editor/history.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY, translation } from "../src/scene/xform.ts";

const F0 = { o: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } };
const build = (kind: PrimitiveKind, size: [number, number, number], seg = 12): MeshKernel => { const k = new MeshKernel(); addPrimitive(k, kind, F0, size, seg); return k; };
const outward = (k: MeshKernel, c: { x: number; y: number; z: number }): boolean => k.faces().every((f) => {
  const vs = k.faceVerts(f).map((v) => k.pt(v)), m = vs.reduce((a, p) => ({ x: a.x + p.x / vs.length, y: a.y + p.y / vs.length, z: a.z + p.z / vs.length }), { x: 0, y: 0, z: 0 }), n = k.faceNormal(f);
  return n.x * (m.x - c.x) + n.y * (m.y - c.y) + n.z * (m.z - c.z) > 0;
});

describe("右键新建的基本体", () => {
  it("立方体 / 圆柱 / 圆锥 / 球：封闭、面朝外、check 干净、欧拉 = 2", () => {
    const cases: [PrimitiveKind, [number, number, number], { x: number; y: number; z: number }][] = [
      ["box", [1, 1, 1], { x: 0, y: 0, z: 0.5 }], ["cylinder", [0.5, 0.5, 1], { x: 0, y: 0, z: 0.5 }], ["cone", [0.5, 0.5, 1], { x: 0, y: 0, z: 0.3 }], ["sphere", [0.5, 0.5, 0.5], { x: 0, y: 0, z: 0 }],
    ];
    for (const [kind, size, center] of cases) {
      const k = build(kind, size);
      eq(k.check().join("\n"), "", `${kind} check`);
      assert(outward(k, center), `${kind} 面朝外`);
      eq(JSON.stringify(k.eulerOfClosedManifoldComponents()), "[2]", `${kind} 欧拉`);
    }
  });
  it("原点：立方体 / 圆柱 / 圆锥底面在 z = 0、球心在原点（user「原点在底部中心……球的话还是圆点在原点」）", () => {
    for (const kind of ["box", "cylinder", "cone"] as const) { const k = build(kind, kind === "box" ? [1, 1, 1] : [0.5, 0.5, 1]); eq(Math.min(...k.verts().map((v) => k.pt(v).z)), 0, kind); }
    const s = build("sphere", [0.5, 0.5, 0.5]), zs = s.verts().map((v) => s.pt(v).z);
    eq(+(Math.min(...zs) + Math.max(...zs)).toFixed(9), 0);
    const p = build("plane", [1, 1, 0]); eq(p.faceCount(), 1); assert(p.faceNormal(p.faces()[0]).z > 0.99, "平面朝 +z");
  });
  it("addMeshObject：新定义（网格体）+ 一份实例摆在给的位置；撤销 = 都没了", () => {
    const s = new Scene(sceneBox()), h = new History(s), m = build("box", [1, 1, 1]);
    const n0 = s.defs.size, i0 = s.def(s.root).instances.size;
    h.commit(s, { op: "addMeshObject", at: { def: s.root, group: null }, name: "立方体", mesh: meshDocFromKernel(m), xform: translation({ x: 2, y: 0, z: 0 }) });
    eq(s.defs.size, n0 + 1); eq(s.def(s.root).instances.size, i0 + 1);
    const inst = [...s.def(s.root).instances.values()].pop()!;
    eq(s.kindOf(inst.def), "mesh"); eq(s.mesh(inst.def).kernel.faceCount(), 6); eq(inst.xform[3], 2);
    const u = h.undo()!; eq(u.scene.defs.size, n0); eq(u.scene.def(u.scene.root).instances.size, i0);
    void IDENTITY;
  });
});
