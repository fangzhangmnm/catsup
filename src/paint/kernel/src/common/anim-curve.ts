// anim-curve —— 一维关键帧函数（Unity AnimationCurve 模型：key + 切线把手 + 逐 key 切线模式）。
// created 2026-09-05 by Claude Fable 5.1。提案 = ai-docs/20260830-curve-and-ramp-deep-module-proposal.md §2.1
//   （user 2026-08-30 拍板：「我们还是对齐，因为这个确实是很重要的肌肉记忆」「用unity一定要把手」）。
//
// 零 DOM、零像素知识：backend（曲线调整 LUT）/ ui（编辑器皮）/ brush（压感曲线）三方共用同一份数学。
// 时间轴 t 无界（Live2D 纪元只是换一张编辑器皮）；调整曲线 / 压感把 t、v 都当 0..1 用，由消费方钳制值域。
//
// 语义（对齐 Unity 行为，闭源无法逐位对拍）：
//   · 段插值 = 三次 Hermite：h00·v0 + h10·Δt·m0 + h01·v1 + h11·Δt·m1（与 v135 curves-kernel 同式）。
//     任一侧为 constant → 该段恒取左 key 值（阶跃，Unity 同）。
//   · auto        = Catmull-Rom 中心差分；端点单边割线。
//   · clampedAuto = auto 再做 Fritsch–Carlson 限幅：两侧割线异号（极值点）→ 0；同号 → |m| ≤ 3·min(|割线|)。
//                   保证单调数据不过冲、不出台阶——0723「曲线的弯曲……各种突变」的解药。新 key 默认。
//   · linear      = 该侧切线 = 到该侧邻居的割线（两侧不同 → 折线）；flat = 0；free = 把手写入的值。
//   · 非 broken 的 key：任一侧被写（模式或斜率）→ 镜像另一侧；auto / clampedAuto 隐含非 broken。
//   · 外推：首 key 前 / 末 key 后按 pre/postWrap（clamp = 端值；loop / pingPong 按周期折回）。
//   · 数值域不钳制（调整曲线由 bakeLut8 clamp8；压感由消费方 clamp01）。
//   · **加权切线**（2026-09-06 user「那么就用加权切线吧」；Unity Weighted / Blender 变长把手）：key 某侧带 inWeight/outWeight
//     （0..1）= 该侧把手可拉长，段插值从 Hermite 换成三次 Bezier：P1 = P0 + w0·Δt·(1, m0)，P2 = P3 − w1·Δt·(1, m1)。
//     w = 1/3 两侧 ≡ Hermite（逐位同）；缺省无字段 = 非加权（定长把手，Unity 默认）。x(s) 在加权时非线性于 s，
//     求值用 Newton 反求 s（三次代数方程，3–5 步；烤 LUT 的消费者照旧 LUT）。两侧权重和 > 1 会让 x(s) 非单调（控制点交叉），
//     求值时按比例缩到和 = 1。

export type TangentMode = "clampedAuto" | "auto" | "free" | "flat" | "linear" | "constant";
export type WrapMode = "clamp" | "loop" | "pingPong";
export type TangentSide = "in" | "out" | "both";

export interface Keyframe {
  t: number;
  v: number;
  inTan: number;               // 斜率 dv/dt；auto 系由 refreshTangents 重算，free 由把手写入
  outTan: number;
  inMode: TangentMode;
  outMode: TangentMode;
  broken: boolean;             // false = 两侧联动（Unity smooth）；true = 左右独立
  inWeight?: number;           // 加权切线权重 0..1（有 = 该侧把手可拉长，段走 Bezier）；缺省 = 非加权定长（JSON 不写键）
  outWeight?: number;
}

export interface AnimCurve {
  keys: Keyframe[];            // 恒按 t 升序
  preWrap: WrapMode;
  postWrap: WrapMode;
}

export const TANGENT_MODES: readonly TangentMode[] = ["clampedAuto", "auto", "free", "flat", "linear", "constant"];
export const DEFAULT_TANGENT_MODE: TangentMode = "clampedAuto";
export const DEFAULT_WEIGHT = 1 / 3;   // 加权把手的起始权重 = Hermite 等价点（开关加权时形状不变）
export const MIN_WEIGHT = 0.05;        // 把手不许缩成零长（拖不动）

const EPS_T = 1e-9;

