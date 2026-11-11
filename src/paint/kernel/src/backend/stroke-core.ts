// stroke-core —— 一笔的手感，不认识图层、不管几维（贴图主线 0-6；施工单 CatsUp ai-docs/20261110-paint-workorders-5.md，形状 Fable 5.2 定）。created 2026-11-10 by Claude Opus 5.5
// user 定的（canonical）：笔和橡皮，轨迹在屏幕上，笔尖在空间里——滤抖在手所在的地方做（屏幕上），压感是手的力度；间距、走了多远在空间里量；
// 笔的大小是屏幕大小，落笔那一刻换成空间里的大小，一笔之内不变（换算归调用的人：settings.size 已经是路的单位）。
//
//   原始的点（屏幕）→ 滤抖 + 压感平滑（屏幕上，StrokeSmoother / PressureLPF / 停顿不积压感）→ 【宿主可以插一步：PathPlacer 把中心线落到模型表面上，变成空间里的一条路】
//   → 沿这条路按间距走步（路自己的坐标里量）→ 每一步一颗笔尖（位置、大小、浓度、这一颗落下时已经走了多远）
//
// 它管：滤抖、压感平滑、停顿那条规矩、走步、压感曲线和大小 / 流量 / 浓度的联动、起笔收笔的渐细、收笔时量总长。
// 它不管：图层、画布边界、包围盒、像素笔直接落层的那条路、脏区、颜色怎么合成——那些留在 BrushEngine（brush.ts），BrushEngine 是它的一个用户。
// 二维时（不给 PathPlacer）每一个数和拆之前逐位相同：长度还是 Math.hypot(dx, dy)，插值算式照抄，循环顺序不变（样本 test/stroke-core-golden.test.mjs）。
// 本模块不 import 图层、画布、显卡的任何东西（守卫 test/stroke-core-guard.test.mjs）。

import { makePressureShaper, type PressureShaper } from "../common/pressure-curve.ts";
import { StrokeSmoother, PressureLPF } from "./stroke-smoother.ts";
import type { ResolvedBrush } from "../common/resolved-brush.ts";

/** 一条路：若干个点，每个点 dim 个坐标和一个压感。 */
export interface StrokePath {
  readonly dim: number;                 // 2 或 3
  readonly count: number;
  coord(i: number, k: number): number;  // 第 i 个点的第 k 个坐标
  pressure(i: number): number;
  /** 第 i 个点和它前一个点之间不连（落点跳到了别处，比如从胳膊跳到了身子）。 */
  breakBefore(i: number): boolean;
  /** 前多少个点不会再变。 */
  readonly frozenCount: number;
}

/** 宿主的落点：把平滑好的中心线（屏幕上）换成一条路。不给 = 路就是中心线本身（二维、unit 1、没有断点）。BrushEngine 永远不给。 */
export interface PathPlacer {
  readonly dim: number;
  /** 路的坐标里「一个像素」有多大：二维 1；三维 = 贴图上一格在空间里的大小。走步的最小间距、笔尖的最小大小都乘它。 */
  readonly unit: number;
  /**
   * 把平滑好的中心线（屏幕上的点 cx / cy / cp，前 frozenCount 个不会再变）换成一条路。每次要走步之前调一次。路上的点可以比中心线上的多（宿主会把线落密，
   * 好贴着表面走）。宿主自己记着上次换到哪了；前面不会再变的部分不用重算。落密、打射线、判断断开都是宿主的事，内核不知道。
   */
  place(cx: readonly number[], cy: readonly number[], cp: readonly number[], count: number, frozenCount: number): StrokePath;
}

/** 笔尖列表：不认识图层。每颗 dim + 3 个数：位置（dim 个）、大小、浓度、这一颗落下时已经走了多远。 */
export interface StrokeTips {
  readonly dim: number;
  readonly count: number;
  readonly data: Float64Array;
  /** 前多少颗已经定型：来自路上不会再变的部分，而且离那一部分的尾巴超过收笔渐细的长度——以后每次再收集（含抬笔后的最终结果）逐位不变。 */
  readonly frozenCount: number;
}

export interface StampParams { size: number; stampAlpha: number; }

