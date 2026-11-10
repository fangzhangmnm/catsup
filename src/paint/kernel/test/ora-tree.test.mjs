// ORA 嵌套组序列化（batch 2 step 3）：buildStackXml ↔ parseStackXml 树往返 + id + active。
// 纯 XML 字符串往返（无 canvas / 无 PNG）。node 无 DOMParser → 极简 XML parser polyfill
// （C7 抽共享 test/xml-shim.mjs——weebpaint-backend round-trip 同用）。
// C3：fixture 从旧 PaintDoc 迁 OraDoc 鸭形直构（buildStackXml 的输入契约就是纯结构 duck——
//   生产侧 ora.ts encode 喂的也是 exportData 冻结鸭形，不再有类依赖）。
import { describe, it, assert, eq } from "./runner.mjs";

import { FakeDOMParser } from "./xml-shim.mjs";

const _prevDP = globalThis.DOMParser;
globalThis.DOMParser = FakeDOMParser;
const { buildStackXml, parseStackXml } = await import("../src/backend/ora-stack-xml.ts");
globalThis.DOMParser = _prevDP;

const useStub = () => { globalThis.DOMParser = FakeDOMParser; };
const T = (name, fn) => it(name, () => { useStub(); fn(); });

// ---- OraDoc 鸭形构造（纯结构，零像素零类）----
let _nextId = 1;
const mkLeaf = (over = {}) => ({
  isGroup: false, id: _nextId++, name: `图层`, visible: true, opacity: 1, mode: "source-over",
  clippingMask: false, lockAlpha: false, bboxX: 0, bboxY: 0, ...over,
});
const mkGroup = (children, over = {}) => ({
  isGroup: true, id: _nextId++, name: "组", visible: true, opacity: 1, mode: "pass-through",
  clippingMask: false, children, ...over,
});
const mkD = (layers, over = {}) => ({ width: 2048, height: 2048, activeId: null, referenceLayerId: null, layers, ...over });

// 构造：[L0, G{ L1, L1b }, L2]，active=L1，ref=L2。L0 内容 bbox=(5,7)（驱动 ORA x/y 偏移）。
function buildTreeDoc() {
  const L0 = mkLeaf({ bboxX: 5, bboxY: 7 });
  const L1 = mkLeaf({ lockAlpha: true });
  const L1b = mkLeaf({ clippingMask: true });
  const L2 = mkLeaf();
  const G = mkGroup([L1, L1b], { opacity: 0.5, mode: "multiply", name: "组A" });
  const d = mkD([L0, G, L2], { activeId: L1.id, referenceLayerId: L2.id });
  return { d, L0, L1, L1b, L2, G };
}

describe("ora-tree · 嵌套组 XML 往返", () => {
  T("结构 / id / 组属性 / active / clip / lockAlpha / reference 全保真", () => {
    const { d, L0, L1, L1b, L2, G } = buildTreeDoc();
    const xml = buildStackXml(d);
    const { w, h, nodes } = parseStackXml(xml);
    eq(w, d.width, "w"); eq(h, d.height, "h");
    eq(nodes.length, 3, "根 3 节点（bottom-first）");

    // [0] = L0 叶
    eq(nodes[0].isGroup, false, "n0 叶");
    eq(nodes[0].id, L0.id, "n0 id");
    eq(nodes[0].x, 5, "n0 x"); eq(nodes[0].y, 7, "n0 y");

    // [1] = 组 G
    const g = nodes[1];
    eq(g.isGroup, true, "n1 组");
    eq(g.id, G.id, "组 id");
    eq(g.name, "组A", "组名");
    assert(Math.abs(g.opacity - 0.5) < 1e-4, "组 opacity");
    eq(g.mode, "multiply", "组 mode");
    eq(g.children.length, 2, "组 2 子（bottom-first）");
    eq(g.children[0].id, L1.id, "子[0]=L1");
    eq(g.children[0].lockAlpha, true, "L1 lockAlpha");
    eq(g.children[0].isActive, true, "L1 active");
    eq(g.children[1].id, L1b.id, "子[1]=L1b");
    eq(g.children[1].clippingMask, true, "L1b clip");

    // [2] = L2 叶（reference）
    eq(nodes[2].id, L2.id, "n2 id");
    eq(nodes[2].isReference, true, "L2 reference");

    // active 唯一：只有 L1
    let activeCount = 0;
    const walk = (ns) => ns.forEach((x) => { if (x.isActive) activeCount++; if (x.isGroup) walk(x.children); });
    walk(nodes);
    eq(activeCount, 1, "active 标记唯一");
  });

  T("空组往返：<stack></stack> → children []", () => {
    const d = mkD([mkGroup([])]);
    const xml = buildStackXml(d);
    const { nodes } = parseStackXml(xml);
    eq(nodes.length, 1, "根 1 节点");
    eq(nodes[0].isGroup, true, "是组");
    eq(nodes[0].children.length, 0, "空组 children=[]");
  });
});

