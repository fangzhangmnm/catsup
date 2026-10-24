import type { Pt3 } from "./geom.ts";
/** 各站的轮廓环：stations[i][ring][j]。开路径 = path.length 站；闭路径 = path.length 站（末段接回第 0 站）。失败 → 原因字符串。 */
export declare function sweepStations(rings: readonly (readonly Pt3[])[], path: readonly Pt3[], closed: boolean): Pt3[][][] | string;
/**
 * 并掉共线关节（两段同向 = 不是拐角）：那里的站圈只会把共面的侧面切成两张（弦端点落在路径上时常见）。
 * 零长段也并掉。smoothJoints 同步删。闭路径全部顶点都可能被并；开路径两端保留。
 */
export declare function simplifyPath(path: readonly Pt3[], closed: boolean, smoothJoints?: readonly boolean[]): {
    path: Pt3[];
    smoothJoints: boolean[] | undefined;
};
/**
 * 闭路径起点对齐（规则 ① 的闭路径版，2026-10-23 Claude Fable 5.1）：第 0 站是「轮廓沿第 0 段方向投到 p₀ 的切面」，所以第 0 段必须**横穿**轮廓平面
 * （方向与轮廓法向不平行 ⇒ 投影良态）且轮廓就在它的一端。调用方给的环起点任意（面环的起点只是追踪顺序的产物），这里旋转路径
 * 让第 0 段 = 与轮廓法向最不平行、且离轮廓质心最近的那一段；smoothJoints 同步旋转。开路径不动。
 * 不对齐的后果：第 0 段落在轮廓平面内 → 第 0 站投影塌成线段 → 全部侧面退化被丢 → 扫掠静默变成「只切了几刀」（test/followme 倒角案）。
 */
export declare function alignClosedPath(rings: readonly (readonly Pt3[])[], path: readonly Pt3[], smoothJoints?: readonly boolean[]): {
    path: Pt3[];
    smoothJoints: boolean[] | undefined;
};
/** 去掉连续重复点（退化四边形 → 三角）；不足 3 点 → []。 */
export declare function dedupeRing(pts: readonly Pt3[]): Pt3[];
/** 段方向（单位），给编辑器选取向用。 */
export declare function segDir(a: Pt3, b: Pt3): Pt3;
