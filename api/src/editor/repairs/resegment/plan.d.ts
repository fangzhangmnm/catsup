import type { BrepSnapshot, EdgeId, FaceId, Kernel, Pt3 } from "../../../kernel/kernel.ts";
/** 一侧一个材质槽（[朝外, 朝里]，−1 = 没上色）。 */
type Sides = [number, number];
export interface RevolvedBody {
    /** 这一块的面 / 边（池里的 id，执行时删掉换新的）。 */
    faces: FaceId[];
    edges: EdgeId[];
    /** 轴：c = 第一圈的圆心，n = 单位法向；u = 起始方向（角度 0），v = n × u。 */
    c: Pt3;
    n: Pt3;
    u: Pt3;
    v: Pt3;
    segments: number;
    /** 各圈：沿轴的位置 t、半径 r；cap = 这一圈封着一张圆盘（它的颜色）。 */
    rings: {
        t: number;
        r: number;
        cap: Sides | null;
    }[];
    /** 圈和圈之间：band = 四边形长条一圈（soft = 长条之间的边是软边），annulus = 同一平面上的圆环。 */
    links: {
        a: number;
        b: number;
        kind: "band" | "annulus";
        mat: Sides;
        soft: boolean;
        smooth: boolean;
    }[];
}
/** 池里干净的回转体（一块一个）；scopeFaces 有 = 只要碰到这些面的块。notClean = 看着像（两圈以上同轴同段数的圆）但不干净的块数。 */
export declare function findRevolved(k: Kernel, scopeFaces: ReadonlySet<FaceId> | null): {
    bodies: RevolvedBody[];
    notClean: number;
};
/** 按新段数造一份快照（池本地坐标）：圈 = 带参数的圆，长条之间的边照原来的软 / 平滑，颜色按朝外 / 朝里对上。 */
export declare function revolvedSnapshot(b: RevolvedBody, N: number, coplanarTol: number): BrepSnapshot;
export {};
