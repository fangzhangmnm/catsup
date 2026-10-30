// ui/floating-window.ts —— 浮窗深模块：「一扇常驻浮窗的整个生命周期」只此一处（z 序 / 视口钳制 / 拖动 / 缩放 / 恢复位置 / 转屏重钳）。
// 从 WeebPaint src/ui/floating-window.ts 搬来（created 2026-09-02 by Claude Fable 5.1，WeebPaint UI 纪元 C2；那边吸掉了「一个浮窗横跨 4 个 module + 每窗各抄一份」）；
// CatsUp 搬入 2026-10-30 by Claude Opus 5.5（user 10-29「我建议是视图 物体 都做成可以常驻的浮窗吧，只有主菜单是菜单型的」「浮窗的时候你可以学一下weebpaint……
// 尽量深模块窄接口地去做」）。和 WeebPaint 的差别：① 顶边地板量的是 CatsUp 左上那排 HUD（.hud-topleft）的下缘；② 显隐用 hidden 属性（CatsUp 全仓惯例）；
// ③ 没搬 transient 抑制（CatsUp 还没有要临时藏窗的模式，要了再加）。
//
// 顶边地板（WeebPaint 2026-09-02 查证的定案，照搬）：iPadOS 窗口模式 env(safe-area-inset-*) 会失效、顶边有不上报的触摸死区、没有 API 报死区高度 →
// 不手填常数，运行时量：地板 = max(安全区 + 死区底线, HUD 顶排下缘 + 间距)。
//
// 不管什么：内容（菜单窗 = ui/menu-window.ts）、开关的业务语义（谁来决定开）、位置记在哪（onMove 回调交给调用方）。
import { attachPanelDrag, attachPanelResize, clampPanelPos, clampSize, type GizmoHandle, type PanelPos } from "./panel-gizmo.ts";
import { safeAreaTop } from "@internal/workbench-elements";

export type { PanelPos } from "./panel-gizmo.ts";

export const TOP_DEAD_ZONE_MIN = 24;   // 顶边触摸死区硬底线（iOS 18+ 横屏死区未被 env() 上报，社区建议 ≥20px）
export const FLOOR_GAP = 4;            // HUD 顶排下缘到拖把的间距
export const EDGE_MARGIN = 8;          // 尺寸钳制时离视口右 / 下边距

/** 拖把地板（纯函数）：max(安全区 + 死区底线, HUD 顶排下缘 + 间距)。hudBottom = null → 顶排不可见。 */
export function computeTopFloor(safeTop: number, hudBottom: number | null): number {
  const base = safeTop + TOP_DEAD_ZONE_MIN;
  return hudBottom != null ? Math.max(base, hudBottom + FLOOR_GAP) : base;
}
function hudBottom(): number | null {
  const el = typeof document !== "undefined" ? document.querySelector<HTMLElement>(".hud-topleft") : null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.height > 0 ? r.bottom : null;
}
/** 当前拖把地板（每次现量：旋转 / 顶排显隐 / 安全区变了都准）。 */
export function floatingTopFloor(): number {
  let safe = 0;
  try { safe = safeAreaTop(); } catch { safe = 0; }
  return computeTopFloor(safe, hudBottom());
}

export interface FloatingWindowSpec {
  id: string;
  /** 拖把（标题栏）。缺省 = 不可拖。 */
  head?: HTMLElement | null;
  /** 拖把上哪些目标不起拖（关闭钮等）。 */
  ignoreDragOn?: (target: Element) => boolean;
  /** 每次拖动落点（已钳；模块已写 left / top）——调用方只管记。 */
  onMove?: (pos: PanelPos) => void;
  resize?: { grip: HTMLElement | null; min: { w: number; h: number }; onResize?: (size: { w: number; h: number }) => void };
  /** open / close 的回声（钮的 aria-pressed 等）。 */
  onOpenChange?: (open: boolean) => void;
  /** 藏着时量不到尺寸的兜底（恢复位置时钳用）。 */
  fallbackSize?: { w: number; h: number };
}

export interface FloatingWindowHandle {
  readonly el: HTMLElement;
  readonly id: string;
  open(): void;
  close(): void;
  toggle(force?: boolean): boolean;
  isOpen(): boolean;
  raise(): void;
  /** 钳进视口（拖把不进顶边死区、不出屏）。藏着时不做。 */
  clamp(): void;
  /** 放到这个位置（钳过）；null = 回 CSS 默认位（清内联样式）。 */
  restore(pos: (PanelPos & { width?: number; height?: number }) | null): void;
  dispose(): void;
}

interface Entry { el: HTMLElement; spec: FloatingWindowSpec; handle: FloatingWindowHandle; drag: GizmoHandle | null; resize: GizmoHandle | null; onRaise: (e: Event) => void }

