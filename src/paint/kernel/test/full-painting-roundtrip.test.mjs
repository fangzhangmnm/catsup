// C8 ⑤ 全量层 · 全量画作 round-trip（只在 test:full 注册——快层 npm test 不吃这份钱）：
// 结构丰富的画作（多叶+嵌套组+层属性全谱+多笔画+erase+filter+负向扩张 crop）走
// encodeOra → open → encodeOra **逐字节相同**（决定论 encode：1980 epoch zip + 无时钟无随机全链），
// 且两代 backend 的 exportImage 合成逐字节相同（SoftGl2 软合成域）。
import { describe, it, assert, eq } from "./runner.mjs";

const { WeebPaintBackend } = await import("../src/backend/weebpaint-backend.ts");
const { SoftGl2Port } = await import("../src/backend/soft-gl2-port.ts");
const { GlRoom, poolCapacityForBudget } = await import("../src/backend/gl/gl-room.ts");
const { RasterService } = await import("../src/backend/gl/raster-service.ts");

const bytesEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// SoftGl2 全域注入（stroke 栅格 + mergedimage/export 合成同一软域——MCP server 同款）
function mkInject() {
  const port = new SoftGl2Port();
  const raster = new RasterService(new GlRoom(port, poolCapacityForBudget(256 * 1024 * 1024)));
  return { appVersion: "v0.0.0-full", gl: port, compositorBytes: (n, w, h) => raster.compositeToBytes(n, w, h) };
}

const pts = (n, x0, y0, dx, dy, p = 0.8) => {
  const a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { a[i*4] = x0 + i*dx; a[i*4+1] = y0 + i*dy; a[i*4+2] = p; a[i*4+3] = i * 16; }
  return a;
};
function stroke(be, leafId, brush, points) {
  const id = be.strokeBegin(leafId, brush);
  be.strokeAppend(id, points);
  return be.strokeEnd(id);
}

// 结构丰富的确定性画作：4 叶 + 1 组（2 叶入组）+ 属性全谱 + 6 笔 + erase + 2 filter + 负向扩张 crop
function buildRichPainting() {
  const be = WeebPaintBackend.blank({ width: 640, height: 480 }, mkInject());
  const L2 = be.layerAdd("线稿").id, L3 = be.layerAdd("上色").id, L4 = be.layerAdd("特效").id;
  // 属性全谱（mode/opacity/clippingMask/lockAlpha/visible/name——stack.xml 全字段过一遍）
  be.layerSetProp(L2, "opacity", 0.85);
  be.layerSetProp(L3, "mode", "multiply");
  be.layerSetProp(L3, "clippingMask", true);
  be.layerSetProp(L4, "visible", false);
  be.layerSetProp(L4, "name", "隐藏特效层");
  // 嵌套组：addGroup + 两叶入组（tree verb 走 withPoint 令牌——组件 verb 纪律）
  const g = be.layersFace.addGroup("组A");
  assert(g.ok, "addGroup ok");
  const rIn = be.history.withPoint("test:intoGroup", {}, () => {
    assert(be.wp2.layerTree.moveIntoGroup(L3, g.groupId), "L3 入组");
    assert(be.wp2.layerTree.moveIntoGroup(L4, g.groupId), "L4 入组");
  });
  assert(rIn.ok, "入组事务 ok");
  // 多笔多层（不同笔参吃不同管线路径）
  be.layerSetActive(1);
  assert(stroke(be, 1, { size: 40, color: "#c03030", opacity: 1, streamline: 0.3, pressureLPF: 40 }, pts(12, 60, 60, 40, 24)));
  assert(stroke(be, L2, { size: 16, color: "#203050", opacity: 0.9, pixelMode: true }, pts(10, 100, 300, 30, -16)));
  assert(stroke(be, L3, { size: 60, color: "#e0a020", opacity: 0.7, streamline: 0 }, pts(8, 200, 100, 30, 30)));
  assert(stroke(be, L4, { size: 24, color: "#40a080", opacity: 1 }, pts(6, 300, 200, 20, 10)));
  assert(stroke(be, 1, { size: 30, mode: "erase", opacity: 1 }, pts(6, 120, 80, 30, 20)), "erase 笔");
  be.layerSetProp(L2, "lockAlpha", true);   // 先画后锁（锁 alpha 的空层落不了笔——行为正确，剧本得按真实工作流来）
  // filter：hsb（per-pixel）+ stainedGlass（non-local + 确定性 hash）
  const f1 = be.filterBegin(1, "hsb");
  be.filterSetParams(f1, { brightness: 12, saturation: 20 });
  assert(be.filterCommit(f1));
  const f2 = be.filterBegin(L3, "stainedGlass");
  be.filterSetParams(f2, { cellSize: 24, leadWidth: 1 });
  assert(be.filterCommit(f2));
  // 负向扩张 crop（v127 语义：x 负 + w 超原尺寸）
  assert(be.crop(-32, 16, 700, 420).ok, "负向扩张 crop");
  return be;
}

describe("full · 全量画作 round-trip（决定论 encode）", () => {
  it("encodeOra → open → encodeOra 逐字节；两代 exportImage 逐字节；层树/docInfo 投影相同", async () => {
    const be1 = buildRichPainting();
    const ora1 = await be1.encodeOra();
    assert(ora1.length > 10000, `全量画作有分量（${ora1.length} 字节）`);
    const { backend: be2, sidecar } = await WeebPaintBackend.open(ora1, mkInject());
    eq(sidecar.wroteWith, "v0.0.0-full", "wrote-with 戳 round-trip");
    const ora2 = await be2.encodeOra();
    assert(bytesEq(ora1, ora2), "encodeOra 两代逐字节相同（1980 epoch zip + 决定论全链）");
    eq(JSON.stringify(be2.layerTree()), JSON.stringify(be1.layerTree()), "层树投影相同（嵌套组/属性全谱）");
    eq(JSON.stringify(be2.docInfo()), JSON.stringify(be1.docInfo()), "docInfo 相同（bg 字段已全量删除——ORA 对齐拍板）");
    const png1 = await be1.exportImage("png");
    const png2 = await be2.exportImage("png");
    assert(bytesEq(png1, png2), "两代 exportImage 合成逐字节相同（SoftGl2 软合成域）");
    be1.dispose(); be2.dispose();
  });

  it("同一构建脚本两次 → ora 逐字节相同（构建路径决定论，ADR-0009 全链）", async () => {
    const a = buildRichPainting(), b = buildRichPainting();
    const oa = await a.encodeOra(), ob = await b.encodeOra();
    assert(bytesEq(oa, ob), "同脚本 → 同字节");
    a.dispose(); b.dispose();
  });
});
