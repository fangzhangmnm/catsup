// stack.xml 上的未知属性 / 未知子元素（2026-10-21 对抗性审计第 1 条，Claude Fable 5.1）：
//   更新版本若往 <layer> / <stack> / <image> 上加属性或子元素，本版读 → 写一次会不会丢？
//   答案（本测试钉住）：**会丢**——parseStackXml 只读已知属性，buildStackXml 只写已知属性，没有直通袋。
//   这正是「较新 app 写的画 → 说一次 + 覆盖前确认」那一层（session-state）存在的理由：格式拍子只兜 JSON 顶层键和 .weebpaint/ 未知 entry，
//   兜不住 stack.xml 内部；所以同 major 内**不准**往 stack.xml 加新东西（规矩写在 migrate.ts 头与 ora-stack-xml.ts 头），
//   要加就放 .weebpaint/ 新 entry（那里直通）或 bump major。要是哪天做了 stack.xml 直通，把下面的「丢」改成「在」。
import { describe, it, assert, eq } from "./runner.mjs";
import { installDomParserShim } from "./xml-shim.mjs";
installDomParserShim();
const { buildStackXml, parseStackXml } = await import("../src/backend/ora-stack-xml.ts");

const FUTURE = `<?xml version="1.0" encoding="UTF-8"?>
<image version="0.0.3" w="4" h="4" xres="72" yres="72" xmlns:weebpaint="https://github.com/fangzhangmnm/weebpaint/ns" weebpaint:format="3" weebpaint:format-minor="1" weebpaint:format-patch="0" weebpaint:wrote-with="v9.9.9-future" weebpaint:future-image-flag="yes">
  <stack name="root" weebpaint:future-stack-flag="1">
    <layer name="L" src="data/layer1.png" x="0" y="0" opacity="1" visibility="visible" composite-op="svg:src-over" weebpaint:id="1" weebpaint:active="true" weebpaint:future-layer-flag="glow"><weebpaint:future-child a="b"/></layer>
  </stack>
  <weebpaint:future-sibling/>
</image>`;

describe("stack.xml · 未知属性 / 子元素读 → 写（钉住现状：丢；靠 app 版本号那层兜）", () => {
  it("已知属性全在；未知的属性与子元素读一次写一次就没了", () => {
    const p = parseStackXml(FUTURE);
    eq(p.formatStamp.minor, 1); eq(p.wroteWith, "v9.9.9-future");
    eq(p.nodes.length, 1); eq(p.nodes[0].name, "L"); eq(p.nodes[0].id, 1);
    const doc = { width: 4, height: 4, activeId: 1, referenceLayerId: null,
      layers: [{ id: 1, name: "L", visible: true, opacity: 1, mode: "source-over", clippingMask: false, isGroup: false, bboxX: 0, bboxY: 0, lockAlpha: false }] };
    const out = buildStackXml(doc, "v-test");
    for (const lost of ["future-image-flag", "future-stack-flag", "future-layer-flag", "future-child", "future-sibling"]) {
      assert(!out.includes(lost), `${lost} 居然还在——做了 stack.xml 直通？把本测试和 migrate.ts 头的规矩一起改`);
    }
    assert(out.includes('weebpaint:id="1"') && out.includes('weebpaint:active="true"'), "已知属性照写");
  });
});
