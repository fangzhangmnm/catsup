// gl-doc-bridge 纯翻译测试（docTreeToComp + safeMode）。像素路径（uploadLayerToTiles）由 smoke 验。
import { describe, it, assert } from "./runner.mjs";
import { safeMode } from "../src/backend/gl/gl-doc-bridge.ts";
import { docTreeToComp } from "./gl-smoke/reference-gl-compositor.ts";

const FAKE_INDEX = { _fake: true };
const resourceFor = (leaf) => ({ index: FAKE_INDEX, hasContent: leaf.bboxW > 0 });
const leaf = (o = {}) => ({ isGroup: false, id: 1, opacity: 1, mode: "source-over", clippingMask: false, visible: true, bboxX: 0, bboxY: 0, bboxW: 10, bboxH: 10, canvas: null, ...o });
const group = (o = {}) => ({ isGroup: true, id: 2, opacity: 1, mode: "pass-through", clippingMask: false, visible: true, children: [], ...o });

describe("gl-doc-bridge · safeMode", () => {
  it("12 可分离模式原样保留", () => {
    for (const m of ["source-over", "multiply", "screen", "overlay", "color-dodge", "exclusion"]) {
      assert(safeMode(m) === m, `${m} 保留`);
    }
  });
  it("未知 / 非可分离模式 → source-over（与 2D 回退一致）", () => {
    assert(safeMode("hue") === "source-over", "hue→source-over");
    assert(safeMode("luminosity") === "source-over", "luminosity→source-over");
    assert(safeMode("pass-through") === "source-over", "pass-through 非叶模式→source-over");
    assert(safeMode("bogus") === "source-over", "未知→source-over");
  });
});

describe("gl-doc-bridge · docTreeToComp", () => {
  it("叶字段映射（mode/opacity/clip/visible/hasContent）", () => {
    const out = docTreeToComp([leaf({ opacity: 0.5, mode: "multiply", clippingMask: true, visible: false })], resourceFor);
    const n = out[0];
    assert(n.kind === "leaf", "叶");
    assert(n.opacity === 0.5 && n.mode === "multiply" && n.clip === true && n.visible === false, "字段");
    assert(n.srcIndex === FAKE_INDEX && n.hasContent === true, "资源接入");
  });
  it("空 bbox 叶 hasContent=false", () => {
    const out = docTreeToComp([leaf({ bboxW: 0 })], resourceFor);
    assert(out[0].hasContent === false, "空层无内容");
  });
  it("组 pass-through 模式保留", () => {
    const out = docTreeToComp([group({ mode: "pass-through" })], resourceFor);
    assert(out[0].kind === "group" && out[0].mode === "pass-through", "穿透保留");
  });
  it("组非穿透模式经 safeMode", () => {
    assert(docTreeToComp([group({ mode: "multiply" })], resourceFor)[0].mode === "multiply", "组 multiply");
    assert(docTreeToComp([group({ mode: "weird" })], resourceFor)[0].mode === "source-over", "组未知→source-over");
  });
  it("嵌套树递归翻译", () => {
    const tree = [leaf(), group({ children: [leaf({ id: 3 }), group({ id: 4, children: [leaf({ id: 5 })] })] })];
    const out = docTreeToComp(tree, resourceFor);
    assert(out.length === 2 && out[1].kind === "group", "顶层");
    assert(out[1].children.length === 2 && out[1].children[1].kind === "group", "嵌套组");
    assert(out[1].children[1].children[0].kind === "leaf", "深叶");
  });
});
