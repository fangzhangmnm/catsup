import { MeshKernel } from "../mesh-kernel.ts";
/** 劈边：e 在参数 t 处加一个顶点；e 所在的每张面的环都插进这个点；标记两半都带。返回新顶点。 */
export declare function splitEdge(k: MeshKernel, e: number, t?: number): number;
/** 劈面：面 f 上两个不相邻的顶点之间加一条边，f 分成两张（f 保 id、另一张新 id）。返回新面。 */
export declare function splitFace(k: MeshKernel, f: number, va: number, vb: number): number;
/** 刀：面 f 上按顺序一串落点，每个落点 = 已有顶点 { v } 或边上的点 { e, t }；相邻两点之间连边劈面。返回沿刀口的顶点序列。 */
export declare function knife(k: MeshKernel, f: number, path: readonly ({
    v: number;
} | {
    e: number;
    t: number;
})[]): number[];
