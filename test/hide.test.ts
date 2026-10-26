// 隐藏 / 全部显示（DT49，user 2026-10-25「然后 hide unhide all也马上需要了，这个gltf规范里有吗？」「嗯线和面也可以hidden，这样可以挖洞看里面」）：
// 组件 = 实例 hidden（藏父连子）；面 / 线 = 面层 / 边层 hidden；不画、不吸、点不中；存档 definitions 6.1 + glTF 节点 KHR_node_visibility。created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp } from "../src/editor/ops.ts";
import { sceneGrouped, sceneHidden } from "./format-scenes.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument, decodeGlb } from "../src/format/index.ts";

const counts = (s: Scene) => { const v = new WorldView(s, ROOT_CONTEXT); return { slots: v.slots.length, faces: v.faces().length, edges: v.edges().length }; };
const flags = (s: Scene) => {
  const k = s.kernelOf({ def: s.root, group: null });
  return { faces: k.faces().filter((f) => k.isFaceHidden(f.id)).length, edges: k.edges().filter((e) => k.isEdgeHidden(e.id)).length, insts: [...s.def(s.root).instances.values()].filter((i) => i.hidden).length };
};

describe("DT49 隐藏 / 全部显示", () => {
  it("藏一面墙 + 一条边 + 第二份圆柱：合成视图里都没了（不画、不吸、点不中），图里还在", () => {
    const plain = counts(sceneGrouped()), hid = counts(sceneHidden());
    eq(hid.slots, plain.slots - 1, "第二份圆柱整份不进来");
    assert(hid.faces < plain.faces - 1, "墙 + 第二份圆柱的面都少了");
    assert(hid.edges < plain.edges, "隐藏的边不列");
    eq(JSON.stringify(flags(sceneHidden())), JSON.stringify({ faces: 1, edges: 1, insts: 1 }));
  });
  it("存了再读：三种隐藏都还在；glb 里隐藏的节点带 KHR_node_visibility { visible: false }", () => {
    const bytes = writeCatsup(documentFromScene(sceneHidden(), "t"));
    const back = sceneFromDocument(readCatsup(bytes));
    eq(JSON.stringify(flags(back)), JSON.stringify({ faces: 1, edges: 1, insts: 1 }));
    const json = decodeGlb(bytes).json as { extensionsUsed: string[]; nodes: { extensions?: Record<string, { visible?: boolean }> }[] };
    assert(json.extensionsUsed.includes("KHR_node_visibility"), "extensionsUsed 列了");
    eq(json.nodes.filter((n) => n.extensions?.KHR_node_visibility?.visible === false).length, 1, "一个节点藏着");
    const plainJson = decodeGlb(writeCatsup(documentFromScene(sceneGrouped(), "t"))).json as { extensionsUsed: string[] };
    assert(!plainJson.extensionsUsed.includes("KHR_node_visibility"), "没隐藏就不列");
  });
  it("全部显示：一条 op 全放回来；撤销 = 回到藏着", () => {
    const s = applyOp(sceneHidden(), { op: "unhideAll" }).scene;
    eq(JSON.stringify(flags(s)), JSON.stringify({ faces: 0, edges: 0, insts: 0 }));
    eq(JSON.stringify(counts(s)), JSON.stringify(counts(sceneGrouped())));
  });
});
