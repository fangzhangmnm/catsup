import type { Pt3 } from "../kernel/geom.ts";
import { ChangeLog } from "../kernel/change-log.ts";
import { type Column, type ColumnDef, type CornerColumn, type EdgeColumn, type EdgeOrigin, type EdgeShape, type FaceColumn, type FaceOrigin, type FaceReport, type FaceShape, type GoneWhy } from "./columns.ts";
import { type MergeGroup } from "./merge-points.ts";
export type { Column, ColumnDef, ColumnType, CornerColumn, CornerOdd, Domain, EdgeColumn, EdgeOrigin, EdgeShape, FaceColumn, FaceOrigin, FaceReport, FaceShape, GoneFace, GoneWhy, MergeRule, OddEdge, OddFace } from "./columns.ts";
export type { MergeGroup, MergeTo } from "./merge-points.ts";
/** 网格体的「默认平滑」（几何属性，不是画法——user 10-28「不要叫明暗方式，我们的语义就是几何，和representation没关系。默认平滑之类的？」；每个网格体一个；mesh/edge-smooth.ts 按它判没手标的边）：angle = 两侧面夹角小于 deg 算平滑（硬表面）/ smooth = 全平滑（软角色）/ hard = 全是棱（低多边形；
 *  新建的网格体默认这一档；文件里缺这一项怎么办归读的门口 format/migrate/mesh.ts）。 */
