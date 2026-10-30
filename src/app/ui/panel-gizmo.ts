// ui/panel-gizmo.ts —— 浮窗把手：拖动（标题栏）+ 缩放（右下角 grip）的 pointer-capture 和视口钳制。
// 从 WeebPaint src/ui/panel-gizmo.ts 原样搬来（created 2026-09-02 by Claude Fable 5.1，WeebPaint UI 纪元 C2）；CatsUp 搬入 2026-10-30 by Claude Opus 5.5
// （user 10-29「浮窗的时候你可以学一下weebpaint……尽量深模块窄接口地去做」）。几何 = 纯函数 clampPanelPos / clampSize；落地（写 style / 记位置）归调用方。

export interface PanelPos { left: number; top: number }
export interface Viewport { w: number; h: number }

/** 视口钳制（纯函数）：左右 0..vw-w；上下 topFloor..vh-h（窗比视口还大时取靠上/靠左那端）。 */
export function clampPanelPos(pos: PanelPos, size: Viewport, vp: Viewport, topFloor = 0): PanelPos {
  return {
    left: Math.max(0, Math.min(vp.w - size.w, pos.left)),
    top: Math.max(topFloor, Math.min(vp.h - size.h, pos.top)),
  };
}

/** 尺寸钳制（纯函数）：min ≤ v ≤ max（max 可为 Infinity）。 */
export function clampSize(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface DragOpts {
  /** 把手上哪些目标不起拖（关闭钮等）。 */
  ignore?: (target: Element) => boolean;
  topFloor?: number | (() => number);   // 常数或现算（floating-window 传函数：顶栏下缘每次现量）
  /** 每次移动：已钳制的 left/top（消费者写 style + 持久化）。 */
  onMove: (pos: PanelPos) => void;
  onEnd?: () => void;
}
export interface GizmoHandle { dispose(): void }

/** 标题栏拖动整窗。panel 只用来量尺寸/起点；落地全在 onMove。 */
export function attachPanelDrag(panel: HTMLElement, handle: HTMLElement, opts: DragOpts): GizmoHandle {
  let d: { id: number; sx: number; sy: number; ol: number; ot: number } | null = null;
  const down = (e: PointerEvent) => {
    if (opts.ignore && e.target && opts.ignore(e.target as Element)) return;
    const r = panel.getBoundingClientRect();
    d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ol: r.left, ot: r.top };
    try { handle.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  };
  const move = (e: PointerEvent) => {
    if (!d || e.pointerId !== d.id) return;
    const pos = clampPanelPos(
      { left: d.ol + (e.clientX - d.sx), top: d.ot + (e.clientY - d.sy) },
      { w: panel.offsetWidth, h: panel.offsetHeight },
      { w: window.innerWidth, h: window.innerHeight },
      typeof opts.topFloor === "function" ? opts.topFloor() : opts.topFloor,
    );
    opts.onMove(pos);
  };
  const up = (e: PointerEvent) => {
    if (!d || e.pointerId !== d.id) return;
    try { handle.releasePointerCapture(e.pointerId); } catch {}
    d = null;
    opts.onEnd?.();
  };
  handle.addEventListener("pointerdown", down);
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", up);
  handle.addEventListener("pointercancel", up);
  return { dispose() {
    handle.removeEventListener("pointerdown", down); handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
  } };
}

export interface ResizeOpts {
  /** 起拖时量当前尺寸（图层窗的 h = 列表高，不是面板高——语义归消费者）。 */
  getSize: () => { w: number; h: number };
  min: { w: number; h: number };
  /** 上限（默认：宽 = 视口右缘留 8px；高 = 无限）。每次移动现算。 */
  max?: () => { w: number; h: number };
  /** 每次移动：已钳制的 w/h（消费者写 style + 持久化）。 */
  onResize: (size: { w: number; h: number }) => void;
  onEnd?: () => void;
}

/** 右下角 grip 缩放。 */
export function attachPanelResize(panel: HTMLElement, grip: HTMLElement, opts: ResizeOpts): GizmoHandle {
  let d: { id: number; sx: number; sy: number; w0: number; h0: number } | null = null;
  const down = (e: PointerEvent) => {
    const s = opts.getSize();
    d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, w0: s.w, h0: s.h };
    try { grip.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
    e.stopPropagation();
  };
  const move = (e: PointerEvent) => {
    if (!d || e.pointerId !== d.id) return;
    const max = opts.max ? opts.max() : { w: window.innerWidth - panel.getBoundingClientRect().left - 8, h: Infinity };
    opts.onResize({
      w: clampSize(d.w0 + (e.clientX - d.sx), opts.min.w, max.w),
      h: clampSize(d.h0 + (e.clientY - d.sy), opts.min.h, max.h),
    });
  };
  const up = (e: PointerEvent) => {
    if (!d || e.pointerId !== d.id) return;
    try { grip.releasePointerCapture(e.pointerId); } catch {}
    d = null;
    opts.onEnd?.();
  };
  grip.addEventListener("pointerdown", down);
  grip.addEventListener("pointermove", move);
  grip.addEventListener("pointerup", up);
  grip.addEventListener("pointercancel", up);
  return { dispose() {
    grip.removeEventListener("pointerdown", down); grip.removeEventListener("pointermove", move);
    grip.removeEventListener("pointerup", up); grip.removeEventListener("pointercancel", up);
  } };
}
