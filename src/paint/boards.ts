// paint/boards.ts —— 画板登记处：一张贴图一块画板，按贴图的 GUID 登记（贴图主线 1-3c，施工单 ai-docs/20261111-paint-workorders-10.md）。created 2026-11-11 by Claude Opus 5.5
// 编辑器那边经 stream-provider.ts 的 PaintImages 看它（sync / board / sig）；不认识 three、不认识编辑器。
// · 画板不在创建贴图时建：没有画板的画 = 还没画过 = 照材质的底色显示。这一张里只有调试钩子建（ensure）；以后落第一笔（1-4b）、读文件（1-8）时建。
// · 每帧开画之前的「准备」（prepare；编辑器在渲染之前明着调一次，1-4b 统筹 B）：换了文件（epoch 变了）= 全部销毁；画没了（贴图删了 / 材质不指它了 / 物件删了）= 那块**歇着**；
//   垫材质的底色；跑这一帧登记的准备活（这一笔的薄层）；不歇着的合成。活的图的 current() 只读准备好的结果。**「准备」里不改大小**（1-8a）。
// · 撤销（贴图主线 1-8a，施工单 ai-docs/20261111-paint-workorders-12.md，统筹 11-11 裁定）：画板用内核的 HostedSteps，内核封好的每一步交给三维的撤销栈（这里先攒着，
//   编辑器提交收尾时 / 一笔收完时取走挂上）；undoComponent() = 「画」这一种撤销成分（翻 = 叫内核翻；问 = 内核认不认这个方向、这一笔开没开着；丢 = 告诉内核丢掉）。
//   跟大小 = follow()（编辑器提交的收尾里调，封出来的那一步并进那条指令的那一步）。
// · 画板活多久（统筹 11-11 改判，0-3a）：**只在换文件时扔**。画板是这张画的像素唯一的一份（编成字节存进文件之前），模型那一侧的步（删物件、撤销开始画、清理贴图）撤回来时要的正是它，
//   所以不因为栈里没有画的记录了就扔（1-8a 那条「歇着且记录数为零就扔」作废：会丢画，施工单十二的记录里有复现）。场景里没了 = 歇着（不合成、不进每帧的活、不占显示用的图；
//   同一个贴图身份号回来了接着用这一块），一直留到关文件；歇着那块的内存靠图块池接上压缩之后自己压（tile-jobs.ts）。画的记录被额度挤掉 = 只告诉内核丢那几步，画板的内容不动。
//   以后要再省（编好字节、变冷）等 1-8b 有了编码缓存：先有一份字节挂在所有还回得去的地方，才许放画板。
// · 整个程序只有一个内核的显卡接口：第一次要用时建在渲染器的画面上（BrowserGl2Port.fromContext），以后所有画板共用。
import { BrowserGl2Port } from "./kernel/src/shell/browser-gl2-port.ts";
import { paintMeter } from "./frame-meter.ts";
import type { Gl2Port, PooledFBO } from "./kernel/src/common/gl2-port.ts";
import type { LiveImage, TextureRef } from "../minccino/contract/stream.ts";
import { decodeOraToPainting } from "./kernel/src/backend/ora.ts";
import type { PaintingData } from "./kernel/src/backend/workpiece/painting-workpiece.ts";
import { compositeFits, type TextureDoc } from "../format/document.ts";
import { PaintBoard } from "./board.ts";
import { HostedSteps } from "./kernel/src/backend/workpiece/hosted-steps.ts";
import type { UndoComponent } from "../editor/history.ts";
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
  /** 内核说这张画以前的步全作废（装载 / 状态不可信）：三维的撤销栈把它的记录摘掉（History.dropRecords）；tell = 状态不可信那一种，要在提示行告诉用户 why。刚建画板那一次不叫。 */
  readonly undoReset?: (texture: Guid, why: string, tell: boolean) => void;
  /** 有没有画板变了（第一块建出来 = true；换文件全扔了 = false）：图块池的空闲压缩只在有画板时跑（tile-jobs.ts TileJobsDriver.setActive，0-3a）。 */
  readonly active?: (on: boolean) => void;
  /** 给用户的一句话（1-8b：这张画只能看不能画、为什么）。 */
  readonly say?: (text: string) => void;
}
/** 「画」这种撤销记录：哪张贴图 + 内核封的那一步（内核的对象，三维不看里面）。 */
export interface PaintRec { /** 哪张贴图（GUID；字段不叫 texture：守卫 textures-table 不许「点 texture」）。 */ readonly tex: Guid; readonly step: Parameters<HostedSteps["flip"]>[0] }
export const PAINT_UNDO_KIND = "paint";

