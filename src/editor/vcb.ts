// vcb.ts —— 数值小窗（SU 的 Measurements / VCB）的纯部分：解析输入、单位、阵列的变换序列。零 DOM，node 直测。
// created 2026-10-21 by Claude Fable 5.1（0.9 QoL #11；user 2026-10-21「sketchup的输入小窗，我希望触屏上有数字键盘，而不是弹软键盘」
// 「就是move rotate scale的精确输入，square circle也有输入精确尺寸，跟着你是用什么单位制度」「move rotate scale的x5 /5以及其他一些feature」）。
//
// 单位制（user 2026-10-21「先默认米吧虽然我喜欢英制」）：内部永远米；输入默认单位 = ctx.unit（出厂 m，菜单可切，先 session），后缀覆盖 m / cm / mm / ft / in 与 ' " 写法；
// 角度用度；缩放用倍数；`24s` = 圆段数；阵列 = `5x` / `*5`（x 在后，免得和橡皮快捷键 X 撞）/ `/5`。
// 语义（SU 同款）：输入作用于**刚做完的那一步**（撤销它、按精确值重做），直到下一步开始；一步做完后可以连续改几次。
import type { Pt3 } from "../kernel/geom.ts";
import type { Xform } from "../scene/xform.ts";
import { rotationAbout, translation } from "../scene/xform.ts";
import { scale3 } from "../kernel/geom.ts";

export type LengthUnit = "m" | "cm" | "mm" | "ft" | "in";
export const LENGTH_UNITS: readonly { id: LengthUnit; label: string }[] = [{ id: "m", label: "米" }, { id: "cm", label: "厘米" }, { id: "mm", label: "毫米" }, { id: "ft", label: "英尺英寸" }, { id: "in", label: "英寸" }];
export interface VcbCtx { unit: LengthUnit; }
/** 数值小窗作用的那一步属于哪类手势（决定怎么读输入）。 */
export type VcbKind = "line" | "rect" | "circle" | "pp" | "offset" | "move" | "rotate" | "scale";

export type VcbValue =
  | { kind: "length"; m: number }
  | { kind: "dims"; a: number; b: number }
  | { kind: "angle"; deg: number }
  | { kind: "factor"; f: number[] }
  | { kind: "segments"; n: number }
  | { kind: "array"; mode: "x" | "/"; n: number };

const UNIT_M: Record<string, number> = { m: 1, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254 };

/** 英制写法：`3'6"`、`3' 6 1/2"`、`42"`、`12'`、`5ft`、`30in`（user 喜欢英制；默认单位 ft 时裸数 = 英尺，in 时 = 英寸）。 */
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

/** 一个数（可带单位后缀）→ 米；角度 / 倍率时忽略长度后缀。 */
function num(part: string, ctx: VcbCtx, as: "length" | "plain"): number | string {
  if (as === "length") { const imp = imperial(part); if (imp !== null) return imp; }
  const m = /^([-+]?(?:\d+\.?\d*|\.\d+))\s*(m|cm|mm|ft|in|°|deg)?$/i.exec(part.trim());
  if (!m) return `看不懂「${part.trim()}」`;
  const v = Number(m[1]);
  if (!Number.isFinite(v)) return `看不懂「${part.trim()}」`;
  if (as === "plain") return v;
  const u = (m[2] ?? ctx.unit).toLowerCase();
  if (!(u in UNIT_M)) return `长度不能带「${m[2]}」`;
  return v * UNIT_M[u];
}

