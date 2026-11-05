import type { ConflictRow } from "../editor/paste-plan.ts";
import type { Decision } from "../identity/graph.ts";
/** 一条的事实：这里摆了几份 / 几张面在用、几份锁着、在架上；两边各几张面（材质 = 两边的颜色）。 */
export declare function conflictLine(r: ConflictRow): string;
/** 问一次：一种处理 + 材质跟不跟。取消 = null（不贴）。 */
export declare function resolvePasteConflict(rows: readonly ConflictRow[]): Promise<Decision | null>;
