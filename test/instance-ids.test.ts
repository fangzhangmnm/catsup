// 实例读写（2026-10-25 Opus 修：读文件时 id 有空缺 → 多一份重复实例，存一次读一次就重复）。created 2026-10-25 by Claude Opus 5.5
// 2026-11-04 身份地基：文件里没有实例 id 了，身份 = GUID、句柄读的时候现发；老文件留下的重复由迁移合回（migrate/definitions.ts）。
import { describe, it, eq } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { translation } from "../src/scene/xform.ts";
import { downgradeDefinitionsToV6, sceneBox } from "./format-scenes.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument, decodeGlb } from "../src/format/index.ts";
import { encodeGlb } from "../src/format/glb.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const at = (s: Scene) => ({ def: s.root, group: null });
const list = (s: Scene): string => [...s.def(s.root).instances.values()].map((i) => `${i.guid}@${i.xform[3]}`).join(" ");
const roundtrip = (s: Scene): Scene => sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));

describe("实例读写", () => {
  it("删过一份 → 存了再读：实例份数、身份、顺序不变，不多出重复", () => {
    let s = new Scene(sceneBox(1, 1));
    const k = s.kernelOf(at(s));
    s = applyOp(s, { op: "makeComponent", at: at(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "块" }).scene;
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    for (const x of [3, 6]) s = applyOp(s, { op: "placeInstance", at: at(s), definition: defId, xform: translation(P(x, 0, 0)) }).scene;
    s = applyOp(s, { op: "eraseInstance", def: s.root, instance: [...s.def(s.root).instances.values()][1].id }).scene;
    eq(list(roundtrip(s)), list(s));
    eq(list(roundtrip(roundtrip(s))), list(s), "再来一轮也不变");
  });
  it("老文件（6.x）里同一个 id 写了两次：迁移时合回一份（位置留先写的、内容留后写的）", () => {
    let s = new Scene(sceneBox(1, 1));
    const k = s.kernelOf(at(s));
    s = applyOp(s, { op: "makeComponent", at: at(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "块" }).scene;
    const { json, bin } = decodeGlb(writeCatsup(documentFromScene(s, "t"))) as { json: Record<string, unknown>; bin: Uint8Array };
    downgradeDefinitionsToV6(json, (defs) => { const r = defs.list[defs.root]; r.instances.push({ ...r.instances[0], name: "后写的" }); });   // 模拟老版本读写留下的重复
    const back = sceneFromDocument(readCatsup(encodeGlb(json, bin)));
    eq(back.def(back.root).instances.size, 1, "合回一份");
    eq([...back.def(back.root).instances.values()][0].name, "后写的", "内容留后写的");
  });
});