// signed_lerp：coeff ∈ [−1, 1]，p ∈ [0, 1]，返回 ∈ [amp, 1] where amp = 1 − |coeff|（从 brush.ts 搬来，原样）。
//   coeff ≥ 0：amp + (1 − amp) × p  →  p=0 → amp，p=1 → 1；coeff < 0：1 + (amp − 1) × p；coeff = 0：永远 1（不响应压感）
export function signedLerp(coeff: number, p: number): number {
  const amp = 1 - Math.abs(coeff);
  return coeff >= 0 ? amp + (1 - amp) * p
                    : 1 + (amp - 1) * p;
}

/** 走一步多远：size_eff × spacing（低压感 size 小 → step 小，不出豆豆链）；最少半个像素 = 0.5 × unit。 */
export function stepFor(s: ResolvedBrush, pressure: number, shape: PressureShaper, unit = 1): number {
  const p = Math.max(0, Math.min(1, pressure));
  const pCurve = shape(p);
  const sizeMul = signedLerp(s.sizeCoeff || 0, pCurve);
  const effSize = s.size * sizeMul;
  return Math.max(0.5 * unit, effSize * s.spacing);
}

/** 压感 → { 大小, 浓度 }（起笔 / 收笔渐细 + signedLerp 联动）。null = 太淡跳过。taperTotal = 收笔时量的总长（没抬笔 = null，不做收笔渐细）。笔尖最少半个像素 = 0.5 × unit。 */
export function stampParamsOf(s: ResolvedBrush, shape: PressureShaper, pressure: number, strokeDist: number, taperTotal: number | null, unit = 1): StampParams | null {
  const taperFloor = s.taperFloor;   // v415 起是 ResolvedBrush 的显式字段（per-brush 可调，不再恒 0.4）
  let p = Math.max(0, Math.min(1, pressure));
  // 入端 taper：起手 fade-in（也兼顾 Apple Pencil 落笔 spike → 萝卜尖）
  if (s.taperIn > 0) {
    const t = Math.min(1, strokeDist / (s.size * s.taperIn));
    p *= taperFloor + (1 - taperFloor) * t;
  }
  // 出端 taper：末端 fade-out。需总笔长 → 只在抬笔后有值（live 不 taper）
  if (s.taperOut > 0 && taperTotal != null) {
    const distFromEnd = taperTotal - strokeDist;
    const taperLen = s.size * s.taperOut;
    if (distFromEnd < taperLen) {
      const t = Math.max(0, distFromEnd / taperLen);
      p *= taperFloor + (1 - taperFloor) * t;
    }
  }
  const pCurve = shape(p);   // pressureCurve LUT 或 p^gamma（common/pressure-curve.ts）
  const size = Math.max(0.5 * unit, s.size * signedLerp(s.sizeCoeff || 0, pCurve));
  const effFlow = Math.max(0, Math.min(1, s.flow * signedLerp(s.flowCoeff || 0, pCurve)));
  const stampAlpha = effFlow * signedLerp(s.opaCoeff || 0, pCurve);
  if (stampAlpha < 0.001) return null;
  return { size, stampAlpha };
}

/** 走步的游标。 */
export interface Walk { ci: number; started: boolean; accumDist: number; lastP: number; strokeDist: number; }
export const freshWalk = (): Walk => ({ ci: 0, started: false, accumDist: 0, lastP: 0, strokeDist: 0 });

/**
 * 沿一条路从 walk 游标走到第 endIdx 个点，等距撒点；起点补一颗。每颗调 emit(第几段, x, y, z, 压感, 走了多远)（二维时 z = 0；按数传、不分配——每帧从头走一遍）。
 * 断开的地方不在两头之间插笔尖、那一段不算进「走了多远」、间距的余数带过去。**缓冲笔的走步循环全仓只有这一处**（像素笔直接落层那一份留在 BrushEngine._extendImmediate）。
 */
