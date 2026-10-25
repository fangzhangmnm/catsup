import type { BrepSnapshot } from "../kernel/kernel.ts";
import { type UintType } from "./binary.ts";
export declare const BREP_VERSION: 4;
/** 写入器要的 bufferView 登记口（write.ts 提供；index = glTF bufferViews 索引）。 */
export interface ViewSink {
    add(bytes: Uint8Array): number;
}
/** 读取器给的 bufferView 取用口。 */
export type ViewSource = (index: number) => Uint8Array;
export interface BrepStream {
    readonly bufferView: number;
    readonly componentType?: UintType;
    readonly indexType?: UintType;
}
export interface CatsupBrepJson {
    version: number;
    minor?: number;
    patch?: number;
    coplanarTol: number;
    unit: number;
    origin: readonly [number, number, number];
    vertexCount: number;
    vertices: BrepStream;
    edgeCount: number;
    edges: BrepStream;
    planeCount: number;
    planes: BrepStream;
    faceCount: number;
    faces: BrepStream;
    facePlane: BrepStream;
    attributes: Record<string, Record<string, unknown>>;
    /** 曲线（v4 起本版读写）：{ edges:[边下标…有序链], kind, closed, params?:{ center:[µm×3], radius:µm, normal:[2^-30×3], xaxis:[2^-30×3], segments } } */
    curves: unknown[];
    extras?: Record<string, unknown>;
    [k: string]: unknown;
}
/** 规范序：顶点按整数 (z,y,x)、边按 (min,max)、环旋到最小顶点起、面按 (平面, 外环)。同一几何 → 同一字节。 */
export declare function canonicalize(snap: BrepSnapshot): BrepSnapshot;
/** 编码（先规范化）。返回的 JSON 里 bufferView 索引由 sink 分配。 */
export declare function encodeBrep(snapIn: BrepSnapshot, sink: ViewSink, keep?: Partial<Pick<CatsupBrepJson, "attributes" | "curves" | "extras">>): CatsupBrepJson;
/** 解码成内核快照（不校验拓扑——那是 Kernel.fromBrep 的活；这里只校验流的形状与范围）。 */
export declare function decodeBrep(json: CatsupBrepJson, view: ViewSource): BrepSnapshot;
