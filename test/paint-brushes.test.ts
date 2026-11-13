// 画画工作台：每支笔的旋钮 + 换笔 + 跟文件走（app/paint-brushes.ts；施工单二十 1b）。不开浏览器：真的工具配置表 + 假的「报一声」。created 2026-11-12 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";
import { ToolConfig, TOOL_OPTIONS } from "../src/editor/tool-config.ts";
import { createPaintBrushes } from "../src/app/paint-brushes.ts";
import type { PaintDeskDoc } from "../src/format/document.ts";

const mk = () => {
  const cfg = new ToolConfig(TOOL_OPTIONS);
  let changes = 0;
  const pb = createPaintBrushes(cfg, () => { changes++; });
  cfg.subscribe((tool) => pb.onConfig(tool));
  const knobs = (t: "paintPen" | "paintEraser" = "paintPen") => ["size", "opacity", "hardness"].map((k) => cfg.get(t, k as "size")).join(" / ");
  return { cfg, pb, knobs, changes: () => changes };
};
const desk = (p: Partial<PaintDeskDoc>): PaintDeskDoc => ({ brushes: {}, active: {}, extra: {}, ...p });

describe("每支笔的旋钮 + 换笔（施工单二十 1b）", () => {
  it("出厂：笔 = 草稿笔 6 / 1 / 0.75（user 11-13「默认草稿笔」；以前是平涂）、橡皮 24 / 1 / 0.8（和以前的工具配置一样）", () => {
    const { pb, knobs } = mk(); pb.apply(null);
    eq(pb.current("paintPen"), "sketch"); eq(pb.current("paintEraser"), "eraser"); eq(pb.current("eyedrop"), null);
    eq(knobs(), "6 / 1 / 0.75"); eq(knobs("paintEraser"), "24 / 1 / 0.8");
  });
  it("出厂值只在笔的记录里说一处：工具配置表还没套笔之前的值 = 默认那支笔的初值（统筹 11-13：以前另写 12 / 0.8，从来用不到）", () => {
    const { cfg, knobs } = mk(); cfg.reset("paintPen"); cfg.reset("paintEraser");
    eq(knobs(), "6 / 1 / 0.75"); eq(knobs("paintEraser"), "24 / 1 / 0.8");
  });
  it("换笔：手上的旋钮存回原来那支、套上新那支的初值；换回来各是各的（出厂草稿笔 → 平涂 50 / 1 / 0.9 → 回草稿笔）", () => {
    const { cfg, pb, knobs } = mk(); pb.apply(null);
    cfg.set("paintPen", "size", 30); cfg.set("paintPen", "opacity", 0.6);
    cfg.set("paintPen", "brush", "pen");
    eq(pb.current("paintPen"), "pen"); eq(knobs(), "50 / 1 / 0.9");
    cfg.set("paintPen", "size", 40);
    cfg.set("paintPen", "brush", "sketch"); eq(knobs(), "30 / 0.6 / 0.75", "草稿笔的旋钮回来了"); eq(pb.sizeMax("paintPen"), 80);
    cfg.set("paintPen", "brush", "pen"); eq(knobs(), "40 / 1 / 0.9", "平涂的也还在");
  });
  it("大小不超过这支笔的上限：直接 set 到 300 夹回 80；换到上限小的笔时带过去的也夹", () => {
    const { cfg, pb } = mk(); pb.apply(null);
    cfg.set("paintPen", "brush", "ink"); cfg.set("paintPen", "size", 300);
    eq(cfg.get("paintPen", "size"), 60, "勾线笔上限 60");
    pb.apply(desk({ brushes: { sketch: { size: 1e9, extra: {} } }, active: { brush: "sketch" } }));
    eq(cfg.get("paintPen", "size"), 80, "文件里写了离谱的大小 = 夹到这支笔的上限");
  });
  it("跟文件走：apply 套上每支笔的旋钮和每把工具拿的哪支；toDesk 写回碰过的笔 + 两把工具现在拿的", () => {
    const { cfg, pb, knobs } = mk();
    pb.apply(desk({ brushes: { pen: { size: 20, opacity: 0.5, extra: {} }, ink: { size: 9, hardness: 0.3, extra: { future: 1 } } }, active: { brush: "ink", eraser: "eraser" } }));
    eq(pb.current("paintPen"), "ink"); eq(knobs(), "9 / 1 / 0.3", "没写的浓度 = 初值");
    cfg.set("paintPen", "brush", "pen"); eq(knobs(), "20 / 0.5 / 0.9", "普通笔：写了的照写、没写的硬度 = 初值");
    const d = pb.toDesk(null);
    eq(JSON.stringify(Object.keys(d.brushes).sort()), JSON.stringify(["eraser", "ink", "pen"]), "碰过的：文件里有的两支 + 两把工具手上的（没碰过的草稿笔不写）");
    eq(d.active.brush, "pen"); eq(d.active.eraser, "eraser");
    eq(d.brushes.ink.size, 9); eq(d.brushes.ink.hardness, 0.3);
  });
  it("本版没有的笔、active 里本版没有的 tool / 指着本版没有的笔：原样带回；拿的 = 默认那支", () => {
    const { pb, knobs } = mk();
    const prev = desk({ brushes: { wash: { size: 4, extra: { flow: 0.3 } }, pen: { size: 15, extra: { grain: 0.7 } } }, active: { brush: "wash", fill: "fill-face" } });
    pb.apply(prev);
    eq(pb.current("paintPen"), "sketch", "active 指着本版没有的笔 = 默认那支（11-13 起草稿笔）"); eq(knobs(), "6 / 1 / 0.75");
    const d = pb.toDesk(prev);
    eq(JSON.stringify(d.brushes.wash), JSON.stringify({ size: 4, extra: { flow: 0.3 } }), "本版没有的笔原样");
    eq(JSON.stringify(d.brushes.pen.extra), JSON.stringify({ grain: 0.7 }), "这支笔里不认识的键留着");
    eq(d.active.fill, "fill-face", "本版没有的 tool 原样"); eq(d.active.brush, "sketch", "认识的 tool 写现在拿的");
  });
  it("apply 的过程中不报；换笔 / 改旋钮各报一声（main.ts 收到才写回桌面态）", () => {
    const { cfg, pb, changes } = mk();
    pb.apply(desk({ active: { brush: "sketch" } })); eq(changes(), 0, "套的时候不报");
    cfg.set("paintPen", "brush", "pen"); eq(changes(), 1, "换笔报一声（不是每个旋钮报一声）");
    cfg.set("paintEraser", "opacity", 0.5); eq(changes(), 2);
    cfg.set("select", "mode", "multi"); eq(changes(), 2, "别的工具的设置不报");
    assert(true);
  });
});
