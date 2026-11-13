// app/canvas-size-picker.ts —— 开始画时选画布大小（2026-11-11 Claude Opus 5.5；统筹 11-11 小单）。
// user 11-11：「默认多大，第一笔会让我胖多少？我觉得落笔的时候弹或者进入的时候弹让你主动选就好了，因为我会一直很抠用128 256，但是normie可能是1k起步，
//   或者无脑2k，然后我会嫌弃胖。」
// 点「开始画…」先出这张面板：128 / 256 / 512 / 1024 / 2048 五行，点哪一行就按那一档开始画（没有确认钮、没有预选的默认档）；能取消。
// 物件已经有画、选中的面里有还没进画的：上面多几行「加进已有的画：〈名字〉」，下面五行 =「新开一张画」（施工单十五第三节，11-11 下午改）。
// 每一行如实写两个数：① 这一档下一格大约多大 = 这些面真的按这一档铺一遍得到的密度（世界里的长度，走单位模块，按现在的单位制念）；② 打开这张画时显卡上固定占多少
//   （paint/open-memory.ts：按这一档实际要开的东西算，不是估的；「每层最多多少（没压缩）」user 11-11 说会误导，撤了）。文件会多大不写。
//   铺不下的档灰掉、写原因。①要现铺：面板先出，一行一行算出来再填（大模型上不挡面板）。
// 这份文件里最近建的那张画用的是哪一档：那一行带个淡淡的「上次用的」——从文件里已有的画读出来，不新存东西；没有画 = 没有记号。
import type { Editor } from "../editor/editor.ts";
import { CANVAS_SIZES, facesToStart, paintsOf } from "../editor/mesh-edits/start-paint.ts";
import type { MeshSelection } from "../editor/tools.ts";
import { gapForCanvas, layoutAppend, layoutFaces } from "../paint/layout.ts";
import { xformScale } from "../paint/space-target.ts";
import { paintPlaceOf } from "../scene/paint.ts";
import { uvMesh } from "../scene/uv.ts";
import { displayUnit, formatLength, parseQuantity, unitSystem } from "../editor/units.ts";
import { openInputSheet, openRowsSheet, type SheetRow } from "./ui/sheets.ts";
import { bytesSay, openMemory, paintTargetSize, type PaintTargetSize } from "../paint/open-memory.ts";

/** 打开这张画时显卡上固定占多少 + 画的时候再多多少。 */
export function memSay(n: number, h = n, target?: PaintTargetSize): string { const m = openMemory(n, h, target); return `打开占 ${bytesSay(m.fixed)}（画的时候再多 ${bytesSay(m.stroke)}）`; }
/** 一格多大（米）念出来：米制下不到 1 厘米念毫米、否则念厘米；英制念英寸。 */
export function cellSay(m: number): string { return (unitSystem(displayUnit()) === "imperial" ? formatLength(m, "in", 2) : formatLength(m, displayUnit() === "mm" || m < 0.01 ? "mm" : "cm", 1)).replace(/^~/, ""); }   // 前面已经说了「约」，单位模块表示取整的「~」去掉

/** 这份文件里最近建的那张画的画布边长（贴图表里最后一张分层的画走的那一套坐标的宽）；没有 = null。 */
export function recentCanvas(editor: Editor): number | null {
  const S = editor.sceneRef;
  let last: number | null = null;
  for (const t of S.textures.values()) { if (t.content.kind !== "layered") continue; const w = paintPlaceOf(S, t.guid)?.uvSet.width; if (w) last = w; }
  return last;
}

