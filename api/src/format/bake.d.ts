import type { BrepSnapshot } from "../kernel/kernel.ts";
import type { ViewSink } from "./brep-codec.ts";
export interface BakeResult {
    accessors: Record<string, unknown>[];
    bufferViewTargets: Map<number, number>;
    mesh: Record<string, unknown>;
}
/** 多个池（definition 根池 + 各 group）合并成一份快照（索引平移；平面各自保留）。bake 用。added 2026-10-21 */
export declare function mergeBrep(snaps: readonly BrepSnapshot[]): BrepSnapshot;
/** 把一个 definition 的 B-rep 烘成 glTF mesh（accessor 索引从 accessorBase 起）。软边不进 LINES（圆柱侧面不出竖线）。 */
export declare function bakeDefinition(snap: BrepSnapshot, sink: ViewSink, accessorBase: number): BakeResult;