interface Entry { readonly board: PaintBoard; readonly image: LiveImage; prepared: { gpuImage: unknown; version: number } | null; readonly steps: HostedSteps; dormant: boolean; open: number }

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
    // 冷的画（贴图行里有字节、还没有画板）绝不能建成空白画板：存盘时空白的会盖掉它（数据安全，1-8b）。要画先 warm()。
    const row = scene.textures.get(texture);
    if (row && row.content.kind === "layered" && row.content.ora) throw new ColdPaintError(texture, this.viewOnly.get(texture) ?? null);
    return this.create(texture, place.uvSet.width, place.uvSet.height, place.material.color);
  }
  /** 建一块画板（宽高由调用的人给：新画 = 那一套坐标的大小；变热 = 分层字节里的大小）。 */
  private create(texture: Guid, width: number, height: number, base: readonly number[]): PaintBoard {
    this.port ??= this.o.port();
    let born = true;   // 刚建画板时内核要是叫 onReset（空的那一次）：什么都不用做
    const steps = new HostedSteps({
      onStep: (step) => { this.pending.push({ tex: texture, step }); },
      onReset: () => { this.pending = this.pending.filter((p) => p.tex !== texture); if (!born && !this.disposing) this.o.undoReset?.(texture, this.resetWhy?.why ?? "画画内核说这张画的状态不可信", this.resetWhy?.tell ?? true); },   // 扔画板（只在换文件时）内核清栈也会叫它：那时整个栈已经换了，不用去摘
    });
    const board = new PaintBoard({ port: this.port, width, height, log: this.o.log, undo: steps });
    born = false;
    this.pending = this.pending.filter((p) => p.tex !== texture);   // 建画板时内核要是封过步（空画布的那一步）：不进三维的栈
    board.setBackground(base);
    const entry: Entry = { board, image: null as unknown as LiveImage, prepared: null, steps, dormant: false, open: 0 };
    (entry as { image: LiveImage }).image = {
      kind: "live",
      get width() { return board.width; },
      get height() { return board.height; },
      current: () => entry.prepared,   // 只读准备好的结果（合成在 prepare 里）
      changedSince: (since) => board.changedSince(since),   // 合成图的变化史（board.ts）：显示那一侧只拷变了的那一块（1-4d 第 6 条）
    };
    this.entries.set(texture, entry);
    if (this.entries.size === 1) this.o.active?.(true);
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
    this.measureSync?.();
    const t0 = performance.now();
    for (const job of [...this.jobs]) job();
    this.measureSync?.();
    const t1 = performance.now();
    let touched = false;
    for (const e of this.entries.values()) {
      if (e.dormant) { e.prepared = null; continue; }   // 歇着：不合成
      const r = e.board.compose();
      if (!r) { e.prepared = null; continue; }
      if (!e.prepared || e.prepared.version !== r.version) touched = true;
      e.prepared = { gpuImage: gpuImageOf(this.port!, r.fbo), version: r.version };
    }
    this.measureSync?.();
    this.lastPrepare = { jobsMs: t1 - t0, composeMs: performance.now() - t1 };
    paintMeter.put("compose", this.lastPrepare.composeMs);   // 每帧的读数（1-4d；关着不做事）
    if (touched) this.o.touched?.();
  }
  /**
   * 核对（读数角标「核对」；统筹 11-11）：这块画板的内核合成图 vs 强制整张重合（PaintBoard.verifyFull），完了把「准备好的」换成整张那张——
   * 显示那一侧的核对从它重拷（不换的话 current() 还交帧头那张：内核整张重合可能换了一张图，显示图的核对会拿旧的比旧的，什么都看不出来；探针丢报那条抓到的）。
   */
  verifyFull(texture: Guid): { diff: number; box: readonly [number, number, number, number] | null } | null {
    const e = this.entries.get(texture);
    if (!e || e.dormant) return null;
    const d = e.board.verifyFull(), r = e.board.compose();
    e.prepared = r ? { gpuImage: gpuImageOf(this.port!, r.fbo), version: r.version } : null;
    return d;
  }
  /** 上一次「准备」两段（量；毫秒）：这一帧的准备活（薄层）/ 内核合成（含缩小图）。 */
  lastPrepare = { jobsMs: 0, composeMs: 0 };
  /** 只给量的时候用（探针）：每段前后等显卡把活做完，量到的才是显卡真花的时间。平时 null。 */
  measureSync: (() => void) | null = null;

  /** 换文件全销毁；画没了 = 歇着（留到关文件）；回来了 = 接着用；垫底色（prepare 的第一步；测试也直接调）。不改大小（1-8a：跟大小在提交的收尾里，follow）。 */
  sync(scene: Scene): void {
    if (this.checkEpoch()) return;
    let changed = this.syncCold(scene);
    if (changed) this.resig();
    changed = false;
    for (const [g, e] of [...this.entries]) {
      const place = paintPlaceOf(scene, g);
      if (!place) { if (!e.dormant) { e.dormant = true; e.prepared = null; changed = true; } continue; }
      if (e.dormant) { e.dormant = false; changed = true; }
      e.board.setBackground(place.material.color);
    }
    if (changed) this.resig();
  }
  /**
   * 跟着那一套贴图坐标的画布大小（裁定在 board.ts follow 头）：编辑器每条指令提交的收尾里调（1-8a），改大小时内核封的那一步进 pending、由编辑器挂进那条指令的那一步。
   * 歇着的不动。返回有没有改。
   */
  follow(scene: Scene): boolean {
    if (this.checkEpoch()) return false;
    let changed = false;
    for (const [g, e] of this.entries) {
      if (e.dormant) continue;
      const place = paintPlaceOf(scene, g);
      if (!place) continue;
      const w0 = e.board.width, h0 = e.board.height;
      e.board.follow(place.uvSet.width, place.uvSet.height);
      if (e.board.width !== w0 || e.board.height !== h0) changed = true;
    }
    if (changed) this.resig();
    return changed;
  }

  // —— 撤销（1-8a）——
  private pending: PaintRec[] = [];
  private resetWhy: { why: string; tell: boolean } | null = null;
  /** 内核交来、还没挂进三维的栈的步（取走 = 交给编辑器挂上）。 */
  takePending(): PaintRec[] { const out = this.pending; this.pending = []; return out; }
  /** 正开着的一笔（档口开着令牌）：撤销 / 重做之前取消它们（beforeHistoryMove）。返回撤掉登记。 */
  trackOpen(texture: Guid, cancel: () => void): () => void {
    const e = this.entries.get(texture);
    if (e) e.open++;
    this.opens.add(cancel);
    return () => { if (this.opens.delete(cancel) && e) e.open--; };
  }
  private readonly opens = new Set<() => void>();
  /** 撤销 / 重做之前：开着的那几笔全部取消（零痕迹）。 */
  cancelOpen(): void { for (const c of [...this.opens]) c(); }
  /** 这张画的状态不可信：叫内核把以前的步全部作废（onReset → undoReset → 三维的栈摘掉记录）。 */
  distrust(texture: Guid, why: string): void {
    const e = this.entries.get(texture);
    if (!e) return;
    this.resetWhy = { why, tell: true };
    try { e.steps.clear(); } finally { this.resetWhy = null; }
  }
  /** 灌一份内容（调试钩子；以后读文件）：内核装载 = 这张画以前的步全作废（不用告诉用户：是装载，不是出错）。 */
  load(texture: Guid, data: Parameters<PaintBoard["load"]>[0]): void {
    const e = this.entries.get(texture);
    if (!e) throw new Error(`PaintBoards.load: no board for ${texture}`);
    this.resetWhy = { why: "装载了新内容", tell: false };
    try { e.board.load(data); } finally { this.resetWhy = null; }
    this.pending = this.pending.filter((p) => p.tex !== texture);   // 装载封的那一步不进三维的栈（以前的都作废了）
  }
  /** 扔一块画板（只在换文件时）：图块全部还池、显卡上那份退租（PaintBoard.dispose）；这期间内核清栈发的 onReset 不往三维的栈里摘记录。 */
  private kill(board: PaintBoard): void {
    this.disposing = true;
    try { board.dispose(); } finally { this.disposing = false; }
  }
  private disposing = false;
  /** 「画」这一种撤销成分（编辑器 registerUndoComponent 登记）。 */
  undoComponent(): UndoComponent<PaintRec> {
    const steps = (r: PaintRec): HostedSteps | null => this.entries.get(r.tex)?.steps ?? null;
    return {
      kind: PAINT_UNDO_KIND,
      check: (recs, dir) => {
        const seen = new Set<Guid>();
        for (const r of recs) {
          if (seen.has(r.tex)) continue;   // 同一张画的后几条：前一条翻完它们才对得上（翻的时候内核再把关，抛了整步翻回去）
          seen.add(r.tex);
          const e = this.entries.get(r.tex);
          if (!e) return "这张画的画板已经不在了";
          if (e.open > 0) return "这张画还有一笔没画完";
          let d: "undo" | "redo";
          try { d = e.steps.directionOf(r.step); } catch (err) { return `画画内核不认这一步（${err instanceof Error ? err.message : String(err)}）`; }
          if (d !== dir) return `画画内核说这一步该${d === "undo" ? "撤销" : "重做"}，不是${dir === "undo" ? "撤销" : "重做"}`;
        }
        return null;
      },
      swap: (r) => { const s = steps(r); if (!s) throw new Error(`paint undo: no board for texture ${r.tex}`); s.flip(r.step); this.overlayTouched(r.tex); return r; },
      bytes: (r) => steps(r)?.bytes(r.step) ?? 0,
      dispose: (r) => { steps(r)?.drop(r.step); },   // 截断 / 额度挤掉：只告诉内核丢那一步（图块还池），画板的内容不动
      volatileBytes: true,   // 内核的图块没压缩时记 0、压缩之后记压缩后的大小（0-3a）：算额度之前现问
      untrusted: (r, cause) => { const why = `翻回去也失败了（${cause instanceof Error ? cause.message : String(cause)}）`; this.distrust(r.tex, why); return `这张画的撤销记录清掉了：${why}`; },
    };
  }
  /** 翻过一步：下一帧重新合成（内容键里有作品的版本号，这里只是保险）。 */
  private overlayTouched(texture: Guid): void { this.entries.get(texture)?.board.overlayChanged(); }

  board(texture: Guid): { readonly width: number; readonly height: number; readonly image: LiveImage | TextureRef } | null {
    const e = this.entries.get(texture);
    return e ? { width: e.board.width, height: e.board.height, image: e.image } : this.cold.get(texture)?.shown ?? null;
  }

  // —— 冷的画（1-8b，统筹 11-11：冷的画不解开，显示存盘时存下的合成图）——
  /** 冷的画：贴图行（对象身份）+ 底色 → 显示用的那张合成图（PNG 当普通的图走导入贴图那条路，「画」的取样方式）；合成图没有 / 作废 = shown 是 null（照底色）。 */
  private readonly cold = new Map<Guid, { readonly row: TextureDoc; readonly base: string; readonly shown: { readonly width: number; readonly height: number; readonly image: TextureRef } | null }>();
  /** 只能看不能画的画 → 为什么（变热时分层字节尺寸不对 / 解不开）。照合成图继续显示，不改任何数据。 */
  private readonly viewOnly = new Map<Guid, string>();
  private readonly warming = new Map<Guid, Promise<"hot" | "view-only">>();
  /** 每帧的「准备」里：场景里走画、没有画板、行里有字节的 → 冷的；看合成图还算不算数。底色变了（合成图本身对得上）= 热一次重新合成。返回签名要不要变。 */
  private syncCold(scene: Scene): boolean {
    let changed = false;
    const seen = new Set<Guid>();
    for (const t of scene.textures.values()) {
      if (t.content.kind !== "layered" || !t.content.ora || this.entries.has(t.guid)) continue;
      const place = paintPlaceOf(scene, t.guid);
      if (!place) continue;
      seen.add(t.guid);
      const base = place.material.color.join(","), hit = this.cold.get(t.guid);
      if (hit && hit.row === t && hit.base === base) continue;
      let shown: { width: number; height: number; image: TextureRef } | null = null;
      const fits = compositeFits(t, place.material.color), dims = t.composite ? pngSize(t.composite.png) : null;
      if (fits && dims && dims.width === place.uvSet.width && dims.height >= place.uvSet.height) shown = { width: dims.width, height: dims.height, image: { mimeType: "image/png", bytes: t.composite!.png, sizeM: [1, 1], paint: { base: place.material.color } } };
      this.cold.set(t.guid, { row: t, base, shown });
      changed = true;
      // 合成图本身对得上、只是底色变了：热一次重新合成（统筹 11-11）。没有合成图 / 记号对不上（老文件）：照底色，等它变热时自然就有。
      if (!fits && t.composite && !this.viewOnly.has(t.guid) && compositeFits(t, t.composite.base)) void this.warm(scene, t.guid);
    }
    for (const g of [...this.cold.keys()]) if (!seen.has(g)) { this.cold.delete(g); changed = true; }
    return changed;
  }
  /** 这张画现在是什么状态（落笔之前问）：hot = 有画板；cold = 有字节、没画板（要先 warm）；warming = 正在解开；view-only = 只能看不能画；new = 没字节没画板（ensure 建空白的）。 */
  stateOf(scene: Scene, texture: Guid): "hot" | "cold" | "warming" | "view-only" | "new" {
    if (this.entries.has(texture)) return "hot";
    if (this.viewOnly.has(texture)) return "view-only";
    if (this.warming.has(texture)) return "warming";
    const row = scene.textures.get(texture);
    return row && row.content.kind === "layered" && row.content.ora ? "cold" : "new";
  }
  viewOnlyWhy(texture: Guid): string | null { return this.viewOnly.get(texture) ?? null; }
  /**
   * 变热：解开分层字节（内核，主线程上的一整块活）→ 查尺寸（宽 = 坐标的宽、高 ≥ 坐标的高）→ 建画板灌进去（以前的步全作废：是装载，不告诉）。
   * 尺寸不对 / 解不开 = 只能看不能画（明说为什么，照合成图继续显示，不改任何数据）。已经热了 / 正在解 = 同一个结果。换了文件 = 作废。
   */
  warm(scene: Scene, texture: Guid): Promise<"hot" | "view-only"> {
    if (this.entries.has(texture)) return Promise.resolve("hot");
    if (this.viewOnly.has(texture)) return Promise.resolve("view-only");
    const going = this.warming.get(texture);
    if (going) return going;
    const row = scene.textures.get(texture), place = paintPlaceOf(scene, texture), epoch = this.epochSeen;
    if (!row || row.content.kind !== "layered" || !row.content.ora || !place) return Promise.reject(new Error(`PaintBoards.warm: texture ${texture} is not a cold placed paint`));
    const ora = row.content.ora, name = row.name || "画";
    const run = (async (): Promise<"hot" | "view-only"> => {
      let data: PaintingData;
      try { const d = await decodeOraToPainting(new Blob([ora as BlobPart])); data = (d as { data?: PaintingData }).data ?? (d as unknown as PaintingData); }
      catch (e) { return this.markViewOnly(texture, `「${name}」这张画只能看不能画：分层的字节解不开（${e instanceof Error ? e.message : String(e)}）`); }
      if (this.o.epoch() !== epoch || this.epochSeen !== epoch) return "view-only";   // 解的时候换了文件：作废（不建画板）
      if (data.width !== place.uvSet.width || data.height < place.uvSet.height) return this.markViewOnly(texture, `「${name}」这张画只能看不能画：分层的大小 ${data.width}×${data.height} 和贴图坐标 ${place.uvSet.width}×${place.uvSet.height} 对不上`);
      if (this.entries.has(texture)) return "hot";
      const b = this.create(texture, data.width, data.height, place.material.color);
      this.resetWhy = { why: "装载了这张画", tell: false };
      try { b.load(data); } finally { this.resetWhy = null; }
      this.pending = this.pending.filter((p) => p.tex !== texture);   // 装载封的那一步不进三维的栈
      this.cold.delete(texture); this.resig();
      return "hot";
    })();
    this.warming.set(texture, run);
    void run.finally(() => { if (this.warming.get(texture) === run) this.warming.delete(texture); }).catch(() => {});
    return run;
  }
  private markViewOnly(texture: Guid, why: string): "view-only" { this.viewOnly.set(texture, why); this.o.say?.(why); return "view-only"; }
  /** 有哪些画板、多大（PaintImages.sig；拉流的内容键和材质槽签名里都有它）。 */
  sig(): string { return this.sigCache; }

  disposeAll(): void {
    this.cancelOpen();   // 开着的一笔先取消（零痕迹、令牌收口），再扔
    const all = [...this.entries.values()];
    this.entries.clear(); this.pending = []; this.opens.clear(); this.cold.clear(); this.viewOnly.clear(); this.warming.clear();
    for (const e of all) this.kill(e.board);
    if (all.length) { this.port?.clearPool(); this.o.active?.(false); }   // 一块画板都不剩了：内核显卡接口池子里空着的离屏图也删掉（池是几块画板共用的，只有它们用；扔光了才清）；空闲压缩停
    this.resig();
  }

  private checkEpoch(): boolean {
    const ep = this.o.epoch();
    if (ep === this.epochSeen) return false;
    this.epochSeen = ep;
    this.disposeAll();
    return true;
  }
  private resig(): void {
    const hot = [...this.entries].map(([g, e]) => `${g}:${e.board.width}x${e.board.height}`);
    const cold = [...this.cold].filter(([, c]) => c.shown).map(([g, c]) => `${g}:cold:${c.shown!.width}x${c.shown!.height}:${c.base}`);   // 冷的画显示合成图的那几张也进签名（换了合成图 / 底色 = 材质重建）
    this.sigCache = [...hot, ...cold].sort().join(";");
  }
}