/** 这份文件里最近建的那张画一格多大（米，按它那个物件在世界里的大小）；没有 = null（「按一格多大」那一组的「和上一张画一样」，施工单十六第四节）。 */
export function recentCell(editor: Editor): number | null {
  const S = editor.sceneRef, slots = editor.worldGeom().slots;
  let last: number | null = null;
  for (const t of S.textures.values()) {
    if (t.content.kind !== "layered") continue;
    const p = paintPlaceOf(S, t.guid), slot = p && slots.find((x) => x.pool.def === p.def && x.pool.group === null);
    if (p && slot) last = xformScale(slot.xform) / p.uvSet.pxPerM;
  }
  return last;
}
/** 「按一格多大」的常用档（米；按文件的显示单位：米制 1 cm / 5 mm / 2 mm / 1 mm，英制 1/2 / 1/4 / 1/8 / 1/16 英寸）。 */
export function cellSteps(): readonly number[] { return unitSystem(displayUnit()) === "imperial" ? [0.0127, 0.00635, 0.003175, 0.0015875] : [0.01, 0.005, 0.002, 0.001]; }

/** 面板上选了什么：加进已有的哪张画 / 新开一张多大的（按总大小 = canvas；按一格多大 = density，每米几格、按这个物件自己的长度）。 */
export type PaintStartChoice = { readonly kind: "add"; readonly tex: string } | { readonly kind: "new"; readonly canvas: number } | { readonly kind: "density"; readonly density: number };
type RowValue = PaintStartChoice | { readonly kind: "custom" };

/**
 * 出面板、等选；取消 = null。物件已经有画、选中的面里有还没进画的（施工单十五第三节，11-11 下午改）：上面几行「加进已有的画：〈名字〉」
 * （这个物件每张画一行；用那张画自己的密度、不问大小；铺不下的灰掉写原因），下面照常五行大小 =「新开一张画」。没有画 = 只有五行大小。
 */
