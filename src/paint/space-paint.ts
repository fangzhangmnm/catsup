// paint/space-paint.ts —— 空间里的一笔，接到画板上（贴图主线 1-4b）：1-4a 的控制器 → 这张贴图的薄层（三维显卡接口）→ 画板的档口（0-5 host 方式）。created 2026-11-11 by Claude Opus 5.5
// 一次手势 = 一笔 = 档口一个令牌 = 内核撤销栈里一步。第一笔时建画板（登记处 ensure）。这一张只接一张贴图、一份摆放（名单不止一项 = 抛，记在施工记录里）。
// 每帧的活登记进画板登记处的「准备」（编辑器在渲染之前明着调一次）：取笔尖 → 新定型的画进定型层、尾巴每帧重画 → 包成内核的纹理对象交给档口 → 画板合成。
// 定型：笔尖所在那一段两头的路点都定型了（seg + 1 < 路的定型点数）。抬笔：收笔的渐细这时才知道总长，所以抬笔时定型层清掉、整笔重画一次（只这一次），再落层。
// 橡皮 = 同一支笔，交给档口时 erase = true。取消 = 档口取消（零痕迹）。
import { SpaceStroke, type SpaceCamera } from "./space-stroke.ts";
import { paintMeter } from "./frame-meter.ts";
import { SpaceLayer, type FaceTables } from "./space-layer.ts";
import type { SpacePrep } from "./space-prep.ts";
import type { SpaceData, SpaceGpu, SpaceImage } from "./space-gpu.ts";
import type { PaintBoards } from "./boards.ts";
import type { PaintBoard } from "./board.ts";
import type { PaintTarget } from "./space-target.ts";
import { resolveBrush, type ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";
import type { ExternalTexture } from "./kernel/src/common/gl2-port.ts";
import type { StrokeSession } from "./kernel/src/backend/stroke-session.ts";
import type { InkTip } from "./tip-truth.ts";
import type { Scene } from "../scene/scene.ts";
import type { Guid } from "../format/guid.ts";

export interface SpacePaintDeps {
  readonly boards: PaintBoards;
  readonly scene: () => Scene;
  /** 这张画（按画板实际的画布）在世界里摆在哪几处（paint-targets.ts）。 */
  readonly targets: (texture: Guid) => PaintTarget[];
  /** 三维的显卡接口（真显卡版 / 软件版）。 */
  readonly gpu: () => SpaceGpu | null;
  /** 画画的准备（1-4c）：整份几何 + 每格的表，落笔只取现成的；没准备好 = 这一笔不开始（PrepPendingError / 建不了的那个错）。 */
  readonly prep: SpacePrep;
  /** 这张离屏图在这个显卡接口上交给内核的形态（真显卡 = { gl }，软件版 = { pixels }）。 */
  readonly external: (img: SpaceImage) => { readonly gl: WebGLTexture } | { readonly pixels: Uint8Array | Uint8ClampedArray };
  readonly camera: () => SpaceCamera;
  /** 一笔落层之后（内核封的那几步在画板登记处攒着）：交给三维的撤销栈当一步（1-8a；label = 画一笔 / 擦一笔）。不给 = 不进三维的栈（测试）。 */
  readonly commitStep?: (erase: boolean) => void;
  /** 这一笔开不了（建这一笔的表时出错，比如画布上的格子超过这一版的上限）：这一笔已经取消、零痕迹；告诉宿主为什么（1-7：不许每帧在「准备」里抛）。 */
  readonly failed?: (err: unknown) => void;
}
export interface SpacePaintOpts {
  readonly brush: ResolvedBrush;
  readonly color: readonly [number, number, number];
  readonly accum: "max" | "over";
  readonly erase?: boolean;
}


/** 调试钩子 / 探针用的一支笔：屏幕上 size 像素、间距 0.1、浓度 1、不随压感变、没有起笔渐细（收笔渐细按 taperOut）。笔刷设置的界面是后面的施工单。 */
export function hookBrush(o: { readonly size?: number; readonly hardness?: number; readonly taperOut?: number }): ResolvedBrush {
  return { ...resolveBrush({ size: o.size ?? 20, color: "#000000" }), spacing: 0.1, flow: 1, opacity: 1, sizeCoeff: 0, flowCoeff: 0, opaCoeff: 0, pressureGamma: 1, pressureLPF: 0, taperIn: 0, taperOut: o.taperOut ?? 0, streamline: 0, stabilization: 0, hardness: o.hardness ?? 0.5 } as ResolvedBrush;
}

export class SpacePaintStroke {
  private readonly d: SpacePaintDeps;
  private readonly o: SpacePaintOpts;
  private readonly board: PaintBoard;
  private readonly stroke: SpaceStroke;
  private readonly gpu: SpaceGpu;
  private session: StrokeSession | null = null;
  private layer: SpaceLayer | null = null;
  private ext: ExternalTexture | null = null;
  private layerId = 0;
  private dirty = false;
  private finishing = false;
  /** 已经画进定型层的笔尖数（这些不再取、不再算碰到哪些三角形）。 */
  private drawn = 0;
  private readonly unhook: () => void;

  constructor(d: SpacePaintDeps, texture: Guid, o: SpacePaintOpts) {
    this.d = d; this.o = o;
    const gpu = d.gpu();
    if (!gpu) throw new Error("SpacePaintStroke: no GPU for the space layer");
    this.gpu = gpu;
    this.board = d.boards.ensure(d.scene(), texture);   // 第一笔时建画板
    const targets = d.targets(texture);
    if (targets.length !== 1) throw new Error(`SpacePaintStroke: ${targets.length} placements of this paint (1-4b handles exactly one)`);
    const ready = targets.map((t) => d.prep.take(t));   // 没准备好 / 过期了 = 抛 PrepPendingError（不现建：建表不许在落笔那一下）；建不了 = 抛那个错
    this.cells = ready[0].cells; this.tables = ready[0].tables;
    this.stroke = new SpaceStroke(targets, d.camera(), o.brush, { geos: ready.map((r) => r.geo) });
    this.unhook = d.boards.onPrepare(() => this.prepare());
    this.untrack = d.boards.trackOpen(texture, () => this.cancel());   // 撤销 / 重做之前：开着的这一笔先取消（1-8a）
  }
  private readonly untrack: () => void;
  /** 借来的每格的表（画画的准备那里的；这一笔不放）。 */
  private readonly cells: SpaceData;
  /** 面表 / 三角形表（准备里建好的，借来用；1-4d 第 3 条：落笔不再现做）。 */
  private readonly tables: FaceTables;

  down(x: number, y: number, p: number, t: number | null = null): void { this.stroke.down(x, y, p, t); this.dirty = true; }
  move(x: number, y: number, p: number, t: number | null = null): void { this.stroke.move(x, y, p, t); this.dirty = true; }
  /** 抬笔：整笔重画一次（收笔渐细）→ 落层（内核一步）。在下一次「准备」里做完；这里先把它准备好。 */
  up(): void {
    if (this.broken) return;   // 建表 / 某一帧出过错、已经取消：抬笔什么都不做
    const t0 = performance.now();
    this.stroke.up(); this.finishing = true; this.dirty = true;
    const t1 = performance.now();
    this.prepare();
    const t2 = performance.now();
    this.finish();
    this.lastUp = { pathMs: t1 - t0, redrawMs: t2 - t1, ...this.lastFrame, endMs: performance.now() - t2 };
  }
  /** 抬笔那一下各段（量；毫秒）：收路 / 整笔重画（含取笔尖、画薄层、交档口）/ 落层（档口 end = 内核写回）。 */
  lastUp: Record<string, number> = {};
  cancel(): void { this.stroke.cancel(); this.session?.cancel(); this.board.overlayChanged(); this.close(); }
  /** 这一笔到现在一帧里最大的那张数据表（个数、哪张、上限；探针量）。 */
  peak: { values: number; table: string; cap: number } = { values: 0, table: "", cap: 0 };
  /** 现在的范围（报给内核的那一块；探针用）。 */
  range(): { x: number; y: number; w: number; h: number } | null { return this.layer?.range() ?? null; }
  tipCount(): number { return this.stroke.tipCount(); }
  /** 落笔那一下建各种表（三角形公式、两张离屏图；每格的表是借来的现成的）花了多少毫秒（量）。 */
  buildMs = 0;
  /** 上一次「准备」各段（量；毫秒）：取新笔尖 + 算碰到哪些三角形 / 画薄层（含上传、拷定型层）/ 交给档口。fresh = 这一帧给的笔尖数。 */
  /** 上一帧（量）：新笔尖几颗、定型几颗、各段毫秒；cellsMs = 算这张脏格子位图（标格 + 出行段 + 报给内核）、runs = 行段数（= 实例数）、cells = 脏格盖住的像素（1-4d 第 6 条）。 */
  lastFrame = { fresh: 0, frozen: 0, tipsMs: 0, layerMs: 0, hostMs: 0, cellsMs: 0, runs: 0, cells: 0, boxCells: 0 };



  /** 这一帧的准备（画板登记处的 prepare 调；合成在它后面）。 */
  /** 建这一笔的表时出过错（已经取消、零痕迹）。 */
  private broken = false;
  private prepare(): void {
    if (!this.dirty || this.broken) return;
    this.dirty = false;
    if (this.finishing) this.drawn = 0;   // 抬笔：收笔渐细这时才知道总长，整笔重画一次（只这一次）
    const t0 = performance.now();
    const raw = this.stroke.tips(this.drawn), n = this.stroke.path()?.frozenCount ?? 0;
    const tips = raw.map((t) => ({ tip: { x: t.x, y: t.y, z: t.z, r: t.size / 2, alpha: t.alpha } as InkTip, reach: t.reach }));
    let frozenHere = 0;
    if (this.finishing) frozenHere = tips.length; else for (const t of raw) { if (t.seg + 1 < n) frozenHere++; else break; }
    if (!tips.length && !this.layer) return;
    if (!this.layer) {
      const t0 = performance.now();
      try { this.layer = new SpaceLayer(this.gpu, this.stroke.geos[0], 0, { hardness: this.o.brush.hardness, color: this.o.color, accum: this.o.accum, cells: this.cells, tables: this.tables }); }
      catch (err) { this.broken = true; this.cancel(); this.d.failed?.(err); return; }   // 建表出错：这一笔取消（零痕迹）、告诉宿主；不让它在每帧的「准备」里一直抛（1-7）
      this.buildMs = performance.now() - t0;
      this.session = this.board.openStroke();
      this.layerId = this.board.wp.layerTree!.view().activeId!;
      this.ext = this.board.wrapLayer({ ...this.d.external(this.layer.frame), w: this.layer.frame.w, h: this.layer.frame.h, prec: "u8" } as Parameters<PaintBoard["wrapLayer"]>[0]);
    }
    const t1 = performance.now();
    if (this.finishing) this.layer.resetFrozen();
    const tl = paintMeter.now();   // 每帧的读数：画薄层（CPU 这边交给显卡的时间；1-4d）
    try { this.layer.update(tips, frozenHere); this.peak = { ...this.layer.peak }; paintMeter.add("layer", tl); }
    catch (err) { this.broken = true; this.cancel(); this.d.failed?.(err); return; }   // 这一帧才知道的上限（一颗笔尖下同一块挂了八张以上的面、一帧的数据表放不下）：这一笔取消、说那句人话（1-7；数据表那条以后改成分批画）
    this.drawn += frozenHere;
    const t2 = performance.now();
    // 当帧那张真变过的格子（内核的脏格子位图，薄层直接标的）：报给内核（它只重合这些格）和画板的变化史（显示那一侧只拷这些格）。这一帧什么都没画 = null = 不重合成（1-4d 第 6 条）
    //   叫过 markChanged 之后，改了像素就必须报（没报 = 那块在显示上留着旧的，直到下一次整张；存盘不受影响）：当帧那张只在 update / resetFrozen 里改，两处都记进位图
    const tc = performance.now(), ch = this.layer.takeChanged();
    let runs = 0, cells = 0, bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    if (ch) for (const run of ch.runs()) {
      this.ext!.markChanged(run.x, run.y, run.w, run.h); runs++; cells += run.w * run.h;
      bx0 = Math.min(bx0, run.x); by0 = Math.min(by0, run.y); bx1 = Math.max(bx1, run.x + run.w); by1 = Math.max(by1, run.y + run.h);
    }
    const boxCells = runs ? (bx1 - bx0) * (by1 - by0) : 0;   // 量：要是并成一个方框会是多大（和单子并排报）
    const cellsMs = this.layer.lastMarkMs + (performance.now() - tc);   // 这一帧算这张图（标格 + 出行段 + 报）
    const r = this.layer.range();
    if (r) this.session!.setHostLayers([{ tex: this.ext!, bx: r.x, by: r.y, bw: r.w, bh: r.h, layerId: this.layerId, opacity: 1, erase: !!this.o.erase, blendMode: "source-over" }]);
    this.board.overlayChanged(ch);
    this.lastFrame = { fresh: tips.length, frozen: frozenHere, tipsMs: t1 - t0, layerMs: t2 - t1, hostMs: performance.now() - t2, cellsMs, runs, cells, boxCells };
  }
  private finish(): void {
    const landed = !!this.session;
    if (this.session) this.session.end();   // 内核落层、封一步（经 HostedSteps 交到画板登记处攒着）
    this.board.overlayChanged();
    this.close();
    if (landed) this.d.commitStep?.(!!this.o.erase);   // 攒着的那几步交给三维的撤销栈：一笔 = 一步（1-8a）
  }
  private close(): void { this.unhook(); this.untrack(); this.layer?.dispose(); this.layer = null; this.session = null; }
}
