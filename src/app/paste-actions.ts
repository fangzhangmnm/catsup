// app/paste-actions.ts —— 粘贴 / 导入撞上「同一个条目、两边内容不一样」时问人（设计书 ai-docs/20261104-identity-layer-design.md §8）。决定在这里问，怎么搬在 src/identity/ + editor/transfer.ts，机械。created 2026-11-04 by Claude Opus 5.5（ID-4b）
// user 11-04 深夜拍：「2弹窗 3 跟，可开关 4 用」= 内容不一样先弹窗（默认用拷来的更新）；材质跟着组件一起更新、默认开、能关；导入素材同一弹窗同一默认。
// 文字不能说「从别的模型拷来的」：剪贴板记的是第几次打开，同一文件重开也算一次，只能说「拷来的版本和这份模型里的不一样」。摆事实，不判谁新：文件里没有版本号（家族同步红线「无 LWW、冲突必 surface」在组件上的同一条）。
// 一次只选一种（逐个勾会造环）。撤销是安全网不是替代：一步能退回，但只在没存盘关掉之前有效，所以要先问。
import type { ConflictRow } from "../editor/transfer.ts";
import { DEFINITION, MATERIAL } from "../format/entry-kinds.ts";
import type { Decision } from "../identity/graph.ts";
import { openFormSheet } from "./ui/sheets.ts";

const MAX_ROWS = 12;
const hex = (c: readonly [number, number, number]): string => `#${c.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0")).join("")}`;
/** 一条的事实：这里摆了几份 / 几张面在用、几份锁着、在架上；两边各几张面（材质 = 两边的颜色）。 */
export function conflictLine(r: ConflictRow): string {
  const here: string[] = [];
  if (r.kind === DEFINITION) {
    here.push(`这里摆了 ${r.placed} 份`);
    if (r.locked) here.push(`${r.locked} 份锁着`);
    if (r.shelved) here.push("在素材架上");
    return `组件「${r.name}」：${here.join("、")}；这里 ${r.hereFaces ?? 0} 张面、拷来的 ${r.incomingFaces ?? 0} 张面`;
  }
  here.push(`这里 ${r.faces} 张面在用`);
  if (r.shelved) here.push("在素材架上");
  const look = (m: ConflictRow["hereMaterial"]): string => (m ? `${hex(m.color)}${m.texture ? " + 贴图" : ""}` : "");
  return `材质「${r.name}」：${here.join("、")}；这里 ${look(r.hereMaterial)}、拷来的 ${look(r.incomingMaterial)}`;
}
const AFTER: Readonly<Record<string, string>> = {
  update: "这份模型里摆着的每一份都会变成拷来的样子（包括锁着的），一步能撤销（没存盘关掉之前）。",
  keep: "这份模型里的不变，贴出来的也用这里的版本。",
  detach: "贴成新的一份，这份模型里原来的不动，以后互不相干。",
};

/** 问一次：一种处理 + 材质跟不跟。取消 = null（不贴）。 */
export async function resolvePasteConflict(rows: readonly ConflictRow[]): Promise<Decision | null> {
  const hasDefs = rows.some((r) => r.kind === DEFINITION), hasMats = rows.some((r) => r.kind === MATERIAL);
  const facts = [...rows.slice(0, MAX_ROWS).map(conflictLine), ...(rows.length > MAX_ROWS ? [`还有 ${rows.length - MAX_ROWS} 条没列`] : [])].join("\n");
  const v = await openFormSheet("拷来的版本和这份模型里的不一样", [
    { key: "entries", label: "怎么办", value: "update", options: [{ value: "update", label: "用拷来的更新" }, { value: "keep", label: "留这份模型的，只多摆一份" }, { value: "detach", label: hasDefs ? "断开，贴成新组件" : "断开，贴成新材质" }] },
    ...(hasDefs && hasMats ? [{ key: "materials", label: "材质也跟着", value: "yes", options: [{ value: "yes", label: "跟" }, { value: "no", label: "不跟（留这里的）" }], hidden: (x: Readonly<Record<string, string>>) => x.entries === "keep" }] : []),
  ], { okLabel: "贴", note: (x) => `${facts}\n${AFTER[x.entries]}` });
  if (!v) return null;
  return { entries: v.entries as Decision["entries"], ...(v.materials === "no" ? { except: [MATERIAL] } : {}) };
}
