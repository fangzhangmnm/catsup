// sheets.ts —— in-app 模态原语：busy 遮罩 / 确认 / 输入 / 多选。守家规「禁系统 alert/prompt/confirm」（Quest 沉浸态弹不出）。
// 形状照抄 JRB src/sheets.ts（2026-09-19，源自 WXHW/WeebPaint）；纯 DOM，自持元素引用。created 2026-09-20 by Claude Fable 5.1
// busy/sheet 互斥护栏（WeebPaint 2026-06-12 死锁修复）：busy 遮罩盖住输入框 → await 永不 resolve → 交互 sheet 在 busy 中响亮 throw。

import { createGateStack, type GateHandle, type GateView } from "./gate-stack.ts";
import { inputGate } from "../input-dom.ts";

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`sheets: missing #${id}`);
  return el;
};

let _busyDepth = 0;
export function showBusy(label: string, hint = ""): void {
  $("busyOverlay").hidden = false;
  $("busyOverlayText").textContent = label;
  $("busyOverlayHint").textContent = hint;
}
export function hideBusy(): void { $("busyOverlay").hidden = true; }
export function isBusyActive(): boolean { return !$("busyOverlay").hidden; }
export async function withBusy<T>(label: string, fn: () => Promise<T> | T, hint = ""): Promise<T> {
  _busyDepth++;
  showBusy(label, hint);
  try { return await fn(); }
  finally { _busyDepth--; if (_busyDepth <= 0) { _busyDepth = 0; hideBusy(); } }
}
function _assertNotBusy(what: string): void {
  if (isBusyActive()) throw new Error(`sheet "${what}" opened while busy overlay is active (would deadlock) — move the interaction outside withBusy`);
}
/**
 * 同步闸门（WeebPaint lockSyncGate 同款思路；2026-10-25 Opus）：库在忙碌中途要问人（「处理…」= store file.resolve() 的三选一，图库库把它包在 busy 里）
 * → 这一个面板允许开在忙碌遮罩之上：开的时候先把遮罩收起、选完还在忙就放回去。别的面板仍守「busy 中不许开」的护栏。
 * user 2026-10-25 真机截图「没处理成：…sheet "choice" opened while busy overlay is active (would deadlock)…」。冲突必须摆出来问人（MASTER §A），这里只管让它摆得出来。
 */
export async function openGateChoiceSheet<T>(title: string, message: string, choices: Choice<T>[]): Promise<T | null> {
  const wasBusy = isBusyActive();
  if (wasBusy) hideBusy();
  try { return await openChoiceSheet(title, message, choices); }
  finally { if (wasBusy && _busyDepth > 0) $("busyOverlay").hidden = false; }
}

// ---------- 同步闸门：库替换本机字节 / 开机醒来核对网盘时罩住画面 + 锁输入（工单 C，2026-11-03 Claude Opus 5.5；形状照 WeebPaint src/sheets.ts lockSyncGate / settleSyncGate）----------
//   不可点外面关（决策只能按钮选）；能叠（核对中 → 发现要拉 → 拉取罩子顶上来；收掉上面那张，下面那张还在）。纯逻辑在 gate-stack.ts。
//   输入锁 = 输入闸的门口（app/input-dom.ts，2026-11-05 搬过去、推广到所有模态面）；闸门在下面 initSheets 里进名册，只放行闸门自己和叠在上面的面（#sheet，库的冲突面）。
let _faceGen = 0;
const _gate = createGateStack((top) => {
  const root = $("syncGate");
  if (!top) { root.hidden = true; return; }
  $("syncGateTitle").textContent = top.title;
  const msg = $("syncGateMessage"); msg.textContent = top.message ?? ""; msg.hidden = !top.message;
  const note = $("syncGateNote"); note.textContent = top.note ?? ""; note.hidden = !top.note;
  $("syncGateSpinner").hidden = !top.showSpinner;
  const actions = $("syncGateActions");
  actions.textContent = "";
  top.actions.forEach((a, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sheet-choice"; b.textContent = a.label;
    if (a.primary) b.classList.add("primary");
    b.addEventListener("click", () => _gate.pick(i));
    actions.appendChild(b);
  });
  if (root.hidden && document.activeElement instanceof HTMLElement) document.activeElement.blur();   // 输入框别留着焦点在罩子底下收字
  root.hidden = false;
});
/** 开一张闸门，拿句柄（update / close / result）。 */
export function openSyncGate<T>(view: GateView<T>): GateHandle<T> { _faceGen++; return _gate.open(view); }
/** WeebPaint 同名同形：摆出来等按钮；收掉 = null。 */
export function lockSyncGate<T>(view: GateView<T>): Promise<T | null> { _faceGen++; return _gate.open(view).result; }
/** 从外面收掉最上面那张（WeebPaint 同名同形）。 */
export function settleSyncGate(value: unknown = null): void { _gate.settleTop(value); }
/** 闸门开着 = 输入锁着。 */
export function isSyncGateUp(): boolean { return _gate.isUp(); }
/** 有面开着（闸门的罩 / 闸，或普通面板上的问题）= 人正在被问。更新重载等它（工单 C4，照 MoonSinger H2）。 */
export function isAnyFaceUp(): boolean { return _gate.isUp() || !g.sheet().hidden; }
/** 面开过多少次：等的那段时间里开过又关了，要从关的那一刻重新算。 */
export const faceGeneration = (): number => _faceGen;
export const whenFacesClosed = (): Promise<void> => new Promise((res) => { const check = (): void => { if (isAnyFaceUp()) setTimeout(check, 100); else res(); }; check(); });

