import { type PlaneParams, type Pt3 } from "../kernel/geom.ts";
/** 返回 [a,b,c] 顶点索引（索引空间 = 传入的 vertices 数组）。绕向沿用 earcut（与外环一致）。 */
export declare function triangulateRings(vertices: readonly Pt3[], plane: PlaneParams, outer: readonly number[], holes: readonly (readonly number[])[]): [number, number, number][];
/**
 * 一张多边形面（单环，无洞）按**它自己的绕向**切三角形（2026-10-28 Claude Opus 5.5；纪元账本 FM130 user「导出的时候面的法向一堆错误」「不一定是法向也可能是面的朝向」）。
 * planeOfRing 返回的是**规范化了符号**的平面（同一张平面无论环怎么绕都同一个法向——SU 体的去重要它），triangulateRings 按那个平面的基投影切 →
 * 面的真实朝向（Newell，环的绕向）和规范方向相反时三角形整张反了（实测：立方体 12 个三角形反 6 个、球 224 反 96）。这里按 Newell 对一下，反了就整批翻回来。
 * 网格体的三角化（MeshKernel.triangles、导出 bakeMesh）都走它；SU 体的膜本来就按规范平面存、渲染另有自己的路，不受影响。
 */
export declare function triangulateFace(pts: readonly Pt3[]): [number, number, number][];
