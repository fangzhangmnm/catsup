// paint-workbench.ts —— 画画工作台的控制器（贴图主线 1-7，施工单 ai-docs/20261111-paint-workorders-14.md；2026-11-11 Claude Opus 5.5）。
// 编辑器那边的三把工具（modes/paint.ts）只把「哪把工具、哪个阶段、在哪」经 ToolCtx.paint 交过来；画画内核、画板、落点、撤销的一步都在这里（编辑器不认识画画内核）。
// · 落笔：笔尖下那张面（射线打当前这个物件自己的网格）→ 它走的那张画（一个物件几张画 = 落点那张面的）→ 问 1-8b 的门（还在打开 = 这一笔不开始、提示、同时解开；
//   只能看不能画 = 说为什么）→ 开一笔（1-4b 的 SpacePaintStroke；落点只认正在编辑的这一份）。抬笔落层 = 三维撤销栈一步（1-8a）；一格都没碰到 = 内核不封步 = 不进栈、不说话。
// · 设置：笔 / 橡皮各一套（大小 = 屏幕像素、浓度 = 不透明度、硬度），记在设备上（tool-config device）；颜色 = paint-color.ts 那一个入口。
// · 吸管：点一处 → 画过的面 = 那一格合成出来的颜色（热的读内核合成那一张的一个像素；冷的先热）；没画的面 = 材质的颜色。取完回到上一把笔。
// · 进门就准备好：进画画工作台 / 换了正在编辑的物件 = 这个物件的画全部 warm()（冷的解开），三角格子算好放着（模型一改就作废）。
// · 不用不多做事：不进画画工作台就什么都不做（不建画板、不起内核）。
import type { Editor } from "../editor/editor.ts";
import type { PaintPointer } from "../editor/tool-handler.ts";
import type { PaintBoards } from "../paint/boards.ts";
import { SpacePaintStroke, hookBrush, type SpacePaintDeps } from "../paint/space-paint.ts";
import { buildTriGrid, pickSurface, type TriGrid } from "../paint/surface-pick.ts";
import { applyDir, applyPt, invert } from "../scene/xform.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { paintPlaceOf } from "../scene/paint.ts";
import type { PaintColor, Rgb } from "./paint-color.ts";

export interface PaintWorkbenchDeps {
  readonly editor: Editor;
  readonly boards: PaintBoards;
  /** 一笔要的那些口（main.ts 和调试钩子同一份）；chain = 落点只认这一份摆放（正在编辑的那一份）。 */
  strokeDeps(chain: readonly number[]): SpacePaintDeps;
  /** 落笔之前问的门（main.ts paintStrokeGate：冷的 = 不开始 + 解开；只能看不能画 = 说为什么）。能画 = null。 */
  gate(texture: string): "warming" | "view-only" | null;
  readonly color: PaintColor;
  /** 提示行。 */
  hint(text: string): void;
}

/** 笔尖下打到了什么。 */
type Aim = { readonly tex: string; readonly cell: readonly [number, number] | null } | { readonly face: number; readonly color: Rgb } | { readonly why: string } | null;

export class PaintWorkbench {
  private readonly d: PaintWorkbenchDeps;
  private stroke: SpacePaintStroke | null = null;
  private t0 = 0;
  private lastPen: "paintPen" | "paintEraser" = "paintPen";
  private readonly grids = new WeakMap<MeshKernel, { rev: number; grid: TriGrid }>();
  private entered: string | null = null;
  constructor(d: PaintWorkbenchDeps) { this.d = d; }

  /** 一笔正在画（手势路由问：这时候相机不动）。 */
  get stroking(): boolean { return this.stroke !== null; }

  /** 编辑器的工具交过来的一下。 */
  pointer(ev: PaintPointer): void {
    switch (ev.phase) {
      case "down": this.begin(ev); return;
      case "move": if (this.stroke) { this.stroke.move(ev.x, ev.y, 1, performance.now() - this.t0); this.d.editor.draw(); } return;
      case "up": if (this.stroke) { const st = this.stroke; this.stroke = null; st.up(); this.d.editor.draw(); } return;
      case "cancel": if (this.stroke) { const st = this.stroke; this.stroke = null; st.cancel(); this.d.editor.draw(); } return;
      case "pick": void this.eyedrop(ev.x, ev.y); return;
      case "hover": return;
    }
  }

  /** 每帧的「准备」之前问一句（main.ts beforeRender）：进了画画工作台 / 换了正在编辑的物件 = 这个物件的画先热起来。便宜：只比一个键。 */
  tick(): void {
    const e = this.d.editor;
    if (e.modeId !== "paint") { this.entered = null; return; }
    const S = e.sceneRef, def = S.defOfContext(e.context), key = `${e.docEpoch}:${def}`;
    if (key === this.entered) return;
    this.entered = key;
    const body = S.def(def).body;
    if (body.kind !== "mesh") return;
    this.grid(body.kernel);   // 三角格子先算好
    for (const t of S.textures.values()) {
      if (t.content.kind !== "layered" || paintPlaceOf(S, t.guid)?.def !== def) continue;   // 只热这个物件上的画
      if (this.d.boards.stateOf(S, t.guid) === "cold") void this.d.boards.warm(S, t.guid).then(() => e.draw()).catch(() => { /* 只能看不能画：warm 自己说了 */ });
    }
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
    const anyUv = [...body.uvSets.keys()][0] ?? "";
    const hit = pickSurface(k as never, this.grid(k), anyUv, o, dir);
    if (!hit) return null;
    const fp = S.facePaint(def, k.faceMat[hit.face]);
    if (!fp) {
      if (!body.uvSets.size) return { why: "这个物件还没开始画：点右下角的「开始画」" };
      const m = S.materialOfSlot(def, k.faceMat[hit.face]);
      return { face: hit.face, color: m ? [m.color[0], m.color[1], m.color[2]] : [0.84, 0.84, 0.84] };
    }
    const h2 = fp.uvSet.guid === anyUv ? hit : pickSurface(k as never, this.grid(k), fp.uvSet.guid, o, dir);
    return { tex: fp.textureDoc.guid, cell: h2 && h2.inPaint ? h2.cell : null };
  }

  private begin(ev: PaintPointer): void {
    if (ev.tool === "eyedrop") return;
    this.lastPen = ev.tool;
    const a = this.aim(ev.x, ev.y);
    if (!a) return;   // 落在空处：什么都不做
    if ("why" in a) { this.d.hint(a.why); return; }
    if (!("tex" in a)) { this.d.hint("这张面没走画（它是别的材质）：选中它，点右下角的「开始画」"); return; }
    if (this.d.gate(a.tex)) return;   // 冷的 / 只能看不能画：门自己说了
    const e = this.d.editor, cfg = e.config, tool = ev.tool;
    const size = cfg.get(tool, "size"), opacity = cfg.get(tool, "opacity"), hardness = cfg.get(tool, "hardness");
    const brush = { ...hookBrush({ size, hardness }), opacity };
    try {
      this.stroke = new SpacePaintStroke(this.d.strokeDeps(e.context.chain), a.tex, { brush, color: this.d.color.get(), accum: "over", erase: tool === "paintEraser" });
    } catch (err) { this.d.hint(`这一笔开不了：${err instanceof Error ? err.message : String(err)}`); this.stroke = null; return; }
    this.t0 = performance.now();
    this.stroke.down(ev.x, ev.y, 1, 0);
    e.draw();
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
