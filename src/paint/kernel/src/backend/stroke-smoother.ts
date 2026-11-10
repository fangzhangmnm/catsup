// 笔画手感平滑数学（backend，C5 迁入）：位置平滑 StrokeSmoother + 压感 PressureLPF。
// 两者都吃**事件时间戳 t**（不是壁钟）——backend 决定论：同一 (x,y,p,t) 序列 → 同一输出
// （ADR-0009；C8 SoftGl2/MCP 回放的前提）。无 t（形状笔合成/测试直喂）→ FALLBACK_DT。
//
// 位置平滑 — 时间制二阶临界阻尼 SmoothDamp（时间缓冲）+ 动量弧 tail。详 ai-docs/20260613-brush-procreate-smoothing.md。
//
// 两层：
//   【时间缓冲 committed】二阶临界阻尼 SmoothDamp，**smoothTime = tau（时间制，用真实 dt）**：
//     状态 = pos(out) + vel。稳态滞后 ≈ 速度×tau（一致时间滞后，与采样率/笔速/几何无关）→ 跟笔、可控、
//     顿涌现（转角自然减速→滞后缩小→角紧、无多边形）、去抖（二阶低通，全速一致衰减）、帧率无关（真实 dt）。
//     比一阶 EMA 多一个 **vel 动量状态**——弧白嫖它、不用估算 heading。
//   【动量弧 tail】每 push 从 (pos, vel·bow) 的拷贝**非破坏地继续跑 SmoothDamp 飞向光标** → 一段弧（贴笔尖预览）。
//     弧来自 vel 的切向动量；直行 vel 朝光标 → 退化直线。vel 是平滑积分的连续状态 → 弧帧间稳、**不闪**。
//     抬笔 finish() = 把这段弧整段转正 → 预览所见即所得（≈ Procreate 的动作）。
//
// 注：一阶 EMA + 直线 tail 的方案 B 实测与 A 几乎一样、A 略好（B 的直线 tail 看得出来），已弃；详 lessons #15。
//     之前觉得平滑「不行」主要是 **stabilization 没开（=0）的煤气灯**，不是 A/B 算法差别——开了死区就好。
//
// 缩放一致：tau 是时间、scale 无关；deadzone 才 ÷scale。
//
// 契约（brush.js 用）：push(x,y,p,t) / update(空) / finish / frozenIndex / count / seq / cx,cy,cp。
//   cx/cy/cp = [committed out(0.._committed-1) … 动量弧 tail(_committed..end，末点=pen)]，frozenIndex=_committed-1。

const FALLBACK_DT = 16;   // 无时间戳（形状工具合成笔触）兜底 dt(ms)
const FLUSH_DT = 6;       // tail flush 每 tick dt(ms)（只决定弧采样密度，不决定弧形）

interface StrokeSmootherOpts {
  tau?: number;       // 时间常数(ms,0=不平滑)
  deadzone?: number;  // 死区半径(doc px)
  tailBow?: number;   // 弧动量增益(1=自然,>1 更鼓,0=直)
}

export class StrokeSmoother {
  tau: number;
  r: number;
  bow: number;
  cx: number[];
  cy: number[];
  cp: number[];
  _committed: number;
  _tailLen: number;
  seq: number;
  _ox: number;
  _oy: number;
  _vx: number;
  _vy: number;
  _sx: number;
  _moved = false;   // 2026-09-06 死区锚是否离开过落笔点（起笔静止期判据，brush.ts 压感 LPF 用）
  _sy: number;
  _lastT: number | null;
  _lastP: number;
  _started: boolean;

  // opts: { tau:时间常数(ms,0=不平滑), deadzone:死区半径(doc px), tailBow:弧动量增益(1=自然,>1 更鼓,0=直) }
  constructor(opts: StrokeSmootherOpts = {}) {
    this.tau = Math.max(0, opts.tau || 0);
    this.r = Math.max(0, opts.deadzone || 0);
    this.bow = opts.tailBow == null ? 1 : Math.max(0, opts.tailBow);
    this.cx = []; this.cy = []; this.cp = [];
    this._committed = 0; this._tailLen = 0;
    this.seq = 0;
    this._ox = 0; this._oy = 0; this._vx = 0; this._vy = 0;   // pos + vel（二阶动量状态）
    this._sx = 0; this._sy = 0;        // 死区锚（去抖后的 pen）
    this._lastT = null; this._lastP = 0;
    this._started = false;
  }

  get count() { return this.cx.length; }
  /** 这个 raw 点会不会让死区锚离开落笔点（或已经离开过）——起笔静止期 = 还没有。 */
  wouldMove(x: number, y: number): boolean {
    if (this._moved || this.cx.length === 0) return this._moved || this.cx.length === 0;
    return Math.hypot(x - this._sx, y - this._sy) > this.r;
  }

