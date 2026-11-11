// paint/space-prep.ts —— 画画的准备（贴图主线 1-4c，统筹 11-11 裁定）：每项目标的整份几何（space-target.ts TargetGeo）+ 每格的表（显卡上，space-layer.ts cellTable），
// 进画画工作台时建好、缓存着，落笔只取现成的。created 2026-11-11 by Claude Opus 5.5
// · 为什么：两样都随整个模型 / 整张画布涨（6144 张面：几何 211 毫秒 + 每格的表 57 毫秒再加上传；24576 张面：437 + 73 毫秒），以前每落一笔现建一次 = 卡在落笔那一下。
// · 认什么（键）：网格体是哪一个（对象身份）+ 它的修改号（任何改动都换一个从没用过的新值；撤销换回来的旧号 = 那份旧内容）+ 摆放 + 那一套贴图坐标 + 画布宽高 + 间隔。
//   「走不走画」（材质那一层的问法）不进键：几何不靠它，取的时候换成这次传进来的那份目标。
// · 过期：键对不上 = 过期，过期的从不拿来画（problem / take 每次都按现在的键比）。在画画工作台里撤销到建模的那几步 → 修改号变了 → 过期 →
//   工作台下一帧就重建（ensure）；重建之前落笔 = 这一笔不开始、提示行说一句（PrepPendingError，和「这张画还在打开」同一个口）。
// · 放：离开画画工作台 → release()；换文件（文档号变了，和画板登记处同一个信号）→ checkEpoch() 自己放（宿主每帧开画前调一次）；ensure 只留这次给的目标，别的放掉（同一时间只有正在画的那个物件的表占着显卡）。
// · 建不了（撞到容量上限）：记下那个错，键不变就不再重建；落笔时把它交出去（PaintLimitError 带人话）。
import { buildTargetGeo, type PaintTarget, type TargetGeo } from "./space-target.ts";
import { checkLayerLimits, uploadCellTable } from "./space-layer.ts";
import type { SpaceData, SpaceGpu } from "./space-gpu.ts";

/** 落笔时准备还没好（还没建 / 刚改过模型、还没重建完）：这一笔不开始，提示行说 say。 */
export class PrepPendingError extends Error {
  readonly say = "画布的表还在准备（刚才改了模型），等一下再画";
  constructor() { super("SpacePrep: not prepared for these targets yet"); this.name = "PrepPendingError"; }
}

interface Entry {
  readonly key: string;
  readonly gpu: SpaceGpu;
  readonly geo: TargetGeo | null;
  readonly cells: SpaceData | null;
  readonly error: unknown;
  /** 建这一项花了多少毫秒（几何 / 每格的表含上传）。 */
  readonly geoMs: number;
  readonly cellMs: number;
}

const meshIds = new WeakMap<object, number>();
let nextMeshId = 1;
const meshId = (m: object): number => { let id = meshIds.get(m); if (id === undefined) { id = nextMeshId++; meshIds.set(m, id); } return id; };

export class SpacePrep {
  private readonly gpu: () => SpaceGpu | null;
  private readonly entries = new Map<string, Entry>();
  /** 一共建过几项（测试 / 探针看缓存有没有被用上）。 */
  builds = 0;

  private readonly epoch: () => number;
  private epochSeen: number;

  /** epoch = 现在的文档号（换文件就变；不给 = 永远是 0）。 */
  constructor(gpu: () => SpaceGpu | null, epoch: () => number = () => 0) { this.gpu = gpu; this.epoch = epoch; this.epochSeen = epoch(); }

  /** 文档号变了（换了文件）= 全部放掉。宿主每帧开画前调一次；problem / ensure / take 也先调。 */
  checkEpoch(): void { const ep = this.epoch(); if (ep !== this.epochSeen) { this.epochSeen = ep; this.release(); } }

  /** 一项目标的键（见文件头）。 */
  static keyOf(t: PaintTarget): string {
    return `${meshId(t.mesh)}@${t.mesh.rev}|${t.uvSet}|${t.canvas.width}x${t.canvas.height}|${t.gap ?? 4}|${Array.prototype.join.call(t.xform, ",")}`;
  }

  /** 落笔前问：null = 都现成、能直接用；"pending" = 有的还没建 / 过期了（要 ensure）；别的 = 建过、建不了的那个错（PaintLimitError 带人话）。 */
  problem(targets: readonly PaintTarget[]): null | "pending" | unknown {
    this.checkEpoch();
    const gpu = this.gpu();
    for (const t of targets) {
      const e = this.entries.get(t.id);
      if (!e || e.key !== SpacePrep.keyOf(t) || e.gpu !== gpu) return "pending";
      if (e.error !== null) return e.error;
    }
    return null;
  }

  /** 建缺的、过期的（同步）；只留这次给的这些目标，别的放掉。建不了的记下错、不抛。没有显卡 = 什么都不建。返回这次花了多少毫秒。 */
  ensure(targets: readonly PaintTarget[]): number {
    this.checkEpoch();
    const t0 = performance.now(), gpu = this.gpu(), keep = new Set(targets.map((t) => t.id));
    for (const id of [...this.entries.keys()]) if (!keep.has(id)) this.drop(id);
    if (!gpu) return 0;
    for (const t of targets) {
      const key = SpacePrep.keyOf(t), e = this.entries.get(t.id);
      if (e && e.key === key && e.gpu === gpu) continue;
      this.drop(t.id);
      const a = performance.now();
      let geo: TargetGeo | null = null, cells: SpaceData | null = null, error: unknown = null, b = a;
      try { geo = buildTargetGeo(t); checkLayerLimits(gpu, geo.table); b = performance.now(); cells = uploadCellTable(gpu, geo.table); } catch (err) { error = err; if (cells) gpu.release(cells); cells = null; }
      const c = performance.now();
      this.entries.set(t.id, { key, gpu, geo: error === null ? geo : null, cells, error, geoMs: b - a, cellMs: c - b });
      this.builds++;
    }
    return performance.now() - t0;
  }

  /** 现成的那一份：整份几何（目标换成这次传进来的那份）+ 每格的表（借给这一笔，不许放）。不现成 = 抛（先问 problem）。 */
  take(t: PaintTarget): { readonly geo: TargetGeo; readonly cells: SpaceData } {
    this.checkEpoch();
    const e = this.entries.get(t.id);
    if (!e || e.key !== SpacePrep.keyOf(t) || e.gpu !== this.gpu()) throw new PrepPendingError();
    if (e.error !== null) throw e.error;
    return { geo: { ...e.geo!, target: t }, cells: e.cells! };
  }

  /** 全部放掉（离开画画工作台、换文件）。 */
  release(): void { for (const id of [...this.entries.keys()]) this.drop(id); }

  /** 现在占着的：几项、显卡上每格的表多少字节、上一次各项建了多少毫秒（探针 / 记录）。 */
  stats(): { readonly entries: number; readonly gpuBytes: number; readonly builds: number; readonly items: readonly { readonly id: string; readonly geoMs: number; readonly cellMs: number; readonly ok: boolean }[] } {
    let gpuBytes = 0;
    const items: { id: string; geoMs: number; cellMs: number; ok: boolean }[] = [];
    for (const [id, e] of this.entries) { if (e.cells) gpuBytes += e.cells.w * e.cells.h * 8; items.push({ id, geoMs: e.geoMs, cellMs: e.cellMs, ok: e.error === null }); }
    return { entries: this.entries.size, gpuBytes, builds: this.builds, items };
  }

  private drop(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    if (e.cells) e.gpu.release(e.cells);
    this.entries.delete(id);
  }
}
