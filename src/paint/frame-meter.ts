// paint/frame-meter.ts —— 画画每一帧各段各花了多久（贴图主线 1-4d 第 1 条：「先做，别的都靠它判断」）。created 2026-11-11 by Claude Opus 5.5
// 和 editor/perf-stats.ts 一样是一个全局的小计数器，但默认关着：关着的时候每个记账的地方只多看一个布尔（now() 返回 0、add 什么都不做），不调 performance.now。
// 一帧 = 上一次三维画完到这一次三维画完（宿主在 Editor.afterRender 里调 endFrame）；两帧之间来的输入（收点、滤抖）记进下一帧。
// 段（和统筹 11-11 列的那几段一一对应；界面上的字在 METER_LABELS）：
//   input 收点和滤抖（SpaceStroke.feed → StrokeCore.extend）· rays 打射线（SpacePathPlacer.place）· walk 走步取笔尖（StrokeCore.forEachTip，减掉找面）·
//   reach 找面（tipReach）· layer 画薄层（SpaceLayer.update，CPU 这边交给显卡的时间）· compose 内核合成（PaintBoards.prepare 里合成那一段）·
//   copy 拷到显示图 · mips 做缩小图（渲染器的活的图那一段，两段分开记：缩小图每级一趟，真机上它占多少要一眼看得见；统筹 11-11）· scene 三维画场景（渲染一帧减掉 copy 和 mips）。
export const METER_SEGS = ["input", "rays", "walk", "reach", "layer", "compose", "copy", "mips", "scene"] as const;
export type MeterSeg = (typeof METER_SEGS)[number];
export const METER_LABELS: Readonly<Record<MeterSeg, string>> = {
  input: "收点和滤抖", rays: "打射线", walk: "走步取笔尖", reach: "找面", layer: "画薄层", compose: "内核合成", copy: "拷到显示图", mips: "做缩小图", scene: "三维画场景",
};
export type MeterFrame = Record<MeterSeg, number>;
const zero = (): MeterFrame => ({ input: 0, rays: 0, walk: 0, reach: 0, layer: 0, compose: 0, copy: 0, mips: 0, scene: 0 });

export const paintMeter = {
  /** 开关（画画工作台工具条上的「读数」；只在这一次打开里记）。 */
  on: false,
  cur: zero(),
  /** 开着 = 现在的时间；关着 = 0（不调 performance.now）。 */
  now(): number { return this.on ? performance.now() : 0; },
  /** 这一段从 t0 到现在的时间记进这一帧（关着什么都不做）。 */
  add(seg: MeterSeg, t0: number): void { if (this.on) this.cur[seg] += performance.now() - t0; },
  /** 直接记一个量好的数（别处已经量了的：合成、拷贝、渲染）。 */
  put(seg: MeterSeg, ms: number): void { if (this.on) this.cur[seg] += ms; },
  /** 一帧完了：交出这一帧的数，清零开始下一帧。 */
  endFrame(): MeterFrame { const r = this.cur; this.cur = zero(); return r; },
};
