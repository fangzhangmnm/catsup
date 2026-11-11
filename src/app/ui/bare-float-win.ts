// ui/bare-float-win.ts —— 没有标题栏的浮窗壳（画画手感账 P-10：画布小窗；user 11-11「还是参考参考小窗吧，拖动的东西做成一个和这个语义一样的图标，点一下可以收起来」）。
// created 2026-11-11 by Claude Opus 5.5。**等界面零件库收了浮窗的壳之后换成共享的（家族周账 F-253）。**
// 样子和数照 @internal/reference-window 0.4.3 起的 reference-window.ts（只读着看，没改库；库的壳没导出）：
//   · 左上一颗圆钮：28 px 的钮、可点区 36 px、触屏 44 px；图标 = 这扇窗自己的图标。点一下 = 收成小图标；按住动过 FLOAT_KNOB_DRAG_PX = 挪窗（不收）。
//   · 收起 = 一颗 44 px 的圆钮（参考窗的 .bubble），同一个图标、同一个位置；拖 = 挪、点 = 恢复，原来的宽高留着。
//   · 右上两颗圆钮：「…」（菜单）和 ×（关）。右下 = 斜纹角（.float-grip，19 px，触屏能拖）。三颗圆钮带一圈淡边（底色暗也看得见）。
//   · 闲置淡出：窗上 FLOAT_IDLE_MS 不动 → .idle（零件 0.35）；能悬停的设备上指针离窗 → .away（零件全隐）、进窗即现；拖窗 / 改大小时不淡。
//   · 窗钳在屏幕里（ui/floating-window.ts）；底地板 = 底部抽屉（--drawer-h）和软键盘占掉的高度，右下角不被盖住。
// 收没收起、位置、大小：只在这一次打开期间记着（不写设备，不写文件）。
// 这一扇窗的生命周期（z 序 / 钳制 / 改大小）照旧是 ui/floating-window.ts；这里只多了壳上的四个零件。
import { registerFloatingWindow, type FloatingWindowHandle } from "./floating-window.ts";
import { openPopupMenu, type PopupMenuItem } from "./popup-menu.ts";
import { iconHtml } from "./icon.ts";
import { FLOAT_IDLE_MS, FLOAT_KNOB_DRAG_PX } from "../../controller/feel.ts";

export interface BareFloatWinSpec {
  /** 窗的身份（探针按 data-win 找）。 */
  id: string;
  /** 给读屏和圆钮的 title。 */
  label: string;
  /** 左上圆钮 / 收起后那颗的图标（图标库的名字）。 */
  icon: string;
  /** 「…」菜单（每次打开现取）。 */
  more?: { items(): PopupMenuItem<string>[]; onPick(id: string): void | "keep" };
  /** 最小宽高。 */
  min: { w: number; h: number };
  onOpenChange?(open: boolean): void;
}
export interface BareFloatWin {
  readonly el: HTMLElement;
  /** 内容区（贴满整扇窗）。 */
  readonly body: HTMLElement;
  /** 开（开着 = 置顶）；第一次开挨着 anchor 摆（右对齐、在它下面）。 */
  open(anchor: HTMLElement): void;
  close(): void;
  toggle(anchor: HTMLElement): void;
  isOpen(): boolean;
  collapsed(): boolean;
  setCollapsed(on: boolean): void;
}

