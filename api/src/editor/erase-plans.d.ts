import type { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, Pt3, VertexId } from "../kernel/kernel.ts";
import { type EdgeKey } from "./ops.ts";
export interface WeldErasePlan {
    /** 真合并（共轴）的接点坐标。 */
    dissolve: Pt3[];
    /** 焊成一条曲线的边链（每条链一个 weldEdges；边键 = 溶解之后的形状）。 */
    welds: EdgeKey[][];
    /** 转角超过护栏、没碰的接点数。 */
    tooSharp: number;
}
/** 接点两边的转角（度）：0 = 直着过去，90 = 直角。 */
export declare function turnDeg(k: Kernel, vid: VertexId): number | null;
/**
 * 焊边：刮集里「两边都被刮到」的二度接点——共轴 → 溶解；转角 ≤ maxDeg → 焊；更尖 → 不碰。
 * 已在同一条曲线里的接点不算（那是弧自己的段）。焊链按溶解之后的虚拟边连通分量算。
 */
export declare function planWeldErase(k: Kernel, scrubbed: readonly EdgeId[], maxDeg: number): WeldErasePlan;
export interface SoftErasePlan {
    /** 共面两膜之间的边 → 删边并面。 */
    erase: EdgeKey[];
    /** 二面角 ≤ maxDeg 的边 → 软边 + 平滑。 */
    soften: EdgeKey[];
    /** 二面角超过护栏、没碰的边数。 */
    tooSharp: number;
}
/** 软边：刮到的每条边（不按曲线连坐）——恰好两膜之间才有二面角；共面 → 删，≤ maxDeg → 软，更尖 → 不碰。 */
export declare function planSoftErase(k: Kernel, scrubbed: readonly EdgeId[], maxDeg: number): SoftErasePlan;
