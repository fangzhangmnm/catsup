// 笔刷引擎 v98（Krita-aligned + 双 path）。详 ai-docs/20260529-brush-architecture.md。
//
// **核心模型**：
//   per stamp at pressure p：
//     p' = p ^ pressureGamma
//     size_mul = signed_lerp(sizeCoeff, p')
//     flow_mul = signed_lerp(flowCoeff, p')
//     opa_mul  = signed_lerp(opaCoeff,  p')
//     size_eff = preset.size × size_mul
//     stamp_α  = state.brush.flow × flow_mul × opa_mul    ← user.opacity 不在这里
//
//   stroke buffer 内重叠合成（compositeMode 决定）：
//     buildup  (PS 默认 / 喷枪 feel): buffer = 1 − ∏(1 − stamp_α × shape_α)
//     wash     (Krita Alpha Darken):  buffer = max(buffer, stamp_α × shape_α)
//   v107: 两 mode 都走 JS per-pixel (Uint8 buffer)。原 Build-Up 用 Canvas2D 原生 source-over
//   + cached colored gradient，gradient linear interp 在 boundary 不平滑要 16 stops 逼近，复杂；
//   且 8-bit RGBA buffer 还有 quantize 问题。user 论证 per-pixel JS 70k×50/sec = 3.5M ops/sec
//   JS 不卡，更稳妥。两 mode 同 path，shape α 走解析 smoothstep。
//
//   endStroke composite to layer：
//     globalAlpha = user.opacity  ← Π 外面那一层乘 opacity
//     normal 模式 source-over；erase 模式 destination-out
//
// **为啥 opacity 在 Π 外**：flow 在 Π 内、opacity 在 Π 外是 PS / Krita 的标准。
//   spacing=100% 无重叠时 Π 退化为单项 → flow 和 opacity 可交换；
//   spacing<100% 有重叠时 flow 被 Π 放大、opacity 不被 → 出现 "10%flow > 100%flow×10%opa" 那种现象。
//
// **渲染路径（v351：GL board 唯一）**：
//   buffered（brush/erase，非 pixel）—— 手感数学留 CPU（smoother 中心线 + _walkStamps 间距 + _stampParams
//     压感/taper），但栅格化全走 GPU：live overlay 与 commit 都经 collectStamps（fresh walk 读 sm.C）→
//     board 的 GLStampRasterizer（falloff/buildup/wash 累积在 GPU）。CPU frozen/tail buffer + overlay 合成
//     已归档（→ ARCHIVE/old-brush-cpu-raster.ts；frozen/tail 双 buffer = #4 GPU 缓存 spec）。
//   pixelMode —— immediate（_extendImmediate/_stampOne/_pixelStampDirect 直接 editRegion 进 layer），仍 CPU。
//   平滑核 v249 = 时间常数指数追踪（详 ai-docs/20260613-brush-procreate-smoothing.md）：smoother 给平滑中心线 C；
//     抬笔 finish() 收尾把直线桥换成动量弧尾、钉终点。

import { makePressureShaper, type PressureShaper } from "../common/pressure-curve.ts";
import { StrokeSmoother, PressureLPF } from "./stroke-smoother.ts";
import type { ViewLeaf } from "./workpiece/painting-view.ts";
import type { ResolvedBrush } from "../common/resolved-brush.ts";
import type { Stamp, StrokeShape } from "./gl/gl-stamp.ts";

interface RgbColor { r: number; g: number; b: number; }

interface StampParams { size: number; stampAlpha: number; }

// frozen/tail 沿平滑中心线撒点的游标
interface Walk {
  ci: number;
  started: boolean;
  accumDist: number;
  lastP: number;
  strokeDist: number;
}

type Rect = [number, number, number, number];

// 进行中描边的全部可变态（begin 建、extend/end 改、end 清）
interface StrokeState {
  layer: ViewLeaf;
  settings: ResolvedBrush;
  pShape: PressureShaper;   // 2026-09-05 压感整形（pressureCurve LUT 或 p^gamma），begin 时烤一次
  mode: string;
  buffered: boolean;
  lastX: number;
  lastY: number;
  lastP: number;
  pLPF: PressureLPF;
  accumDist: number;
  strokeDist: number;
  dirty: Rect | null;
  isBuildup: boolean;
  _taperTotal: number | null;
  sm: StrokeSmoother | null;
  frozenWalk: Walk;   // endStroke 出端 taper 干走（GL 模式停在 ci=0，dry-walk 从 0 走全程算总笔长）
}

