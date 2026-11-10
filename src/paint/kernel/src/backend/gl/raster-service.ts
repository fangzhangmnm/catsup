// RasterService —— 一次性算像素的 GL facade（T6 拆自 RenderTreeGL；C 骑士 headless 的接缝）。
// 与 RenderTree 共享同一 GlRoom：bakeStamps 搭 render 帧的 base-tile 便车（叶驻留台账命中 =
// 零上传），吸管/导出合成读同一份 pseudo 装置（surrogate/overlay WYSIWYG）。
// 本类零缓存、零帧状态——每个方法自开自收（FBO 即借即还，overlay 用完即清）。

import { TILE_SIZE, tilesAcross } from "../../common/tile-geometry.ts";
import type { Background } from "./gl-compositor.ts";
import type { DocNode, DocLeaf } from "./gl-doc-bridge.ts";
import type { LayerPixels } from "../tiles/tile-layer.ts";
import type { Stamp, StrokeShape } from "./gl-stamp.ts";
import { buildPlan } from "./render-plan.ts";
import { residentMissTiles, residentIds } from "./frame-demand.ts";
import type { PooledFBO } from "../../common/gl2-port.ts";
import type { GlRoom, OverlayInput, SurrogateInput } from "./gl-room.ts";
import { overlayEmpty } from "./gl-room.ts";

export class RasterService {
  private _room: GlRoom;

  constructor(room: GlRoom) { this._room = room; }

  // v0.7.25 选区笔：一笔 stamps → bbox 预乘 RGBA 字节（α=覆盖度；调用方阈值化成二值选区）。
  //   不进树、不碰 tile/overlay 状态、不 merge base——只借光栅器 + 一次 readPixels，FBO 即借即还。
  //   行序 = doc 行序（栅格器约定「doc-y 1:1 不翻」，同 bake 的 readPixels）。
  rasterizeStampsToBytes(
    stamps: Stamp[], shape: StrokeShape,
    bx: number, by: number, bw: number, bh: number,
  ): Uint8ClampedArray | null {
    if (!stamps.length || bw <= 0 || bh <= 0) return null;
    const room = this._room;
    const fbo = room.rasterizer.rasterize(stamps, shape, bx, by, bw, bh, null);
    const px = room.glctx.readPixels(fbo, 0, 0, bw, bh);
    room.glctx.returnFBO(fbo);
    return new Uint8ClampedArray(px.buffer);
  }

