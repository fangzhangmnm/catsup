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

/** 一笔的手感（不认识图层）：落笔建一个，喂点、收集、抬笔。 */
export class StrokeCore {
  readonly settings: ResolvedBrush;
  readonly pShape: PressureShaper;   // 压感整形（pressureCurve LUT 或 p^gamma），落笔时烤一次
  readonly sm: StrokeSmoother;
  private readonly _pLPF: PressureLPF;
  private readonly _placer: PathPlacer | null;
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

  /**
   * 一颗一颗交出这一笔到现在的全部笔尖（每次从头走一遍，纯读；抬笔后自动含收笔渐细）：emit(第几段, x, y, z, 大小, 浓度, 走了多远)。
   * 二维的 BrushEngine.collectStamps 直接用它拼笔尖对象（不经过中间数组：画画软件每帧都收集一遍）。
   */
  forEachTip(emit: (seg: number, x: number, y: number, z: number, size: number, alpha: number, strokeDist: number) => void, path: StrokePath = this.path()): void {
    const s = this.settings, unit = this.unit, shape = this.pShape, taperTotal = this.taperTotal;
    walkPath(path, freshWalk(), path.count - 1, (p) => stepFor(s, p, shape, unit), (seg, x, y, z, p, sd) => {
      const params = stampParamsOf(s, shape, p, sd, taperTotal, unit);
      if (params) emit(seg, x, y, z, params.size, params.stampAlpha, sd);
    });
  }

  /** 收集这一笔到现在的全部笔尖（StrokeTips，含定型的前缀）。 */
  collect(): StrokeTips {
    const path = this.path(), s = this.settings, dim = path.dim;
    const out: number[] = [];
    let n = 0, frozenTips = 0, frozenOpen = true, lastFrozenSd = -Infinity;
    const segFrozen = (seg: number): boolean => (seg < 0 ? path.frozenCount >= 1 : seg + 1 < path.frozenCount);
    const sds: number[] = [];
    this.forEachTip((seg, x, y, z, size, alpha, sd) => {
      if (dim === 3) out.push(x, y, z); else out.push(x, y);
      out.push(size, alpha, sd);
      if (frozenOpen && segFrozen(seg)) { frozenTips++; sds.push(sd); lastFrozenSd = sd; } else frozenOpen = false;
      n++;
    }, path);
    // 收笔渐细：总长只会变长（路上不会再变的那部分固定），离这部分的最后一颗超过渐细长度的笔尖不会再被它改
    if (s.taperOut > 0 && frozenTips > 0) {
      const taperLen = s.size * s.taperOut;
      let k = 0;
      while (k < frozenTips && lastFrozenSd - sds[k] >= taperLen) k++;
      frozenTips = k;
    }
    return { dim, count: n, data: Float64Array.from(out), frozenCount: frozenTips };
  }

  /** 抬笔：平滑器收尾（把直线桥换成带动量的弧尾、钉终点）；有收笔渐细就沿整条路干走一遍量总长。之后 collect() 含收笔渐细。 */
  finish(): void {
    this.sm.update();
    this.sm.finish();
    const path = this.path(), last = path.count - 1;
    if (last >= 0 && this.settings.taperOut > 0) {
      const dry = freshWalk();
      walkPath(path, dry, last, (p) => stepFor(this.settings, p, this.pShape, this.unit), () => {});
      this.taperTotal = dry.strokeDist;
    }
  }
}