// 引擎默认参数袋 DEFAULT_CONFIG（= ResolvedBrush 的 base）已下沉 current-brush-config.ts（纯数据契约）；
// dead class BrushSettings（旧可变单例）随之删除——当前笔早已收敛成不可变 ResolvedBrush（见 ai-docs/CONTEXT [[当前笔]]）。

// signed_lerp：coeff ∈ [−1, 1]，p ∈ [0, 1]，返回 ∈ [amp, 1] where amp = 1 − |coeff|。
//   coeff ≥ 0：amp + (1 − amp) × p  →  p=0 → amp，p=1 → 1
//   coeff < 0：1 + (amp − 1) × p    →  p=0 → 1，  p=1 → amp
//   coeff = 0：永远 1（不响应压感）
function signedLerp(coeff: number, p: number) {
  const amp = 1 - Math.abs(coeff);
  return coeff >= 0 ? amp + (1 - amp) * p
                    : 1 + (amp - 1) * p;
}

export class BrushEngine {
  _stroke: StrokeState | null;
  constructor() {
    this._stroke = null;
  }

  // step = size_eff × spacing；低压感 size 小 → step 小，不会出豆豆链
  _stepFor(s: ResolvedBrush, pressure: number, shape: PressureShaper) {
    const p = Math.max(0, Math.min(1, pressure));
    const pCurve = shape(p);
    const sizeMul = signedLerp(s.sizeCoeff || 0, pCurve);
    const effSize = s.size * sizeMul;
    return Math.max(0.5, effSize * s.spacing);
  }

  // smooth: { tau(ms), deadzone(doc px) }。t = 起手事件时间戳(ms)。详 ai-docs/20260613-brush-procreate-smoothing.md。
  //   tau=0 & deadzone=0 → 不平滑（直通 raw）。
  beginStroke(layer: ViewLeaf, settings: ResolvedBrush, x: number, y: number, pressure: number, mode: string = "brush", smooth: { tau?: number; deadzone?: number; tailBow?: number } = {}, t: number | null = null) {
    const isBuildup = (settings.compositeMode || "wash") === "buildup";
    // buffered = 走 frozen/tail 平滑（进 buffer）；pixel = immediate（直接进 layer）
    const buffered = !settings.pixelMode;
    const pLPF0 = pressure;
    this._stroke = {
      layer, settings, mode,
      pShape: makePressureShaper(settings),
      buffered,
      lastX: x, lastY: y, lastP: pLPF0,
      // 压感 LPF（backend 手感数学，C5）：事件钟，起点锚在 down 事件的 t
      pLPF: new PressureLPF(settings.pressureLPF || 0, pLPF0, t),
      accumDist: 0,
      strokeDist: 0,
      dirty: null,
      isBuildup,
      _taperTotal: null,                        // endStroke 时填总笔长，给出端 taper 用（live 为 null=不 taper）
      // --- v243 Procreate EMA + 死区 + 贴笔尖（详 ai-docs/20260613-brush-procreate-smoothing.md）---
      sm: buffered ? new StrokeSmoother(smooth) : null,
      // frozen 撒点游标：GL 模式 collectStamps 用 fresh walk，此游标只供 endStroke taper dry-walk 从 ci=0 走全程。
      frozenWalk: { ci: 0, started: false, accumDist: 0, lastP: pLPF0, strokeDist: 0 },
    };
    if (buffered) {
      this._stroke.sm!.push(x, y, pressure, t);   // 第一颗由 tail / endStroke 渲染，begin 不烤
    } else {
      this._stampOne(x, y, pressure);
    }
  }