/** 合成好的那张图的显卡句柄（真显卡 = WebGLTexture；软件显卡 = 它自己）。 */
function gpuImageOf(port: Gl2Port, fbo: PooledFBO): unknown {
  const p = port as { glTextureOf?(f: PooledFBO): WebGLTexture };
  return p.glTextureOf ? p.glTextureOf(fbo) : fbo;
}

/** 浏览器里：内核的显卡接口建在渲染器的画面上（整个程序一个）。 */
export function browserPaintBoards(gl: () => WebGL2RenderingContext | null, epoch: () => number, log?: (msg: string) => void, touched?: () => void, undoReset?: (texture: Guid, why: string, tell: boolean) => void, active?: (on: boolean) => void, say?: (text: string) => void): PaintBoards {
  return new PaintBoards({
    port: () => { const g = gl(); if (!g) throw new Error("PaintBoards: renderer has no WebGL2 context"); return BrowserGl2Port.fromContext(g); },
    epoch, log, touched, ...(undoReset ? { undoReset } : {}), ...(active ? { active } : {}), ...(say ? { say } : {}),
  });
}

/** 落笔撞上冷的画（1-8b）：画板登记处不给它建空白画板。why = 只能看不能画的原因（有的话）。 */
export class ColdPaintError extends Error {
  /** 哪张贴图（字段不叫 texture：守卫 textures-table 不许「点 texture」）。 */
  readonly tex: Guid; readonly viewOnly: string | null;
  constructor(tex: Guid, viewOnly: string | null) { super(viewOnly ?? `PaintBoards.ensure: painting ${tex} is still closed (cold) — warm() it before painting`); this.name = "ColdPaintError"; this.tex = tex; this.viewOnly = viewOnly; }
}
/** PNG 的宽高（只读文件头的 IHDR；不是 PNG = null）。 */
export function pngSize(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47 || b[12] !== 0x49 || b[13] !== 0x48 || b[14] !== 0x44 || b[15] !== 0x52) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}
