// command-board.ts —— 指令板（浮板）：一台机器一块，一次只开一块（UX 心智模型 §8 补 4 / 账本 UX41；接线清单第 12 条）。created 2026-10-28 by Claude Opus 5.5
// user 10-28：「大机器我觉得还是一个指令板，因为大机器不是一个状态，而是一组UX状态机。一个子工作流 大机器上面的东西都只是路由到指令罢了」「我还是倾向于能拖动」
// 「一次只能一台指令板同意」「手机竖屏…降级成底部不锁屏的抽屉 同意，和物品栏抢占同一个地方」。
// 这一层只管「板」：浮在画面上、能拖（按住标题拖，夹在屏幕里）、长按标题 = 归位、位置按板记在这台设备上；手机竖屏 = 底部不锁屏的抽屉（半高、自己滚、不拖）。
// 板上放什么 = 调用方给的 body（machine-window.ts：放置表那一面的指令 + 正在用的指令的参数区）。不是模态：画布、左栏照常能用。
import { LONG_PRESS_MS } from "../../controller/feel.ts";

export interface BoardPosStore { get(id: string): { x: number; y: number } | null; set(id: string, p: { x: number; y: number } | null): void }
export interface BoardOpts {
  id: string;
  title: string;
  body: HTMLElement;
  /** 没记过位置时放哪（左上角坐标，CSS px）。 */
  defaultPos: () => { x: number; y: number };
  store: BoardPosStore;
  /** 关了（任何原因：关钮 / 被别的板顶掉 / 调用方关）——调一次。 */
  onClose?: () => void;
  /** 抽屉模式开了（手机竖屏）：调用方把占同一个底部位置的东西（物品栏）收起来。 */
  onDrawer?: () => void;
}
export interface BoardHandle { readonly id: string; readonly el: HTMLElement; close(): void; setTitle(t: string): void; place(): void }

let current: BoardHandle | null = null;
export function currentBoard(): BoardHandle | null { return current; }
export function closeBoard(): void { current?.close(); }
/** 手机竖屏 = 底部抽屉（短边窄、竖着拿）。 */
export const boardAsDrawer = (): boolean => Math.min(window.innerWidth, window.innerHeight) < 600 && window.innerHeight > window.innerWidth;

export function openBoard(o: BoardOpts): BoardHandle {
  current?.close();
  const el = document.createElement("div"); el.className = "board"; el.dataset.board = o.id; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "false");
  const head = document.createElement("div"); head.className = "board-head";
  const title = document.createElement("span"); title.className = "board-title"; title.textContent = o.title;
  const x = document.createElement("button"); x.type = "button"; x.className = "board-close"; x.title = "关"; x.textContent = "×";
  head.append(title, x);
  const body = document.createElement("div"); body.className = "board-body"; body.appendChild(o.body);
  el.append(head, body);
  document.body.appendChild(el);
  let open = true;
  const clamp = (p: { x: number; y: number }): { x: number; y: number } => {
    const w = el.offsetWidth || 280, h = el.offsetHeight || 200;
    return { x: Math.max(6, Math.min(window.innerWidth - w - 6, p.x)), y: Math.max(6, Math.min(window.innerHeight - Math.min(h, 120) - 6, p.y)) };
  };
  const place = (): void => {
    const drawer = boardAsDrawer();
    el.classList.toggle("board-drawer", drawer);
    if (drawer) { el.style.left = el.style.top = ""; o.onDrawer?.(); return; }
    const p = clamp(o.store.get(o.id) ?? o.defaultPos());
    el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
  };
  // 拖标题 = 挪板；长按标题（没挪动）= 归位
  let drag: { id: number; dx: number; dy: number; x0: number; y0: number; moved: boolean; timer: number } | null = null;
  head.addEventListener("pointerdown", (ev) => {
    if (boardAsDrawer() || ev.target === x || (ev.pointerType === "mouse" && ev.button !== 0)) return;
    ev.preventDefault(); head.setPointerCapture(ev.pointerId);
    const r = el.getBoundingClientRect();
    drag = { id: ev.pointerId, dx: ev.clientX - r.left, dy: ev.clientY - r.top, x0: ev.clientX, y0: ev.clientY, moved: false, timer: window.setTimeout(() => { if (drag && !drag.moved) { o.store.set(o.id, null); drag = null; place(); } }, LONG_PRESS_MS) };
  });
  head.addEventListener("pointermove", (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 6) return;
    drag.moved = true; clearTimeout(drag.timer);
    const p = clamp({ x: ev.clientX - drag.dx, y: ev.clientY - drag.dy });
    el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
  });
  const end = (ev: PointerEvent): void => {
    if (!drag || ev.pointerId !== drag.id) return;
    clearTimeout(drag.timer);
    if (drag.moved) { const r = el.getBoundingClientRect(); o.store.set(o.id, { x: r.left, y: r.top }); }
    drag = null;
  };
  head.addEventListener("pointerup", end); head.addEventListener("pointercancel", end);
  const onResize = (): void => place();
  window.addEventListener("resize", onResize);
  const h: BoardHandle = {
    id: o.id, el,
    close() { if (!open) return; open = false; window.removeEventListener("resize", onResize); el.remove(); if (current === h) current = null; o.onClose?.(); },
    setTitle(t) { title.textContent = t; },
    place,
  };
  x.addEventListener("click", () => h.close());
  current = h;
  place();
  return h;
}