  extendStroke(x: number, y: number, pressure: number, t: number | null = null) {
    const st = this._stroke;
    if (!st) return;
    // NaN/inf 护栏：甩太快 / 坏事件可能传入非有限坐标 → 跳过
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    // 压感 LPF：dt 取事件 t 差（与位置平滑同一口钟；壁钟已拔除——backend/stroke-smoother.ts）
    // 2026-09-06 起笔静止期不积压感（user「大笔刷 flat 顿一下会产生墨点」；考古 ai-docs/20260604-stroke-smoother-time-gate.md：
    //   弧长看不见顿）：压感 LPF 走时间、taper-in 走弧长——落笔顿住时 LPF 已涨到按压力、strokeDist 仍为 0，起步后
    //   taper 在半个笔宽内放开 → 满压粗头。修法：死区锚没离开落笔点前 LPF 只对钟不积压感，起步时从落笔压感起追，
    //   与不顿的起笔完全同形（顿多久都等于没顿）。pixel（immediate）路径无 smoother，不动。
    const dwell = st.buffered && st.sm != null && !st.sm.wouldMove(x, y);
    const pEff = dwell ? st.pLPF.rebase(t) : st.pLPF.step(pressure, t);
    if (st.buffered) this._extendBuffered(x, y, pEff, t);
    else this._extendImmediate(x, y, pEff);
  }

  // pixel：raw 点直接沿段等距撒进 layer（无 frozen/tail，无法重画）
  _extendImmediate(x: number, y: number, pEff: number) {
    const st = this._stroke!;
    const dx = x - st.lastX, dy = y - st.lastY;
    const L = Math.hypot(dx, dy);
    if (L === 0) return;
    let pos = 0;
    while (true) {
      const step = this._stepFor(st.settings, pEff, st.pShape);
      if (st.accumDist + (L - pos) < step) break;
      const need = step - st.accumDist;
      pos += need;
      st.strokeDist += step;
      const t = pos / L;
      const sx = st.lastX + dx * t, sy = st.lastY + dy * t;
      const sp = st.lastP + (pEff - st.lastP) * t;
      const r = (st.settings.size || 4) / 2;
      if (sx >= -r && sx <= st.layer.docW + r && sy >= -r && sy <= st.layer.docH + r) {
        this._stampOne(sx, sy, sp);
      }
      st.accumDist = 0;
    }
    st.accumDist += L - pos;
    st.lastX = x; st.lastY = y; st.lastP = pEff;
  }

  // brush / erase：raw 进 smoother，把新冻结的中心线段烤进 frozen buffer。
  // tail 不在这里画（每帧 getLiveOverlay 时画）。
  // buffered（brush/erase）描边推进：raw 进 smoother + 更新中心线 C。GL board 唯一路径下 live overlay/commit
  //   都走 collectStamps（fresh walk 读 sm.C，不碰 frozenWalk）→ 这里不再烤 CPU frozen buffer（已归档）。
  _extendBuffered(x: number, y: number, pEff: number, t: number | null = null) {
    const st = this._stroke!;
    st.sm!.push(x, y, pEff, t);
    st.sm!.update();   // collectStamps 读 sm.C → 必须更新
  }

  // 沿平滑中心线 C 从 walk 游标走到 endIdx 顶点，等距撒点，每颗调 emit(x,y,p,strokeDist)。
  // 起点补一颗（continuous walk 否则缺起点）。修改 walk 游标（frozen 用真游标 / tail 用拷贝）。
  _walkStamps(walk: Walk, endIdx: number, emit: (x: number, y: number, p: number, strokeDist: number) => void) {
    const st = this._stroke!;
    const sm = st.sm!;
    if (!walk.started && sm.count > 0) {
      walk.started = true;
      emit(sm.cx[0], sm.cy[0], sm.cp[0], walk.strokeDist);
    }
    while (walk.ci < endIdx) {
      const i = walk.ci;
      const x0 = sm.cx[i], y0 = sm.cy[i], p0 = sm.cp[i];
      const x1 = sm.cx[i + 1], y1 = sm.cy[i + 1], p1 = sm.cp[i + 1];
      const dx = x1 - x0, dy = y1 - y0;
      const L = Math.hypot(dx, dy);
      if (L > 0) {
        let pos = 0;
        while (true) {
          const curP = p0 + (p1 - p0) * (pos / L);
          const step = this._stepFor(st.settings, curP, st.pShape);
          if (walk.accumDist + (L - pos) < step) break;
          pos += step - walk.accumDist;
          walk.strokeDist += step;
          const t = pos / L;
          emit(x0 + dx * t, y0 + dy * t, p0 + (p1 - p0) * t, walk.strokeDist);
          walk.accumDist = 0;
        }
        walk.accumDist += L - pos;
      }
      walk.lastP = p1;
      walk.ci = i + 1;
    }
  }

