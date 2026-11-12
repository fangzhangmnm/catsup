// 笔的种类表 + 「宿主报的格对不对」的结构守卫（统筹 11-11）。created 2026-11-11 by Claude Opus 5.5
// ① 笔的种类表（src/paint/brush-kinds.ts）：每一种对一把画画工作台的工具；画的工具（除了吸管）每一把都有种类；画画工作台起笔只经 strokeKindOpts（不自己判「是不是橡皮」）。
// ② 探针按表跑：probe-live-region 的 BRUSH_MATRIX 里要有表里的每一种（漏了 = 红，照 mirror-ops 那张登记表的做法）；探针自己运行时再核一遍页面上的表。
// ③ 往脏格子位图里记东西只许在真正出 item / 真正画的那段（space-layer.ts update / resetFrozen），标的就是要画的那几个 item 的方框；
//    报给内核的 markChanged 只在 space-paint.ts（照 takeChanged 出来的行段报，或读数角标「强制整张」那一档报整张）。别处另算一份范围去报 = 红。
// 这些是结构守卫：改到这几段代码时守卫跟着红，逼着回来看一眼「报的还是不是真画的那些」。真报得对不对靠 probe-live-region（多笔种逐字节）和读数角标的「核对」。
import { describe, it, assert, eq } from "./runner.mjs";
import { BRUSH_KINDS, BRUSH_KIND_IDS, BRUSH_PATHS, brushKindOfTool, brushKindsOfTool, strokeKindOpts } from "../src/paint/brush-kinds.ts";
import { BRUSHES, resolvedBrushOf, strokeSmoothOf, brushUnusableWhy, SURFACE_HOST, pathKeyOf, DEFAULT_BRUSH, type BrushRecord, type HostCaps } from "../src/paint/brush-records.ts";
import { resolveSmooth } from "../src/paint/kernel/src/common/smooth-defaults.ts";
import { hookBrush } from "../src/paint/space-paint.ts";
import { PAINT_TOOLS } from "../src/editor/tool-ids.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };
const read = (p: string): string => fs.readFileSync(p, "utf8");
const walk = (dir: string, out: string[] = []): string[] => { for (const n of fs.readdirSync(dir)) { const p = `${dir}/${n}`; if (fs.statSync(p).isDirectory()) walk(p, out); else if (p.endsWith(".ts")) out.push(p); } return out; };
/** 一个方法的方法体（从「  名字(」那一行到下一个同级缩进的 `  }`）。 */
const methodBody = (src: string, name: string): string => {
  const i = src.search(new RegExp(`\\n  (private |readonly )?${name}\\(`));
  assert(i >= 0, `找不到方法 ${name}`);
  const j = src.indexOf("\n  }\n", i);
  return src.slice(i, j);
};