export async function pickPaintStart(editor: Editor): Promise<PaintStartChoice | null> {
  const S = editor.sceneRef, def = S.defOfContext(editor.context), body = S.def(def).body;
  const picked = editor.selectedMeshFaces(), u = { def, sel: picked.length ? ({ kind: "mesh", faces: new Set(picked), edges: new Set(), verts: new Set() } satisfies MeshSelection) : null };   // 只读选中的面（以前强转去读私有字段）
  const faces = body.kind === "mesh" ? facesToStart(S, u) : [];
  const target = body.kind === "mesh" ? paintTargetSize(body.kernel, faces) : undefined;   // 面表 / 三角形表跟着画哪些面（打开占多少的一部分；施工单十九第 1 刀）
  const scale = xformScale(S.xformOfContext(editor.context)), recent = recentCanvas(editor);
  const existing = body.kind === "mesh" ? paintsOf(S, def) : [];
  const addRows: SheetRow<RowValue>[] = existing.map((p) => ({ label: `加进已有的画：${p.name}`, value: { kind: "add", tex: p.tex }, note: `用这张画的精细度（一格约 ${cellSay(scale / p.uvSet.pxPerM)}）、${p.uvSet.fit === "density" ? "放不下时画布会变大" : `画布定的是 ${p.uvSet.width} × ${p.uvSet.height}`}` }));
  const sizeRows: SheetRow<RowValue>[] = CANVAS_SIZES.map((n) => ({
    label: existing.length ? `新开一张画：${n} × ${n}` : `${n} × ${n}`, value: { kind: "new", canvas: n }, note: `一格多大：在算…　${memSay(n, n, target)}`,
    ...(recent === n ? { marked: "上次用的" } : {}),
  }));
  // 按一格多大（施工单十六第四节）：和上一张画一样 · 常用的几档 · 自己填；每行算出画布多大、打开占多少（画布取接近正方形、够用的最小宽高；以后加面画布会变大）
  const lastCell = recentCell(editor), pre = existing.length ? "新开一张画：" : "";
  const cells = [...(lastCell ? [{ m: lastCell, label: `${pre}和上一张画一样（一格约 ${cellSay(lastCell)}）` }] : []), ...cellSteps().map((m) => ({ m, label: `${pre}一格 ${cellSay(m)}` }))];
  const cellRows: SheetRow<RowValue>[] = [
    ...cells.map((c) => ({ label: c.label, value: { kind: "density", density: scale / c.m } as const, note: "画布多大：在算…" })),
    { label: `${pre}一格多大，自己填…`, value: { kind: "custom" }, note: "填一个长度（比如 3 mm）；画布跟着算" },
  ];
  const mirrored = S.meshMirrors.get(def)?.mode === "force";   // 强行对称开着（施工单十五第三节；user 确认「物件开着对称，所以是feature不是bug」）
  const count = faces.length;
  const msg = (existing.length ? `选中的这 ${count} 张面还没进画：加进已有的画（用它的精细度），或者新开一张画（选多大）。` : `给这 ${count} 张面铺一张画：画布越大越细，打开它占的显存也越多。`)
    + (mirrored ? "\n这个物件开着对称：两半共用一块画布，画一边，另一边会照镜子出现。" : "");
  const fits = (density: number): ReturnType<typeof layoutFaces> => (body.kind === "mesh" ? layoutFaces(body.kernel, faces, { density, style: "patches", squarish: true }) : { ok: false, reason: "不是网格体" });
  const choice = await openRowsSheet<RowValue>(existing.length ? "开始画" : "画布多大", msg, [...addRows, ...sizeRows, ...cellRows], (fill) => {
    if (body.kind !== "mesh") return;
    const k = body.kernel;
    let i = 0;
    const next = (): void => {
      if (i >= addRows.length + CANVAS_SIZES.length + cells.length || !fill.alive()) return;
      if (i < addRows.length) {   // 加进已有的画：照补面的铺法试一遍（不改东西），放不下 = 灰掉写原因；按总大小开的画不长大（施工单十六第四节）
        const p = existing[i], r = layoutAppend(uvMesh(k, body.uvSetSlots), p.uvSet.guid, [], faces, { width: p.uvSet.width, height: p.uvSet.height }, p.uvSet.pxPerM, { gap: gapForCanvas(p.uvSet.width), grow: p.uvSet.fit === "density" });
        if (!r.ok) fill.set(i, { blocked: p.uvSet.fit === "density" ? `加不进去：${r.reason}` : `这张画定的是 ${p.uvSet.width} × ${p.uvSet.height}，放不下了` });
      } else if (i >= addRows.length + CANVAS_SIZES.length) {   // 按一格多大：真铺一遍（只算不改）
        const r = fits(scale / cells[i - addRows.length - CANVAS_SIZES.length].m);
        if (r.ok) fill.set(i, { note: `画布 ${r.width} × ${r.height}　${memSay(r.width, r.height, target)}` });
        else fill.set(i, { blocked: `太大了：${r.reason}` });
      } else {
        const n = CANVAS_SIZES[i - addRows.length], r = layoutFaces(k, faces, { base: n, gap: gapForCanvas(n), style: "patches" });   // 和真开始画同一套（连成片、留的格数跟着画布走）
        if (r.ok && r.density > 0) fill.set(i, { note: `一格约 ${cellSay(scale / r.density)}　${memSay(n, n, target)}` });
        else fill.set(i, { blocked: `铺不下：${r.ok ? "面太小，量不出密度" : r.reason}` });
      }
      i++;
      setTimeout(next, 0);   // 一行一行来：大模型上每档要现铺一遍
    };
    setTimeout(next, 0);
  });
  if (choice?.kind !== "custom") return choice;
  // 自己填：一个长度（照文件的显示单位，什么单位都接）→ 真铺一遍，太大说原因、不关
  let density = 0;
  const text = await openInputSheet("一格多大", {
    message: `给这 ${count} 张面铺一张画，每一格在模型上多大？画布按这个算（接近正方形、够用的最小）；以后加面，画布会跟着变大。`,
    placeholder: unitSystem(displayUnit()) === "imperial" ? "比如 1/8 in" : "比如 3 mm", okLabel: "开始画",
    validate: (t) => {
      const m = parseQuantity(t, { q: "length" });
      if (typeof m !== "number") return m.error;
      if (!(m > 0)) return "要一个大于零的长度";
      const r = fits(scale / m);
      if (!r.ok) return `太大了：${r.reason}`;
      density = scale / m;
      return null;
    },
  });
  return text === null ? null : { kind: "density", density };
}
