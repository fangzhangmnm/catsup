// app/canvas-size-picker.ts —— 开始画时选画布大小（2026-11-11 Claude Opus 5.5；统筹 11-11 小单）。
// user 11-11：「默认多大，第一笔会让我胖多少？我觉得落笔的时候弹或者进入的时候弹让你主动选就好了，因为我会一直很抠用128 256，但是normie可能是1k起步，
//   或者无脑2k，然后我会嫌弃胖。」
// 点「开始画」先出这张面板：128 / 256 / 512 / 1024 / 2048 五行，点哪一行就按那一档开始画（没有确认钮、没有预选的默认档）；能取消。
// 每一行如实写两个数：① 这一档下一格大约多大 = 这些面真的按这一档铺一遍得到的密度（世界里的长度，走单位模块，按现在的单位制念）；② 每层最多占多少 = 宽 × 高 × 4 字节
//   （没压缩的上限，字面写「最多」）。铺不下的档灰掉、写原因。①要现铺：面板先出，一行一行算出来再填（大模型上不挡面板）。
// 这份文件里最近建的那张画用的是哪一档：那一行带个淡淡的「上次用的」——从文件里已有的画读出来，不新存东西；没有画 = 没有记号。
import type { Editor } from "../editor/editor.ts";
import { CANVAS_SIZES, facesToStart } from "../editor/mesh-edits/start-paint.ts";
import type { MeshSelection } from "../editor/tools.ts";
import { layoutFaces } from "../paint/layout.ts";
import { xformScale } from "../paint/space-target.ts";
import { paintPlaceOf } from "../scene/paint.ts";
import { displayUnit, formatLength, unitSystem } from "../editor/units.ts";
import { openRowsSheet, type SheetRow } from "./ui/sheets.ts";

/** 每层最多多少字节（宽 × 高 × 4）念成 KB / MB。 */
export function bytesSay(n: number): string { return n >= 1 << 20 ? `${Number((n / (1 << 20)).toFixed(1))} MB` : `${Math.round(n / 1024)} KB`; }
/** 一格多大（米）念出来：米制下不到 1 厘米念毫米、否则念厘米；英制念英寸。 */
export function cellSay(m: number): string { return (unitSystem(displayUnit()) === "imperial" ? formatLength(m, "in", 2) : formatLength(m, m < 0.01 ? "mm" : "cm", 1)).replace(/^~/, ""); }   // 前面已经说了「约」，单位模块表示取整的「~」去掉

/** 这份文件里最近建的那张画的画布边长（贴图表里最后一张分层的画走的那一套坐标的宽）；没有 = null。 */
export function recentCanvas(editor: Editor): number | null {
  const S = editor.sceneRef;
  let last: number | null = null;
  for (const t of S.textures.values()) { if (t.content.kind !== "layered") continue; const w = paintPlaceOf(S, t.guid)?.uvSet.width; if (w) last = w; }
  return last;
}

/** 出面板、等选；选了 = 画布边长，取消 = null。 */
export function pickCanvasSize(editor: Editor): Promise<number | null> {
  const S = editor.sceneRef, def = S.defOfContext(editor.context), body = S.def(def).body;
  const sel = (editor as unknown as { selection: { kind: string } }).selection;
  const faces = body.kind === "mesh" ? facesToStart(S, { def, sel: sel.kind === "mesh" ? (sel as MeshSelection) : null }) : [];
  const scale = xformScale(S.xformOfContext(editor.context)), recent = recentCanvas(editor);
  const rows: SheetRow<number>[] = CANVAS_SIZES.map((n) => ({
    label: `${n} × ${n}`, value: n, note: `一格多大：在算…　每层最多 ${bytesSay(n * n * 4)}`,
    ...(recent === n ? { marked: "上次用的" } : {}),
  }));
  const count = faces.length;
  return openRowsSheet("画布多大", `给这 ${count} 张面铺一张画：画布越大越细，文件也越胖（下面是每一层没压缩时最多占多少；空着的地方存盘时会压得很小）。`, rows, (fill) => {
    if (body.kind !== "mesh") return;
    let i = 0;
    const next = (): void => {
      if (i >= CANVAS_SIZES.length || !fill.alive()) return;
      const n = CANVAS_SIZES[i], r = layoutFaces(body.kernel, faces, { base: n });
      if (r.ok && r.density > 0) fill.set(i, { note: `一格约 ${cellSay(scale / r.density)}　每层最多 ${bytesSay(n * n * 4)}` });
      else fill.set(i, { blocked: `铺不下：${r.ok ? "面太小，量不出密度" : r.reason}` });
      i++;
      setTimeout(next, 0);   // 一行一行来：大模型上每档要现铺一遍
    };
    setTimeout(next, 0);
  });
}
