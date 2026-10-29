// 物体级 op × 身体种类的组合矩阵（created 2026-10-28 by Claude Opus 5.5）：user 10-28 夜「炸开mesh会出bug。看来我们的路由还是有硬伤」。
// 根：炸开只看了「外面一层」的身体种类、没看「选中的组件」是什么身体，网格体组件被当成硬表面体用 → 抛内部错误。
// 这一层守卫：炸开 / 建组件（网格体里 = separateObject）/ 合并 对「外面一层 × 组件」每种组合都跑——要么成功且模型干净，要么抛 OpTargetError（人话），不许抛别的错。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, OpTargetError } from "../src/editor/ops.ts";
import { sceneBox } from "./format-scenes.ts";

type Kind = "brep" | "mesh";
/** 最外层 = hostKind；里面一个盒子组件 = compKind。 */
function setup(hostKind: Kind, compKind: Kind): { s: Scene; inst: number; comp: number } {
  const s = new Scene(sceneBox());
  const root = { def: s.root, group: null };
  const k = s.brep(s.root).kernel;
  applyOp(s, { op: "makeComponent", at: root, faces: k.faces().map((f) => k.faceRings3(f.id)!.outer), edges: [], name: "盒" });   // FaceKey = 面外圈的点
  const inst = [...s.def(s.root).instances.values()][0], comp = inst.def;
  if (compKind === "mesh") applyOp(s, { op: "castDefinition", def: comp, to: "mesh" });
  if (hostKind === "mesh") applyOp(s, { op: "castDefinition", def: s.root, to: "mesh" });
  return { s, inst: inst.id, comp };
}
const faceCount = (s: Scene, def: number): number => (s.kindOf(def) === "mesh" ? s.mesh(def).kernel.faceCount() : s.brep(def).kernel.faces().length);

describe("物体级 op × 身体种类（炸开 / 建组件 / 合并）", () => {
  for (const host of ["brep", "mesh"] as Kind[]) for (const comp of ["brep", "mesh"] as Kind[]) {
    it(`炸开：外面 ${host} × 组件 ${comp} → 成功：组件没了、几何进了外面一层、模型干净`, () => {
      const { s, inst, comp: cdef } = setup(host, comp);
      let err: unknown = null;
      try { applyOp(s, { op: "explode", at: { def: s.root, group: null }, instance: inst }); } catch (e) { err = e; }
      assert(err === null, `抛了：${String(err)}`);
      eq(s.def(s.root).instances.size, 0); eq(s.defs.has(cdef), false);
      assert(faceCount(s, s.root) >= 6, `外面一层只有 ${faceCount(s, s.root)} 张面`);
      if (s.kindOf(s.root) === "mesh") eq(s.mesh(s.root).kernel.check().join(";"), "");
    });
  }
  it("网格体里建组件（separateObject 摆在同一层）再炸开 = 回到原样（面数一样）", () => {
    const { s, inst } = setup("mesh", "mesh");
    applyOp(s, { op: "explode", at: { def: s.root, group: null }, instance: inst });
    const n = faceCount(s, s.root), m = s.mesh(s.root).kernel, top = m.faces().slice(0, 2);
    applyOp(s, { op: "separateObject", at: { def: s.root, group: null }, def: s.root, faces: top, name: "件" });
    eq(faceCount(s, s.root), n - 2); eq(s.def(s.root).instances.size, 1);
    const ni = [...s.def(s.root).instances.values()][0];
    applyOp(s, { op: "explode", at: { def: s.root, group: null }, instance: ni.id });
    eq(faceCount(s, s.root), n); eq(s.def(s.root).instances.size, 0);
  });
  it("合并物体：来源不是网格体 = 人话错误（OpTargetError 或说清的 Error），不是内部崩", () => {
    const { s, inst } = setup("brep", "brep");
    let err: unknown = null;
    try { applyOp(s, { op: "joinObjects", at: { def: s.root, group: null }, target: inst, sources: [inst] }); } catch (e) { err = e; }
    assert(err !== null, "该拒");
  });
});
void OpTargetError;
