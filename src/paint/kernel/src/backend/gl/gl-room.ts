// GlRoom —— GL 机房引用包 + 双 facade 的共享基座（T6，ADR-0008 / 提案 .h「render 侧拆分」）。
// 机房五件套（Gl2Port / GpuTilePool / CpuGpuTileBridge / GLCompositor / GLStampRasterizer）
// **唯一实例**在此；RenderTree（tree composite）与 RasterService（一次性算像素）各拿同一个 room。
// 共享的不止五件套——还有两 facade 都要坐的「台面」：
//   - 叶 GPU 驻留台账（leaves + sync）：bakeStamps 搭 renderFrame 的 base-tile 便车
//     （拆成两套缓存 = 每笔整层重传，handoff §1 T6 硬约束）；
//   - pseudo 装置（overlay/float/选区 mask/fill 色纹理）：live 预览与吸管 WYSIWYG 用同一份状态；
//   - composeSteps 合成机：display 帧与一次性合成走同一条 pass 序（观感零漂移）。
// RenderTree 私有的仍在 RenderTree（段缓存/display/plan 签名/frameStats）；本类零策略、零帧决策。

import { GpuTilePool, IndexTexture, GPU_TILE_BYTES } from "./gpu-tile-pool.ts";
import { CpuGpuTileBridge } from "./tile-bridge.ts";
import { appTilePool } from "../tiles/app-tile-pool.ts";
import { TILE_SIZE, tilesAcross, tilesDown } from "../../common/tile-geometry.ts";
import { GLCompositor } from "./gl-compositor.ts";
import type { Acc, OverlayDesc, FloatDesc } from "./gl-compositor.ts";
import { safeMode } from "./gl-doc-bridge.ts";
import type { DocNode, DocLeaf } from "./gl-doc-bridge.ts";
import { LayerPixels } from "../tiles/tile-layer.ts";
import { GLStampRasterizer } from "./gl-stamp.ts";
import type { Stamp, StrokeShape } from "./gl-stamp.ts";
import type { Plan, PlanNode, PlanStep, SegBuild } from "./render-plan.ts";
import type { PooledFBO, FBOPrec, Gl2Port, Gl2Texture, Gl2TexSource, Gl2TileArena } from "../../common/gl2-port.ts";
import type { BlendMode } from "./blend-glsl.ts";

// ---- board 输入（原 render-tree-gl 同名接口原样迁入） ----
// v0.6.39 去 canvas 化：替身 = straight 字节平面（filters-adjust 的预览 buffer 直传，就地更新）。
import type { RegionOverlayInput } from "./region-stroke.ts";

export interface SurrogatePlaneInput { layerId: number; bytes: { data: Uint8ClampedArray; w: number; h: number }; bx: number; by: number; w: number; h: number; }
// C6 影子变体：替身 = 整个 LayerPixels（stroke 档替身叶，src/stroke-session.ts StrokeShadow）。
//   未变 tile 与真叶共享句柄 → syncLeafSafe 走 per-tile 增量上传（对比平面变体的全 bbox 重传）；
//   三面预览旗语义不变（surrogate = 活动层换源显示，吸管/合成 WYSIWYG 同待遇）。
export interface SurrogateShadowInput { layerId: number; pixels: LayerPixels; }
export type SurrogateInput = SurrogatePlaneInput | SurrogateShadowInput;

// v0.6.38 全 typed array（零 canvas premult 往返）：u8Plane = straight 源字节（原尺寸，或 rotsprite
// 的 EPX 放大平面——此时 srcW/srcH 已是放大尺寸、mode=0）；mode 3 用 splinePlane（RGBA16F）。
export interface FloatInput {
  layerId: number;
  srcW: number; srcH: number;
  hinv: number[];                 // 9，row-major，doc→源单位方格
  mode: number;                   // 0=nearest 1=bilinear 2=bicubic 3=spline（预滤波 B 样条）
  splinePlane?: { data: Float32Array; w: number; h: number } | null;   // mode 3 的系数平面（PAD 边距，src/bspline.ts）
  u8Plane?: { data: Uint8ClampedArray; w: number; h: number } | null;  // 其余 mode 的 straight u8 源
}

