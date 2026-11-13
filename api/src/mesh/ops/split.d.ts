import { type Pt3 } from "../../kernel/geom.ts";
import { MeshKernel } from "../mesh-kernel.ts";
/** 劈边：e 在参数 t 处加一个顶点；e 所在的每张面的环都插进这个点；标记两半都带。返回新顶点。 */
export declare function splitEdge(k: MeshKernel, e: number, t?: number): number;
/**
 * 沿折线劈面（笔的设计稿第八节第 1 条；全仓唯一劈面的原子——以前的 splitFace = 面里零个点的特例，收成这一个）：
 * 面 f 的环上两个不同的顶点 vIn → vOut，中间经过面里的点 inner（定义坐标，按折线的先后；可以零个）。
 *   原面 f（保 id）的环 = 环上 vIn → vOut 那一段 + 倒着的面里点；新面 = vOut → vIn 那一段 + 正着的面里点。
 *   两张面的来历都是原面的一块（角上的列按原面的三角形取值，面里的点一样）；新边 = 新长；面里的点是新点（点上没有列）。
 * 只管拓扑，不看几何：折线出没出面、交不交叉、离面多远都不管——验在 knife 那一层（knifeCheck，先验后切）。
 * 抛：面不活 / 两点不在环上 / 同一个点 / 没有面里的点又相邻（切不出东西）。返回新面、新点（按折线的先后）。
 */
export declare function splitFaceAlong(k: MeshKernel, f: number, vIn: number, vOut: number, inner?: readonly Pt3[]): {
    face: number;
    verts: number[];
};
/** 刀的一个落点：已有顶点 / 边上的点（参数 t）/ 面里的点（定义坐标；只能夹在两个前两种之间，笔的设计稿第八节第 3 条）。 */
export type KnifeStop = {
    v: number;
} | {
    e: number;
    t: number;
} | {
    p: Pt3;
};
/** 刀被拦下（knifeCheck 说了原因）：真身一个数都没动。指令层翻成规矩拒绝（提示行），不是错误。 */
export declare class KnifeRefused extends Error {
}
/**
 * 切之前验一道（笔的设计稿第八节第 2 条；只读，不改 k）。路径里有面里的点 = 必须是「环上一点 → 面里的点… → 环上一点」，两头都在面 f 的环上：
 *   先在副本上（只算位置）拼出劈开后的两个环，各自投到自己的拟合平面上（和三角化同一个投影：planeOfRing + planeBasis）：
 *   新长的那几段不许和别的边相交、不许折回去，两个环的绕向都和原面一样（Newell 同向）；面里的每个点离原面的三角形不超过 COPLANAR_TOL_DEFAULT。
 * 只有两个环上点、没有面里的点（一刀直的）照同一道验（刀线出了凹的面 = 拦）。一刀只有两头：三个以上的环上点 = 拦（统筹审后 1：不留不验的旁路）。
 * 通过 = null；拦 = 一句说事实的话。工具预演刀线的颜色用同一个函数。
 */
export declare function knifeCheck(k: MeshKernel, f: number, path: readonly KnifeStop[]): string | null;
/**
 * 刀：面 f 上一刀 = 「环上一点 → 面里的点… → 环上一点」（KnifeStop；面里的点可以零个）。返回沿刀口的顶点序列（面里的点 = 新点，按折线的先后）。
 * 先 knifeCheck，拦下来就抛 KnifeRefused、一个数都不动；过了 = 劈边（边上的点）+ splitFaceAlong。两点之间已经有边、没有拐点 = 什么都不切（和以前一样）。
 */
export declare function knife(k: MeshKernel, f: number, path: readonly KnifeStop[]): number[];
/**
 * 平面上的一圈点（已投到面的二维坐标里）自己交不交叉：第 i 段（只看 which(i) 为真的那些段，缺 = 全看）和第 j 段——相邻的交点多于一个（叠回去）、不相邻的有交点 = 交叉。
 * 返回第一对（i 在外层、j 在内层，都按下标升序）；不交叉 = null。刀验刀线（只看刀线那几段）和造面验点序（全看，duplicate.ts faceBlocker）共用这一份。
 */
export declare function ringCrossing(q: readonly {
    x: number;
    y: number;
}[], which?: (i: number) => boolean): {
    i: number;
    j: number;
} | null;
