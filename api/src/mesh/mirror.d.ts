import { MeshKernel } from "./mesh-kernel.ts";
import type { Pt3 } from "../kernel/kernel.ts";
export type MirrorAxis = 0 | 1 | 2;
/** 镜像编辑（找得到对面的点一起改）/ 强行对称（每一步删掉另一半、照这一半镜回来）。 */
export type MirrorMode = "edit" | "force";
export interface MirrorSetting {
    readonly mode: MirrorMode;
    readonly axis: MirrorAxis;
}
/** 镜像编辑找对面的点的容差、算「在中缝上」的容差（米；调参纪律：物理长度单独定）。 */
export declare const MIRROR_TOL = 0.001;
export declare const coordOf: (p: Pt3, a: MirrorAxis) => number;
export declare const withCoord: (p: Pt3, a: MirrorAxis, c: number) => Pt3;
export declare const mirrorPt: (p: Pt3, a: MirrorAxis) => Pt3;
/** 每个点对面的点（中缝上的 = 自己；对面在容差里找不到 = -1）。空间散列，O(点数)。 */
export declare function mirrorPairs(m: MeshKernel, axis: MirrorAxis, tol?: number): Map<number, number>;
export interface MirrorMovesResult {
    moves: {
        v: number;
        to: Pt3;
    }[];
    /** 落到中缝上的点并成一个（keep 留；drop = 它的孪生点 + 落点处本来就有的中缝点，一起并进去；at = 并到哪；split = 落点在一条中缝边的中间：先在 t 处劈开它、劈出来的点一起并）。两种模式都有，调用方提交 meshMerge。 */
    merges: {
        keep: number;
        drop: number[];
        at: Pt3;
        split?: {
            edge: number;
            t: number;
        };
    }[];
    mirrored: number;
    unpaired: number;
    pinned: number;
    /** 想穿过镜像面被夹住的点数（R3）。 */
    clamped: number;
}
/**
 * 挪点在镜像下的纪律（设计稿 `ai-docs/20261028-mirror-redo-design.md` §1，user 10-28「中间的点往外拖不应该变成两个点，而是被吸附在中线上」「往中线拖也是collapse到中线，不要有double point，不要拖到对面去」）：
 * R1 钉：中缝上的点只在面内滑；R3 不穿：跑到对面的点夹在镜像面上；R2 并：落到中缝的点和孪生点并成一个（孪生点自己的目标作废）；
 * 镜像编辑另外补上对面的点（镜过去），两边都被挪了的一对：动得多的那一边说了算（哪边动了哪边为准）；强行对称只管住这一边，另一半事后由对称化重建。
 * m = 挪之前的内核（分边、配对都按挪之前的位置）。输出按点 id 升序（确定性）。
 */
export declare function mirrorMoves(m: MeshKernel, moves: readonly {
    v: number;
    to: Pt3;
}[], axis: MirrorAxis, mode?: MirrorMode, tol?: number): MirrorMovesResult;
/** 这一步动了哪一边（新长出来的点、删掉的点各按 1，挪过的点按挪的距离投票；挪到中缝上的点按它来的那一边算）：+1 / -1；看不出来 = 0。删掉的点 2026-11-09 补上（计划书第 5 层：以前不算删的 = 删一边看不出动的是哪边）。 */
export declare function sideOfChange(before: MeshKernel, after: MeshKernel, axis: MirrorAxis, tol?: number): -1 | 0 | 1;
/**
 * 挪过的旧点在哪一边（只看这一步之前就在的点，按挪的距离投票；挪到中缝上的按它来的那一边算）：没有旧点挪过 = 0。
 * 强行对称选边的第一顺位（forceSide；2026-11-10 Claude Fable 5.2 审 v0.18.45 时从 sideOfChange 里分出来）：新长的 / 删掉的点不在这里算——
 * 把面朝镜像面挤出、穿过去时，新点落在对面，但人干活的是点名的那一半。
 */
export declare function sideOfMoved(before: MeshKernel, after: MeshKernel, axis: MirrorAxis, tol?: number): -1 | 0 | 1;
/** 一组点 / 边 / 面（边、面按它们的点算）的坐标和在镜像面哪一边：正好在面上 / 一个都没有 = null（打开强行对称时按选区那边为准）。 */
export declare function sideOfElements(m: MeshKernel, verts: Iterable<number>, edges: Iterable<number>, faces: Iterable<number>, axis: MirrorAxis, tol?: number): -1 | 1 | null;
/**
 * 强行对称以哪半为准的最后一道（计划书 §3 第 0 层；created 2026-11-09 by Claude Opus 5.5）：想要的那半（wanted）没有面、另一半有 → 换另一半；
 * 两半都没有面 → 有东西（裸线 / 孤点）的那半，wanted 优先；什么都没有 → null = 这一步不对称化（说出来）。
 * 面优先于线（v0.18.45，Opus 定的边界、待 Fable 审）：计划书原文是「没有任何面也没有裸线才换」，但那样「想要的那半只有一条线、另一半是整个模型」= 面全删；换过去最坏丢的是刚画的一条线（有提示、能撤销）。
 * 挡的是：「看不出动的是哪边，默认 + 那半」碰上「+ 那半是空的」= 删掉另一半、镜过来 0 张面 = 整个模型删光（11-09 真 app 里跑出来的：模型整个在 − 那半时打开强行对称，6 张面 → 0）。
 * 不变量：只要模型里有不躺在镜像面上的面，返回值就不是 null，而且按它对称化之后至少留着它那半原有的面。
 * 打开强行对称、每步之后、预演三处选边都必须过它。
 */
