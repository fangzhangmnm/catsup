// RenderTree —— render-plan 的 GL 执行器，单一职责 = tree composite（T6 拆自 RenderTreeGL；
// 一次性算像素的兄弟 facade = raster-service.ts，两者共享同一 GlRoom——机房五件套 + 叶驻留 + 装置）。
//
// 帧算法：
//   1. frameMaintain（孤儿 gpu tile 回收）→ pseudo 装置（floats/overlay）→ updated 集。
//   2. 快路径：无 dirty 无动态且 display 缓存 + plan 签名没变 → 只 present（pan/zoom 帧）。
//   3. dirty → 段缓存全失效（undo/redo/commit → 重算树，spec:134）+ 删层对账 + bridge purge。
//   4. buildPlan → 缺的段：sync 成员 → 现算 → copyTexSubImage3D 切 tile 入池（零 readback）。
//   5. sync live 叶（bridge 按 tile 身份增量；surrogate 叶从替身 canvas 换源）→ 合成 rootSteps
//      → display FBO → presentAffine。
//   自愈：gpu tile 被 evict/context-loss = 日常事件（spec:156）——sync/段校验按 isAlive 走，
//   死了就地重建；**LAYER_NOT_SYNCED 异常从此不存在**（test-charter H2 病根，sync 是帧内保证）。
//
// pseudo-layer 统一（spec:127-129）：surrogate（换 tile 源）/ float（源层 z 上浮层 pass）/
//   overlay（烤进叶 pass）三个旧 ad-hoc 注入口 → planner 输入的三面旗。

import { IndexTexture } from "./gpu-tile-pool.ts";
import { TILE_SIZE, tilesAcross, tilesDown, tileCoord } from "../../common/tile-geometry.ts";
import type { Background, ScreenGridBg } from "./gl-compositor.ts";
import type { DocNode, DocLeaf } from "./gl-doc-bridge.ts";
import { buildPlan } from "./render-plan.ts";
import type { Plan, PlanStep, SegBuild, BgKind } from "./render-plan.ts";
import { residentMissTiles, segCopyTiles, residentIds, admitWithRegrow } from "./frame-demand.ts";
import type { PooledFBO, ExternalTexture } from "../../common/gl2-port.ts";
import { takeExternalChanges } from "../../common/gl2-port.ts";
import { dirtyRuns, assertRuns, type DirtyRect } from "../../common/dirty-rects.ts";
import type { GlRoom, FloatInput, OverlayInput, SurrogateInput } from "./gl-room.ts";

// 段缓存：合成结果切 tile + 寻址（内容 straight，与叶同一条 sampleTiled 路径）。
interface SegEntry { byKey: Map<number, number>; index: IndexTexture; gen: number }

/** 一片宿主薄层的样子（判「还是同一片、叠法没变、方框只长」用）。 */
interface HostSnap { tex: unknown; layerId: number; opacity: number; erase: boolean; blendMode: string; lockAlpha: boolean; selMask: unknown; bx: number; by: number; bw: number; bh: number }
/** 计划里只有认识的 pass 种类（增量的守卫：以后加了会往格子外读的 pass，没登记 = 这里不认识 = 整张）。浮层另算（有浮层就整张）。 */
function onlyKnownSteps(steps: readonly PlanStep[]): boolean {
  for (const st of steps) {
    if (st.t === "leaf" || st.t === "seg") continue;
    if (st.t === "group") { if (!onlyKnownSteps(st.body)) return false; continue; }
    return false;
  }
  return true;
}

export class RenderTree {
  private _room: GlRoom;

  private _segCache = new Map<string, SegEntry>();
  private _display: PooledFBO | null = null;      // 上帧合成结果（视口无关）→ pan/zoom 只 present
  private _displaySig: string | null = null;
  private _dirty = true;                          // markDirty（commit/undo/结构变）→ 段全失效
  /** 缓存段建的时候用的底色（底色烤进最底下那段；段的键只认底色的种类，不认颜色）：变了 = 段全失效（2026-11-11：纯色换纯色以前不失效，最底下那段留着旧颜色）。 */
  private _segBg: string | null = null;
  private _lastDocW = -1; private _lastDocH = -1;
  private _lastPlan: Plan | null = null;

