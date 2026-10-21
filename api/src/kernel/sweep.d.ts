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
/** 去掉连续重复点（退化四边形 → 三角）；不足 3 点 → []。 */
export declare function dedupeRing(pts: readonly Pt3[]): Pt3[];
/** 段方向（单位），给编辑器选取向用。 */
export declare function segDir(a: Pt3, b: Pt3): Pt3;