export function walkPath(path: StrokePath, walk: Walk, endIdx: number, step: (pressure: number) => number, emit: (seg: number, x: number, y: number, z: number, p: number, strokeDist: number) => void): void {
  const dim = path.dim;
  if (!walk.started && path.count > 0) {
    walk.started = true;
    emit(-1, path.coord(0, 0), path.coord(0, 1), dim === 3 ? path.coord(0, 2) : 0, path.pressure(0), walk.strokeDist);
  }
  while (walk.ci < endIdx) {
    const i = walk.ci;
    const p0 = path.pressure(i), p1 = path.pressure(i + 1);
    if (path.breakBefore(i + 1)) { walk.lastP = p1; walk.ci = i + 1; continue; }   // 断开：不插、不算长度、余数带过去
    const x0 = path.coord(i, 0), y0 = path.coord(i, 1), x1 = path.coord(i + 1, 0), y1 = path.coord(i + 1, 1);
    const dx = x1 - x0, dy = y1 - y0;
    let z0 = 0, dz = 0;
    if (dim === 3) { z0 = path.coord(i, 2); dz = path.coord(i + 1, 2) - z0; }
    const L = dim === 3 ? Math.hypot(dx, dy, dz) : Math.hypot(dx, dy);   // 二维照旧 Math.hypot(dx, dy)，逐位不变
    if (L > 0) {
      let pos = 0;
      while (true) {
        const curP = p0 + (p1 - p0) * (pos / L);
        const st = step(curP);
        if (walk.accumDist + (L - pos) < st) break;
        pos += st - walk.accumDist;
        walk.strokeDist += st;
        const t = pos / L;
        emit(i, x0 + dx * t, y0 + dy * t, dim === 3 ? z0 + dz * t : 0, p0 + (p1 - p0) * t, walk.strokeDist);
        walk.accumDist = 0;
      }
      walk.accumDist += L - pos;
    }
    walk.lastP = p1;
    walk.ci = i + 1;
  }
}

/** 二维的路 = 平滑器的中心线本身（不给 PathPlacer 时）。 */
function centerlinePath(sm: StrokeSmoother): StrokePath {
  const cx = sm.cx, cy = sm.cy, cp = sm.cp;
  return { dim: 2, count: sm.count, coord: (i, k) => (k === 0 ? cx[i] : cy[i]), pressure: (i) => cp[i], breakBefore: () => false, frozenCount: Math.max(0, sm.frozenIndex() + 1) };
}

/**
 * 走步的定型缓存（CatsUp 贴图主线 1-4d 第 2 条，2026-11-11 Claude Opus 5.5）：路上前 frozenCount 个点不会再变，所以从头走到「最后一个不会再变的点」时的游标、
 * 和这一段交出的笔尖也不会再变——记下来，下一帧从那里接着走，只重走还会变的尾巴。交出去的每一个数逐位不变（同一串算式从同一个状态接着算；
 * 存的是 Float64，原样取回）。前提 = 喂进来的路都是这一笔自己的 path()（前 frozenCount 个点逐位不变、只增不减）；路说定型的变少了 = 丢掉缓存从头走（保底）。
 */
interface WalkCache {
  /** 走到这里的游标：ci = 最后一个不会再变的点（frozen − 1）。还没走 = freshWalk()。 */
  walk: Walk;
  /** 上次看到的定型点数（min(frozenCount, count)）。 */
  frozen: number;
  /** 这一段走出来的原料：每颗 6 个数（第几段, x, y, z, 压感, 走了多远）。 */
  raw: Float64Array; rawN: number;
  /** 原料按收笔总长 taper 算成的笔尖：每颗 7 个数（第几段, x, y, z, 大小, 浓度, 走了多远），太淡跳过的不在里面；tipsFrom = 原料算到第几颗。taper 变了（抬笔）= 重算。 */
  tips: Float64Array; tipN: number; tipsFrom: number; taper: number | null;
}
const RAW_W = 6, TIP_W = 7;
const newWalkCache = (): WalkCache => ({ walk: freshWalk(), frozen: 0, raw: new Float64Array(0), rawN: 0, tips: new Float64Array(0), tipN: 0, tipsFrom: 0, taper: null });
/** 放得下 need 个数（不够就翻倍长，旧的原样拷过去）。 */
function room(a: Float64Array, need: number): Float64Array {
  if (need <= a.length) return a;
  const b = new Float64Array(Math.max(need, a.length * 2, 256));
  b.set(a);
  return b;
}

/** 一笔的手感（不认识图层）：落笔建一个，喂点、收集、抬笔。 */
export class StrokeCore {
  readonly settings: ResolvedBrush;
  readonly pShape: PressureShaper;   // 压感整形（pressureCurve LUT 或 p^gamma），落笔时烤一次
  readonly sm: StrokeSmoother;
  private readonly _pLPF: PressureLPF;
  private readonly _placer: PathPlacer | null;
  private _wc: WalkCache = newWalkCache();
  /** 抬笔时量的总长（给收笔渐细）；没抬笔 = null（live 不做收笔渐细）。 */
  taperTotal: number | null = null;