  // 帧统计（HUD）：segBuilds/segHits = 段现算/命中数；passes 从 compositor 读。
  readonly frameStats = { segBuilds: 0, segHits: 0, cachingDegraded: false };
  /**
   * 增量合成（CatsUp 贴图主线 1-4d 第 6 条）：上一张结果能不能当底（整张合成过一次之后为真；丢上下文 / 换大小 / 退租 = 假）+ 上一帧的宿主薄层（逐片：哪片、叠法、方框）。
   * 这一帧只在宿主报过的块里重合要同时满足：上一张还在、没 markDirty、计划签名没变、本帧缓存段全命中、没有浮层 / 替身 / 正在同步的叶、宿主薄层还是同一片（叠法不变、方框只长）、
   * 每片外来薄层都报过块、本帧层的像素没变、计划里只有认识的 pass 种类。不满足 = 整张（以前的样子）。报来的块记成脏格子位图（dirty-rects.ts，8 格见方），每个 pass 只画那些行段；格子外一个像素都不写。
   */
  private _incOk = false;
  private _lastHost: HostSnap[] | null = null;
  /** 量 / 测试：上一帧走的哪条路（full 整张 / rects 只合那几块 / same 什么都没变）、几块、占画布多少。 */
  readonly lastPath = { path: "full" as "full" | "rects" | "same", rects: 0, fraction: 1 };

  constructor(room: GlRoom) {
    this._room = room;
    // RasterService 落了新像素（bakeStamps）→ 重算树（room 信号，facade 互不知晓）。
    room.onInvalidate(() => { this._dirty = true; });
    // pin 两档：required = live 叶 + 现役段；preferred = 其余已驻留叶 tile（压力下才让位）。
    room.pool.registerPinProvider(() => {
      const required = new Set<number>();
      const preferred = new Set<number>();
      const live = this._lastPlan?.liveLeaves;
      for (const [id, rec] of room.leaves) {
        const tier = live?.has(id) ? required : preferred;
        for (const g of rec.byKey.values()) tier.add(g);
      }
      for (const [key, seg] of this._segCache) {
        if (!this._lastPlan || this._lastPlan.cacheKeys.has(key)) for (const g of seg.byKey.values()) required.add(g);
      }
      return { required, preferred };
    });
  }

  // ---- 外部信号 ----
  markDirty(): void { this._dirty = true; }

  handleContextRestored(): void {
    this._room.handleContextRestored();
    this._segCache.clear();        // GL 句柄已随 context 死，弃引用
    this._display = null; this._displaySig = null;
    this._dirty = true;
    this._incOk = false; this._lastHost = null;   // 上一张跟着上下文没了
  }

  // ---- 帧入口 ----
  renderFrame(
    nodes: DocNode[], docW: number, docH: number, bg: Background | undefined,
    affine6: number[], canvasW: number, canvasH: number, scale: number, voidRgb: [number, number, number],
    floats: FloatInput[], stampOverlays: readonly OverlayInput[], surrogates: readonly SurrogateInput[],
    liveSyncLeafId: number | null, screenGrid: ScreenGridBg | null = null,
  ): void {
    this.compositeFrame(nodes, docW, docH, bg, floats, stampOverlays, surrogates, liveSyncLeafId);   // 前一半：合成整幅画到离屏图
    this._present(docW, docH, affine6, canvasW, canvasH, scale, voidRgb, screenGrid);               // 后一半：画到屏幕
  }

