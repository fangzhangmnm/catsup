import type { EdgeId, FaceId, Pt3 } from "../kernel/kernel.ts";
import type { KernelView } from "../scene/kernel-view.ts";
import type { Material } from "../scene/scene.ts";
/** 属性的存法：f32 = 浮点（位置 / 粗线端点 / uv）；i16n / i8n = 归一化整数（法线 / 面颜色；显卡读成 −1…1 的浮点，省一半到四分之三的内存）。 */
export type AttrType = "f32" | "i16n" | "i8n";
export interface AttrSpec {
    readonly name: string;
    readonly size: number;
    readonly type?: AttrType;
}
export type AttrArray = Float32Array | Int16Array | Int8Array;
type Fill = (a: Record<string, AttrArray>, off: number) => void;
/** 浮点 → 归一化整数（法线 ×32767、颜色 ×127；−1 = 「这一侧归贴图网格画」的记号，存成 −127 读回来正好 −1）。 */
export declare const q16: (x: number) => number;
export declare const q8: (x: number) => number;
/** 几张同步增长的大数组（每个属性一张，单位 = 顶点或实例）+ 改过的区间（宿主据此局部上传）。 */
declare abstract class ArrayStore {
    readonly specs: readonly AttrSpec[];
    arrays: Record<string, AttrArray>;
    /** 数组容量（单位）。 */
    cap: number;
    /** 用到的最高单位（绘制范围）。 */
    end: number;
    protected grown: boolean;
    protected dirty: [number, number][];
    constructor(specs: readonly AttrSpec[]);
    /** 改过的区间（合并、排好序）+ 是否换过数组（换了 = 宿主重建缓冲）；取完清零。 */
    takeDirty(): {
        grown: boolean;
        ranges: [number, number][];
    };
    /** 一份数组占多少字节（容量 / 用到的；内存账用）。 */
    bytes(): {
        cap: number;
        used: number;
    };
    /** 换成恰好 cap 个单位的数组（长大按 1.5 倍；收紧 = 全量建完之后）。 */
    protected realloc(cap: number): void;
    protected grow(need: number): void;
    protected clear(off: number, len: number): void;
    protected mark(off: number, len: number): void;
}
/**
 * 面用：按块分区存长短不一的记录（一张面几个三角不定）。改写同长的记录原地写；长度变了 = 挪到最后一块。
 * 删掉的地方清零 = 退化三角（显卡保证不出像素）；一块洞过半就整理（字节原样往前搬，不用重算）。
 * 每条记录只记「从第几个单位起、多长」两个整数（不留回调、不留副本：内存只花在显卡要的那几张数组上）。
 * 对齐：显卡从第 0 个顶点起每 3 个当一个三角，所以块的起点 / 容量都是 align（= 3）的倍数、记录长度也是——
 * 不然第二块起的三角整体错一个顶点（2026-10-26 加压对拍抓到：块容量 16384 不是 3 的倍数，大模型从第二块起全画花）。
 */
export declare class RegionStore extends ArrayStore {
    private chunks;
    private offOf;
    private lenOf;
    private readonly chunkUnits;
    private readonly align;
    constructor(specs: readonly AttrSpec[], chunkUnits: number, align?: number);
    private up;
    get count(): number;
    has(id: number): boolean;
    /** 这个 id 占的段（顶点偏移 / 顶点数）；没有 = null。 */
    range(id: number): readonly [number, number] | null;
    put(id: number, len: number, fill: Fill): void;
    remove(id: number): void;
    /** 全量建完：最后一块收紧到用到的 + 八分之一余量（之后加面先用余量，不够再按 1.5 倍长）。 */
    trim(): void;
    private chunkAt;
    private compact;
    private newChunk;
}
/**
 * 线用：每条记录一样长（一条边 = 一个实例 / 两个顶点），永远挤紧——删一条 = 把最后一条搬进它的位置（O(1)）。
 * 不留洞：零长线有的显卡会出一个点、粗线的零长段会在原点画一个方块，所以线不能像面那样靠「清零 = 不画」。
 */
export declare class DenseStore extends ArrayStore {
    private readonly unit;
    private slotOf;
    private idAt;
    constructor(specs: readonly AttrSpec[], unit: number);
    get count(): number;
    has(id: number): boolean;
    /** 这条记录占的段（单位偏移 / 单位数：像素线 2 个顶点、粗线 1 个实例）；没有 = null。删记录会挪别人的位置——用的人每次现查。 */
    range(id: number): readonly [number, number] | null;
    put(id: number, fill: Fill): void;
    remove(id: number): void;
    /** 全量建完：收紧到用到的 + 八分之一余量。 */
    trim(): void;
}
export { fanNormal, type FanView } from "../scene/fan-normal.ts";
export interface FaceRec {
    /** 每个三角顶点 3 个数（池本地坐标）；绕向统一成绕平面法向 +n 逆时针（两个表面靠 gl_FrontFacing 分正反）。 */
    readonly pos: Float32Array;
    readonly nor: Float32Array;
    readonly mF: Material | null;
    readonly mB: Material | null;
    /** 平面基（贴图 uv = 点乘基 / 贴图物理尺寸）。 */
    readonly u: Pt3;
    readonly v: Pt3;
}
export declare function buildFaceRec(k: KernelView, fid: FaceId, matOf: (slot: number | undefined) => Material | null): FaceRec | null;
export interface EdgeRec {
    readonly a: Pt3;
    readonly b: Pt3;
    readonly loose: boolean;
    readonly w1: Pt3;
    readonly w2: Pt3;
    readonly flag: number;
}
/**
 * 看得见的边一条记录；粗线轮廓要两侧面各自往面里走的方向 + 面数（profile-edges.ts）。隐藏的边不画。
 * 软边 / 折线：平时不画；contour = true（粗线那条路）时进线批、旗 + CONTOUR_ONLY = 只在转成外轮廓时画（I12，user 10-30「软边没有变成外轮廓」，
 * 拍了「沿软边画折线、不画交线」= SketchUp 同款）。细线那条路（1 像素原生线）还没有判外轮廓的着色器 = 照旧不画（账本 I12）。
 */