export interface StampOverlayInput {
  stamps: Stamp[]; shape: StrokeShape;
  bx: number; by: number; bw: number; bh: number;
  layerId: number; opacity: number; erase: boolean; blendMode: string;
  lockAlpha: boolean;
  selMask: { data: Uint8Array; ox: number; oy: number; ow: number; oh: number } | null;
}

// v0.5.11 fill-mode：填色预览/commit 走同一 overlay 槽（journal「pseudoLayer 会有不同渲染模式」预留的路）。
//   内容 = 1×1 填色纹理拉伸到选区 bbox（shader overlay 分支 bbox 外自透明，:blend-glsl 越界检查）；
//   选区裁剪走既有 selMask 管道（此处必填——fill 只在有选区时存在）。语义钉死 source-over/opacity=1/无 erase；
//   lockAlpha 跟活动层（user 拍板：填色尊重锁α）。stamp 光栅器不参与（它只会圆/椭圆 dab）。
export interface FillOverlayInput {
  kind: "fill";
  color: [number, number, number];   // 0..255 直值（1×1 纹理字节）
  bx: number; by: number; bw: number; bh: number;   // = 选区 bbox（doc 坐标）
  layerId: number;
  lockAlpha: boolean;
  selMask: { data: Uint8Array; ox: number; oy: number; ow: number; oh: number };
}
export type OverlayInput = StampOverlayInput | FillOverlayInput | RegionOverlayInput;
type OverlayEntry = { tex: Gl2TexSource; layerId: number; opacity: number; erase: boolean; blendMode: string; ox: number; oy: number; ow: number; oh: number; lockAlpha: boolean; selMask: { tex: Gl2Texture; ox: number; oy: number; ow: number; oh: number } | null; replace: boolean };   // region（2026-09-18）：W 当 overlay，replace 合成

// overlay 空判据（kind-aware——fill 没有 stamps，旧 stamps.length 守卫会把 fill 静默早退成 false）。
export function overlayEmpty(ov: OverlayInput): boolean {
  if (ov.bw <= 0 || ov.bh <= 0) return true;
  return "kind" in ov ? false : ov.stamps.length === 0;
}

// 每叶 GPU 驻留记录（7a 引入）。两 facade 共读共写：renderFrame sync 建，bakeStamps 命中即免重传。
export interface LeafRec { index: IndexTexture; byKey: Map<number, number>; src: LayerPixels | null; cpuVersion: number; gen: number }

export class GlRoom {
  readonly glctx: Gl2Port;
  readonly arena: Gl2TileArena;      // GPU tile 纹理仓（C8 起归 Port 所有；池记账在 pool）
  readonly pool: GpuTilePool;
  readonly bridge: CpuGpuTileBridge;
  readonly comp: GLCompositor;
  readonly rasterizer: GLStampRasterizer;

  // 叶 GPU 驻留台账（原 RenderTreeGL._layerTiles）。
  readonly leaves = new Map<number, LeafRec>();

  // pseudo 装置（overlay/float/选区 mask/fill 色）——live 预览与一次性合成（吸管 WYSIWYG）共用。
  // overlay 装置（2026-09-19 多 overlay：组液化 = N 叶各一张 W；原单槽 _overlay 升成按叶的表，语义不变：一叶最多一个 overlay）
  private _overlays = new Map<number, OverlayEntry>();
  private _overlayOwnedFBOs: PooledFBO[] = [];   // stamp 分支借的 straight 转换 FBO（帧末 / commit 后归还）
  private _selTex: Gl2Texture | null = null;
  private _selTexSrc: Uint8Array | null = null;
  private _fillTex: Gl2Texture | null = null;    // fill-mode：1×1 填色纹理（颜色变才重传）
  private _fillTexColor = -1;
  // 浮层源纹理缓存；contentKey = 平面 typed array 身份（identity 即内容，源变才重传）。
  private _floatTex = new Map<number, { tex: Gl2Texture; contentKey: unknown }>();
  private _floats = new Map<number, FloatDesc>();