  // 抬笔（S8）：smoother finish + 出端 taper 量算 → 返回最终 collectStamps（含 final tail + taper）。
  //   落层由调用方走 board.commitBrushStroke（GPU merge = live 同一 shader，SSOT）；本引擎不再自己合成
  //   ——旧 readback-canvas→editRegion Canvas2D 路径死（live 与 commit 的合成引擎从此同一个）。
  //   pixelMode / 非 buffered / 空 stroke → null（pixel 已 immediate 落层，无需 commit）。
  endStroke(): ReturnType<BrushEngine["collectStamps"]> {
    const st = this._stroke;
    let out: ReturnType<BrushEngine["collectStamps"]> = null;
    if (st && st.buffered) {
      st.sm!.update();
      st.sm!.finish();                    // 抬笔收尾：把直线桥换成带动量的弧尾、钉终点（画到头）
      const last = st.sm!.count - 1;
      // 出端 taper 需总笔长 → frozenWalk 从 ci=0 干走一遍量 total（不烤），再设 _taperTotal 给 collectStamps。
      if (last >= 0 && st.settings.taperOut > 0) {
        const dry = { ci: st.frozenWalk.ci, started: st.frozenWalk.started, accumDist: st.frozenWalk.accumDist, lastP: st.frozenWalk.lastP, strokeDist: st.frozenWalk.strokeDist };
        this._walkStamps(dry, last, () => {});
        st._taperTotal = dry.strokeDist;
      }
      out = this.collectStamps();   // 含 final tail + taper（_taperTotal 已设）
    }
    this._stroke = null;
    return out;
  }

  cancelStroke() { this._stroke = null; }

  // 形状笔像素圆（ADR-0005）：在指定位置补一颗 stamp——每像素恰好一次，绕过 spacing 走步器。
  //   落格/圆盘/lockAlpha 语义复用 _stampOne 单一实现（别在上层重抄）。仅 pixelMode 有可见效果
  //   （buffered 的可见 stamp 走 collectStamps，_stampOne 只记 dirty）。
  stampAt(x: number, y: number, pressure: number) {
    if (!this._stroke) return;
    this._stampOne(x, y, pressure);
  }

  // 批量像素落点（user 2026-07-25 批准）：逐像素 stampAt = 每点一次 editRegion，是像素透视大圆
  //   拖拽卡顿的热点（几千次调用/帧）。这里按 **128px 桶**分组、每桶一次 editRegion 批画——
  //   不能整批一个大 bbox：圆环的 bbox 盖住整圆面积，editRegion 会把途中所有 tile 标写 →
  //   GPU 全区重传反而更卡。绘制语义逐位同 _pixelStampDirect（v104 落格 + #28 Bresenham disc +
  //   v242 lockAlpha source-atop）。恒压场景专用（params 只算一次）。
  stampPixels(pts: Array<{ x: number; y: number }>, pressure: number) {
    const st = this._stroke;
    if (!st || !pts.length) return;
    const s = st.settings;
    if (!s.pixelMode) { for (const p of pts) this._stampOne(p.x, p.y, pressure); return; }
    const params = this._stampParams(pressure, st.strokeDist);
    if (!params) return;
    const { size, stampAlpha } = params;
    const intSize = Math.max(1, Math.round(size));
    const B = 128;
    // 分桶（桶键 = 落格左上角所在的 128 格；stamp 全身落在「桶矩形 + intSize 出血」内）
    const buckets = new Map<string, number[]>();
    let dx0 = Infinity, dy0 = Infinity, dx1 = -Infinity, dy1 = -Infinity;
    for (const p of pts) {
      const ix = Math.floor(p.x - (intSize - 1) / 2);
      const iy = Math.floor(p.y - (intSize - 1) / 2);
      const k = Math.floor(ix / B) + "," + Math.floor(iy / B);
      let arr = buckets.get(k);
      if (!arr) { arr = []; buckets.set(k, arr); }
      arr.push(ix, iy);
      if (ix < dx0) dx0 = ix; if (iy < dy0) dy0 = iy;
      if (ix + intSize > dx1) dx1 = ix + intSize;
      if (iy + intSize > dy1) dy1 = iy + intSize;
    }
    // v0.6.41 去 canvas 化：每桶一次 editRegionBytes，圆盘走共享字节核（语义逐位同 _pixelStampDirect）
    const as = stampAlpha * Math.max(0, Math.min(1, s.opacity ?? 1.0));
    const comp = st.mode === "erase" ? "erase" as const : (st.layer.lockAlpha ? "atop" as const : "over" as const);
    const rgb = st.mode === "erase" ? { r: 0, g: 0, b: 0 } : hexToRgbObj(s.color || "#000");
    const rw = B + intSize, rh = B + intSize;
    for (const [k, cells] of buckets) {
      const [bx, by] = k.split(",").map(Number);
      const rx = bx * B, ry = by * B;
      st.layer.editRegionBytes(rx, ry, rw, rh, (buf, ox, oy) => {
        for (let i = 0; i < cells.length; i += 2) {
          this._pixelDiscInto(buf, rw, rh, ox, oy, cells[i], cells[i + 1], intSize, rgb, as, comp);
        }
      });
    }
    this._markDirty(dx0 - 1, dy0 - 1, dx1 + 1, dy1 + 1);
  }

