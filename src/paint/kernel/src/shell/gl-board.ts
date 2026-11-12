// GLBoard —— board.ts 的 GL 渲染接缝（薄壳）。T6 起内部 = GlRoom（机房五件套 + 共享台面）上的
// 双 facade：RenderTree（tree composite：脏跟踪/段缓存/display 快路径）+ RasterService（一次性
// 算像素：烤定/导出/吸管/warp）。板级契约不变：markContentDirty = 内容/结构变了；pan/zoom 帧
// 自动走「只 present」快路径；context-loss 自愈。
// C1：context 创建翻壳——壳（board.ts）造好 BrowserGl2Port 递入，本类只见 Gl2Port 契约。

import type { BakeReport } from "../backend/gl/bake-cells.ts";
import type { Gl2Port, PooledFBO } from "../common/gl2-port.ts";
import { GlRoom } from "../backend/gl/gl-room.ts";
import { RenderTree } from "../backend/gl/render-tree.ts";
import { RasterService } from "../backend/gl/raster-service.ts";
import { RegionStroke, type SelMaskPlane } from "../backend/gl/region-stroke.ts";
import { warmRegionProgram, REGION_PROGRAM_IDS } from "../backend/gl/region-programs.ts";
import type { FloatInput, OverlayInput, SurrogateInput } from "../backend/gl/gl-room.ts";
import type { LayerPixels } from "../backend/tiles/tile-layer.ts";
import type { DocNode, DocLeaf } from "../backend/gl/gl-doc-bridge.ts";
import type { Background, ScreenGridBg } from "../backend/gl/gl-compositor.ts";

export interface GLDoc { layers: DocNode[]; width: number; height: number; }
// board live-sync 接缝用的叶类型别名（结构上 = DocLeaf，board 传活动 Layer 进来）。
export type { DocLeaf as GLLeaf } from "../backend/gl/gl-doc-bridge.ts";

// "#rrggbb" → [r,g,b] in [0,1]（void 底色 clear 用）。失败回退浅灰。
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return [0.9, 0.886, 0.839];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

export class GLBoard {
  private _glctx: Gl2Port;
  private _room: GlRoom;
  private _tree: RenderTree;
  private _raster: RasterService;

  constructor(glctx: Gl2Port, maxSlices: number) {
    this._glctx = glctx;
    this._room = new GlRoom(this._glctx, maxSlices);
    this._tree = new RenderTree(this._room);
    this._raster = new RasterService(this._room);
    // context-loss（Port onInvalidated 广播：结构已重建/generation 已 ++）：底层纹理/FBO 全没了
    //   → 机房+执行器全量作废，下帧从 CPU SSoT 重建（CPU 恒驻留）。
    this._glctx.onInvalidated(() => { if (!this._disposed) this._tree.handleContextRestored(); });
  }