  // v0.4.11：live 描边中给 clip-above 用的 merged(base⊕stroke) 整幅纹理（帧内缓存，帧末归还）。
  private _liveMergedClips = new Map<number, PooledFBO>();   // 按 clip 基底叶（多 overlay 时各自一张 merged）

  // 内容失效信号：RasterService.bakeStamps 落了新像素 → RenderTree 置脏重算树（facade 互不知晓）。
  private _invalidateListeners: (() => void)[] = [];

  constructor(glctx: Gl2Port, maxSlices: number, accumPrec: FBOPrec = "u8") {
    this.glctx = glctx;
    this.arena = glctx.createTileArena(TILE_SIZE, Math.min(64, maxSlices));
    this.pool = new GpuTilePool(this.arena, maxSlices);
    this.bridge = new CpuGpuTileBridge(this.pool);
    this.comp = new GLCompositor(glctx, accumPrec);
    this.rasterizer = new GLStampRasterizer(glctx);
  }

  // ---- 机房观测口（HUD） ----
  get memory(): { usedTiles: number; capacity: number; usedBytes: number; committedBytes: number; quotaBytes: number } {
    return {
      usedTiles: this.pool.allocatedCount, capacity: this.pool.capacity,
      usedBytes: this.pool.allocatedCount * GPU_TILE_BYTES,
      committedBytes: this.pool.committedBytes, quotaBytes: this.pool.quotaBytes,
    };
  }
  get stats(): { passes: number; floatPasses: number } { return this.comp.stats; }
  get fboPoolStats(): { count: number; bytes: number } { return this.glctx.fboPoolStats; }

  // ---- 内容失效信号 ----
  onInvalidate(cb: () => void): void { this._invalidateListeners.push(cb); }
  invalidateTree(): void { for (const cb of this._invalidateListeners) cb(); }

  // ---- 退租（C8 ⑥）：backend dispose 时释放本租户全部 GPU 驻留 ----
  // arena 显式还 Port（真 GPU 立即 free；SoftGl2 弃引用交 GC）+ IndexTexture/pseudo 纹理逐个删；
  // 借出的 FBO 归还池（**池归 Port、跨租户共享，不 clearPool**——那是邻居的钱包）。
  // dispose 后本 room 不可再用（消费类都持它，随 backend 一起弃；arena 动词有 ARENA_DISPOSED 墙）。
  dispose(): void {
    this.releaseLiveClip();
    this.releaseOverlayFBO();
    for (const rec of this.leaves.values()) rec.index.dispose();
    this.leaves.clear();
    if (this._selTex) { this.glctx.deleteTexture(this._selTex); this._selTex = null; this._selTexSrc = null; }
    if (this._fillTex) { this.glctx.deleteTexture(this._fillTex); this._fillTex = null; this._fillTexColor = -1; }
    for (const e of this._floatTex.values()) this.glctx.deleteTexture(e.tex);
    this._floatTex.clear(); this._floats.clear();
    this._overlays.clear();
    this._invalidateListeners = [];
    this.arena.dispose();
  }

  // ---- context-loss：机房侧全量作废（段缓存/display 归 RenderTree 自己清） ----
  handleContextRestored(): void {
    this.pool.clearAll();
    this.bridge.clear();
    this.leaves.clear();           // GL 句柄已随 context 死，弃引用
    this._selTex = null; this._selTexSrc = null;
    this._fillTex = null; this._fillTexColor = -1;
    this._floatTex.clear(); this._floats.clear();
    this._overlays.clear(); this._overlayOwnedFBOs = [];
    this._liveMergedClips.clear();   // GL 句柄已随 context 死
  }

