// paint-workbench.ts —— 画画工作台的控制器（贴图主线 1-7，施工单 ai-docs/20261111-paint-workorders-14.md；2026-11-11 Claude Opus 5.5）。
// 编辑器那边的三把工具（modes/paint.ts）只把「哪把工具、哪个阶段、在哪」经 ToolCtx.paint 交过来；画画内核、画板、落点、撤销的一步都在这里（编辑器不认识画画内核）。
// · 落笔：笔尖下那张面（射线打当前这个物件自己的网格）→ 它走的那张画（一个物件几张画 = 落点那张面的）→ 问 1-8b 的门（还在打开 = 这一笔不开始、提示、同时解开；
//   只能看不能画 = 说为什么）→ 开一笔（1-4b 的 SpacePaintStroke；落点只认正在编辑的这一份）。抬笔落层 = 三维撤销栈一步（1-8a）；一格都没碰到 = 内核不封步 = 不进栈、不说话。
// · 设置：笔 / 橡皮各一套（大小 = 屏幕像素、浓度 = 不透明度、硬度），先只记在这一次打开里（tool-config session；「记在设备上」等 user 点头，统筹 11-11）；颜色 = paint-color.ts 那一个入口。
// · 油漆桶（2026-11-13，统筹批的方案；填法和道理在 paint/space-fill.ts 头注释）：按下 = 同一道门 → 开一下 → 填光标下那张面；拖 = 每进一张新面就填它（只认按下那张面的画）；
//   松手 = 落层 + 三维一步（「油漆桶」）。没排进画布的面 / 一格都没分到的面：不填、提示行说为什么。
// · 吸管：点一处 → 画过的面 = 那一格合成出来的颜色（热的读内核合成那一张的一个像素；冷的先热）；没画的面 = 材质的颜色。取完回到上一把笔。
// · 进门就准备好：进画画工作台 / 换了正在编辑的物件 = 这个物件的画全部 warm()（冷的解开；新建还没画过的建画板），三角格子算好放着（模型一改就作废）。
//   画画的准备（1-4c space-prep.ts：整份几何 + 每格的表）每帧对一次：这个物件上热的画都要现成；过期了（在工作台里撤销到建模那几步 = 网格体修改号变了）
//   这一帧就重建，不等落笔。落笔撞上「还没重建完」= 这一笔不开始、提示行说一句（和「这张画还在打开」同一个口）。出了画画工作台 = 全放。
// · 不用不多做事：不进画画工作台就什么都不做（不建画板、不起内核）。
import { strokeKindOpts, type BrushKind } from "../paint/brush-kinds.ts";
import { resolvedBrushOf, strokeSmoothOf } from "../paint/brush-records.ts";
import { StrokeClock } from "../controller/stroke-clock.ts";
import type { Editor } from "../editor/editor.ts";
import type { PaintPointer } from "../editor/tool-handler.ts";
import type { PaintBoards } from "../paint/boards.ts";
import { SpacePaintStroke, type SpacePaintDeps } from "../paint/space-paint.ts";
import { SpaceFillStroke, fillAimOf } from "../paint/space-fill.ts";
import { buildTriGrid, pickSurface, type TriGrid } from "../paint/surface-pick.ts";
import { applyDir, applyPt, invert } from "../scene/xform.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { paintPlaceOf, uvColumnsOf } from "../scene/paint.ts";
import type { PaintColor, Rgb } from "./paint-color.ts";
import type { SpacePrep } from "../paint/space-prep.ts";
import { isPaintTool } from "../editor/tool-ids.ts";

export interface PaintWorkbenchDeps {
  readonly editor: Editor;
  readonly boards: PaintBoards;
  /** 一笔要的那些口（main.ts 和调试钩子同一份）；chain = 落点只认这一份摆放（正在编辑的那一份）。 */
  strokeDeps(chain: readonly number[]): SpacePaintDeps;
  /** 落笔之前问的门（main.ts paintStrokeGate：冷的 = 不开始 + 解开；只能看不能画 = 说为什么）。能画 = null。 */
  gate(texture: string): "locked" | "warming" | "view-only" | null;
  readonly color: PaintColor;
  /** 拿着这把工具画的是哪支笔（main.ts = app/paint-brushes.ts current；施工单二十 1b）。 */
  brushOf(tool: "paintPen" | "paintEraser"): BrushKind;
  /** 画画的准备（main.ts paintPrep；和调试钩子同一个）。 */
  readonly prep: SpacePrep;
  /** 提示行。 */
  hint(text: string): void;
  /** 上方正中的主按钮闪一下（没画过的物件上落笔：提示行说一句 + 让人看到按哪里；施工单十五第三节）。 */
  flashStart?(): void;
}

