// paint/boards.ts —— 画板登记处：一张贴图一块画板，按贴图的 GUID 登记（贴图主线 1-3c，施工单 ai-docs/20261111-paint-workorders-10.md）。created 2026-11-11 by Claude Opus 5.5
// 编辑器那边经 stream-provider.ts 的 PaintImages 看它（sync / board / sig）；不认识 three、不认识编辑器。
// · 画板不在创建贴图时建：没有画板的画 = 还没画过 = 照材质的底色显示。这一张里只有调试钩子建（ensure）；以后落第一笔（1-4b）、读文件（1-8）时建。
// · 每帧开画之前的「准备」（prepare；编辑器在渲染之前明着调一次，1-4b 统筹 B）：换了文件（epoch 变了）= 全部销毁；画没了（贴图删了 / 材质不指它了）= 那块销毁；
//   其余跟着那一套坐标改大小（裁定在 board.ts 头）、垫材质的底色；跑这一帧登记的准备活（这一笔的薄层）；该合成的合成。活的图的 current() 只读准备好的结果。
// · 整个程序只有一个内核的显卡接口：第一次要用时建在渲染器的画面上（BrowserGl2Port.fromContext），以后所有画板共用。
import { BrowserGl2Port } from "./kernel/src/shell/browser-gl2-port.ts";
import type { Gl2Port, PooledFBO } from "./kernel/src/common/gl2-port.ts";
import type { LiveImage } from "../minccino/contract/stream.ts";
import { PaintBoard } from "./board.ts";
import { UndoStack } from "./kernel/src/backend/workpiece/undo-stack.ts";
import { paintPlaceOf } from "../scene/paint.ts";
import type { Scene } from "../scene/scene.ts";
import type { Guid } from "../format/guid.ts";

export interface PaintBoardsOpts {
  /** 内核的显卡接口（第一次建画板时才要）。 */
  readonly port: () => Gl2Port;
  /** 第几个文件（换文件 = 变；editor.docEpoch）。 */
  readonly epoch: () => number;
  /** 调试日志（有内容的行不砍时记一笔）。 */
  readonly log?: (msg: string) => void;
  /** 准备里动过显卡（合成了）：通知渲染器作废它的状态缓存。 */
  readonly touched?: () => void;
}

interface Entry { readonly board: PaintBoard; readonly image: LiveImage; prepared: { gpuImage: unknown; version: number } | null }

export class PaintBoards {
  private readonly entries = new Map<Guid, Entry>();
  private port: Gl2Port | null = null;
  private epochSeen: number;
  private sigCache = "";
  private readonly o: PaintBoardsOpts;
  constructor(o: PaintBoardsOpts) { this.o = o; this.epochSeen = o.epoch(); }

  get count(): number { return this.entries.size; }
  get(texture: Guid): PaintBoard | undefined { return this.entries.get(texture)?.board; }
  guids(): Guid[] { return [...this.entries.keys()]; }

  /** 给这张画建一块空白的画板（已经有了 = 原样返回）。不是画（贴图表里没有、不是分层的、材质不指它、定义里没那一套坐标）= 抛。 */
  ensure(scene: Scene, texture: Guid): PaintBoard {
    this.checkEpoch();
    const hit = this.entries.get(texture);
    if (hit) return hit.board;
    const place = paintPlaceOf(scene, texture);
    if (!place) throw new Error(`PaintBoards.ensure: texture ${texture} is not a placed paint`);
    this.port ??= this.o.port();
    // 步先进内核自带的撤销栈（1-4b；接进三维的撤销 = 1-8 换 HostedSteps）。已知的别扭：跟着坐标改大小也会落成这个栈里的一步（只有调试钩子够得着）
    const board = new PaintBoard({ port: this.port, width: place.uvSet.width, height: place.uvSet.height, log: this.o.log, undo: new UndoStack({ maxQuotaBytes: 256 * 1024 * 1024 }) });
    board.setBackground(place.material.color);
    const entry: Entry = { board, image: null as unknown as LiveImage, prepared: null };
    (entry as { image: LiveImage }).image = {
      kind: "live",
      get width() { return board.width; },
      get height() { return board.height; },
      current: () => entry.prepared,   // 只读准备好的结果（合成在 prepare 里）
    };
    this.entries.set(texture, entry);
    this.resig();
    return board;
  }