  /**
   * 只合成、不上屏（2026-11-10 贴图主线 0-5：三维要合成好的那张图贴到模型上）：合成整幅画到一张离屏图并返回。renderFrame = 这一半 + 画到屏幕（同一段代码）。
   * 返回的那张图**归内核**：下一次合成之前有效；宿主不许归还它、不许改它的采样设置。bg 给不透明的颜色 = 交出去的图不透明（三维放材质自己的底色）。
   */
  compositeFrame(
    nodes: DocNode[], docW: number, docH: number, bg: Background | undefined,
    floats: FloatInput[], stampOverlays: readonly OverlayInput[], surrogates: readonly SurrogateInput[],
    liveSyncLeafId: number | null,
  ): PooledFBO {
    const room = this._room;
    this.frameStats.segBuilds = 0; this.frameStats.segHits = 0; this.frameStats.cachingDegraded = false;
    // doc 尺寸变：FBO 池全清（旧尺寸永不再命中）+ 段/display/叶记录作废（index 尺寸不符会逐个重建，主动清更干净）。
    if (docW !== this._lastDocW || docH !== this._lastDocH) {
      if (this._display) { room.glctx.returnFBO(this._display); this._display = null; }
      room.glctx.clearPool();
      for (const rec of room.leaves.values()) rec.index.dispose();
      room.leaves.clear();
      this._invalidateSegs();
      this._displaySig = null;
      this._dirty = true;
      this._incOk = false; this._lastHost = null;
      this._lastDocW = docW; this._lastDocH = docH;
    }
    room.pool.frameMaintain();

    // pseudo 装置
    room.setFloats(floats);
    // 增量第一步（1-4d 第 6 条）：不用计划就能查的条件 + 宿主这一帧报的块（每片都取走：取了就清，不管这一帧走不走增量）。
    //   能走就先进「只画这几块」——下面把宿主薄层转直值那一步也只转这几块（空单子 = 什么都不转）。后面的条件不满足再整张重转。
    const hostRects = this._takeHostRects(stampOverlays);
    let rects: DirtyRect[] | "full" = "full";
    if (hostRects !== "full" && this._incOk && this._display && !this._dirty && this._display.w === docW && this._display.h === docH
        && floats.length === 0 && surrogates.length === 0 && liveSyncLeafId === null) {
      rects = dirtyRuns(hostRects, docW, docH);   // 脏格子位图（8 格见方）的行段：两两不相交；过半 = 整张
      if (rects !== "full") { assertRuns(rects); room.comp.setRects(rects); }
    }
    this._lastHost = this._snapHost(stampOverlays);
    room.setStampOverlays(stampOverlays, docW, docH);   // 2026-09-19 多 overlay（组液化 N 叶各一张 W）

    const updated = new Set<number>();
    for (const f of floats) updated.add(f.layerId);
    for (const ov of stampOverlays) updated.add(ov.layerId);
    // 替身（adjust 平面 / stroke 影子叶；组液化 = N 个影子叶）恒 live，逐个标 updated。
    const surrogateById = new Map<number, SurrogateInput>();
    for (const s of surrogates) { surrogateById.set(s.layerId, s); updated.add(s.layerId); }
    if (liveSyncLeafId !== null) updated.add(liveSyncLeafId);

    const bgKind: BgKind = bg === "checker" ? "checker" : bg ? "color" : "none";
    const leafById = new Map<number, DocLeaf>();
    const planNodes = room.toPlanNodes(nodes, updated, new Set(stampOverlays.map((o) => o.layerId)), leafById);
    const plan = buildPlan(planNodes, updated, bgKind);
    const sig = this._planSig(plan, docW, docH, bg);

    // 快路径：无 dirty 无动态、display 有效且签名没变 → 不重合成（pan/zoom 帧只 present）。
    if (!this._dirty && updated.size === 0 && this._display && this._displaySig === sig) { room.comp.setRects(null); this.lastPath.path = "same"; return this._display; }
    if (rects !== "full" && (this._displaySig !== sig || !onlyKnownSteps(plan.rootSteps))) rects = this._dropRects(stampOverlays, docW, docH);

    const segBg = JSON.stringify(bg ?? null);
    if (segBg !== this._segBg) { this._invalidateSegs(); this._segBg = segBg; }   // 换底色：烤着旧底色的段作废
    if (this._dirty) {
      this._invalidateSegs();                        // undo/redo/commit → 重算树（spec:134）
      // 删层对账：树上已不存在的叶丢记录（gpu tile 变孤儿，下帧 frameMaintain 回收）。
      for (const id of [...room.leaves.keys()]) if (!leafById.has(id)) { room.leaves.get(id)!.index.dispose(); room.leaves.delete(id); }
      room.bridge.purgeDead(room.cpuAlive());
      this._dirty = false;
    }
    this._lastPlan = plan;

    // 孤儿段回收（key 不在本分区 → 丢记录）。
    for (const key of [...this._segCache.keys()]) if (!plan.cacheKeys.has(key)) { this._segCache.get(key)!.index.dispose(); this._segCache.delete(key); }

    // 驻留准入（v0.10.8 深修，病史见 frame-demand.ts 头注）：
    //   缺段判定 + 需求精算（miss 上传 + 拷贝目标，成员驻留**必须**计入——夏音案病根①）
    //   + 两段式 reserve（grow=recreate 会使刚判定「命中」的段全体作废 → 重扫重估——病根②）。
    //   放不下（到 quota 顶）→ 本帧不建段缓存，但段照样逐段驻留合成（transient），慢但对。
    const allTiles = tilesAcross(docW) * tilesDown(docH);
    const scanMissing = (): SegBuild[] => {
      this.frameStats.segHits = 0;
      const out: SegBuild[] = [];
      for (const key of plan.cacheKeys) {
        const seg = this._segCache.get(key);
        if (seg && this._segValid(seg)) { this.frameStats.segHits++; continue; }
        if (seg) { seg.index.dispose(); this._segCache.delete(key); }
        out.push(plan.builds.get(key)!);
      }
      return out;
    };
    const leafOf = (id: number) => leafById.get(id)?.pixels;
    const demandOf = (ms: SegBuild[]) => {
      let n = residentMissTiles(residentIds(plan.liveLeaves, ms), leafOf, (cpuId) => room.bridge.hasLive(cpuId));
      for (const b of ms) n += segCopyTiles(b, leafOf, allTiles, tilesAcross(docW));
      return n;
    };
    const { ok: cachingEnabled, missing } = admitWithRegrow(room.pool, scanMissing, demandOf);
    this.frameStats.cachingDegraded = !cachingEnabled;
    // 增量第二步：缓存段必须整张建（在几块里建 = 缓存里只有那几块是对的）→ 本帧有段不命中 / 不建缓存 = 整张；本帧层的像素变了 = 整张
    if (rects !== "full" && (missing.length > 0 || !cachingEnabled || ![...plan.liveLeaves].every((id) => { const l = leafById.get(id); return !!l && room.leafUpToDate(id, l.pixels, docW, docH); }))) rects = this._dropRects(stampOverlays, docW, docH);

    // sync 一叶（surrogate 叶从替身换源；surrogate/updated 恒 live，不会藏在段成员里）。
    const syncOne = (id: number) => {
      const sur = surrogateById.get(id);
      if (sur) {
        // 影子变体（C6 stroke 替身叶）：真 LayerPixels，走增量 sync；平面变体（adjust）全 bbox 重传。
        if ("pixels" in sur) room.syncLeafSafe(id, sur.pixels, docW, docH);
        else room.syncSurrogate(sur, docW, docH);
        return;
      }
      const leaf = leafById.get(id);
      if (leaf) room.syncLeafSafe(id, leaf.pixels, docW, docH);
    };
    for (const id of plan.liveLeaves) syncOne(id);
    if (rects !== "full" && rects.length === 0) {   // 什么都没变：原样交上一张
      room.comp.setRects(null); room.releaseOverlayFBO(); room.releaseLiveClip();
      this._displaySig = sig; this.lastPath.path = "same"; this.lastPath.rects = 0; this.lastPath.fraction = 0;
      return this._display!;
    }

    // 合成：逐段「就地 sync 成员 → 立刻合成」——sync 与 compose 之间不再隔着其他段的上传
    //   （驱逐窗口=0；准入被拒时后段的 sync 只可能驱逐**已合成完**的前段成员，正确性不受损）。
    //   live 叶 tile 由 pin provider 保 required 档，不会被段成员上传挤掉。
    room.comp.begin(docW, docH);
    const transient = new Map<string, PooledFBO>();   // 建不了的段本帧的临时合成结果（复用，别重算）+ 每帧现算的动态组体 clip 基底
    const segLookup = (key: string) => this._segCache.get(key)?.index;
    // 动态的组体 clip 基底（#79）：组里有 updated / float / overlay 叶 → 每帧现算一张整幅，不进缓存。先于一切段建（引用者在后）。
    for (const key of plan.transientKeys) {
      const b = plan.builds.get(key)!;
      for (const id of b.members) syncOne(id);
      transient.set(key, room.composeSegTransient(b, docW, docH, bg, transient, segLookup));
    }
    for (const b of missing) {
      for (const id of b.members) syncOne(id);
      if (cachingEnabled) this._buildSeg(b, docW, docH, bg, transient, segLookup);
      else transient.set(b.key, room.composeSegTransient(b, docW, docH, bg, transient, segLookup));
    }
    if (rects !== "full") {
      // 就地：上一张当 ping-pong 的一边，只在那几块里铺底、每个 pass 只画那几块；结果要是落在另一张上，只把那几块拷回来
      const D = this._display!;
      try {
        const acc = room.comp.accOn(D, docW, docH, plan.rootBgLive ? bg : undefined);
        room.composeSteps(plan.rootSteps, acc, docW, docH, transient, segLookup);
        if (acc.read !== D) { room.comp.presentTo(acc.read, D, docW, docH, false); room.glctx.returnFBO(acc.read); }
        else room.glctx.returnFBO(acc.write);
        for (const f of transient.values()) room.glctx.returnFBO(f);
        room.comp.end();
        room.releaseOverlayFBO();
        room.releaseLiveClip();
      } finally { room.comp.setRects(null); }
      let area = 0; for (const r of rects) area += r.w * r.h;
      this._displaySig = sig; this.lastPath.path = "rects"; this.lastPath.rects = rects.length; this.lastPath.fraction = area / (docW * docH);
      return D;
    }
    const acc = room.comp.newAcc(docW, docH, plan.rootBgLive ? bg : undefined);
    room.composeSteps(plan.rootSteps, acc, docW, docH, transient, segLookup);
    const fresh = room.comp.finishAcc(acc);
    for (const f of transient.values()) room.glctx.returnFBO(f);
    room.comp.end();
    room.releaseOverlayFBO();
    room.releaseLiveClip();

    if (this._display) room.glctx.returnFBO(this._display);
    this._display = fresh;
    this._displaySig = sig;
    this._incOk = true;   // 整张合成过：下一帧可以拿它当底
    this.lastPath.path = "full"; this.lastPath.rects = 0; this.lastPath.fraction = 1;
    return fresh;
  }