function mkKey(t: number, v: number, partial: Partial<Keyframe> = {}): Keyframe {
  const k: Keyframe = {
    t, v,
    inTan: partial.inTan ?? 0,
    outTan: partial.outTan ?? 0,
    inMode: partial.inMode ?? DEFAULT_TANGENT_MODE,
    outMode: partial.outMode ?? DEFAULT_TANGENT_MODE,
    broken: partial.broken ?? false,
  };
  if (partial.inWeight != null) k.inWeight = partial.inWeight;
  if (partial.outWeight != null) k.outWeight = partial.outWeight;
  return k;
}

function sortKeys(keys: Keyframe[]): void {
  keys.sort((a, b) => a.t - b.t);
}

/** 建曲线：按 t 排序；同 t（|Δt| < 1e-9）后者覆盖前者；缺省切线模式 clampedAuto；建完即 refreshTangents。 */
export function makeCurve(pts: Array<{ t: number; v: number } & Partial<Keyframe>>, wrap: WrapMode = "clamp"): AnimCurve {
  const keys: Keyframe[] = [];
  for (const p of pts) keys.push(mkKey(p.t, p.v, p));
  sortKeys(keys);
  for (let i = keys.length - 1; i > 0; i--) {
    if (Math.abs(keys[i].t - keys[i - 1].t) < EPS_T) keys.splice(i - 1, 1);
  }
  const c: AnimCurve = { keys, preWrap: wrap, postWrap: wrap };
  refreshTangents(c);
  return c;
}

/** (0,0)–(1,1)：clampedAuto 两端切线都是割线 1 → 逐点恒等（bakeLut8 逐字节 lut[x] == x）。 */
export function identityCurve(): AnimCurve {
  return makeCurve([{ t: 0, v: 0 }, { t: 1, v: 1 }]);
}

export function cloneCurve(c: AnimCurve): AnimCurve {
  return { keys: c.keys.map((k) => ({ ...k })), preWrap: c.preWrap, postWrap: c.postWrap };
}

/** 结构相等（切线 / 模式 / broken 全比；浮点按 1e-12 容差）。 */
export function curveEquals(a: AnimCurve, b: AnimCurve): boolean {
  if (a.keys.length !== b.keys.length || a.preWrap !== b.preWrap || a.postWrap !== b.postWrap) return false;
  const near = (x: number, y: number) => Math.abs(x - y) <= 1e-12 * Math.max(1, Math.abs(x), Math.abs(y));
  for (let i = 0; i < a.keys.length; i++) {
    const p = a.keys[i], q = b.keys[i];
    if (!near(p.t, q.t) || !near(p.v, q.v) || !near(p.inTan, q.inTan) || !near(p.outTan, q.outTan)) return false;
    if (p.inMode !== q.inMode || p.outMode !== q.outMode || p.broken !== q.broken) return false;
    if ((p.inWeight ?? -1) !== (q.inWeight ?? -1) || (p.outWeight ?? -1) !== (q.outWeight ?? -1)) return false;
  }
  return true;
}

// ---- 求值 ----

function wrapT(t: number, t0: number, t1: number, mode: WrapMode): number {
  const L = t1 - t0;
  if (L <= 0) return t0;
  if (mode === "loop") {
    let u = (t - t0) % L;
    if (u < 0) u += L;
    return t0 + u;
  }
  if (mode === "pingPong") {
    let u = (t - t0) % (2 * L);
    if (u < 0) u += 2 * L;
    if (u > L) u = 2 * L - u;
    return t0 + u;
  }
  return t < t0 ? t0 : t1;   // clamp
}

/** 段索引：keys[i].t ≤ t < keys[i+1].t（二分；t ≥ 末 key 时返回 n-2）。要求 keys.length ≥ 2。 */
function segmentIndex(keys: Keyframe[], t: number): number {
  let lo = 0, hi = keys.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (keys[mid].t <= t) lo = mid; else hi = mid - 1;
  }
  return lo;
}

function hermite(k0: Keyframe, k1: Keyframe, t: number): number {
  if (k0.outMode === "constant" || k1.inMode === "constant") return k0.v;
  const dt = k1.t - k0.t;
  if (dt <= EPS_T) return k0.v;
  const w0 = k0.outWeight, w1 = k1.inWeight;
  if (w0 != null || w1 != null) return bezierSegment(k0, k1, t, w0 ?? DEFAULT_WEIGHT, w1 ?? DEFAULT_WEIGHT);
  const s = (t - k0.t) / dt;
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  return h00 * k0.v + h10 * dt * k0.outTan + h01 * k1.v + h11 * dt * k1.inTan;
}