/** 解析输入。失败 → { error }。 */
export function parseVcb(textIn: string, kind: VcbKind, ctx: VcbCtx): VcbValue | { error: string } {
  const text = textIn.trim().toLowerCase().replace(/[，；]/g, ",").replace(/;/g, ",").replace(/×/g, "x");
  if (!text) return { error: "没输入" };
  let m: RegExpExecArray | null;
  if ((m = /^(\d+)\s*s$/.exec(text))) {
    if (kind !== "circle") return { error: "段数只对圆有效" };
    const n = Number(m[1]);
    return n >= 3 && n <= 96 ? { kind: "segments", n } : { error: "段数 3–96" };
  }
  if ((m = /^(?:\*|x)\s*(\d+)$/.exec(text)) || (m = /^(\d+)\s*x$/.exec(text))) {
    const n = Number(m[1]);
    if (kind !== "move" && kind !== "rotate") return { error: "阵列只对移动 / 旋转有效" };
    return n >= 1 && n <= 500 ? { kind: "array", mode: "x", n } : { error: "阵列份数 1–500" };
  }
  if ((m = /^\/\s*(\d+)$/.exec(text))) {
    const n = Number(m[1]);
    if (kind !== "move" && kind !== "rotate") return { error: "阵列只对移动 / 旋转有效" };
    return n >= 1 && n <= 500 ? { kind: "array", mode: "/", n } : { error: "阵列份数 1–500" };
  }
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  switch (kind) {
    case "rotate": {
      if (parts.length !== 1) return { error: "旋转：一个角度（度）" };
      const v = num(parts[0], ctx, "plain");
      return typeof v === "string" ? { error: v } : { kind: "angle", deg: v };
    }
    case "scale": {
      if (parts.length !== 1 && parts.length !== 3) return { error: "缩放：一个倍率，或 x,y,z 三个" };
      const f: number[] = [];
      for (const p of parts) { const v = num(p, ctx, "plain"); if (typeof v === "string") return { error: v }; if (Math.abs(v) < 1e-3) return { error: "倍率不能是 0" }; f.push(v); }
      return { kind: "factor", f };
    }
    case "rect": {
      if (parts.length !== 2) return { error: "矩形：宽,高" };
      const a = num(parts[0], ctx, "length"), b = num(parts[1], ctx, "length");
      if (typeof a === "string") return { error: a };
      if (typeof b === "string") return { error: b };
      if (Math.abs(a) < 1e-6 || Math.abs(b) < 1e-6) return { error: "边长不能是 0" };
      return { kind: "dims", a, b };
    }
    default: {
      if (parts.length !== 1) return { error: "一个长度" };
      const v = num(parts[0], ctx, "length");
      if (typeof v === "string") return { error: v };
      if (Math.abs(v) < 1e-6 && kind !== "move") return { error: "长度不能是 0" };
      return { kind: "length", m: v };
    }
  }
}

/** 阵列：x = 外部阵列（共 n 份，第 k 份在 k·delta）；/ = 内分（n 份匀布在 0..delta 之间，第 k 份在 k·delta/n）。 */
export function arrayTranslations(delta: Pt3, mode: "x" | "/", n: number): Xform[] {
  const out: Xform[] = [];
  for (let k = 1; k <= n; k++) out.push(translation(mode === "x" ? scale3(delta, k) : scale3(delta, k / n)));
  return out;
}
/** 旋转阵列（同上，角度版）。 */
export function arrayRotations(center: Pt3, axis: Pt3, angle: number, mode: "x" | "/", n: number): Xform[] {
  const out: Xform[] = [];
  for (let k = 1; k <= n; k++) out.push(rotationAbout(center, axis, mode === "x" ? angle * k : (angle * k) / n));
  return out;
}

/** 小窗旁的提示字：这一步能输什么。 */
export function vcbPrompt(kind: VcbKind | null): string {
  switch (kind) {
    case "line": return "长度";
    case "rect": return "宽,高";
    case "circle": return "半径 · 段数 24s";
    case "pp": return "高度";
    case "offset": return "距离";
    case "move": return "距离 · 阵列 5x /5";
    case "rotate": return "角度";
    case "scale": return "倍率 · x,y,z";
    default: return "";
  }
}

/** 长度显示（小窗回显用）：按 unit；英尺英寸写成 3' 6.5"。 */
export function fmtVcbLength(m: number, unit: LengthUnit): string {
  if (unit === "ft") {
    const sign = m < 0 ? "-" : "", a = Math.abs(m);
    const totalIn = a / UNIT_M.in;
    let ft = Math.floor(totalIn / 12), inch = totalIn - ft * 12;
    inch = Math.round(inch * 16) / 16;
    if (inch >= 12) { ft += 1; inch -= 12; }
    return `${sign}${ft}' ${Number(inch.toFixed(2))}"`;
  }
  if (unit === "in") return `${Number((m / UNIT_M.in).toFixed(2))}"`;
  const v = m / UNIT_M[unit];
  return `${Number(v.toFixed(unit === "m" ? 3 : 1))} ${unit}`;
}
