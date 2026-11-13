// paint/space-fill.ts —— 油漆桶的一下：点一张面 = 它那块画布多边形的格全涂成一个颜色；按住拖过去 = 经过的每张面都涂，整个一拖 = 一步。created 2026-11-13 by Claude Opus 5.5
// 统筹 11-13 批的方案（user 的叫法「油漆桶」）：
//   · 填哪些格：归属表（texel-table.ts）里归这张面所在那块画布多边形的格，含多边形外面往外延的那几格；只经 polyRunsOf（归属表的另一种排法），这里不另算归属。
//     贴图坐标完全相同的面（镜像两半、复制出来的面）是同一块多边形、共用同一片像素：填一张另一张跟着变，这是共用像素决定的。
//     两张面在画布上连着排时，压在公共边上的那一排格只归一边（一样近归编号小的），另一张面的边上会露出最多半格邻面的颜色 = 格子分辨率决定的，不算溢出。
//   · 填什么：当前颜色、写进当前层、不透明度 100%；和笔同一个档口（PaintBoard.openStroke：开一笔问锁、落层再问一次）、同一条落层路、同一个撤销口（commitStep "fill" = 一步）。
//   · 怎么画：每个行段 = 一个实心矩形（一个实例），程序 space-fill 一对（GLSL + JavaScript 版）；不碰每格的表、不碰面表 —— 格是 CPU 这边从归属表读出来的。
//   · 显卡上的活和笔一样只在「准备」里做（画板登记处每帧在渲染之前调一次）：add 只记下要填哪块，下一次准备才画进薄层、交给档口。
import { DirtyCells } from "./kernel/src/common/dirty-rects.ts";
import { polyRunsOf, type TexelTable } from "./texel-table.ts";
import type { SpacePaintDeps } from "./space-paint.ts";
import type { SpaceGpu, SpaceImage, SpaceProgram } from "./space-gpu.ts";
import type { PaintBoard } from "./board.ts";
import type { ExternalTexture } from "./kernel/src/common/gl2-port.ts";
import type { StrokeSession } from "./kernel/src/backend/stroke-session.ts";
import type { Guid } from "../format/guid.ts";

/** 填色程序（一对）：一个实例 = 一个行段 [x, y, 长度, 1]（离屏图的格子坐标），整块写当前颜色、不透明。 */
export const SPACE_FILL: SpaceProgram = {
  name: "space-fill",
  vert: `#version 300 es
layout(location=0) in vec2 a_quad;
layout(location=1) in vec4 a_inst;   // 一个行段：x, y, 长度, 1
uniform vec2 u_size;
void main() { vec2 p = a_inst.xy + a_quad * a_inst.zw; gl_Position = vec4(p / u_size * 2.0 - 1.0, 0.0, 1.0); }`,
  frag: `#version 300 es
precision highp float;
uniform vec3 u_color;
out vec4 o;
void main() { o = vec4(u_color, 1.0); }`,
  cpu: (ctx) => {
    const c = ctx.uniforms.u_color as readonly number[], I = ctx.instances;
    for (let k = 0; k < ctx.count; k++) {
      const x0 = I[4 * k], y0 = I[4 * k + 1], w = I[4 * k + 2], h = I[4 * k + 3];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) ctx.write(x, y, c[0], c[1], c[2], 1);
    }
  },
};
/** 哪些显卡接口上登记过填色程序（同一个名字登记两次 = 抛：只在这里登记）。 */
const registeredOn = new WeakSet<SpaceGpu>();
function ensureProgram(gpu: SpaceGpu): void { if (!registeredOn.has(gpu)) { gpu.register(SPACE_FILL); registeredOn.add(gpu); } }

/** 这张面能不能填：在哪块多边形 / 这张面没排进画布（走这张画、但角上没有贴图坐标）/ 那块多边形一格都没分到（太小，格都归了邻居）。 */
export type FillAim = { readonly poly: number; readonly cells: number } | { readonly why: "no-layout" | "no-cells" };
/** 归属表里这张面的情况（不碰显卡、不开档口；画画控制器落下去之前先问）。 */
export function fillAimOf(t: TexelTable, face: number): FillAim {
  const fp = t.faces.get(face);
  if (!fp) return { why: "no-layout" };
  const n = polyRunsOf(t).cells[fp.poly] ?? 0;
  return n > 0 ? { poly: fp.poly, cells: n } : { why: "no-cells" };
}

export class SpaceFillStroke {
  private readonly d: SpacePaintDeps;
  private readonly color: readonly [number, number, number];
  private readonly board: PaintBoard;
  private readonly gpu: SpaceGpu;
  /** 这张画（正在编辑的这一份摆放）的归属表（画画的准备里现成的，借来读）。 */
  readonly table: TexelTable;
  private frame: SpaceImage | null = null;
  private session: StrokeSession | null = null;
  private ext: ExternalTexture | null = null;
  private layerId = 0;
  /** 已经填了的多边形 / 还没画进薄层的。 */
  private readonly done = new Set<number>();
  private pending: number[] = [];
  /** 这一下到现在碰过的格（落层只读回这些格）/ 上一次准备之后变了的格（报给内核和显示那一侧）。 */
  private readonly all: DirtyCells;
  private changed: DirtyCells;
  private box: [number, number, number, number] | null = null;
  private finishing = false;
  private broken = false;
  private readonly unhook: () => void;
  private readonly untrack: () => void;