const g = {
  sheet: () => $("sheet"),
  title: () => $("sheetTitle"),
  message: () => $("sheetMessage"),
  input: () => $("sheetInput") as HTMLInputElement,
  form: () => $("sheetForm") as HTMLFormElement,
  user: () => $("sheetUser") as HTMLInputElement,
  check: () => $("sheetCheck"),
  checkInput: () => $("sheetCheckInput") as HTMLInputElement,
  checkLabel: () => $("sheetCheckLabel"),
  error: () => $("sheetError"),
  choices: () => $("sheetChoices"),
  confirm: () => $("sheetConfirm") as HTMLButtonElement,
  cancel: () => $("sheetCancel") as HTMLButtonElement,
};
let _open: (() => void) | null = null;

function _show(): void { g.sheet().hidden = false; }
function _hide(): void {
  g.sheet().hidden = true;
  if (document.activeElement instanceof HTMLElement && g.sheet().contains(document.activeElement)) document.activeElement.blur();
  _open = null;
}
function _reset(): void {
  _faceGen++;
  g.message().hidden = true; g.message().classList.remove("warning");
  g.input().hidden = true; g.input().value = ""; g.input().type = "text"; g.input().removeAttribute("autocomplete"); g.user().value = "";
  g.check().hidden = true; g.checkInput().checked = false;
  g.error().hidden = true; g.error().textContent = "";
  g.choices().hidden = true; g.choices().innerHTML = "";
  g.confirm().hidden = false; g.confirm().classList.remove("danger"); g.cancel().hidden = false;
  g.confirm().textContent = "确定"; g.cancel().textContent = "取消";
}
let _inited = false;
export function initSheets(): void {
  if (_inited) return; _inited = true;
  g.sheet().addEventListener("click", (e) => { if (e.target === g.sheet()) _open?.(); });
  // 输入闸的名册（rank 对齐 styles.css 的 z 序）。Esc 归最上面那张面、不往下传（闸的 escape，app/input-dom.ts）
  inputGate.face({ kind: "face", label: "处理中", rank: 700, root: "#busyOverlay", up: isBusyActive });
  inputGate.face({ kind: "face", label: "面板", rank: 500, root: "#sheet", up: () => !g.sheet().hidden, esc: () => { if (!_open) return false; _open(); return true; } });
  inputGate.face({ kind: "face", label: "同步闸门", rank: 450, root: "#syncGate", up: () => _gate.isUp(), esc: () => {   // 闸门自己声明了 Esc 的值（「稍后」）才接；没声明 = 吞掉（决策只能按钮选）
    const top = _gate.top();
    if (!top || top.escValue === undefined) return false;
    _gate.settleTop(top.escValue);
    return true;
  } });
}

