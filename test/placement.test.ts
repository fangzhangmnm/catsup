// 放置表的 app 那半（src/controller/placement.ts；接线清单第 1 条 / 账本 UX34；created 2026-10-28 by Claude Opus 5.5）：
// ① 左柱的每把工具都是真工具、在那个工作台里能用、同一列不重复、预算装得下常驻 ② 定死一列的工作台 = 那个工作台的工具（不多不少，沿法线这种只有键盘入口的除外）
// ③ ☰ 每行 id 不重复、页合法、每页至少一行 ④ 每个注册表放置面都登记了谁画；放在「没渲染器且不准先登记」的面上的动作 = 红；renderer 文件真的在
// ⑤ main.ts 不再手写这些表（只按表画）。
import { describe, it, eq, assert } from "./runner.mjs";
import { RAIL_FIXED_FLYOUTS, RAIL_FIXED_FOLD, MENU_ROWS, MENU_TABS, RAIL_FIRST, RAIL_FIXED, RAIL_GROUPS, RAIL_LABELS, SHAPES, SURFACE_RENDERERS } from "../src/controller/placement.ts";
import { ERASERS, TOOLS } from "../src/editor/tool-ids.ts";
import { allActions } from "../src/editor/commands/registry.ts";
import { FAMILIES } from "../src/editor/commands/index.ts";
import { GeometryMode } from "../src/editor/modes/geometry.ts";
import { FreeformMode } from "../src/editor/modes/freeform.ts";
import { VerifyMode } from "../src/editor/modes/verify.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string; existsSync(p: string): boolean }, url = (await import("node:url" as string)) as { fileURLToPath(u: URL): string };
const path = (p: string): string => url.fileURLToPath(new URL(p, import.meta.url));

describe("放置表（controller/placement.ts）", () => {
  it("左柱：每把工具都是真工具；硬表面那一列（第一组 + 各组）不重复、都在硬表面工作台里；预算装得下常驻", () => {
    const known = new Set<string>(TOOLS);
    const first = RAIL_FIRST.flatMap((s) => ("tool" in s ? [s.tool] : s.flyout === "shapes" ? [...SHAPES] : [...ERASERS]));
    const all = [...first, ...RAIL_GROUPS.flatMap((g) => [...g.pinned, ...g.pool])];
    eq(all.filter((t) => !known.has(t)).join(","), "", "不认识的工具");
    eq(all.filter((t, i) => all.indexOf(t) !== i).join(","), "", "同一把工具放了两处");
    const geo = new Set<string>(new GeometryMode().tools);
    eq(all.filter((t) => !geo.has(t) && t !== "paint").join(","), "", "硬表面左柱里有硬表面工作台没有的工具（油漆桶是表面工作台的，硬表面里按工作台筛掉）");
    for (const g of RAIL_GROUPS) assert(g.budget >= 1 && g.budget >= Math.min(g.pinned.length, 1), `组 ${g.id} 预算`);
  });
  it("定死一列的工作台：列里的工具 = 那个工作台的工具（只有键盘入口的沿法线除外），不重复；改名只改那个工作台有的工具", () => {
    const modes = { freeform: new FreeformMode(), verify: new VerifyMode() } as const;
    for (const [id, list] of Object.entries(RAIL_FIXED)) {
      const m = modes[id as keyof typeof modes]; assert(!!m, `${id} 没有对应的工作台`);
      const has = new Set<string>(m.tools);
      eq(list!.filter((t) => !has.has(t)).join(","), "", `${id} 列里有工作台没有的工具`);
      const fly = Object.values(RAIL_FIXED_FLYOUTS[id as keyof typeof RAIL_FIXED_FLYOUTS] ?? {}).flat();   // 小三角组里的也算上了左柱
      const folds = RAIL_FIXED_FOLD[id as keyof typeof RAIL_FIXED_FOLD] ?? [], foldPool = folds.flatMap((f) => f.pool);   // 折叠组里的也算（收在「…」里、用过长出来；一个工作台可以有几组）
      for (const f of folds) { eq(f.pool.filter((t) => !has.has(t) || list!.includes(t)).join(","), "", `${id} 折叠组里有工作台没有的 / 和定死一列重复的`); assert(f.budget >= 1, `${id} 折叠组预算`); assert(!f.after || list!.includes(f.after), `${id} 折叠组挂在列里没有的 ${f.after} 后面`); }
      eq(foldPool.filter((t, i) => foldPool.indexOf(t) !== i).join(","), "", `${id} 两组折叠重复`);
      eq(m.tools.filter((t) => !list!.includes(t) && !fly.includes(t) && !foldPool.includes(t)).join(","), "", `${id} 工作台有工具没上左柱`);
      eq(list!.filter((t, i) => list!.indexOf(t) !== i).join(","), "", `${id} 重复`);
    }
    for (const [id, labels] of Object.entries(RAIL_LABELS)) { const m = modes[id as keyof typeof modes]; for (const t of Object.keys(labels!)) assert(m.tools.includes(t as never), `${id} 改名的 ${t} 不在那个工作台`); }
  });
  it("☰：每行 id 不重复、页合法、每页至少一行；页的顺序 = 文件 / 模型 / 设置 / 帮助", () => {
    const ids = MENU_ROWS.map((r) => r.id);
    eq(ids.filter((x, i) => ids.indexOf(x) !== i).join(","), "", "重复");
    const tabs = new Set(MENU_TABS.map((t) => t.id));
    eq(MENU_ROWS.filter((r) => !tabs.has(r.tab)).map((r) => r.id).join(","), "", "页不合法");
    for (const t of MENU_TABS) assert(MENU_ROWS.some((r) => r.tab === t.id), `页 ${t.id} 空的`);
    eq(MENU_TABS.map((t) => t.id).join(","), "file,model,settings,help");
  });
  it("每个注册表放置面都登记了谁画；放在没渲染器（且不准先登记）的面上的动作 = 红；renderer 文件真的在", () => {
    const bad: string[] = [];
    for (const f of FAMILIES) for (const p of f.placements) { const st = SURFACE_RENDERERS[p.where]; if (!st) bad.push(`${p.action}@${p.where}: 面没登记`); else if ("pending" in st && !st.preRegister) bad.push(`${p.action}@${p.where}: 这个面现在没人画（${st.pending}）`); }
    eq(bad.join("; "), "", "放了看不见的动作");
    for (const [w, st] of Object.entries(SURFACE_RENDERERS)) if ("renderer" in st) assert(fs.existsSync(path(`../src/${st.renderer}`)), `${w} 的渲染器 ${st.renderer} 不在`);
    assert(allActions().length > 10, "注册表空了？");
  });
  it("main.ts 只按表画：不再手写左柱分组 / 定死一列 / 改名表 / ☰ 页签", () => {
    const m = fs.readFileSync(path("../src/app/main.ts"), "utf8");
    for (const re of [/const RAIL_GROUPS\s*[:=]/, /const MODE_RAIL\s*[:=]/, /const MODE_TOOL_LABEL\s*[:=]/, /const MAIN_MENU_TABS\s*=/, /const SHAPES\s*[:=]/]) assert(!re.test(m), `main.ts 还手写着 ${re}`);
  });
});
