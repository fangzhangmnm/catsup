import type { ChartSource, ChartMesh } from "./chart-mesh.ts";
export interface UnwrapOptions {
    /** 最多几轮（默认 40）。 */
    readonly maxIters?: number;
    /** 能量相对下降小于这个就停（默认 1e-4）。 */
    readonly tol?: number;
    /** 补洞的虚面在能量里的权（× 它在三维里的面积；0 = 不进能量、只管不翻）。默认 0.1：可莉 / wip2020 / 熊 / Metasequoia 坦克带洞的片上比过 0 / 0.01 / 0.1 / 1，0.1 整体最好（施工单二十二第 2 刀施工记录）。 */
    readonly virtualWeight?: number;
    /** 每一轮问一次：true = 停（交当前这一轮，照样满足不变量）。 */
    readonly shouldStop?: () => boolean;
}
export interface Stretch {
    /** 真的三角形几个、其中退化的几个（不进拉伸的数）。 */
    readonly triangles: number;
    readonly degenerate: number;
    /** 平面面积 ÷ 三维面积：最大、最小、按三维面积加权的平均；另附按面积加权的 5% / 95% 分位（最大最小常被三维里很细的碎三角形撑出来，分位看整片）。 */
    readonly area: {
        readonly max: number;
        readonly min: number;
        readonly mean: number;
        readonly p05: number;
        readonly p95: number;
    };
    /** σ1 / σ2（≥ 1）：最大、加权平均、加权 95% 分位；三个角和三维比平均差几度。 */
    readonly angle: {
        readonly max: number;
        readonly mean: number;
        readonly p95: number;
        readonly meanDeg: number;
    };
}
export type ChartUnwrap = {
    readonly ok: true;
    readonly faces: readonly number[]; /** 每张面每个角（按 mesh 里环的顺序）的平面坐标（米）：[u0, v0, u1, v1, …]。 */
    readonly corners: ReadonlyMap<number, Float64Array>;
    readonly stretch: Stretch;
    readonly iterations: number; /** 起步那一轮起每一轮的能量（每张三维面积上的对称狄利克雷，最小 = 4）。 */
    readonly energies: readonly number[];
    /** 边界贴上了：最后一轮的步子被「边界会交叉」砍过（这片想自己叠上才能更平，停在贴着的地方；拉伸多半大，要再切）。 */ readonly blockedByCrossing: boolean;
    readonly cancelled: boolean;
    /** 补了几个洞；两条边的「洞」（一条切开的边、两头都还连着 = 张不开）不补、当它没切，记在 slits。 */ readonly holesFilled: number;
    readonly slits: number;
    /** 为了和邻居一致、在副本里绕向倒过来的面（模型里这几张面的绕向和邻居不一致）：它们在平面上和自己的三维法向相反，这是对的。 */ readonly flipped: ReadonlySet<number>;
} | {
    readonly ok: false;
    readonly faces: readonly number[];
    readonly reason: "non-orientable" | "genus" | "closed" | "broken-loops" | "tiny-boundary" | "start-flipped";
};
/** J = rot(φ) · diag(s1, s2) · rot(θ)（s1 ≥ |s2|；s2 < 0 = 翻了）。 */
export declare function svd2(a: number, b: number, c: number, d: number): {
    s1: number;
    s2: number;
    phi: number;
    theta: number;
};
export declare function unwrap(m: ChartSource, faces: readonly number[], cut: (e: number) => boolean, opts?: UnwrapOptions): ChartUnwrap[];
export declare function unwrapChart(m: ChartSource, ch: ChartMesh, opts?: UnwrapOptions): ChartUnwrap;
/** 边界圈在平面上有没有交叉（不相邻的两段相交 = 交叉）。格子哈希：格宽 = 段的平均长。 */
export declare function boundariesCross(X: Float64Array, loops: readonly (readonly number[])[]): boolean;
