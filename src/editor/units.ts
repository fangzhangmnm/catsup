// units.ts —— 单位的深模块（窄接口）：长度 / 面积 / 角度怎么念，全 app 只有这一处知道。created 2026-10-24 by Claude Opus 5.5
// user 2026-10-24「小bug，dnd单位的时候你tooltip还是SI，到时候让opus系统的理一下，做一个窄接口，所有的单位都用同一个深模块窄接口」。
//
// 接口：
//   fmtLen(m) / fmtArea(m²) / fmtDeg(rad) —— 读数（提示、吸附标签、选区读数）：按「当前显示单位」念；工具不用知道单位。
//   setDisplayUnit(u) —— 编辑器换单位时调一次（editor.vcbUnit 的 setter）；没有别的入口改它。
//   formatLength(m, unit) —— 单位由上下文定死的场合（栅格制式自带单位：D&D 的 5 ft 不念成 1.524 m）。
//   fmtVcbLength(m, unit) —— 数值小窗回显（精确、不带 ~）。
//   unitFromSettings / unitToSettings —— 文档 settings.displayUnit 的读写（单位跟着模型走，SU 同款；字段一直在格式里，不升版）。
//   —— 量（2026-10-28 加；user「都单位和用户选择单位对齐」「你可以做一个单位输入输出的深模块」「速度可以识别配速，然后你可以输入其他单位文本框能接住」
//   「以后速度单位的显示用户也能调，现在先把数据契约做好，以后理一下。可能不同的载具速度单位不一样」）：
//   QuantityTag = 这个数是什么量（长度 / 速度）+ 速度用在谁身上（走路 / 车 / 船 / 飞机）。存的永远是 SI；显示单位由标签定：
//   长度 = 当前显示单位；速度 = 覆盖（setSpeedUnit，以后的设置页写它；现在没存）?? 按谁在动 + 公制英制的默认（走路 = 配速，车 = km/h / mph，船 / 飞机 = 节）。
//   formatQuantity / parseQuantity / nudgeQuantity —— 显示 / 读输入（任何单位都接：3'6"、1.2m、5:30/km、12 km/h、6 mph、10 kn）/ − + 按显示单位的整格走。
//   parseLength —— 一段长度文字 → 米（数值小窗也用它；原来住 vcb.ts）。
// 内部单位永远是 SI（米）；只有显示层换单位（user 10-22「引擎统一吃 SI，显示层换」）。B43「≈ 人高 / 一个车位」的参考短语以后也从这里出。

export type LengthUnit = "m" | "cm" | "mm" | "ft" | "in";
export const LENGTH_UNITS: readonly { id: LengthUnit; label: string }[] = [{ id: "m", label: "米" }, { id: "cm", label: "厘米" }, { id: "mm", label: "毫米" }, { id: "ft", label: "英尺英寸" }, { id: "in", label: "英寸" }];
export const UNIT_M: Readonly<Record<LengthUnit, number>> = { m: 1, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254 };
export const isLengthUnit = (x: unknown): x is LengthUnit => typeof x === "string" && x in UNIT_M;

let display: LengthUnit = "m";
export function setDisplayUnit(u: LengthUnit): void { display = u; }
export function displayUnit(): LengthUnit { return display; }

/** 英尺英寸：1/16″ 取整，写成 5' 6.5"。 */
function feetInches(m: number): { text: string; shownM: number } {
  const sign = m < 0 ? "-" : "", a = Math.abs(m);
  const totalIn = a / UNIT_M.in;
  let ft = Math.floor(totalIn / 12), inch = Math.round((totalIn - ft * 12) * 16) / 16;
  if (inch >= 12) { ft += 1; inch -= 12; }
  return { text: `${sign}${ft}' ${Number(inch.toFixed(2))}"`, shownM: (m < 0 ? -1 : 1) * (ft * 12 + inch) * UNIT_M.in };
}

/** 读数：按给定单位；数值经过取整的前面带「~」（和原来米制的 fmtLen 同一个约定）。米制下 < 1 m 自动念厘米（原行为逐字不变）。 */
export function formatLength(m: number, unit: LengthUnit, digits = 1): string {
  if (unit === "ft") { const r = feetInches(m); return (Math.abs(r.shownM - m) > 1e-6 ? "~" : "") + r.text; }
  if (unit === "in") { const v = m / UNIT_M.in, shown = Number(v.toFixed(2)); return (Math.abs(v - shown) * UNIT_M.in > 1e-6 ? "~" : "") + `${shown}"`; }
  const sub: LengthUnit = unit === "m" && Math.abs(m) < 1 ? "cm" : unit;
  const val = m / UNIT_M[sub], shown = Number(val.toFixed(digits));
  return (Math.abs(val - shown) > 1e-6 ? "~" : "") + shown.toFixed(digits) + ` ${sub}`;
}
export function fmtLen(m: number, digits = 1): string { return formatLength(m, display, digits); }