describe("ora-tree · 向后兼容（旧扁平 .ora）", () => {
  T("无 weebpaint:id / 无 active → id null、active 全 false、扁平解析", () => {
    const oldXml = `<?xml version="1.0" encoding="UTF-8"?>
<image version="0.0.3" w="800" h="600">
  <stack name="root">
    <layer name="上" src="data/layer2.png" x="0" y="0" opacity="1.0000" visibility="visible" composite-op="svg:src-over" />
    <layer name="下" src="data/layer1.png" x="3" y="4" opacity="0.8000" visibility="hidden" composite-op="svg:multiply" />
  </stack>
</image>`;
    const { w, h, nodes } = parseStackXml(oldXml);
    eq(w, 800, "w"); eq(h, 600, "h");
    eq(nodes.length, 2, "2 叶扁平");
    // bottom-first：XML top="上"(layer2) → 反转后 [下, 上]
    eq(nodes[0].name, "下", "n0=下");
    eq(nodes[0].id, null, "无 id → null");
    eq(nodes[0].visible, false, "下 hidden");
    eq(nodes[0].mode, "multiply", "下 multiply");
    eq(nodes[1].name, "上", "n1=上");
    eq(nodes[1].isActive, false, "无 active 标记");
    eq(parseStackXml(oldXml).formatVersion, 0, "无 format 戳（存量）→ 0");
  });

  T("改名双读：旧 webpaint:* 属性全保读（0.10.0 新写旧读，user 拍板）", () => {
    // 改名前（≤v0.9.x）写出的 stack.xml：xmlns/属性全是旧前缀 webpaint:
    const oldXml = `<?xml version="1.0" encoding="UTF-8"?>
<image version="0.0.3" w="100" h="80" xmlns:webpaint="https://github.com/fangzhangmnm/webpaint/ns" webpaint:wrote-with="v0.9.35-2026-08-20">
  <stack name="root">
    <layer name="ref" src="data/layer3.png" x="0" y="0" opacity="1.0000" visibility="visible" composite-op="svg:src-over" webpaint:id="3" webpaint:reference="true" />
    <layer name="clip" src="data/layer2.png" x="1" y="2" opacity="1.0000" visibility="visible" composite-op="svg:src-over" webpaint:id="2" webpaint:clipping="true" webpaint:active="true" />
    <layer name="lock" src="data/layer1.png" x="0" y="0" opacity="1.0000" visibility="visible" composite-op="svg:src-over" webpaint:id="1" webpaint:lock-alpha="true" />
  </stack>
</image>`;
    const { nodes, wroteWith, formatVersion } = parseStackXml(oldXml);
    eq(wroteWith, "v0.9.35-2026-08-20", "旧 wrote-with 保读");
    eq(formatVersion, 0, "旧文件无 format → 0");
    // bottom-first：[lock, clip, ref]
    eq(nodes[0].id, 1, "旧 webpaint:id 保读");
    eq(nodes[0].lockAlpha, true, "旧 lock-alpha 保读");
    eq(nodes[1].clippingMask, true, "旧 clipping 保读");
    eq(nodes[1].isActive, true, "旧 active 保读");
    eq(nodes[2].isReference, true, "旧 reference 保读");
  });

  T("新写端：weebpaint:* + format 戳（不再写旧前缀）", async () => {
    const { ORA_FORMAT_VERSION } = await import("../src/backend/ora-stack-xml.ts");
    const { d } = buildTreeDoc();
    const xml = buildStackXml(d, "v0.10.0-test");
    assert(!xml.includes("webpaint:"), "写端零旧前缀（拼写一致性红线）");
    assert(xml.includes(`weebpaint:format="${ORA_FORMAT_VERSION}"`), "format 戳在场");
    eq(parseStackXml(xml).formatVersion, ORA_FORMAT_VERSION, "format 往返");
  });
});

describe("ora-tree · 组隔离 ↔ ORA 标准 isolation（v278 穿透）", () => {
  T("穿透→isolation=auto；正常(隔离)→isolation=isolate；混合模式→composite-op", () => {
    const G = mkGroup([mkLeaf()]);            // 默认 pass-through（v2 组默认穿透，锚在 layer-tree-json）
    const d = mkD([mkLeaf(), G]);

    let xml = buildStackXml(d);
    assert(/isolation="auto"/.test(xml), "穿透写 isolation=auto");
    assert(/composite-op="svg:src-over"/.test(xml), "穿透 composite-op=src-over");
    eq(parseStackXml(xml).nodes[1].mode, "pass-through", "读回穿透");

    G.mode = "source-over";                   // 正常 = 隔离
    xml = buildStackXml(d);
    assert(/isolation="isolate"/.test(xml), "正常写 isolation=isolate");
    eq(parseStackXml(xml).nodes[1].mode, "source-over", "读回正常(隔离)");

    G.mode = "multiply";
    xml = buildStackXml(d);
    assert(/composite-op="svg:multiply"/.test(xml), "混合模式写 composite-op");
    eq(parseStackXml(xml).nodes[1].mode, "multiply", "读回 multiply");
  });

  T("互通：外部 ORA（无 isolation 属性）→ 按 baseline 缺省 auto = 穿透", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<image version="0.0.3" w="100" h="100">
  <stack name="root">
    <stack name="组" opacity="1.0000" visibility="visible" composite-op="svg:src-over">
      <layer name="里" src="data/layer1.png" x="0" y="0" opacity="1.0000" visibility="visible" composite-op="svg:src-over" />
    </stack>
  </stack>
</image>`;
    const { nodes } = parseStackXml(xml);
    eq(nodes.length, 1, "1 组");
    eq(nodes[0].isGroup, true, "是组");
    eq(nodes[0].mode, "pass-through", "src-over + 无 isolation → 穿透（baseline 缺省 auto）");
  });
});
