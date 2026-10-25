// scale-ref.ts —— B43「人的尺度参考」的 CatsUp 适配层：仓鼠的物体尺寸梯子（vendor/size-ladder/ladder-v2.json）+ 参考实现（src/vendor/size-ladder/ladder-query.mjs，原样不改）。
// 这里只补 CatsUp 自己的三件事，规则都不自己发明：
//   ① 方向：读数是竖着 / 横着 / 斜着 / 平面，按上下文帧（绘图轴 / 组轴）的 z 判，阈值读数据里的 orientation（不写死）；
//   ② 地标：世界级的人人显示，本地知名的按界面语言挑（参考实现把四个地区全收，这里滤掉）；
//   ③ 懒加载：订阅了才拉那 279 KB。
// 显示（user 2026-10-25 定）：tooltip 只管「认」= scaleTooltip；小刻度条管「对」和「停」= scaleRuler（点画刻度线、带画色块）；不吸附。
// 刻度条 / 选单长什么样还没定（先 grill user）。created 2026-10-25 by Claude Opus 5.5
import type { Pt3 } from "../kernel/kernel.ts";
import * as Q from "../vendor/size-ladder/ladder-query.mjs";

/** 交货的身份：和 scripts/pull-size-ladder.mjs 钉的同一个（test/scale-ref.test.ts 核三处一致）。 */
export const LADDER_SHA256 = "fab469371ac49e48865e9eee7f11a1f213fcc1c4514b3a3788847d3bcdfbb527";
export const LADDER_URL = "vendor/size-ladder/ladder-v2.json";

export type Lang = "zh" | "en" | "ja";
export type ScaleDir = "up" | "flat" | "both" | "plan";
export interface Orientation { verticalWithinDeg: number; horizontalWithinDeg: number; planNormalWithinDeg: number }
/** 梯子 JSON（schema size-ladder/3）；形状归仓鼠的数据契约，这里只点名用到的几个字段。 */
export interface Ladder {
  schema: string; version: number; orientation: Orientation; tooltipMax: number;
  starWorlds: string[]; menu: { id: string; theme: string; view: string; names: Record<Lang, string> }[];
  disclaimers: ({ id: string } & Record<Lang, string>)[];
  concepts: { id: string; themes: string[] }[];
  values: { concept: string; regions: string[] | "*"; value: number }[];
  [k: string]: unknown;
}
export interface ScaleQuery { reading: number; dir: ScaleDir }
export interface RulerMark { v: { value: number; tip: Record<Lang, string> }; lo: number; hi: number; shape: "point" | "band" }

const deg = (r: number): number => (r * 180) / Math.PI;
const norm = (v: Pt3): number => Math.hypot(v.x, v.y, v.z);
const absCosTo = (v: Pt3, up: Pt3): number => { const a = norm(v), b = norm(up); return a > 0 && b > 0 ? Math.min(1, Math.abs(v.x * up.x + v.y * up.y + v.z * up.z) / (a * b)) : 0; };

/** 长度读数的方向（v = 量的那根向量，up = 上下文帧的 z）：离竖直 ≤ verticalWithinDeg = 竖；离水平 ≤ horizontalWithinDeg = 横；其余 = 斜；零向量 = null。 */
export function lengthDir(v: Pt3, up: Pt3, o: Orientation): "up" | "flat" | "both" | null {
  if (norm(v) === 0) return null;
  const fromUp = deg(Math.acos(absCosTo(v, up)));
  if (fromUp <= o.verticalWithinDeg + 1e-9) return "up";
  if (90 - fromUp <= o.horizontalWithinDeg + 1e-9) return "flat";
  return "both";
}
/** 面积读数的方向（normal = 面的法向）：法向离上下文帧的 z ≤ planNormalWithinDeg = 平面（地板 / 场地）；墙面这类 = null（数据里的面积都是平面的）。 */
export function areaDir(normal: Pt3, up: Pt3, o: Orientation): "plan" | null {
  if (norm(normal) === 0) return null;
  return deg(Math.acos(absCosTo(normal, up))) <= o.planNormalWithinDeg + 1e-9 ? "plan" : null;
}

/** 界面语言 → 「本地」是哪几个地区（user：中文 → 中国的，日文 → 日本的，英文 → 美欧的）。 */
export function localWorlds(lang: Lang): string[] { return lang === "zh" ? ["CN"] : lang === "ja" ? ["JP"] : ["US", "EU"]; }

const byLang = new WeakMap<Ladder, Map<Lang, Ladder>>();
/** 按界面语言滤过地标的梯子：地标题材的值只留世界级（regions = "*"）和本地的；别的值原样。按 (梯子, 语言) 缓存。 */
export function forLanguage(L: Ladder, lang: Lang): Ladder {
  let m = byLang.get(L);
  if (!m) { m = new Map(); byLang.set(L, m); }
  const hit = m.get(lang);
  if (hit) return hit;
  const landmark = new Set(L.concepts.filter((c) => c.themes.includes("landmark")).map((c) => c.id));
  const local = localWorlds(lang);
  const values = L.values.filter((v) => !landmark.has(v.concept) || v.regions === "*" || v.regions.some((r) => local.includes(r)));
  const out: Ladder = { ...L, values };
  m.set(lang, out);
  return out;
}

/** tooltip（只管「认」）：前 tooltipMax 个短名，「 / 」隔开；没有 = ""。 */
export function scaleTooltip(L: Ladder, subs: readonly string[], q: ScaleQuery, lang: Lang = "zh"): string {
  if (!subs.length || !(q.reading > 0)) return "";
  return Q.tooltip(forLanguage(L, lang), [...subs], q, lang);
}
/** 刻度条（管「对」和「停」）：读数 ÷ factor 到 × factor 里的参考，按值从小到大。 */
export function scaleRuler(L: Ladder, subs: readonly string[], q: ScaleQuery, lang: Lang = "zh", factor = 2): RulerMark[] {
  if (!subs.length || !(q.reading > 0)) return [];
  return Q.ruler(forLanguage(L, lang), [...subs], q, factor) as RulerMark[];
}
export const scaleMenu = (L: Ladder): Ladder["menu"] => L.menu;

let loading: Promise<Ladder> | null = null;
/** 懒加载（订阅了才拉）；失败了下次再试。 */
export function loadLadder(fetchImpl: typeof fetch = fetch): Promise<Ladder> {
  if (!loading) loading = fetchImpl(LADDER_URL).then((r) => { if (!r.ok) throw new Error(`size ladder HTTP ${r.status}`); return r.json() as Promise<Ladder>; }).catch((e) => { loading = null; throw e; });
  return loading;
}
