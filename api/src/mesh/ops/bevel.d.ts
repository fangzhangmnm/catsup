import { MeshKernel } from "../mesh-kernel.ts";
export interface BevelResult {
    /** 新长出来的面（倒角带 + 角上的补片），按创建顺序。 */
    faces: number[];
    /** 实际用的宽度（被夹过 = 比要的小）。 */
    width: number;
    clamped: boolean;
    /** 没倒的边 / 点（不是恰好两张面、端点不是封闭扇……）。 */
    skipped: number;
}
/**
 * 倒边。edges 里不是恰好两张面的、端点不是封闭扇的跳过（skipped）。width = 本地长度；segments = 倒角带分几条（1 = 一刀切平，≥ 2 = 圆角）。
 */
export declare function bevelEdges(k: MeshKernel, edges: readonly number[], width: number, segments?: number): BevelResult;
/** 倒点：选中的点各自在连着的每条边上往外 width 处切一刀，角换成一张补片。不是封闭扇的点跳过。 */
export declare function bevelVerts(k: MeshKernel, verts: readonly number[], width: number): BevelResult;