/** 笔尖下打到了什么。 */
/** 模型上落笔撞到平铺的画（施工单二十一第 3 刀第二节第 6 条）：不画、说原因。 */
export const tiledOnlyInWindow = (name: string): string => `这张面贴的是平铺的画「${name}」：平铺的画只在画布小窗里画（一格对着模型上很多个地方，在模型上画没有意义）`;
type Aim = { readonly tex: string; readonly cell: readonly [number, number] | null; readonly face: number } | { readonly face: number; readonly color: Rgb } | { readonly why: string; readonly start?: boolean } | null;
const NOT_STARTED = "这个物件还没开始画：点上面的「开始画…」";
const NOT_IN_PAINT = "这张面没走画（它是别的材质）：选中它，点上面的「把这几张面加进来」";
/** 油漆桶点到的面填不了的两种（space-fill.ts fillAimOf）。 */
const FILL_WHY = { "no-layout": "这张面还没排进画布：先在「开始画」里排一次", "no-cells": "这张面在画布上小到一格都没分到，填不上（格都归了旁边的面）" } as const;

export class PaintWorkbench {
  private readonly d: PaintWorkbenchDeps;
  private stroke: SpacePaintStroke | null = null;
  /** 油漆桶正在按着的那一下（画的是哪张画、上一次经过哪张面）。 */
  private fill: { readonly f: SpaceFillStroke; readonly tex: string; lastFace: number; saidOther: boolean } | null = null;
  /** 这一笔的时钟和压感（施工单二十 1a；规矩在 controller/stroke-clock.ts：一笔里只用一种钟、压感只信笔的）。 */
  private clock = new StrokeClock(undefined, 0);
  private lastPen: "paintPen" | "paintEraser" = "paintPen";
  /** 上一把笔（笔 / 橡皮）：吸管取完色回到它（模型上和画布小窗里的吸管同一个，施工单二十一第 2 刀）。 */
  get pen(): "paintPen" | "paintEraser" { return this.lastPen; }
  private readonly grids = new WeakMap<MeshKernel, { rev: number; grid: TriGrid }>();
  private entered: string | null = null;
  constructor(d: PaintWorkbenchDeps) { this.d = d; }

  /** 一笔正在画（手势路由问：这时候相机不动）。 */
  get stroking(): boolean { return this.stroke !== null || this.fill !== null; }

  /** 编辑器的工具交过来的一下。 */
  pointer(ev: PaintPointer): void {
    if (ev.tool === "paintBucket") { this.bucket(ev); return; }
    switch (ev.phase) {
      case "down": this.begin(ev); return;
      case "move": if (this.stroke) { this.stroke.move(ev.x, ev.y, this.clock.pressure(ev.pointerType, ev.pressure), this.clock.time(ev.at, performance.now())); this.d.editor.draw(); } return;
      case "up": if (this.stroke) { const st = this.stroke; this.stroke = null; st.up(); this.d.editor.draw(); } return;
      case "cancel": if (this.stroke) { const st = this.stroke; this.stroke = null; st.cancel(); this.d.editor.draw(); } return;
      case "pick": void this.eyedrop(ev.x, ev.y); return;
      case "hover": return;
    }
  }

  /** 上一次准备花了多少毫秒（探针量）。 */
  lastPrepMs = 0;

  /**
   * 每帧的「准备」之前调一次（main.ts beforeRender）：进了画画工作台 / 换了正在编辑的物件 = 这个物件的画先热起来（只比一个键）；
   * 然后对一次画画的准备（键对上 = 空操作；过期 = 这一帧重建）。出了画画工作台 = 准备全放。
   */
  tick(): void {
    const e = this.d.editor;
    if (!isPaintTool(e.tool)) { this.d.boards.setEditing([]); if (this.entered !== null) { this.entered = null; this.d.prep.release(); } return; }   // 手上不是画画的工具 = 不在画画工作台（那三把只在这里有）；画板都可以睡
    const S = e.sceneRef, def = S.defOfContext(e.context), key = `${e.docEpoch}:${def}`, body = S.def(def).body;
    if (body.kind !== "mesh") { this.d.boards.setEditing([]); this.entered = key; return; }
    this.d.boards.setEditing(this.paintsOn(def));   // 只醒着正在编辑的这个物件上的画（施工单十九第 3 刀）；换了物件 = 上一个的画在这一帧准备的末尾睡下
    if (key !== this.entered) {
      this.entered = key;
      this.grid(body.kernel);   // 三角格子先算好
      for (const g of this.paintsOn(def)) if (this.d.boards.stateOf(S, g) === "cold") void this.d.boards.warm(S, g).then(() => e.draw()).catch(() => { /* 只能看不能画：warm 自己说了 */ });
    }
    this.keepPrepared(def);
  }