export type SmoothDefaultMode = "angle" | "smooth" | "hard";
export interface SmoothDefault {
    readonly mode: SmoothDefaultMode;
    readonly deg: number;
}
/** 新建的网格体的默认平滑：全是棱（只看手标）。老文件缺这一项怎么办归读的门口（format/migrate/mesh.ts smoothDefaultOf；2026-11-12 起内核不认「老文件」）。 */
export declare const SMOOTH_DEFAULT_NEW: SmoothDefault;
export interface MeshSnapshot {
    readonly version: 4;
    readonly minor: 0;
    readonly patch: 0;
    readonly positions: number[];
    readonly faces: number[][];
    readonly wires: [number, number][];
    /** 角上的列（有才有这个键）：声明 + 每张面一项 = 角数 × 每角几个数。 */
    readonly corner?: readonly {
        readonly def: ColumnDef;
        readonly faces: readonly (readonly number[])[];
    }[];
    /** 面上的列（有才有这个键）：声明 + 每张面一个数。 */
    readonly face?: readonly {
        readonly def: ColumnDef;
        readonly values: readonly number[];
    }[];
    /** 边上的列（有才有这个键）：声明 + 每条活边一项 [a, b, 值]（a、b = 重编后的点）。 */
    readonly edge?: readonly {
        readonly def: ColumnDef;
        readonly values: readonly (readonly [number, number, number])[];
    }[];
}
export declare class MeshKernel {
    pos: Float64Array<ArrayBuffer>;
    vAlive: Uint8Array<ArrayBuffer>;
    private vCount;
    private vFree;
    faceStart: Int32Array<ArrayBuffer>;
    faceLen: Int32Array<ArrayBuffer>;
    fAlive: Uint8Array<ArrayBuffer>;
    private fCount;
    private fFree;
    loopVert: Int32Array<ArrayBuffer>;
    private loopCount;
    edgeA: Int32Array<ArrayBuffer>;
    edgeB: Int32Array<ArrayBuffer>;
    eAlive: Uint8Array<ArrayBuffer>;
    private eCount;
    private eFree;
    /** 裸线位（结构位，几何本身：这条边可以不挂面；规程第二½节）。3c 起内核自己一张位表；边上的标记都是列（mesh/reserved-columns.ts）。 */
    private edgeWire;
    private edgeKey;
    private vHead;
    private eNext;
    private eFHead;
    private lNext;
    private lEdge;
    private lFace;
    private triCache;
    /** 改动计数（渲染缓存 / 预演差量的钥匙；拓扑或坐标改了就 +1）。 */
    rev: number;
    /** 默认平滑（FM129；新内核 = 老语义 hard，转换 / 导入时设 angle）。改它走 setSmoothDefault（整体标改动，渲染全量重建法向）。 */
    smoothDefault: SmoothDefault;
    /** 改动日志（编号 + 族谱，kernel/change-log.ts 同一份实现）：每个原语记下碰到的点 / 边 / 面；渲染缓存据此只重建改过的；clone = 分叉。 */
    changes: ChangeLog;
    /** 角上的列：先后没有意思、认 id；data 和 loopVert 平行。只经 addColumn / ensureColumns 加。 */
    cornerCols: CornerColumn[];
    /** 面上的列：data[面编号]。只经 addColumn / ensureColumns 加。 */
    faceCols: FaceColumn[];
    /** 边上的列：data[边编号]。只经 addColumn / ensureColumns 加。 */
    edgeCols: EdgeColumn[];
    /** 「对不上」的边（边编号 → 哪几列，并成时来源不一样）：takeReport 拿走并清空；piece / copy / joined 时跟着传给新边。 */
    private oddEdges;
    /** 「对不上」的面（面编号 → 哪几列）：用的那一层 takeReport() 拿走并清空；跟着来历传给新面（columns.ts）。 */
    private odd;
    /** 这段时间里没了的面（removeFaceReported / 合并点；takeReport 拿走并清空；跟着 swapWith 换，拷贝不带）。 */
    private goneList;
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
    /** 点 v 连着的边（编号从小到大，一份新数组）。O(这个点的度数)。 */
    vEdges(v: number): Int32Array;
    /** 边 e 挨着的面（编号从小到大，一份新数组）。O(挨着的面数)。 */
    eFaces(e: number): Int32Array;
    fEdges(f: number): number[];
    /** 面的朝向法向（Newell，**不**规范化符号：单面网格里环的绕向就是朝向；planeOfRing 的 canonical 会丢符号，别用它判朝向）。 */
    faceNormal(f: number): Pt3;
    addVertex(p: Pt3): number;
    /** 加一张面（顶点环）；相邻顶点对没有边的自动补边。环 < 3 个不同顶点 / 有重复 / 顶点不活 → 抛（人话）。origin = 这张面从哪来（必填：角上的数怎么来，columns.ts）。 */
    addFace(ring: readonly number[], origin: FaceOrigin): number;
    /** 删面；它独占的边（没别的面、不是裸线）一起删；孤立的顶点留着（Blender 同款：删面留点线，要删干净用 ops 的 deleteFaces(onlyFaces=false)）。 */
    removeFace(f: number): void;
    /**
     * 一次删一批面（连同只属于这批面的边；裸线不删）。结果和对每张逐个 removeFace 一样：删掉的面和边、空出来的编号都一样
     * （空闲编号表本来就一直排着序，之后分到的编号也一样），但空闲编号只排一次序（W-10：细分 6400 面要 44–54 秒，样本 test/mesh-subdivide-golden.test.ts；
     * 那时逐个删还要每张整张重建一次邻接表，W-11 起邻接是增量的）。
     */
    removeFaces(fs: readonly number[]): void;
    /** 一次删一批孤立的点（没有边的；有边的 → 抛，和 removeVertex 一样）。邻接表只查一次（W-10）。 */
    removeVertices(vs: readonly number[]): void;
    removeEdge(e: number): void;
    /** 删边不排空位表（一批删完调用方排一次：合并点那几段里中途不分配边，排一次和每次都排结果一样）。 */
    private dropEdge;
    private dropEdges;
    removeVertex(v: number): void;
    /** 有就返回那条边；没有就造一条新长的（边上的列全是缺省值）。要带着来历造 = addEdge。 */
    ensureEdge(a: number, b: number): number;
    /**
     * 造一条新边，值按来历填好（规程第九½节：边的值在它被造出来的那一刻按来历填好，不许造完再回头补）。这条边已经在 = 抛（对已经在的边申报来历不算数）；
     * 两头一样 / 点不活 = 抛。来历里的旧样子要在旧边删掉之前用 edgeShape 记下。
     */
    addEdge(a: number, b: number, origin: EdgeOrigin): number;
    private makeEdge;
    /**
     * 并进一条已经在的边（规程第九½节，统筹 11-13）：别的几条边（旧样子在它们删掉之前记下）并成这条已经在的边 = 并成，这条排最前、from 照给的先后；
     * 每一列照自己的 merge 取，来源不一样进边的报告。溶解二度点时两个邻居本来就连着、合并点几条边落到同一对点，都走这一个入口（全仓一处）。
     */
    absorbIntoEdge(keep: number, from: readonly EdgeShape[]): void;
    /** 边的旧样子（改 / 删之前记，交给新边的来历）：两头 + 每一列的值（没有边上的列 = null）+ 身上还没交出去的「对不上」。 */
    edgeShape(e: number): EdgeShape;
    /** 原地改一张面的环（劈面 / 并面 / 并点用）：旧环独占的边删掉、新环缺的边补上。origin = 新环从哪来（必填；旧样子要在改之前 shapeOf 记下）。 */
    setFaceRing(f: number, ring: readonly number[], origin: FaceOrigin): void;
    /** 环接在 loopVert 末尾（旧环的槽作废）；有列就按来历写面上的列和角上的数（columns.ts writeColumns，全仓唯一的那一段），对不上的记下来。 */
    private writeRing;
    /** 加一列（同一个 id 已经有 = 声明一样就不动，不一样 = 抛；这一刀做不了的组合 = 抛「还没做」，columns.ts checkColumnDef）。原有的角 / 面填 fill。 */
    addColumn(def: ColumnDef): void;
    /** 删一列（属性页「删」= 全部回缺省值；可以撤销：撤销记录是整份表）。没有这一列 = false。身上记着的「对不上」里这一列一起去掉。 */
    removeColumn(id: string): boolean;
    /**
     * 一列（读的人长期拿在手里的那个对象，data 永远是现在那一条；没有 = null）。整份换表（撤销、提交）、加删列之后 rev 会变，变了再问一次（columns.ts Column 头注释）。
     */
    column(id: string): Column | null;
    /** 列清单（属性页第一版只看用）：每一列的名字、挂在哪、类型、多少个（那一类活着的元素数）、占多大（逻辑上的字节数）。 */
    columnList(): {
        id: string;
        on: ColumnDef["on"];
        type: string;
        count: number;
        bytes: number;
    }[];
    /** 几何本身有多少（属性页「几何」那一块）：点、边、面、角（每张面的角数之和）、不挂面的线。 */
    elementCounts(): {
        points: number;
        edges: number;
        faces: number;
        corners: number;
        wires: number;
    };
    /** 别的内核的列在这边补上（整张面搬过来之前；原有的面在补上的列上填 fill）。 */
    ensureColumns(defs: readonly ColumnDef[]): void;
    /** 全部列的声明（先角上的、再面上的；先后没有意思）。 */
    columnDefs(): ColumnDef[];
    /** 一列的声明；没有 = null。 */
    columnDef(id: string): ColumnDef | null;
    /** 有没有这一列（三种都算）。 */
    hasColumn(id: string): boolean;
    /** 面的旧样子（改之前记）：没有列 = 只记材质。 */
    shapeOf(f: number): FaceShape;
    /** 这张面在一列角上的列上各角的值（角数 × arity，拷一份）；没有这一列 / 面不在 = null。 */
    cornerValues(f: number, id: string): Float32Array | null;
    /** 这张面在一列面上的列上的值；没有这一列 / 面不在 = null。 */
    faceValue(f: number, id: string): number | null;
    /** 这张面在每一列上的值（整张面搬到别的内核时交给 fresh；shapeOf 也用它）。 */
    columnsOf(f: number): {
        corner: Map<string, Float32Array>;
        face: Map<string, number>;
    };
    /** 给一张面在一列角上的列上整张写值（角数 × arity 个）。进改动日志、rev 动。 */
    setCornerValues(f: number, id: string, values: ArrayLike<number>): void;
    /** 给一张面在一列面上的列上写值。进改动日志、rev 动。 */
    setFaceValue(f: number, id: string, v: number): void;
    /** 这条边在一列边上的列上的值；没有这一列 / 边不在 = null。 */
    edgeValue(e: number, id: string): number | null;
    /** 给一条已经在的边在一列边上的列上写值（操作本意要写的〔倒角写平滑〕、指令点名写的〔手标〕；不是「造完回头补来历」——来历在 addEdge 时给）。进改动日志、rev 动。 */
    setEdgeValue(e: number, id: string, v: number): void;
    /** 上一次拿走之后「对不上」的面（还活着的；面编号 → 哪几列）和没了的面，拿走即清空。 */
    takeReport(): FaceReport;
    /** 删面并记进报告「没了的面」（原因由调用方给，内核不认它；with = 和哪张重叠之类）：记下删之前的样子，再照 removeFace 删。 */
    removeFaceReported(f: number, why: GoneWhy, withFace?: number): void;
    /**
     * 把边 e 的一头从 from 换成 to（还是那条边：编号、标记都不变）。要求：这条边现在不挂面（调用方先把面摘下来）、to 活着、换完的那一对点上还没有边。
     * 合并点用（第七¾节第 2 条「只是一头换了点的边还是那条边」）；增量邻接一起改（check 的 M8 对拍守着）。
     */
    relinkEdgeEnd(e: number, from: number, to: number): void;
    /**
     * 合并点（规程第七¾节第二稿；规划在 merge-points.ts、角上的数在 columns.ts mergeCornerValues）：若干组点各合并成一个，所有组一次做完、和组的先后无关。
     * 返回每组的幸存点（每组第一个点；照传进来的先后）。塌掉的面、合并出来同一圈点的重叠面删掉、进报告「没了的面」（原因 collapsed / overlap）。
     */
    mergePoints(groups: readonly MergeGroup[]): number[];
    setPos(v: number, p: Pt3): void;
    /** 整字节写边标记（算子搬标记用）；记日志。 */
    /** 裸线位（结构位，几何本身：「这条边可以不挂面」）。 */
    isWire(e: number): boolean;
    setWire(e: number, on: boolean): void;
    /** 换默认平滑：每条边的「平滑吗 / 画线吗」都可能变 → 所有边和面都记进改动日志（渲染按日志增量重建）。 */
    setSmoothDefault(sd: SmoothDefault): void;
    private keyOf;
    private touch;
    private vLink;
    private vUnlink;
    /** 面 f 现在这一圈（loopVert 的 faceStart[f] 起 faceLen[f] 个槽）挂到各自的边上。环上的边都要已经在（addFace / setFaceRing 先补边再挂）。 */
    private linkRing;
    /** 把面 f 现在这一圈从各自的边上摘下来（删面 / 换环之前）。 */
    private unlinkRing;
    /** 邻接表整张从头重建过几次（W-10 的测试看它；W-11 起维护是增量的，只有 check() 的 M8 为了比对从头建一份）。 */
    get adjacencyBuilds(): number;
    private adjBuilds;
    /** 从头重建邻接（以前的做法，原样）：每个点连着的边、每条边挨着的面，都按编号从小到大。只给 check() 的 M8 比对用。 */
    private adjacencyFromScratch;
    /**
     * 一张面切成哪几个三角形（下标 = 环上的位置，按面自己的绕向；FM130）。**网格体的面切三角形全仓只从这里来**（2026-11-10 起：别处要用面的三角形都从这里拿）：
     * 内核的 triangles()、导出、屏幕上画的（MeshView.faceTriangles → pool-mesh.ts buildFaceRec）、选中高亮 / OBJ（editor/face-triangles.ts）。
     * 以前屏幕上那条路用视图的平面自己另切，四点共圆的面（正方形、长方形）两条对角线一样好，两条路可能选得不一样。O(这张面的点数)。
     */
    faceTriangles(f: number): [number, number, number][];
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
