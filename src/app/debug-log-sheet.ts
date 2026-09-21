// debug-log-sheet.ts —— 菜单「调试日志」sheet：看 + 复制 + 分享/下载 + 清空（数据源 = debug-log.ts）。WeebPaint diag-log-sheet.ts 同形。
// created 2026-09-20 by Claude Fable 5.1
// 复制 = 三级回退：navigator.clipboard.writeText（手势内）→ 隐藏 textarea + execCommand("copy") → 选中 <pre> 让用户长按复制。
// 分享 = Web Share **.txt 文件**（iPad 直接发给文件 / AirDrop / 邮件；微信/QQ 不吃 60 KB 长文本——WeebPaint 09-06 教训）；
//   没有 navigator.share（桌面）→ 钮变「下载 .txt」。反馈写进 sheet 自己的提示行（无系统弹窗，家规）。
import { entries, toText, clear } from "./debug-log.ts";
import { reportError } from "./error-funnel.ts";

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

export function initDebugLogSheet(): void {
  const sheet = $("debugLog"), pre = $("debugLogText"), hint = $("debugLogHint");
  const copyBtn = $("debugLogCopy"), shareBtn = $("debugLogShare"), clearBtn = $("debugLogClear"), closeBtn = $("debugLogClose");

  function render(): void {
    const n = entries().length;
    hint.textContent = `共 ${n} 条（旧在上、新在下）· 复制或分享给开发者`;
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
  const canShare = typeof navigator.share === "function";
  if (!canShare) shareBtn.textContent = "下载 .txt";
  shareBtn.addEventListener("click", async () => {
    if (!canShare) {
      const f = logFile();
      const url = URL.createObjectURL(f);
      const a = document.createElement("a"); a.href = url; a.download = f.name; a.style.display = "none";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      say(`已下载 ${f.name}`);
      return;
    }
    try {
      const f = logFile();
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [f] })) await navigator.share({ title: "CatsUp 调试日志", files: [f] });
      else await navigator.share({ title: "CatsUp 调试日志", text: toText() });
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") { reportError(new Error("[debug-log] share failed: " + String(e)), "log"); say("分享失败"); }
    }
  });

  copyBtn.addEventListener("click", () => { void copy(); });
  clearBtn.addEventListener("click", () => { clear(); render(); say("已清空"); });
  closeBtn.addEventListener("click", close);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
}