  /** 这个物件上走的画（贴图表里分层的那几张）。 */
  private paintsOn(def: number): string[] {
    const S = this.d.editor.sceneRef, out: string[] = [];
    for (const t of S.textures.values()) if (t.content.kind === "layered" && paintPlaceOf(S, t.guid)?.def === def) out.push(t.guid);
    return out;
  }

  /** 这个物件上的画：新建还没画过的建画板（存出去和没建一样是空白的那份）；热的那几张的每份摆放（只认正在编辑的这一份）准备现成。 */
  private keepPrepared(def: number): void {
    const e = this.d.editor, S = e.sceneRef, chain = e.context.chain, targets = [];
    for (const g of this.paintsOn(def)) {
      const st = this.d.boards.stateOf(S, g);
      if (st === "new") this.d.boards.ensure(S, g);
      else if (st !== "hot") continue;
      targets.push(...this.d.strokeDeps(chain).targets(g));
    }
    if (!targets.length || this.d.prep.problem(targets) !== "pending") return;
    this.lastPrepMs = this.d.prep.ensure(targets);
  }

  private grid(k: MeshKernel): TriGrid {
    const rev = (k as unknown as { rev: number }).rev, hit = this.grids.get(k);
    if (hit && hit.rev === rev) return hit.grid;
    const grid = buildTriGrid(k as never);
    this.grids.set(k, { rev, grid });
    return grid;
  }

  /** 屏幕上这一点打到当前物件的哪张面、那张面走哪张画、落在哪一格。 */
  private aim(x: number, y: number): Aim {
    const e = this.d.editor, S = e.sceneRef, def = S.defOfContext(e.context), body = S.def(def).body;
    if (body.kind !== "mesh") return { why: "硬表面的物件不能画：先转成网格体" };
    const k = body.kernel, X = invert(S.xformOfContext(e.context)), r = e.cam.ray(x, y, e.vp()), o = applyPt(X, r.origin), dir = applyDir(X, r.dir);
    const anyUv = uvColumnsOf(k)[0] ?? "";
    const hit = pickSurface(k as never, this.grid(k), anyUv, o, dir);
    if (!hit) return null;
    const fp = S.facePaint(def, k.faceMat[hit.face]);
    if (!fp) {
      const m = S.materialOfSlot(def, k.faceMat[hit.face]), tp = m ? S.tiledPaintOf(m) : null;
      if (tp) return { why: tiledOnlyInWindow(tp.textureDoc.name || m!.name) };   // 平铺的画（施工单二十一第 3 刀第二节第 6 条）：不画、说原因
      if (!uvColumnsOf(k).length) return { why: NOT_STARTED, start: true };
      return { face: hit.face, color: m ? [m.color[0], m.color[1], m.color[2]] : [0.84, 0.84, 0.84] };
    }
    const h2 = fp.uvSet.guid === anyUv ? hit : pickSurface(k as never, this.grid(k), fp.uvSet.guid, o, dir);
    return { tex: fp.textureDoc.guid, cell: h2 && h2.inPaint ? h2.cell : null, face: hit.face };
  }

  private begin(ev: PaintPointer): void {
    if (ev.tool === "eyedrop" || ev.tool === "paintBucket") return;
    this.lastPen = ev.tool;
    const a = this.aim(ev.x, ev.y);
    if (!a) return;   // 落在空处：什么都不做
    if ("why" in a) { this.d.hint(a.why); if (a.start) this.d.flashStart?.(); return; }   // 没画过的物件：不自动弹面板，说一句、按钮闪一下
    if (!("tex" in a)) { this.d.hint(NOT_IN_PAINT); return; }
    if (this.d.gate(a.tex)) return;   // 锁着 / 冷的 / 只能看不能画：门自己说了（锁 = 第二层，v0.19.48）
    const e = this.d.editor, cfg = e.config, tool = ev.tool;
    const size = cfg.get(tool, "size"), opacity = cfg.get(tool, "opacity"), hardness = cfg.get(tool, "hardness");
    const kind = this.d.brushOf(tool), brush = resolvedBrushOf(kind, { size, opacity, hardness });   // 手上那支笔的记录 + 旋钮（施工单二十 1a / 1b）
    try {
      this.stroke = new SpacePaintStroke({ ...this.d.strokeDeps(e.context.chain), failed: (err) => { this.stroke = null; this.d.hint(strokeFailedSay(err)); } }, a.tex, { brush, color: this.d.color.get(), smooth: strokeSmoothOf(brush), ...strokeKindOpts(kind) });   // 种类相关的（擦不擦、怎么叠）只经笔的种类表；平滑只经内核的 resolveSmooth（跟手、防抖都是 0 = 不递 = 不平滑）
    } catch (err) { this.d.hint(strokeFailedSay(err)); this.stroke = null; return; }   // 准备没好（刚撤销改了模型）/ 撞到容量上限：这一笔不开始，说那句人话
    this.clock = new StrokeClock(ev.at, performance.now());
    this.stroke.down(ev.x, ev.y, this.clock.pressure(ev.pointerType, ev.pressure), 0);
    e.draw();
  }

