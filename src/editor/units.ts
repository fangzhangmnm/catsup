// units.ts —— 单位的深模块（窄接口）：长度 / 面积 / 角度怎么念，全 app 只有这一处知道。created 2026-10-24 by Claude Opus 5.5
// user 2026-10-24「小bug，dnd单位的时候你tooltip还是SI，到时候让opus系统的理一下，做一个窄接口，所有的单位都用同一个深模块窄接口」。
//
// 接口：
//   fmtLen(m) / fmtArea(m²) / fmtDeg(rad) —— 读数（提示、吸附标签、选区读数）：按「当前显示单位」念；工具不用知道单位。
//   setUnitSystem(sys) —— 编辑器换单位制时调一次（editor.setGrid 的 system）；没有别的入口改它。显示单位由单位制推：公制 = 米（读数按大小自动挑 fm … Gm）、英制 / D&D = 英尺英寸。
//     （2026-10-30 user「把显示长度单位，grid制式，格距收成一个东西。就是单位」「至少在ux层面支持从fm 更小到Mm Gm之类的」；英制 / D&D 的读数 ≥ 1 英里时后面加「约 x mi」，
//     只加在看的字上、能打字的框不加——user「要不要加一个约xxxmile，但是这样会不会导致屎山？」；输入框打 mi / km / µm … 都接——user「输入框输入mile也要能接得住」）
//   formatLength(m, unit) —— 单位由上下文定死的场合（栅格制式自带单位：D&D 的 5 ft 不念成 1.524 m）。
//   fmtVcbLength(m, unit) —— 数值小窗回显（精确、不带 ~）。
//   setUnitSystem(sys) —— 单位制（公制 / 英制 / D&D）决定显示单位；文档里存的是 settings.unitSystem（grid-settings.ts，CATSUP_document 3.4）。
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

export type UnitSystem = "metric" | "imperial" | "dnd";   // 和 grid-settings.ts 同一个（那边是网格那半，这里是读写字那半）
let system: UnitSystem = "metric", display: LengthUnit = "m";
export function setUnitSystem(sys: UnitSystem): void { system = sys; display = sys === "metric" ? "m" : "ft"; }
export function unitSystemNow(): UnitSystem { return system; }
export function displayUnit(): LengthUnit { return display; }
/** 公制按大小挑的那一串（读数用；输入另认中文 / µm 的几种写法）。 */
const SI_PREFIXED: readonly (readonly [string, number])[] = [["Gm", 1e9], ["Mm", 1e6], ["km", 1e3], ["m", 1], ["cm", 1e-2], ["mm", 1e-3], ["µm", 1e-6], ["nm", 1e-9], ["pm", 1e-12], ["fm", 1e-15]];
/** 公制：按大小挑单位（≥ 1 km 写 km … < 1 cm 写 mm … 一路到 fm；0 写 cm，和以前「< 1 m 写 cm」一致）。 */
function metricUnit(m: number): readonly [string, number] {
  const a = Math.abs(m);
  if (a === 0) return ["cm", 1e-2];
  for (const u of SI_PREFIXED) if (a >= u[1] * (1 - 1e-12)) return u;
  return SI_PREFIXED[SI_PREFIXED.length - 1];
}
export const MILE_M = 1609.344;
/**
 * 一个整齐长度（网格的一层 / 吸附的一档）的短写：公制按大小挑 fm … Gm、去掉多余的零（10 m、1 km、100 µm）；英制 / D&D 写英寸分数、英寸或英尺（1/16 in、6 in、5 ft），
 * ≥ 1 英里后面加「约 x mi」。sys 缺 = 当前单位制。
 */
export function fmtStep(m: number, sys: UnitSystem = system): string {
  const trim = (v: number): string => String(Number(v.toPrecision(6)));
  if (sys === "metric") { const [u, k] = metricUnit(m); return `${trim(m / k)} ${u}`; }
  const inch = m / UNIT_M.in, ft = inch / 12;
  const tail = Math.abs(m) >= MILE_M ? `（约 ${Number((Math.abs(m) / MILE_M).toFixed(Math.abs(m) >= 10 * MILE_M ? 0 : 1))} mi）` : "";
  if (ft >= 1 && Math.abs(ft - Math.round(ft)) < 1e-6) return `${Math.round(ft)} ft${tail}`;
  if (inch < 1) for (const d of [2, 4, 8, 16, 32, 64]) if (Math.abs(inch * d - Math.round(inch * d)) < 1e-6) return `${Math.round(inch * d)}/${d} in`;
  return inch < 12 ? `${trim(inch)} in` : `${trim(ft)} ft${tail}`;
}

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
  const [sub, k] = unit === "m" ? metricUnit(m) : [unit, UNIT_M[unit]] as const;
  const val = m / k, shown = Number(val.toFixed(digits));
  return (Math.abs(val - shown) > 1e-6 ? "~" : "") + shown.toFixed(digits) + ` ${sub}`;
}
/** 看的字（提示 / 吸附标签 / 读数 / 网格标记）：按当前单位制；英制 / D&D ≥ 1 英里后面加「约 x mi」（不进网格进位、不进输入框）。 */
export function fmtLen(m: number, digits = 1): string { return formatLength(m, display, digits) + aboutMiles(m); }
export function aboutMiles(m: number): string { return system !== "metric" && Math.abs(m) >= MILE_M ? `（约 ${Number((Math.abs(m) / MILE_M).toFixed(Math.abs(m) >= 10 * MILE_M ? 0 : 1))} mi）` : ""; }

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
  if (unit === "m") { const [u, k] = metricUnit(m); return `${Number((m / k).toPrecision(7))} ${u}`; }   // 公制按大小挑单位、精确到 7 位有效数字
  const v = m / UNIT_M[unit];
  return `${Number(v.toFixed(1))} ${unit}`;
}

