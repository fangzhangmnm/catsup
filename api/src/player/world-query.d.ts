import type { Pt3 } from "../kernel/geom.ts";
export interface Ray {
    origin: Pt3;
    dir: Pt3;
}
export interface WorldHit {
    p: Pt3;
    n: Pt3;
    t: number;
}
export interface WorldQuery {
    /** 安全地板 z = min(0, 模型最低 z)：永远存在的无限平面，掉不到无穷（user：「地板用 min(0,min(model))」）。 */
    floorZ(): number;
    /** 球（球心 c、半径 r）若与几何相交，返回把它推出的位移向量（多面累计一轮；调用方迭代几次收敛）；不相交 → null。不含安全地板。 */
    pushOut(c: Pt3, r: number): Pt3 | null;
    /**
     * 竖直探针：从 (x, y, zTop) 向下找 ≥ zMin 的**最高**可站立面 z（|n.z| ≥ minNz 才算地，墙不算）；含安全地板。
     * 没有 → null（真悬空）。
     */
    floorBelow(x: number, y: number, zTop: number, zMin: number, minNz: number): number | null;
    /** 线段 a→b 与几何（含安全地板）的首个命中；无 → null。teleport 抛射体折线逐段用。 */
    segmentHit(a: Pt3, b: Pt3): WorldHit | null;
}
/** 空世界：只有安全地板 z=0（无模型时 / 单元测试基线）。 */
export declare function flatFloorWorld(z0?: number): WorldQuery;
