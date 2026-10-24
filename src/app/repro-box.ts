// repro-box.ts —— 复现包黑匣子（2026-10-24，Claude Fable 5.1；user「以后出错的时候要不要加一个关窗就没的快照黑匣子选项，就包括涉及到的数据和操作，你就能复现了」）。
// 提交 / 预演被内核拒绝时，把「那一步之前的活动池 B-rep + 这条 op（或预演描述）+ 版本」收进内存环；**只住内存，关窗就没**（模型数据不落盘）。
// 调试日志 sheet 里「复现包」钮导出 JSON；仓里 scripts/replay-repro.mjs 拿到包在内核上重跑。最多 8 条，新顶旧。
import type { BrepSnapshot } from "../kernel/kernel.ts";
import { APP_VERSION } from "../version.ts";

export interface ReproEntry {
  t: string;                      // ISO 时间
  version: string;                // APP_VERSION
  where: string;                  // commit / preview / redo
  message: string;                // 内核的拒绝理由
  op?: unknown;                   // 提交失败：那条 op（坐标寻址，直接可重放）
  preview?: unknown;              // 预演失败：工具 + 手势描述（replay 按工具重建）
  brep: BrepSnapshot;             // 那一步之前的活动池
  pool?: { def: number; group: number | null };
}
const MAX = 8;
const ring: ReproEntry[] = [];

export function capture(e: Omit<ReproEntry, "t" | "version">): void {
  ring.push({ t: new Date().toISOString(), version: APP_VERSION, ...e });
  while (ring.length > MAX) ring.shift();
}
export function entries(): readonly ReproEntry[] { return ring; }
export function count(): number { return ring.length; }
export function clear(): void { ring.length = 0; }
/** 导出：一个 JSON 文件（entries 数组；brep 是纯数组对象，Kernel.fromBrep 直接吃）。 */
export function toJson(): string { return JSON.stringify({ app: "CatsUp", version: APP_VERSION, exported: new Date().toISOString(), entries: ring }, null, 0); }