/** 加权段：三次 Bezier，控制点沿切线方向按权重拉出；x(s) 单调（权重和钳到 ≤ 1），Newton 反求 s。 */
function bezierSegment(k0: Keyframe, k1: Keyframe, t: number, w0: number, w1: number): number {
  const dt = k1.t - k0.t;
  w0 = Math.max(0, Math.min(1, w0)); w1 = Math.max(0, Math.min(1, w1));
  const sum = w0 + w1;
  if (sum > 1) { w0 /= sum; w1 /= sum; }
  const x0 = k0.t, x3 = k1.t;
  const x1 = x0 + w0 * dt, x2 = x3 - w1 * dt;
  const y0 = k0.v, y3 = k1.v;
  const y1 = y0 + k0.outTan * w0 * dt, y2 = y3 - k1.inTan * w1 * dt;
  // 反求 s：x(s) = t（x 控制点有序 → 单调，Newton 从线性猜起，越界回二分）
  let s = (t - x0) / dt;
  let lo = 0, hi = 1;
  for (let it = 0; it < 12; it++) {
    const u = 1 - s;
    const xs = u * u * u * x0 + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s * x3;
    const err = xs - t;
    if (Math.abs(err) <= 1e-10 * dt) break;
    if (err > 0) hi = s; else lo = s;
    const dxs = 3 * (u * u * (x1 - x0) + 2 * u * s * (x2 - x1) + s * s * (x3 - x2));
    let ns = dxs > 1e-12 ? s - err / dxs : (lo + hi) / 2;
    if (!(ns > lo && ns < hi)) ns = (lo + hi) / 2;
    s = ns;
  }
  const u = 1 - s;
  return u * u * u * y0 + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * y3;
}

export function evaluate(c: AnimCurve, t: number): number {
  const keys = c.keys;
  const n = keys.length;
  if (n === 0) return 0;
  if (n === 1) return keys[0].v;
  const t0 = keys[0].t, t1 = keys[n - 1].t;
  if (t < t0) t = wrapT(t, t0, t1, c.preWrap);
  else if (t > t1) t = wrapT(t, t0, t1, c.postWrap);
  if (t <= t0) return keys[0].v;
  if (t >= t1) {
    // 末 key：若末段任一侧 constant，Unity 在 t == t1 处取末 key 值（阶跃在末 key 完成）
    return keys[n - 1].v;
  }
  const i = segmentIndex(keys, t);
  return hermite(keys[i], keys[i + 1], t);
}

/** n 个等距采样（含两端）；domain 缺省 [0,1]。 */
export function bakeLut(c: AnimCurve, n: number, domain: [number, number] = [0, 1]): Float32Array {
  const out = new Float32Array(Math.max(1, n | 0));
  const [d0, d1] = domain;
  const m = out.length - 1;
  for (let i = 0; i < out.length; i++) out[i] = evaluate(c, m === 0 ? d0 : d0 + ((d1 - d0) * i) / m);
  return out;
}

