import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { type PoolRef, Scene } from "../scene/scene.ts";
import { type Xform } from "../scene/xform.ts";
export type Seg = [PtIn, PtIn];
/** 边的寻址 = 两端点坐标。 */
export type EdgeKey = [Pt3, Pt3];
/** 面的寻址 = 外环顶点坐标（顺序无关；集合相等即同一张膜）。 */
export type FaceKey = Pt3[];
export type Op = {
    op: "clear";
} | {
    op: "preset";
    name: string;
} | {
    op: "addEdges";
    at?: PoolRef;
    segs: Seg[];
    curve?: boolean;
} | {
    op: "eraseEdges";
    at?: PoolRef;
    edges: EdgeKey[];
} | {
    op: "eraseFaces";
    at?: PoolRef;
    faces: FaceKey[];
} | {
    op: "eraseSelection";
    at?: PoolRef;
    faces: FaceKey[];
    edges: EdgeKey[];
} | {
    op: "move";
    at?: PoolRef;
    moves: {
        from: Pt3;
        to: Pt3;
    }[];
} | {
    op: "pushpull";
    at?: PoolRef;
    face: FaceKey;
    dist: number;
} | {
    op: "absorb";
    at?: PoolRef;
    faces: Pt3[][][];
    wires: [Pt3, Pt3][];
    soft?: [Pt3, Pt3][];
    curve?: [Pt3, Pt3][];
}
/** 选区 → 新 group（父 = at.group）；几何从池里搬出去，与别的面共享的边留下。 */
 | {
    op: "makeGroup";
    at: PoolRef;
    faces: FaceKey[];
    edges: EdgeKey[];
}
/** 选区 → 新 definition + 一个实例（轴 = 包围盒最小角）。 */
 | {
    op: "makeComponent";
    at: PoolRef;
    faces: FaceKey[];
    edges: EdgeKey[];
    name: string;
}
/** 炸开：group 的几何并回父池；实例的定义几何（经变换）并回父池（group 与实例都递归成子项）。 */
 | {
    op: "explode";
    at: PoolRef;
    group?: number;
    instance?: number;
} | {
    op: "transformPool";
    at: PoolRef;
    xform: Xform;
} | {
    op: "transformInstance";
    def: number;
    instance: number;
    xform: Xform;
} | {
    op: "placeInstance";
    at: PoolRef;
    definition: number;
    xform: Xform;
} | {
    op: "eraseInstance";
    def: number;
    instance: number;
}
/** 复制一个 group（含子 group / 子实例）到同父池，整体经 xform（父空间）。 */
 | {
    op: "copyGroup";
    at: PoolRef;
    group: number;
    xform: Xform;
}
/** 新材质（文档级，只增）：颜色 sRGB 0..1；贴图 = 原图字节（运行时 Uint8Array；线协议要走 base64，未做）+ 物理尺寸 米。返回索引 = 当时的 materials.length。 */
 | {
    op: "addMaterial";
    name: string;
    color: [number, number, number];
    texture?: {
        mimeType: string;
        bytes: Uint8Array;
        sizeM: [number, number];
    };
}
/** 油漆桶：这些面涂文档材质 material（null = 回默认）；槽号在该 definition 里解析 / 新开。 */
 | {
    op: "paintFaces";
    at: PoolRef;
    faces: FaceKey[];
    material: number | null;
} | {
    op: "eraseGroup";
    at: PoolRef;
    group: number;
};
export interface ApplyResult {
    scene: Scene;
    events: FaceEvent[];
}
export declare class OpTargetError extends Error {
    readonly what: string;
    constructor(what: string);
}
export declare function resolveVertex(k: Kernel, p: Pt3): VertexId;
export declare function resolveEdge(k: Kernel, [a, b]: EdgeKey): EdgeId;
export declare function resolveFace(k: Kernel, fk: FaceKey): FaceId;
export declare const edgeKey: (k: Kernel, id: EdgeId) => EdgeKey;
export declare function faceKey(k: Kernel, id: FaceId): FaceKey;
/** 工具算出的 {id, to} 移动集 → 按坐标寻址的 move op。 */
export declare function moveOp(k: Kernel, moves: readonly {
    id: VertexId;
    to: PtIn;
}[], at?: PoolRef): Op;
/** 先解析全部目标再动内核：目标缺席在改动之前就抛，不留半改动（History 仍兜底回滚）。 */
export declare function applyOp(s: Scene, op: Op): ApplyResult;
export declare function describeOp(op: Op): string;
