import type { Pt3 } from "../kernel/geom.ts";
import { ChangeLog } from "../kernel/change-log.ts";
export declare const F_SOFT = 1, F_SMOOTH = 2, F_SEAM = 4, F_HIDDEN = 8, F_WIRE = 16;
/** 手标硬边（2026-10-28 Claude Opus 5.5；纪元账本 FM129 / FM131）：压过网格体的「默认平滑」，这条边永远是棱（画线、明暗断开）。和 F_SOFT / F_SMOOTH 互斥（标的时候清掉另两位）。 */
export declare const F_SHARP = 32;
/** 网格体的「默认平滑」（几何属性，不是画法——user 10-28「不要叫明暗方式，我们的语义就是几何，和representation没关系。默认平滑之类的？」；每个网格体一个；mesh/edge-smooth.ts 按它判没手标的边）：angle = 两侧面夹角小于 deg 算平滑（硬表面）/ smooth = 全平滑（软角色）/ hard = 全是棱（低多边形；
 *  也是老文件的语义——没这个键的文件 = 只看手标，和以前逐字一样）。 */
export type SmoothDefaultMode = "angle" | "smooth" | "hard";
export interface SmoothDefault {
    readonly mode: SmoothDefaultMode;
    readonly deg: number;
}
export declare const SMOOTH_DEFAULT_LEGACY: SmoothDefault;
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
    /** 默认平滑（FM129；新内核 = 老语义 hard，转换 / 导入时设 angle）。改它走 setSmoothDefault（整体标改动，渲染全量重建法向）。 */
    smoothDefault: SmoothDefault;
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
    /** 换默认平滑：每条边的「平滑吗 / 画线吗」都可能变 → 所有边和面都记进改动日志（渲染按日志增量重建）。 */
    setSmoothDefault(sd: SmoothDefault): void;
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
    /**
     * 整份表互换（对象身份不变；brep Kernel.swapTablesWith 同款）：撤销记录 = 提交前的拷贝，撤 / 重做 = 和真身互换——自反、不重跑算子。
     * rev / 改动日志一起换：换回来的表配的是它自己那本日志（渲染缓存按日志族谱算差）。
     */
    swapWith(o: MeshKernel): void;
    /** 紧凑快照（去空位、id 重编：存 / 导出时整理，user 10-27「catsup rule: organize in export/save」）。 */
    toSnapshot(): MeshSnapshot;
    static fromSnapshot(s: MeshSnapshot): MeshKernel;
    check(): string[];
    /** 封闭流形块的欧拉示性数（只算流形块：每条边恰两张面、每个顶点的面扇连通）；非流形 / 有边界的块跳过。返回每块的 V − E + F。 */
    eulerOfClosedManifoldComponents(): number[];
}
