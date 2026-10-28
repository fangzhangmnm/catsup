import type { BrepSnapshot } from "../kernel/kernel.ts";
import type { MeshDoc } from "./document.ts";
import type { ViewSink } from "./brep-codec.ts";
export interface BakeResult {
    accessors: Record<string, unknown>[];
    bufferViewTargets: Map<number, number>;
    mesh: Record<string, unknown>;
}
/** 多个池（definition 根池 + 各 group）合并成一份快照（索引平移；平面各自保留）。bake 用。added 2026-10-21 */
export declare function mergeBrep(snaps: readonly BrepSnapshot[]): BrepSnapshot;
export declare function quantNormal(n: {
    x: number;
    y: number;
    z: number;
}): [number, number, number];
/**
 * 平滑法向（快照版，与 editor/pool-mesh.ts fanNormal 同算法——屏幕上看到的 = 导出的；2026-10-26 DT96 起取代整组并查集版，Claude Opus 5.5）：
 * 每个 (膜, 外环角) 从这张膜出发，在这个顶点处向两边跨平滑边 / 折线（硬边、边界、非流形就停），扇里每张膜的法向按内角加权；
 * 跨边时「两张膜在共享边上走向相反 = 朝向一致」统一朝向；结果翻到本膜法向那一侧。硬边因此在平滑组里也断开明暗（旧版整组平均会把绕回来的硬接缝抹平）。
 * 返回 面下标 → (顶点下标 → 法向)；有平滑边连着别的膜的膜才在表里（其余用平面法向、走省流档）。
 */
export declare function smoothNormalsOf(snap: BrepSnapshot): Map<number, Map<number, [number, number, number]>>;
/** 材质槽 → glTF core 材质索引 + 贴图物理尺寸（bake 按材质拆 primitive、算 TEXCOORD_0 用）。 */
export interface BakeMaterials {
    slotToCore: (slot: number) => number | undefined;
    sizeOfCore: (core: number) => readonly [number, number] | null;
}
/** bake 的取舍（「导出模型」sheet 用；导出设计稿 §4）：lines = false → 不出 LINES primitive（有的查看器画出来怪）。缺省 = 和工程文件里那份一样。 */
export interface BakeOptions {
    lines?: boolean;
}
/**
 * 把一个 definition 的 B-rep 烘成 glTF mesh（accessor 索引从 accessorBase 起）。软边不进 LINES（圆柱侧面不出竖线）。
 * 贴图纪元（2026-10-21）：按材质拆 primitive（契约「按 (材质, tag) 拆 prim」）——默认材质一份（共享顶点，无 UV）；每种材质一份
 * 自己的 POSITION（逐角，不共享）+ 有贴图时 TEXCOORD_0 = 沿面平面确定性基的平面投影 / 物理尺寸（契约「默认不存 UV」档：三方看到的就是 app 的默认贴法）。
 */
export declare function bakeDefinition(snap: BrepSnapshot, sink: ViewSink, accessorBase: number, mats?: BakeMaterials, opts?: BakeOptions): BakeResult;
/**
 * mesh 身体的 bake（M3，2026-10-27 Claude Fable 5.1；2026-10-28 Claude Opus 5.5 补法向 + 绕向，纪元账本 FM130）：真相在 CATSUP_mesh 载荷（多边形 / 标记 / 默认平滑）里，
 * 这里只出给别的查看器看的派生物。三角形按材质 core 分 primitive，**每组自己的 POSITION + NORMAL**（逐角法向 = scene/fan-normal.ts 扇内法线，平滑判定 = mesh/edge-smooth.ts——
 * 和屏幕上同一个算法；同一组里位置和法向都一样的角合成一个顶点：光滑的地方共用、棱上自然分开）；三角形按面自己的绕向切（triangulateFace）。
 * 以前没写 NORMAL（glTF：查看器自己按三角形算平面法向 = 一律一棱一棱）、且约一半三角形反了（user 10-27「导出的时候面的法向一堆错误」）。
 * LINES = 画线的边（mesh/edge-smooth.ts edgeSoft 判：手标软 / 没手标且默认平滑判成平滑的不出；隐藏的不出）+ 裸线，用全体顶点那份 POSITION（accessorBase）。
 */
export declare function bakeMesh(m: MeshDoc, sink: ViewSink, accessorBase: number, mats?: BakeMaterials, opts?: BakeOptions): BakeResult;
