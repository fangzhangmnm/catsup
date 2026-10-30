// 物件级 op × 身体种类的组合矩阵（created 2026-10-28 by Claude Opus 5.5）：user 10-28 夜「炸开mesh会出bug。看来我们的路由还是有硬伤」。
// 根：炸开只看了「外面一层」的身体种类、没看「选中的组件」是什么身体，网格体组件被当成硬表面体用 → 抛内部错误。
// 这一层守卫：炸开 / 建组件（网格体里 = separateObject）/ 合并 对「外面一层 × 组件」每种组合都跑——要么成功且模型干净，要么抛 OpTargetError（人话），不许抛别的错。
// 2026-10-30 Opus 5.5：「组件没了」改成「这一份没了、定义照留」（user「为什么删实例会有删组件定义的风险？这个风险就不应该有」；以前这里钉的是删定义）。
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

describe("物件级 op × 身体种类（炸开 / 建组件 / 合并）", () => {
  for (const host of ["brep", "mesh"] as Kind[]) for (const comp of ["brep", "mesh"] as Kind[]) {
    it(`炸开：外面 ${host} × 组件 ${comp} → ${host === comp ? "直接成功" : "不带 cast = 人话拒绝（不静默转种类）；带 cast = 成功"}：组件没了、几何进了外面一层、模型干净`, () => {
      const { s, inst, comp: cdef } = setup(host, comp);
      let err: unknown = null;
      if (host !== comp) { try { applyOp(s, { op: "explode", at: { def: s.root, group: null }, instance: inst }); } catch (e) { err = e; } assert(err instanceof OpTargetError, `跨种类不带 cast 该人话拒绝，得到：${String(err)}`); err = null; }
      try { applyOp(s, { op: "explode", at: { def: s.root, group: null }, instance: inst, ...(host !== comp ? { cast: true } : {}) }); } catch (e) { err = e; }
      assert(err === null, `抛了：${String(err)}`);
      eq(s.def(s.root).instances.size, 0); eq(s.defs.has(cdef), true, "定义照留（孤儿森林；2026-10-30 起炸开不再删定义）");
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
  for (const comp of ["brep", "mesh"] as Kind[]) it(`做成唯一（${comp}）：两份同定义 → 一份换新定义，几何一样、另一份不动`, () => {
    const { s, inst, comp: cdef } = setup("brep", comp);
    const i0 = s.def(s.root).instances.get(inst)!;
    applyOp(s, { op: "placeInstance", at: { def: s.root, group: null }, definition: cdef, xform: [1, 0, 0, 5, 0, 1, 0, 0, 0, 0, 1, 0] });
    applyOp(s, { op: "makeUnique", def: s.root, instance: inst });
    const nd = s.def(s.root).instances.get(inst)!.def;
    assert(nd !== cdef, "没换定义"); eq(faceCount(s, nd), faceCount(s, cdef)); eq(s.instanceCount(cdef), 1); eq(s.instanceCount(nd), 1);
    void i0;
  });
  // user 10-30「选择多个组件（没有几何）的时候应该也可以打包成一个新组件」：两种外层都能把几份组件装进一个新组件，世界里的点一个不动
  for (const host of ["brep", "mesh"] as Kind[]) it(`只选组件建组件：外面 ${host} → 两份装进一个新组件（身体 = ${host}，进去还是同一个工作台）、世界里的点不动、原来那层只剩新的一份`, () => {
    const { s, comp } = setup("brep", "brep");
    const root = { def: s.root, group: null };
    applyOp(s, { op: "placeInstance", at: root, definition: comp, xform: [1, 0, 0, 5, 0, 1, 0, 2, 0, 0, 1, 0] });   // 摆第二份（placeInstance 只认硬表面那一层），再转外层
    if (host === "mesh") applyOp(s, { op: "castDefinition", def: s.root, to: "mesh" });
    const pts = (): string => s.pointsOfDef(s.root).map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`).sort().join(";");
    const before = pts(), ids = [...s.def(s.root).instances.keys()];
    applyOp(s, { op: "makeComponent", at: root, faces: [], edges: [], name: "wheel", instances: ids });
    const top = [...s.def(s.root).instances.values()];
    eq(top.length, 1); const nd = top[0].def;
    eq(s.def(nd).name, "wheel"); eq(s.kindOf(nd), host); eq(s.def(nd).instances.size, 2);
    assert([...s.def(nd).instances.values()].every((i) => i.def === comp), "装进去的还是原来那个组件定义（没复制）");
    eq(pts(), before, "世界里的点一个不动");
  });
});
void OpTargetError;
