import type { Edge, EdgeId, Face, FaceId, Kernel, Pt, Pt3, VertexId } from "../kernel/kernel.ts";
import type { CurveSpec } from "../kernel/kernel.ts";
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
/** 曲线规格换到池本地坐标：点经 toLocal，方向经两点之差，半径按两点距离（池有缩放时跟着缩）。 */
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
export interface Selection {
    edges: Set<EdgeId>;
    faces: Set<FaceId>;
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