describe("笔的种类表（统筹 11-11）", () => {
  it("每一种对一把画的工具；画的工具（除了吸管）每一把都有种类", () => {
    for (const k of BRUSH_KIND_IDS) assert(PAINT_TOOLS.includes(BRUSH_KINDS[k].tool), `种类 ${k} 的工具 ${BRUSH_KINDS[k].tool} 不在画画工作台里`);
    for (const t of PAINT_TOOLS) if (t !== "eyedrop") assert(brushKindOfTool(t) !== null, `画的工具 ${t} 没有笔的种类`);
    eq(strokeKindOpts("eraser").erase, true); eq(strokeKindOpts("pen").erase, false);
  });
  it("画画工作台起笔只经 strokeKindOpts（不自己判是不是橡皮、怎么叠）；拿的是哪支只问 brushOf（app/paint-brushes.ts）", () => {
    const wb = read("src/app/paint-workbench.ts");
    assert(/const kind = this\.d\.brushOf\(tool\)/.test(wb) && /\.\.\.strokeKindOpts\(kind\)/.test(wb), "paint-workbench 起笔要用 strokeKindOpts(this.d.brushOf(tool))");
    assert(!/erase:\s*tool\s*===/.test(wb) && !/accum:\s*"over"/.test(wb), "paint-workbench 里不许再自己写 erase / accum");
  });
  it("probe-live-region 的 BRUSH_MATRIX 按路一组：表里出现的每一条路都有一组（加一支走新路的笔 = 探针里加一组，漏了 = 红；只是手感的数不一样的不用加）", () => {
    const pr = read("test/probes/probe-live-region.mjs"), m = pr.match(/const BRUSH_MATRIX = \{([\s\S]*?)\n\};/);
    assert(!!m, "probe-live-region 里找不到 const BRUSH_MATRIX = { … };");
    const keys = [...m![1].matchAll(/^\s{2}(\w+): \[/gm)].map((x) => x[1]);
    for (const k of keys) assert(k in BRUSH_KINDS, `BRUSH_MATRIX 的 ${k} 不是表里的笔`);
    const covered = new Set(keys.filter((k) => k in BRUSH_KINDS).map((k) => BRUSH_KINDS[k as keyof typeof BRUSH_KINDS].path));
    for (const k of BRUSH_KIND_IDS) assert(covered.has(BRUSH_KINDS[k].path), `笔 ${k} 走的路 ${BRUSH_KINDS[k].path} 在 probe-live-region 的 BRUSH_MATRIX 里没有一组`);
    eq(new Set(keys.map((k) => BRUSH_KINDS[k as keyof typeof BRUSH_KINDS].path)).size, keys.length, "一条路只一组（同路的第二组 = 白跑）");
    assert(/brushPaths/.test(pr), "探针运行时要再核一遍页面上的路（C.paint.brushPaths）");
  });
});

describe("往脏格子位图里记东西只在真画的那段（统筹 11-11）", () => {
  const layer = read("src/paint/space-layer.ts");
  it("space-layer：标格只在 update / resetFrozen 里；新位图只在构造和 takeChanged 里", () => {
    const marks = [...layer.matchAll(/\.mark\(/g)].length, upd = methodBody(layer, "update"), rf = methodBody(layer, "resetFrozen");
    const inside = [...upd.matchAll(/\.mark\(/g)].length + [...rf.matchAll(/\.mark\(/g)].length;
    eq(inside, marks, `space-layer 里有 ${marks - inside} 处标格在 update / resetFrozen 外面`);
    const fresh = [...layer.matchAll(/this\.changed = new DirtyCells/g)].length, ctor = methodBody(layer, "constructor"), tk = methodBody(layer, "takeChanged");
    eq([...ctor.matchAll(/this\.changed = new DirtyCells/g)].length + [...tk.matchAll(/this\.changed = new DirtyCells/g)].length, fresh, "新的脏格子位图只许在构造和 takeChanged 里建");
  });
  it("update：标的就是要画的那几个 item（上一帧的尾巴 ∪ 新定型的 ∪ 这一帧的尾巴），画的也正是这几个", () => {
    const upd = methodBody(layer, "update");
    for (const pat of [/for \(const r of this\.prevTail\) mark\(r\);/, /for \(const it of newFrozen\) \{ mark\(it\.rect\); sc\?\.mark\(it\.rect\[0\], it\.rect\[1\], it\.rect\[2\], it\.rect\[3\]\); \}/, /for \(const it of tail\) \{ mark\(it\.rect\); sc\?\.mark\(it\.rect\[0\], it\.rect\[1\], it\.rect\[2\], it\.rect\[3\]\); \}/, /this\.prevTail = tail\.map\(\(it\) => it\.rect\);/,
      /for \(const it of newFrozen\) this\.grow\(it\.rect\);/, /for \(const it of tail\) this\.grow\(it\.rect\);/, /this\.drawItems\(this\.frozen, newFrozen, tips\);/, /this\.drawItems\(this\.frame, tail, tips\);/])
      assert(pat.test(upd), `space-layer update 的结构变了（${pat}）：标格和画的还是同一批 item 吗？改了就回来改这条守卫`);
  });
  it("这一笔碰过的格（交给落层只读回，1-4d 第 8 条）：只在 resetFrozen 里新建、只在 update 里跟画进去的 item 一起标（不另算范围）", () => {
    const creates = [...layer.matchAll(/this\.strokeCellsMap = new DirtyCells/g)].length;
    eq(creates, 1, "只在一处新建");
    assert(/this\.strokeCellsMap = new DirtyCells/.test(methodBody(layer, "resetFrozen")), "新建在 resetFrozen 里（整笔重画开始）");
    const marks = [...layer.matchAll(/sc\?\.mark\(/g)].length;
    eq(marks, [...methodBody(layer, "update").matchAll(/sc\?\.mark\(/g)].length, "标这一笔的格只在 update 里");
  });
  it("resetFrozen：定型层清掉重画 = 标这一笔碰过的整块", () => {
    assert(/this\.changed\.mark\(b\[0\], b\[1\], b\[2\] - b\[0\], b\[3\] - b\[1\]\)/.test(methodBody(layer, "resetFrozen")), "resetFrozen 要标整笔的范围");
  });
  it("报给内核的 markChanged 只在 space-paint：照 takeChanged 的行段报，或读数角标「强制整张」报整张", () => {
    const hits = walk("src").filter((p) => !p.startsWith("src/paint/kernel/") && /\.markChanged\(/.test(read(p)));
    eq(hits.join(","), "src/paint/space-paint.ts");
    const sp = read("src/paint/space-paint.ts"), calls = [...sp.matchAll(/\.markChanged\(([^)]*)\)/g)].map((x) => x[1]);
    eq(calls.length, 2, `space-paint 里 markChanged 应该正好两处，现在 ${calls.length} 处`);
    assert(calls.includes("run.x, run.y, run.w, run.h") && calls.includes("0, 0, f.w, f.h"), `space-paint 的 markChanged 只许报 takeChanged 的行段或整张：${calls.join(" | ")}`);
    assert(/ch = this\.layer\.takeChanged\(\)/.test(sp) && /for \(const run of ch\.runs\(\)\)/.test(sp), "space-paint 报的行段要直接来自 layer.takeChanged()");
  });
});

describe("笔的表（施工单二十 1a：每行是笔的模型里那条记录，起笔经 resolvedBrushOf 解成内核的 ResolvedBrush）", () => {
  it("两行的数和 v0.19.54 一模一样：解出来的笔 = 以前的 hookBrush + 浓度旋钮，逐项（只有 compositeMode 不同，见下）", () => {
    for (const k of ["pen", "eraser"] as const) for (const knobs of [{ size: 20, opacity: 1, hardness: 0.5 }, { size: 3, opacity: 0.4, hardness: 0 }, { size: 180, opacity: 0.73, hardness: 1 }]) {
      const a = resolvedBrushOf(k, knobs) as Record<string, unknown>, b = { ...hookBrush({ size: knobs.size, hardness: knobs.hardness }), opacity: knobs.opacity } as Record<string, unknown>;
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]); keys.delete("compositeMode");
      const diff = [...keys].filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key])).map((key) => `${key}: ${JSON.stringify(b[key])} → ${JSON.stringify(a[key])}`);
      eq(diff.join("；"), "", `${k} ${JSON.stringify(knobs)}`);
    }
  });
  it("compositeMode 按叠法写（over = buildup）：三维的一笔只拿它算 accum；内核那份 ResolvedBrush.compositeMode 只有二维笔引擎读（三维不经过）", () => {
    for (const k of BRUSH_KIND_IDS) eq(BRUSH_KINDS[k].accum, (BRUSHES[k] as BrushRecord).compositeMode === "wash" ? "max" : "over", `${k} 的 accum 从记录算`);
    eq([strokeKindOpts("pen").accum, strokeKindOpts("eraser").accum].join(), "over,over", "和 v0.19.54 一样（两支都是越叠越浓）");
    const users = walk("src").filter((f) => !f.startsWith("src/paint/kernel/") && /\.compositeMode\b/.test(read(f)) && !/brush-(kinds|records)\.ts$/.test(f));
    eq(users.join(), "", "三维这边没有别处读 compositeMode");
  });
  it("画画工作台起笔只经 resolvedBrushOf（不再用调试钩子那支 hookBrush）", () => {
    const wb = read("src/app/paint-workbench.ts");
    assert(/resolvedBrushOf\(kind, \{ size, opacity, hardness \}\)/.test(wb), "paint-workbench 起笔用 resolvedBrushOf");
    assert(/smooth: strokeSmoothOf\(brush\)/.test(wb), "paint-workbench 起笔的平滑只经 strokeSmoothOf（= 内核 resolveSmooth）");
    assert(!/\bhookBrush\(/.test(wb) && !/import[^\n]*\bhookBrush\b/.test(wb), "paint-workbench 里不许再调 / 导入 hookBrush（注释里提到没事）");
  });
});

describe("笔的表长出草稿笔、勾线笔（施工单二十 1b）", () => {
  it("草稿笔 = 画画软件的「铅笔」、勾线笔 = 它的「勾线」：数原样抄（builtin-brushes.json，v0.14.86）", () => {
    // 抄的那几个数写在这里再对一次：表里的数被人顺手改了 = 红（像不像归 user 判断，不自己调；要改先问统筹）
    const want: Record<string, Partial<Record<string, unknown>>> = {
      sketch: { size: { base: 6, max: 80 }, hardness: 0.75, sizeCoeff: 0.5, opaCoeff: 0.35, flowCoeff: 0.3, pressureGamma: 1, pressureLPF: 50, compositeMode: "wash", spacing: 0.06, taper: { in: 0, out: 0 }, smooth: { streamline: 0.1, stabilization: 0.15 } },
      ink: { size: { base: 8, max: 60 }, hardness: 0.5, sizeCoeff: 0.95, opaCoeff: 0, flowCoeff: 0, pressureGamma: 0.5, pressureLPF: 50, compositeMode: "wash", spacing: 0.06, taper: { in: 0.5, out: 0 }, smooth: { streamline: 0.5, stabilization: 0.5 } },
    };
    for (const [id, w] of Object.entries(want)) {
      const r = BRUSHES[id as keyof typeof BRUSHES] as BrushRecord, got: Record<string, unknown> = { ...r, hardness: r.shape.hardness };
      for (const [k, v] of Object.entries(w)) eq(JSON.stringify(got[k]), JSON.stringify(v), `${id}.${k}`);
      eq(r.tool, "brush"); eq(r.pixelMode, false); eq(r.taperFloor, 0.4, "画画软件那两支没写 = resolveBrush 的缺省 0.4");
    }
  });
  it("解出来的笔：手感那一组照记录走（不是调试钩子那支）", () => {
    const b = resolvedBrushOf("ink", { size: 30, opacity: 0.6, hardness: 0.4 });
    eq(b.size, 30); eq(b.opacity, 0.6); eq(b.hardness, 0.4, "硬度是旋钮");
    eq(b.sizeCoeff, 0.95); eq(b.pressureGamma, 0.5); eq(b.taperIn, 0.5); eq(b.spacing, 0.06); eq(b.streamline, 0.5); eq(b.stabilization, 0.5); eq(b.compositeMode, "wash");
  });
  it("平滑：普通笔 / 橡皮不平滑（不递 = 和以前一样）；草稿笔 / 勾线笔 = 内核 resolveSmooth，scale 1", () => {
    for (const k of ["pen", "eraser"] as const) eq(strokeSmoothOf(resolvedBrushOf(k, { size: 10, opacity: 1, hardness: 0.5 })), undefined, k);
    for (const k of ["sketch", "ink"] as const) {
      const r = BRUSHES[k] as BrushRecord;
      eq(JSON.stringify(strokeSmoothOf(resolvedBrushOf(k, { size: 10, opacity: 1, hardness: 0.5 }))), JSON.stringify(resolveSmooth(r.smooth.streamline, r.smooth.stabilization, 1)), k);
    }
  });
  it("路：草稿笔、勾线笔都是 brush + 取最浓 = 同一条新路（和普通笔的越叠越浓不同）；探针按路拿第一支画", () => {
    eq(BRUSH_KINDS.sketch.path, BRUSH_KINDS.ink.path); eq(BRUSH_KINDS.sketch.accum, "max");
    assert(BRUSH_KINDS.sketch.path !== BRUSH_KINDS.pen.path, "取最浓和越叠越浓是两条路");
    eq(Object.keys(BRUSH_PATHS).length, 3, "普通笔 / 橡皮 / 取最浓的笔三条路");
    eq(BRUSH_PATHS[BRUSH_KINDS.ink.path], "sketch", "同一条路拿表里第一支");
    eq(pathKeyOf(BRUSHES.pen as BrushRecord), BRUSH_KINDS.pen.path);
  });
  it("每把工具拿的是哪支：挑的是这把工具上的笔 = 它；没挑、这一版没有的、别的工具上的 = 默认那支；吸管 = null", () => {
    eq(brushKindsOfTool("paintPen").join(), "pen,sketch,ink"); eq(brushKindsOfTool("paintEraser").join(), "eraser"); eq(brushKindsOfTool("eyedrop").length, 0);
    eq(brushKindOfTool("paintPen", "ink"), "ink"); eq(brushKindOfTool("paintPen"), DEFAULT_BRUSH.brush); eq(brushKindOfTool("paintPen", "wash"), "pen", "本版没有的笔");
    eq(brushKindOfTool("paintPen", "eraser"), "pen", "别的工具上的笔"); eq(brushKindOfTool("paintEraser", "sketch"), "eraser"); eq(brushKindOfTool("eyedrop", "pen"), null);
  });
  it("一支笔在这里能不能用（笔的模型第四节）：模型上全部能用；带着宿主不认得的取值 = 不能用 + 说是哪一样", () => {
    for (const k of BRUSH_KIND_IDS) eq(brushUnusableWhy(BRUSHES[k] as BrushRecord, SURFACE_HOST), null, `${k} 在模型上能用`);
    const narrow: HostCaps = { ...SURFACE_HOST, name: "小窗里", compositeModes: ["buildup"] };
    assert(/叠法「wash」/.test(brushUnusableWhy(BRUSHES.sketch as BrushRecord, narrow) ?? ""), "不认得 wash 的宿主里草稿笔不能用、说是叠法");
    assert(/单位「cell」/.test(brushUnusableWhy({ ...(BRUSHES.pen as BrushRecord), size: { base: 1, max: 64, unit: "cell" } }, SURFACE_HOST) ?? ""), "按格的笔在还不认得格的宿主里说是单位");
    assert(/一格一格/.test(brushUnusableWhy({ ...(BRUSHES.pen as BrushRecord), pixelMode: true }, SURFACE_HOST) ?? ""), "按格出漆还不认得");
  });
  it("认记录、比能不能用的那个文件（brush-records.ts）只引用画画内核，不引用三维自己的东西（笔的模型第七节第 3 条：以后搬进内核）", () => {
    const src = read("src/paint/brush-records.ts"), imports = [...src.matchAll(/^import[^"]*"([^"]+)"/gm)].map((m) => m[1]);
    for (const i of imports) assert(i.startsWith("./kernel/"), `brush-records.ts import 了 ${i}`);
  });
  it("工具条的「笔」下拉 = 笔的表里 tool = brush 的那几支（不另抄名字）", async () => {
    const { TOOL_OPTIONS } = await import("../src/editor/tool-config.ts");
    const o = TOOL_OPTIONS.paintPen.brush;
    eq(o.values.map((v) => `${v.id}:${v.label}`).join(), brushKindsOfTool("paintPen").map((k) => `${k}:${BRUSHES[k].name}`).join());
    eq(o.def, DEFAULT_BRUSH.brush);
  });
});
