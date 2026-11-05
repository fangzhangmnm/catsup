// identity/guid.ts（2026-11-04 ID-4 从 format/guid.ts 搬来）—— 文件里条目的身份（家规「文件里条目的身份 = GUID，不用序号」，2026-10-30 user；计划书 ai-docs/20261104-identity-foundation-plan.md §2.1）。
// 标准 UUID v4，小写 36 字符文本。铸出来就不变；撤销 / 重做不重铸（重做是自反交换，不重跑动词）。名字只是显示。运行时另有数字句柄（DefId / GroupId / InstId），只活这次会话、不落盘。
// created 2026-11-04 by Claude Opus 5.5
export type Guid = string;

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const isGuid = (s: unknown): s is Guid => typeof s === "string" && GUID_RE.test(s);

const HEX: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
/**
 * 铸造录音带（身份地基 ID-3，2026-11-04 Claude Opus 5.5）：指令流里有按 GUID 认条目的指令（粘贴的闭包、素材架），所以重放时每条指令铸出来的 GUID 必须和当初一样。
 * 运行时句柄是顺序铸造、天生确定；GUID 是随机的，只有这里补：提交时录下这条指令铸了哪些（recordMints），重放时按顺序放回（replayMints）。都是同步、不重入。
 */
let recording: Guid[] | null = null;
let playing: { readonly list: readonly Guid[]; at: number } | null = null;
export function recordMints<T>(fn: () => T, done: (minted: Guid[]) => void): T {
  const prev = recording, mine: Guid[] = [];
  recording = mine;
  try { return fn(); } finally { recording = prev; done(mine); }
}
/** 重放只走校验路径（History.replay / stateAt，测试和探针用；撤销不重放），所以对不上直接抛：铸得比录的多或少 = 这条指令不确定，静默换成随机身份会把账搞乱（ID-4c）。 */
export function replayMints<T>(minted: readonly Guid[], fn: () => T): T {
  const prev = playing, mine = { list: minted, at: 0 };
  playing = mine;
  let out: T;
  try { out = fn(); } finally { playing = prev; }
  if (mine.at !== minted.length) throw new Error(`replayMints: recorded ${minted.length} GUIDs, replay minted ${mine.at}`);
  return out;
}
/** 铸一个。`randomUUID` 只在安全上下文有（局域网 http 预览没有），退回 `getRandomValues`，同样是 v4。 */
export function mintGuid(): Guid {
  if (playing) { if (playing.at >= playing.list.length) throw new Error(`replayMints: replay minted more than the ${playing.list.length} GUIDs recorded`); return playing.list[playing.at++]; }
  const g = freshGuid();
  recording?.push(g);
  return g;
}
function freshGuid(): Guid {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => HEX[x]);
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}

/** 文件里读到的身份：合法且没人用过就留着，否则现铸。onRemint = 文件里写了身份、但重复或不合法（手改过的文件；读取侧披露用）；老文件压根没写身份不算。 */
export function ownGuid(raw: unknown, seen: Set<Guid>, onRemint?: () => void): Guid {
  const keep = isGuid(raw) && !seen.has(raw), g = keep ? raw : mintGuid();
  if (!keep && raw !== undefined && raw !== null) onRemint?.();
  seen.add(g);
  return g;
}

/**
 * 默认层的身份：全家一个常量（不是序号，是这一条的永久身份）。每份文件都有默认层，它们本来就是「同一条」，跨文件粘贴按 GUID 合并时才能合回默认层，而不是长出一堆叫「默认」的层。
 * 取值满足 v4 的形状，所以 `isGuid` 认它。
 */
export const DEFAULT_LAYER_GUID: Guid = "00000000-0000-4000-8000-000000000000";
/**
 * 内置材质的身份（同一族常量；scene/builtin-materials.ts）。默认背面可以出现在定义的槽表里；**永不进材质表**（读到冒充的 = 现铸一个新身份）。
 * 默认正面只有一种表示 = 槽缺：这个常量只给读入器认出来丢掉用，写入器永不写（计划书 §9.2-A a）。
 */
export const BUILTIN_FRONT_GUID: Guid = "00000000-0000-4000-8000-000000000001";
export const BUILTIN_BACK_GUID: Guid = "00000000-0000-4000-8000-000000000002";