/** 256 项 8-bit LUT：t = x/255 → round(v·255) clamp 0..255。curves-kernel 消费。 */
export function bakeLut8(c: AnimCurve): Uint8Array {
  const lut = new Uint8Array(256);
  for (let x = 0; x < 256; x++) {
    const v = Math.round(evaluate(c, x / 255) * 255);
    lut[x] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return lut;
}

// ---- 切线 ----

function secant(a: Keyframe, b: Keyframe): number {
  const dt = b.t - a.t;
  return Math.abs(dt) <= EPS_T ? 0 : (b.v - a.v) / dt;
}

/** auto（Catmull-Rom 中心差分；端点单边割线）。 */
function autoTangent(keys: Keyframe[], i: number): number {
  const n = keys.length;
  if (n < 2) return 0;
  if (i === 0) return secant(keys[0], keys[1]);
  if (i === n - 1) return secant(keys[n - 2], keys[n - 1]);
  return secant(keys[i - 1], keys[i + 1]);
}

/** clampedAuto = auto 再 Fritsch–Carlson 限幅（极值点 0；同号 |m| ≤ 3·min(|割线|)）。 */
function clampedAutoTangent(keys: Keyframe[], i: number): number {
  const n = keys.length;
  if (n < 2) return 0;
  if (i === 0 || i === n - 1) return autoTangent(keys, i);   // 端点单边割线：本身已满足 |m| ≤ 3|s|
  const sl = secant(keys[i - 1], keys[i]);
  const sr = secant(keys[i], keys[i + 1]);
  if (sl * sr <= 0) return 0;
  const m = autoTangent(keys, i);
  const lim = 3 * Math.min(Math.abs(sl), Math.abs(sr));
  return Math.abs(m) > lim ? Math.sign(m) * lim : m;
}

function sideTangent(keys: Keyframe[], i: number, side: "in" | "out", mode: TangentMode, current: number): number {
  const n = keys.length;
  switch (mode) {
    case "auto": return autoTangent(keys, i);
    case "clampedAuto": return clampedAutoTangent(keys, i);
    case "flat": return 0;
    case "constant": return 0;
    case "linear":
      if (side === "in") return i > 0 ? secant(keys[i - 1], keys[i]) : (n > 1 ? secant(keys[0], keys[1]) : 0);
      return i < n - 1 ? secant(keys[i], keys[i + 1]) : (n > 1 ? secant(keys[n - 2], keys[n - 1]) : 0);
    case "free": return current;
  }
}

/** 每 key 按 in/outMode 重算切线；free 不动。任何改 key 集合 / 位置的操作之后都要调（本模块的 verb 已内建）。 */
export function refreshTangents(c: AnimCurve): void {
  const keys = c.keys;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    k.inTan = sideTangent(keys, i, "in", k.inMode, k.inTan);
    k.outTan = sideTangent(keys, i, "out", k.outMode, k.outTan);
  }
}

// ---- 编辑 verb（都保持 keys 升序 + 切线新鲜）----

/** 插入 key。v 缺省 = evaluate(t)（新点落在原曲线上；auto 邻居切线随之重算，形状微变——Unity AddKey 同）。
 *  同 t（|Δt| < 1e-9）→ 覆盖该 key 的 v。返回 key 的 index。 */
export function insertKey(c: AnimCurve, t: number, v?: number): number {
  const val = v ?? evaluate(c, t);
  const keys = c.keys;
  for (let i = 0; i < keys.length; i++) {
    if (Math.abs(keys[i].t - t) < EPS_T) {
      keys[i].v = val;
      refreshTangents(c);
      return i;
    }
  }
  const k = mkKey(t, val);
  keys.push(k);
  sortKeys(keys);
  refreshTangents(c);
  return keys.indexOf(k);
}

/** 删 key。曲线至少留 1 个 key（再删 = no-op 返回 false）。 */
export function removeKey(c: AnimCurve, i: number): boolean {
  if (i < 0 || i >= c.keys.length || c.keys.length <= 1) return false;
  c.keys.splice(i, 1);
  refreshTangents(c);
  return true;
}

/** 移 key（t 与 v）；lockT = 只动 v。越过邻居自动重排（Unity）；返回新 index。 */
export function moveKey(c: AnimCurve, i: number, t: number, v: number, o: { lockT?: boolean } = {}): number {
  const k = c.keys[i];
  if (!k) return -1;
  if (!o.lockT) k.t = t;
  k.v = v;
  sortKeys(c.keys);
  refreshTangents(c);
  return c.keys.indexOf(k);
}

/** 设切线模式。auto / clampedAuto 隐含非 broken 且两侧同设；其余按 side（非 broken 时 side 也镜像成 both）。 */
export function setTangentMode(c: AnimCurve, i: number, mode: TangentMode, side: TangentSide = "both"): void {
  const k = c.keys[i];
  if (!k) return;
  const autoish = mode === "auto" || mode === "clampedAuto";
  if (autoish) k.broken = false;
  const both = side === "both" || autoish || !k.broken;
  if (both || side === "in") k.inMode = mode;
  if (both || side === "out") k.outMode = mode;
  refreshTangents(c);
}

/** 把手拖动：该侧变 free 并写斜率；非 broken 时镜像另一侧。 */
export function setTangent(c: AnimCurve, i: number, side: "in" | "out", slope: number): void {
  const k = c.keys[i];
  if (!k) return;
  const s = Number.isFinite(slope) ? slope : 0;
  if (side === "in" || !k.broken) { k.inMode = "free"; k.inTan = s; }
  if (side === "out" || !k.broken) { k.outMode = "free"; k.outTan = s; }
  refreshTangents(c);
}