  constructor(settings: ResolvedBrush, x: number, y: number, pressure: number, smooth: { tau?: number; deadzone?: number; tailBow?: number } = {}, t: number | null = null, placer: PathPlacer | null = null) {
    this.settings = settings;
    this.pShape = makePressureShaper(settings);
    // 压感 LPF（事件钟，起点锚在 down 事件的 t）
    this._pLPF = new PressureLPF(settings.pressureLPF || 0, pressure, t);
    this.sm = new StrokeSmoother(smooth);
    this._placer = placer;
    this.sm.push(x, y, pressure, t);   // 第一颗由收集 / 抬笔渲染，落笔不烤
  }

  /** 路的坐标里一个像素多大（二维 1）。 */
  get unit(): number { return this._placer?.unit ?? 1; }
  /** 路的维数。 */
  get dim(): number { return this._placer?.dim ?? 2; }

  /** 喂一个点（屏幕上）。停顿那条规矩：死区锚没离开落笔点前压感 LPF 只对钟不积压感（考古 ai-docs/20260604-stroke-smoother-time-gate.md）。 */
  extend(x: number, y: number, pressure: number, t: number | null = null): void {
    const dwell = !this.sm.wouldMove(x, y);
    const pEff = dwell ? this._pLPF.rebase(t) : this._pLPF.step(pressure, t);
    this.sm.push(x, y, pEff, t);
    this.sm.update();   // 收集读中心线 → 必须更新
  }

  /** 现在的路（给了 PathPlacer = 宿主落出来的；没给 = 中心线本身）。 */
  path(): StrokePath {
    const sm = this.sm;
    return this._placer ? this._placer.place(sm.cx, sm.cy, sm.cp, sm.count, Math.max(0, sm.frozenIndex() + 1)) : centerlinePath(sm);
  }

  /** 走一步多远（这一笔的笔、压感整形、单位都定了）。 */
  private _step = (p: number): number => stepFor(this.settings, p, this.pShape, this.unit);

  /** 定型缓存跟到这条路：从上次的游标接着走到最后一个不会再变的点，新走出来的笔尖原料记下；再把原料按现在的收笔总长算成笔尖（只算新的；总长变了全算）。 */
  private _advance(path: StrokePath): WalkCache {
    const F = Math.min(path.frozenCount, path.count);
    let c = this._wc;
    if (F < c.frozen) c = this._wc = newWalkCache();   // 保底：定型的变少了（不该发生）= 从头走
    c.frozen = F;
    if (F >= 1) {   // 一个都没定型时连起点那一颗也不记（起点那颗读第 0 个点）
      walkPath(path, c.walk, F - 1, this._step, (seg, x, y, z, p, sd) => {
        const o = c.rawN * RAW_W;
        const r = (c.raw = room(c.raw, o + RAW_W));
        r[o] = seg; r[o + 1] = x; r[o + 2] = y; r[o + 3] = z; r[o + 4] = p; r[o + 5] = sd;
        c.rawN++;
      });
    }
    if (c.taper !== this.taperTotal) { c.taper = this.taperTotal; c.tipN = 0; c.tipsFrom = 0; }
    const s = this.settings, shape = this.pShape, unit = this.unit, raw = c.raw;
    for (; c.tipsFrom < c.rawN; c.tipsFrom++) {
      const i = c.tipsFrom * RAW_W;
      const params = stampParamsOf(s, shape, raw[i + 4], raw[i + 5], c.taper, unit);
      if (!params) continue;
      const o = c.tipN * TIP_W;
      const t = (c.tips = room(c.tips, o + TIP_W));
      t[o] = raw[i]; t[o + 1] = raw[i + 1]; t[o + 2] = raw[i + 2]; t[o + 3] = raw[i + 3]; t[o + 4] = params.size; t[o + 5] = params.stampAlpha; t[o + 6] = raw[i + 5];
      c.tipN++;
    }
    return c;
  }

