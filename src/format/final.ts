// final.ts —— 老定稿记录的形状（v0.12.8–v0.16.52 的「版本章」：rev + 内容指纹，仿 MoonSinger；设计 = ai-docs/20261024-finalize.md）。created 2026-10-24 by Claude Fable 5.1
// 2026-10-29 起**不再起作用**（周账 F-124：user 10-28「定稿的语义不对，这个是锁屏，不是 commit」→ 演示锁住 desk.locked，没有指纹、没有版本章）。
// 这里只剩读取器认老记录用的形状判定：老文件里有的 `final / finalRev` 照读照写、一字不动（指纹函数已删——它从来没盖过网格体，edited by Claude Fable 5.1 2026-10-29）。

export interface FinalRecord { at: string; rev: number; app: string; fingerprint: string; }

/** 读进来的老记录像不像样（坏的当没有）。 */
export function isFinalRecord(x: unknown): x is FinalRecord {
  return typeof x === "object" && x !== null && typeof (x as FinalRecord).at === "string" && typeof (x as FinalRecord).rev === "number" && typeof (x as FinalRecord).fingerprint === "string" && (x as FinalRecord).fingerprint.length === 64;
}
