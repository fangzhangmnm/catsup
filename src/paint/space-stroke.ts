// paint/space-stroke.ts —— 空间里的一笔，计算的那一半，串起来的小控制器（贴图主线 1-4a 第五节，施工单 ai-docs/20261110-paint-workorders-9.md）。created 2026-11-11 by Claude Opus 5.5
// 拿着：目标的名单、相机给的两个函数（屏幕一点 → 射线、落点那里一个屏幕像素多大）+ 可选的「名单之外的东西挡着吗」、内核的「一笔的手感」（0-6 StrokeCore）、笔的设置。
// 对外只有：按下、移动、抬起、取消，和「现在的笔尖列表、每颗笔尖碰到哪些三角形」。不碰图层、不碰显卡、不知道撤销（1-4b 在它后面接上薄层和档口）。
// · 这一笔开始时把相机给的函数记下来，一笔之内不变（操作期间锁视角是界面那一张的事）。
// · 笔的大小：第一次打中的那一刻，屏幕上的直径 × 落点那里一个屏幕像素在空间里的大小 = 空间里的直径，定死。
// · 路的单位：名单里最密的那一项的名义值（space-target.ts pathUnit），落笔时就知道。步长上限 = 半径的一半和一个路的单位里大的那个。
// · 落笔时没打中：先把输入的点攒着；第一次打中时定大小、开始这一笔，把攒着的点按原来的时间补给内核（滤抖结果和「一开始就开始」一样：同样的点、同样的时间）。
//   一直没打中 = 这一笔什么都不发生。
import type { Pt3 } from "../kernel/geom.ts";
import { StrokeCore } from "./kernel/src/backend/stroke-core.ts";
import type { ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";
import { type PaintTarget, type TargetGeo, buildTargetGeo, pathUnit, rayHit } from "./space-target.ts";
import { type SpacePath, SpacePathPlacer } from "./space-path.ts";
import { type Reach, tipReach } from "./tip-reach.ts";

export interface SpaceCamera {
  /** 屏幕一点 → 世界里的射线。 */
  ray(sx: number, sy: number): { readonly origin: Pt3; readonly dir: Pt3 };
  /** 世界里这一点那里，一个屏幕像素在空间里多大（世界长度）。 */
  pixelSize(p: Pt3): number;
  /** 名单之外的东西挡在这条射线 t 之前吗（不给 = 没有）。 */
  occluded?(origin: Pt3, dir: Pt3, t: number): boolean;
}
export interface SpaceTip {
  readonly x: number; readonly y: number; readonly z: number;
  /** 直径（世界长度）。 */
  readonly size: number;
  readonly alpha: number;
  /** 这一颗落下时已经走了多远（路的长度，断开的那几段不算）。 */
  readonly strokeDist: number;
  /** 夹在路上第几段（−1 = 起点那一颗）。 */
  readonly seg: number;
  /** 碰到哪些三角形（tip-reach.ts）。 */
  readonly reach: Reach;
}
export interface SpaceStrokeOpts {
  readonly smooth?: { tau?: number; deadzone?: number; tailBow?: number };
  /** 拐角选项（度；不给 = 不限）。 */
  readonly maxAngleDeg?: number;
}

export class SpaceStroke {
  readonly geos: readonly TargetGeo[];
  private readonly cam: SpaceCamera;
  private readonly settings: ResolvedBrush;
  private readonly opts: SpaceStrokeOpts;
  private pending: { x: number; y: number; p: number; t: number | null }[] = [];
  private core: StrokeCore | null = null;
  private placer: SpacePathPlacer | null = null;
  private dead = false;
  /** 空间里的直径（第一次打中时定）。 */
  worldSize = 0;

  constructor(targets: readonly PaintTarget[], camera: SpaceCamera, settings: ResolvedBrush, opts: SpaceStrokeOpts = {}) {
    this.geos = targets.map(buildTargetGeo);
    this.cam = { ray: camera.ray, pixelSize: camera.pixelSize, ...(camera.occluded ? { occluded: camera.occluded } : {}) };   // 一笔之内不变
    this.settings = settings; this.opts = opts;
  }
  get started(): boolean { return this.core !== null; }
  /** 打射线的统计（落成路那一层）。 */
  get stats(): { rays: number; capped: number } { return this.placer?.stats ?? { rays: 0, capped: 0 }; }

  /** 屏幕一点打中了什么（名单、遮挡都算上）。 */
  hitAt(sx: number, sy: number) {
    const r = this.cam.ray(sx, sy), occ = this.cam.occluded;
    return rayHit(this.geos, r.origin, r.dir, occ ? (t) => occ(r.origin, r.dir, t) : undefined);
  }

  down(x: number, y: number, p: number, t: number | null = null): void { this.dead = false; this.pending = []; this.core = null; this.placer = null; this.feed(x, y, p, t); }
  move(x: number, y: number, p: number, t: number | null = null): void { if (!this.dead) this.feed(x, y, p, t); }
  up(): void { if (this.core) this.core.finish(); this.pending = []; }
  cancel(): void { this.core = null; this.placer = null; this.pending = []; this.dead = true; }

  private feed(x: number, y: number, p: number, t: number | null): void {
    if (this.core) { this.core.extend(x, y, p, t); return; }
    this.pending.push({ x, y, p, t });
    const h = this.hitAt(x, y);
    if (h?.kind !== "target") return;
    // 第一次打中：定大小、开始这一笔，把攒着的点按原来的时间补给内核
    this.worldSize = this.settings.size * this.cam.pixelSize(h.pos);
    const unit = pathUnit(this.geos.map((g) => g.target)), stepMax = Math.max(this.worldSize / 4, unit);   // 半径的一半 = 直径的四分之一
    this.placer = new SpacePathPlacer({ hit: (sx, sy) => this.hitAt(sx, sy), unit, stepMax });
    const [b0, ...rest] = this.pending;
    this.core = new StrokeCore({ ...this.settings, size: this.worldSize }, b0.x, b0.y, b0.p, this.opts.smooth ?? {}, b0.t, this.placer);
    for (const b of rest) this.core.extend(b.x, b.y, b.p, b.t);
    this.pending = [];
  }

  /** 现在的路（没开始 = null）。 */
  path(): SpacePath | null { return this.core ? (this.core.path() as SpacePath) : null; }
  /** 现在的笔尖列表（从第 from 颗起；前面的不算碰到哪些三角形——定型画过的不再算，1-4b「每帧只随新增的笔尖涨」），每颗带着碰到哪些三角形。 */
  tips(from = 0): SpaceTip[] {
    if (!this.core) return [];
    const path = this.core.path() as SpacePath, out: SpaceTip[] = [];
    if (!path.count) return out;
    let i = -1;
    this.core.forEachTip((seg, x, y, z, size, alpha, strokeDist) => {
      if (++i < from) return;
      const starts = seg < 0 ? [path.hitAt(0)] : [path.hitAt(seg), path.hitAt(Math.min(seg + 1, path.count - 1))];
      out.push({ x, y, z, size, alpha, strokeDist, seg, reach: tipReach(this.geos, { x, y, z, r: size / 2 }, starts, this.opts.maxAngleDeg !== undefined ? { maxAngleDeg: this.opts.maxAngleDeg } : {}) });
    }, path);
    return out;
  }
}