/** noCancel = 只有一颗钮（看完就关的说明，比如视图「新手提醒…」）。 */
export interface ConfirmOpts { danger?: boolean; okLabel?: string; cancelLabel?: string; warning?: boolean; noCancel?: boolean }
export function openConfirmSheet(title: string, message: string, opts: ConfirmOpts = {}): Promise<boolean> {
  _assertNotBusy("confirm");
  return new Promise((resolve) => {
    _reset();
    g.title().textContent = title;
    g.message().textContent = message; g.message().hidden = false; g.message().classList.toggle("warning", !!opts.warning);
    if (opts.okLabel) g.confirm().textContent = opts.okLabel;
    if (opts.cancelLabel) g.cancel().textContent = opts.cancelLabel;
    if (opts.noCancel) g.cancel().hidden = true;
    g.confirm().classList.toggle("danger", !!opts.danger);
    const done = (v: boolean) => { g.confirm().removeEventListener("click", onOk); g.cancel().removeEventListener("click", onCancel); _hide(); resolve(v); };
    const onOk = () => done(true), onCancel = () => done(false);
    g.confirm().addEventListener("click", onOk); g.cancel().addEventListener("click", onCancel);
    _open = onCancel; _show();
    setTimeout(() => g.confirm().focus(), 0);
  });
}

export interface InputOpts { message?: string; placeholder?: string; defaultValue?: string; okLabel?: string; validate?: (value: string) => string | null }
/** 输入 sheet → string | null（取消）。 */
export function openInputSheet(title: string, opts: InputOpts = {}): Promise<string | null> {
  _assertNotBusy("input");
  return new Promise((resolve) => {
    _reset();
    g.title().textContent = title;
    if (opts.message) { g.message().textContent = opts.message; g.message().hidden = false; }
    const inp = g.input();
    inp.hidden = false; inp.type = "text"; inp.autocomplete = "off"; inp.placeholder = opts.placeholder ?? ""; inp.value = opts.defaultValue ?? "";
    if (opts.okLabel) g.confirm().textContent = opts.okLabel;
    const cleanup = () => { g.confirm().removeEventListener("click", onOk); g.cancel().removeEventListener("click", onCancel); inp.removeEventListener("keydown", onKey); inp.value = ""; };
    const onOk = () => {
      const err = opts.validate?.(inp.value) ?? null;
      if (err) { g.error().textContent = err; g.error().hidden = false; return; }
      const v = inp.value; cleanup(); _hide(); resolve(v);
    };
    const onCancel = () => { cleanup(); _hide(); resolve(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); onOk(); } else if (e.key === "Escape") { e.preventDefault(); onCancel(); } };
    g.confirm().addEventListener("click", onOk); g.cancel().addEventListener("click", onCancel); inp.addEventListener("keydown", onKey);
    _open = onCancel; _show();
    setTimeout(() => { inp.focus(); inp.select(); }, 0);
  });
}

export interface PasswordOpts { message?: string; /** "new" = 设口令（autocomplete=new-password，密码管理器问「保存？」）；缺省 = 输入已有口令（current-password）。 */ purpose?: "current" | "new"; /** 账号字段（密码管理器按它记 / 填）：图库 id。 */ account?: string; /** 面板底下一个勾（「在这台设备上记住」）。 */ checkbox?: { label: string; checked?: boolean } }
/** 口令 sheet（2026-10-29 周账 F-123）：真表单 = type=password + autocomplete + 隐藏的账号字段 + 确定 = 提交（user 10-21「口令面板改成真表单让 Edge 密码管理器记住，全家做」）。
 *  绝不 autocomplete="off"、不禁粘贴。返回 { value, checked } | null（取消）。 */