/** 面积读数：米制 < 1 m² 念 cm²（原行为）；cm / mm 念各自的平方；英制念平方英尺（英寸单位念平方英寸）。 */
export function fmtArea(m2: number): string {
  const u = display;
  if (u === "ft" || u === "in") {
    const k = u === "ft" ? UNIT_M.ft : UNIT_M.in, v = m2 / (k * k);
    return `${v.toFixed(v < 10 ? 2 : 1)} ${u === "ft" ? "ft²" : "in²"}`;
  }
  if (u === "cm" || u === "mm") { const k = UNIT_M[u], v = m2 / (k * k); return `${v.toFixed(v < 10 ? 2 : 0)} ${u}²`; }
  return m2 < 1 ? `${(m2 * 1e4).toFixed(m2 * 1e4 < 10 ? 2 : 0)} cm²` : `${m2.toFixed(m2 < 10 ? 3 : 2)} m²`;
}

export const fmtDeg = (rad: number): string => `${(rad * 180 / Math.PI).toFixed(1)}°`;

/** 数值小窗回显（精确，不带 ~）：英尺英寸写 3' 6.5"。 */
export function fmtVcbLength(m: number, unit: LengthUnit): string {
  if (unit === "ft") return feetInches(m).text;
  if (unit === "in") return `${Number((m / UNIT_M.in).toFixed(2))}"`;
  const v = m / UNIT_M[unit];
  return `${Number(v.toFixed(unit === "m" ? 3 : 1))} ${unit}`;
}

/** 文档 settings.displayUnit ↔ 显示单位（格式里英尺英寸一直写作 "ft-in"）。 */
export function unitFromSettings(s: { displayUnit?: string }): LengthUnit { const v = s.displayUnit === "ft-in" ? "ft" : s.displayUnit; return isLengthUnit(v) ? v : "m"; }
export function unitToSettings(u: LengthUnit): string { return u === "ft" ? "ft-in" : u; }

