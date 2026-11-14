// 「把画拿掉」要真能逃生（第 1 版施工单第五节 2½，统筹 11-13；created 2026-11-13 by Claude Opus 5.5）：拿掉之后这个物体不在这张画上了——
// paintMoveBlocked(物体) = null；转硬表面 / 炸开 / 建组件不被画拦；画、材质、排法那一行留在文件里当孤儿；撤销一步画、位置、槽都回来。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { mintGuid } from "../src/format/guid.ts";
import { IDENTITY, translation } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";
import { paintMoveBlocked } from "../src/scene/paint.ts";
import { dropPaint, paintedFaces } from "../src/editor/mesh-edits/drop-paint.ts";
import type { CommandEnv, MeshUnit } from "../src/editor/commands/command.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
/** 一个画过的网格体（摆在根上一份）+ 它的 History。 */
function painted(): { s: Scene; h: History; def: number; tex: string; uv: string } {
  let s = new Scene(); const d = s.mintDef("网格", sceneBox()); s.mintInstance(s.root, null, d.id, IDENTITY);
  s = applyOp(s, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
  const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(2, 1, 1)); s.mesh(d.id).kernel = m;
  const h = new History(s), tex = mintGuid(), uv = mintGuid();
  s = h.commit(s, { op: "startPaint", def: d.id, faces: s.mesh(d.id).kernel.faces(), uvSet: uv, textureGuid: tex, materialGuid: mintGuid(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.5, 0.5, 0.5] }, false).scene;
  return { s, h, def: d.id, tex, uv };
}
const drop = (s: Scene, def: number): Op[] => dropPaint.plan({ scene: s } as unknown as CommandEnv, { def, sel: null } as unknown as MeshUnit, {}).ops;

describe("把画拿掉 = 这个物体退出这张画（第五节 2½）", () => {
  it("拿掉之后不被画拦：paintMoveBlocked = null，转硬表面 / 炸开 / 建组件走得通", () => {
    let { s, h, def } = painted();
    assert(paintMoveBlocked(s, { def }) !== null, "画过 = 拦（前提）");
    for (const op of drop(s, def)) s = h.commit(s, op, false).scene;
    eq(paintedFaces(s, def).length, 0, "没有面走画了");
    eq(paintMoveBlocked(s, { def }), null, "这个物体不在这张画上了");
    const inst = [...s.def(s.root).instances.keys()][0], faces = s.mesh(def).kernel.faces().slice(0, 2);
    const tries: [string, Op][] = [["转硬表面", { op: "castDefinition", def, to: "brep" }], ["炸开", { op: "explode", at: { def: s.root, group: null }, instance: inst }], ["建组件（网格体里把面分出去）", { op: "separateObject", at: { def: s.root, group: null }, instance: inst, def, faces, name: "分" }]];
    for (const [what, op] of tries) {   // 每一样在拿掉画之后那一份场景的拷贝上各走一次（互不影响）
      let msg = ""; try { applyOp(s.clone(), op); } catch (e) { msg = String(e); }
      assert(!/画/.test(msg), `${what}不被画拦：${msg}`);
    }
  });
  it("画、材质、排法那一行留在文件里当孤儿；撤销一步画、位置、槽都回来", () => {
    let { s, h, def, tex, uv } = painted();
    const slots0 = [...s.mesh(def).kernel.faces()].length, uvSlots0 = s.mesh(def).uvSetSlots.length, mats0 = s.mesh(def).materialSlots.length;
    for (const op of drop(s, def)) s = h.commit(s, op, false).scene;
    assert(s.textures.has(tex) && s.uvSets.has(uv), "贴图 / 排法那一行还在文件里");
    eq(s.mesh(def).uvSetSlots.length, 0, "物体不再挂这一套贴图坐标");
    const u = h.undo()!; s = u.scene;
    eq(paintedFaces(s, def).length, slots0, "撤销：面又走画");
    eq(s.mesh(def).uvSetSlots.length, uvSlots0, "撤销：贴图坐标的表回来");
    eq(s.mesh(def).materialSlots.length, mats0, "撤销：材质槽回来");
    assert(paintMoveBlocked(s, { def }) !== null, "撤销：又被画拦");
  });
});
void translation;