export function openPasswordSheet(title: string, opts: PasswordOpts = {}): Promise<{ value: string; checked: boolean } | null> {
  _assertNotBusy("password");
  return new Promise((resolve) => {
    _reset();
    g.title().textContent = title;
    if (opts.message) { g.message().textContent = opts.message; g.message().hidden = false; }
    const inp = g.input();
    inp.hidden = false; inp.type = "password"; inp.setAttribute("autocomplete", opts.purpose === "new" ? "new-password" : "current-password"); inp.placeholder = "图库口令"; inp.value = "";
    g.user().value = opts.account ?? "";
    if (opts.checkbox) { g.checkLabel().textContent = opts.checkbox.label; g.checkInput().checked = !!opts.checkbox.checked; g.check().hidden = false; }
    let done = false;
    const cleanup = () => { g.form().removeEventListener("submit", onSubmit); g.confirm().removeEventListener("click", onOk); g.cancel().removeEventListener("click", onCancel); inp.removeEventListener("keydown", onKey); };
    const finish = (r: { value: string; checked: boolean } | null) => { if (done) return; done = true; cleanup(); _hide(); _reset(); resolve(r); };
    const onSubmit = (e: Event) => { e.preventDefault(); finish({ value: inp.value, checked: !!opts.checkbox && g.checkInput().checked }); };
    const onOk = () => { g.form().requestSubmit(); };   // 确定钮 = 提交；密码管理器看的就是这次提交
    const onCancel = () => finish(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); g.form().requestSubmit(); } else if (e.key === "Escape") { e.preventDefault(); onCancel(); } };
    g.form().addEventListener("submit", onSubmit); g.confirm().addEventListener("click", onOk); g.cancel().addEventListener("click", onCancel); inp.addEventListener("keydown", onKey);
    _open = onCancel; _show();
    setTimeout(() => { inp.focus(); }, 0);
  });
}

/** onPick：在按钮 click 监听器里**同步**调——iOS 的 redirect 登录必须在手势同步栈起跳。 */
export interface Choice<T> { label: string; value: T; primary?: boolean; danger?: boolean; onPick?: () => void }
export function openChoiceSheet<T>(title: string, message: string, choices: Choice<T>[]): Promise<T | null> {
  _assertNotBusy("choice");
  return new Promise((resolve) => {
    _reset();
    g.title().textContent = title;
    if (message) { g.message().textContent = message; g.message().hidden = false; }
    const box = g.choices(); box.hidden = false;
    g.confirm().hidden = true;
    const onCancel = () => { g.cancel().removeEventListener("click", onCancel); _hide(); resolve(null); };
    for (const c of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sheet-choice" + (c.primary ? " primary" : "") + (c.danger ? " danger" : "");
      btn.textContent = c.label;
      btn.addEventListener("click", () => { g.cancel().removeEventListener("click", onCancel); _hide(); c.onPick?.(); resolve(c.value); });
      box.appendChild(btn);
    }
    g.cancel().addEventListener("click", onCancel);
    _open = onCancel; _show();
  });
}

/** 一行（openRowsSheet）：label = 这一行本身；note = 下面一行小字（可以后填）；blocked = 灰掉、点不了，原因写在 note 那一行；marked = 行尾一个淡淡的记号（比如「上次用的」）。 */
export interface SheetRow<T> { label: string; value: T; note?: string; blocked?: string | null; marked?: string }
/** 面板出来之后补一行的说明 / 灰掉（大模型上一行一行算出来再填）。alive() = 面板还开着（关了就别再算）。 */
export interface RowsFill { set(i: number, patch: { note?: string; blocked?: string | null }): void; alive(): boolean }
/**
 * 几行选一行：点一下就是选了（没有确认钮）；能取消（取消钮 / Esc / 点背板 = null）。fill = 面板出来之后再一行一行补说明（不挡面板）。
 * created 2026-11-11 by Claude Opus 5.5（开始画时选画布大小：五档，每档一格多大、每层最多多大，大模型上要现铺一遍才知道）。
 */
export function openRowsSheet<T>(title: string, message: string, rows: readonly SheetRow<T>[], fill?: (f: RowsFill) => void): Promise<T | null> {
  _assertNotBusy("rows");
  return new Promise((resolve) => {
    _reset();
    const gen = _faceGen;
    g.title().textContent = title;
    if (message) { g.message().textContent = message; g.message().hidden = false; }
    const box = g.choices(); box.hidden = false;
    g.confirm().hidden = true;
    const onCancel = () => { g.cancel().removeEventListener("click", onCancel); _hide(); resolve(null); };
    const notes: HTMLElement[] = [], btns: HTMLButtonElement[] = [];
    rows.forEach((r) => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "sheet-choice sheet-row";
      const head = document.createElement("span"); head.className = "sheet-row-label"; head.textContent = r.label;
      if (r.marked) { const m = document.createElement("span"); m.className = "sheet-row-mark"; m.textContent = r.marked; head.appendChild(m); }
      const note = document.createElement("span"); note.className = "sheet-row-note"; note.textContent = r.blocked ?? r.note ?? "";
      btn.append(head, note); btn.disabled = !!r.blocked;
      btn.addEventListener("click", () => { if (btn.disabled) return; g.cancel().removeEventListener("click", onCancel); _hide(); resolve(r.value); });
      box.appendChild(btn); notes.push(note); btns.push(btn);
    });
    g.cancel().addEventListener("click", onCancel);
    _open = onCancel; _show();
    fill?.({
      alive: () => gen === _faceGen && !g.sheet().hidden,
      set: (i, p) => { if (gen !== _faceGen || !btns[i]) return; if (p.blocked !== undefined) btns[i].disabled = !!p.blocked; notes[i].textContent = p.blocked ? p.blocked : p.note ?? notes[i].textContent; },
    });
  });
}