// ---------- 输入：长度（原 vcb.ts 的 imperial / num 长度那半，搬来这里 2026-10-28）----------
/** 英制写法：`3'6"`、`3' 6 1/2"`、`42"`、`12'`、`5ft`、`30in`。不是英制写法 → null。 */
function imperial(part: string): number | null {
  const t = part.trim().replace(/[’′]/g, "'").replace(/[”″]/g, '"');
  const m = /^([-+]?)\s*(?:(\d+(?:\.\d+)?)\s*(?:'|ft)\s*)?(?:(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?\s*(?:"|in))?$/i.exec(t);
  if (!m || (m[2] === undefined && m[3] === undefined)) return null;
  const ft = m[2] ? Number(m[2]) : 0;
  let inch = m[3] ? Number(m[3]) : 0;
  if (m[4] && m[5] && Number(m[5]) > 0) inch += Number(m[4]) / Number(m[5]);
  const v = ft * UNIT_M.ft + inch * UNIT_M.in;
  return m[1] === "-" ? -v : v;
}
/** 一段长度文字 → 米；裸数 = 按 unit。看不懂 / 带了不是长度的后缀 → { error }（人话）。 */
export function parseLength(part: string, unit: LengthUnit): number | { error: string } {
  const imp = imperial(part);
  if (imp !== null) return imp;
  const m = /^([-+]?(?:\d+\.?\d*|\.\d+))\s*(m|cm|mm|ft|in|°|deg|米|厘米|毫米)?$/i.exec(part.trim());
  if (!m || !Number.isFinite(Number(m[1]))) return { error: `看不懂「${part.trim()}」` };
  const zh: Record<string, LengthUnit> = { 米: "m", 厘米: "cm", 毫米: "mm" };
  const u = (m[2] ? zh[m[2]] ?? m[2] : unit).toLowerCase();
  if (!(u in UNIT_M)) return { error: `长度不能带「${m[2]}」` };
  return Number(m[1]) * UNIT_M[u as LengthUnit];
}

// ---------- 量：带标签的数（长度 / 速度）的显示、读输入、− + ----------
export type Quantity = "length" | "speed";
/** 速度用在谁身上：同一个 m/s，人走看配速、车看 km/h / mph、船和飞机看节（user 10-22「我会马拉松，开车和开飞机……配速，mph和knots这样我能和现实体感比」）。 */
export type Mover = "foot" | "road" | "water" | "air";
export interface QuantityTag { readonly q: Quantity; /** 速度才有；不给 = 走路。 */ readonly mover?: Mover }
export type SpeedUnit = "m/s" | "km/h" | "mph" | "kn" | "min/km" | "min/mi";
export const SPEED_UNITS: readonly { id: SpeedUnit; label: string }[] = [
  { id: "min/km", label: "配速（分钟每公里）" }, { id: "min/mi", label: "配速（分钟每英里）" }, { id: "km/h", label: "公里每小时" }, { id: "mph", label: "英里每小时" }, { id: "kn", label: "节" }, { id: "m/s", label: "米每秒" },
];
const MI = 1609.344, KN = 1852 / 3600;
/** 每种速度单位：显示数 ↔ m/s（配速 = 每公里 / 英里多少秒，越大越慢）。 */
const SPEED: Readonly<Record<SpeedUnit, { toSI(d: number): number; fromSI(v: number): number; step: number; pace?: number }>> = {
  "m/s": { toSI: (d) => d, fromSI: (v) => v, step: 0.1 },
  "km/h": { toSI: (d) => d / 3.6, fromSI: (v) => v * 3.6, step: 0.5 },
  mph: { toSI: (d) => (d * MI) / 3600, fromSI: (v) => (v * 3600) / MI, step: 0.5 },
  kn: { toSI: (d) => d * KN, fromSI: (v) => v / KN, step: 0.5 },
  "min/km": { toSI: (d) => 1000 / d, fromSI: (v) => 1000 / v, step: 5, pace: 1000 },
  "min/mi": { toSI: (d) => MI / d, fromSI: (v) => MI / v, step: 5, pace: MI },
};
const speedOverride = new Map<Mover, SpeedUnit>();
/** 速度显示单位覆盖（以后的设置页写；现在只在内存里，还没存 = user「以后理一下」）。null = 回默认。 */
export function setSpeedUnit(mover: Mover, u: SpeedUnit | null): void { if (u) speedOverride.set(mover, u); else speedOverride.delete(mover); }
/** 公制还是英制（跟着当前长度显示单位）。 */
export function unitSystem(u: LengthUnit = display): "metric" | "imperial" { return u === "ft" || u === "in" ? "imperial" : "metric"; }
/** 这类东西的速度现在按什么单位显示。 */
export function speedUnitFor(mover: Mover = "foot"): SpeedUnit {
  const o = speedOverride.get(mover);
  if (o) return o;
  const imp = unitSystem() === "imperial";
  return mover === "foot" ? (imp ? "min/mi" : "min/km") : mover === "road" ? (imp ? "mph" : "km/h") : "kn";
}

/** 配速 分'秒"（秒取整；59.6 秒进位）。 */
function paceText(sec: number): string { let m = Math.floor(sec / 60), s = Math.round(sec - m * 60); if (s >= 60) { m += 1; s -= 60; } return `${m}'${String(s).padStart(2, "0")}"`; }
/** 显示（精确，不带 ~）：长度按当前显示单位（米 3 位小数、英尺英寸到 1/16″）；速度按 speedUnitFor。 */
export function formatQuantity(si: number, tag: QuantityTag): string {
  if (tag.q === "length") return fmtVcbLength(si, display);
  const u = speedUnitFor(tag.mover), S = SPEED[u];
  if (S.pace) return si > 0 ? `${paceText(S.fromSI(si))}/${u === "min/km" ? "km" : "mi"}` : "—";
  return `${Number(S.fromSI(si).toFixed(u === "m/s" ? 2 : 1))} ${u}`;
}

/** 速度文字 → m/s：配速 `5:30` `5'30"` `5:30/km` `9:00/mi` `5.5 min/km`；`12 km/h` `kph` `6 mph` `10 kn` `kt` `节` `3 m/s`；裸数 = 当前显示单位。 */
function parseSpeed(text: string, mover: Mover | undefined): number | { error: string } {
  const t = text.trim().toLowerCase().replace(/：/g, ":").replace(/[’′]/g, "'").replace(/[”″]/g, '"').replace(/\s+/g, " ");
  const cur = speedUnitFor(mover), imp = unitSystem() === "imperial";
  const per = (w: string | undefined): SpeedUnit => (w ? (/^(mi|英里)$/.test(w) ? "min/mi" : "min/km") : SPEED[cur].pace ? cur : imp ? "min/mi" : "min/km");
  const pos = (v: number): number | { error: string } => (v > 0 && Number.isFinite(v) ? v : { error: "速度要大于 0" });
  let m = /^(\d+)\s*(?::|')\s*(\d{1,2}(?:\.\d+)?)\s*(?:"|'')?\s*(?:(?:min)?\s*\/\s*(km|mi|公里|英里))?$/.exec(t);
  if (m) { const sec = Number(m[1]) * 60 + Number(m[2]); return sec > 0 ? SPEED[per(m[3])].toSI(sec) : { error: "配速要大于 0" }; }
  m = /^(\d*\.?\d+)\s*(m\/s|mps|km\/h|kmh|kph|km\/hr|公里\/小时|公里每小时|mph|mi\/h|kn|kts?|knots?|节|min\/km|\/km|min\/mi|\/mi)?$/.exec(t);
  if (!m) return { error: `看不懂「${text.trim()}」（例：5:30/km、12 km/h、6 mph、10 kn、3 m/s）` };
  const d = Number(m[1]), w = m[2];
  const u: SpeedUnit = !w ? cur : /^(m\/s|mps)$/.test(w) ? "m/s" : /^(km\/h|kmh|kph|km\/hr|公里\/小时|公里每小时)$/.test(w) ? "km/h" : /^(mph|mi\/h)$/.test(w) ? "mph" : /^(kn|kts?|knots?|节)$/.test(w) ? "kn" : /mi$/.test(w) ? "min/mi" : "min/km";
  if (d <= 0) return { error: "速度要大于 0" };
  return pos(SPEED[u].pace ? SPEED[u].toSI(d * 60) : SPEED[u].toSI(d));   // 裸数 / min/km 的小数 = 分钟
}
/** 读输入：什么单位都接（长度 = parseLength 那一套，速度 = 配速 / km/h / mph / 节 / m/s）；裸数 = 当前显示单位。 */
export function parseQuantity(text: string, tag: QuantityTag): number | { error: string } {
  return tag.q === "length" ? parseLength(text, display) : parseSpeed(text, tag.mover);
}

/** 显示单位下的「一格」：长度从 SI 步长换过去取整齐数（英制按 1/16″ … 1′ 的格）；速度用各单位自己的格（配速 5 秒）。 */
const NICE = [1, 2, 2.5, 5];
function niceStep(x: number): number { const e = Math.floor(Math.log10(x)); let best = 10 ** e; for (const k of NICE) { const c = k * 10 ** e; if (Math.abs(Math.log(c / x)) < Math.abs(Math.log(best / x))) best = c; } const up = 10 ** (e + 1); return Math.abs(Math.log(up / x)) < Math.abs(Math.log(best / x)) ? up : best; }
const INCH_STEPS = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 2, 3, 6, 12, 24, 36, 60, 120];
function lengthGrid(siStep: number): { per: number; step: number } {
  const u = display;
  if (u === "ft" || u === "in") { const x = siStep / UNIT_M.in; return { per: UNIT_M.in, step: INCH_STEPS.reduce((b, c) => (Math.abs(Math.log(c / x)) < Math.abs(Math.log(b / x)) ? c : b)) }; }
  const per = UNIT_M[u];
  return { per, step: niceStep(siStep / per) };
}
/**
 * − / + 一下：在显示单位的整格上走一格（先落到格上，再走；user「都单位和用户选择单位对齐」）。dir = +1 = SI 变大（配速是越走越快 = 数变小）。
 * 速度走不动（配速走到 0 以下）= 原样。
 */
export function nudgeQuantity(si: number, dir: 1 | -1, tag: QuantityTag, siStep: number): number {
  const eps = 1e-9;
  const walk = (d: number, g: number, up: boolean): number => (up ? (Math.floor(d / g + eps) + 1) * g : (Math.ceil(d / g - eps) - 1) * g);
  if (tag.q === "length") { const { per, step } = lengthGrid(siStep); return walk(si / per, step, dir > 0) * per; }
  const S = SPEED[speedUnitFor(tag.mover)], d = S.fromSI(si), up = S.pace ? dir < 0 : dir > 0, nd = walk(d, S.step, up);
  return nd > 0 ? S.toSI(nd) : si;
}
