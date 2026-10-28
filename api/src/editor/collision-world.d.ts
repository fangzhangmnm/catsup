import type { Kernel, Pt3 } from "../kernel/kernel.ts";
import type { WorldHit, WorldQuery } from "../player/world-query.ts";
import type { GeomView } from "../scene/world-view.ts";
/** 碰撞吃的几何：面 + 面的平面 + 面的三维环。brep 内核结构上满足；全场景的合成视图（WorldView，世界坐标、含网格体、隐藏的面不进）也满足（2026-10-28）。 */
export type CollisionSource = Pick<GeomView, "faces" | "planeOf" | "faceRings3">;
export declare class KernelCollisionWorld implements WorldQuery {
    private faces;
    private floor;
    /** 已吃进来的 Editor.revision（调用方比对以决定要不要 rebuild）。 */
    revision: number;
    constructor(k?: Kernel | CollisionSource, revision?: number);
    rebuild(k: CollisionSource, revision?: number): void;
    faceCount(): number;
    floorZ(): number;
    private inside;
    /** 逐面顺序推（RealHome 同款：推完一面更新球心再看下一面——共享边不会被两张膜各推一次）。返回总位移。 */
    pushOut(c0: Pt3, r: number): Pt3 | null;
    floorBelow(x: number, y: number, zTop: number, zMin: number, minNz: number): number | null;
    segmentHit(a: Pt3, b: Pt3): WorldHit | null;
}
