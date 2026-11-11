// paint/board.ts —— 一块画板 = 一张贴图在内存里的画（贴图主线 1-3c，施工单 ai-docs/20261111-paint-workorders-10.md）。created 2026-11-11 by Claude Opus 5.5
// 画板 = 画画内核的一份作品（画布大小 = 那一套贴图坐标的宽高）+ 一个只合成、不上屏的入口（内核 0-5 的 GLBoard.composite）。不认识 three、不认识场景。
// 画布大小跟着那一套贴图坐标走（统筹 11-11 裁定，施工记录里有原文）：坐标加高了跟着加高；缩回去时要砍的行 / 列全空白才缩，
//   有内容就不缩、留着比坐标大、记一笔（不抛：宁可画板大一截，不丢像素）。显示时贴图坐标按画板**实际**的宽高除，所以大一截也显示得对。
// 「步的去处」是参数：这一张不给（内核的记录随手丢，改大小不留步）；1-8 时换成 HostedSteps（步交给三维的撤销栈）。
import { PaintingWorkpiece, type PaintingData } from "./kernel/src/backend/workpiece/painting-workpiece.ts";
import { isGroupNode, type TreeNode } from "./kernel/src/backend/workpiece/layer-tree.ts";
import { GLBoard } from "./kernel/src/shell/gl-board.ts";
import { poolCapacityForBudget } from "./kernel/src/backend/gl/gl-room.ts";
import type { DocNode } from "./kernel/src/backend/gl/gl-doc-bridge.ts";
import type { ExternalImage, ExternalTexture, Gl2Port, PooledFBO } from "./kernel/src/common/gl2-port.ts";
import type { StepSink } from "./kernel/src/backend/workpiece/undo-stack.ts";
import { PaintingView } from "./kernel/src/backend/workpiece/painting-view.ts";
import { StrokeSession, type StrokeSessionDeps } from "./kernel/src/backend/stroke-session.ts";
import type { HostOverlayInput } from "./kernel/src/backend/gl/gl-room.ts";
import type { LayerPixels } from "./kernel/src/backend/tiles/tile-layer.ts";

/** 扔画板时换进去的空根（1×1、一个空层）：现在的内容随旧根还池。 */
const BLANK_1x1: PaintingData = { width: 1, height: 1, nodes: [{ name: "Layer 1", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null }] };

/** 显存预算（和画画软件的后端同一个数）：图块池按需长，长到这个顶。 */
const BUDGET_BYTES = 256 * 1024 * 1024;

export interface PaintBoardOpts {
  /** 内核的显卡接口（整个程序一个，建在渲染器的画面上）。 */
  readonly port: Gl2Port;
  readonly width: number;
  readonly height: number;
  /** 步的去处：不给 = 记录随手丢（1-3c）；1-8 给 HostedSteps。 */
  readonly undo?: StepSink;
  /** 有内容的行 / 列不砍时记一笔（调试日志）。 */
  readonly log?: (msg: string) => void;
}

export class PaintBoard {
  readonly wp: PaintingWorkpiece;
  private readonly gl: GLBoard;
  private readonly port: Gl2Port;
  private readonly log: (msg: string) => void;
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

  constructor(o: PaintBoardOpts) {
    if (!(o.width >= 1 && o.height >= 1)) throw new Error(`PaintBoard: bad size ${o.width}x${o.height}`);
    this.wp = new PaintingWorkpiece({ tree: { width: o.width, height: o.height }, ...(o.undo ? { undo: o.undo } : {}) });
    this.gl = new GLBoard(o.port, poolCapacityForBudget(BUDGET_BYTES));
    this.port = o.port;
    this.log = o.log ?? (() => {});
    o.port.onInvalidated(() => { this.last = null; this.restores++; });   // 画面丢了又恢复：内核从内存里的图块重建（GLBoard 自己管），这边只作废缓存、让渲染器重拷
  }

  get width(): number { return this.tree().width; }
  get height(): number { return this.tree().height; }
  /** 内容键：作品的提交版本（画、撤销、改大小都算）+ 大小 + 底色 + 恢复次数。变了 = 下一次合成出新图。 */
  private key(): string { return `${this.wp.commitVersion}|${this.width}x${this.height}|${this.bg.join(",")}|${this.restores}|${this.overlayVer}`; }
  /** 三维画好的薄层包成内核的纹理对象（外面的图进内核的唯一一道门，画画仓 v0.14.75）：真显卡 = { gl: WebGLTexture }，软件版 = { pixels }。 */
  wrapLayer(src: ExternalImage): ExternalTexture { return this.port.wrapExternal(src); }
  /** 薄层的内容变了（三维每帧重画了尾巴）：下一次合成要重来。 */
  overlayChanged(): void { this.overlayVer++; }

