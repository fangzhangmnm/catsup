export interface Pt {
    readonly x: number;
    readonly y: number;
}
export declare const Q = 0.000001;
/** 共面容差 τ 出厂值 = 10 µm（user 2026-10-24「10um够就10um，这个比较符合我的心理预期」）：此前 1 mm 是浮点时代留下的，和身份分辨率 r = 3 µm 差了两个半数量级，
 *  中间那条带 (r, 2τ] 就是 D11 整条线的来源；10 µm ≥ 3 倍量化噪声（点吸到面上再落格最多偏 ~2 µm）、比 SketchUp 的 0.001″≈25 µm 还细、fuzz 与 1600 件场景零拒绝（3 µm 则出事）。
 *  τ 按文档存（brep 快照 coplanarTol），老文档照旧吃自己存的值，不迁。 */
export declare const COPLANAR_TOL_DEFAULT: number;
export declare const EPS: number;
export declare const EPS_AREA = 1e-9;
export declare function quantize(p: Pt): Pt;
/** 量化格点的精确身份 key（顶点去重用）。输入须已量化。 */
export declare function ptKey(p: Pt): string;
export declare function samePt(a: Pt, b: Pt): boolean;
export declare function dist(a: Pt, b: Pt): number;
export declare function angleOf(from: Pt, to: Pt): number;
/** (a-o)×(b-o) 叉积；>0 = b 在 oa 左侧。 */
export declare function cross(o: Pt, a: Pt, b: Pt): number;
/** p 是否落在线段 ab 上（含端点，EPS 容差）。 */
export declare function pointOnSegment(p: Pt, a: Pt, b: Pt): boolean;
/**
 * 两线段的交点集：正常相交/T 交 → 1 点；共线重叠 → 重叠区两端点；不交 → []。
 * 返回点已量化。subdivide 拿这个打交点切边（公理 4 dividing 的算法本体）。
 */
export declare function segIntersections(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt[];
/** 环的有向面积（shoelace）；CCW 为正。 */
export declare function signedArea(ring: readonly Pt[]): number;
/** 射线法点在环内（不含环上；环上结果未定义——调用方自己保证离边界有距离）。 */
/** 点在环内（奇偶规则；EGC 期 3：跨越判定用精确 orient2dD，不再做浮点除法——边界上仍未定义）。 */
export declare function pointInRing(p: Pt, ring: readonly Pt[]): boolean;
/** 点到线段距离（playground hitTest 用）。 */
export declare function distToSegment(p: Pt, a: Pt, b: Pt): number;
export interface Pt3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}
export declare function quantize3(p: Pt3): Pt3;
export declare function ptKey3(p: Pt3): string;
export declare function samePt3(a: Pt3, b: Pt3): boolean;
/** 三维平面多边形的面积（Newell 法向的模 / 2；环的顶点顺序任意）。带洞的面 = 外环减内环。 */
export declare function polygonArea3(ring: readonly Pt3[]): number;
export declare function dist3(a: Pt3, b: Pt3): number;
export declare const sub3: (a: Pt3, b: Pt3) => Pt3;
export declare const add3: (a: Pt3, b: Pt3) => Pt3;
export declare const scale3: (a: Pt3, s: number) => Pt3;
export declare const dot3: (a: Pt3, b: Pt3) => number;
export declare const cross3: (a: Pt3, b: Pt3) => Pt3;
export declare const len3: (a: Pt3) => number;
export declare function normalize3(a: Pt3): Pt3;
/** 平面：单位法向 n + 距离 d（n·p = d）。canonical：n 首个非微小分量为正。 */
export interface PlaneParams {
    readonly n: Pt3;
    readonly d: number;
}
export declare function canonicalPlane(nRaw: Pt3, d: number): PlaneParams;
/** 三点定平面；共线（叉积过小）→ null。 */
export declare function planeFromPoints(a: Pt3, b: Pt3, c: Pt3): PlaneParams | null;
/**
 * 环的平面（Newell 法：法向 = 各边 (a×b) 之和，对整环求和；d = n·质心），canonical。
 * 比「取前三个点」稳：µm 级尖刺 / 近共线三点不会给出垃圾法向（2026-10-23 fuzz 种子 314187：环起点一换、前三点近共线 → 认领不到）。
 * 退化（法向长度 ≤ EPS·周长²）→ null。非平面环给出的是「平均平面」，只配拿来做共面测试 / 候选匹配。added by Claude Fable 5.1
 */
export declare function planeOfRing(ring: readonly Pt3[]): PlaneParams | null;
export declare function distToPlane(p: Pt3, pl: PlaneParams): number;
/** 确定性正交基：同一 canonical 平面每次算出同一 (u,v)——投影坐标跨重跑稳定的根基。 */
export declare function planeBasis(pl: PlaneParams): {
    u: Pt3;
    v: Pt3;
};
export declare function projectToPlane(p: Pt3, basis: {
    u: Pt3;
    v: Pt3;
}): Pt;
export declare function liftFromPlane(p2: Pt, pl: PlaneParams, basis: {
    u: Pt3;
    v: Pt3;
}): Pt3;
/** p 是否落在 3D 线段 ab 上（含端点，tol 容差，默认 EPS；sticky 插入用量化格容差 INSERT_TOL——见 subdivide.ts）。 */
export declare function pointOnSegment3(p: Pt3, a: Pt3, b: Pt3, tol?: number): boolean;
/** 点到 3D 线段距离。 */
export declare function distToSegment3(p: Pt3, a: Pt3, b: Pt3): number;
/**
 * 3D 线段交点集：斜交（距离 > tol）→ []；共面相交/T 交 → 1 点；共线重叠 → 重叠区两端点。
 * 返回点已量化。tol 默认 EPS；sticky 插入用量化格容差（见 subdivide.ts INSERT_TOL）。
 */
export declare function segIntersections3(a1: Pt3, a2: Pt3, b1: Pt3, b2: Pt3, tol?: number): Pt3[];
