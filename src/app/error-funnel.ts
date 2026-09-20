// error-funnel.ts —— 全 app + store 的错误唯一汇拢点（JRB/WXHW error-badge 同形，塌进 notice 栈）。created 2026-09-20 by Claude Fable 5.1
//   "error" → 红 toast 常驻 + console.error；"warning" → 琥珀 toast + console.warn；"info" → 瞬态 toast；"log" → 只 console。
//   这里是最终消费者：层层上报只有这里 console（不吞、不双报）。
import { showNotice } from "./ui/notice.ts";

export type ErrorLevel = "error" | "warning" | "info" | "log";

export function errToText(err: unknown): string {
  if (err == null) return "unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return (err.name && err.name !== "Error" ? `[${err.name}] ` : "") + (err.message || String(err));
  const e = err as { message?: unknown; name?: unknown };
  if (typeof e.message === "string") return (typeof e.name === "string" && e.name !== "Error" ? `[${e.name}] ` : "") + e.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

export function reportError(err: unknown, level: ErrorLevel = "error"): void {
  const text = errToText(err);
  if (level === "log") { console.log("[catsup]", text); return; }
  if (level === "info") { console.info("[catsup]", text); showNotice({ text, level: "info" }); return; }
  if (level === "warning") { console.warn("[catsup]", err); showNotice({ text, level: "warning" }); return; }
  console.error("[catsup]", err);
  showNotice({ text, level: "error" });
}
