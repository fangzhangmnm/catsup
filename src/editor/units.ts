// units.ts —— 单位的深模块（窄接口）：长度 / 面积 / 角度怎么念，全 app 只有这一处知道。created 2026-10-24 by Claude Opus 5.5
// user 2026-10-24「小bug，dnd单位的时候你tooltip还是SI，到时候让opus系统的理一下，做一个窄接口，所有的单位都用同一个深模块窄接口」。
//
// 接口：
//   fmtLen(m) / fmtArea(m²) / fmtDeg(rad) —— 读数（提示、吸附标签、选区读数）：按「当前显示单位」念；工具不用知道单位。
//   setDisplayUnit(u) —— 编辑器换单位时调一次（editor.vcbUnit 的 setter）；没有别的入口改它。
//   formatLength(m, unit) —— 单位由上下文定死的场合（栅格制式自带单位：D&D 的 5 ft 不念成 1.524 m）。
//   fmtVcbLength(m, unit) —— 数值小窗回显（精确、不带 ~）。
//   unitFromSettings / unitToSettings —— 文档 settings.displayUnit 的读写（单位跟着模型走，SU 同款；字段一直在格式里，不升版）。
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
