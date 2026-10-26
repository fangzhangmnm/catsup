// 实例 id 读写（2026-10-25 Opus 修：读文件时 id 有空缺 → 多一份重复实例，存一次读一次就重复）。created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { translation } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } from "../src/format/index.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const at = (s: Scene) => ({ def: s.root, group: null });
const list = (s: Scene): string => [...s.def(s.root).instances.entries()].map(([k, i]) => `${k}:${i.id}@${i.xform[3]}`).join(" ");
const roundtrip = (s: Scene): Scene => sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));

describe("实例 id 读写", () => {
  it("删过一份（id 有空缺）→ 存了再读：实例份数和 id 不变、不多出重复", () => {
    let s = new Scene(sceneBox(1, 1));
    const k = s.kernelOf(at(s));
    s = applyOp(s, { op: "makeComponent", at: at(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "块" }).scene;
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    for (const x of [3, 6]) s = applyOp(s, { op: "placeInstance", at: at(s), definition: defId, xform: translation(P(x, 0, 0)) }).scene;
    s = applyOp(s, { op: "eraseInstance", def: s.root, instance: [...s.def(s.root).instances.values()][1].id }).scene;
    eq(list(roundtrip(s)), list(s));
    eq(list(roundtrip(roundtrip(s))), list(s), "再来一轮也不变");
  });
  it("已经重复过的文件（同一个 id 写了两次）读进来 = 合回一份", () => {
    let s = new Scene(sceneBox(1, 1));
    const k = s.kernelOf(at(s));
    s = applyOp(s, { op: "makeComponent", at: at(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "块" }).scene;
    const doc = documentFromScene(s, "t");
    const d0 = doc.definitions[0];
    d0.instances.push({ ...d0.instances[0] });   // 模拟老版本读写留下的重复
    const back = sceneFromDocument(readCatsup(writeCatsup(doc)));
    eq(back.def(back.root).instances.size, 1, "合回一份");
  });
});
