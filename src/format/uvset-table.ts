// format/uvset-table.ts —— 顶层扩展 CATSUP_uvsets 1.0（排法表）的一行 ↔ UvSetDoc（读 / 写两端同一份；施工单十八 3.1）。created 2026-11-13 by Claude Opus 5.5
// 一行 = { guid, name, width, height, pxPerM, fit, freed?, …别的键 }：
//   · guid：表里两行同一个号 = 这几行都不认（不挑第一个、不现铸：列是按这个号找它的）。
//   · width / height：正整数（格），每边 ≤ 16384（内存里 32 位浮点还能把 1/1024 格表示精确的上限）。pxPerM：正的有限数。
//   · fit：字符串，必写。"density" / "size" 认得；别的值原样带回，行为 = 这套排法什么都不自动动（scene.ts uvSetAutoPlaces）。
//   · freed：整数列表、四个一组 [x0, y0, x1, y1]（左上含、右下不含）；缺 = 空。形状不对 = 当不认识的键带回（同上：这套排法不自动给新面找地方）。
//   · 别的键：连同它们指着的字节原样带回（carryJson / landCarried，照贴图行）。
// 坏的一行 = 这一行不认、记进 notes（模型照开；指着它的列和画在 paint-read.ts 里各自按「没有」处理、也记一笔）。表的先后没有意思。
import type { ViewSink } from "./brep-codec.ts";
import type { UvSetDoc } from "./document.ts";
import type { FormatReadNotes, UvRowWhy } from "./migrate/index.ts";
import { isGuid } from "./guid.ts";
import { carryJson, landCarried } from "./texture-table.ts";

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
/** 行里本版认识的键（其余的原样带回）。 */
const ROW_KEYS = new Set(["guid", "name", "width", "height", "pxPerM", "fit", "freed"]);
/** 画布每边的上限（格）：内存里 32 位浮点能把 1/1024 格表示精确的上限（施工单十八 3.1）。 */
export const UV_CANVAS_MAX_SIDE = 16384;
/** 铺法自己能把画布长到多大（按一格多大开的画布往下加高的上限；paint/layout.ts 的缺省 maxSize）。 */
export const UV_LAYOUT_MAX_SIDE = 4096;
/** 一行排法的画布能到的最大范围 [0, 宽) × [0, 高)：宽 = 这一行的宽；高 = 这一行的高和铺法上限里大的那个（施工单十八第 2 刀统筹预审 B：旧画只可能在这里面）。 */
export function freedReach(width: number, height: number): readonly [number, number] { return [width, Math.max(height, UV_LAYOUT_MAX_SIDE)]; }

/** freed 的形状对不对：整数、四个一组、每组 x0 < x1、y0 < y1、都 ≥ 0、不出这一行画布能到的范围（freedReach）。超出 = 形状不对（不悄悄截短）。 */
function freedOk(x: unknown, reach: readonly [number, number]): x is number[] {
  if (!Array.isArray(x) || x.length % 4 !== 0) return false;
  for (let i = 0; i < x.length; i += 4) {
    const [a, b, c, d] = x.slice(i, i + 4) as unknown[];
    if (![a, b, c, d].every((v) => typeof v === "number" && Number.isInteger(v) && v >= 0)) return false;
    if (!((a as number) < (c as number) && (b as number) < (d as number))) return false;
    if ((c as number) > reach[0] || (d as number) > reach[1]) return false;
  }
  return true;
}

/** 读整张表（list）：坏的行不认、同号的几行都不认，各记一笔。 */
export function readUvSetRows(list: unknown, view: (bv: number) => Uint8Array, notes: FormatReadNotes): UvSetDoc[] {
  const bad = (guid: string | null, name: string, why: UvRowWhy): void => { (notes.uvSetRowsDropped ??= []).push({ guid, name, why }); };
  if (!Array.isArray(list)) { bad(null, "", "not-a-list"); return []; }
  const posSide = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x > 0 && x <= UV_CANVAS_MAX_SIDE;
  const kept: UvSetDoc[] = [];
  for (const r of list as unknown[]) {
    if (!isObj(r)) { bad(null, "", "not-an-object"); continue; }
    const name = typeof r.name === "string" ? r.name : "";
    if (!(typeof r.guid === "string" && isGuid(r.guid))) { bad(null, name, "bad-guid"); continue; }
    if (!posSide(r.width) || !posSide(r.height)) { bad(r.guid, name, "bad-size"); continue; }
    if (!(typeof r.pxPerM === "number" && Number.isFinite(r.pxPerM) && r.pxPerM > 0)) { bad(r.guid, name, "bad-density"); continue; }
    if (typeof r.fit !== "string") { bad(r.guid, name, "bad-fit"); continue; }
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) if (!ROW_KEYS.has(k)) extra[k] = v;
    const freed = r.freed === undefined ? undefined : freedOk(r.freed, freedReach(r.width, r.height)) ? Object.freeze([...r.freed]) : (extra.freed = r.freed, undefined);   // 形状不对 = 当不认识的键带回
    kept.push(Object.freeze({ guid: r.guid, name, width: r.width, height: r.height, pxPerM: r.pxPerM, fit: r.fit, ...(freed?.length ? { freed } : {}), ...(Object.keys(extra).length ? { extra: carryJson(extra, view) } : {}) }));
  }
  const count = new Map<string, number>();
  for (const u of kept) count.set(u.guid, (count.get(u.guid) ?? 0) + 1);
  return kept.filter((u) => { if (count.get(u.guid) === 1) return true; bad(u.guid, u.name, "duplicate-guid"); return false; });
}

/** 写一行：不认识的键铺在前、认识的键后写（认识的永远赢）；freed 空 = 不写。 */
export function writeUvSetRow(r: UvSetDoc, sink: ViewSink): Record<string, unknown> {
  const extra = r.extra ? (landCarried(r.extra, sink) as Record<string, unknown>) : {};
  return { ...extra, guid: r.guid, name: r.name, width: r.width, height: r.height, pxPerM: r.pxPerM, fit: r.fit, ...(r.freed?.length ? { freed: [...r.freed] } : {}) };
}