  /** 油漆桶的一下：按下 = 过门、开、填光标下那张面；拖 = 进了新的面就填；松手 = 落层一步；取消 = 零痕迹。 */
  private bucket(ev: PaintPointer): void {
    const e = this.d.editor;
    switch (ev.phase) {
      case "down": {
        if (this.fill) return;
        const a = this.aim(ev.x, ev.y);
        if (!a) return;   // 落在空处：什么都不做
        if ("why" in a) { this.d.hint(a.why); if (a.start) this.d.flashStart?.(); return; }
        if (!("tex" in a)) { this.d.hint(NOT_IN_PAINT); return; }
        if (this.d.gate(a.tex)) return;   // 锁着 / 冷的 / 只能看不能画：门自己说了（和笔同一道门）
        let f: SpaceFillStroke;
        try { f = new SpaceFillStroke({ ...this.d.strokeDeps(e.context.chain), failed: (err) => { this.fill = null; this.d.hint(strokeFailedSay(err)); } }, a.tex, this.d.color.get()); }
        catch (err) { this.d.hint(strokeFailedSay(err)); return; }   // 准备没好 / 撞到容量上限：不开始，说那句人话
        this.fill = { f, tex: a.tex, lastFace: -1, saidOther: false };
        this.fillFace(a.face);
        e.draw();
        return;
      }
      case "move": {
        const st = this.fill;
        if (!st) return;
        const a = this.aim(ev.x, ev.y);
        if (!a || !("tex" in a) || a.face === st.lastFace) return;
        if (a.tex !== st.tex) { if (!st.saidOther) { st.saidOther = true; this.d.hint("这一下只填按下那张面所在的画；别的画上的面松手再点"); } return; }
        this.fillFace(a.face);
        e.draw();
        return;
      }
      case "up": { const st = this.fill; this.fill = null; if (st) { st.f.up(); e.draw(); } return; }
      case "cancel": { const st = this.fill; this.fill = null; if (st) { st.f.cancel(); e.draw(); } return; }
      default: return;
    }
  }
  /** 填这张面（它那块画布多边形）；填不了说为什么。 */
  private fillFace(face: number): void {
    const st = this.fill!;
    st.lastFace = face;
    const r = fillAimOf(st.f.table, face);
    if ("why" in r) { this.d.hint(FILL_WHY[r.why]); return; }
    st.f.add(r.poly);
  }

  /** 吸管：取那一处的颜色，取完回到上一把笔。 */
  private async eyedrop(x: number, y: number): Promise<void> {
    const e = this.d.editor, a = this.aim(x, y);
    if (!a) return;
    if ("why" in a) { this.d.hint(a.why); return; }
    let c: Rgb | null = null;
    if ("color" in a) c = a.color;
    else {
      const S = e.sceneRef;
      if (this.d.boards.stateOf(S, a.tex) !== "hot") { this.d.hint("这张画还在打开，取到颜色就换回笔"); if ((await this.d.boards.warm(S, a.tex)) !== "hot") return; }
      const b = this.d.boards.get(a.tex);
      if (b && a.cell) { const px = b.pixelAt(a.cell[0], a.cell[1]); if (px) c = [px[0] / 255, px[1] / 255, px[2] / 255]; }
    }
    if (!c) { this.d.hint("这里取不到颜色"); return; }
    this.d.color.set(c);
    this.d.hint(`取到颜色 ${"#" + c.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`);
    e.setTool(this.lastPen);
  }
}

/** 一笔开不了时提示行说的话（已知的几种说人话；别的照原文）。 */
export function strokeFailedSay(err: unknown): string {
  const say = (err as { say?: unknown } | null)?.say;
  if (typeof say === "string") return say;   // 准备没好（PrepPendingError）/ 撞到容量上限（PaintLimitError）：它们自己带着人话
  return `这一笔画不了（${err instanceof Error ? err.message : String(err)}）`;
}
