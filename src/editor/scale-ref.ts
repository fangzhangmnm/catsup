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
export const LADDER_SHA256 = "e161c8835a16024192b6206fe0ca977aa8b472f7f7981039ca15a11e6b5f278f";
export const LADDER_URL = "vendor/size-ladder/ladder-v3.json";

export type Lang = "zh" | "en" | "ja";
export type ScaleDir = "up" | "flat" | "both" | "plan";
export interface Orientation { verticalWithinDeg: number; horizontalWithinDeg: number; planNormalWithinDeg: number }
/** 梯子 JSON（schema size-ladder/3）；形状归仓鼠的数据契约，这里只点名用到的几个字段。 */
export interface Ladder {
  schema: string; version: number; orientation: Orientation; tooltipMax: number;
  starWorlds: string[]; menu: { id: string; theme: string; view: string; names: Record<Lang, string>; inherits?: string[]; reminders?: string[] }[];
  reminders: ({ id: string } & Record<Lang, string>)[];
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

// ---------- 2026-10-25 grill 定案后的部分（Claude Opus 5.5） ----------
// user：都在跟指针的提示框里，不另起一条刻度条（「不要让用户眼睛还要看别的地方」）；带 = 按离典型值多近定浓淡、点（规格）一进范围发亮；
// 「浓的放前面」「有一个最多条目数」；样式「多试试吧」（浓淡字 / 航空迷你带 / 每项小条，宿主画，这里只出数据）；选单 = 单选（继承归仓鼠 v3）。

/** 工具交来的原始几何（世界系）；方向和挑哪个数由 readingOf 定，工具不管。 */
export type ScaleGeom =
  | { kind: "length"; vec: Pt3 }                       // 画线 / 卷尺 / 移动 / 偏移 / 推拉：正在拖的那段
  | { kind: "rect"; u: Pt3; v: Pt3; normal: Pt3 }      // 矩形 / 旋转矩形：两条边 + 法向
  | { kind: "circle"; radius: number; normal: Pt3 };   // 圆 / 多边形

const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
/** 读数 + 方向（user 定：矩形平放 = 面积、竖着 = 竖边的高、斜的不配；圆 = 直径，平放 = 横、别的 = 斜）。null = 不配参考。 */
export function readingOf(g: ScaleGeom, up: Pt3, o: Orientation): ScaleQuery | null {
  if (g.kind === "length") { const dir = lengthDir(g.vec, up, o); return dir ? { reading: norm(g.vec), dir } : null; }
  if (g.kind === "circle") { if (!(g.radius > 0)) return null; return { reading: 2 * g.radius, dir: areaDir(g.normal, up, o) === "plan" ? "flat" : "both" }; }
  if (areaDir(g.normal, up, o) === "plan") { const a = norm(cross(g.u, g.v)); return a > 0 ? { reading: a, dir: "plan" } : null; }
  const side = absCosTo(g.u, up) >= absCosTo(g.v, up) ? g.u : g.v;
  return lengthDir(side, up, o) === "up" ? { reading: norm(side), dir: "up" } : null;
}

/** 提示框里的一个名字：strength = 读数离它典型值多近（1 = 正好在典型值，0 = 在合理范围边上，对数尺）；hit = 规格点进了范围。 */
export interface ScaleTipItem { name: string; strength: number; hit: boolean; shape: "point" | "band"; value: number; lo: number; hi: number }
/** 刻度上的一格（航空迷你带用）：窗口 = 读数 ÷ factor 到 × factor。 */
export interface ScaleTapeMark { name: string; value: number; lo: number; hi: number; shape: "point" | "band" }
export interface ScaleTipView { reading: number; dir: ScaleDir; items: ScaleTipItem[]; marks: ScaleTapeMark[]; window: [number, number] }

/** 读数在合理范围 [lo, hi] 里离典型值 value 多近（对数尺，0..1）。 */
export function closeness(reading: number, value: number, lo: number, hi: number): number {
  const side = reading <= value ? Math.log(value / lo) : Math.log(hi / value);
  const off = Math.abs(Math.log(reading / value));
  if (!(side > 1e-12)) return off < 1e-12 ? 1 : 0;
  return Math.max(0, Math.min(1, 1 - off / side));
}

/** 提示框的数据：候选（读数落在合理范围里的全部）按名字去重、浓的排前（同样浓按评级）；marks = 迷你带窗口里的全部参考。宿主按「最多几条」截。 */
export function scaleTipView(L: Ladder, sub: string | null, q: ScaleQuery, lang: Lang = "zh", factor = 1.5): ScaleTipView | null {
  if (!sub || !(q.reading > 0)) return null;
  const LL = forLanguage(L, lang), subs = [sub];
  const rank = new Map((LL.concepts as { id: string; rank?: number }[]).map((c) => [c.id, c.rank ?? 1]));
  const best = new Map<string, ScaleTipItem & { rank: number }>();
  for (const h of Q.candidates(LL, subs, q) as { v: { concept: string; value: number; tip: Record<Lang, string> } }[]) {
    const [lo, hi] = Q.span(LL, h.v) as [number, number], shape = Q.shapeOf(LL, h.v) as "point" | "band";
    const it = { name: h.v.tip[lang], strength: closeness(q.reading, h.v.value, lo, hi), hit: shape === "point", shape, value: h.v.value, lo, hi, rank: rank.get(h.v.concept) ?? 1 };
    const prev = best.get(it.name);
    if (!prev || it.strength > prev.strength) best.set(it.name, it);
  }
  const items = [...best.values()].sort((a, b) => b.strength - a.strength || b.rank - a.rank).map(({ rank: _r, ...it }) => it);
  const marks = (Q.ruler(LL, subs, q, factor) as RulerMark[]).map((m) => ({ name: m.v.tip[lang], value: m.v.value, lo: m.lo, hi: m.hi, shape: m.shape }));
  if (!items.length && !marks.length) return null;
  return { reading: q.reading, dir: q.dir, items, marks, window: [q.reading / factor, q.reading * factor] };
}

// ---------- 选单（单选）+ 跟着文件存 ----------
/** 新文件 / 没存过这项的旧文件默认看哪项（暂定「室内」：user「对新手非常有用」；默认勾哪项还没拍，等 user）。 */
export const DEFAULT_SCALE_REF = "interior/ALL";
/** 文件 settings.scaleRef：没写 = 默认；"none" = 不显示；别的 = 选单 id（认不出的原样留着、不显示）。 */
/** 选单 id 改过名的（仓鼠 v3：人体 · 儿童 body/CHILD → body/KIDS）：读到旧 id 换成新的。 */
const RENAMED_REFS: Readonly<Record<string, string>> = { "body/CHILD": "body/KIDS" };
export function scaleRefFromSettings(s: { scaleRef?: unknown }): string | null {
  const v = s.scaleRef;
  if (v === undefined) return DEFAULT_SCALE_REF;
  if (v === "none" || typeof v !== "string") return null;
  return RENAMED_REFS[v] ?? v;
}
export function scaleRefToSettings<T extends object>(s: T, ref: string | null): T & { scaleRef?: string } {
  const { scaleRef: _old, ...rest } = s as T & { scaleRef?: string };
  if (ref === DEFAULT_SCALE_REF) return rest as T;                 // 默认不写键 = 默认文档字节不变（同 gridPreset）
  return { ...rest, scaleRef: ref ?? "none" } as T & { scaleRef: string };
}

/** 「参考须知」（数据里叫 reminders「新手提醒」）：每个选单项给哪几条写在数据里（menu[].reminders，已并上继承来的父项的），这里只照着取三语原文。
 *  （v0.13.52 时 v2 数据没路由、这里临时按题材配过一张表；v3 到了按退场条件删掉。） */
export function remindersFor(L: Ladder, sub: string | null, lang: Lang = "zh"): { id: string; text: string }[] {
  if (!sub) return [];
  return (Q.remindersOf(L, sub) as ({ id: string } & Record<Lang, string>)[]).filter(Boolean).map((r) => ({ id: r.id, text: r[lang] }));
}
