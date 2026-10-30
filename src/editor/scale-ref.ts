// scale-ref.ts —— B43「人的尺度参考」的 CatsUp 适配层：仓鼠的物体尺寸梯子（vendor/size-ladder/ladder-v2.json）+ 参考实现（src/vendor/size-ladder/ladder-query.mjs，原样不改）。
// 这里只补 CatsUp 自己的三件事，规则都不自己发明：
//   ① 方向：读数是竖着 / 横着 / 斜着 / 平面，按上下文帧（绘图轴 / 组轴）的 z 判，阈值读数据里的 orientation（不写死）；
//   ② 地标：世界级的人人显示，本地知名的按界面语言挑（参考实现把四个地区全收，这里滤掉）；
//   ③ 懒加载：订阅了才拉那 279 KB。
// 显示（user 2026-10-25 定，试用后收窄）：只有跟指针提示框第二行的字，按离典型值多近定深浅；不吸附；没有刻度条 / 迷你带。
// 选单 = 多选取并集（user「要不还是不如多重订阅吧，不然不同的室内室外会组合烦死」），默认室内 + 室外。created 2026-10-25 by Claude Opus 5.5
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
export interface ScaleTipItem { name: string; strength: number; hit: boolean; shape: "point" | "band"; value: number; lo: number; hi: number }   // hit / shape：v0.13.56 起不再另外强调到没到，留着字段给以后
export interface ScaleTipView { reading: number; dir: ScaleDir; items: ScaleTipItem[] }

/** 读数在合理范围 [lo, hi] 里离典型值 value 多近（对数尺，0..1）。 */
export function closeness(reading: number, value: number, lo: number, hi: number): number {
  const side = reading <= value ? Math.log(value / lo) : Math.log(hi / value);
  const off = Math.abs(Math.log(reading / value));
  if (!(side > 1e-12)) return off < 1e-12 ? 1 : 0;
  return Math.max(0, Math.min(1, 1 - off / side));
}

/** 冻住的梯子（user「你选好了不就freeze了吗只有一个梯子」）：订阅一定，可见的值就定了——选单一变就把并集算好、只留这一份，
 *  拖动时参考实现只在这几百个值里查，不再每次从全部值里筛。只缓存最近一份（换订阅 = 旧的丢掉），不随用过的组合长。
 *  正确性：把「可见值」再交给参考实现的 visible 跑一遍结果不变（继承、覆盖、删掉父类都是在可见集里自洽的）——test/scale-ref.test.ts 拿全量对拍。 */
let frozen: { L: Ladder; lang: Lang; key: string; ladder: Ladder } | null = null;
export function frozenLadder(L: Ladder, subs: readonly string[], lang: Lang = "zh"): Ladder {
  const key = [...subs].sort().join(",");
  if (frozen && frozen.L === L && frozen.lang === lang && frozen.key === key) return frozen.ladder;
  const LL = forLanguage(L, lang);
  const keep = new Set((Q.visible(LL, [...subs]) as { v: unknown }[]).map((h) => h.v));
  const ladder: Ladder = { ...LL, values: LL.values.filter((v) => keep.has(v)) };
  frozen = { L, lang, key, ladder };
  return ladder;
}

// ---------- 快路径（user 2026-10-25「这个事几乎每帧都在算……性能和能效敏感区。不应该为了这种小花浪费系统资源。你可以优化一下。或者反应慢一点也没事」） ----------
// ① 候选池：订阅一定，按方向把「合格的值」提前摊成纯数字表（lo / hi / 典型值 / 名字 / 评级），拖动时只扫这张表，不再每次跑参考实现的 visible（Map + 数组分配）。
// ② 读数分档：0.5% 一档，同一档直接用上次的结果（拖动时大部分帧落在同一档 = 零计算）。
// 方向合格判定（fits）照抄参考实现 ladder-query.mjs 的五行；test/scale-ref.test.ts 拿参考实现的 candidates 对拍，仓鼠改了逻辑这里会红。
interface PoolEntry { lo: number; hi: number; value: number; name: string; rank: number }
const ACCEPT: Record<ScaleDir, readonly string[]> = { up: ["up", "both"], flat: ["flat", "both"], both: ["both"], plan: ["plan"] };
let pool: { F: Ladder; lang: Lang; byDir: Record<ScaleDir, PoolEntry[]> } | null = null;
function poolFor(L: Ladder, subs: readonly string[], lang: Lang): Record<ScaleDir, PoolEntry[]> {
  const F = frozenLadder(L, subs, lang);
  if (pool && pool.F === F && pool.lang === lang) return pool.byDir;
  const rank = new Map((F.concepts as { id: string; rank?: number }[]).map((c) => [c.id, c.rank ?? 1]));
  const hits = Q.visible(F, [...subs]) as { v: { concept: string; value: number; tip: Record<Lang, string> }; agnostic: boolean }[];
  const byDir = { up: [], flat: [], both: [], plan: [] } as Record<ScaleDir, PoolEntry[]>;
  for (const h of hits) {
    const o = Q.orientOf(F, h.v) as string, [lo, hi] = Q.span(F, h.v) as [number, number];
    const e: PoolEntry = { lo, hi, value: h.v.value, name: h.v.tip[lang], rank: rank.get(h.v.concept) ?? 1 };
    for (const dir of ["up", "flat", "both", "plan"] as ScaleDir[]) {
      const ok = dir === "plan" || o === "plan" ? dir === "plan" && o === "plan" : h.agnostic || ACCEPT[dir].includes(o);
      if (ok) byDir[dir].push(e);
    }
  }
  pool = { F, lang, byDir };
  return byDir;
}
const LOG_STEP = Math.log(1.005);
let last: { byDir: Record<ScaleDir, PoolEntry[]>; dir: ScaleDir; bucket: number; view: ScaleTipView | null } | null = null;

