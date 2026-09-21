// debug-lines.ts —— 黑匣子的纯文本行（零 DOM / 零包依赖，可 node 直测）：开机 URL 一行、编辑器记账一行。
// created 2026-09-20 by Claude Fable 5.1（配 debug-log.ts；拆开是为了测试不必拖进 @internal/gallery）
import { describeOp } from "../editor/ops.ts";
import type { EditorTrace } from "../editor/editor.ts";

/** 开机 URL 一行（canary 探针页「原始 fragment 抓取」的同义物）：路径 + query 键 + hash 键。
 *  OAuth 回程的 error / error_description / error_uri **原文照抄**（这就是「授权没反应」要看的那句），
 *  code / state / client_info 等只记长度——一次性授权码不落黑匣子。必须在 initAuth 之前取：MSAL 处理完会把 hash 抹掉。 */
export function bootUrlLine(loc: { pathname: string; search: string; hash: string }): string {
  const summarize = (raw: string): string => {
    const q = raw.replace(/^[?#]/, "");
    if (!q) return "-";
    const parts: string[] = [];
    for (const [k, v] of new URLSearchParams(q)) {
      if (k === "error" || k === "error_description" || k === "error_uri") parts.push(`${k}=${v.slice(0, 300)}`);
      else parts.push(`${k}(${v.length})`);
    }
    return parts.length ? parts.join(" ") : "-";
  };
  return `url path=${loc.pathname} query=[${summarize(loc.search)}] hash=[${summarize(loc.hash)}]`;
}

/** 编辑器记账面包屑 → 一行。op 行 = 摘要 + 事件数 + 耗时 + 历史位置；失败行附 op JSON 前 400 字符（复现钥匙）。 */
export function traceLine(e: EditorTrace): string {
  switch (e.kind) {
    case "op": return `${describeOp(e.op)} → ${e.events}ev ${e.ms.toFixed(1)}ms #${e.position}`;
    case "undo": case "redo": return `${e.kind} → #${e.position}/${e.depth}`;
    case "load": return `load ${e.label}`;
    case "fail": return `FAIL ${e.where}: ${e.message} op=${e.op ? JSON.stringify(e.op).slice(0, 400) : "-"}`;
  }
}
