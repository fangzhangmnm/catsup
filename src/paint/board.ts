// paint/board.ts —— 一块画板 = 一张贴图在内存里的画（贴图主线 1-3c，施工单 ai-docs/20261111-paint-workorders-10.md）。created 2026-11-11 by Claude Opus 5.5
// 画板 = 画画内核的一份作品（画布大小 = 那一套贴图坐标的宽高）+ 一个只合成、不上屏的入口（内核 0-5 的 GLBoard.composite）。不认识 three、不认识场景。
// 画布大小跟着那一套贴图坐标走（统筹 11-11 裁定，施工记录里有原文）：坐标加高了跟着加高；缩回去时要砍的行 / 列全空白才缩，
//   有内容就不缩、留着比坐标大、记一笔（不抛：宁可画板大一截，不丢像素）。显示时贴图坐标按画板**实际**的宽高除，所以大一截也显示得对。
// 「步的去处」是参数：这一张不给（内核的记录随手丢，改大小不留步）；1-8 时换成 HostedSteps（步交给三维的撤销栈）。
import { DirtyCells } from "./kernel/src/common/dirty-rects.ts";
import { PaintLockedError } from "./paint-limit.ts";
import { PaintingWorkpiece, type PaintingData } from "./kernel/src/backend/workpiece/painting-workpiece.ts";
import { isGroupNode, type TreeNode } from "./kernel/src/backend/workpiece/layer-tree.ts";
import { GLBoard } from "./kernel/src/shell/gl-board.ts";
import type { SharedTilePool } from "./kernel/src/backend/gl/shared-tile-pool.ts";
import { poolCapacityForBudget } from "./kernel/src/backend/gl/gl-room.ts";
import { diffBox } from "../minccino/contract/pixel-diff.ts";
import type { DocNode } from "./kernel/src/backend/gl/gl-doc-bridge.ts";
import type { ExternalImage, ExternalTexture, Gl2Port, PooledFBO } from "./kernel/src/common/gl2-port.ts";
import type { StepSink } from "./kernel/src/backend/workpiece/undo-stack.ts";
import { PaintingView } from "./kernel/src/backend/workpiece/painting-view.ts";
import { StrokeSession, type StrokeSessionDeps } from "./kernel/src/backend/stroke-session.ts";
import { BrushEngine } from "./kernel/src/backend/brush.ts";
import type { ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";
import type { HostOverlayInput } from "./kernel/src/backend/gl/gl-room.ts";
import type { LayerPixels } from "./kernel/src/backend/tiles/tile-layer.ts";

/** 扔画板时换进去的空根（1×1、一个空层）：现在的内容随旧根还池。 */
const BLANK_1x1: PaintingData = { width: 1, height: 1, nodes: [{ name: "Layer 1", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null }] };

/** 显存预算（和画画软件的后端同一个数）：图块池按需长，长到这个顶。施工单十九第 3 刀起是一份文件合用的那个池的顶（PaintBoards 建池时用；只有正在编辑的画板醒着占片）。 */
export const PAINT_GPU_BUDGET_BYTES = 256 * 1024 * 1024;
const BUDGET_BYTES = PAINT_GPU_BUDGET_BYTES;

export interface PaintBoardOpts {
  /** 内核的显卡接口（整个程序一个，建在渲染器的画面上）。 */
  readonly port: Gl2Port;
  readonly width: number;
  readonly height: number;
  /** 步的去处：不给 = 记录随手丢（1-3c）；1-8 给 HostedSteps。 */
  readonly undo?: StepSink;
  /** 有内容的行 / 列不砍时记一笔（调试日志）。 */
  readonly log?: (msg: string) => void;
  /** 文件锁着吗（锁着 = 交出给人看的那句理由，能改 = null）。开一笔、落层都问它（v0.19.48）。缺 = 当没锁（单测）；app 里由 PaintBoards 递进来，守卫 test/paint-pixel-writes.test.ts。画板不认识编辑器。 */
  readonly locked?: () => string | null;
  /** 几块画板合用的显卡图块池（施工单十九第 3 刀：一份文件一个，PaintBoards 建、换文件退租）。缺 = 自己开一个（单测）。 */
  readonly pool?: SharedTilePool;
  /**
   * 在每帧准备的合成之外动过显卡之后叫（借一下显卡、睡下）：渲染器和内核共用一个 GL 画面，内核动过 GL，渲染器记着的绑定就不对了，要作废一次
   * （render3.resetPaintState）。准备里的合成由登记处统一叫。缺 = 不叫（单测）。
   */
  readonly touched?: () => void;
}

/** 画布上一块（格子；[x, x + w) × [y, y + h)）。 */
export interface ChangedRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
/** 合成图上变了的那些格（内核的脏格子位图）；"all" = 说不清、按整张算。 */
export type Changed = DirtyCells | "all";
/** 变化史留几个版本（渲染器一般每帧都拷；隔得再久就按整张）。 */
const HISTORY = 32;
/** 合成时垫进去的一片（三维那一笔的薄层 / 二维笔的笔尖单子）：内核 composite 吃的那种。 */
type LiveOverlay = NonNullable<Parameters<GLBoard["composite"]>[3]>[number];
/** 一笔要的那一层（档口和落层用到的几个口）。 */
type StrokeLeaf = { id: number; pixels: LayerPixels; lockAlpha?: boolean; applyRegionDiff(x: number, y: number, w: number, h: number, px: Uint8ClampedArray): { tx: number; ty: number }[] };
/** 二维笔的一笔（PaintBoard.openBrushStroke 交出来的）：move = 一个点（画布像素、压感、一笔里的毫秒）；end = 抬笔落层（落了 = true；没碰到任何像素 = false、不封步）；cancel = 零痕迹。 */
export interface BoardStroke {
  readonly open: boolean;
  move(x: number, y: number, pressure: number, t: number | null): void;
  end(): boolean;
  cancel(): void;
}
/** 引擎交出来的笔尖单子 → 合成 / 落层吃的 overlay（照画画仓后端 _commitStamps；三维没有选区 = 不带蒙版）。 */
function stampOverlayOf(cs: Parameters<StrokeSessionDeps["commitStamps"]>[0]): Parameters<GLBoard["commitBrushStroke"]>[2] {
  return { stamps: cs.stamps, shape: cs.shape, bx: cs.bx, by: cs.by, bw: cs.bw, bh: cs.bh, layerId: cs.layer.id, opacity: cs.opacity, erase: cs.mode === "erase", blendMode: cs.blendMode, lockAlpha: !!(cs.layer as { lockAlpha?: boolean }).lockAlpha, selMask: null };
}
/** 两片薄层是不是同一片、叠法一样（不看方框）。 */
function sameOverlay(a: HostOverlayInput, b: HostOverlayInput): boolean {
  return a.tex === b.tex && a.layerId === b.layerId && a.opacity === b.opacity && !!a.erase === !!b.erase && a.blendMode === b.blendMode && !!a.lockAlpha === !!b.lockAlpha && a.selMask === b.selMask;
}

export class PaintBoard {
  readonly wp: PaintingWorkpiece;
  /** 内核的画板。**只经 gpu() 拿**（睡着就先叫醒；守卫 test/paint-board-sleep.test.ts 查这个文件里别处不碰它），睡 / 退租除外。 */
  private readonly gl: GLBoard;
  private readonly port: Gl2Port;
  private readonly log: (msg: string) => void;
  private readonly locked: () => string | null;
  private readonly touched: () => void;
  private bg: readonly [number, number, number, number] = [1, 1, 1, 1];
  /** 合成出来的那张图（内核的，下一次合成之前有效）+ 合成它时的内容键。 */
  private last: { fbo: PooledFBO; key: string } | null = null;
  /** 显示版本：每合成出一张新图加一（渲染器按它决定要不要重拷）。 */
  private shown = 0;
  /** 显卡画面恢复了几次（进内容键：恢复后旧图作废、要重合成）。 */
  private restores = 0;
  /** 这一笔交给显示那一侧的薄层（档口 setHostOverlays 给的；合成时垫在对应的层上）+ 它的版本（薄层内容每帧变 = 加一）。 */
  private hostOverlays: readonly HostOverlayInput[] = [];
  private overlayVer = 0;
  private disposed = false;
  /**
   * 合成图的变化史（1-4d 第 6 条：显示那一侧只拷变了的那一块）：每个版本比上一个版本变了哪一块（"all" = 说不清、按整张算），留最近 HISTORY 个。
   * 谁能说「只变了这一块」：只有薄层的内容（overlayChanged(块)，块由画薄层的那一边按它真画过的格子报）。别的一切——落定的内容变了（抬笔落层、撤销、装载、改大小、换底色、画面恢复）、
   * 薄层换了一片、内核的档口叫 invalidate、overlayChanged() 不带块——都按整张。薄层的方框只是长大（同一片、同样的叠法）不算变：方框外面那片从没写过、是透明的。
   */
  private history: { version: number; change: Changed | null }[] = [];   // null = 这一版一格都没变
  /** 上一次合成之后攒下的薄层变化（脏格子位图；null = 没报过；"all" = 按整张）。 */
  private pending: DirtyCells | null | "all" = null;
  /** 上一次合成时落定内容的键（变了 = 整张）。 */
  private lastCommitted: string | null = null;

  constructor(o: PaintBoardOpts) {
    this.locked = o.locked ?? ((): string | null => null);
    this.touched = o.touched ?? ((): void => {});
    if (!(o.width >= 1 && o.height >= 1)) throw new Error(`PaintBoard: bad size ${o.width}x${o.height}`);
    this.wp = new PaintingWorkpiece({ tree: { width: o.width, height: o.height }, ...(o.undo ? { undo: o.undo } : {}) });
    this.gl = new GLBoard(o.port, poolCapacityForBudget(BUDGET_BYTES), o.pool ? { pool: o.pool } : undefined);
    this.port = o.port;
    this.log = o.log ?? (() => {});
    this.unInvalidated = o.port.onInvalidated(() => { this.last = null; this.restores++; });   // 画面丢了又恢复：内核从内存里的图块重建（GLBoard 自己管），这边只作废缓存、让渲染器重拷
  }
  /** 摘掉挂在 Port 上的那个回调（退租时摘；内核 v0.14.85 起 onInvalidated 返回它——不摘 = Port 一直拉着这块画板，换文件换多了放不掉）。 */
  private unInvalidated: (() => void) | null;

  get width(): number { return this.tree().width; }
  get height(): number { return this.tree().height; }
  /** 内容键：作品的提交版本（画、撤销、改大小都算）+ 大小 + 底色 + 恢复次数。变了 = 下一次合成出新图。 */
  private key(): string { return `${this.committedKey()}|${this.overlayVer}`; }
  /** 落定了的内容的键（不含一笔正在画的薄层）：画布小窗（施工单十六）看它变没变 —— 一笔当中不变，抬笔 / 撤销 / 装载才变，所以小窗只在抬笔之后读回一次。 */
  committedKey(): string { return `${this.wp.commitVersion}|${this.width}x${this.height}|${this.bg.join(",")}|${this.restores}`; }
  /** 有几层（图层，不算组）。 */
  layerCount(): number { let n = 0; const walk = (ns: readonly TreeNode[]): void => { for (const x of ns) { if (isGroupNode(x)) walk(x.children); else n++; } }; walk(this.tree().nodes); return n; }
  /** 三维画好的薄层包成内核的纹理对象（外面的图进内核的唯一一道门，画画仓 v0.14.75）：真显卡 = { gl: WebGLTexture }，软件版 = { pixels }。 */
  wrapLayer(src: ExternalImage): ExternalTexture { return this.port.wrapExternal(src); }
  /**
   * 薄层的内容变了（三维每帧重画了尾巴）：下一次合成要重来。cells = 只在这些格里变了（脏格子位图，画布格子）；不给 = 不知道哪里变了（按整张）；null = 什么都没变（不重合成）。
   */
  overlayChanged(cells?: DirtyCells | null): void {
    if (cells === null) return;
    this.overlayVer++;
    if (cells === undefined || this.pending === "all" || cells.w !== this.width || cells.h !== this.height) { this.pending = "all"; return; }
    if (cells.empty) return;
    const p: DirtyCells = this.pending ?? new DirtyCells(this.width, this.height);
    this.pending = p;
    for (const r of cells.runs()) p.mark(r.x, r.y, r.w, r.h);
  }
  /**
   * 从版本 since 到现在的合成图变了哪一块（画布格子；没变 = w = 0）。中间有「说不清」的、或者 since 太老不在变化史里了 = "all"。
   * 显示那一侧（渲染器的显示图）按它只拷这一块；存盘用的合成图从不用它（composeBytes 永远整张重合）。
   */
  changedSince(since: number): Changed {
    const out = new DirtyCells(this.width, this.height);
    if (since === this.shown) return out;
    if (since > this.shown || since < 0) return "all";
    let seen = 0;
    for (const h of this.history) {
      if (h.version <= since) continue;
      seen++;
      if (h.change === "all") return "all";
      if (h.change) for (const r of h.change.runs()) out.mark(r.x, r.y, r.w, r.h);
    }
    if (seen !== this.shown - since) return "all";   // 中间有的版本已经不在变化史里了
    return out;
  }

  /**
   * 一笔的档口（内核 0-5 的 host 方式；一次手势 = 一个令牌 = 一步）：宿主每帧 setHostLayers 交薄层（真显卡 / 软件版各自经 wrapExternal 包进来的那张），
   * 抬笔 = 内核把它落进图层（commitBrushStroke = bakeStamps 写回链），取消 = 零痕迹。layerId 不给 = 当前层。
   */
  openStroke(layerId?: number): StrokeSession {
    { const why = this.locked(); if (why) throw new PaintLockedError("PaintBoard.openStroke: the document is locked", why); }   // 第三层：开一笔（所有笔都过这里，v0.19.48）
    if (this.live2d) throw new Error("PaintBoard.openStroke: a 2D stroke is open on this board — end or cancel it first");
    const leaf = this.leafOf(layerId, "openStroke");
    const deps = this.sessionDeps(leaf, () => false);
    const engine = { extendStroke() {}, endStroke() { return null; }, cancelStroke() {}, flushDirty() { return null; } };
    return new StrokeSession(deps, engine, [leaf as never], { historyType: "stroke", finalize: true }, "host");
  }

  /**
   * 二维笔（施工单二十一第 1 刀）：内核自己的二维笔（BrushEngine，overlay 方式 = 画画软件里普通笔那条路），画在这块画板的画布上（坐标 = 画布像素，t = 一笔里的毫秒）。
   * 和 openStroke 同一个令牌、同一个步的去处：一次手势 = 一个令牌 = 一步（封好的步交给 HostedSteps，宿主抬笔后照旧 takePending → 编辑器撤销里的一步）。
   * 画着的时候：这一笔的笔尖单子（collectStamps）当 overlay 垫进合成（compose / verifyFull；存盘的 composeBytes 不带 = 一笔当中存的是落定那一版）。
   * 抬笔：笔尖单子经 gpu() 落层（GLBoard.commitBrushStroke = bakeStamps 写回链，照画画仓后端 _commitStamps；三维没有选区 = 不带蒙版）。
   * 锁问两次：开一笔（这里）、落层（commitStamps）；落层时锁上了 = 抛 → 档口取消令牌、整笔回滚、零痕迹。同一块画板同一时间只有一笔（三维那一笔开着也不行）。
   */
  openBrushStroke(brush: ResolvedBrush, at: { readonly x: number; readonly y: number; readonly pressure: number; readonly t: number | null }, o: { readonly erase?: boolean; readonly smooth?: { tau?: number; deadzone?: number; tailBow?: number }; readonly layerId?: number } = {}): BoardStroke {
    { const why = this.locked(); if (why) throw new PaintLockedError("PaintBoard.openBrushStroke: the document is locked", why); }   // 第三层：开一笔（二维笔也过这一问）
    if (this.live2d || this.hostOverlays.length) throw new Error("PaintBoard.openBrushStroke: a stroke is already open on this board — end or cancel it first");
    const leaf = this.leafOf(o.layerId, "openBrushStroke");
    const deps = this.sessionDeps(leaf, (cs) => {
      { const why = this.locked(); if (why) throw new PaintLockedError("PaintBoard: the document was locked before the stroke landed", why); }   // 第四层：落层
      const ok = this.gpu().commitBrushStroke(cs.layer.id, leaf.pixels, stampOverlayOf(cs), this.width, this.height, (px, x, y, w, h) => leaf.applyRegionDiff(x, y, w, h, px));
      if (!ok) throw new Error("PaintBoard: the 2D stroke did not land (GPU commit returned false)");   // 没落成 = 响亮（档口取消令牌、整笔回滚），不让这一笔悄悄没了（同三维那一笔的 HOST_COMMIT_FAILED）
      return ok;
    });
    const engine = new BrushEngine();
    const session = new StrokeSession(deps, engine, [leaf as never], { historyType: "stroke", finalize: true }, "overlay");   // 构造 = 开令牌（锁 / 单令牌墙在这里抛）
    const live = { session };
    this.live2d = live;
    try { engine.beginStroke(session.targets[0], brush, at.x, at.y, at.pressure, o.erase ? "erase" : "brush", o.smooth ?? {}, at.t); }
    catch (err) { this.live2d = null; session.cancel(); throw err; }
    this.stampsMoved(session);
    const done = (): void => { if (this.live2d === live) this.live2d = null; this.overlayVer++; this.pending = "all"; };
    const isOpen = (): boolean => this.live2d === live;
    return {
      get open() { return isOpen(); },
      move: (x, y, pressure, t) => { if (this.live2d !== live) throw new Error("BoardStroke.move: this stroke is closed"); session.extend(x, y, pressure, t); this.stampsMoved(session); },
      end: () => {
        if (this.live2d !== live) return false;
        const v0 = this.wp.commitVersion;
        try { session.end(); } finally { done(); }   // 落层中途抛（锁上了 / 显卡出错）：档口已取消令牌、已写的回滚 = 整笔没落；收干净再抛给宿主
        return this.wp.commitVersion !== v0;
      },
      cancel: () => { if (this.live2d !== live) return; try { session.cancel(); } finally { done(); } },
    };
  }
  /** 二维笔动了：引擎有新的笔尖 = 显示那一侧这一版按整张（内核那边笔尖单子本来就整张重合；只重做改到的那一块是第 2 刀要核的）。 */
  private stampsMoved(session: StrokeSession): void { if (session.flushDirty()) { this.overlayVer++; this.pending = "all"; } }
  /** 开着的二维笔（同一时间最多一笔）。 */
  private live2d: { readonly session: StrokeSession } | null = null;
  /** 合成时垫进去的东西：三维那一笔的薄层 + 二维笔这一笔的笔尖单子。 */
  private liveOverlays(): readonly LiveOverlay[] {
    const cs = this.live2d?.session.collectStamps();
    return cs && cs.stamps.length ? [...this.hostOverlays, stampOverlayOf(cs)] : this.hostOverlays;
  }
  /** 这一层（不给 = 当前层）：一笔要的那几个口。 */
  private leafOf(layerId: number | undefined, who: string): StrokeLeaf {
    const view = new PaintingView(this.wp), id = layerId ?? view.activeId;
    const leaf = view.layers.find((l) => !("children" in l) && l.id === id) as unknown as StrokeLeaf | undefined;
    if (!leaf) throw new Error(`PaintBoard.${who}: no leaf layer ${id}`);
    return leaf;
  }
  /** 档口要的口（三维那一笔和二维笔共用；只有落笔尖单子那一个口不同）。 */
  private sessionDeps(leaf: StrokeLeaf, commitStamps: StrokeSessionDeps["commitStamps"]): StrokeSessionDeps {
    return {
      begin: (label) => this.wp.begin(label),
      tokenChanged: (lid) => this.wp.layerTiles.tokenChanged(lid),
      tokenBeforeImage: (lid) => this.wp.layerTiles.tokenBeforeImage(lid),
      getSelection: () => null,
      commitStamps,
      invalidate: () => { this.overlayVer++; this.pending = "all"; },
      setShadows: () => {},
      openRegion: () => { throw new Error("PaintBoard: no region strokes on a 3D board"); },
      setRegions: () => {},
      commitRegion: () => false,
      setHostOverlays: (list) => {
        const prev = this.hostOverlays;
        if (prev.length === list.length && prev.every((p, i) => sameOverlay(p, list[i]) && p.bx === list[i].bx && p.by === list[i].by && p.bw === list[i].bw && p.bh === list[i].bh)) return;   // 一样 = 不算变
        const grownOnly = prev.length === list.length && prev.every((p, i) => sameOverlay(p, list[i]) && list[i].bx <= p.bx && list[i].by <= p.by && list[i].bx + list[i].bw >= p.bx + p.bw && list[i].by + list[i].bh >= p.by + p.bh);
        this.hostOverlays = list.slice(); this.overlayVer++;
        if (!grownOnly) this.pending = "all";   // 换了一片 / 叠法变了 / 方框缩了 = 整张；只是方框长大 = 不算变（外面那片是透明的）
      },
      commitHost: (ov) => {
        { const why = this.locked(); if (why) throw new PaintLockedError("PaintBoard: the document was locked before the stroke landed", why); }   // 第四层：落层（一笔开着时锁上了 = 抛 → 档口取消令牌、整笔回滚、零痕迹；v0.19.48）
        const ok = this.gpu().commitBrushStroke(ov.layerId, leaf.pixels, ov, this.width, this.height, (px, x, y, w, h) => leaf.applyRegionDiff(x, y, w, h, px));
        const lb = this.gl.lastBake;   // 1-4d 第 8 条：三维报的格漏了 = 三维这边标格的毛病（内核照旧读了整个方框，画没少）
        if (lb?.path === "box-unreported") this.log(`paint board: stroke cells under-reported — ${lb.strayCells} changed cell(s) outside the reported ${lb.cells}; kernel read the whole box instead`);
        return ok;
      },
    };
  }

  /** 合成时垫在最底下的不透明底色（材质自己的底色，sRGB 0..1）：交出来的图不透明。 */
  setBackground(rgb: readonly number[]): void {
    const c: [number, number, number, number] = [rgb[0] ?? 1, rgb[1] ?? 1, rgb[2] ?? 1, 1];
    if (c.every((x, i) => x === this.bg[i])) return;
    this.bg = c;
  }

  /** 灌一份内容（调试钩子用；以后读文件）。整份换：内核把栈清了（这一张本来没有栈）。 */
  load(data: PaintingData): void {
    if (data.width !== this.width || data.height !== this.height) throw new Error(`PaintBoard.load: size ${data.width}x${data.height} ≠ board ${this.width}x${this.height}`);
    this.wp.load(data);
  }

  /**
   * 跟着那一套贴图坐标的画布大小（裁定 ③）：要的比现在大 = 跟着长；要的比现在小 = 要砍的那几行 / 列全空白才砍，不然留着（记一笔）。
   * 返回改完的实际大小；kept = 有内容、没砍到要的大小。
   */
  follow(w: number, h: number): { width: number; height: number; kept: boolean } {
    const cw = this.width, ch = this.height;
    let nw = w, nh = h, kept = false;
    if (w < cw || h < ch) {
      const b = this.contentBounds();
      if (b && w < cw && b.x + b.w > w) { nw = cw; kept = true; }
      if (b && h < ch && b.y + b.h > h) { nh = ch; kept = true; }
      if (kept) this.log(`paint board: kept ${cw}x${ch} (layout wants ${w}x${h}; content reaches ${b!.x + b!.w}x${b!.y + b!.h})`);
    }
    nw = Math.max(nw, 1); nh = Math.max(nh, 1);
    if (nw !== cw || nh !== ch) this.resize(nw, nh);
    return { width: this.width, height: this.height, kept };
  }

  /**
   * 合成（只合成、不上屏）：内容和底色没变 = 交上一次那张。返回的图归内核：下一次合成之前有效，不许归还、不许改采样设置。
   * 显卡画面丢了 = null。
   */
  compose(): { fbo: PooledFBO; version: number } | null {
    if (this.disposed) return null;
    const key = this.key();
    if (this.last && this.last.key === key) return { fbo: this.last.fbo, version: this.shown };
    // 落定的内容变了（抬笔落层、撤销、装载、改大小、换底色、画面恢复）= 告诉内核整张作废；只是薄层变了 = 不作废，薄层自己 markChanged 报了哪些格，内核只重合那些（内核 v0.14.79）
    const committed = this.committedKey();
    const gl = this.gpu();
    if (committed !== this.lastCommitted) gl.markContentDirty();
    const fbo = this.composite(gl, this.liveOverlays());
    if (!fbo) { this.last = null; this.lastCommitted = null; return null; }
    this.last = { fbo, key }; this.shownKey = key;
    const change: Changed | null = committed !== this.lastCommitted || this.pending === "all" ? "all" : this.pending;
    this.lastCommitted = committed; this.pending = null;
    this.history.push({ version: ++this.shown, change });
    if (this.history.length > HISTORY) this.history.shift();
    return { fbo, version: this.shown };
  }

  /**
   * 扔掉这块画板：图块全部还给内核的图块池（1-8a 统筹审查：以前只记个「扔了」，图块一直占着）。
   * 和画画仓 WeebPaintBackend.dispose 同一手：换 1×1 空根 = 现在的内容还池；装载顺手清栈 = 步里攒着的旧图块也还池（交给三维的栈的步也在内：HostedSteps.clear 逐步释放、发 onReset）；
   * 图块账退租；显卡上那份退租（内核 v0.14.77 的 GLBoard.dispose：建的纹理全删、借的离屏图全还，0-3a）。开着的一笔要宿主先取消（登记处 disposeAll 先 cancelOpen；令牌开着时装载会抛）。只做一次。
   */
  /**
   * 合成图读回来（存盘的钉点用，1-8b）：**只合已落层的内容**、垫着现在的底色、不透明；只读前 rows 行（裁高用，缺省整张）。
   * 不带正在画的那一笔（统筹 11-11 审查：自动保存会撞上画到一半；合成图必须和分层字节是同一个内容，不然冷的画上会多出一笔没落下、甚至后来被取消的笔迹）——
   * 所以这里不用显示那张（compose 会垫上这一笔的薄层），单独合一次不带薄层的；合完作废显示的缓存，下一帧照常带着薄层重合。
   * 同步：真显卡上是一次读回（会等显卡做完）。显卡画面丢了 / 扔过 = null。
   */
  composeBytes(rows = this.height): Uint8ClampedArray | null {
    if (this.disposed) return null;
    return this.borrowGpu((gl) => {   // 睡着的（施工单十九第 3 刀）：同步叫醒、合、读回、再睡回去
      gl.markContentDirty();
      const fbo = this.composite(gl, []);
      this.last = null; this.lastCommitted = null;   // 显示用的那张被这一次占过：下一帧重合（带薄层，整张：内核那张已经是不带薄层的了）
      if (!fbo) return null;
      const px = this.port.readPixels(fbo, 0, 0, this.width, Math.min(rows, this.height));
      return new Uint8ClampedArray(px.buffer, px.byteOffset, px.byteLength);
    });
  }
  /**
   * 核对（读数角标「核对」开着时；统筹 11-11）：现在显示的那张合成图（可能是只合了脏格的）读回 → 强制整张重合（同样的内容、同样垫着薄层）→ 再读回，逐字节比。
   * 整张那张留下来当现在的图；对不上 = 变化史记一版「整张」（显示那一侧下一帧整张重拷，不留着错的）。没合成过 / 画面丢了 = null。读回会等显卡做完：只在核对那一帧做。
   */
  verifyFull(): { diff: number; box: readonly [number, number, number, number] | null } | null {
    const r = this.compose();
    if (!r) return null;
    const a = this.port.readPixels(r.fbo, 0, 0, this.width, this.height);
    const gl = this.gpu();
    gl.markContentDirty();
    const fbo = this.composite(gl, this.liveOverlays());
    if (!fbo) { this.last = null; this.lastCommitted = null; return null; }
    this.last = { fbo, key: this.key() }; this.shownKey = this.last.key;
    const d = diffBox(this.port.readPixels(fbo, 0, 0, this.width, this.height), a, this.width);
    if (d.diff) { this.history.push({ version: ++this.shown, change: "all" }); if (this.history.length > HISTORY) this.history.shift(); }
    return d;
  }
  /** 显示的那张合成图上一格的颜色（RGBA 字节，垫着底色、不透明；吸管用，1-7）。出界 / 显卡画面丢了 = null。 */
  pixelAt(x: number, y: number): Uint8Array | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return this.borrowGpu(() => { const r = this.compose(); return r ? this.port.readPixels(r.fbo, Math.floor(x), Math.floor(y), 1, 1) : null; });   // 睡着的：借一下、用完睡回去
  }
  /** 最近一次落层怎么读回的（内核 GLBoard.lastBake：box / cells / box-unreported、读了几次、多少字节；探针 / 测试看）。 */
  get lastBake(): GLBoard["lastBake"] { return this.gl.lastBake; }
  /** 现在的底色（sRGB 0..1，三个数）。 */
  get background(): readonly [number, number, number] { return [this.bg[0], this.bg[1], this.bg[2]]; }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.last = null; this.hostOverlays = [];
    this.unInvalidated?.(); this.unInvalidated = null;
    this.wp.load(BLANK_1x1);
    this.wp.layerTiles.dispose();
    this.gl.dispose();
  }

  // ---------------------------------------------------------------- 睡和醒（施工单十九第 3 刀）
  // 睡 = 内核把显卡那一半还回去（合用池里的片让出来、索引小图删、合成目标还池），内存那一半（图块、图层树、撤销的步）不碰。
  // 醒没有单独的口：要用显卡的口（合成 / 落层 / 存盘读回 / 核对 / 吸色）都经 gpu()，睡着就先叫醒——谁调都一样，不靠调的人记得。
  // 什么时候睡由登记处定（PaintBoards.prepare 的末尾：不在编辑的、没开着一笔的、显示的那版渲染器已经拷过的）；「借一下」的口（存盘读回、吸色）用完自己睡回去。

  /** 显卡那一半睡着吗。 */
  get asleep(): boolean { return this.gl.asleep; }
  /** 一笔正开着（三维那一笔的薄层还垫着，或者二维笔开着）：不许睡。 */
  get strokeOpen(): boolean { return this.hostOverlays.length > 0 || this.live2d !== null; }
  /** 显示的那一版过期了（内容 / 底色 / 薄层在上一次交出去之后变过）：要合成一次才对。睡着的画板靠它决定要不要醒来合一次（撤销、跟大小、装载都只动内存）。 */
  get displayStale(): boolean { return this.key() !== this.shownKey; }
  /** 叫醒了几次（量；探针看来回切物件时醒睡的次数）。 */
  wakes = 0;
  /** 睡。一笔开着 = 抛（宿主先收笔 / 取消）。睡两次没事。 */
  sleep(): void {
    if (this.disposed || this.gl.asleep) return;
    if (this.strokeOpen) throw new Error("PaintBoard.sleep: a stroke is open (host overlays are set or a 2D stroke is open) — finish or cancel it first");
    // 内核那边还垫着上一次合成时交的薄层（一笔收了以后还没再合成过，比如歇着的画板）：先合一张不带薄层的，内核才肯睡（它那边「有薄层 = 一笔开着」）
    if (this.glHasOverlay) this.composite(this.gl, []);
    this.last = null; this.lastCommitted = null;   // 合成目标随睡还池：醒来第一次合成整张（变化史记「整张」，渲染器整张重拷）
    this.gl.sleep();
    this.touched();   // 内核删了索引小图、还了帧缓冲：渲染器记着的绑定作废
  }
  /** 要用显卡：睡着就先叫醒。 */
  private gpu(): GLBoard {
    if (this.gl.asleep) { this.gl.wake(); this.wakes++; }
    return this.gl;
  }
  /** 借一下显卡（存盘读回、吸色）：原来睡着的，用完睡回去（一笔开着时不会是睡着的）。 */
  private borrowGpu<T>(f: (gl: GLBoard) => T): T {
    const was = this.gl.asleep;
    try { return f(this.gpu()); } finally { if (was && !this.disposed) this.sleep(); this.touched(); }   // 在准备之外动了显卡：渲染器记着的绑定作废（以前醒着的画板读回之后下一帧会重合、顺手作废了；睡着的不重合，必须在这里叫）
  }
  /** 合成一次（三个口共用）；记下这一次给内核的薄层有没有（睡之前要清）。 */
  private composite(gl: GLBoard, overlays: readonly LiveOverlay[]): PooledFBO | null {
    this.glHasOverlay = overlays.length > 0;
    return gl.composite({ layers: this.docNodes(), width: this.width, height: this.height }, this.bg, [], overlays);
  }
  private glHasOverlay = false;
  /** 最近一次交给显示那一侧的那一版的内容键（compose / verifyFull 交出时记；存盘读回不算：它不换显示的那一版）。 */
  private shownKey: string | null = null;

  // ---------------------------------------------------------------- 内部

  private tree(): { width: number; height: number; nodes: readonly TreeNode[] } {
    const t = this.wp.layerTree;
    if (!t) throw new Error("PaintBoard: workpiece has no layer tree");
    return t.view();
  }

  /** 所有图层内容的并（紧的）：null = 全空。 */
  /** 所有图层有内容的范围合在一起（全空 = null）；存盘裁高用（1-8b）。 */
  contentBounds(): { x: number; y: number; w: number; h: number } | null {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const walk = (ns: readonly TreeNode[]): void => {
      for (const n of ns) {
        if (isGroupNode(n)) { walk(n.children); continue; }
        const b = this.wp.layerTiles.contentBounds(n.id, true);
        if (!b) continue;
        x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
      }
    };
    walk(this.tree().nodes);
    return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /** 改画布大小：和画画软件的裁剪同一批动词（每层换一份新尺寸的像素 + 树上的宽高），一个令牌。左上角不动，多出来的是空白。 */
  private resize(w: number, h: number): void {
    const t = this.wp.layerTree!;
    const token = this.wp.begin("resize to layout");
    try {
      this.wp.layerTiles.resizeAllLeaves((_id, lp) => lp.cropped(0, 0, w, h));
      if (w !== this.width) t.setTreeProp("width", w);
      if (h !== this.height) t.setTreeProp("height", h);
    } catch (e) { token.cancel(); throw e; }
    token.commit();
  }

  /** 作品的树 → 合成器吃的那棵（每叶带它现在的像素）。 */
  private docNodes(): DocNode[] {
    const conv = (ns: readonly TreeNode[]): DocNode[] => ns.map((n): DocNode => {
      if (isGroupNode(n)) return { isGroup: true, id: n.id, opacity: n.opacity, mode: n.mode, clippingMask: n.clippingMask, visible: n.visible, children: conv(n.children) };
      const px = this.wp.layerTiles.tilesetPixels(n.pixelsRef);
      if (!px) throw new Error(`PaintBoard: leaf ${n.id} has no pixels`);
      return { isGroup: false, id: n.id, opacity: n.opacity, mode: n.mode, clippingMask: n.clippingMask, visible: n.visible, pixels: px };
    });
    return conv(this.tree().nodes);
  }
}
