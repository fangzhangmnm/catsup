// ladder-query.mjs —— 物体尺寸梯子（schema size-ladder/3，ladder-v2.json 起）的参考实现：纯函数、无依赖。
// 规则见 ai-docs/20261024-数据契约.md「推荐用法」；和 scripts/build.py 的拖动预览、v1 的 name 字段逐条对过答案（scripts/test_query.mjs）。
//
//   import * as Q from "./ladder-query.mjs";
//   const L = await (await fetch("ladder-v2.json")).json();
//   Q.menu(L)                                                    // 选单：[{ id: "garden/JPSTYLE", names: { zh: "园林 · 日式" } }, …]
//   Q.tooltip(L, ["interior/ALL", "body/ALL"], { reading: 0.914, dir: "up" })   // "台面 36 in / 栏杆 / 台面 中日"
//   Q.ruler(L, ["interior/ALL"], { reading: 2.4, dir: "up" })   // 刻度条：[{ v, lo, hi, shape }]，点画刻度线、带画色块
//
// 订阅可以多选（user：「订阅多个你做一下」）：候选 = 所选各项的并集，同一个值只算一次；任务之间不做继承。

const cache = new WeakMap();
function ix(L) {
  let x = cache.get(L);
  if (x) return x;
  const map = (a) => Object.fromEntries(a.map((o) => [o.id, o]));
  x = { concept: map(L.concepts), measure: map(L.defs.measures), grade: map(L.defs.grades), view: map(L.defs.worldViews) };
  cache.set(L, x);
  return x;
}

export const menu = (L) => L.menu;
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

/** 订阅（menu 的 id，可多选）→ 可见的参考值 [{ i, v, agnostic }]：并集，按数组下标去重 */
export function visible(L, subscriptions) {
  const X = ix(L), out = new Map();
  for (const sub of subscriptions) {
    const [theme, view] = sub.split("/");
    const members = X.view[view] ? X.view[view].worlds : [view];
    const override = X.view[view]?.override ?? [];
    const agnostic = L.orientAgnosticThemes.includes(theme);
    const inTheme = [];
    L.values.forEach((v, i) => {
      if ((v.use ?? "ref") !== "ref" || X.measure[v.measure].anchor === "gap") return;
      if (X.concept[v.concept].themes.includes(theme) || (v.alsoThemes ?? []).includes(theme)) inTheme.push([i, v]);
    });
    // 继承 + 覆盖（儿童）：东西 × 量法只要有覆盖亚种的值，就只用那些值
    const key = (v) => v.concept + "|" + v.measure;
    const covered = new Set(inTheme.filter(([, v]) => regionsOf(L, v).some((r) => override.includes(r))).map(([, v]) => key(v)));
    for (const [i, v] of inTheme) {
      const rs = regionsOf(L, v);
      if (rs.some((r) => override.includes(r)) || (rs.some((r) => members.includes(r)) && !covered.has(key(v)))) {
        out.set(i, { i, v, agnostic: agnostic || (out.get(i)?.agnostic ?? false) });
      }
    }
  }
  return [...out.values()];
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