/** 文档 settings.displayUnit ↔ 显示单位（格式里英尺英寸一直写作 "ft-in"）。 */

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
/** 输入认的长度单位（米数）：大小写只在 Mm / Gm（兆米 / 吉米）和 mm 之间有区别，别的不分大小写。 */
const UNIT_WORDS: Readonly<Record<string, number>> = {
  m: 1, cm: 1e-2, mm: 1e-3, km: 1e3, um: 1e-6, mum: 1e-6, micron: 1e-6, microns: 1e-6, "µm": 1e-6, "μm": 1e-6, nm: 1e-9,   // mum / micron = µm 的键盘写法（user 10-30「mum是不是就是um，输入的时候」） pm: 1e-12, fm: 1e-15, ft: 0.3048, in: 0.0254, mi: MILE_M, mile: MILE_M, miles: MILE_M,
  米: 1, 厘米: 1e-2, 毫米: 1e-3, 公里: 1e3, 千米: 1e3, 微米: 1e-6, 纳米: 1e-9, 英尺: 0.3048, 英寸: 0.0254, 英里: MILE_M,
};
export function parseLength(part: string, unit: LengthUnit): number | { error: string } {
  const imp = imperial(part);
  if (imp !== null) return imp;
  const m = /^([-+]?(?:\d+\.?\d*|\.\d+))\s*([a-zA-Zµμ\u4e00-\u9fff]+|°)?$/.exec(part.trim());
  if (!m || !Number.isFinite(Number(m[1]))) return { error: `看不懂「${part.trim()}」` };
  if (!m[2]) return Number(m[1]) * UNIT_M[unit];
  const w = m[2], k = w === "Mm" ? 1e6 : w === "Gm" ? 1e9 : UNIT_WORDS[w] ?? UNIT_WORDS[w.toLowerCase()];
  if (k === undefined) return { error: `长度不能带「${w}」` };
  return Number(m[1]) * k;
}

// ---------- 量：带标签的数（长度 / 速度）的显示、读输入、− + ----------
/** 量的种类。angle（2026-10-28 晚加）= 存弧度、显示 / 打字按度；factor = 倍数（无量纲，打 % 也认）——键盘起手里打数（S Z 0）和单位文本框走同一个读法（user「所以就是一个parser啦，看一下能不能和单位文本框深模块窄接口」）。 */
export type Quantity = "length" | "speed" | "angle" | "factor";
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
export function unitSystem(u: LengthUnit = display): "metric" | "imperial" { return u === "ft" || u === "in" ? "imperial" : "metric"; }   // 速度那半：D&D 当英制
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
  if (tag.q === "angle") return `${Number((si * 180 / Math.PI).toFixed(2))}°`;
  if (tag.q === "factor") return `×${Number(si.toFixed(4))}`;
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
  if (tag.q === "angle") return parseAngle(text);
  if (tag.q === "factor") return parseFactor(text);
  return tag.q === "length" ? parseLength(text, display) : parseSpeed(text, tag.mover);
}
const NUM = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)`;
/** 角度文字 → 弧度：裸数 = 度；`30°` `30deg` `30度` `0.5rad`。 */
function parseAngle(text: string): number | { error: string } {
  const m = new RegExp(`^(${NUM})\\s*(°|deg|度|rad)?$`, "i").exec(text.trim());
  if (!m || !Number.isFinite(Number(m[1]))) return { error: `看不懂「${text.trim()}」（例：30、-45°、0.5rad）` };
  return m[2]?.toLowerCase() === "rad" ? Number(m[1]) : Number(m[1]) * Math.PI / 180;
}
/** 倍数文字 → 倍数：`0` `1.5` `-1`（翻过去）`50%`。 */
function parseFactor(text: string): number | { error: string } {
  const m = new RegExp(`^(${NUM})\\s*(%)?$`).exec(text.trim());
  if (!m || !Number.isFinite(Number(m[1]))) return { error: `看不懂「${text.trim()}」（例：0、1.5、-1、50%）` };
  return m[2] ? Number(m[1]) / 100 : Number(m[1]);
}
/**
 * 打字时这个键能不能接进这一段量的文字（键盘起手里打数用；和 parseQuantity 是同一张「这个量怎么写」）：
 * 数字 / 小数点 / 正负号永远能；单位那几个字只在已经有数之后（长度 m c i n f t ' " 空格 /，角度 ° d e g r a，倍数 %）。
 * X / Y / Z 永远不接（它们是锁轴，打到一半也能锁，Blender 同款）。
 */
export function quantityKey(tag: QuantityTag, buf: string, key: string): boolean {
  if (key.length !== 1) return false;
  if (/^[0-9.\-+]$/.test(key)) return true;
  if (!/[0-9]/.test(buf) || /^[xyz]$/i.test(key)) return false;
  const units = tag.q === "length" ? /^[mcinftkupglesµμ'" \/米厘毫公千微纳英尺寸里]$/i : tag.q === "angle" ? /^[°degra度]$/i : tag.q === "factor" ? /^%$/ : /^[a-z:'"\/ ]$/i;
  return units.test(key);
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
  if (tag.q === "angle" || tag.q === "factor") return walk(si, siStep, dir > 0);
  const S = SPEED[speedUnitFor(tag.mover)], d = S.fromSI(si), up = S.pace ? dir < 0 : dir > 0, nd = walk(d, S.step, up);
  return nd > 0 ? S.toSI(nd) : si;
}