  // ---- 内部：增量合成（1-4d 第 6 条）----
  /** 宿主这一帧报的块（每片外来薄层都取走）+ 方框长出来的那几条；有不是宿主的薄层 / 从没报过的 / 换了一片或叠法变了 / 方框缩了 = "full"。 */
  private _takeHostRects(ovs: readonly OverlayInput[]): DirtyRect[] | "full" {
    let full = false;
    const out: DirtyRect[] = [], prev = this._lastHost;
    if (!prev || prev.length !== ovs.length) full = true;
    ovs.forEach((ov, i) => {
      if (!("kind" in ov) || ov.kind !== "host") { full = true; return; }
      const tex = ov.tex as Partial<ExternalTexture>;
      const ch = tex.external ? takeExternalChanges(tex as ExternalTexture) : null;   // 取了就清（这一帧不走增量也要清）
      if (!ch) { full = true; return; }
      const p = prev?.[i];
      if (!p || p.tex !== ov.tex || p.layerId !== ov.layerId || p.opacity !== ov.opacity || p.erase !== !!ov.erase || p.blendMode !== ov.blendMode || p.lockAlpha !== !!ov.lockAlpha || p.selMask !== ov.selMask) { full = true; return; }
      if (ov.bx > p.bx || ov.by > p.by || ov.bx + ov.bw < p.bx + p.bw || ov.by + ov.bh < p.by + p.bh) { full = true; return; }   // 方框缩了
      out.push(...ch);
      // 方框长出来的那几条：那里以前没有薄层、现在有（薄层那里的像素宿主可能早就画过、当时没报）→ 也要重合
      const ox0 = p.bx, oy0 = p.by, ox1 = p.bx + p.bw, oy1 = p.by + p.bh, nx0 = ov.bx, ny0 = ov.by, nx1 = ov.bx + ov.bw, ny1 = ov.by + ov.bh;
      if (ny0 < oy0) out.push({ x: nx0, y: ny0, w: nx1 - nx0, h: oy0 - ny0 });
      if (ny1 > oy1) out.push({ x: nx0, y: oy1, w: nx1 - nx0, h: ny1 - oy1 });
      if (nx0 < ox0) out.push({ x: nx0, y: oy0, w: ox0 - nx0, h: oy1 - oy0 });
      if (nx1 > ox1) out.push({ x: ox1, y: oy0, w: nx1 - ox1, h: oy1 - oy0 });
    });
    return full ? "full" : out;
  }
  private _snapHost(ovs: readonly OverlayInput[]): HostSnap[] | null {
    const out: HostSnap[] = [];
    for (const ov of ovs) {
      if (!("kind" in ov) || ov.kind !== "host") return null;
      out.push({ tex: ov.tex, layerId: ov.layerId, opacity: ov.opacity, erase: !!ov.erase, blendMode: ov.blendMode, lockAlpha: !!ov.lockAlpha, selMask: ov.selMask, bx: ov.bx, by: ov.by, bw: ov.bw, bh: ov.bh });
    }
    return out;
  }
  /** 增量走不成了（后面的条件不满足）：出「只画几块」，宿主薄层整张重转。 */
  private _dropRects(ovs: readonly OverlayInput[], docW: number, docH: number): "full" {
    const room = this._room;
    room.comp.setRects(null);
    room.releaseOverlayFBO();
    room.setStampOverlays(ovs, docW, docH);
    return "full";
  }

