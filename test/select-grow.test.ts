// 扩 / 缩选区（mesh/select-grow.ts；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「select按第二次的的gizmos」）。
import { describe, it, eq } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { growSelection, shrinkSelection, stepSelection } from "../src/mesh/select-grow.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const box = () => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); return k; };
const top = (k: MeshKernel) => k.faces().find((f) => k.faceVerts(f).every((v) => k.pt(v).z === 1))!;
const S = (o: { verts?: number[]; edges?: number[]; faces?: number[] }) => ({ verts: new Set(o.verts ?? []), edges: new Set(o.edges ?? []), faces: new Set(o.faces ?? []) });

describe("扩 / 缩选区（select-grow.ts）", () => {
  it("面：顶面扩一圈 = 共点的五张（底面不共点）；再扩 = 六张；缩回去 = 只剩顶面", () => {
    const k = box(), t = top(k);
    eq(growSelection(k, S({ faces: [t] })).faces.size, 5);
    eq(stepSelection(k, S({ faces: [t] }), 2).faces.size, 6);
    eq([...stepSelection(k, S({ faces: [t] }), 1).faces].length, 5);
    eq([...shrinkSelection(k, growSelection(k, S({ faces: [t] }))).faces].join(","), String(t));
  });
  it("点：扩一圈 = 自己 + 沿边连着的三个；全选着的缩不动；单个点缩 = 没了", () => {
    const k = box(), v = k.verts()[0];
    eq(growSelection(k, S({ verts: [v] })).verts.size, 4);
    eq(shrinkSelection(k, S({ verts: k.verts() })).verts.size, 8);
    eq(shrinkSelection(k, S({ verts: [v] })).verts.size, 0);
  });
});