  // ---- 退租（CatsUp 0-3a，2026-11-11）：原来只有建、没有拆，因为画画软件一辈子只有一块画板；宿主有很多块、会扔，建和拆要成对。----
  //   拆 = 合成树还掉借的离屏图、删段缓存 → 机房退租（GlRoom.dispose：叶的索引纹理 / 选区 / 填充 / 浮层纹理 / arena / live clip / overlay FBO）。
  //   离屏图还进 Port 的池（池归 Port、跨租户共享，不清；宿主扔光了自己清）。调两次没事；拆了之后再用 = 抛。画画软件自己不调。
  private _disposed = false;
  get disposed(): boolean { return this._disposed; }
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._tree.dispose();
    this._room.dispose();
  }
  private _live(): void { if (this._disposed) throw new Error("GLBoard: disposed (a disposed board cannot be used again)"); }

  get memory() { return this._room.memory; }
  get stats(): { passes: number; floatPasses: number } { return this._room.stats; }
  get fboPoolStats(): { count: number; bytes: number } { return this._room.fboPoolStats; }
  get frameStats() { return this._tree.frameStats; }
  // 驻留降级累计（v0.10.8）：syncLeafSafe 吞掉的 GPU_POOL_EXHAUSTED 次数（board 盯涨出声）。
  get syncDrops(): number { return this._room.syncStats.drops; }
  markContentDirty(): void { this._live(); this._tree.markDirty(); }

  // S8 brush commit：merge(base⊕stroke) 在 GPU（live 同一 shader）→ tile-diff 落盘 → GPU 收养。
  //   apply = CPU 落盘回调（Layer.applyRegionDiff）。false = GPU 无法保证完整（调用方按未提交处理）。
  commitBrushStroke(
    leafId: number, pixels: LayerPixels, ov: OverlayInput, docW: number, docH: number,
    apply: (px: Uint8ClampedArray, x: number, y: number, w: number, h: number) => { tx: number; ty: number }[],
  ): boolean {
    this._live();
    if (this._glctx.isLost) return false;
    return this._raster.bakeStamps(leafId, pixels, ov, docW, docH, apply);
  }
  /** 最近一次 commitBrushStroke 怎么读回的（CatsUp 1-4d 第 8 条）：box / cells / box-unreported + 读了几次、多少字节、报了几格、漏了几格。宿主看 path 自己记日志（内核不认识宿主的日志）。没落成 = null。 */
  get lastBake(): BakeReport | null { return this._raster.lastBake; }

  // 2026-09-19 暖场（手指首笔卡顿案，user「都做」+「启动速度是更重要的」+「预借再还 不会在小内存机器上惹麻烦可以试」）：
  //   ① 全部区域程序（REGION_PROGRAM_IDS，19 个）非阻塞预编译（warmProgram + KHR_parallel_shader_compile 轮询收尾），**分片**：每个空闲片起两个，
  //      不一次全起、不塞进忙碌期（schedule = board 的 requestIdleCallback，无强制 timeout）；
  //   ② 预借一张 doc 尺寸 u8 FBO 再还回池，让首笔的 W 命中池而不是当场 createTexture——**守卫**：池里已有同尺寸空闲件 = 空操作跳过；
  //      池预算装不下 = 跳过（退化为首笔当场分配，不出错）。幂等（program 已注册 = Map 查一次）。
  warmUp(docW: number, docH: number, schedule: (fn: () => void) => void): void {
    this._live();
    const port = this._glctx;
    if (port.isLost) return;
    const ids = [...REGION_PROGRAM_IDS];
    const step = () => {
      if (port.isLost || this._disposed) return;   // 排着的预热片在退租之后到点 = 不做
      for (let i = 0; i < 2 && ids.length; i++) warmRegionProgram(port, ids.shift()!);
      if (ids.length) schedule(step);
      else schedule(() => this._preborrowDocFBO(docW, docH));   // program 都起完再预借（顺序无关，只是别挤在一个片里）
    };
    schedule(step);
  }
  private _preborrowDocFBO(docW: number, docH: number): void {
    const port = this._glctx;
    if (port.isLost || this._disposed || docW <= 0 || docH <= 0) return;
    if (!port.fboPoolHas || port.fboPoolBudgetBytes == null) return;          // 实现体没观测口 = 不做（软域/未来 port）
    if (port.fboPoolHas(docW, docH, "u8")) return;                             // 已有同尺寸空闲件：预借是空操作
    const need = docW * docH * 4;
    if (port.fboPoolStats.bytes + need > port.fboPoolBudgetBytes) return;     // 预算装不下：跳过
    const f = port.borrowFBO(docW, docH, "u8");
    port.returnFBO(f);
  }

  // 2026-09-18 区域程序：造一笔的 GPU 驻留写靶（RegionStroke）。caps 守卫 / 显存不够在构造里响亮 throw；
  //   错误信息附 caps 快照（黑匣子可查「哪台设备没浮点 FBO」，doc §3.7）。
  openRegion(leafId: number, pixels: LayerPixels, docW: number, docH: number, selMask: SelMaskPlane | null, lockAlpha: boolean, snapshot = false): RegionStroke {
    this._live();
    if (this._glctx.isLost) throw new Error("REGION_GL_LOST (context lost; try again)");
    try { return new RegionStroke(this._room, leafId, pixels, docW, docH, selMask, { lockAlpha, snapshot }); }
    catch (e) { throw new Error(`${String((e as { message?: unknown })?.message ?? e)} caps=${JSON.stringify(this._glctx.caps)}`); }
  }

  // v0.7.25 选区笔：stamps → bbox RGBA 字节（纯光栅，不进树）。GL lost → null（调用方走 CPU disc 回退）。
  rasterizeStampsToBytes(
    stamps: Parameters<RasterService["rasterizeStampsToBytes"]>[0],
    shape: Parameters<RasterService["rasterizeStampsToBytes"]>[1],
    bx: number, by: number, bw: number, bh: number,
  ): Uint8ClampedArray | null {
    this._live();
    if (this._glctx.isLost) return null;
    return this._raster.rasterizeStampsToBytes(stamps, shape, bx, by, bw, bh);
  }

  // 字节合成面（v0.6.39）：merge-down/collapse/导出等字节 op 用；GL lost → null。
  //   （C1：canvas 包装面 compositeToCanvas 撤出 src/gl——屏显域 canvas 归壳，board.ts 自包字节。）
  //   surrogate/overlay（v0.9.18 timelapse 采帧 WYSIWYG，同 pickColor 待遇）：save/export 不传，语义不变。
  compositeToBytes(nodes: DocNode[], docW: number, docH: number,
                   surrogates: readonly SurrogateInput[] = [], overlays: readonly OverlayInput[] = []): { data: Uint8ClampedArray; w: number; h: number } | null {
    this._live();
    if (this._glctx.isLost) return null;
    return this._raster.compositeToBytes(nodes, docW, docH, surrogates, overlays);
  }

  // S8 吸管：一次性合成（compositeOnce，不建缓存）+ 1px readback。bg 语义同 render 的 docBg。
  pickColor(doc: GLDoc, docBg: string | null, x: number, y: number, surrogates: readonly SurrogateInput[] = [], overlays: readonly OverlayInput[] = []): [number, number, number, number] | null {
    this._live();
    if (this._glctx.isLost) return null;
    const bg: Background | undefined = docBg === "checker" ? "checker"
      : docBg ? [...hexToRgb(docBg), 1] as [number, number, number, number] : undefined;
    return this._raster.pickColor(doc.layers, doc.width, doc.height, bg, x, y, surrogates, overlays);
  }

  // 给自由变换 commit 用：warp 源 → straight RGBA **字节**（_bakeDown typed-array source-over 落层，
  //   复用 live warp；v0.6.38 去 canvas 化）。
  warpToBytes(src: Parameters<RasterService["warpToBytes"]>[0], srcW: number, srcH: number, hinv: number[], mode: number, bx: number, by: number, bw: number, bh: number) {
    this._live();
    return this._raster.warpToBytes(src, srcW, srcH, hinv, mode, bx, by, bw, bh);
  }

  /**
   * 只合成、不上屏（2026-11-10 贴图主线 0-5）：参数和 render 一样，去掉屏幕那几个；返回合成好的整幅图（预乘、和画布一样大、第 0 行 = 画布第 0 行）。
   * 那张图归内核：下一次合成（render / composite）之前有效，宿主不许归还、不许改它的采样设置。docBg 可以是 "#rrggbb"、"checker"、null，
   * 或者直接给一个不透明的颜色 [r, g, b, a]（0..1）当底——三维放材质自己的底色，交出去的图就是不透明的。GL 丢了 = null。
   */
  composite(doc: GLDoc, docBg: string | readonly [number, number, number, number] | null, floats: FloatInput[] = [], stampOverlays: readonly OverlayInput[] = [], liveSyncLeaf: DocLeaf | null = null, surrogates: readonly SurrogateInput[] = []): PooledFBO | null {
    this._live();
    if (this._glctx.isLost) return null;
    const bg: Background | undefined = Array.isArray(docBg) ? [docBg[0], docBg[1], docBg[2], docBg[3]] as [number, number, number, number]
      : docBg === "checker" ? "checker" : typeof docBg === "string" && docBg ? [...hexToRgb(docBg), 1] as [number, number, number, number] : undefined;
    return this._tree.compositeFrame(doc.layers, doc.width, doc.height, bg, floats, stampOverlays, surrogates, liveSyncLeaf ? liveSyncLeaf.id : null);
  }

  // 渲染一帧。affine6 = board _applyDocTransform 的 device-px 6 参；canvasW/H = device px。
  // liveSyncLeaf 只取 id（标 updated，像素变更由 contentVersion 快路径自己发现）。
  // gridBg 非空 = 透明显示模式（docBg 应为 null）：present 时整屏「主题底(voidColor)+点网格」，doc 真透明叠上。
  render(doc: GLDoc, affine6: number[], canvasW: number, canvasH: number, scale: number, voidColor: string, docBg: string | null, floats: FloatInput[] = [], stampOverlays: readonly OverlayInput[] = [], liveSyncLeaf: DocLeaf | null = null, surrogates: readonly SurrogateInput[] = [], gridBg: { dotColor: string; stepPx: number; radiusPx: number } | null = null): void {
    this._live();
    if (this._glctx.isLost) return;
    const bg: Background | undefined = docBg === "checker" ? "checker"
      : docBg ? [...hexToRgb(docBg), 1] as [number, number, number, number] : undefined;
    const screenGrid: ScreenGridBg | null = gridBg
      ? { bg: hexToRgb(voidColor), dot: hexToRgb(gridBg.dotColor), stepPx: gridBg.stepPx, radiusPx: gridBg.radiusPx }
      : null;
    this._tree.renderFrame(
      doc.layers, doc.width, doc.height, bg,
      affine6, canvasW, canvasH, scale, hexToRgb(voidColor),
      floats, stampOverlays, surrogates, liveSyncLeaf ? liveSyncLeaf.id : null, screenGrid,
    );
  }
}