  /**
   * 一笔的档口（内核 0-5 的 host 方式；一次手势 = 一个令牌 = 一步）：宿主每帧 setHostLayers 交薄层（真显卡 / 软件版各自经 wrapExternal 包进来的那张），
   * 抬笔 = 内核把它落进图层（commitBrushStroke = bakeStamps 写回链），取消 = 零痕迹。layerId 不给 = 当前层。
   */
  openStroke(layerId?: number): StrokeSession {
    const view = new PaintingView(this.wp), id = layerId ?? view.activeId;
    const leaf = view.layers.find((l) => !("children" in l) && l.id === id) as unknown as { id: number; pixels: LayerPixels; applyRegionDiff(x: number, y: number, w: number, h: number, px: Uint8ClampedArray): { tx: number; ty: number }[] } | undefined;
    if (!leaf) throw new Error(`PaintBoard.openStroke: no leaf layer ${id}`);
    const deps: StrokeSessionDeps = {
      begin: (label) => this.wp.begin(label),
      tokenChanged: (lid) => this.wp.layerTiles.tokenChanged(lid),
      tokenBeforeImage: (lid) => this.wp.layerTiles.tokenBeforeImage(lid),
      getSelection: () => null,
      commitStamps: () => false,
      invalidate: () => { this.overlayVer++; },
      setShadows: () => {},
      openRegion: () => { throw new Error("PaintBoard: no region strokes on a 3D board"); },
      setRegions: () => {},
      commitRegion: () => false,
      setHostOverlays: (list) => { this.hostOverlays = list.slice(); this.overlayVer++; },
      commitHost: (ov) => this.gl.commitBrushStroke(ov.layerId, leaf.pixels, ov, this.width, this.height, (px, x, y, w, h) => leaf.applyRegionDiff(x, y, w, h, px)),
    };
    const engine = { extendStroke() {}, endStroke() { return null; }, cancelStroke() {}, flushDirty() { return null; } };
    return new StrokeSession(deps, engine, [leaf as never], { historyType: "stroke", finalize: true }, "host");
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
    this.gl.markContentDirty();
    const fbo = this.gl.composite({ layers: this.docNodes(), width: this.width, height: this.height }, this.bg, [], this.hostOverlays);
    if (!fbo) { this.last = null; return null; }
    this.last = { fbo, key };
    return { fbo, version: ++this.shown };
  }

  /**
   * 扔掉这块画板：图块全部还给内核的图块池（1-8a 统筹审查：以前只记个「扔了」，图块一直占着）。
   * 和画画仓 WeebPaintBackend.dispose 同一手：换 1×1 空根 = 现在的内容还池；装载顺手清栈 = 步里攒着的旧图块也还池（交给三维的栈的步也在内：HostedSteps.clear 逐步释放、发 onReset）；
   * 图块账退租；显卡上那份退租（内核 v0.14.77 的 GLBoard.dispose：建的纹理全删、借的离屏图全还，0-3a）。开着的一笔要宿主先取消（登记处 disposeAll 先 cancelOpen；令牌开着时装载会抛）。只做一次。
   */
  /**
   * 合成图读回来（存盘的钉点用，1-8b）：和显示用的是同一张（compose），垫着现在的底色、不透明；只读前 rows 行（裁高用，缺省整张）。
   * 同步：真显卡上是一次读回（会等显卡做完）。显卡画面丢了 / 扔过 = null。
   */
  composeBytes(rows = this.height): Uint8ClampedArray | null {
    const r = this.compose();
    if (!r) return null;
    const px = this.port.readPixels(r.fbo, 0, 0, this.width, Math.min(rows, this.height));
    return new Uint8ClampedArray(px.buffer, px.byteOffset, px.byteLength);
  }
  /** 现在的底色（sRGB 0..1，三个数）。 */
  get background(): readonly [number, number, number] { return [this.bg[0], this.bg[1], this.bg[2]]; }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.last = null; this.hostOverlays = [];
    this.wp.load(BLANK_1x1);
    this.wp.layerTiles.dispose();
    this.gl.dispose();
  }

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
