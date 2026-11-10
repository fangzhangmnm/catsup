// pressure-level —— 全局压感强度四档（无 / 弱 / 中 / 强），纯函数 + 一个进程级当前档。
// created 2026-09-05 by Claude Fable 5.1（user 2026-09-05：「之前朋友抱怨的没压感，有一个可能是我自己手感别人不喜欢，
//   建议压感设置进settings，给无弱中强四档」）。
//
// 语义：作用在输入层（input.ts effectivePressureFor 的出口，EMA 之后），对所有工具一视同仁；每支笔自己的
//   sizeCoeff/opaCoeff/flowCoeff/pressureGamma 照旧在引擎里叠加——本档是「这台设备/这个人对压感的总口味」，
//   与笔预设正交，笔不用动。
//   - none  ：p ≡ 1（压感不参与；画满宽，不是鼠标的 0.5——「无压感」= 所有输入一样，含鼠标）。
//   - weak  ：p^0.6（轻压就已经比较粗，压感响应变钝）。
//   - mid   ：p 原样（= 2026-09-05 之前的行为，默认档，零行为变化）。
//   - strong：p^1.6（轻压更细，响应变陡）。
//   指数是首版手感数字（人类钉死区：手感），可调；改这里即可，别在别处再乘一层。
// 持久化：preferences "pressure-level"（device scope——压感跟板子/跟人，不跟画）。

export type PressureLevel = "none" | "weak" | "mid" | "strong";
export const PRESSURE_LEVELS: readonly PressureLevel[] = ["none", "weak", "mid", "strong"];
export const DEFAULT_PRESSURE_LEVEL: PressureLevel = "mid";

const GAMMA: Record<PressureLevel, number> = { none: 0, weak: 0.6, mid: 1, strong: 1.6 };

export function isPressureLevel(v: unknown): v is PressureLevel {
  return typeof v === "string" && (PRESSURE_LEVELS as readonly string[]).includes(v);
}

/** 纯函数：按档位整形一个 0..1 的压感值。 */
export function applyPressureLevel(p: number, level: PressureLevel): number {
  if (level === "none") return 1;
  const c = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 1));
  const g = GAMMA[level] ?? 1;
  return g === 1 ? c : Math.pow(c, g);
}

// ---- 进程级当前档（app boot 从 preferences 灌入；设置页改档时 set）----
let _level: PressureLevel = DEFAULT_PRESSURE_LEVEL;
export function setPressureLevel(l: unknown): void { _level = isPressureLevel(l) ? l : DEFAULT_PRESSURE_LEVEL; }
export function getPressureLevel(): PressureLevel { return _level; }
/** 输入层出口用：按当前档整形。 */
export function shapePressure(p: number): number { return applyPressureLevel(p, _level); }
