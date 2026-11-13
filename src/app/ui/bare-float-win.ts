// ui/bare-float-win.ts —— 没有标题栏的浮窗（画画手感账 P-10：画布小窗；user 11-11「还是参考参考小窗吧，拖动的东西做成一个和这个语义一样的图标，点一下可以收起来」）。
// created 2026-11-11 by Claude Opus 5.5。2026-11-11 晚（施工单十七 / 家族周账 F-253）：壳的四样零件搬进界面零件库 @internal/workbench-elements 0.2.0 的 float-window
//   （左上圆钮：点 = 收起 / 恢复、按住动过 4 px = 挪窗；收成 44 px 小图标；右下斜纹角；闲置淡出）——这里只剩三维自己的：
//   · 右上两颗圆钮「…」（菜单）和 ×（关），带 wbe-float-part = 跟着壳一起淡、收起时藏；
//   · 底地板 = 底部抽屉（--drawer-h）和软键盘占掉的高度（三维的布局知识）；
//   · 第一次开挨着钮摆（右对齐、在它下面）。
// 收没收起、位置、大小：只在这一次打开期间记着（不写设备，不写文件）。
import { registerFloatingWindow, type FloatingWindowHandle } from "./float-host.ts";
import { openPopupMenu, type PopupMenuItem } from "./popup-menu.ts";

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
  /** 第一次打开放哪：anchor（缺省）= 挨着钮；left = 靠左、让开左边的工具柱（跟着选中的东西变的面板，不是一块视图——user 11-12「画布小窗应该放在左侧而不是右侧？因为是context aware panel，不是viewport」）。 */
  firstSide?: "anchor" | "left";
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

/**
 * 第一次开在左边（firstSide: "left"）时放在哪、多宽：左边 = 左侧露着的那几列（工具柱、绘制工作台的滑杆那一列）最右的那条边 + 8，
 * 宽 = 原来的宽和「到右边视图那一列左边 − 8」里小的那个，上边不高于左上那行「在哪一层」（露着时）的下沿 + 6
 * （不盖住左边的工具、右边的视图钮、左上的层级；2026-11-13 iPad 竖屏 656 × 1000 量过：以前只躲工具柱，盖住了滑杆上半截）。
 */
function firstLeftBox(w: number): { left: number; width: number; topMin: number } {
  const shown = (sel: string): DOMRect | null => { const el = document.querySelector<HTMLElement>(sel); if (!el || el.hidden) return null; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };
  const lefts = [shown(".hud-rail-tools"), shown(".left-dial")].filter((r): r is DOMRect => r !== null);
  const left = lefts.length ? Math.max(...lefts.map((r) => r.right)) + 8 : 12, gz = shown(".hud-gizmo");
  const cr = shown("#crumbs");
  return { left, width: gz && gz.left > left ? Math.min(w, gz.left - 8 - left) : w, topMin: cr ? cr.bottom + 6 : 0 };
}

export function createBareFloatWin(spec: BareFloatWinSpec): BareFloatWin {
  const el = document.createElement("div"); el.className = "float-win bare-win"; el.dataset.win = spec.id; el.hidden = true; el.setAttribute("aria-label", spec.label);
  const body = document.createElement("div"); body.className = "bare-body";
  const corner = (cls: string, title: string, aria: string, glyph: string): HTMLButtonElement => {
    const b = document.createElement("button"); b.type = "button"; b.className = `bare-btn ${cls} wbe-float-part`; b.title = title; b.setAttribute("aria-label", aria);
    b.innerHTML = `<span class="wbe-float-dot">${glyph}</span>`; return b;
  };
  const more = corner("bare-more", "更多", "更多", "…"); more.hidden = !spec.more;
  const close = corner("bare-close", "关", `关掉「${spec.label}」`, "×");
  el.append(body, more, close);
  document.body.appendChild(el);
  const win: FloatingWindowHandle = registerFloatingWindow(el, {
    id: spec.id, bottomFloor: screenBottomFloor,
    resize: { grip: null, min: spec.min },
    onOpenChange: (open) => spec.onOpenChange?.(open),
    shell: {
      knob: { icon: spec.icon, label: spec.label, hint: `${spec.label}（点一下收起，按住拖挪地方）` },
      collapsible: { restoreLabel: spec.label, restoreHint: `${spec.label}（点一下展开，按住拖挪地方）` },
      corner: true, fade: true,
    },
  });
  more.addEventListener("click", () => { if (spec.more) openPopupMenu<string>({ anchor: more, align: "end", items: () => spec.more!.items(), onPick: (id) => spec.more!.onPick(id) }); });
  close.addEventListener("click", () => win.close());
  let placed = false;
  return {
    el, body,
    open(anchor) {
      const was = win.isOpen();
      win.open();
      if (!was && !placed) { const a = anchor.getBoundingClientRect(), w = el.offsetWidth || 440; if (spec.firstSide === "left") { const f = firstLeftBox(w); win.restore({ left: f.left, top: Math.max(a.bottom + 6, f.topMin), ...(f.width < w ? { width: f.width } : {}) }); } else win.restore({ left: a.right - w, top: a.bottom + 6 }); placed = true; }   // 第一次挨着钮；之后照这一次打开期间最后的位置
      win.clamp();
    },
    close: () => win.close(),
    toggle(anchor) { if (win.isOpen()) win.close(); else this.open(anchor); },
    isOpen: () => win.isOpen(),
    collapsed: () => win.collapsed(),
    setCollapsed: (on) => win.setCollapsed(on),
  };
}
