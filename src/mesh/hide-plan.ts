// mesh/hide-plan.ts —— 自由建模的「藏」该藏哪些面、哪些边（纯计算；指令 setHidden 只照单写）。created 2026-11-13 by Claude Opus 5.5
// 统筹 11-13：H = 藏选中的，Shift+H = 藏没选中的（Blender 成套的），Alt+H = 全部显示；点不单独藏（点跟着边走：它的边全藏了才不露 = scene/world-view.ts，照旧）。
// 边跟着面（Blender 同款）：一条边挨着的面在这一下之后全藏着 = 这条边也藏（不然藏掉一整块之后留一副线框）；挨着一张露着的面 = 留着。
// 裸线（一张面都不挨）：H 只藏点名选中的；Shift+H 没选中的都藏。藏没选中的时候，选中的边留着（哪怕它挨着的面都藏了）。
import type { MeshKernel } from "./mesh-kernel.ts";
import { HIDE_EDGE, edgeMarkReader, hiddenColumn } from "./reserved-columns.ts";

export interface HidePick { readonly faces: ReadonlySet<number>; readonly edges: ReadonlySet<number> }
/** 这一下要藏的面和边（都是现在还露着的；已经藏着的不再列）。others = 藏没选中的。 */
export function planHide(m: MeshKernel, sel: HidePick, others: boolean): { faces: number[]; edges: number[] } {
  const col = hiddenColumn(m), was = (f: number): boolean => !!col && col.data[f] === 1, hidE = edgeMarkReader(m, HIDE_EDGE);
  const faces = m.faces().filter((f) => !was(f) && sel.faces.has(f) !== others);
  const gone = new Set(faces), hiddenAfter = (f: number): boolean => gone.has(f) || was(f);
  const edges = m.edges().filter((e) => {
    if (hidE(e)) return false;
    if (sel.edges.has(e)) return !others;
    const fs = m.eFaces(e);
    return fs.length ? fs.every(hiddenAfter) : others;
  });
  return { faces, edges };
}
/** 这个点藏没藏（= 它有边、边全藏着；world-view.ts 的 hiddenVerts 同一条规矩）：藏完从选区里拿掉藏起来的点。 */
export function vertHidden(m: MeshKernel, v: number): boolean {
  const es = m.vEdges(v), hidE = edgeMarkReader(m, HIDE_EDGE);
  return es.length > 0 && es.every(hidE);
}