  // ---- S8 笔迹烤定（原 commitBrushStroke，spec:199-205）：merge(base tiles ⊕ stroke) 复用 live
  //   同一 overlay shader（SSOT：mode=source-over、opacity=1、透明底 → 输出恰为合成好的新图层数据）
  //   → bbox 一次 readPixels → apply 回调（Layer.applyRegionDiff，只封真变 tile）→ 变更 tile 从
  //   merged FBO 直拷入池 + registerPair + 叶记录就地更新 —— activeLayer 的 GPU 驻留不再依赖
  //   「render-tree 会 pin updatedNodes」的隐式契约（spec:205），下一帧 sync 走快路径零上传。
  //   返回 false = GPU 侧无法保证 base 完整（池超 quota 等）→ 调用方按未提交处理（不落半拉笔）。
  bakeStamps(
    leafId: number, pixels: LayerPixels, ov: OverlayInput, docW: number, docH: number,
    apply: (px: Uint8ClampedArray, x: number, y: number, w: number, h: number) => { tx: number; ty: number }[],
  ): boolean {
    if (overlayEmpty(ov)) return false;
    const room = this._room;
    // ready：base tiles 搭 render-tree 便车（身份命中零上传）。cpuVersion 不齐 = sync 降级（超 quota）→ 放弃。
    room.syncLeafSafe(leafId, pixels, docW, docH);
    const rec = room.leaves.get(leafId);
    if (!rec || rec.src !== pixels || rec.cpuVersion !== pixels.contentVersion || rec.gen !== room.pool.generation) return false;
    // 先备 overlay 再 begin（setStampOverlay 内部的 rasterize/present 会解绑 VAO——与 renderFrame 同序）。
    room.setStampOverlay(ov, docW, docH);
    const ovDesc = room.overlayDesc();
    if (!ovDesc) return false;
    room.comp.begin(docW, docH, false);
    const acc = room.comp.newAcc(docW, docH);   // 透明底：source-over/op=1 输出 = merged 层内容
    room.comp.pass(room.arena, "overlay", rec.index, null, "source-over", 1, null, acc, docW, docH, ovDesc);
    const merged = room.comp.finishAcc(acc);
    room.releaseOverlayFBO();
    room.clearOverlay();
    // bbox 一次 readPixels（merged FBO texel 行 0 = doc 行 0，无翻转——与栅格器/present 同约定）。
    const px = room.glctx.readPixels(merged, ov.bx, ov.by, ov.bw, ov.bh);
    const changed = apply(new Uint8ClampedArray(px.buffer), ov.bx, ov.by, ov.bw, ov.bh);
    if (changed.length) {
      const across = tilesAcross(docW);
      const withHandle = changed.map(({ tx, ty }) => ({ tx, ty, h: pixels.getTileHandle(tx, ty) }));
      const toCopy = withHandle.filter((c) => c.h);   // 擦空回收的格不拷（byKey 直接删）
      try {
        const gpuIds = room.pool.copyBatchFrom(merged, toCopy.map(({ tx, ty }) => {
          const x = tx * TILE_SIZE, y = ty * TILE_SIZE;
          return { srcX: x, srcY: y, w: Math.min(TILE_SIZE, docW - x), h: Math.min(TILE_SIZE, docH - y) };
        }));
        toCopy.forEach((c, i) => {
          room.bridge.registerPair(c.h!.id, gpuIds[i]);
          rec.byKey.set(c.ty * across + c.tx, gpuIds[i]);
        });
        for (const c of withHandle) if (!c.h) rec.byKey.delete(c.ty * across + c.tx);
        rec.index.rebuild(rec.byKey, room.pool);
        rec.cpuVersion = pixels.contentVersion;
        rec.gen = room.pool.generation;
      } catch (e) {
        // 收养失败（池到顶）：不更新 rec 记账 → 下一帧 sync 走 bridge 慢路径重传，正确性无损。
        if (!(e instanceof Error) || !e.message.startsWith("GPU_POOL_EXHAUSTED")) {
          room.glctx.returnFBO(merged); room.comp.end();
          throw e;
        }
      }
    }
    room.glctx.returnFBO(merged);
    room.comp.end();
    room.invalidateTree();   // 落了新像素 → RenderTree 重算树（spec:134）
    return true;
  }

  warpToBytes(src: { data: Float32Array; w: number; h: number } | { data: Uint8ClampedArray; w: number; h: number }, srcW: number, srcH: number, hinv: number[], mode: number, bx: number, by: number, bw: number, bh: number) {
    return this._room.comp.warpToBytes(src, srcW, srcH, hinv, mode, bx, by, bw, bh);
  }

