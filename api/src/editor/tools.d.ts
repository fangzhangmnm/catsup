import type { Edge, EdgeId, Face, FaceId, Kernel, Pt, Pt3, VertexId } from "../kernel/kernel.ts";
import type { CurveParams, CurveSpec } from "../kernel/kernel.ts";
import { type Xform } from "../scene/xform.ts";
import { type PlaneParams } from "../kernel/geom.ts";
/** Rect 工具（任意平面版）：对角两点（须在平面上）→ 4 条边。退化 → []。 */
export declare function rectSegmentsOnPlane(plane: PlaneParams, basis: {
    u: Pt3;
    v: Pt3;
}, a3: Pt3, b3: Pt3): [Pt3, Pt3][];
/**
 * Arc 工具（0.10，SU 两点 + 凸度）：起点 a、终点 b、弧上一点 p（都在平面上）→ 过三点的圆上从 a 到 b 经过 p 的那段弧，n 段。
 * 三点共线 / 太近 → null。返回段 + 圆参数（sweep 带号：正 = 绕法向逆时针）。added 2026-10-24 by Claude Fable 5.1
 */
export declare function arcSegmentsOnPlane(plane: PlaneParams, basis: {
    u: Pt3;
    v: Pt3;
}, a3: Pt3, b3: Pt3, p3: Pt3, n?: number): {
    segs: [Pt3, Pt3][];
    center: Pt3;
    radius: number;
    sweep: number;
} | null;
/** 面的外环若恰是一条闭合圆曲线 → 它的圆参数（换到世界系：圆心经 m，方向经两点之差，半径按变换后距离）；否则 null。（纯函数，node 直测） */
export declare function circleOfFace(k: Kernel, face: FaceId, m: Xform): CurveParams | null;
/** 偏移一个圆（d > 0 = 向内）：同圆心同法向、半径 r − d 的新圆；塌没了 → null。 */
export declare function offsetCircleSpec(params: CurveParams, d: number): CurveSpec | null;
/** 曲线规格换到池本地坐标：点经 toLocal，方向经两点之差，半径按两点距离（池有缩放时跟着缩）。 */
/** 圆的曲线规格（世界系 → 池本地）：圆心、半径、法向、x 轴指向半径点、段数。画圆与数值小窗重做共用。 */
export declare function circleCurveSpec(toLocal: (p: Pt3) => Pt3, center: Pt3, rim: Pt3, plane: {
    plane: {
        n: Pt3;
    };
}, segments: number): CurveSpec;
export declare function curveSpecToLocal(toLocal: (p: Pt3) => Pt3, spec: CurveSpec): CurveSpec;
/** Circle 工具：圆心 + 半径点（都在平面上）→ n 段正多边形（SU 默认 24 段；第一个顶点在半径点方向）。退化 → []。added 2026-10-21 */
export declare function circleSegmentsOnPlane(plane: PlaneParams, basis: {
    u: Pt3;
    v: Pt3;
}, c3: Pt3, r3: Pt3, n?: number): [Pt3, Pt3][];
/** Rect 工具（2D/俯视版，测试与验收①沿用）：对角两点 → 4 条边（轴对齐）。退化 → []。 */
export declare function rectSegments(a: Pt, b: Pt): [Pt, Pt][];
export interface Marquee {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export declare function marqueeOf(a: Pt, b: Pt): Marquee;
/** 选区：内核实体（边 / 面）+ 活动池的参考几何 id（A31，2026-10-24 Opus：参考线 / 参考点能被选择工具选中、Delete 删）。 */
export interface Selection {
    edges: Set<EdgeId>;
    faces: Set<FaceId>;
    guides: Set<number>;
}
export declare const emptySelection: () => Selection;
/** 移动工具的目标展开：顶点→自己；边→两端点；面→外环+洞环全部顶点。 */
export declare function moveTargets(k: Kernel, hit: {
    vertex?: VertexId;
    edge?: EdgeId;
    face?: FaceId;
}): VertexId[];
/** 批量平移：目标顶点集整体位移 delta（moveVertices 一批收口；z 缺省 0）。 */
export declare function translateMoves(k: Kernel, vids: readonly VertexId[], delta: {
    x: number;
    y: number;
    z?: number;
}): {
    id: VertexId;
    to: {
        x: number;
        y: number;
        z: number;
    };
}[];
/** 多选混移展开（SU 同款：线/面混选合法）：选区全部实体 → 顶点并集。added by Claude Fable 5 2026-09-01 */
export declare function moveTargetsSelection(k: Kernel, sel: Selection): VertexId[];
/** 类型 re-export 便利（main.ts 少一层 import）。 */
export type { Edge, Face };
import type { ToolTarget } from "./solver.ts";
/** 矩形第二点：从首点出发的两条对角线 = 正方形（秩同轴线）；四条黄金分割线（稍低）。 */
/** Shift 角度对齐（B33；user 2026-10-24「画线的时候shift可以15度对齐」）：平面内从锚点出发的方向按 stepDeg 咬合，长度不变；返回咬合后的点与度数。 */
export declare function snapDirectionInPlane(anchor: Pt3, p: Pt3, basis: {
    u: Pt3;
    v: Pt3;
}, stepDeg?: number): {
    p: Pt3;
    deg: number;
};
export declare function rectToolTargets(anchor: Pt3, basis: {
    u: Pt3;
    v: Pt3;
}): ToolTarget[];
/** 两点弧第三点（凸度）：弦中垂线上离弦 |AB|/2 的两个点 = 半圆。 */
export declare function arcToolTargets(a: Pt3, b: Pt3, n: Pt3): ToolTarget[];
/** 带号角度的连续化：raw ∈ (−π, π] 加减 2π 使其离 prev 最近（圆心弧 / 旋转一直转过 180° 不跳）。 */
export declare function unwrapAngle(prev: number, raw: number): number;
/** 圆心弧（SU Arc / Pie）：圆心 c、起点 a（定半径与 0°）、扫角 sweep（弧度，带号，可超 180°）→ n 段。退化（半径 0 / 扫角 0）→ null。 */
export declare function centerArcSegments(plane: PlaneParams, basis: {
    u: Pt3;
    v: Pt3;
}, c3: Pt3, a3: Pt3, sweep: number, n?: number): {
    segs: [Pt3, Pt3][];
    center: Pt3;
    radius: number;
    end: Pt3;
} | null;
/** 平面上从 c→a 转到 c→p 的带号角（绕法向 n，右手；(−π, π]）。 */
export declare function sweepAngle(c: Pt3, a: Pt3, p: Pt3, n: Pt3): number;
/** 两点弧：弦 a–b、同侧、给定半径 r（≥ 弦半长）→ 劣弧的凸度点（VCB 改半径用）；r 太小 → 半圆。 */
export declare function bulgePointForRadius(a: Pt3, b: Pt3, side: Pt3, r: number): Pt3;
/** 矩形的对角（从角 = 锚点本身；从中心 = 锚点关于 b 的对称点，user 2026-10-24「中心rect……还是要」）。 */
export declare function rectOpposite(anchor: Pt3, b: Pt3, from: "corner" | "center"): Pt3;
/**
 * 旋转矩形（SU Rotated Rectangle）：A 第一角、B 第一边终点、C 第二边终点（都在平面上）→ 四角 A B C D，D = A + (C − B)。
 * 角度不限 90°（平行四边形合法，SU 同款）；退化（边长 0 / C 落在 AB 直线上）→ null。
 */
export declare function rrectCorners(a: Pt3, b: Pt3, c: Pt3): [Pt3, Pt3, Pt3, Pt3] | null;
export declare function rrectSegments(a: Pt3, b: Pt3, c: Pt3): [Pt3, Pt3][];
/** 第二边在 B 处相对 BA 的内角（度，0..180）与转向（沿 A→B 走到 B 后向左转 = +1（绕 n 逆时针）、向右 = −1）。 */
export declare function rrectAngle(a: Pt3, b: Pt3, c: Pt3, n: Pt3): {
    deg: number;
    side: 1 | -1;
};
/** 角度 + 宽 → C：B + w·(cos·BA + side·sin·(n × AB))——内角 deg、转向 side，与 rrectAngle 互逆。 */
export declare function rrectCornerFromAngle(a: Pt3, b: Pt3, n: Pt3, deg: number, w: number, side: 1 | -1): Pt3;
/**
 * 第二边角度咬合（A34 的量角器手感）：90° 强吸（±strongDeg 内直接 90°）；Shift 按着 → 15° 格；其余照指针。长度 |BC| 不变。
 * 返回咬合后的 C 与角度（度）；snapped = 是否咬住了格。
 */
export declare function rrectSnapAngle(a: Pt3, b: Pt3, c: Pt3, n: Pt3, opts: {
    shift: boolean;
    stepDeg?: number;
    strongDeg?: number;
}): {
    c: Pt3;
    deg: number;
    snapped: boolean;
};