  /** 尾巴：从定型的游标（拷一份）接着走到路的最后一个点，每颗算好交出去。 */
  private _walkTail(path: StrokePath, c: WalkCache, emit: (seg: number, x: number, y: number, z: number, size: number, alpha: number, strokeDist: number) => void): void {
    const s = this.settings, unit = this.unit, shape = this.pShape, taperTotal = this.taperTotal;
    const w: Walk = { ci: c.walk.ci, started: c.walk.started, accumDist: c.walk.accumDist, lastP: c.walk.lastP, strokeDist: c.walk.strokeDist };
    walkPath(path, w, path.count - 1, this._step, (seg, x, y, z, p, sd) => {
      const params = stampParamsOf(s, shape, p, sd, taperTotal, unit);
      if (params) emit(seg, x, y, z, params.size, params.stampAlpha, sd);
    });
  }

  /**
   * 一颗一颗交出这一笔到现在的全部笔尖（纯读；抬笔后自动含收笔渐细）：emit(第几段, x, y, z, 大小, 浓度, 走了多远)。
   * 定型的那一段从缓存里原样交出，只重走还会变的尾巴（每帧的走步只和尾巴有关，1-4d）；交出去的和每次从头走一遍逐位相同。
   * path 要给就给这一笔自己的 path()（缓存靠它的前 frozenCount 个点不变）。
   * 二维的 BrushEngine.collectStamps 直接用它拼笔尖对象（不经过中间数组：画画软件每帧都收集一遍）。
   */
  forEachTip(emit: (seg: number, x: number, y: number, z: number, size: number, alpha: number, strokeDist: number) => void, path: StrokePath = this.path()): void {
    const c = this._advance(path), t = c.tips;
    for (let k = 0, o = 0; k < c.tipN; k++, o += TIP_W) emit(t[o], t[o + 1], t[o + 2], t[o + 3], t[o + 4], t[o + 5], t[o + 6]);
    this._walkTail(path, c, emit);
  }

  /** 收集这一笔到现在的全部笔尖（StrokeTips，含定型的前缀）。 */
  collect(): StrokeTips {
    const path = this.path(), s = this.settings, dim = path.dim, W = dim + 3;
    const c = this._advance(path), t = c.tips;
    const tail: number[] = [];
    this._walkTail(path, c, (_seg, x, y, z, size, alpha, sd) => {
      if (dim === 3) tail.push(x, y, z); else tail.push(x, y);
      tail.push(size, alpha, sd);
    });
    const n = c.tipN + tail.length / W, data = new Float64Array(n * W);
    for (let k = 0, o = 0, d = 0; k < c.tipN; k++, o += TIP_W) {
      data[d++] = t[o + 1]; data[d++] = t[o + 2]; if (dim === 3) data[d++] = t[o + 3];
      data[d++] = t[o + 4]; data[d++] = t[o + 5]; data[d++] = t[o + 6];
    }
    data.set(tail, c.tipN * W);
    // 定型的笔尖 = 缓存里那些（全来自不会再变的段；尾巴上的段都碰到会变的点）。
    // 收笔渐细：总长只会变长（路上不会再变的那部分固定），离这部分的最后一颗超过渐细长度的笔尖不会再被它改
    let frozenTips = c.tipN;
    if (s.taperOut > 0 && frozenTips > 0) {
      const taperLen = s.size * s.taperOut, lastFrozenSd = t[(frozenTips - 1) * TIP_W + 6];
      // 走了多远只增不减 → 「离最后一颗够远」是一段前缀：二分找第一颗不够远的（和一颗一颗数的结果一样）
      let lo = 0, hi = frozenTips;
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (lastFrozenSd - t[mid * TIP_W + 6] >= taperLen) lo = mid + 1; else hi = mid; }
      frozenTips = lo;
    }
    return { dim, count: n, data, frozenCount: frozenTips };
  }

  /** 抬笔：平滑器收尾（把直线桥换成带动量的弧尾、钉终点）；有收笔渐细就沿整条路干走一遍量总长（定型的那一段从缓存的游标接着走）。之后 collect() 含收笔渐细。 */
  finish(): void {
    this.sm.update();
    this.sm.finish();
    const path = this.path(), last = path.count - 1;
    if (last >= 0 && this.settings.taperOut > 0) {
      const c = this._advance(path);
      const dry: Walk = { ci: c.walk.ci, started: c.walk.started, accumDist: c.walk.accumDist, lastP: c.walk.lastP, strokeDist: c.walk.strokeDist };
      walkPath(path, dry, last, this._step, () => {});
      this.taperTotal = dry.strokeDist;
    }
  }
}
