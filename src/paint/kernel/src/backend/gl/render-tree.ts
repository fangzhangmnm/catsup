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
import type { PooledFBO } from "../../common/gl2-port.ts";
import type { GlRoom, FloatInput, OverlayInput, SurrogateInput } from "./gl-room.ts";

// 段缓存：合成结果切 tile + 寻址（内容 straight，与叶同一条 sampleTiled 路径）。
interface SegEntry { byKey: Map<number, number>; index: IndexTexture; gen: number }

export class RenderTree {
  private _room: GlRoom;

  private _segCache = new Map<string, SegEntry>();
  private _display: PooledFBO | null = null;      // 上帧合成结果（视口无关）→ pan/zoom 只 present
  private _displaySig: string | null = null;
  private _dirty = true;                          // markDirty（commit/undo/结构变）→ 段全失效
  private _lastDocW = -1; private _lastDocH = -1;
  private _lastPlan: Plan | null = null;

  // 帧统计（HUD）：segBuilds/segHits = 段现算/命中数；passes 从 compositor 读。
  readonly frameStats = { segBuilds: 0, segHits: 0, cachingDegraded: false };

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
  }

  // ---- 帧入口 ----
  renderFrame(
    nodes: DocNode[], docW: number, docH: number, bg: Background | undefined,
    affine6: number[], canvasW: number, canvasH: number, scale: number, voidRgb: [number, number, number],
    floats: FloatInput[], stampOverlays: readonly OverlayInput[], surrogates: readonly SurrogateInput[],
    liveSyncLeafId: number | null, screenGrid: ScreenGridBg | null = null,
  ): void {
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
      this._lastDocW = docW; this._lastDocH = docH;
    }
    room.pool.frameMaintain();

    // pseudo 装置
    room.setFloats(floats);
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

    // 快路径：无 dirty 无动态、display 有效且签名没变 → 只 present（pan/zoom 帧）。
    if (!this._dirty && updated.size === 0 && this._display && this._displaySig === sig) {
      this._present(docW, docH, affine6, canvasW, canvasH, scale, voidRgb, screenGrid);
      return;
    }

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
    this._present(docW, docH, affine6, canvasW, canvasH, scale, voidRgb, screenGrid);
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