export declare function pickSide(m: MeshKernel, axis: MirrorAxis, wanted: -1 | 1, tol?: number): -1 | 1 | null;
export interface ForceSide {
    readonly want: -1 | 1;
    readonly side: -1 | 1 | null; /** 动了哪边、点了谁都看不出来，用的是上一次的边（或 +）：提示行要说。 */
    readonly guessed: boolean;
}
/**
 * 强行对称这一步以哪半为准（提交 / 预演共用；计划书 §3 第 5 层）= 「人这一步在哪半干活」：
 *   ① 挪了的旧点在哪边（按挪的距离；sideOfMoved）→ ② 指令点名的点 / 边 / 面在之前的哪边 → ③ 新长出来的 / 删掉的在哪边（sideOfChange）→ ④ 上一次的边 → +；最后过 pickSide。
 * 为什么是这个顺序（2026-11-10 Claude Fable 5.2 审 v0.18.45 定的边界规则，两头的反例都有测试 test/mirror-force-symmetric.test.ts）：
 *   · 点名的不能排第一：挪点时点名的就是被挪的点，软选择跨中缝会把坐标和带偏（左边一堆点各挪一点点、右边一个点挪很多 → 坐标和偏左）——所以挪了的按距离先看（Opus 11-09）。
 *   · 新长的不能排在点名的前面：把 + 那半的面朝镜像面挤出、穿过去（推拉一条指令），新点落在 − 那半；以 − 为准 = 挤出的那段和盒子脱开、盒子上那张面被镜回来。
 *     以点名的 + 为准 = 挤出的那段在中缝切开、和对面焊上（同 Blender 镜像修改器的 clipping）。之前是对称的，所以选「人干活的那半」另一半什么都不丢。
 * named 的 id 在 before 的 id 空间里（mirror-ops.ts namedElements 从指令里取）。
 */
export declare function forceSide(before: MeshKernel, after: MeshKernel, axis: MirrorAxis, named: {
    verts: readonly number[];
    edges: readonly number[];
    faces: readonly number[];
}, last: -1 | 1 | undefined, tol?: number): ForceSide;
/** 「+X」「−Z」这类说法（提示行里说以哪半为准）。 */
export declare const sideLabel: (side: -1 | 1, axis: MirrorAxis) => string;
/**
 * 点 / 边 / 面各自加上它们的镜像（找得到的才加；中缝上的 = 自己）：强行对称下「点了谁就对谁做」的操作（删、翻、标记）把对面的一起做（计划书 §3 第 3 层）——
 * 做完自然对称，另一半不用重建、编号不乱；也不用猜「哪边为准」（左边删 A、右边删 B 时，按一边为准会把其中一张镜回来）。
 * 点 = mirrorPairs；边 = 两头的孪生点之间那条边；面 = 点集是镜像点集的那张面。只处理传进来的字段；输出升序去重。
 */
export declare function withMirrorCounterparts(m: MeshKernel, axis: MirrorAxis, t: {
    readonly verts?: readonly number[];
    readonly edges?: readonly number[];
    readonly faces?: readonly number[];
}, tol?: number): {
    verts?: number[];
    edges?: number[];
    faces?: number[];
};
/** 每一样的个数（点 / 边 / 面）。 */
export interface ElementCounts {
    readonly verts: number;
    readonly edges: number;
    readonly faces: number;
}
/**
 * withMirrorCounterparts 同一把尺，另外报数：added = 补进来的另一半（不在传进来的里面）；lonely = 找不到另一半的（点没有孪生点 / 孪生点之间没有那条边 / 没有那张面；
 * 中缝上的、自己就是自己镜像的不算）。强行对称下「移出一层」「移到…」带上另一半、提示行说几张（第 1 版版末审查第 1 条，统筹 11-13；2026-11-13 Claude Opus 5.5）。
 */
