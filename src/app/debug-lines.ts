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

// 黑匣子落 localStorage，解开的加密模型也在这条路上：**模型的坐标不许进来**（家族规则书 §1 第 5 条；工单 C2 ②，2026-11-03 Claude Opus 5.5）。
//   op 只记动词 + 条数 + 大致字节数，不序列化 payload。describeOp 个别动词带一个样本坐标（move 的 Δ、meshMove 的目标点）：这里抹掉。出错文案同样过一遍。
const COORD3 = /-?\d+(?:\.\d+)?(?:e-?\d+)?\s*,\s*-?\d+(?:\.\d+)?(?:e-?\d+)?\s*,\s*-?\d+(?:\.\d+)?(?:e-?\d+)?/gi;
const COORD_JSON = /"[xyz]"\s*:\s*-?[\d.]+(?:e-?\d+)?/gi;
/** 黑匣子写入的总闸（debug-log.ts 的 record / note 都过它：错误文案里内核爱带坐标，比如 `face [(x,y,z) …]`）。 */
export const noCoords = (s: string): string => s.replace(COORD3, "…").replace(COORD_JSON, "…");
/** 粗估 op 的大小（数字按 8 字节算），只为看出「这笔有多大」；不拼字符串。 */
function approxBytes(v: unknown): number {
  if (typeof v === "number") return 8;
  if (typeof v === "string") return v.length;
  if (Array.isArray(v)) { let n = 0; for (const x of v) n += approxBytes(x); return n; }
  if (v && typeof v === "object") { let n = 0; for (const x of Object.values(v)) n += approxBytes(x); return n; }
  return 1;
}
function opShape(op: Parameters<typeof describeOp>[0]): string {
  try { return `${noCoords(describeOp(op))} ~${approxBytes(op)}B`; } catch { return "?"; }   // 失败行本身不许再炸（op 可能正是坏的）
}

/** 编辑器记账面包屑 → 一行。op 行 = 摘要 + 事件数 + 耗时 + 历史位置；失败行 = 哪里 + 文案 + op 的形状（不带坐标）。复现钥匙留在内存的 repro 盒里，不落盘。 */
export function traceLine(e: EditorTrace): string {
  switch (e.kind) {
    case "op": return `${noCoords(describeOp(e.op))} → ${e.events}ev ${e.ms.toFixed(1)}ms #${e.position}`;
    case "undo": case "redo": return `${e.kind} → #${e.position}/${e.depth}`;
    case "step": return `step ${e.label} ops=${e.ops}${e.session ? " +sel" : ""}`;
    case "load": return `load ${e.label}`;
    case "drift": return `DRIFT 工作台「${e.mode}」管不了「${e.body}」（${e.where} 时查到，已纠正）`;
    case "fail": return `FAIL ${e.where}: ${noCoords(e.message)} op=${e.op ? opShape(e.op) : "-"}`;
  }
}
