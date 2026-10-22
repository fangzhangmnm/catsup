// vcb.ts —— 数值小窗的壳：底右 HUD 胶囊回显 + 桌面键盘直打 + 触屏自家数字键盘（不是 <input>，所以永远不弹系统软键盘）。
// created 2026-10-21 by Claude Fable 5.1（#11；user「我希望触屏上有数字键盘，而不是弹软键盘」）。
// 规则：刚做完一步（editor.vcbState().kind 非空）时，桌面上按数字 / . / , / - / / / * 直接开始输入（字母只在缓冲非空时进小窗，
// 所以 X / S / M 还是工具快捷键）；Enter 应用、Esc 清空、Backspace 删一位。触屏：点小窗展开键盘。
import type { Editor } from "../editor/editor.ts";
import { showNotice } from "./ui/notice.ts";

export interface VcbUi { render(): void; feedKey(ev: KeyboardEvent): boolean; }

const KEYS: readonly (readonly string[])[] = [
  ["7", "8", "9", "⌫"],
  ["4", "5", "6", ","],
  ["1", "2", "3", "-"],
  ["0", ".", "x", "/"],
  ["s", "m", "cm", "mm"],
  ["清空", "↵"],
];

export function mountVcb(root: HTMLElement, editor: Editor): VcbUi {
  let buf = "";
  let padOpen = false;
  const label = document.createElement("span"); label.className = "vcb-label";
  const field = document.createElement("button"); field.type = "button"; field.className = "vcb-field"; field.title = "数值小窗：输入精确值（点开键盘）";
  const pad = document.createElement("div"); pad.className = "vcb-pad"; pad.hidden = true;
  root.append(label, field, pad);
  for (const row of KEYS) {
    const r = document.createElement("div"); r.className = "vcb-row";
    for (const k of row) {
      const b = document.createElement("button"); b.type = "button"; b.className = "vcb-key" + (k === "↵" ? " primary" : k === "清空" ? " wide" : ""); b.textContent = k;
      b.addEventListener("click", () => press(k));
      r.appendChild(b);
    }
    pad.appendChild(r);
  }
  const press = (k: string): void => {
    if (k === "⌫") buf = buf.slice(0, -1);
    else if (k === "清空") buf = "";
    else if (k === "↵") apply();
    else buf += k;
    render();
  };
  const apply = (): void => {
    const text = buf.trim();
    if (!text) return;
    const r = editor.applyVcb(text);
    if (r.ok) { buf = ""; padOpen = false; showNotice({ id: "vcb", text: r.message, level: "info" }); }
    else showNotice({ id: "vcb", text: r.error, level: "warning" });
    render();
  };
  const render = (): void => {
    const st = editor.vcbState();
    root.hidden = !st.kind && !buf;
    label.textContent = st.prompt;
    field.textContent = buf || st.echo || "…";
    field.classList.toggle("typing", !!buf);
    pad.hidden = !padOpen || !st.kind;
  };
  field.addEventListener("click", () => { padOpen = !padOpen; render(); });
  const feedKey = (ev: KeyboardEvent): boolean => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
    const st = editor.vcbState();
    if (!st.kind) return false;
    const k = ev.key;
    if (k === "Enter") { if (!buf) return false; apply(); return true; }
    if (k === "Escape") { if (!buf) return false; buf = ""; render(); return true; }
    if (k === "Backspace") { if (!buf) return false; buf = buf.slice(0, -1); render(); return true; }
    const starter = /^[0-9.,\-+*/]$/.test(k);
    const cont = /^[0-9.,\-+*/xsmc°]$/i.test(k);
    if (starter || (buf && cont)) { buf += k; render(); return true; }
    return false;
  };
  render();
  return { render, feedKey };
}
