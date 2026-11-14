// 「把画拿掉」= 只换材质（第 1 版施工单第五节 2½ 第三稿，user 11-13 夜「原则上现在不用丢 UV」；created 2026-11-13 by Claude Opus 5.5，同日照第三稿重写）：
// 拿掉之后贴图坐标一样不动（速查表、面的代号、角上的数逐个相等）；这个物体不再被画拦（拦只问「有没有面在显示画」）；转硬表面走得通、询问里列了贴图坐标；
// 炸开进网格体 / 分出去之后搬过去的面贴图坐标还在；把那张画的材质涂回这些面 = 画原样回来；撤销一步画回来；拷散面时提示行说贴图坐标没带上。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { mintGuid } from "../src/format/guid.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";
import { meshBodyIssues, paintMoveBlocked, paintUvOf } from "../src/scene/paint.ts";
import { paintIn } from "../src/format/document.ts";
import { uvAt, uvDocOf, uvSetOfFace } from "../src/scene/uv.ts";
import { dropPaint, paintedFaces } from "../src/editor/mesh-edits/drop-paint.ts";
import { toBrep } from "../src/editor/objects/index.ts";
import { extractForCopy, transferSay } from "../src/editor/transfer.ts";
import type { CommandEnv, MeshUnit, ObjectUnit } from "../src/editor/commands/command.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const ROOT = (s: Scene) => ({ def: s.root, group: null });
/** 一个画过的网格体（摆在根上一份）+ 它的 History。rootMesh = 根也是网格体（炸开进网格体用）。 */
function painted(rootMesh = false): { s: Scene; h: History; def: number; inst: number; tex: string; uv: string } {
  let s = new Scene(sceneBox(1, 1));
  if (rootMesh) s = applyOp(s, { op: "castDefinition", def: s.root, to: "mesh" }).scene;
  const d = s.mintDef("网格", sceneBox()), inst = s.mintInstance(s.root, null, d.id, IDENTITY);
  s = applyOp(s, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
  const m = new MeshKernel(); addBox(m, P(5, 0, 0), P(7, 1, 1)); s.mesh(d.id).kernel = m;
  const h = new History(s), tex = mintGuid(), uv = mintGuid();
  s = h.commit(s, { op: "startPaint", def: d.id, faces: s.mesh(d.id).kernel.faces(), uvSet: uv, textureGuid: tex, materialGuid: mintGuid(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.5, 0.5, 0.5] }, false).scene;
  return { s, h, def: d.id, inst: inst.id, tex, uv };
}
const drop = (s: Scene, def: number): Op[] => dropPaint.plan({ scene: s } as unknown as CommandEnv, { def, sel: null } as unknown as MeshUnit, {}).ops;
/** 一张面的贴图坐标签名：每个角「位置 | 那一套的 GUID | 角上的数」，角排过序（和面从哪个角起头无关）。 */
function faceUvSigs(s: Scene, def: number): string[] {
  const b = s.mesh(def), k = b.kernel;
  return k.faces().map((f) => {
    const g = uvSetOfFace(k, b.uvSetSlots, f), at = g ? uvAt(k, b.uvSetSlots, f, g) : null, ring = k.faceVerts(f);
    return ring.map((v, i) => { const p = k.pt(v); return `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}|${g ?? "-"}|${at ? `${at[2 * i]},${at[2 * i + 1]}` : "-"}`; }).sort().join(";");
  }).sort();
}

describe("把画拿掉 = 只换材质（第五节 2½ 第三稿）", () => {
  it("拿掉之后：面换回默认材质；贴图坐标一样不动（速查表、面的代号、角上的数）；画、材质、排法那一行留在文件里", () => {
    let { s, h, def, tex, uv } = painted();
    const b0 = s.mesh(def), slots0 = [...b0.uvSetSlots], doc0 = JSON.stringify(uvDocOf(b0.kernel, b0.uvSetSlots)), sigs0 = faceUvSigs(s, def), mats0 = [...b0.materialSlots];
    for (const op of drop(s, def)) s = h.commit(s, op, false).scene;
    eq(paintedFaces(s, def).length, 0, "没有面走画了");
    const b = s.mesh(def);
    eq(JSON.stringify(b.uvSetSlots), JSON.stringify(slots0), "速查表不动");
    eq(JSON.stringify(uvDocOf(b.kernel, b.uvSetSlots)), doc0, "面的代号、角上的数不动（文件形状逐个相等）");
    eq(faceUvSigs(s, def).join("\n"), sigs0.join("\n"), "每张面在那一套上的位置不动");
    eq(JSON.stringify(b.materialSlots), JSON.stringify(mats0), "材质槽表不动（只换面上的槽号）");
    assert(s.textures.has(tex) && s.uvSets.has(uv) && s.materials.some((m) => paintIn(s.textures, m)), "画、材质、排法那一行还在文件里");
    eq(meshBodyIssues(s, def).length, 0, "自检没毛病");
  });
  it("提示行：只说「还在文件里」（涂回去在界面上选不到画的材质，后半句不说）", () => {
    const said = dropPaint.done(6, 0, {});
    assert(/6 张面换回默认材质/.test(said) && /画和贴图坐标都还在文件里/.test(said) && !/涂回去/.test(said), said);
  });
  it("不被画拦：paintMoveBlocked = null；转硬表面 / 炸开 / 分出去 / 做成唯一都走得通", () => {
    let { s, h, def, inst } = painted();
    assert(paintMoveBlocked(s, { def }) !== null, "画过 = 拦（前提）");
    for (const op of drop(s, def)) s = h.commit(s, op, false).scene;
    eq(paintMoveBlocked(s, { def }), null, "整个物体放行");
    eq(paintMoveBlocked(s, { def, faces: s.mesh(def).kernel.faces() }), null, "一摞面放行");
    const faces = s.mesh(def).kernel.faces().slice(0, 2);
    const tries: [string, Op][] = [["转硬表面", { op: "castDefinition", def, to: "brep" }], ["炸开（转成硬表面再炸）", { op: "explode", at: ROOT(s), instance: inst, cast: true }], ["分出去", { op: "separateObject", at: ROOT(s), instance: inst, def, faces, name: "分" }], ["做成唯一", { op: "makeUnique", def: s.root, instance: inst }]];
    for (const [what, op] of tries) { let msg = ""; try { applyOp(s.clone(), op); } catch (e) { msg = String(e); } eq(msg, "", `${what}走得通`); }
  });
  it("转硬表面：询问里列了贴图坐标那一套；转过去走得通", () => {
    let { s, h, def, inst } = painted();
    for (const op of drop(s, def)) s = h.commit(s, op, false).scene;
    const u = { def, name: "网格", instance: inst, copies: 1, body: "mesh" } as unknown as ObjectUnit;
    const ask = toBrep.ask!({ scene: s, sharpDeg: () => 20 } as unknown as CommandEnv, [u], {});
    assert(!!ask && /贴图坐标的表 1 套/.test(ask.message), `询问：${ask?.message}`);
    const t = applyOp(s.clone(), { op: "castDefinition", def, to: "brep" }).scene;
    eq(t.kindOf(def), "brep");
  });
  it("网格体之间搬面贴图坐标跟着走：炸开进网格体 / 分出去之后，搬过去的面在那一套上的位置一个不变", () => {
    let { s, h, def, inst } = painted(true);
    for (const op of drop(s, def)) s = h.commit(s, op, false).scene;
    const sigs = faceUvSigs(s, def);
    // 炸开进网格体（根是网格体，摆放是 IDENTITY：位置不变）
    const e = applyOp(s.clone(), { op: "explode", at: ROOT(s), instance: inst }).scene, rootSigs = new Set(faceUvSigs(e, e.root));
    assert(sigs.every((g) => rootSigs.has(g)), "炸开：每张搬过去的面在那一套上的位置一样");
    eq(meshBodyIssues(e, e.root).length, 0, "炸开之后自检没毛病");
    // 分出去
    const k = s.mesh(def).kernel, faces = k.faces().slice(0, 3);
    const sp = applyOp(s.clone(), { op: "separateObject", at: ROOT(s), instance: inst, def, faces, name: "分" }).scene, nd = [...sp.defs.values()].find((d) => d.name === "分")!.id;
    const nSigs = faceUvSigs(sp, nd);
    eq(nSigs.length, 3); assert(nSigs.every((g) => sigs.includes(g)), "分出去：搬过去的三张面在那一套上的位置一样");
    eq(meshBodyIssues(sp, nd).length, 0, "分出去之后自检没毛病");
  });
  it("把画的材质涂回这些面 = 画原样回来（指令层）；撤销一步也回来", () => {
    let { s, h, def } = painted();
    const n0 = paintedFaces(s, def).length, sigs0 = faceUvSigs(s, def);
    for (const op of drop(s, def)) s = h.commit(s, op, false).scene;
    const paintMat = s.materials.findIndex((m) => paintIn(s.textures, m));
    const back = applyOp(s.clone(), { op: "meshPaintFaces", def, faces: s.mesh(def).kernel.faces(), material: paintMat }).scene;
    eq(paintedFaces(back, def).length, n0, "涂回去：面又走画");
    assert(back.mesh(def).kernel.faces().every((f) => paintUvOf(back, def, f) !== null), "每张面都在那一套上");
    eq(faceUvSigs(back, def).join("\n"), sigs0.join("\n"), "位置原样（角上的数没动过）");
    s = h.undo()!.scene;
    eq(paintedFaces(s, def).length, n0, "撤销：面又走画");
    assert(paintMoveBlocked(s, { def }) !== null, "撤销：又被画拦");
  });
  it("拷散面：剪贴板不带角上的数 → 提示行说几张面的贴图坐标没带上；拷整个物体不说（定义按文件形状带着）", () => {
    let { s, h, def, inst } = painted();
    for (const op of drop(s, def)) s = h.commit(s, op, false).scene;
    const faces = s.mesh(def).kernel.faces();
    const loose = extractForCopy(s, { chain: [inst], group: null }, { faces: faces.slice(0, 2), edges: [] }, []);
    assert(!!loose && !("blocked" in loose), "拷散面走得通");
    assert(/其中 2 张面的贴图坐标没带上/.test(transferSay(loose as Parameters<typeof transferSay>[0])), transferSay(loose as Parameters<typeof transferSay>[0]));
    const whole = extractForCopy(s, { chain: [], group: null }, { faces: [], edges: [] }, [{ kind: "instance", instance: inst }]);
    assert(!!whole && !("blocked" in whole) && !/贴图坐标/.test(transferSay(whole as Parameters<typeof transferSay>[0])), "拷整个物体：不说");
  });
});
