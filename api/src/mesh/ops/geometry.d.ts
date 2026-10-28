import type { Pt3 } from "../../kernel/geom.ts";
import { type Xform } from "../../scene/xform.ts";
import { MeshKernel } from "../mesh-kernel.ts";
/** 选区 → 点集（点 = 自己、边 = 两端、面 = 环上的点；死的跳过、去重）。工具的轴心和「设置原点到选择中心」共用（2026-10-27 Opus 从 tools/mesh-transform.ts 搬下来）。 */
export declare function selectionVerts(m: MeshKernel, sel: {
    verts: Iterable<number>;
    edges: Iterable<number>;
    faces: Iterable<number>;
}): number[];
export declare function moveVerts(k: MeshKernel, moves: readonly {
    v: number;
    to: Pt3;
}[]): void;
export declare function translateVerts(k: MeshKernel, ids: readonly number[], d: Pt3): void;
export declare function transformVerts(k: MeshKernel, ids: readonly number[], X: Xform): void;
export declare function setEdgeFlags(k: MeshKernel, es: readonly number[], mask: number, on: boolean): void;
export declare function setFaceMaterial(k: MeshKernel, fs: readonly number[], slot: number): void;
/** 翻面：环倒过来（单面网格：朝向 = 环的绕向）。 */
export declare function flipFaces(k: MeshKernel, fs: readonly number[]): void;
