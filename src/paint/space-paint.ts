// paint/space-paint.ts —— 空间里的一笔，接到画板上（贴图主线 1-4b）：1-4a 的控制器 → 这张贴图的薄层（三维显卡接口）→ 画板的档口（0-5 host 方式）。created 2026-11-11 by Claude Opus 5.5
// 一次手势 = 一笔 = 档口一个令牌 = 内核撤销栈里一步。第一笔时建画板（登记处 ensure）。这一张只接一张贴图、一份摆放（名单不止一项 = 抛，记在施工记录里）。
// 每帧的活登记进画板登记处的「准备」（编辑器在渲染之前明着调一次）：取笔尖 → 新定型的画进定型层、尾巴每帧重画 → 包成内核的纹理对象交给档口 → 画板合成。
// 定型：笔尖所在那一段两头的路点都定型了（seg + 1 < 路的定型点数）。抬笔：收笔的渐细这时才知道总长，所以抬笔时定型层清掉、整笔重画一次（只这一次），再落层。
// 橡皮 = 同一支笔，交给档口时 erase = true。取消 = 档口取消（零痕迹）。
import { SpaceStroke, type SpaceCamera } from "./space-stroke.ts";
import { SpaceLayer, SPACE_TIP } from "./space-layer.ts";
import type { SpaceGpu, SpaceImage } from "./space-gpu.ts";
import type { PaintBoards } from "./boards.ts";
import type { PaintBoard } from "./board.ts";
import type { PaintTarget } from "./space-target.ts";
import type { ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";
import type { ExternalTexture } from "./kernel/src/common/gl2-port.ts";
import type { StrokeSession } from "./kernel/src/backend/stroke-session.ts";
import type { InkTip } from "./tip-truth.ts";
import type { Scene } from "../scene/scene.ts";
import type { Guid } from "../format/guid.ts";

export interface SpacePaintDeps {
  readonly boards: PaintBoards;
  readonly scene: () => Scene;
  /** 这张画（按画板实际的画布）在世界里摆在哪几处（paint-targets.ts）。 */
  readonly targets: (texture: Guid) => PaintTarget[];
  /** 三维的显卡接口（真显卡版 / 软件版）。 */
  readonly gpu: () => SpaceGpu | null;
  /** 这张离屏图在这个显卡接口上交给内核的形态（真显卡 = { gl }，软件版 = { pixels }）。 */
  readonly external: (img: SpaceImage) => { readonly gl: WebGLTexture } | { readonly pixels: Uint8Array | Uint8ClampedArray };
  readonly camera: () => SpaceCamera;
}
export interface SpacePaintOpts {
  readonly brush: ResolvedBrush;
  readonly color: readonly [number, number, number];
  readonly accum: "max" | "over";
  readonly erase?: boolean;
}

const registered = new WeakSet<SpaceGpu>();

export class SpacePaintStroke {
  private readonly d: SpacePaintDeps;
  private readonly o: SpacePaintOpts;
  private readonly board: PaintBoard;
  private readonly stroke: SpaceStroke;
  private readonly gpu: SpaceGpu;
  private session: StrokeSession | null = null;
  private layer: SpaceLayer | null = null;
  private ext: ExternalTexture | null = null;
  private layerId = 0;
  private dirty = false;
  private finishing = false;
  private readonly unhook: () => void;

  constructor(d: SpacePaintDeps, texture: Guid, o: SpacePaintOpts) {
    this.d = d; this.o = o;
    const gpu = d.gpu();
    if (!gpu) throw new Error("SpacePaintStroke: no GPU for the space layer");
    this.gpu = gpu;
    if (!registered.has(gpu)) { gpu.register(SPACE_TIP); registered.add(gpu); }
    this.board = d.boards.ensure(d.scene(), texture);   // 第一笔时建画板
    const targets = d.targets(texture);
    if (targets.length !== 1) throw new Error(`SpacePaintStroke: ${targets.length} placements of this paint (1-4b handles exactly one)`);
    this.stroke = new SpaceStroke(targets, d.camera(), o.brush);
    this.unhook = d.boards.onPrepare(() => this.prepare());
  }

  down(x: number, y: number, p: number, t: number | null = null): void { this.stroke.down(x, y, p, t); this.dirty = true; }
  move(x: number, y: number, p: number, t: number | null = null): void { this.stroke.move(x, y, p, t); this.dirty = true; }
  /** 抬笔：整笔重画一次（收笔渐细）→ 落层（内核一步）。在下一次「准备」里做完；这里先把它准备好。 */
  up(): void { this.stroke.up(); this.finishing = true; this.dirty = true; this.prepare(); this.finish(); }
  cancel(): void { this.stroke.cancel(); this.session?.cancel(); this.board.overlayChanged(); this.close(); }
  /** 现在的范围（报给内核的那一块；探针用）。 */
  range(): { x: number; y: number; w: number; h: number } | null { return this.layer?.range() ?? null; }
  tipCount(): number { return this.stroke.tips().length; }

  private tipsNow(): { tip: InkTip; reach: ReturnType<SpaceStroke["tips"]>[number]["reach"] }[] {
    return this.stroke.tips().map((t) => ({ tip: { x: t.x, y: t.y, z: t.z, r: t.size / 2, alpha: t.alpha }, reach: t.reach }));
  }
  private frozenCount(): number {
    if (this.finishing) return Infinity;
    const path = this.stroke.path(), n = path?.frozenCount ?? 0;
    let k = 0; for (const t of this.stroke.tips()) { if (t.seg + 1 < n) k++; else break; }
    return k;
  }

  /** 这一帧的准备（画板登记处的 prepare 调；合成在它后面）。 */
  private prepare(): void {
    if (!this.dirty) return;
    this.dirty = false;
    const tips = this.tipsNow();
    if (!tips.length) return;
    if (!this.layer) {
      this.layer = new SpaceLayer(this.gpu, this.stroke.geos[0], 0, { hardness: this.o.brush.hardness, color: this.o.color, accum: this.o.accum, origin: tips[0].tip });
      this.session = this.board.openStroke();
      this.layerId = this.board.wp.layerTree!.view().activeId!;
      this.ext = this.board.wrapLayer({ ...this.d.external(this.layer.frame), w: this.layer.frame.w, h: this.layer.frame.h, prec: "u8" } as Parameters<PaintBoard["wrapLayer"]>[0]);
    }
    if (this.finishing) this.layer.resetFrozen();
    this.layer.update(tips, Math.min(this.frozenCount(), tips.length));
    const r = this.layer.range();
    if (r) this.session!.setHostLayers([{ tex: this.ext!, bx: r.x, by: r.y, bw: r.w, bh: r.h, layerId: this.layerId, opacity: 1, erase: !!this.o.erase, blendMode: "source-over" }]);
    this.board.overlayChanged();
  }
  private finish(): void {
    if (this.session) this.session.end();
    this.board.overlayChanged();
    this.close();
  }
  private close(): void { this.unhook(); this.layer?.dispose(); this.layer = null; this.session = null; }
}
