// 细分（Catmull-Clark，破坏性；2026-10-28 Claude Opus 5.5；纪元账本 FM133）。
// 标准答案：立方体（±1）细分一次 = 24 面 / 26 点 / 48 边、封闭、朝向一致；角点 → (5/9, 5/9, 5/9)（Catmull-Clark 的教科书值）；
// 全部边标成棱 = 形状不变（角不动、边直）；有裸线 = 拒；op + 撤销往返；右键指令的规划。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, F_SHARP } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { catmullClark, subdivide, looseBits } from "../src/mesh/ops/subdivide.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { subdivideCmd } from "../src/editor/mesh-edits/index.ts";
import type { CommandEnv, MeshUnit } from "../src/editor/commands/command.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const cube = (): MeshKernel => { const m = new MeshKernel(); addBox(m, P(-1, -1, -1), P(1, 1, 1)); return m; };
function closedConsistent(m: MeshKernel): number {
  let bad = 0;
  for (const e of m.edges()) { const fs = [...m.eFaces(e)]; if (fs.length !== 2) { bad++; continue; } const a = m.edgeA[e], b = m.edgeB[e]; const d = (f: number): number => { const r = m.faceVerts(f), i = r.indexOf(a); return r[(i + 1) % r.length] === b ? 1 : -1; }; if (d(fs[0]) === d(fs[1])) bad++; }
  return bad;
}
const outward = (m: MeshKernel): number => m.faces().filter((f) => { const n = m.faceNormal(f), g = m.facePts(f).reduce((s, p) => P(s.x + p.x, s.y + p.y, s.z + p.z), P(0, 0, 0)); return n.x * g.x + n.y * g.y + n.z * g.z <= 0; }).length;

describe("细分（Catmull-Clark）", () => {
  it("立方体一次：24 面 / 26 点 / 48 边；封闭、朝向一致、朝外；角点到 (5/9, 5/9, 5/9)", () => {
    const m = cube(); eq(catmullClark(m), 24);
    eq(m.faceCount(), 24); eq(m.vertexCount(), 26); eq(m.edgeCount(), 48);
    eq(closedConsistent(m), 0); eq(outward(m), 0); eq(m.check().join("\n"), "");
    const far = m.verts().map((v) => m.pt(v)).filter((p) => p.x > 0 && p.y > 0 && p.z > 0 && Math.abs(p.x - p.y) < 1e-12 && Math.abs(p.y - p.z) < 1e-12);
    eq(far.length, 1); assert(Math.abs(far[0].x - 5 / 9) < 1e-12, `${far[0].x}`);
  });
  it("全部边标成棱：形状不变（8 个角原地、所有点都在立方体表面上）", () => {
    const m = cube(); for (const e of m.edges()) m.setEdgeFlags(e, F_SHARP);
    subdivide(m, 2);
    eq(m.faceCount(), 96); eq(closedConsistent(m), 0);
    assert(m.verts().every((v) => { const p = m.pt(v); return Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) > 1 - 1e-12; }), "都在表面上");
    eq(m.verts().filter((v) => { const p = m.pt(v); return Math.abs(Math.abs(p.x) - 1) + Math.abs(Math.abs(p.y) - 1) + Math.abs(Math.abs(p.z) - 1) < 1e-12; }).length, 8);
    assert(m.edges().filter((e) => m.edgeFlags[e] & F_SHARP).length === 12 * 4, "原来 12 条棱各分成 4 段，都带着棱标");
  });
  it("有裸线 = 拒；数得出来", () => {
    const m = cube(); const a = m.addVertex(P(3, 0, 0)), b = m.addVertex(P(4, 0, 0)); m.ensureEdge(a, b);
    eq(looseBits(m) >= 1, true);
    let threw = false; try { catmullClark(m); } catch { threw = true; } assert(threw);
  });
  it("op meshSubdivide + 撤销逐字回去；右键指令：默认 1 次、数 = 细分后的面数、不是全部平滑时提示怎么变圆", () => {
    const s0 = new Scene(), d = s0.mintDef("块", sceneBox()); s0.mintInstance(s0.root, null, d.id, IDENTITY);
    const s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene, m = cube(); s.mesh(d.id).kernel = m;
    const canon = (): string => JSON.stringify({ v: m.verts().map((v) => [v, m.pt(v)]), f: m.faces().map((f) => m.faceVerts(f)) });
    const env = { scene: s } as unknown as CommandEnv, u: MeshUnit = { kind: "mesh", def: d.id, sel: null, xf: IDENTITY };
    const r = subdivideCmd.plan(env, u, subdivideCmd.defaults(env, [u]));
    eq(r.count, 24); eq(r.ops[0].op, "meshSubdivide"); assert((r.notes ?? []).some((t) => t.includes("全部平滑")));
    const h = new History(s), c0 = canon();
    h.commit(s, r.ops[0]); eq(m.faceCount(), 24); const c1 = canon();
    h.undo(); eq(canon(), c0); h.redo(s); eq(canon(), c1);
  });
});
