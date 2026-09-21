// error-funnel.ts —— 全 app + store 的错误唯一汇拢点（JRB/WXHW error-badge 同形，塌进 notice 栈）。created 2026-09-20 by Claude Fable 5.1
//   "error" → 红 toast 常驻 + console.error；"warning" → 琥珀 toast + console.warn；"info" → 瞬态 toast；"log" → 只 console。
//   这里是最终消费者：层层上报只有这里 console（不吞、不双报）；同时**全部级别**进黑匣子（debug-log.ts，2026-09-20）。
import { showNotice } from "./ui/notice.ts";
import { record } from "./debug-log.ts";

export type ErrorLevel = "error" | "warning" | "info" | "log";

export function errToText(err: unknown): string {
  if (err == null) return "unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return (err.name && err.name !== "Error" ? `[${err.name}] ` : "") + (err.message || String(err));
  const e = err as { message?: unknown; name?: unknown };
  if (typeof e.message === "string") return (typeof e.name === "string" && e.name !== "Error" ? `[${e.name}] ` : "") + e.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

// 黑匣子行：文案 + 第一帧调用栈（--keep-names 保住函数名；minified 里 file:line:col 仍可对 sourcemap）。WeebPaint error-badge 同款。
function stackHint(err: unknown): string {
  const st = err instanceof Error ? err.stack : undefined;
  if (!st) return "";
  const frame = st.split("\n").map((l) => l.trim()).find((l) => /^at |@/.test(l) && !l.includes("reportError"));
  return frame ? `  ‹${frame.slice(0, 160)}›` : "";
}

export function reportError(err: unknown, level: ErrorLevel = "error"): void {
  const text = errToText(err);
  record(level, text + stackHint(err));   // 黑匣子：全部级别（store 的 [auth]/[msal] 诊断走 log 级从这进来）
  if (level === "log") { console.log("[catsup]", text); return; }
  if (level === "info") { console.info("[catsup]", text); showNotice({ text, level: "info" }); return; }
  if (level === "warning") { console.warn("[catsup]", err); showNotice({ text, level: "warning" }); return; }
  console.error("[catsup]", err);
  showNotice({ text, level: "error" });
}
