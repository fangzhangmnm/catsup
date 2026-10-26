// vcb.ts —— 数值小窗的壳：底右 HUD 胶囊回显 + 桌面键盘直打 + 触屏自家数字键盘（不是 <input>，所以永远不弹系统软键盘）。
// created 2026-10-21 by Claude Fable 5.1（#11；user「我希望触屏上有数字键盘，而不是弹软键盘」）。
// 规则：刚做完一步（editor.vcbState().kind 非空）时，桌面上按数字 / . / , / - / / / * 直接开始输入（字母只在缓冲非空时进小窗，
// 所以 X / S / M 还是工具快捷键）；Enter 应用、Esc 清空、Backspace 删一位。触屏：点小窗展开键盘。
import type { Editor } from "../editor/editor.ts";
import { padUnitKeys } from "../editor/vcb.ts";
import { showNotice } from "./ui/notice.ts";
import { fieldControl } from "./ui/field-control.ts";

export interface VcbUi { render(): void; feedKey(ev: KeyboardEvent): boolean; }

const KEYS: readonly (readonly string[])[] = [
  ["7", "8", "9", "⌫"],
  ["4", "5", "6", ","],
  ["1", "2", "3", "-"],
  ["0", ".", "x", "/"],
];
const LAST_ROW: readonly string[] = ["清空", "↵"];

export function mountVcb(root: HTMLElement, editor: Editor): VcbUi {
  let buf = "";
  let padOpen = false;
  // 参数区（参数小窗，user 2026-10-25「把右下角的数值小窗扩成一个「参数小窗」 同意」）：马前炮 = 指令执行前的选项 + 应用 / 取消；马后炮 = 刚做完那一步还能改的选项
  const params = document.createElement("div"); params.className = "vcb-params"; params.hidden = true;
  const label = document.createElement("span"); label.className = "vcb-label";
  const field = document.createElement("button"); field.type = "button"; field.className = "vcb-field"; field.title = "数值小窗：输入精确值（点开键盘）";
  const pad = document.createElement("div"); pad.className = "vcb-pad"; pad.hidden = true;
  // 上下文选项那段（#toolStrip，context-bar.ts 往里画）是 root 里原有的子节点：挪到最下面（贴角、位置稳）
  const strip = root.querySelector<HTMLElement>("#toolStrip");
  root.append(params, label, field, pad);
  if (strip) root.appendChild(strip);
  const keyRow = (row: readonly string[]): HTMLElement => {
    const r = document.createElement("div"); r.className = "vcb-row";
    for (const k of row) {
      const b = document.createElement("button"); b.type = "button"; b.className = "vcb-key" + (k === "↵" ? " primary" : k === "清空" ? " wide" : ""); b.textContent = k;
      b.addEventListener("click", () => press(k));
      r.appendChild(b);
    }
    return r;
  };
  for (const row of KEYS) pad.appendChild(keyRow(row));
  // 单位键那几行跟着这一步收什么 + 当前单位换（user 2026-10-25「小键盘应该跟着公制英制度变换」）；签名变了才重建
  const unitRows = document.createElement("div"); unitRows.className = "vcb-pad-units";
  pad.append(unitRows, keyRow(LAST_ROW));
  let unitSig = "";
  const renderUnits = (): void => {
    const kind = editor.vcbState().kind;
    const keys = kind ? padUnitKeys(kind, editor.vcbUnit) : [];
    const sig = keys.join("|");
    if (sig === unitSig) return;
    unitSig = sig;
    unitRows.replaceChildren();
    for (let i = 0; i < keys.length; i += 4) unitRows.appendChild(keyRow(keys.slice(i, i + 4)));
  };
  const press = (k: string): void => {
    if (k === "⌫") buf = buf.slice(0, -1);
    else if (k === "清空") buf = "";
    else if (k === "↵") apply();
    else if (k === "空格") buf += " ";
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
  const renderParams = (): boolean => {
    const pp = editor.paramPanel();
    params.hidden = !pp;
    params.replaceChildren();
    if (!pp) return false;
    const head = document.createElement("div"); head.className = "vcb-params-title"; head.textContent = (pp.phase === "after" ? "刚才：" : "") + pp.title; params.appendChild(head);
    const row = document.createElement("div"); row.className = "vcb-params-fields";
    for (const f of pp.fields) row.appendChild(fieldControl(f.def, pp.values[f.key], (v) => { editor.setParam(f.key, v); render(); }));
    params.appendChild(row);
    if (pp.buttons.length) {
      const br = document.createElement("div"); br.className = "vcb-params-buttons";
      for (const bt of pp.buttons) {
        const b = document.createElement("button"); b.type = "button"; b.className = "strip-action" + (bt.primary ? " primary" : "") + (bt.on ? " on" : ""); b.textContent = bt.label;
        b.addEventListener("click", () => { editor.pressParam(bt.key); render(); });
        br.appendChild(b);
      }
      params.appendChild(br);
    }
    return true;
  };
  const render = (): void => {
    const st = editor.vcbState();
    const hasParams = renderParams();
    root.hidden = !st.kind && !buf && !hasParams && (!strip || strip.hidden);
    const showNum = !!st.kind || !!buf;
    label.hidden = field.hidden = !showNum;
    label.textContent = st.prompt;
    field.textContent = buf || st.echo || "…";
    field.classList.toggle("typing", !!buf);
    pad.hidden = !padOpen || !st.kind;
    if (!pad.hidden) renderUnits();
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
    const cont = /^[0-9.,\-+*/xsmc°'"ftindeg ]$/i.test(k);   // 接着打：单位后缀（m / cm / mm / ft / in / ' / " / ° / deg）、段数 s、英制分数里的空格
    if (starter || (buf && cont)) { buf += k; render(); return true; }
    return false;
  };
  render();
  return { render, feedKey };
}
