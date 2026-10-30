// ui/menu-window.ts —— 一扇装着菜单的常驻浮窗（视图 / 物件）。created 2026-10-30 by Claude Opus 5.5
// user 10-29「我建议是视图 物体 都做成可以常驻的浮窗吧，只有主菜单是菜单型的」「浮窗的时候你可以学一下weebpaint……尽量深模块窄接口地去做」。
// 拼法：浮窗的一生 = ui/floating-window.ts（WeebPaint 同款深模块）；里面的菜单 = popup-menu.ts mountMenuPanel（和弹出菜单同一份画法）；
// 本文件只多三样：标题栏 + 关闭钮、第一次开的默认位置（挨着钮）、位置记在哪（调用方给 store）。
// 刷新：调用方每次界面刷新都可以叫 refresh()——只在菜单内容真的变了时才重画；下拉层开着时不重画（不把正在用的下拉抽掉）；页签变了（某页出现 / 消失）就整个重挂。
import { mountMenuPanel, type MenuPanelHandle, type PopupMenuOpts } from "./popup-menu.ts";
import { registerFloatingWindow, type FloatingWindowHandle, type PanelPos } from "./floating-window.ts";
import { choiceLayerOpen } from "./choice-layer.ts";

/** 第一次开的默认位置：start / end = 在钮下面、左 / 右对齐；beside = 在钮（一整列挂件）的左边、顶对齐——不盖住它。 */
export type Align = "start" | "end" | "beside";
export type MenuSpec<Id extends string> = Pick<PopupMenuOpts<Id>, "items" | "onPick" | "tabs" | "tabKey">;
export interface MenuWindowSpec<Id extends string> {
  /** 窗的身份（位置按它记；探针按 data-win 找）。 */
  id: string;
  title: string;
  /** 菜单（每次刷新现取：页签可能跟现状变，比如修复页只在硬表面体里有）。 */
  menu: () => MenuSpec<Id>;
  /** 位置记在哪（CatsUp = 这台设备）。null = 没记过 → 第一次开挨着钮。 */
  store: { get(id: string): PanelPos | null; set(id: string, pos: PanelPos): void };
  /** 开关的回声（钮的按下态）。 */
  onOpenChange?(open: boolean): void;
}
export interface MenuWindowHandle {
  /** 开（开着 = 置顶）；tab = 直接停在这一页；anchor = 第一次开挨着谁。 */
  open(anchor: HTMLElement, align?: Align, tab?: string): void;
  /** 开着 = 关，关着 = 开。 */
  toggle(anchor: HTMLElement, align?: Align): void;
  close(): void;
  isOpen(): boolean;
  /** 现状可能变了：内容变了才重画。force = 从这扇窗里开出来的下拉自己要求的（下拉开着也重画，摘要跟着变）；不给 = 界面例行刷新（下拉开着就先不动，免得抽掉正在用的下拉）。 */
  refresh(force?: boolean): void;
  readonly el: HTMLElement;
}

export function createMenuWindow<Id extends string>(spec: MenuWindowSpec<Id>): MenuWindowHandle {
  const el = document.createElement("div"); el.className = "float-win"; el.dataset.win = spec.id; el.hidden = true;
  const head = document.createElement("div"); head.className = "float-head";
  const title = document.createElement("span"); title.className = "float-title"; title.textContent = spec.title;
  const close = document.createElement("button"); close.type = "button"; close.className = "float-close"; close.title = "关"; close.setAttribute("aria-label", `关掉「${spec.title}」`); close.textContent = "×";
  head.append(title, close);
  const body = document.createElement("div"); body.className = "menu-panel float-body"; body.setAttribute("role", "menu");   // 不冒充 .popup-menu（那是一次性弹出层的类名：外点关 / 探针按它认弹出菜单）
  el.append(head, body);
  document.body.appendChild(el);
  const win: FloatingWindowHandle = registerFloatingWindow(el, {
    id: spec.id, head, ignoreDragOn: (t) => t === close || close.contains(t),
    onMove: (pos) => spec.store.set(spec.id, pos),
    onOpenChange: (open) => { if (!open) unmount(); spec.onOpenChange?.(open); },
  });
  close.addEventListener("click", () => win.close());

  let panel: MenuPanelHandle | null = null, tabsKey = "", sig = "";
  const signature = (m: MenuSpec<Id>): string => { try { return JSON.stringify(m.items()); } catch { return String(Math.random()); } };
  const unmount = (): void => { panel?.dispose(); panel = null; tabsKey = ""; sig = ""; };
  const mount = (tab?: string): void => {
    const m = spec.menu();
    unmount();
    tabsKey = (m.tabs ?? []).map((t) => t.id).join("|"); sig = signature(m);
    body.classList.toggle("has-tabs", tabsKey !== "");
    panel = mountMenuPanel<Id>(body, { ...m, ...(tab ? { tab } : {}), onPick: (id) => { const r = m.onPick(id); sig = signature(spec.menu()); return r; } });
  };
  const place = (anchor: HTMLElement, align: Align): void => {
    const saved = spec.store.get(spec.id);
    if (saved) { win.restore(saved); return; }
    const a = anchor.getBoundingClientRect(), w = el.offsetWidth || 300;
    win.restore(align === "beside" ? { left: a.left - w - 8, top: a.top } : { left: align === "end" ? a.right - w : a.left, top: a.bottom + 6 });
  };
  const handle: MenuWindowHandle = {
    el,
    open(anchor, align = "end", tab) {
      const wasOpen = win.isOpen();
      if (!wasOpen || tab) mount(tab);
      win.open();   // 先露出来才量得到尺寸
      if (!wasOpen) { place(anchor, align); win.clamp(); }
    },
    toggle(anchor, align = "end") { if (win.isOpen()) win.close(); else handle.open(anchor, align); },
    close: () => win.close(),
    isOpen: () => win.isOpen(),
    refresh(force = false) {
      if (!win.isOpen() || !panel || (!force && choiceLayerOpen())) return;
      const m = spec.menu(), tk = (m.tabs ?? []).map((t) => t.id).join("|");
      if (tk !== tabsKey) { mount(); win.clamp(); return; }
      const s = signature(m);
      if (s !== sig) { sig = s; panel.refresh(); win.clamp(); }
    },
  };
  return handle;
}