  push(x: number, y: number, p: number, t: number | null | undefined) {
    this.seq++;
    if (!this._started) {
      this._started = true;
      this._ox = x; this._oy = y; this._vx = 0; this._vy = 0; this._sx = x; this._sy = y;
      this._lastT = (t == null ? null : t); this._lastP = p;
      this.cx.push(x); this.cy.push(y); this.cp.push(p);
      this._committed = 1; this._tailLen = 0;
      return;
    }
    for (let i = 0; i < this._tailLen; i++) { this.cx.pop(); this.cy.pop(); this.cp.pop(); }

    // ① stabilization 死区（与 tau 正交：硬空间阈值 vs 频域）
    if (this.r > 0) {
      const dx = x - this._sx, dy = y - this._sy, d = Math.hypot(dx, dy);
      if (d > this.r) { const k = (d - this.r) / d; this._sx += dx * k; this._sy += dy * k; this._moved = true; }
    } else { if (x !== this._sx || y !== this._sy) this._moved = true; this._sx = x; this._sy = y; }

    // ② 时间缓冲：二阶时间制 SmoothDamp（推进 pos + vel）
    let dt = FALLBACK_DT;
    if (t != null) { dt = this._lastT == null ? FALLBACK_DT : Math.max(0.001, t - this._lastT); this._lastT = t; }
    if (this.tau > 0) {
      const s = smoothDamp(this._ox, this._oy, this._vx, this._vy, this._sx, this._sy, this.tau, dt);
      this._ox = s[0]; this._oy = s[1]; this._vx = s[2]; this._vy = s[3];
    } else { this._ox = this._sx; this._oy = this._sy; this._vx = 0; this._vy = 0; }
    this.cx.push(this._ox); this.cy.push(this._oy); this.cp.push(p);
    this._committed = this.cx.length;
    this._lastP = p;

    // ③ 动量弧 tail：从 (pos, vel·bow) 继续 flush 到 pen
    this._tailLen = this._buildTail(p);
  }

  // 非破坏地从 (pos, vel·bow) 继续 SmoothDamp 飞向 pen，收集弧点，末点钉 pen。返回点数。
  _buildTail(tp: number): number {
    if (this.tau <= 0) return 0;
    let px = this._ox, py = this._oy, vx = this._vx * this.bow, vy = this._vy * this.bow;
    const sx = this._sx, sy = this._sy;
    if (Math.hypot(px - sx, py - sy) < 0.5 && Math.hypot(vx, vy) < 0.5) return 0;   // 笔尖≈光标且无动量 → 无 tail
    let n = 0, lax = px, lay = py;
    const MAX = Math.ceil(this.tau / FLUSH_DT * 6) + 64;
    for (let i = 0; i < MAX; i++) {
      if (Math.hypot(px - sx, py - sy) < 0.2 && Math.hypot(vx, vy) < 0.5) break;
      const s = smoothDamp(px, py, vx, vy, sx, sy, this.tau, FLUSH_DT);
      px = s[0]; py = s[1]; vx = s[2]; vy = s[3];
      if (Math.hypot(px - lax, py - lay) >= 0.15) { this.cx.push(px); this.cy.push(py); this.cp.push(tp); n++; lax = px; lay = py; }
    }
    this.cx.push(sx); this.cy.push(sy); this.cp.push(tp); n++;   // 钉光标（贴指/画到头）
    return n;
  }

  // 抬笔收尾：动量弧 tail 已抵光标 → 整段转正（预览所见即所得）。
  finish() {
    if (!this._started) return;
    this._committed = this.cx.length;
    this._tailLen = 0;
  }

  frozenIndex() { return this._committed - 1; }
  update() {}
}

// 压感时间域 LPF（v102 立；C5 壁钟→事件 t）：一阶 IIR，α = dt/(dt+τ)；τ=0 → 直传 raw。
// dt = 事件 timeStamp 差（原 brush.ts 用 performance.now()——处理时刻钟：coalesced 整批同刻到达
// 时 dt 被压成 1ms 下限，与位置平滑的事件钟「同一笔两套时钟」；census §2.1 记账的顺手账在此收）。
export class PressureLPF {
  private tau: number;
  private p: number;
  private lastT: number | null;

  constructor(tau: number, p0: number, t0: number | null = null) {
    this.tau = tau > 0 ? tau : 0;
    this.p = p0;
    this.lastT = t0;
  }

  step(pressure: number, t: number | null = null): number {
    if (this.tau > 0) {
      const dt = (t != null && this.lastT != null) ? Math.max(1, t - this.lastT) : FALLBACK_DT;
      this.p += (dt / (dt + this.tau)) * (pressure - this.p);
    } else {
      this.p = pressure;
    }
    if (t != null) this.lastT = t;
    return this.p;
  }
  /** 只对钟不积压感：值不动、时间原点挪到 t（起笔静止期用——顿多久都等于没顿）。 */
  rebase(t: number | null = null): number {
    if (t != null) this.lastT = t;
    return this.p;
  }
}

// 时间制 SmoothDamp（临界阻尼，Game Programming Gems 4 有理近似）。smoothTime 与 dt 同量纲(ms)。
function smoothDamp(px: number, py: number, vx: number, vy: number, tx: number, ty: number, smoothTime: number, dt: number): [number, number, number, number] {
  const omega = 2 / smoothTime, x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const cdx = px - tx, cdy = py - ty;
  const tmx = (vx + omega * cdx) * dt, tmy = (vy + omega * cdy) * dt;
  return [tx + (cdx + tmx) * exp, ty + (cdy + tmy) * exp, (vx - omega * tmx) * exp, (vy - omega * tmy) * exp];
}
