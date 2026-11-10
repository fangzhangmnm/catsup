// 选中的参考几何住编辑器、不进选区类型（计划书 `ai-docs/20261109-audit-fixes-plan.md` 工单 1；created 2026-11-09 by Claude Opus 5.5）。
// user 10-24 深夜：「我设计方案：编辑器单独维护一份「选中参考几何id」集合，不混入内核实体的选区类型，避免影响其他消费方」。
// 守三件：① 选区类型里没有 guides；② src/ 里除了 guide-selection.ts 和 editor.ts 没人碰那份集合；③ 「有没有选区」这个含糊的名字不再回来（每个调用点必须选「任何」还是「能动的」）。
// 行为（擦掉 / 清空参考几何之后不再「还选着」、Delete 不再多出一步空撤销）在真 app 里验：探针 probe-guide-select。
import { describe, it, eq, assert } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readdirSync(u: URL, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[]; readFileSync(u: URL, e: string): string };   // tsconfig 没装 Node 类型：动态引（同 aux-look-guard.test.ts）
import { GuideSelection } from "../src/editor/guide-selection.ts";
import { emptyGuides } from "../src/scene/guides.ts";

/** src/ 下每个 .ts 的相对路径（不进 vendor）。 */
function* walk(rel: string): Generator<string> {
  for (const d of fs.readdirSync(new URL(`../src/${rel}`, import.meta.url), { withFileTypes: true })) { const r = rel ? `${rel}/${d.name}` : d.name; if (d.isDirectory()) { if (d.name !== "vendor") yield* walk(r); } else if (d.name.endsWith(".ts")) yield r; }
}
const read = (rel: string): string => fs.readFileSync(new URL(`../src/${rel}`, import.meta.url), "utf8");
const ALL = [...walk("")];

describe("选中的参考几何（editor/guide-selection.ts）", () => {
  it("选区类型（tools.ts）里没有 guides：拿到选区的代码只看得到内核的点 / 边 / 面", () => {
    const t = read("editor/tools.ts");
    const decl = t.split("\n").filter((l: string) => /export interface (Brep|Mesh)Selection\b/.test(l));
    eq(decl.length, 2, "两种选区类型都找得到");
    for (const l of decl) assert(!/\bguides\b/.test(l), `选区类型里又有了参考几何：${l.trim()}`);
    assert(!/export const guidesOf\b/.test(t), "guidesOf（从选区里取参考几何）不该回来");
  });
  it("src/ 里只有 guide-selection.ts 和 editor.ts 碰「选中的参考几何」这份集合", () => {
    const bad = ALL.filter((p) => !["editor/guide-selection.ts", "editor/editor.ts"].includes(p) && /\bGuideSelection\b|\bselectedGuides\b/.test(read(p)));
    eq(bad.join(", "), "", "别的模块直接碰了选中的参考几何（要问就走编辑器的 hasAnySelection / ToolCtx.selectGuide）");
  });
  it("「有没有选区」的含糊问法不再回来：src/ 里没有 hasSelection（只有 hasAnySelection / hasActableSelection、键表的 anySelection / actableSelection）", () => {
    const bad = ALL.filter((p) => /\bhasSelection\b/.test(read(p)));
    eq(bad.join(", "), "", "hasSelection 又出现了：这一处要的是「有任何选中（含参考几何）」还是「有工具能动的选中」？");
  });
  it("集合本身：合并四种方式、按活着的参考几何剪、快照还原", () => {
    const s = new GuideSelection(), g = emptyGuides();
    g.lines.push({ id: 1, p: { x: 0, y: 0, z: 0 }, dir: { x: 1, y: 0, z: 0 } }); g.points.push({ id: 2, p: { x: 0, y: 0, z: 0 } });
    s.merge([1, 2, 7], "add"); eq(s.size, 3);
    s.prune(g); eq(s.snapshot().sort().join(","), "1,2", "7 不在活动池里：剪掉");
    s.merge([1], "toggle"); eq(s.snapshot().join(","), "2");
    s.merge([1], "replace"); eq(s.snapshot().sort().join(","), "1,2", "replace 只往里加（清空归编辑器的写口）");
    s.merge([2], "remove"); eq(s.snapshot().join(","), "1");
    const snap = s.snapshot(); s.clear(); eq(s.size, 0); s.restore(snap); eq(s.snapshot().join(","), "1");
    s.prune(emptyGuides()); eq(s.size, 0, "网格体 / 参考几何全清了：一个不留");
  });
});