  // export/吸管专用一次性合成（spec:157）：不建缓存、不失效、不碰 display。caller 负责 returnFBO。
  //   surrogates（v0.4.11，拍板#8）：调整预览的替身叶换源——吸管 WYSIWYG（导出路径不传，仍取真像素）。
  //     复数（2026-08-28 组液化）：一次可挂 N 个 stroke 影子叶。
  //   overlay（v0.5.11）：fill 预览挂着时吸管也要 WYSIWYG——同款待遇；导出路径不传，预览不漏进导出。
  compositeOnce(nodes: DocNode[], docW: number, docH: number, bg?: Background, surrogates: readonly SurrogateInput[] = [], overlays: readonly OverlayInput[] = []): PooledFBO {
    const room = this._room;
    room.setStampOverlays(overlays, docW, docH);   // 须在 toPlanNodes 前（plan 的 overlay 标记读 room 装置）
    const leafById = new Map<number, DocLeaf>();
    const planNodes = room.toPlanNodes(nodes, new Set(), new Set(overlays.map((o) => o.layerId)), leafById);
    const plan = buildPlan(planNodes, new Set(), bg === "checker" ? "checker" : bg ? "color" : "none");
    // 驻留准入（v0.10.8，与 renderFrame 同口径，病史见 frame-demand.ts）：一次性合成全走
    //   transient（零拷贝目标），需求 = miss 上传数。旧版**完全没有 reserve**——冷池（64 slot）
    //   上保存/导出会走同一条连环驱逐路，mergedimage/导出图静默缺层。
    //   reserve 被拒（超 quota）也没关系：下面逐段就地驻留，成员 sync 紧贴该段合成。
    const builds = [...plan.builds.values()];
    room.pool.reserve(room.pool.allocatedCount
      + residentMissTiles(residentIds(plan.liveLeaves, builds), (id) => leafById.get(id)?.pixels, (cpuId) => room.bridge.hasLive(cpuId)));
    const surrogateById = new Map<number, SurrogateInput>();
    for (const s of surrogates) surrogateById.set(s.layerId, s);
    const surrogateSynced = new Set<number>();   // 同叶重复 sync：真叶走身份快路径免费；平面替身重传不免费，闸一次
    const syncOne = (id: number) => {
      const sur = surrogateById.get(id);
      if (sur) {
        if (surrogateSynced.has(id)) return;
        surrogateSynced.add(id);
        // 影子变体（C6 stroke 替身叶）增量 sync；平面变体（adjust）全 bbox 重传。
        if ("pixels" in sur) room.syncLeafSafe(id, sur.pixels, docW, docH);
        else room.syncSurrogate(sur, docW, docH);
        return;
      }
      const leaf = leafById.get(id); if (leaf) room.syncLeafSafe(id, leaf.pixels, docW, docH);
    };
    for (const id of plan.liveLeaves) syncOne(id);
    room.comp.begin(docW, docH);
    const transient = new Map<string, PooledFBO>();
    for (const b of builds) {   // 插入序 = 依赖序（组体 clip 基底段先于引用它的段，#79）
      for (const id of b.members) syncOne(id);
      transient.set(b.key, room.composeSegTransient(b, docW, docH, bg, transient, null));
    }
    const acc = room.comp.newAcc(docW, docH, plan.rootBgLive ? bg : undefined);
    room.composeSteps(plan.rootSteps, acc, docW, docH, transient, null);
    const out = room.comp.finishAcc(acc);
    for (const f of transient.values()) room.glctx.returnFBO(f);
    room.releaseLiveClip();   // 防御：一次性合成不留帧内缓存
    room.comp.end();
    if (overlays.length) {   // 一次性合成不留 overlay 状态（下一 renderFrame 会重灌；stamp 分支还占着借来的 FBO）
      room.clearOverlay();
      room.releaseOverlayFBO();
    }
    return out;
  }

  // S9 字节合成面（v0.6.39 去 canvas 化）：compositeOnce → 整幅 readPixels 直接返回 straight 字节
  //   （merge-down / collapse / stamp-all 等「字节进出」op 用——硬原则：字节进出不走 canvas）。
  //   surrogates/overlay（v0.9.18 timelapse 采帧 WYSIWYG）：与 pickColor 同款待遇——调整替身/fill 预览
  //   显示什么就合成什么。**save/export 路径不传**（预览不漏进落盘物，原语义零变化）。
  compositeToBytes(nodes: DocNode[], docW: number, docH: number,
                   surrogates: readonly SurrogateInput[] = [], overlays: readonly OverlayInput[] = []): { data: Uint8ClampedArray; w: number; h: number } {
    const fbo = this.compositeOnce(nodes, docW, docH, undefined, surrogates, overlays);
    const px = this._room.glctx.readPixels(fbo, 0, 0, docW, docH);
    this._room.glctx.returnFBO(fbo);
    return { data: new Uint8ClampedArray(px.buffer), w: docW, h: docH };
  }

  // S8 吸管（spec:243-244）：一次性合成 + 单像素 readPixels（合成组无 CPU tile → 必须走 GPU 读）。
  //   surrogates 非空 = 调整预览中取替身（WYSIWYG，拍板#8）。
  pickColor(nodes: DocNode[], docW: number, docH: number, bg: Background | undefined, x: number, y: number, surrogates: readonly SurrogateInput[] = [], overlays: readonly OverlayInput[] = []): [number, number, number, number] {
    const fbo = this.compositeOnce(nodes, docW, docH, bg, surrogates, overlays);
    const px = this._room.glctx.readPixels(fbo, x, y, 1, 1);
    this._room.glctx.returnFBO(fbo);
    return [px[0], px[1], px[2], px[3]];
  }
}
