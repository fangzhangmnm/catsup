// ladder-query.mjs —— 物体尺寸梯子（schema size-ladder/4，ladder-v3.json 起）的参考实现：纯函数、无依赖。
// 规则见 ai-docs/20261024-数据契约.md「推荐用法」；和 scripts/build.py 的拖动预览、v1 的 name 字段逐条对过答案（scripts/test_query.mjs）。
//
//   import * as Q from "./ladder-query.mjs";
//   const L = await (await fetch("ladder-v3.json")).json();
//   Q.menu(L)                                                    // 选单：[{ id: "garden/JPSTYLE", names: { zh: "园林 · 日式" }, inherits, reminders }, …]
//   Q.tooltip(L, ["interior/ALL"], { reading: 0.914, dir: "up" })   // "台面 36 in / 栏杆 / 台面 中日"（只订室内时的答案）
//   Q.ruler(L, ["interior/ALL"], { reading: 2.4, dir: "up" })   // 刻度条：[{ v, lo, hi, shape }]，点画刻度线、带画色块
//   Q.remindersOf(L, "body/ALL")                                 // 这一项要给用户看的新手提醒：[{ id, zh, en, ja }, …]
//
// 选单单选（user 1025：有了继承就选一个够了）；订阅参数仍是数组，传一个就行（传几个 = 并集，同一个值只算一次）。
// 继承（menu[].inherits）：父项的可见值也可见，本项已有的「东西 × 量法」盖掉父项的（同概念覆盖），本项概念的 replaces 删掉父类。

const cache = new WeakMap();
function ix(L) {
  let x = cache.get(L);
  if (x) return x;
  const map = (a) => Object.fromEntries(a.map((o) => [o.id, o]));
  x = { concept: map(L.concepts), measure: map(L.defs.measures), grade: map(L.defs.grades), view: map(L.defs.worldViews),
        menu: map(L.menu), reminder: map(L.reminders) };
  cache.set(L, x);
  return x;
}

export const menu = (L) => L.menu;
/** 选单项 sub 要给用户看的新手提醒（已含继承来的父项的；顺序 = 数据里的顺序，先自己的） */
export const remindersOf = (L, sub) => (ix(L).menu[sub]?.reminders ?? []).map((id) => ix(L).reminder[id]);
export const regionsOf = (L, v) => (v.regions === "*" ? L.starWorlds : v.regions);
export const shapeOf = (L, v) => ix(L).grade[v.grade].shape;
export function orientOf(L, v) {
  const m = ix(L).measure[v.measure];
  return v.orient ?? (m.dim === "area" ? "plan" : m.feeds);
}

/** 合理范围 [lo, hi]：带 = range 放宽到至少 ÷/× bandMinRatio（没 range 用 bandDefaultRatio）；点 = range，没有就 ÷/× pointDefaultRatio */
export function span(L, v) {
  if (shapeOf(L, v) === "point") return v.range ? [v.range.lo, v.range.hi] : [v.value / L.pointDefaultRatio, v.value * L.pointDefaultRatio];
  if (!v.range) return [v.value / L.bandDefaultRatio, v.value * L.bandDefaultRatio];
  return [Math.min(v.range.lo, v.value / L.bandMinRatio), Math.max(v.range.hi, v.value * L.bandMinRatio)];
}

/** 正常版名字：东西全名 · 量哪里 · label · 档（常见 / 规格不写） */
export function nameOf(L, v, lang = "zh") {
  const X = ix(L), c = X.concept[v.concept], m = X.measure[v.measure];
  const parts = [c.names[lang] + (m.dim === "area" ? "" : (lang === "en" ? " " : "·") + m[lang])];
  if (v.label) parts.push(v.label[lang]);
  if (v.grade !== "typical" && v.grade !== "spec") parts.push(X.grade[v.grade][lang]);
  return parts.join(lang === "ja" ? "・" : " · ");
}

const key = (v) => v.concept + "|" + v.measure;

