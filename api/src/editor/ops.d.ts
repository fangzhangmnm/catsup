import type { CurveSpec } from "../kernel/kernel.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { type PoolRef, Scene } from "../scene/scene.ts";
import { type Frame, type Xform } from "../scene/xform.ts";
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
    curve?: boolean | CurveSpec;
}
/** 炸开曲线（SU Explode Curve）：edges 里每条边所在的曲线散成普通边。 */
 | {
    op: "explodeCurves";
    at: PoolRef;
    edges: EdgeKey[];
}
/** 焊接（B19）：edges = 有序链的各边（坐标寻址）→ 一条曲线。 */
 | {
    op: "weldEdges";
    at: PoolRef;
    edges: EdgeKey[];
}
/** 溶解（焊边橡皮「共轴 → 真合并」；user 2026-10-24）：这些顶点（坐标寻址）各并成一条边——须二度共线、两边面链接相同、两端之间没边，不满足的跳过。 */
 | {
    op: "dissolveVertices";
    at: PoolRef;
    points: Pt3[];
}
/** 批：几个 op 当一步（一次撤销；焊边橡皮一刮 = 溶解 + 焊接、软边橡皮一刮 = 删边 + 软化）。顺序执行；中途抛 = 整批回滚（history 装回快照）。 */
 | {
    op: "batch";
    label: string;
    ops: Op[];
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
    op: "followme";
    at?: PoolRef;
    face: FaceKey;
    path: Pt3[];
    closed: boolean;
    smoothJoints: boolean[];
} | {
    op: "absorb";
    at?: PoolRef;
    faces: Pt3[][][];
    wires: [Pt3, Pt3][];
    edgeSegs?: Record<string, [Pt3, Pt3][]>;
    faceLayers?: (Record<string, number> | undefined)[];
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
/** 边层开关（软化 / 硬化 / 隐藏…）：这些边打上 / 去掉若干层。 */
 | {
    op: "setEdgeLayers";
    at: PoolRef;
    edges: EdgeKey[];
    layers: string[];
    on: boolean;
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
}
/** 锁定 / 解锁一个子实例（A27；at = 它所在的池）。解锁永远允许（Editor 的锁护栏对本 op 豁免）。0.14 起组不是物体、不能锁：带 group 的 setLocked 被拒。 */
 | {
    op: "setLocked";
    at: PoolRef;
    group?: number;
    instance?: number;
    on: boolean;
}
/** 显式换身体种类（定义级：共享定义的全部实例一起变）；只认 kinds.ts 登记表里的方向，失败不改文档。 */
 | {
    op: "castDefinition";
    def: number;
    to: BodyKind;
}
/** 层表（文档级）：加 / 改名 / 可见 / 删（成员回继承；id 0 不可删）。 */
 | {
    op: "addLayer";
    name: string;
    color?: [number, number, number];
} | {
    op: "renameLayer";
    layer: number;
    name: string;
} | {
    op: "setLayerVisible";
    layer: number;
    visible: boolean;
} | {
    op: "removeLayer";
    layer: number;
}
/** 归层：at 定义的子实例归到某层；null = 回到继承。（面不打层——user 2026-10-24「facelayer可能太复杂了……不要」：要藏汤里的一部分 = 做成组件再归层。） */
 | {
    op: "assignLayer";
    at: PoolRef;
    instances: number[];
    layer: number | null;
} | {
    op: "addGuide";
    at: PoolRef;
    line?: {
        p: Pt3;
        dir: Pt3;
    };
    point?: Pt3;
} | {
    op: "eraseGuides";
    at: PoolRef;
    ids: number[];
} | {
    op: "clearGuides";
    at: PoolRef;
}
/** 改轴：group = 换 group 的帧（definition 坐标，几何不动）；根 = 绘图轴（世界坐标）；组件定义暂不支持。 */
 | {
    op: "setAxes";
    at: PoolRef;
    frame: Frame;
}
/** 镜像（DT23）：选中的面 / 线 + 组件实例（池本地坐标的镜像面）；默认删对面、消中缝、融合阈值 0。几何在 mirror.ts。 */
 | {
    op: "mirror";
    at: PoolRef;
    faces: FaceKey[];
    edges: EdgeKey[];
    instances?: number[];
    plane: {
        origin: Pt3;
        normal: Pt3;
    };
    deleteOpposite: boolean;
    mergeSeam: boolean;
    weld: number;
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