export declare function mirrorCounterpartReport(m: MeshKernel, axis: MirrorAxis, t: {
    readonly verts?: readonly number[];
    readonly edges?: readonly number[];
    readonly faces?: readonly number[];
}, tol?: number): {
    sel: {
        verts?: number[];
        edges?: number[];
        faces?: number[];
    };
    added: ElementCounts;
    lonely: ElementCounts;
};
/** 这些点的镜像孪生点（不含自己 / 中缝上的点 / 对面找不到的）：镜像开着时拖它们，孪生点跟着动——吸附不该吸孪生点原来的位置（ToolCtx.mirrorFollowers；计划书 20261109-audit-fixes-plan 工单 3）。 */
export declare function mirrorTwins(m: MeshKernel, verts: Iterable<number>, axis: MirrorAxis, tol?: number): Set<number>;
/**
 * 已经对称了吗（计划书 §3 定理，第 4 层；2026-11-09 Claude Opus 5.5 照条文重写——以前只查点、边存在和面的点集，漏了挖面 / 翻面 / 材质 / 边标记 / 裸线标记）：
 * 点（含孤点）一一对应；每条边（含裸线）的镜像是一条边、标记相同；每张面的镜像（点序倒过来 = 朝向相反）是一张面、材质槽相同；
 * 整张躺在镜像面上的面对应它自己；跨过镜像面的面 / 边镜过去是它自己（同一条查法自然成立）。「隐藏」是看法，不算。
 * 强行对称每步先查它：对称的就不重建另一半（另一半的 id 不乱换）；右上角方片、「开镜像时已经对称」也问它。
 */
export declare function isSymmetric(m: MeshKernel, axis: MirrorAxis, tol?: number): boolean;
/** 跨过镜像面的面（两侧都有点）有几张：强行对称做不了这种（先在中缝上切一刀）。 */
export declare function straddlingFaces(m: MeshKernel, axis: MirrorAxis, tol?: number): number;
export interface BisectResult {
    cutEdges: number;
    splitFaces: number;
    left: number;
}
/**
 * 沿镜像面切开（Blender Symmetrize / 镜像修改器的 Bisect 同款；user 10-28「镜像你忘了做切割」）：两端在两侧的边在镜像面上劈开（新点钉在面上），
 * 再把跨过镜像面的面沿中缝上的两个点劈成两半。一张面里中缝上的点不止两个（凹多边形被镜像面切成好几段）= 劈不了，数进 left。
 */
export declare function bisectPlane(m: MeshKernel, axis: MirrorAxis, tol?: number): BisectResult;
export interface SymmetrizeResult {
    removedFaces: number;
    removedVerts: number;
    added: number;
    pinned: number;
    cutEdges: number;
    walls: number; /** 镜过去的裸线 / 孤点（v0.18.45 起；T45）。 */
    wires: number;
    points: number;
}
/**
 * 强行对称：先沿镜像面切开（bisectPlane）；中缝上的点钉回镜像面；删掉 side 的另一边全部面和点；把 side 这边的面镜过去
 * （绕向反过来 = 朝向一致，中缝上的点两边共用 = 焊上）。切开以后还有跨过镜像面的面（凹多边形劈不开）= 抛（调用方在副本上先试，说出来）。边的标记跟着镜过去。
 * 最后 R4：整张躺在镜像面上、镜完变成夹层的面（每条边都夹在 ≥ 3 张面之间）清掉（user 10-28「degenerate和中线上的面也许应该清」，读成「只清会变成夹层的」）。
 * v0.18.45（计划书 §3 第 5 层，2026-11-09 Claude Opus 5.5）：这一边的裸线、孤点也镜过去（T45：以前只镜面，留着的那边有裸线 = 每一步都把另一半整个重建）；
 * 镜过去的面 / 边连「隐藏」一起抄（隐藏不算对称，但不抄的话另一半每次重建都会重新露出来）。做完 isSymmetric 必为真（测试钉住：再对称化一次 = 删 0 加 0）。
 */
export declare function symmetrize(m: MeshKernel, axis: MirrorAxis, side: -1 | 1, tol?: number): SymmetrizeResult;
/** 在副本上试一次对称化（会先沿镜像面切开）：成了 = 结果（切了几条边、删了 / 镜了几张面，说给人听），劈不开 = null。编辑器打开强行对称 / 每步之后用它先试。 */
export declare function trySymmetrize(m: MeshKernel, axis: MirrorAxis, side: -1 | 1): SymmetrizeResult | null;
/** R4：整张躺在镜像面上、而且每条边都已经夹在 ≥ 3 张面之间的面（镜完变成两半中间的夹层）删掉；孤零零躺在镜像面上的平面（没有两侧）不碰。返回删了几张。 */
export declare function removeSeamWalls(m: MeshKernel, axis: MirrorAxis, tol?: number): number;
export type SnapSide = "auto" | "flip" | "average";
export interface SnapResult {
    pairs: number;
    pinned: number;
    unpaired: number;
}
/**
 * 对称对齐（只对选区；Blender Snap to Symmetry）：选中的点在容差里找对面的点，对齐成严格的镜像；中缝附近的点钉到镜像面。
 * 以哪边为准：auto = 选区重心在哪边就以哪边为准（user「8同意」）/ flip = 另一边 / average = 两边取平均。对面找不到的不动、数出来。
 */
export declare function snapToSymmetry(m: MeshKernel, verts: readonly number[], axis: MirrorAxis, tol: number, mode?: SnapSide): SnapResult;
