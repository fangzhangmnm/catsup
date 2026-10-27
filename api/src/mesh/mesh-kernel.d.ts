import { type Pt3 } from "../kernel/geom.ts";
import { ChangeLog } from "../kernel/change-log.ts";
export declare const F_SOFT = 1, F_SMOOTH = 2, F_SEAM = 4, F_HIDDEN = 8, F_WIRE = 16;
/** 面标记：隐藏（user 10-27「show and hide faces」；点 / 边的显隐从面推导，游离的才自己带 F_HIDDEN）。 */
export declare const FF_HIDDEN = 1;
export interface MeshSnapshot {
    readonly version: 1;
    readonly minor: 0;
    readonly patch: 0;
    readonly positions: number[];
    readonly faces: number[][];
    readonly faceMat: number[];
    readonly edges: [number, number, number][];
}
export declare class MeshKernel {
    pos: Float64Array<ArrayBuffer>;
    vAlive: Uint8Array<ArrayBuffer>;
    private vCount;
    private vFree;
    faceStart: Int32Array<ArrayBuffer>;
    faceLen: Int32Array<ArrayBuffer>;
    fAlive: Uint8Array<ArrayBuffer>;
    faceMat: Int32Array<ArrayBuffer>;
    faceFlags: Uint8Array<ArrayBuffer>;
    private fCount;
    private fFree;
    loopVert: Int32Array<ArrayBuffer>;
    private loopCount;
    edgeA: Int32Array<ArrayBuffer>;
    edgeB: Int32Array<ArrayBuffer>;
    eAlive: Uint8Array<ArrayBuffer>;
    edgeFlags: Uint8Array<ArrayBuffer>;
    private eCount;
    private eFree;
    private edgeKey;
    private adjDirty;
    private vE;
    private eF;
    private triCache;
    /** 改动计数（渲染缓存 / 预演差量的钥匙；拓扑或坐标改了就 +1）。 */
    rev: number;
    /** 改动日志（编号 + 族谱，kernel/change-log.ts 同一份实现）：每个原语记下碰到的点 / 边 / 面；渲染缓存据此只重建改过的；clone = 分叉。 */
    changes: ChangeLog;
    vertexCount(): number;
    edgeCount(): number;
    faceCount(): number;
    verts(): number[];
    edges(): number[];
    faces(): number[];
    hasV(v: number): boolean;
    hasE(e: number): boolean;
    hasF(f: number): boolean;
    pt(v: number): Pt3;
    faceVerts(f: number): number[];
    facePts(f: number): Pt3[];
    edgeOf(a: number, b: number): number;
    vEdges(v: number): Int32Array;
    eFaces(e: number): Int32Array;
    fEdges(f: number): number[];
    /** 面的朝向法向（Newell，**不**规范化符号：单面网格里环的绕向就是朝向；planeOfRing 的 canonical 会丢符号，别用它判朝向）。 */
    faceNormal(f: number): Pt3;
    addVertex(p: Pt3): number;
    /** 加一张面（顶点环）；相邻顶点对没有边的自动补边。环 < 3 个不同顶点 / 有重复 / 顶点不活 → 抛（人话）。 */
    addFace(ring: readonly number[], mat?: number): number;
    /** 删面；它独占的边（没别的面、不是裸线）一起删；孤立的顶点留着（Blender 同款：删面留点线，要删干净用 ops 的 deleteFaces(onlyFaces=false)）。 */
    removeFace(f: number): void;
    removeEdge(e: number): void;
    removeVertex(v: number): void;
    ensureEdge(a: number, b: number): number;
    /** 原地改一张面的环（劈面 / 并面 / 并点用）：旧环独占的边删掉、新环缺的边补上。 */
    setFaceRing(f: number, ring: readonly number[]): void;
    setPos(v: number, p: Pt3): void;
    setFlags(e: number, mask: number, on: boolean): void;
    /** 整字节写边标记（算子搬标记用）；记日志。 */
    setEdgeFlags(e: number, flags: number): void;
    setFaceMat(f: number, slot: number): void;
    setFaceFlags(f: number, mask: number, on: boolean): void;
    isFaceHidden(f: number): boolean;
    hasFlag(e: number, mask: number): boolean;
    private keyOf;
    private touch;
    private adjacency;
    triangles(): {
        tris: Int32Array;
        faceOfTri: Int32Array;
    };
    clone(): MeshKernel;
    /** 紧凑快照（去空位、id 重编：存 / 导出时整理，user 10-27「catsup rule: organize in export/save」）。 */
    toSnapshot(): MeshSnapshot;
    static fromSnapshot(s: MeshSnapshot): MeshKernel;
    check(): string[];
    /** 封闭流形块的欧拉示性数（只算流形块：每条边恰两张面、每个顶点的面扇连通）；非流形 / 有边界的块跳过。返回每块的 V − E + F。 */
    eulerOfClosedManifoldComponents(): number[];
}
