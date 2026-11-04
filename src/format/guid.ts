// guid.ts —— 文件里条目的身份（家规「文件里条目的身份 = GUID，不用序号」，2026-10-30 user；计划书 ai-docs/20261104-identity-foundation-plan.md §2.1）。
// 标准 UUID v4，小写 36 字符文本。铸出来就不变；撤销 / 重做不重铸（重做是自反交换，不重跑动词）。名字只是显示。运行时另有数字句柄（DefId / GroupId / InstId），只活这次会话、不落盘。
// created 2026-11-04 by Claude Opus 5.5
export type Guid = string;

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const isGuid = (s: unknown): s is Guid => typeof s === "string" && GUID_RE.test(s);

const HEX: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
/** 铸一个。`randomUUID` 只在安全上下文有（局域网 http 预览没有），退回 `getRandomValues`，同样是 v4。 */
export function mintGuid(): Guid {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => HEX[x]);
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}

/** 文件里读到的身份：合法且没人用过就留着，否则现铸（手改过的文件 / 老文件）。 */
export function ownGuid(raw: unknown, seen: Set<Guid>): Guid {
  const g = isGuid(raw) && !seen.has(raw) ? raw : mintGuid();
  seen.add(g);
  return g;
}

/**
 * 默认层的身份：全家一个常量（不是序号，是这一条的永久身份）。每份文件都有默认层，它们本来就是「同一条」，跨文件粘贴按 GUID 合并时才能合回默认层，而不是长出一堆叫「默认」的层。
 * 取值满足 v4 的形状，所以 `isGuid` 认它。
 */
export const DEFAULT_LAYER_GUID: Guid = "00000000-0000-4000-8000-000000000000";
