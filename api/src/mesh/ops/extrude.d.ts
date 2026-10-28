import { MeshKernel } from "../mesh-kernel.ts";
export interface ExtrudeResult {
    newVerts: Map<number, number>;
    sides: number[];
}
export declare function extrudeFaces(k: MeshKernel, fs: readonly number[]): ExtrudeResult;
/**
 * 挤出边（2026-10-27 Claude Opus 5.5；设计稿 §2-2「选中的一条边拉成一堵墙」、FM15）：边的端点各复制一份（相连的边共用），每条边长一张四边形 (a, b, b', a')；
 * 绕向跟它原来那张面相反（共用边上方向相反 = 法向一致）：边属于恰一张面且那张面里是 a→b → 新面走 b→a。没有面 / 两张面的边按 a→b。不挪：挪归调用方。
 */
export declare function extrudeEdges(k: MeshKernel, es: readonly number[]): ExtrudeResult;
/** 挤出点（「一个点拉成一条线」）：每个点复制一份、连一条裸线（F_WIRE）。不挪。 */
export declare function extrudeVerts(k: MeshKernel, vs: readonly number[]): ExtrudeResult;
/**
 * 拉（自由建模工作台的挤出一下 = 一条 op）：有面 = 挤出这组面（区域一起挤，内部边不长）；否则有边 = 挤出边；否则挤出点。新点整体平移 offset（本地坐标）。
 * 确定性：同一份内核 + 同一组参数 → 同一批新 id（数组制度：空闲链和计数器都在内核里，克隆保号）。
 */
export declare function extrudeAndOffset(k: MeshKernel, t: {
    faces?: readonly number[];
    edges?: readonly number[];
    verts?: readonly number[];
}, offset: {
    x: number;
    y: number;
    z: number;
}): ExtrudeResult;