export declare function buildEdgeRec(k: KernelView, eid: EdgeId, contour?: boolean): EdgeRec | null;
export type TexSide = "front" | "back" | "double";
export interface PoolMeshEnv {
    /** 槽号 → 材质（scene.materialOfSlot 绑好 definition）。 */
    matOf(slot: number | undefined): Material | null;
    /** 定义的材质槽表签名（每个槽的材质身份，逗号连）：一边是另一边的前缀 = 增量；别的变化 = 全量重建。 */
    slotsSig: string;
    /** 面 / 边烤进顶点的颜色（提供者按调色板算；淡出 / 选中不在这里 = 标记）。 */
    faceColor(mat: Material | null): readonly [number, number, number];
    edgeColor(loose: boolean): readonly [number, number, number];
    /** 粗线（LineSegments2 实例）还是像素线。 */
    thick: boolean;
    /** 单面的身体（mesh）：渲染剔背面（render3 换 FrontSide 材质）。 */
    singleSided: boolean;
}
export interface FaceGroup {
    readonly key: string;
    readonly mat: Material | null;
    readonly side: TexSide | null;
    readonly store: RegionStore;
}
export declare class PoolMesh {
    /** 现在反映的是哪个内核到第几号。 */
    private src;
    private srcSeq;
    /** 画的那一刻那份日志的族谱（2026-10-27 Opus 5.5）：提交 / 撤销会在内核对象之间整份换日志（swapTablesWith / swapWith），事后再读 src.changes 拿到的是换过的那份 → 差算错、该重建的没重建。所以画的时候就把族谱存下来。 */
    private srcLin;
    private sig;
    private thick;
    /** 现在反映的池是不是单面（渲染器据此挑剔背面的材质）。 */
    singleSided: boolean;
    /**
     * 缓存反映的每张面当时的环边（画不画都记——隐藏的面没有画的记录）：面被删 / 被改的时候，靠这里知道它当时挨着哪些边，
     * 那些边的面链接变了、边两头的法线扇也可能变（日志只记了面）。只记边编号：顶点从边的两头来（边被删了 = 日志里有那条边 + 它两侧的面）。
     */
    private faceTopo;
    /** 每张面落在哪组（绝大多数一组 = 一个字符串；两侧各自贴图 = 数组）。 */
    private faceGroups;
    readonly groups: Map<string, FaceGroup>;
    lines: DenseStore;
    private matIds;
    /** 现在反映的是哪个内核（渲染器挑「本来就画着它的那份」用）。 */
    get source(): KernelView | null;
    /** 上一次同步：全量还是增量、重建了多少（计时 / 测试用）。 */
    last: {
        full: boolean;
        faces: number;
        edges: number;
    };
    /** 让缓存反映内核 T（池本地坐标）。返回这次重建了多少。 */
    sync(T: KernelView, env: PoolMeshEnv): {
        full: boolean;
        faces: number;
        edges: number;
    };
    /**
     * 现在反映的状态 → 目标 T 之间可能不同的编号：沿族谱（ChangeLog.lineage：每格 = 一份日志数据 + 到第几号）找最近的共同祖先，
     * 把两边各段的日志并起来（每个后代从它分出来那号起改过的 + 共同祖先在两个分叉点之间改过的）。找不到 / 有一段说不知道 = null（全量）。
     */
    private diffTo;
    private full;
    /** 一条边在线块里占的段（标记：选中 / 悬停 / 刮擦 / 检查的边按段换材质；软边 / 折线 / 藏起来的边不在线块里 = null）。 */
    edgeRange(eid: EdgeId): readonly [number, number] | null;
    /** 一张面在各组里占的段（顶点偏移 / 顶点数；两侧材质不同的面在两组里）：标记（选中 / 悬停）按段换材质用（窄接口刀 b）。 */
    faceRanges(fid: FaceId): {
        key: string;
        off: number;
        len: number;
    }[];
    private noteFace;
    private group;
    private matKey;
    /** 一张面落进哪几组（同 buildKernelGeom 的规则）：两侧同一张贴图 = 双面贴图组；各自的贴图 = 正 / 背贴图组；有一侧不是贴图 = 纯色组（贴图那侧填 −1 = 纯色网格不画）。 */
    private writeFace;
    private writeEdge;
}