  constructor(d: SpacePaintDeps, texture: Guid, color: readonly [number, number, number]) {
    this.d = d; this.color = color;
    const gpu = d.gpu();
    if (!gpu) throw new Error("SpaceFillStroke: no GPU for the space layer");
    this.gpu = gpu;
    this.board = d.boards.ensure(d.scene(), texture);
    const targets = d.targets(texture);
    if (targets.length !== 1) throw new Error(`SpaceFillStroke: ${targets.length} placements of this paint (exactly one: the one being edited)`);
    this.table = d.prep.take(targets[0]).geo.table;   // 没准备好 / 过期了 = 抛 PrepPendingError（和笔一样：不现建）
    const W = this.table.width, H = this.table.height;
    this.all = new DirtyCells(W, H); this.changed = new DirtyCells(W, H);
    this.unhook = d.boards.onPrepare(() => this.prepare());
    this.untrack = d.boards.trackOpen(texture, () => this.cancel());   // 撤销 / 重做之前：开着的这一下先取消（同一笔）
  }

  /** 填这一块多边形（fillAimOf 给的号）。已经填过 = false。真画进去在下一次准备里。 */
  add(poly: number): boolean {
    if (this.broken || this.finishing || this.done.has(poly)) return false;
    this.done.add(poly); this.pending.push(poly);
    return true;
  }
  /** 填了几块（探针 / 提示行）。 */
  get count(): number { return this.done.size; }

  /** 松手：没画进去的画进去 → 落层（内核一步）→ 交给三维的撤销栈（一步）。 */
  up(): void {
    if (this.broken) return;
    this.finishing = true;
    this.prepare();
    if (this.broken) return;
    try {
      if (this.session) this.session.end();
    } catch (err) {
      this.board.overlayChanged(); this.close();   // 落层中途出错：档口已经取消令牌、已写的跟着回滚 = 什么都没落
      const say = (err as { say?: unknown } | null)?.say;
      this.d.failed?.(Object.assign(new Error(`fill did not land: ${err instanceof Error ? err.message : String(err)}`), { say: typeof say === "string" ? say : "这一下没能落进画里，已经撤掉（画和之前一样）" }));
      return;
    }
    const landed = !!this.session;
    this.close();
    if (landed) this.d.commitStep?.("fill");
  }
  cancel(): void { this.session?.cancel(); this.board.overlayChanged(); this.close(); }

  private prepare(): void {
    if (this.broken || !this.pending.length) { if (this.finishing && this.session) this.hostLayers(); return; }
    const t = this.table, W = t.width, H = t.height, runs = polyRunsOf(t).runs;
    if (!this.frame) {
      try {
        ensureProgram(this.gpu);
        this.frame = this.gpu.image(W, H);
        this.session = this.board.openStroke();   // 锁着 = 抛（第三层）
        this.layerId = this.board.wp.layerTree!.view().activeId!;
        this.ext = this.board.wrapLayer({ ...this.d.external(this.frame), w: W, h: H, prec: "u8" } as Parameters<PaintBoard["wrapLayer"]>[0]);
      } catch (err) { this.broken = true; this.cancel(); this.d.failed?.(err); return; }
    }
    for (const p of this.pending) {
      const r = runs[p], n = r.length / 3;
      if (!n) continue;
      const inst = new Float32Array(4 * n);
      for (let k = 0; k < n; k++) {
        const x = r[3 * k], y = r[3 * k + 1], w = r[3 * k + 2];
        inst[4 * k] = x; inst[4 * k + 1] = y; inst[4 * k + 2] = w; inst[4 * k + 3] = 1;
        this.changed.mark(x, y, w, 1); this.all.mark(x, y, w, 1);
        const b = this.box;
        this.box = b ? [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x + w), Math.max(b[3], y + 1)] : [x, y, x + w, y + 1];
      }
      this.gpu.draw({ program: SPACE_FILL.name, target: this.frame!, clear: false, accum: "max", instances: inst, count: n, uniforms: { u_size: [W, H], u_color: [...this.color] } });
    }
    this.pending = [];
    for (const run of this.changed.runs()) this.ext!.markChanged(run.x, run.y, run.w, run.h);
    this.hostLayers();
    this.board.overlayChanged(this.changed);
    this.changed = new DirtyCells(W, H);
  }
  /** 交给档口：这一下到现在的范围；松手那一次连碰过的格一起交（落层只读回这些格）。 */
  private hostLayers(): void {
    const b = this.box;
    if (!b || !this.session) return;
    this.session.setHostLayers([{ tex: this.ext!, bx: b[0], by: b[1], bw: b[2] - b[0], bh: b[3] - b[1], layerId: this.layerId, opacity: 1, erase: false, blendMode: "source-over", ...(this.finishing ? { cells: this.all } : {}) }]);
  }
  private close(): void { this.unhook(); this.untrack(); if (this.frame) this.gpu.release(this.frame); this.frame = null; this.session = null; this.ext = null; }
}