  // ---- 内部：签名 / 段有效性 ----
  private _planSig(plan: Plan, docW: number, docH: number, bg: Background | undefined): string {
    const steps = (ss: PlanStep[]): string => ss.map((s) =>
      s.t === "seg" ? `s(${s.key},${s.mode},${s.opacity},${s.clipBaseId},${s.clipKey})`
      : s.t === "leaf" ? `l(${s.id},${s.mode},${s.opacity},${s.clipBaseId},${s.clipKey},${s.overlay})`
      : s.t === "float" ? `f(${s.id})`
      : `g(${s.id},${s.mode},${s.opacity},${s.clipBaseId},${s.clipKey},[${steps(s.body)}])`).join("|");
    return `${docW}x${docH};bg=${JSON.stringify(bg)};${steps(plan.rootSteps)}`;
  }

  private _segValid(seg: SegEntry): boolean {
    if (seg.gen !== this._room.pool.generation) return false;
    for (const g of seg.byKey.values()) if (!this._room.pool.isAlive(g)) return false;
    return true;
  }

  /**
   * 退租（GLBoard.dispose；CatsUp 0-3a 补全寿命：宿主有很多块画板、会扔，建和拆要成对）：借的 display 离屏图还池、段缓存的索引纹理逐个删。
   * 叶记录（room.leaves）归 GlRoom.dispose。之后不可再用（GLBoard 那层拦）。画画软件一辈子一块画板，不调。
   */
  dispose(): void {
    if (this._display) { this._room.glctx.returnFBO(this._display); this._display = null; }
    this._invalidateSegs();
    this._displaySig = null; this._lastPlan = null;
    this._incOk = false; this._lastHost = null;
  }