/** 屏底被占掉的高度：底部抽屉（styles.css --drawer-h）和软键盘（visualViewport 盖不到的那一截），取大的。 */
export function screenBottomFloor(): number {
  let drawer = 0;
  try { drawer = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--drawer-h")) || 0; } catch { drawer = 0; }
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const kb = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;
  return Math.max(drawer, kb);
}

export function createBareFloatWin(spec: BareFloatWinSpec): BareFloatWin {
  const el = document.createElement("div"); el.className = "float-win bare-win"; el.dataset.win = spec.id; el.hidden = true; el.setAttribute("aria-label", spec.label);
  const body = document.createElement("div"); body.className = "bare-body";
  const knob = document.createElement("button"); knob.type = "button"; knob.className = "bare-knob"; knob.title = `${spec.label}（点一下收起，按住拖挪地方）`; knob.setAttribute("aria-label", spec.label);
  knob.innerHTML = `<span class="bare-dot">${iconHtml(spec.icon)}</span>`;
  const more = document.createElement("button"); more.type = "button"; more.className = "bare-btn bare-more"; more.title = "更多"; more.setAttribute("aria-label", "更多"); more.innerHTML = `<span class="bare-dot">…</span>`; more.hidden = !spec.more;
  const close = document.createElement("button"); close.type = "button"; close.className = "bare-btn bare-close"; close.title = "关"; close.setAttribute("aria-label", `关掉「${spec.label}」`); close.innerHTML = `<span class="bare-dot">×</span>`;
  const grip = document.createElement("div"); grip.className = "float-grip"; grip.setAttribute("aria-hidden", "true");
  el.append(body, knob, more, close, grip);
  document.body.appendChild(el);
  let busy = false;   // 拖窗 / 改大小中：不淡
  const win: FloatingWindowHandle = registerFloatingWindow(el, {
    id: spec.id, bottomFloor: screenBottomFloor,
    resize: { grip, min: spec.min },
    onOpenChange: (open) => { if (open) poke(); spec.onOpenChange?.(open); },
  });
  // —— 闲置淡出 ——
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const poke = (): void => { el.classList.remove("idle"); if (idleTimer) clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!busy) el.classList.add("idle"); }, FLOAT_IDLE_MS); };
  el.addEventListener("pointerdown", poke, { capture: true });
  el.addEventListener("pointermove", poke, { capture: true, passive: true });
  if (typeof matchMedia === "function" && matchMedia("(hover: hover)").matches) {
    el.addEventListener("pointerenter", () => el.classList.remove("away"));
    el.addEventListener("pointerleave", () => { if (!busy) el.classList.add("away"); });
  }
  grip.addEventListener("pointerdown", () => { busy = true; }, { capture: true });
  const unbusy = (): void => { busy = false; poke(); };
  grip.addEventListener("pointerup", unbusy); grip.addEventListener("pointercancel", unbusy);
  // —— 左上圆钮：点 = 收起 / 恢复；动过门槛 = 挪窗 ——
  let d: { id: number; sx: number; sy: number; ol: number; ot: number; moved: boolean } | null = null;
  knob.addEventListener("pointerdown", (e) => {
    const r = el.getBoundingClientRect();
    d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ol: r.left, ot: r.top, moved: false };
    busy = true;
    try { knob.setPointerCapture(e.pointerId); } catch { /* 测试环境 */ }
    e.preventDefault();
  });
  knob.addEventListener("pointermove", (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < FLOAT_KNOB_DRAG_PX) return;
    d.moved = true;
    win.restore({ left: d.ol + dx, top: d.ot + dy });   // 钳过的（顶地板、底地板、左右）
  });
  const knobUp = (e: PointerEvent): void => {
    if (!d || e.pointerId !== d.id) return;
    try { knob.releasePointerCapture(e.pointerId); } catch { /* 测试环境 */ }
    const moved = d.moved; d = null; busy = false; poke();
    if (!moved && e.type === "pointerup") setCollapsed(!collapsedNow);
  };
  knob.addEventListener("pointerup", knobUp); knob.addEventListener("pointercancel", knobUp);
  // —— 收起 / 恢复：位置不动（左上角对齐），宽高留在行内样式里，类名一摘就回来 ——
  let collapsedNow = false;
  const setCollapsed = (on: boolean): void => { collapsedNow = on; el.classList.toggle("collapsed", on); win.clamp(); };
  // —— 右上两颗 ——
  more.addEventListener("click", () => { if (spec.more) openPopupMenu<string>({ anchor: more, align: "end", items: () => spec.more!.items(), onPick: (id) => spec.more!.onPick(id) }); });
  close.addEventListener("click", () => win.close());
  let placed = false;
  return {
    el, body,
    open(anchor) {
      const was = win.isOpen();
      win.open();
      if (!was && !placed) { const a = anchor.getBoundingClientRect(), w = el.offsetWidth || 440; win.restore({ left: a.right - w, top: a.bottom + 6 }); placed = true; }   // 第一次挨着钮；之后照这一次打开期间最后的位置
      win.clamp();
    },
    close: () => win.close(),
    toggle(anchor) { if (win.isOpen()) win.close(); else this.open(anchor); },
    isOpen: () => win.isOpen(),
    collapsed: () => collapsedNow,
    setCollapsed,
  };
}