/** 断开 / 联动。联动回去时若任一侧是 free → 两侧都变 free 取平均斜率（Unity「unify」近似）。 */
export function setBroken(c: AnimCurve, i: number, broken: boolean): void {
  const k = c.keys[i];
  if (!k) return;
  k.broken = broken;
  if (!broken && (k.inMode === "free" || k.outMode === "free")) {
    const m = (k.inTan + k.outTan) / 2;
    k.inMode = k.outMode = "free";
    k.inTan = k.outTan = m;
  } else if (!broken && k.inMode !== k.outMode) {
    // 两侧模式不同又要联动 → 以 out 侧为准
    k.inMode = k.outMode;
  }
  refreshTangents(c);
}

/** 开/关加权（两侧）：开 = 缺的侧补 DEFAULT_WEIGHT（形状不变）；关 = 删两侧权重键（回 Hermite，形状可能变）。 */
export function setWeighted(c: AnimCurve, i: number, on: boolean): void {
  const k = c.keys[i];
  if (!k) return;
  if (on) { k.inWeight ??= DEFAULT_WEIGHT; k.outWeight ??= DEFAULT_WEIGHT; }
  else { delete k.inWeight; delete k.outWeight; }
}
export function isWeighted(k: Keyframe, side: "in" | "out"): boolean {
  return side === "in" ? k.inWeight != null : k.outWeight != null;
}
/** 写某侧权重（钳 [MIN_WEIGHT, 1]；再钳到与该段另一端权重之和 ≤ 1，防控制点交叉）；该侧若非加权则顺手变加权。 */
export function setWeight(c: AnimCurve, i: number, side: "in" | "out", w: number): void {
  const k = c.keys[i];
  if (!k) return;
  let v = Number.isFinite(w) ? Math.max(MIN_WEIGHT, Math.min(1, w)) : DEFAULT_WEIGHT;
  const nb = side === "out" ? c.keys[i + 1] : c.keys[i - 1];
  if (nb) {
    const other = side === "out" ? (nb.inWeight ?? DEFAULT_WEIGHT) : (nb.outWeight ?? DEFAULT_WEIGHT);
    v = Math.max(MIN_WEIGHT, Math.min(v, 1 - other));
  }
  if (side === "in") k.inWeight = v; else k.outWeight = v;
}

/** 运行时校验（读持久化 / 笔刷 JSON 用）：形状合法 → 归一化副本；否则 null。 */
export function sanitizeCurve(raw: unknown): AnimCurve | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { keys?: unknown; preWrap?: unknown; postWrap?: unknown };
  if (!Array.isArray(r.keys) || r.keys.length === 0) return null;
  const pts: Array<{ t: number; v: number } & Partial<Keyframe>> = [];
  for (const k of r.keys as Array<Record<string, unknown>>) {
    if (!k || typeof k !== "object") return null;
    const t = k.t, v = k.v;
    if (typeof t !== "number" || !Number.isFinite(t) || typeof v !== "number" || !Number.isFinite(v)) return null;
    const mode = (m: unknown): TangentMode => (typeof m === "string" && (TANGENT_MODES as readonly string[]).includes(m) ? m as TangentMode : DEFAULT_TANGENT_MODE);
    const num = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? x : 0);
    const wt = (x: unknown): number | undefined => (typeof x === "number" && Number.isFinite(x) ? Math.max(MIN_WEIGHT, Math.min(1, x)) : undefined);
    const pt: { t: number; v: number } & Partial<Keyframe> = { t, v, inMode: mode(k.inMode), outMode: mode(k.outMode), inTan: num(k.inTan), outTan: num(k.outTan), broken: !!k.broken };
    const iw = wt(k.inWeight), ow = wt(k.outWeight);
    if (iw != null) pt.inWeight = iw;
    if (ow != null) pt.outWeight = ow;
    pts.push(pt);
  }
  const wrap = (w: unknown): WrapMode => (w === "loop" || w === "pingPong" ? w : "clamp");
  const c = makeCurve(pts);
  c.preWrap = wrap(r.preWrap);
  c.postWrap = wrap(r.postWrap);
  return c;
}
