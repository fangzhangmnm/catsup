// sel-grow-bar.ts —— 扩 / 缩选区的拖动条（选择工具「再点一下选区」出来的那个；ai-docs/20261027-gizmo-design.md §7）。created 2026-10-28 by Claude Opus 5.5
// user 10-28 夜「4我不是说了是select按第二次的的gizmos吗，做」；更早「拖动的时候就是expand/shrink选区……这样就回答了」。
// 一颗低调的小胶囊，出在点的那一下下面：− ｜ 拖条 ｜ +。拖条往右拖 = 一圈一圈扩、往左 = 缩（每 28 px 一圈）；松手 = 一步（能撤销）。± 点一下 = 一圈。
// 点别处 / 换工具 / 没选区了 = 收（选择工具点别处时会叫 hide；app 的 syncUi 兜底）。
import type { Editor } from "../editor/editor.ts";

const STEP_PX = 28;
export interface SelGrowBar { show(at: { x: number; y: number } | null): void; sync(): void }

export function mountSelGrowBar(canvas: HTMLElement, editor: Editor, after: () => void): SelGrowBar {
  const el = document.createElement("div"); el.className = "selgrow"; el.hidden = true; el.setAttribute("role", "toolbar"); el.setAttribute("aria-label", "扩 / 缩选区");
  const minus = document.createElement("button"); minus.type = "button"; minus.className = "selgrow-btn"; minus.textContent = "−"; minus.title = "缩一圈";
  const track = document.createElement("div"); track.className = "selgrow-track"; track.title = "往右拖 = 一圈一圈扩，往左 = 缩";
  const knob = document.createElement("span"); knob.className = "selgrow-knob"; track.appendChild(knob);
  const label = document.createElement("span"); label.className = "selgrow-label"; label.textContent = "扩 / 缩";
  const plus = document.createElement("button"); plus.type = "button"; plus.className = "selgrow-btn"; plus.textContent = "+"; plus.title = "扩一圈";
  el.append(minus, track, label, plus);
  document.body.appendChild(el);
  const once = (d: number): void => { if (!editor.selGrowBegin()) return; editor.selGrowTo(d); editor.selGrowEnd(); after(); };
  minus.addEventListener("click", (e) => { e.stopPropagation(); once(-1); });
  plus.addEventListener("click", (e) => { e.stopPropagation(); once(1); });
  let drag: { id: number; x0: number } | null = null;
  track.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); if (!editor.selGrowBegin()) return; drag = { id: e.pointerId, x0: e.clientX }; track.setPointerCapture(e.pointerId); });
  track.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0, steps = Math.round(dx / STEP_PX);
    knob.style.transform = `translateX(${Math.max(-40, Math.min(40, dx))}px)`;
    editor.selGrowTo(steps); label.textContent = steps === 0 ? "扩 / 缩" : steps > 0 ? `扩 ${steps} 圈` : `缩 ${-steps} 圈`;
  });
  const end = (e: PointerEvent): void => { if (!drag || e.pointerId !== drag.id) return; drag = null; knob.style.transform = ""; label.textContent = "扩 / 缩"; editor.selGrowEnd(); after(); };
  track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
  const show = (at: { x: number; y: number } | null): void => {
    el.hidden = !at;
    if (!at) return;
    const r = canvas.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(window.innerWidth - 200, r.left + at.x - 90))}px`;
    el.style.top = `${Math.max(8, Math.min(window.innerHeight - 50, r.top + at.y + 24))}px`;
  };
  const sync = (): void => { if (!el.hidden && (editor.tool !== "select" || editor.modeId !== "freeform" || !editor.hasSelection())) show(null); };
  return { show, sync };
}
