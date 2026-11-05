import type { ConflictRow, PasteWays } from "../editor/paste-plan.ts";
import type { Decision } from "../identity/graph.ts";
/** 一条的事实：这里摆了几份 / 几张面在用、几份锁着、在架上；两边各几张面（材质 = 两边的颜色）。 */
export declare function conflictLine(r: ConflictRow): string;
/**
 * 问一次：一种处理 + 材质跟不跟。取消 = null（不贴）。
 * ways = 三种处理各走不走得通：走不通的灰掉、原因写在下面，默认 = 更新 → 留这里的 → 断开里第一个走得通的（调用方保证至少一个走得通；三个都不通不弹窗，PasteConflict.stuck）。点了之后 pasteBlocked 照旧再查一遍。
 */
export declare function resolvePasteConflict(rows: readonly ConflictRow[], ways: PasteWays): Promise<Decision | null>;
