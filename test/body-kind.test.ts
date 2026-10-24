// 门 1（0.13 刀 ①）：definition = 对象层，body = 内容层（brep | card）。brep 身体默认；card 身体没有内核 → kernelOf / 内核 op 拒；
// WorldView 跳过非 brep；文件：缺省 brep、brep 不写 kind（golden 字节不变）、未知 / 未支持的 kind 拒开说清。created 2026-10-24 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { Scene, isBodyKind, BODY_KINDS } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { ROOT_CONTEXT } from "../src/scene/scene.ts";
import { applyOp, OpTargetError } from "../src/editor/ops.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } from "../src/format/index.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { sceneBox } from "./format-scenes.ts";

describe("body kind: 对象层 / 内容层", () => {
  it("mintDef 默认 brep 身体；kindOf / brep() 取得到；BODY_KINDS 三个成员（brep / card / mesh）", () => {
    const s = new Scene(sceneBox());
    eq(s.kindOf(s.root), "brep");
    eq(s.brep(s.root).kernel.faces().length, 6);
    eq(BODY_KINDS.length, 3); assert(isBodyKind("brep") && isBodyKind("card") && isBodyKind("mesh") && !isBodyKind("nurbs"));
  });
  it("card 身体：没有内核（kernelOf 抛）、内核 op 拒（OpTargetError）、hasPool 对根成立对 group 不成立、WorldView 跳过它、clone 保留 kind", () => {
    const s = new Scene(sceneBox());
    const card = s.mintDef("猫娘", new Kernel());
    card.body = { kind: "card" };
    s.mintInstance(s.root, null, card.id, [1, 0, 0, 0, 1, 0, 0, 0, 1, 3, 0, 0]);
    eq(s.kindOf(card.id), "card");
    let threw = false; try { s.kernelOf({ def: card.id, group: null }); } catch { threw = true; } assert(threw, "kernelOf 该抛");
    threw = false; try { applyOp(s, { op: "addEdges", at: { def: card.id, group: null }, segs: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]] }); } catch (e) { threw = e instanceof OpTargetError; } assert(threw, "内核 op 该被 OpTargetError 拒");
    assert(s.hasPool({ def: card.id, group: null }) && !s.hasPool({ def: card.id, group: 1 }));
    const view = new WorldView(s, ROOT_CONTEXT);
    eq(view.slots.length, 1, "只有根 brep 池进槽");
    const c = s.clone();
    eq(c.kindOf(card.id), "card"); eq(c.brep(c.root).kernel.faces().length, 6);
  });
});

describe("body kind: 文件", () => {
  it("brep 不写 kind（字节与之前一样）；读回缺省 brep", () => {
    const doc = documentFromScene(new Scene(sceneBox()), "t");
    const bytes = writeCatsup(doc);
    const { json } = decodeGlb(bytes) as { json: { extensions: { CATSUP_definitions: { list: Record<string, unknown>[] } } } };
    assert(json.extensions.CATSUP_definitions.list.every((d) => !("kind" in d)), "brep 定义不写 kind");
    const back = readCatsup(bytes);
    eq(back.root.kind, "brep");
    eq(sceneFromDocument(back).kindOf(sceneFromDocument(back).root), "brep");
  });
  it("文件里 kind 不是 brep（这一版不认）→ 拒开，错误说清是哪个定义", () => {
    const doc = documentFromScene(new Scene(sceneBox()), "t");
    const bytes = writeCatsup(doc);
    const g = decodeGlb(bytes) as { json: { extensions: { CATSUP_definitions: { list: Record<string, unknown>[] } } }; bin: Uint8Array };
    g.json.extensions.CATSUP_definitions.list[0].kind = "card";
    const bytes2 = encodeGlb(g.json as unknown as Record<string, unknown>, g.bin);
    let msg = ""; try { readCatsup(bytes2); } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    assert(/kind "card" is not supported/.test(msg), `该拒开并说清：${msg}`);
  });
});
