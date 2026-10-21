import type { BrepSnapshot } from "../kernel/kernel.ts";
import type { ViewSink } from "./brep-codec.ts";
export interface BakeResult {
    accessors: Record<string, unknown>[];
    bufferViewTargets: Map<number, number>;
    mesh: Record<string, unknown>;
}
/** 多个池（definition 根池 + 各 group）合并成一份快照（索引平移；平面各自保留）。bake 用。added 2026-10-21 */
export declare function mergeBrep(snaps: readonly BrepSnapshot[]): BrepSnapshot;
/** 材质槽 → glTF core 材质索引 + 贴图物理尺寸（bake 按材质拆 primitive、算 TEXCOORD_0 用）。 */
export interface BakeMaterials {
    slotToCore: (slot: number) => number | undefined;
    sizeOfCore: (core: number) => readonly [number, number] | null;
}
/**
 * 把一个 definition 的 B-rep 烘成 glTF mesh（accessor 索引从 accessorBase 起）。软边不进 LINES（圆柱侧面不出竖线）。
 * 贴图纪元（2026-10-21）：按材质拆 primitive（契约「按 (材质, tag) 拆 prim」）——默认材质一份（共享顶点，无 UV）；每种材质一份
 * 自己的 POSITION（逐角，不共享）+ 有贴图时 TEXCOORD_0 = 沿面平面确定性基的平面投影 / 物理尺寸（契约「默认不存 UV」档：三方看到的就是 app 的默认贴法）。
 */
export declare function bakeDefinition(snap: BrepSnapshot, sink: ViewSink, accessorBase: number, mats?: BakeMaterials): BakeResult;