const _stack: Entry[] = [];   // z 序：末位最高
let _base = 0;
function zBase(): number {
  if (!_base) {
    let v = NaN;
    try { v = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--z-window"), 10); } catch { /* 测试环境 */ }
    _base = Number.isFinite(v) && v > 0 ? v : 200;
  }
  return _base;
}
function normalizeZ(): void { const b = zBase(); _stack.forEach((en, i) => { en.el.style.zIndex = String(b + i); }); }
function raise(en: Entry): void { const i = _stack.indexOf(en); if (i >= 0) _stack.splice(i, 1); _stack.push(en); normalizeZ(); }
const vw = (): number => window.innerWidth, vh = (): number => window.innerHeight;
function sizeOf(en: Entry, hint?: { width?: number; height?: number }): { w: number; h: number } {
  const fb = en.spec.fallbackSize ?? { w: 280, h: 240 };
  return { w: en.el.offsetWidth || hint?.width || fb.w, h: en.el.offsetHeight || hint?.height || fb.h };
}
function writePos(en: Entry, pos: PanelPos): void { en.el.style.left = `${pos.left}px`; en.el.style.right = "auto"; en.el.style.top = `${pos.top}px`; }
function clampEntry(en: Entry): void {
  if (en.el.hidden || !(vw() > 0) || !(vh() > 0)) return;
  const { w, h } = sizeOf(en), r = en.el.getBoundingClientRect(), cur = { left: r.left, top: r.top };
  const next = clampPanelPos(cur, { w, h }, { w: vw(), h: vh() }, floatingTopFloor());
  if (Math.abs(next.left - cur.left) > 0.5 || Math.abs(next.top - cur.top) > 0.5) writePos(en, next);
}

// 视口变（旋转 / 分屏 / 桌面拉窗）→ 开着的窗全部重钳，合帧。用 innerHeight 不用 visualViewport：iOS 软键盘只改 visualViewport，跟着它钳面板会抖（WeebPaint 0828）
let vpRaf = 0, vpListening = false;
function onViewport(): void { if (vpRaf) return; vpRaf = requestAnimationFrame(() => { vpRaf = 0; for (const en of _stack) clampEntry(en); }); }
function ensureViewportListener(): void {
  if (vpListening || typeof window === "undefined" || !window.addEventListener) return;
  vpListening = true;
  window.addEventListener("resize", onViewport);
  window.addEventListener("orientationchange", onViewport);
}

export function registerFloatingWindow(el: HTMLElement, spec: FloatingWindowSpec): FloatingWindowHandle {
  _stack.find((e) => e.el === el)?.handle.dispose();
  const en: Entry = { el, spec, handle: null as unknown as FloatingWindowHandle, drag: null, resize: null, onRaise: () => raise(en) };
  const handle: FloatingWindowHandle = {
    el, id: spec.id,
    isOpen: () => !el.hidden,
    open() { el.hidden = false; raise(en); clampEntry(en); spec.onOpenChange?.(true); },   // 开窗的瞬间必须在视口里（不管坐标从哪条路来）
    close() { el.hidden = true; spec.onOpenChange?.(false); },
    toggle(force?: boolean) { const show = force ?? el.hidden; if (show) handle.open(); else handle.close(); return show; },
    raise: () => raise(en),
    clamp: () => clampEntry(en),
    restore(pos) {
      if (!pos) { el.style.left = ""; el.style.right = ""; el.style.top = ""; el.style.width = ""; el.style.height = ""; return; }
      if (spec.resize) {
        if (pos.width) el.style.width = `${clampSize(pos.width, spec.resize.min.w, Math.max(spec.resize.min.w, vw() - 24))}px`;
        if (pos.height) el.style.height = `${clampSize(pos.height, spec.resize.min.h, Math.max(spec.resize.min.h, vh() - floatingTopFloor() - EDGE_MARGIN))}px`;
      }
      writePos(en, clampPanelPos({ left: pos.left, top: pos.top }, sizeOf(en, pos), { w: vw(), h: vh() }, floatingTopFloor()));
    },
    dispose() {
      en.drag?.dispose(); en.resize?.dispose();
      el.removeEventListener("pointerdown", en.onRaise, true);
      const i = _stack.indexOf(en); if (i >= 0) _stack.splice(i, 1);
      normalizeZ();
    },
  };
  en.handle = handle;
  _stack.unshift(en); normalizeZ();   // 进栈底；第一次真正置顶在 open
  el.addEventListener("pointerdown", en.onRaise, true);   // 点窗 = 置顶
  if (spec.head) en.drag = attachPanelDrag(el, spec.head, { ignore: spec.ignoreDragOn, topFloor: floatingTopFloor, onMove: (pos) => { writePos(en, pos); spec.onMove?.(pos); } });
  const rs = spec.resize;
  if (rs?.grip) {
    en.resize = attachPanelResize(el, rs.grip, {
      getSize: () => ({ w: el.offsetWidth, h: el.offsetHeight }), min: rs.min,
      max: () => { const r = el.getBoundingClientRect(); return { w: vw() - r.left - EDGE_MARGIN, h: vh() - r.top - EDGE_MARGIN }; },
      onResize: (s) => { el.style.width = `${s.w}px`; el.style.height = `${s.h}px`; rs.onResize?.(s); },
    });
  }
  ensureViewportListener();
  return handle;
}

/** 诊断 / 探针：当前栈（id 按 z 升序）。 */
export function floatingWindowStack(): string[] { return _stack.map((e) => e.spec.id); }