/** 一个选单项可见的值 Map(下标 → { i, v, agnostic })：本项 + 继承（seen 防环） */
function visibleOne(L, sub, seen) {
  const X = ix(L), item = X.menu[sub];
  const [theme, view] = item ? [item.theme, item.view] : sub.split("/");
  const members = X.view[view] ? X.view[view].worlds : [view];
  const override = X.view[view]?.override ?? [];
  const agnostic = L.orientAgnosticThemes.includes(theme);
  const inTheme = [];
  L.values.forEach((v, i) => {
    if ((v.use ?? "ref") !== "ref" || X.measure[v.measure].anchor === "gap") return;
    if (X.concept[v.concept].themes.includes(theme) || (v.alsoThemes ?? []).includes(theme)) inTheme.push([i, v]);
  });
  // 亚种覆盖（儿童）：东西 × 量法只要有覆盖世界的值，就只用那些值；覆盖值的概念 replaces 的概念整个不显示（删掉父类）
  const isOv = (v) => regionsOf(L, v).some((r) => override.includes(r));
  const ov = inTheme.filter(([, v]) => isOv(v));
  const covered = new Set(ov.map(([, v]) => key(v)));
  let gone = new Set(ov.flatMap(([, v]) => X.concept[v.concept].replaces ?? []));
  const out = new Map();
  for (const [i, v] of inTheme) {
    if (isOv(v) || (regionsOf(L, v).some((r) => members.includes(r)) && !covered.has(key(v)) && !gone.has(v.concept))) out.set(i, { i, v, agnostic });
  }
  // 继承：父项的值，本项已有的东西 × 量法、本项概念 replaces 的概念不要
  const keys = new Set([...out.values()].map((h) => key(h.v)));
  gone = new Set([...out.values()].flatMap((h) => X.concept[h.v.concept].replaces ?? []));
  for (const p of item?.inherits ?? []) {
    if (seen.has(p)) continue;
    seen.add(p);
    for (const [i, h] of visibleOne(L, p, seen)) if (!out.has(i) && !keys.has(key(h.v)) && !gone.has(h.v.concept)) out.set(i, h);
  }
  return out;
}

/** 订阅（menu 的 id；CatsUp 单选，传一个）→ 可见的参考值 [{ i, v, agnostic }]，按数组下标排；传几个就取并集 */
export function visible(L, subscriptions) {
  const out = new Map();
  for (const sub of subscriptions) {
    for (const [i, h] of visibleOne(L, sub, new Set([sub]))) out.set(i, { ...h, agnostic: h.agnostic || (out.get(i)?.agnostic ?? false) });
  }
  return [...out.values()].sort((a, b) => a.i - b.i);
}

const ACCEPT = { up: ["up", "both"], flat: ["flat", "both"], both: ["both"], plan: ["plan"] };
function fits(L, hit, dir) {
  const o = orientOf(L, hit.v);
  if (dir === "plan" || o === "plan") return dir === "plan" && o === "plan";
  return hit.agnostic || ACCEPT[dir].includes(o);   // 万物不分竖横
}

/** 候选：读数落在合理范围里的全部值（可重叠），先按评级、同级按离读数多近排。dir = "up" 竖 / "flat" 横 / "both" 斜 / "plan" 平面 */
export function candidates(L, subscriptions, { reading, dir }) {
  const X = ix(L);
  return visible(L, subscriptions)
    .filter((h) => fits(L, h, dir))
    .filter((h) => { const [lo, hi] = span(L, h.v); return lo - 1e-9 <= reading && reading <= hi + 1e-9; })
    .sort((a, b) => (X.concept[b.v.concept].rank - X.concept[a.v.concept].rank)
      || (Math.abs(Math.log(reading / a.v.value)) - Math.abs(Math.log(reading / b.v.value))));
}

/** tooltip（只管「认」）：候选里前 tooltipMax 个不重复的短版名字 */
export function tooltip(L, subscriptions, query, lang = "zh") {
  const tips = [];
  for (const { v } of candidates(L, subscriptions, query)) {
    if (!tips.includes(v.tip[lang])) tips.push(v.tip[lang]);
    if (tips.length >= L.tooltipMax) break;
  }
  return tips.join(" / ");
}

/** 刻度条（管「对」和「停」）：合理范围和 读数 ÷ factor 到 × factor 有交集的参考；shape = "point" 画刻度线，"band" 画色块 */
export function ruler(L, subscriptions, { reading, dir }, factor = 2) {
  return visible(L, subscriptions)
    .filter((h) => fits(L, h, dir))
    .map((h) => { const [lo, hi] = span(L, h.v); return { v: h.v, lo, hi, shape: shapeOf(L, h.v) }; })
    .filter((m) => m.hi >= reading / factor && m.lo <= reading * factor)
    .sort((a, b) => a.v.value - b.v.value);
}
