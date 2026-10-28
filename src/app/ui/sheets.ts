// sheets.ts —— in-app 模态原语：busy 遮罩 / 确认 / 输入 / 多选。守家规「禁系统 alert/prompt/confirm」（Quest 沉浸态弹不出）。
// 形状照抄 JRB src/sheets.ts（2026-09-19，源自 WXHW/WeebPaint）；纯 DOM，自持元素引用。created 2026-09-20 by Claude Fable 5.1
// busy/sheet 互斥护栏（WeebPaint 2026-06-12 死锁修复）：busy 遮罩盖住输入框 → await 永不 resolve → 交互 sheet 在 busy 中响亮 throw。

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

const g = {
  sheet: () => $("sheet"),
  title: () => $("sheetTitle"),
  message: () => $("sheetMessage"),
  input: () => $("sheetInput") as HTMLInputElement,
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
  g.message().hidden = true; g.message().classList.remove("warning");
  g.input().hidden = true; g.input().value = "";
  g.error().hidden = true; g.error().textContent = "";
  g.choices().hidden = true; g.choices().innerHTML = "";
  g.confirm().hidden = false; g.confirm().classList.remove("danger"); g.cancel().hidden = false;
  g.confirm().textContent = "确定"; g.cancel().textContent = "取消";
}
let _inited = false;
export function initSheets(): void {
  if (_inited) return; _inited = true;
  g.sheet().addEventListener("click", (e) => { if (e.target === g.sheet()) _open?.(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && _open && !e.defaultPrevented) { e.preventDefault(); _open(); } }, true);
}

export interface ConfirmOpts { danger?: boolean; okLabel?: string; cancelLabel?: string; warning?: boolean }
export function openConfirmSheet(title: string, message: string, opts: ConfirmOpts = {}): Promise<boolean> {
  _assertNotBusy("confirm");
  return new Promise((resolve) => {
    _reset();
    g.title().textContent = title;
    g.message().textContent = message; g.message().hidden = false; g.message().classList.toggle("warning", !!opts.warning);
    if (opts.okLabel) g.confirm().textContent = opts.okLabel;
    if (opts.cancelLabel) g.cancel().textContent = opts.cancelLabel;
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

/** 表单 sheet 的一行：几个选项选一个（分段钮）；hidden(当前值) = true 时这一行不露（如 OBJ 没有贴图 / 边线可选）。 */
export interface FormField { key: string; label: string; options: readonly { value: string; label: string }[]; value: string; hidden?: (v: Readonly<Record<string, string>>) => boolean }
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
          b.addEventListener("click", () => { vals[f.key] = o.value; render(); });
          seg.appendChild(b);
        }
        row.appendChild(seg); box.appendChild(row);
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