  private _invalidateSegs(): void {
    for (const seg of this._segCache.values()) seg.index.dispose();
    this._segCache.clear();
  }

  // ---- 内部：段建造 ----
  private _buildSeg(b: SegBuild, docW: number, docH: number, bg: Background | undefined, transient: Map<string, PooledFBO>, segLookup: (key: string) => IndexTexture | undefined): void {
    const room = this._room;
    const res = room.composeSegTransient(b, docW, docH, bg, transient, segLookup);
    // coverage = 成员叶 tile 键并集；withBg（不透明底）= 全 doc tiles。
    const across = tilesAcross(docW), down = tilesDown(docH);
    const cover = new Set<number>();
    if (b.withBg) { for (let k = 0; k < across * down; k++) cover.add(k); }
    else for (const id of b.members) { const rec = room.leaves.get(id); if (rec) for (const k of rec.byKey.keys()) cover.add(k); }
    const keys = [...cover];
    try {
      const gpuIds = room.pool.copyBatchFrom(res, keys.map((k) => {
        const { tx, ty } = tileCoord(k, across);
        const x = tx * TILE_SIZE, y = ty * TILE_SIZE;
        return { srcX: x, srcY: y, w: Math.min(TILE_SIZE, docW - x), h: Math.min(TILE_SIZE, docH - y) };
      }));
      const byKey = new Map<number, number>();
      keys.forEach((k, i) => byKey.set(k, gpuIds[i]));
      const index = new IndexTexture(room.glctx, docW, docH);
      index.rebuild(byKey, room.pool);
      this._segCache.set(b.key, { byKey, index, gen: room.pool.generation });
      this.frameStats.segBuilds++;
      room.glctx.returnFBO(res);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith("GPU_POOL_EXHAUSTED")) { room.glctx.returnFBO(res); throw e; }
      transient.set(b.key, res);   // 入池失败 → 本帧当临时段用（compose 后归还），不缓存
    }
  }

  private _present(docW: number, docH: number, affine6: number[], canvasW: number, canvasH: number, scale: number, voidRgb: [number, number, number], screenGrid: ScreenGridBg | null): void {
    if (screenGrid) {
      // 透明显示模式：整屏「主题底 + 屏幕空间点网格」代替 void clear，doc 以真透明（premult-over）叠上。
      this._room.comp.drawScreenBg(screenGrid, canvasW, canvasH);
      this._room.comp.presentToScreenAffine(this._display!, docW, docH, affine6, canvasW, canvasH, scale < 1, null, true);
      return;
    }
    // void 底色 clear 并入 present draw（draw spec 的 clear = 全画布，doc 外区域即 void 色）。
    this._room.comp.presentToScreenAffine(this._display!, docW, docH, affine6, canvasW, canvasH, scale < 1,
      [voidRgb[0], voidRgb[1], voidRgb[2], 1]);
  }
}