/** 表单 sheet 的一个选项。blocked = 走不通的原因：有就灰掉、点不了，原因写在这一行分段钮下面（看得见为什么不行，不藏）。 */
export interface FormOption { value: string; label: string; blocked?: string | null }
/** 表单 sheet 的一行：几个选项选一个（分段钮）；hidden(当前值) = true 时这一行不露（如 OBJ 没有贴图 / 边线可选）。 */
export interface FormField { key: string; label: string; options: readonly FormOption[]; value: string; hidden?: (v: Readonly<Record<string, string>>) => boolean }
export interface FormOpts { okLabel?: string; note?: (v: Readonly<Record<string, string>>) => string }
/**
 * 表单 sheet → 各行的值 | null（取消 / Esc / 点背板）。模态：锁屏、认真答、答完消失（UX 心智模型 §8 补 4「模态 sheet」；导出模型就是它）。
 * 每改一个值：重画（隐藏行跟着变）+ 说明行按 note(值) 重算。created 2026-10-28 by Claude Opus 5.5
 */
export function openFormSheet(title: string, fields: readonly FormField[], opts: FormOpts = {}): Promise<Record<string, string> | null> {
  _assertNotBusy("form");
  return new Promise((resolve) => {
    _reset();
    g.title().textContent = title;
    const vals: Record<string, string> = Object.fromEntries(fields.map((f) => [f.key, f.value]));
    const box = g.choices(); box.hidden = false; box.classList.add("sheet-form");
    const render = (): void => {
      box.textContent = "";
      for (const f of fields) {
        if (f.hidden?.(vals)) continue;
        const row = document.createElement("div"); row.className = "sheet-field"; row.dataset.field = f.key;
        const lab = document.createElement("span"); lab.className = "sheet-field-label"; lab.textContent = f.label; row.appendChild(lab);
        const seg = document.createElement("div"); seg.className = "sheet-seg"; seg.setAttribute("role", "radiogroup"); seg.setAttribute("aria-label", f.label);
        for (const o of f.options) {
          const b = document.createElement("button"); b.type = "button"; b.textContent = o.label; b.dataset.value = o.value;
          b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(vals[f.key] === o.value));
          if (o.blocked) b.disabled = true; else b.addEventListener("click", () => { vals[f.key] = o.value; render(); });
          seg.appendChild(b);
        }
        row.appendChild(seg);
        for (const o of f.options) if (o.blocked) { const why = document.createElement("div"); why.className = "sheet-field-why"; why.textContent = `${o.label}：${o.blocked}`; row.appendChild(why); }
        box.appendChild(row);
      }
      const n = opts.note?.(vals) ?? "";
      g.message().textContent = n; g.message().hidden = !n;
    };
    if (opts.okLabel) g.confirm().textContent = opts.okLabel;
    const done = (v: Record<string, string> | null): void => { g.confirm().removeEventListener("click", onOk); g.cancel().removeEventListener("click", onCancel); box.classList.remove("sheet-form"); _hide(); resolve(v); };
    const onOk = (): void => { const out: Record<string, string> = {}; for (const f of fields) if (!f.hidden?.(vals)) out[f.key] = vals[f.key]; done(out); };
    const onCancel = (): void => done(null);
    g.confirm().addEventListener("click", onOk); g.cancel().addEventListener("click", onCancel);
    render();
    _open = onCancel; _show();
    setTimeout(() => g.confirm().focus(), 0);
  });
}