  // Stage 3：收集当前 stroke 全部 stamp（frozen 0..count-1，含 tail）为列表 + stroke 笔形 —— 给 GPU 栅格器
  //   (GLStampRasterizer，board 消费)。**复用 _walkStamps(手感间距) + _stampParams(压感/taper)**，与 CPU
  //   _emitFrozen 同源 → 手感逐位一致；纯读（传 fresh walk，不碰 live cursor/buffer）。endStroke 后 _taperTotal
  //   有值则自动含出端 taper。pixelMode/未描边 → null（caller 回退）。color 给 0..1；erase 由 caller 用 mode 处理。
  collectStamps(): { stamps: Stamp[]; shape: StrokeShape; layer: ViewLeaf; mode: string; opacity: number; blendMode: string; bx: number; by: number; bw: number; bh: number } | null {
    const st = this._stroke;
    if (!st || !st.buffered || !st.sm || st.settings.pixelMode) return null;
    const out: Stamp[] = [];
    const walk: Walk = { ci: 0, started: false, accumDist: 0, lastP: 0, strokeDist: 0 };
    this._walkStamps(walk, st.sm.count - 1, (x, y, p, sd) => {
      const params = this._stampParams(p, sd);
      if (params) out.push({ x, y, size: params.size, alpha: params.stampAlpha });
    });
    // stamp 包围盒（doc 坐标，+1px falloff 余量，clamp 到 doc）——live overlay + commit 共用。
    const docW = st.layer.docW, docH = st.layer.docH;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s2 of out) { const r = s2.size / 2 + 1; if (s2.x - r < x0) x0 = s2.x - r; if (s2.y - r < y0) y0 = s2.y - r; if (s2.x + r > x1) x1 = s2.x + r; if (s2.y + r > y1) y1 = s2.y + r; }
    const bx = out.length ? Math.max(0, Math.floor(x0)) : 0;
    const by = out.length ? Math.max(0, Math.floor(y0)) : 0;
    const bw = out.length ? Math.min(docW, Math.ceil(x1)) - bx : 0;
    const bh = out.length ? Math.min(docH, Math.ceil(y1)) - by : 0;
    const s = st.settings;
    const useEllipse = s.shapeKind === "ellipse" && (s.shapeAspect !== 1 || s.shapeRotation !== 0);
    const col = hexToRgbObj(s.color);
    return {
      stamps: out, bx, by, bw, bh,
      shape: {
        hardness: s.hardness, color: [col.r / 255, col.g / 255, col.b / 255], buildup: st.isBuildup,
        aspect: useEllipse ? s.shapeAspect : 1, rotation: useEllipse ? s.shapeRotation : 0,
      },
      layer: st.layer,
      mode: st.mode,
      opacity: Math.max(0, Math.min(1, s.opacity ?? 1.0)),   // Π-outer（commit/overlay 时一次性乘）
      blendMode: s.blendMode || "source-over",
    };
  }

  flushDirty() {
    const st = this._stroke;
    if (!st || !st.dirty) return null;
    const d = st.dirty;
    st.dirty = null;
    return d;
  }

  // pressure → {size, stampAlpha}（taper / signedLerp dynamics）。null = 太淡跳过。
  // strokeDist 决定 anti-spike taper 包络（frozen / tail walk 各传自己的）。
  _stampParams(pressure: number, strokeDist: number): StampParams | null {
    const st = this._stroke!;
    const s = st.settings;
    const taperFloor = s.taperFloor;   // v415 起是 ResolvedBrush 的显式字段（per-brush 可调，不再恒 0.4）
    let p = Math.max(0, Math.min(1, pressure));
    // 入端 taper：起手 fade-in（也兼顾 Apple Pencil 落笔 spike → 萝卜尖）
    if (s.taperIn > 0) {
      const t = Math.min(1, strokeDist / (s.size * s.taperIn));
      p *= taperFloor + (1 - taperFloor) * t;
    }
    // 出端 taper：末端 fade-out。需总笔长 → 只在 endStroke 时 st._taperTotal 有值（live 不 taper）
    if (s.taperOut > 0 && st._taperTotal != null) {
      const distFromEnd = st._taperTotal - strokeDist;
      const taperLen = s.size * s.taperOut;
      if (distFromEnd < taperLen) {
        const t = Math.max(0, distFromEnd / taperLen);
        p *= taperFloor + (1 - taperFloor) * t;
      }
    }
    const pCurve = st.pShape(p);   // pressureCurve LUT 或 p^gamma（common/pressure-curve.ts）
    const size = Math.max(0.5, s.size * signedLerp(s.sizeCoeff || 0, pCurve));
    const effFlow = Math.max(0, Math.min(1, s.flow * signedLerp(s.flowCoeff || 0, pCurve)));
    const stampAlpha = effFlow * signedLerp(s.opaCoeff || 0, pCurve);
    if (stampAlpha < 0.001) return null;
    return { size, stampAlpha };
  }

  // immediate 路径（pixel）：算 params + 直接进 layer。
  _stampOne(x: number, y: number, pressure: number) {
    const st = this._stroke;
    if (!st) return;
    const s = st.settings;
    const params = this._stampParams(pressure, st.strokeDist);
    if (!params) return;
    const { size, stampAlpha } = params;
    const radius = size / 2;
    const x0 = x - radius - 1, y0 = y - radius - 1, x1 = x + radius + 1, y1 = y + radius + 1;
    // （tile era：写走 editRegion/putImageData 按需分配 tile，无需预扩容——旧 ensureBbox 调用已删）
    if (s.pixelMode) {
      this._pixelStampDirect(x, y, size, stampAlpha);
    }
    this._markDirty(x0, y0, x1, y1);
  }

  // ---- 像素模式字节核（v0.6.41 去 canvas 化）：纯色 stamp 的三种合成逐字节实现 ----
  //   over = source-over；erase = destination-out（只衰减 alpha，RGB 保留——与 tile 惯例一致）；
  //   atop = source-atop（v242 lockAlpha：只改已有像素颜色，不增删 alpha）。
  //   语义对齐旧 canvas 版；精度更高（无 premult u8 往返）。
  private _pixelBlendSpan(buf: Uint8ClampedArray, rw: number, px: number, py: number, n: number, rgb: { r: number; g: number; b: number }, as: number, comp: "over" | "erase" | "atop") {
    let i = (py * rw + px) * 4;
    for (let k = 0; k < n; k++, i += 4) {
      if (comp === "erase") { buf[i + 3] = Math.round(buf[i + 3] * (1 - as)); continue; }
      const ab = buf[i + 3] / 255;
      if (comp === "atop") {
        if (ab <= 0) continue;
        buf[i] = Math.round(rgb.r * as + buf[i] * (1 - as));
        buf[i + 1] = Math.round(rgb.g * as + buf[i + 1] * (1 - as));
        buf[i + 2] = Math.round(rgb.b * as + buf[i + 2] * (1 - as));
        continue;
      }
      const ao = as + ab * (1 - as);
      if (ao <= 0) continue;
      buf[i]     = Math.round((rgb.r * as + buf[i]     * ab * (1 - as)) / ao);
      buf[i + 1] = Math.round((rgb.g * as + buf[i + 1] * ab * (1 - as)) / ao);
      buf[i + 2] = Math.round((rgb.b * as + buf[i + 2] * ab * (1 - as)) / ao);
      buf[i + 3] = Math.round(ao * 255);
    }
  }
  // 一颗像素圆盘（Bresenham disc，#28 语义原样）写进区域缓冲。(ix,iy)=落格左上（doc），(ox,oy)=区域原点。
  // v0.7.25 公开薄口：选区笔像素变体复用同一 disc 核（sel-pen.stampsToBinaryGray8 注入用，防第二份圆栅格）。
  pixelDiscInto(buf: Uint8ClampedArray, rw: number, rh: number, ox: number, oy: number, ix: number, iy: number, intSize: number, rgb: { r: number; g: number; b: number }, as: number, comp: "over" | "erase" | "atop") {
    this._pixelDiscInto(buf, rw, rh, ox, oy, ix, iy, intSize, rgb, as, comp);
  }
  private _pixelDiscInto(buf: Uint8ClampedArray, rw: number, rh: number, ox: number, oy: number, ix: number, iy: number, intSize: number, rgb: { r: number; g: number; b: number }, as: number, comp: "over" | "erase" | "atop") {
    const clip = (px: number, py: number, n: number) => {
      if (py < 0 || py >= rh) return;
      let a = px, b2 = px + n - 1;
      if (a < 0) a = 0;
      if (b2 >= rw) b2 = rw - 1;
      if (b2 >= a) this._pixelBlendSpan(buf, rw, a, py, b2 - a + 1, rgb, as, comp);
    };
    if (intSize <= 2) {
      for (let j = 0; j < intSize; j++) clip(ix - ox, iy - oy + j, intSize);
      return;
    }
    const r = intSize / 2, re2 = (r - 0.25) * (r - 0.25);
    for (let j = 0; j < intSize; j++) {
      const dy = j + 0.5 - r;
      const w2 = re2 - dy * dy;
      if (w2 <= 0) continue;
      const w = Math.sqrt(w2);
      const a = Math.max(0, Math.ceil(r - w - 0.5));
      const b = Math.min(intSize - 1, Math.floor(r + w - 0.5));
      if (b >= a) clip(ix - ox + a, iy - oy + j, b - a + 1);
    }
  }

  _pixelStampDirect(x: number, y: number, size: number, stampAlpha: number) {
    const st = this._stroke!;
    const s = st.settings;
    const layer = st.layer;
    const intSize = Math.max(1, Math.round(size));
    // v104: 像素中心位置（doc 坐标）。pixel i 覆盖 [i, i+1)；floor(x - (intSize-1)/2)：intSize=1 时=floor(x) ✓。
    const ix = Math.floor(x - (intSize - 1) / 2);
    const iy = Math.floor(y - (intSize - 1) / 2);
    // v0.6.41 去 canvas 化：字节核（#28 Bresenham disc + v242 lockAlpha source-atop 语义原样）
    const as = stampAlpha * Math.max(0, Math.min(1, s.opacity ?? 1.0));
    const comp = st.mode === "erase" ? "erase" as const : (layer.lockAlpha ? "atop" as const : "over" as const);
    const rgb = st.mode === "erase" ? { r: 0, g: 0, b: 0 } : hexToRgbObj(s.color || "#000");
    layer.editRegionBytes(ix, iy, intSize, intSize, (buf, ox, oy) => {
      this._pixelDiscInto(buf, intSize, intSize, ox, oy, ix, iy, intSize, rgb, as, comp);
    });
  }

  _markDirty(x0: number, y0: number, x1: number, y1: number) {
    const st = this._stroke!;
    const d = st.dirty;
    if (d) {
      if (x0 < d[0]) d[0] = x0;
      if (y0 < d[1]) d[1] = y0;
      if (x1 > d[2]) d[2] = x1;
      if (y1 > d[3]) d[3] = y1;
    } else {
      st.dirty = [x0, y0, x1, y1];
    }
  }
}

function hexToRgbObj(hex: string): RgbColor {
  if (!hex || hex[0] !== "#") return { r: 0, g: 0, b: 0 };
  if (hex.length === 7) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }
  if (hex.length === 4) {
    return {
      r: parseInt(hex[1] + hex[1], 16),
      g: parseInt(hex[2] + hex[2], 16),
      b: parseInt(hex[3] + hex[3], 16),
    };
  }
  return { r: 0, g: 0, b: 0 };
}

// （hexToRgba 已删 v415：零调用者。要 rgba 字符串的地方自己用 hexToRgbObj 拼。）