/** 提示框的数据：候选（读数落在合理范围里的全部）按名字去重，按挑选优先排好（评级高的先、同级离典型值近的先）；宿主按「最多几条」截、截下来再按深浅排。没订阅 = null。 */
export function scaleTipView(L: Ladder, subs: readonly string[], q: ScaleQuery, lang: Lang = "zh"): ScaleTipView | null {
  if (!subs.length || !(q.reading > 0)) return null;
  const byDir = poolFor(L, subs, lang), bucket = Math.round(Math.log(q.reading) / LOG_STEP);
  if (last && last.byDir === byDir && last.dir === q.dir && last.bucket === bucket) return last.view;
  const best = new Map<string, ScaleTipItem & { rank: number }>();
  for (const e of byDir[q.dir]) {
    if (q.reading < e.lo - 1e-9 || q.reading > e.hi + 1e-9) continue;
    const strength = closeness(q.reading, e.value, e.lo, e.hi), prev = best.get(e.name);
    if (!prev || strength > prev.strength) best.set(e.name, { name: e.name, strength, hit: false, shape: "band", value: e.value, lo: e.lo, hi: e.hi, rank: e.rank });
  }
  // 挑哪几条 = 仓鼠的规则（user 当时定的「评级排序」）：评级高的先、同级离典型值近的先——门这种人人都有画面的不会被正好落在典型值上的冷门东西挤掉
  // （v0.13.52–64 误把「浓的放前面」当成挑选规则 = 0.8 / 1.0 m 门被床宽、淋浴宽挤出前三；user「我0.1m snap的时候没有看到门宽」）。
  // 挑出来以后怎么排（深的在前）归宿主（scale-tip.ts）。
  const items = [...best.values()].sort((a, b) => b.rank - a.rank || Math.abs(Math.log(q.reading / a.value)) - Math.abs(Math.log(q.reading / b.value))).map(({ rank: _r, ...it }) => it);
  const view = items.length ? { reading: q.reading, dir: q.dir, items } : null;
  last = { byDir, dir: q.dir, bucket, view };
  return view;
}

// ---------- 选单（多选）+ 跟着文件存 ----------
/** 新文件 / 没存过这项的旧文件默认勾哪几项（user「默认室内加室外」）。 */
export const DEFAULT_SCALE_REFS: readonly string[] = ["interior/ALL", "exterior/ALL"];
/** 选单 id 改过名的（仓鼠 v3：人体 · 儿童 body/CHILD → body/KIDS）：读到旧 id 换成新的。 */
const RENAMED_REFS: Readonly<Record<string, string>> = { "body/CHILD": "body/KIDS" };
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));
/** 文件 settings：`scaleRefs`（数组；[] = 不显示）；没写 = 默认。v0.13.52–56 单选时写的 `scaleRef`（字符串，"none" = 不显示）照样读。认不出的 id 原样留着（不显示）。 */
export function scaleRefsFromSettings(s: { scaleRefs?: unknown; scaleRef?: unknown }): string[] {
  const fix = (v: string): string => RENAMED_REFS[v] ?? v;
  if (Array.isArray(s.scaleRefs)) return [...new Set(s.scaleRefs.filter((v): v is string => typeof v === "string").map(fix))];
  if (typeof s.scaleRef === "string") return s.scaleRef === "none" ? [] : [fix(s.scaleRef)];
  return [...DEFAULT_SCALE_REFS];
}
/** 写回：默认不写键（默认文档字节不变，同 gridPreset）；旧的单选键 scaleRef 不再写。 */
export function scaleRefsToSettings<T extends object>(s: T, refs: readonly string[]): T & { scaleRefs?: string[] } {
  const { scaleRef: _a, scaleRefs: _b, ...rest } = s as T & { scaleRef?: string; scaleRefs?: string[] };
  return (sameSet(refs, DEFAULT_SCALE_REFS) ? rest : { ...rest, scaleRefs: [...refs] }) as T & { scaleRefs?: string[] };
}

/** 提醒（数据里 reminders；界面 10-25 叫「新手提醒」，10-30 user 要求改名 + 改成全量 →「适用范围与出处」= allReminders；这个按选单项挑的版本留给以后用）：每个选单项给哪几条写在数据里（menu[].reminders，已并上继承来的），
 *  勾了几项 = 几项的提醒并起来、同一条只出一次（先勾的在前）。 */
/** 数据里的全部提醒（静态清单，跟选了哪些无关；user 10-30「新手提醒改成全量的……因为readme window一般是静态的」）。 */
export function allReminders(L: Ladder, lang: Lang = "zh"): { id: string; text: string }[] {
  return (L.reminders ?? []).filter(Boolean).map((r) => ({ id: r.id, text: r[lang] }));
}
export function remindersFor(L: Ladder, subs: readonly string[], lang: Lang = "zh"): { id: string; text: string }[] {
  const out = new Map<string, string>();
  for (const sub of subs) for (const r of (Q.remindersOf(L, sub) as ({ id: string } & Record<Lang, string>)[]).filter(Boolean)) if (!out.has(r.id)) out.set(r.id, r[lang]);
  return [...out].map(([id, text]) => ({ id, text }));
}
