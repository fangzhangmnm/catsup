// 笔的种类表 + 「宿主报的格对不对」的结构守卫（统筹 11-11）。created 2026-11-11 by Claude Opus 5.5
// ① 笔的种类表（src/paint/brush-kinds.ts）：每一种对一把画画工作台的工具；画的工具（除了吸管）每一把都有种类；画画工作台起笔只经 strokeKindOpts（不自己判「是不是橡皮」）。
// ② 探针按表跑：probe-live-region 的 BRUSH_MATRIX 里要有表里的每一种（漏了 = 红，照 mirror-ops 那张登记表的做法）；探针自己运行时再核一遍页面上的表。
// ③ 往脏格子位图里记东西只许在真正出 item / 真正画的那段（space-layer.ts update / resetFrozen），标的就是要画的那几个 item 的方框；
//    报给内核的 markChanged 只在 space-paint.ts（照 takeChanged 出来的行段报，或读数角标「强制整张」那一档报整张）。别处另算一份范围去报 = 红。
// 这些是结构守卫：改到这几段代码时守卫跟着红，逼着回来看一眼「报的还是不是真画的那些」。真报得对不对靠 probe-live-region（多笔种逐字节）和读数角标的「核对」。
import { describe, it, assert, eq } from "./runner.mjs";
import { BRUSH_KINDS, BRUSH_KIND_IDS, BRUSHES, brushKindOfTool, strokeKindOpts, resolvedBrushOf, type BrushRecord } from "../src/paint/brush-kinds.ts";
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
  it("画画工作台起笔只经 strokeKindOpts（不自己判是不是橡皮、怎么叠）", () => {
    const wb = read("src/app/paint-workbench.ts");
    assert(/strokeKindOpts\(brushKindOfTool\(tool\)!?\)/.test(wb), "paint-workbench 起笔要用 strokeKindOpts(brushKindOfTool(tool))");
    assert(!/erase:\s*tool\s*===/.test(wb) && !/accum:\s*"over"/.test(wb), "paint-workbench 里不许再自己写 erase / accum");
  });
  it("probe-live-region 的 BRUSH_MATRIX 有表里的每一种（加一种笔 = 探针里加一组，漏了 = 红）", () => {
    const pr = read("test/probes/probe-live-region.mjs"), m = pr.match(/const BRUSH_MATRIX = \{([\s\S]*?)\n\};/);
    assert(!!m, "probe-live-region 里找不到 const BRUSH_MATRIX = { … };");
    const keys = new Set([...m![1].matchAll(/^\s{2}(\w+): \[/gm)].map((x) => x[1]));
    for (const k of BRUSH_KIND_IDS) assert(keys.has(k), `笔的种类 ${k} 不在 probe-live-region 的 BRUSH_MATRIX 里`);
    assert(/brushKinds/.test(pr), "探针运行时要再核一遍页面上的种类表（C.paint.brushKinds）");
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
    for (const k of BRUSH_KIND_IDS) for (const knobs of [{ size: 20, opacity: 1, hardness: 0.5 }, { size: 3, opacity: 0.4, hardness: 0 }, { size: 180, opacity: 0.73, hardness: 1 }]) {
      const a = resolvedBrushOf(k, knobs) as Record<string, unknown>, b = { ...hookBrush({ size: knobs.size, hardness: knobs.hardness }), opacity: knobs.opacity } as Record<string, unknown>;
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]); keys.delete("compositeMode");
      const diff = [...keys].filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key])).map((key) => `${key}: ${JSON.stringify(b[key])} → ${JSON.stringify(a[key])}`);
      eq(diff.join("；"), "", `${k} ${JSON.stringify(knobs)}`);
    }
  });
  it("compositeMode 按叠法写（over = buildup）：三维的一笔只拿它算 accum；内核那份 ResolvedBrush.compositeMode 只有二维笔引擎读（三维不经过）", () => {
    for (const k of BRUSH_KIND_IDS) eq(BRUSH_KINDS[k].accum, (BRUSHES[k] as BrushRecord).compositeMode === "wash" ? "max" : "over", `${k} 的 accum 从记录算`);
    eq([strokeKindOpts("pen").accum, strokeKindOpts("eraser").accum].join(), "over,over", "和 v0.19.54 一样（两支都是越叠越浓）");
    const users = walk("src").filter((f) => !f.startsWith("src/paint/kernel/") && /\.compositeMode\b/.test(read(f)) && !/brush-kinds\.ts$/.test(f));
    eq(users.join(), "", "三维这边没有别处读 compositeMode");
  });
  it("画画工作台起笔只经 resolvedBrushOf（不再用调试钩子那支 hookBrush）", () => {
    const wb = read("src/app/paint-workbench.ts");
    assert(/resolvedBrushOf\(brushKindOfTool\(tool\)!?, \{ size, opacity, hardness \}\)/.test(wb), "paint-workbench 起笔用 resolvedBrushOf");
    assert(!/\bhookBrush\(/.test(wb) && !/import[^\n]*\bhookBrush\b/.test(wb), "paint-workbench 里不许再调 / 导入 hookBrush（注释里提到没事）");
  });
});

