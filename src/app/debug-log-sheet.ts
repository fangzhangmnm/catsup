// debug-log-sheet.ts —— 菜单「调试日志」sheet：看 + 复制 + 分享/下载 + 清空（数据源 = debug-log.ts）。WeebPaint diag-log-sheet.ts 同形。
// created 2026-09-20 by Claude Fable 5.1
// 复制 = 三级回退：navigator.clipboard.writeText（手势内）→ 隐藏 textarea + execCommand("copy") → 选中 <pre> 让用户长按复制。
// 分享 = Web Share **.txt 文件**（iPad 直接发给文件 / AirDrop / 邮件；微信/QQ 不吃 60 KB 长文本——WeebPaint 09-06 教训）；只在触屏设备分享，Windows 等电脑 = 下载（2026-10-29）；
//   没有 navigator.share（桌面）→ 钮变「下载 .txt」。反馈写进 sheet 自己的提示行（无系统弹窗，家规）。
import { deliverFile, preferShare } from "./share-or-download.ts";
import { entries, toText, clear } from "./debug-log.ts";
import { reportError } from "./error-funnel.ts";
import { count as reproCount, toJson as reproJson, exportJson, lastStepEntry } from "./repro-box.ts";

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`debug-log-sheet: missing #${id}`);
  return el;
};

let _open: (() => void) | null = null;
let _close: (() => void) | null = null;
/** 别处（图库卡住态钮 / 快捷键）也能开。 */
export function openDebugLogSheet(): void { _open?.(); }
export function closeDebugLogSheet(): void { _close?.(); }
export function isDebugLogOpen(): boolean { return !$("debugLog").hidden; }

let _lastStep: (() => Parameters<typeof lastStepEntry>[0] | null) | null = null;
/** 宿主递「上一步」提供者（Editor.lastStep）；没递 = 没那个钮。 */
export function setLastStepProvider(fn: () => Parameters<typeof lastStepEntry>[0] | null): void { _lastStep = fn; }

export function initDebugLogSheet(): void {
  const sheet = $("debugLog"), pre = $("debugLogText"), hint = $("debugLogHint");
  const copyBtn = $("debugLogCopy"), shareBtn = $("debugLogShare"), clearBtn = $("debugLogClear"), closeBtn = $("debugLogClose"), reproBtn = $("debugLogRepro"), lastBtn = $("debugLogLastStep");

  function render(): void {
    const n = entries().length;
    const r = reproCount();
    reproBtn.hidden = r === 0;
    reproBtn.textContent = `复现包 (${r})`;
    lastBtn.hidden = !_lastStep?.();
    hint.textContent = `共 ${n} 条（旧在上、新在下）· 复制或分享给开发者${r ? ` · 本次有 ${r} 条内核拒绝的复现包（关窗即清）` : ""}`;
    pre.textContent = n ? toText() : "（空）";
    pre.scrollTop = pre.scrollHeight;   // 最新在底
  }
  const say = (msg: string): void => { hint.textContent = msg; };
  function open(): void { render(); sheet.hidden = false; }
  function close(): void { sheet.hidden = true; }
  _open = open; _close = close;

  function copyViaTextarea(text: string): boolean {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.left = "-9999px"; ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
  async function copy(): Promise<void> {
    const text = toText();
    const n = entries().length;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("navigator.clipboard.writeText unavailable");
      await navigator.clipboard.writeText(text);
      say(`已复制 ${n} 条到剪贴板`);
      return;
    } catch (e) {
      reportError(new Error("[debug-log] clipboard.writeText failed: " + String(e)), "log");
    }
    if (copyViaTextarea(text)) { say(`已复制 ${n} 条到剪贴板`); return; }
    try {
      const range = document.createRange(); range.selectNodeContents(pre);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range);
    } catch { /* 选区都做不了：只剩提示行 */ }
    reportError(new Error("[debug-log] execCommand copy failed too"), "log");
    say("复制失败：已选中日志文本，请长按 / 右键复制");
  }

  const logFile = (): File => new File([toText()], `catsup-debug-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`, { type: "text/plain" });
  // 复现包：出错那一步之前的活动池 + op / 预演描述（repro-box.ts）；分享 / 下载 .json（scripts/replay-repro.mjs 回放）
  reproBtn.addEventListener("click", () => { void exportJson(reproJson(), "catsup-repro", say); });
  // 上一步（成功但错的那一步也能寄）：op + 它之前的活动池；replay-repro.mjs 同一条路回放
  lastBtn.addEventListener("click", () => { const st = _lastStep?.(); if (!st) { say("还没有提交过的步骤"); return; } void exportJson(reproJson([lastStepEntry(st)]), "catsup-last-step", say); });
  // 触屏 = 分享（iPad 发给文件 / AirDrop / 邮件），电脑（含 Windows：那里的系统分享 user 不要）= 下载（share-or-download.ts，2026-10-29）
  if (!preferShare()) shareBtn.textContent = "下载 .txt";
  shareBtn.addEventListener("click", () => { void deliverFile(logFile(), "CatsUp 调试日志", say); });

  copyBtn.addEventListener("click", () => { void copy(); });
  clearBtn.addEventListener("click", () => { clear(); render(); say("已清空"); });
  closeBtn.addEventListener("click", close);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
}