  // ---- sync：CPU tile → GPU 驻留（原 RenderTreeGL._syncPixels 族） ----
  // 驻留降级计数（v0.10.8）：吞掉的 EXHAUSTED 不再无声——HUD/board 读这里出声（夏音案教训：
  //   静默跳层 + 结果被缓存冻结，用户只看到"图层丢了"，连 console 都无痕）。
  readonly syncStats = { drops: 0 };

  /** false = 池连驱逐后都塞不下（内容超显存 quota）：该层保持陈旧/部分显示。 */
  syncLeafSafe(leafId: number, pixels: LayerPixels, docW: number, docH: number): boolean {
    try { this._syncPixels(leafId, pixels, docW, docH); return true; } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith("GPU_POOL_EXHAUSTED")) throw e;
      this.syncStats.drops++;
      return false;
    }
  }

  private _syncPixels(leafId: number, pixels: LayerPixels, docW: number, docH: number): void {
    const across = tilesAcross(docW), down = tilesDown(docH);
    let rec = this.leaves.get(leafId);
    if (rec && (rec.index.across !== across || rec.index.down !== down)) {
      rec.index.dispose();
      this.leaves.delete(leafId);
      rec = undefined;
    }
    const gen = this.pool.generation;
    if (rec && rec.src === pixels && rec.cpuVersion === pixels.contentVersion && rec.gen === gen
        && this.recAlive(rec)) return;   // 快路径（isAlive 扫描防 LRU 驱逐后采到被重用的 slice）
    if (!rec) {
      rec = { index: new IndexTexture(this.glctx, docW, docH), byKey: new Map(), src: null, cpuVersion: -1, gen };
      this.leaves.set(leafId, rec);
    }
    const keys: number[] = [];
    const entries: { cpuId: number; bytes: () => Uint8Array }[] = [];
    pixels.forEachTileHandle((tx, ty, h) => {
      keys.push(ty * across + tx);
      entries.push({ cpuId: h.id, bytes: () => h.bytes() });
    });
    const gpuIds = this.bridge.ensureUploaded(entries);
    let changed = rec.byKey.size !== keys.length || rec.gen !== gen;
    if (!changed) for (let i = 0; i < keys.length; i++) if (rec.byKey.get(keys[i]) !== gpuIds[i]) { changed = true; break; }
    if (changed) {
      rec.byKey.clear();
      for (let i = 0; i < keys.length; i++) rec.byKey.set(keys[i], gpuIds[i]);
      rec.index.rebuild(rec.byKey, this.pool);
    }
    rec.src = pixels;
    rec.cpuVersion = pixels.contentVersion;
    rec.gen = gen;
  }

  // 平面替身（adjust 面板）：临时 LayerPixels 全 bbox 重建重传。影子替身走 syncLeafSafe（增量），
  //   分派在消费者侧（render-tree/raster-service 的 "pixels" in surrogate 分支）。
  syncSurrogate(s: SurrogatePlaneInput, docW: number, docH: number): void {
    const tmp = new LayerPixels(docW, docH);
    tmp.putRegion(s.bx, s.by, s.w, s.h, s.bytes.data);
    this.syncLeafSafe(s.layerId, tmp, docW, docH);
    const rec = this.leaves.get(s.layerId);
    if (rec) rec.src = null;   // tmp 即将 dispose → 快路径身份作废（surrogate 清除后必从真像素重传）
    tmp.dispose();
    this.bridge.purgeDead(this.cpuAlive());
  }

  // v0.7.36 修 import 后串 tile：快路径必须含 isAlive 扫描（generation 不含 LRU 驱逐）。
  recAlive(rec: { byKey: Map<number, number> }): boolean {
    for (const g of rec.byKey.values()) if (!this.pool.isAlive(g)) return false;
    return true;
  }

  cpuAlive(): (id: number) => boolean {
    const alive = new Set<number>();
    appTilePool().forEachLiveId((id: number) => alive.add(id));
    return (id) => alive.has(id);
  }

  // ---- plan 翻译（读 pseudo 装置旗） ----
  toPlanNodes(nodes: DocNode[], updated: Set<number>, overlayLeafIds: ReadonlySet<number>, leafById: Map<number, DocLeaf>): PlanNode[] {
    return nodes.map((n): PlanNode => {
      if (!n.isGroup) {
        leafById.set(n.id, n);
        return {
          kind: "leaf", id: n.id, opacity: n.opacity, mode: safeMode(n.mode), clip: !!n.clippingMask,
          visible: !!n.visible, hasContent: n.pixels.tileCount > 0,
          float: this._floats.has(n.id), overlay: overlayLeafIds.has(n.id) && this._overlays.has(n.id),
        };
      }
      return {
        kind: "group", id: n.id, opacity: n.opacity,
        mode: n.mode === "pass-through" ? "pass-through" : safeMode(n.mode),
        clip: !!n.clippingMask, visible: !!n.visible,
        children: this.toPlanNodes(n.children, updated, overlayLeafIds, leafById),
      };
    });
  }

  // ---- step 合成机（display 帧与一次性合成同一条 pass 序） ----
  // segLookup = RenderTree 的段缓存读口（一次性合成传 null——所有段都在 transient）。
  composeSteps(steps: PlanStep[], acc: Acc, docW: number, docH: number, transient: Map<string, PooledFBO>, segLookup: ((key: string) => IndexTexture | undefined) | null): void {
    const arena = this.arena;
    // clip 蒙版两路（总账 #79）：底是叶 → 该叶 tile-index（或 live 描边中的 merged 整幅）；底是组 → 组体合成段
    //   （transient 整幅 FBO 优先——compositeOnce / 动态组体都在 transient；否则段缓存的 tile-index）。
    //   组体段找不到（规划保证它先于引用者建好；真找不到 = 执行器 bug）→ 当「没有基底」：剪贴层不画，与规划器 clipNoBase 同语义，不画错东西。
    const clipOf = (clipBaseId: number | null, clipKey: string | null): { clipIdx: IndexTexture | null; clipTex: Gl2TexSource | null; missing: boolean } => {
      if (clipKey !== null) {
        const f = transient.get(clipKey);
        if (f) return { clipIdx: null, clipTex: f, missing: false };
        const idx = segLookup?.(clipKey);
        return idx ? { clipIdx: idx, clipTex: null, missing: false } : { clipIdx: null, clipTex: null, missing: true };
      }
      return { clipIdx: clipBaseId !== null ? this.leaves.get(clipBaseId)?.index ?? null : null, clipTex: this.liveClipTexFor(clipBaseId, docW, docH), missing: false };
    };
    for (const step of steps) {
      if (step.t === "leaf") {
        const rec = this.leaves.get(step.id);
        if (!rec) continue;   // sync 降级（超 quota）→ 跳层（自愈后回来）
        const { clipIdx, clipTex, missing } = clipOf(step.clipBaseId, step.clipKey);
        if (missing) continue;
        const ov = step.overlay ? this.overlayDescFor(step.id) : null;
        this.comp.pass(arena, ov ? "overlay" : "tiled", rec.index, null, step.mode as BlendMode, step.opacity, clipIdx, acc, docW, docH, ov, clipTex);
      } else if (step.t === "seg") {
        // transient 优先（v0.4.11）：compositeOnce 把所有段都现算进 transient——若先查段缓存
        //   会命中上帧真内容、绕过替身换源（吸管 WYSIWYG 取不到替身的病根）。renderFrame 路径
        //   transient 只装建段失败的 key，先查它无副作用。
        const f = transient.get(step.key);
        const { clipIdx, clipTex, missing } = clipOf(step.clipBaseId, step.clipKey);
        if (missing) continue;
        if (f) {
          this.comp.pass(arena, "group", null, f, step.mode as BlendMode, step.opacity, clipIdx, acc, docW, docH, null, clipTex);
        } else {
          const segIdx = segLookup?.(step.key);
          if (!segIdx) continue;   // 不可达（缺段必在 transient）；防御性跳过
          this.comp.pass(arena, "tiled", segIdx, null, step.mode as BlendMode, step.opacity, clipIdx, acc, docW, docH, null, clipTex);
        }
      } else if (step.t === "group") {
        const { clipIdx, clipTex, missing } = clipOf(step.clipBaseId, step.clipKey);
        if (missing) continue;
        const sub = this.comp.newAcc(docW, docH);
        this.composeSteps(step.body, sub, docW, docH, transient, segLookup);
        const res = this.comp.finishAcc(sub);
        this.comp.pass(arena, "group", null, res, step.mode as BlendMode, step.opacity, clipIdx, acc, docW, docH, null, clipTex);
        this.glctx.returnFBO(res);
      } else {   // float
        const desc = this._floats.get(step.id);
        if (!desc) continue;
        const base = step.clipBaseFloatId !== null ? this._floats.get(step.clipBaseFloatId) ?? null : null;
        this.comp.floatPass(desc, acc, docW, docH, base);
      }
    }
  }

  // 段的临时合成（不入池）：fresh acc（prefix 段带 bg）→ steps → FBO。
  //   transient / segLookup 透传：段内的剪贴步骤可能以**组体段**为蒙版（#79），要能查到已建好的那段（规划保证组体段先建）。
  composeSegTransient(b: SegBuild, docW: number, docH: number, bg: Parameters<GLCompositor["newAcc"]>[2],
                      transient: Map<string, PooledFBO> = new Map(), segLookup: ((key: string) => IndexTexture | undefined) | null = null): PooledFBO {
    const acc = this.comp.newAcc(docW, docH, b.withBg ? bg : undefined);
    this.composeSteps(b.steps, acc, docW, docH, transient, segLookup);
    return this.comp.finishAcc(acc);
  }

  // v0.4.11：clip 基底正被 live 描边（= 活动 overlay 叶）时，clip-above 的蒙版改采
  //   merged(base⊕stroke) 整幅 alpha——用 commit 同一配方（透明底 + overlay pass source-over/op1）
  //   现算一张、帧内缓存。修「clip 层不实时跟随基底 live 笔迹」（真机 2026-07-22）。
  //   基底非活动叶 / 无描边 → null（走原 tile-index 路径）。
  liveClipTexFor(clipBaseId: number | null, docW: number, docH: number): Gl2TexSource | null {
    if (clipBaseId === null) return null;
    const ovDesc = this.overlayDescFor(clipBaseId);
    if (!ovDesc) return null;
    let cached = this._liveMergedClips.get(clipBaseId);
    if (!cached) {
      const rec = this.leaves.get(clipBaseId);
      if (!rec) return null;
      const acc = this.comp.newAcc(docW, docH);
      this.comp.pass(this.arena, "overlay", rec.index, null, "source-over", 1, null, acc, docW, docH, ovDesc);
      cached = this.comp.finishAcc(acc);
      this._liveMergedClips.set(clipBaseId, cached);
    }
    return cached;
  }

  // 帧末/一次性合成收尾：归还 liveMergedClip 帧内缓存。
  releaseLiveClip(): void {
    for (const f of this._liveMergedClips.values()) this.glctx.returnFBO(f);
    this._liveMergedClips.clear();
  }

  // ---- pseudo 装置（原 RenderTreeGL 迁入，行为不变） ----
  get hasOverlay(): boolean { return this._overlays.size > 0; }
  get overlayLayerId(): number | null { for (const id of this._overlays.keys()) return id; return null; }

  /** 任一 overlay（bakeStamps 单 overlay 场景用）；多 overlay 时 = 第一个。 */
  overlayDesc(): OverlayDesc | null {
    for (const ov of this._overlays.values()) return this._descOf(ov);
    return null;
  }
  /** 某叶的 overlay（合成 leaf pass / clip 基底用）；没有 = null。 */
  overlayDescFor(layerId: number): OverlayDesc | null {
    const ov = this._overlays.get(layerId);
    return ov ? this._descOf(ov) : null;
  }
  private _descOf(ov: OverlayEntry): OverlayDesc {
    return { tex: ov.tex, opacity: ov.opacity, erase: ov.erase, blendMode: safeMode(ov.blendMode), ox: ov.ox, oy: ov.oy, ow: ov.ow, oh: ov.oh, lockAlpha: ov.lockAlpha, selMask: ov.selMask, replace: ov.replace };
  }

  clearOverlay(): void { this._overlays.clear(); }
  // overlay 自有 FBO（stamp 分支借的 straight 转换结果）归还。commit/一次性合成用完即还；
  // renderFrame 帧末还（_overlay 引用下帧重灌）。
  releaseOverlayFBO(): void {
    for (const f of this._overlayOwnedFBOs) this.glctx.returnFBO(f);
    this._overlayOwnedFBOs = [];
  }

  /** 单 overlay 便利口（bakeStamps / 旧调用点）= setStampOverlays([ov])。 */
  setStampOverlay(ov: OverlayInput, docW: number, docH: number): void { this.setStampOverlays([ov], docW, docH); }
  /** 装一帧的全部 overlay（每叶最多一个；空的跳过）。上一帧 stamp 分支借的 FBO 在此归还（与旧单槽「换新时还旧」同序）。 */
  setStampOverlays(list: readonly OverlayInput[], docW: number, docH: number): void {
    this.releaseOverlayFBO();
    this._overlays.clear();
    for (const ov of list) this._addOverlay(ov, docW, docH);
  }
  private _addOverlay(ov: OverlayInput, docW: number, docH: number): void {
    if (overlayEmpty(ov)) return;
    if ("kind" in ov && ov.kind === "region") {
      // 区域程序（2026-09-18）：W（doc 尺寸 straight u8，RegionStroke 持有）直接当 overlay，合成 replace——bbox 内 = W 直值。
      //   不借 FBO（纹理归 RegionStroke，dispose 归它）；opacity/erase/lockAlpha/选区都已在 W 里，这里全关。
      this._overlays.set(ov.layerId, { tex: ov.tex, layerId: ov.layerId, opacity: 1, erase: false, blendMode: "source-over", ox: 0, oy: 0, ow: docW, oh: docH, lockAlpha: false, selMask: null, replace: true });
      return;
    }
    if ("kind" in ov && ov.kind === "fill") {
      // fill：1×1 填色纹理拉伸到选区 bbox。不碰 stamp 光栅器、不借 FBO；shader overlay 分支
      //   bbox 外自透明（uv 越界检查）+ selMask dst-in = 恰为「选区内 source-over 填色」。
      if (!this._fillTex) this._fillTex = this.glctx.createTexture();
      const colorKey = (ov.color[0] << 16) | (ov.color[1] << 8) | ov.color[2];
      if (this._fillTexColor !== colorKey) {
        // straight，alpha=1（裁剪全靠 selMask）
        this.glctx.uploadTexture(this._fillTex, "rgba8", 1, 1, new Uint8Array([ov.color[0], ov.color[1], ov.color[2], 255]));
        this._fillTexColor = colorKey;
      }
      const selMask = this._uploadSelMask(ov.selMask);
      this._overlays.set(ov.layerId, { tex: this._fillTex, layerId: ov.layerId, opacity: 1, erase: false, blendMode: "source-over", ox: ov.bx, oy: ov.by, ow: ov.bw, oh: ov.bh, lockAlpha: ov.lockAlpha, selMask, replace: false });
      return;
    }
    // 整屏 doc FBO + scissor（池每帧同尺寸命中零 malloc)；着色靠 scissor 限回 stamp bbox。
    const fboP = this.rasterizer.rasterize(ov.stamps, ov.shape, 0, 0, docW, docH, { x: ov.bx, y: ov.by, w: ov.bw, h: ov.bh });
    const fboS = this.glctx.borrowFBO(docW, docH, "u8");
    this.comp.presentTo(fboP, fboS, docW, docH, true);   // 栅格器预乘 → straight
    this.glctx.returnFBO(fboP);
    this._overlayOwnedFBOs.push(fboS);
    const selMask = ov.selMask ? this._uploadSelMask(ov.selMask) : null;
    this._overlays.set(ov.layerId, { tex: fboS, layerId: ov.layerId, opacity: ov.opacity, erase: ov.erase, blendMode: ov.blendMode, ox: 0, oy: 0, ow: docW, oh: docH, lockAlpha: ov.lockAlpha, selMask, replace: false });
  }

  // 选区 mask 上传（stamp/fill 两分支共用）：单张复用纹理，buffer 身份即内容（Selection 不可变）。
  //   ⚠ 若 mask buffer 未来被池化复用，这个身份缓存就是地雷（同 identity 不同内容）——届时换显式版本号。
  private _uploadSelMask(sm: { data: Uint8Array; ox: number; oy: number; ow: number; oh: number }): { tex: Gl2Texture; ox: number; oy: number; ow: number; oh: number } {
    if (!this._selTex) this._selTex = this.glctx.createTexture();
    if (this._selTexSrc !== sm.data) {   // Selection 不可变 → buffer 身份即内容
      this.glctx.uploadTexture(this._selTex, "r8", sm.ow, sm.oh, sm.data);
      this._selTexSrc = sm.data;
    }
    return { tex: this._selTex, ox: sm.ox, oy: sm.oy, ow: sm.ow, oh: sm.oh };
  }

  get floats(): ReadonlyMap<number, FloatDesc> { return this._floats; }

  setFloats(floats: FloatInput[]): void {
    this._floats.clear();
    const seen = new Set<number>();
    for (const f of floats) {
      if (f.srcW <= 0 || f.srcH <= 0) continue;
      seen.add(f.layerId);
      let entry = this._floatTex.get(f.layerId);
      if (!entry) {
        entry = { tex: this.glctx.createTexture(), contentKey: null };
        this._floatTex.set(f.layerId, entry);
      }
      // 内容 key = 平面身份（模式切换 spline↔u8 时 key 变 → 自动重传）。全 typed array 上传：
      // 字节 verbatim 上卡——canvas 源上传在 Safari 上的 premult 转换不可靠（柔边变黑），
      // v0.6.38 起禁入浮层管线。
      const contentKey = (f.mode === 3 && f.splinePlane) ? f.splinePlane.data : f.u8Plane?.data;
      if (!contentKey) continue;
      if (entry.contentKey !== contentKey) {   // 源内容变（首次/换浮层/换采样族）才重传
        if (f.mode === 3 && f.splinePlane) {
          const p = f.splinePlane;
          this.glctx.uploadTexture(entry.tex, "rgba16f", p.w + 16, p.h + 16, p.data);
        } else {
          const p = f.u8Plane!;
          this.glctx.uploadTexture(entry.tex, "rgba8", p.w, p.h, p.data);
        }
        entry.contentKey = contentKey;
      }
      this._floats.set(f.layerId, { tex: entry.tex, srcW: f.srcW, srcH: f.srcH, hinv: f.hinv, mode: f.mode });
    }
    for (const [id, e] of this._floatTex) if (!seen.has(id)) { this.glctx.deleteTexture(e.tex); this._floatTex.delete(id); }
  }
}

// 按显存预算（字节）算 gpu tile 池深度上限（惰性增长的顶）。
export function poolCapacityForBudget(budgetBytes: number): number {
  return Math.max(64, Math.floor(budgetBytes / GPU_TILE_BYTES));
}