  /** 这一帧的准备活（这一笔的薄层：画、交给档口），prepare 里在合成之前跑。返回撤掉。 */
  onPrepare(job: () => void): () => void { this.jobs.add(job); return () => { this.jobs.delete(job); }; }
  private readonly jobs = new Set<() => void>();

  /** 每帧开画之前的准备（编辑器的 beforeRender 调）：sync → 这一帧的准备活 → 合成。一块画板都没有 = 什么都不做。 */
  prepare(scene: Scene): void {
    this.sync(scene);
    if (!this.entries.size) return;
    for (const job of [...this.jobs]) job();
    let touched = false;
    for (const e of this.entries.values()) {
      const r = e.board.compose();
      if (!r) { e.prepared = null; continue; }
      if (!e.prepared || e.prepared.version !== r.version) touched = true;
      e.prepared = { gpuImage: gpuImageOf(this.port!, r.fbo), version: r.version };
    }
    if (touched) this.o.touched?.();
  }

  /** 换文件全销毁；画没了的销毁；其余跟着坐标改大小、垫底色（prepare 的第一步；测试也直接调）。 */
  sync(scene: Scene): void {
    if (this.checkEpoch() || !this.entries.size) return;
    let changed = false;
    for (const [g, e] of [...this.entries]) {
      const place = paintPlaceOf(scene, g);
      if (!place) { e.board.dispose(); this.entries.delete(g); changed = true; continue; }
      e.board.setBackground(place.material.color);
      const w0 = e.board.width, h0 = e.board.height;
      e.board.follow(place.uvSet.width, place.uvSet.height);
      if (e.board.width !== w0 || e.board.height !== h0) changed = true;
    }
    if (changed) this.resig();
  }

  board(texture: Guid): { readonly width: number; readonly height: number; readonly image: LiveImage } | null {
    const e = this.entries.get(texture);
    return e ? { width: e.board.width, height: e.board.height, image: e.image } : null;
  }
  /** 有哪些画板、多大（PaintImages.sig；拉流的内容键和材质槽签名里都有它）。 */
  sig(): string { return this.sigCache; }

  disposeAll(): void {
    for (const e of this.entries.values()) e.board.dispose();
    this.entries.clear();
    this.resig();
  }

  private checkEpoch(): boolean {
    const ep = this.o.epoch();
    if (ep === this.epochSeen) return false;
    this.epochSeen = ep;
    this.disposeAll();
    return true;
  }
  private resig(): void { this.sigCache = [...this.entries].map(([g, e]) => `${g}:${e.board.width}x${e.board.height}`).sort().join(";"); }
}

/** 合成好的那张图的显卡句柄（真显卡 = WebGLTexture；软件显卡 = 它自己）。 */
function gpuImageOf(port: Gl2Port, fbo: PooledFBO): unknown {
  const p = port as { glTextureOf?(f: PooledFBO): WebGLTexture };
  return p.glTextureOf ? p.glTextureOf(fbo) : fbo;
}

/** 浏览器里：内核的显卡接口建在渲染器的画面上（整个程序一个）。 */
export function browserPaintBoards(gl: () => WebGL2RenderingContext | null, epoch: () => number, log?: (msg: string) => void, touched?: () => void): PaintBoards {
  return new PaintBoards({
    port: () => { const g = gl(); if (!g) throw new Error("PaintBoards: renderer has no WebGL2 context"); return BrowserGl2Port.fromContext(g); },
    epoch, log, touched,
  });
}
