import type { CurveSpec } from "../kernel/kernel.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { type PlanarTarget } from "./planar.ts";
import { type PoolRef, Scene } from "../scene/scene.ts";
import { type Frame, type Xform } from "../scene/xform.ts";
import { type ImportedScene } from "../scene/import-build.ts";
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
}
/** harden（2026-10-26，user「画线描过一条软边，就把它变硬……这个确实是应该有的行为」）：落在这些线段上的边去掉软 + 平滑（画线 / 矩形描过看不见的软边 = 想要一条看得见的边）。 */
 | {
    op: "addEdges";
    at?: PoolRef;
    segs: Seg[];
    curve?: boolean | CurveSpec;
    harden?: boolean;
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
}
/** mirror（DT8，2026-10-26）：这次挪点是镜像（变换的行列式 < 0）——整张面都在挪的点里的面先两侧互换（结算机按绕向再判一次 = 侧跟着法向走）。 */
 | {
    op: "move";
    at?: PoolRef;
    moves: {
        from: Pt3;
        to: Pt3;
    }[];
    mirror?: boolean; /** 自动折面的折缝带哪些边层（DT87 工作流亚种；缺 = 硬线）。 */
    creaseLayers?: string[];
} | {
    op: "pushpull";
    at?: PoolRef;
    face: FaceKey;
    dist: number; /** 加边（不自愈：原帽环留着、侧面新起一段；SketchUp 按 Ctrl）。缺 = 接着长。 */
    keepRing?: boolean;
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
/** groups / instances = 一起装进去的、这一层的子组 / 组件（2026-10-26，SketchUp 同款嵌套；user「当然要」）。 */
 | {
    op: "makeGroup";
    at: PoolRef;
    faces: FaceKey[];
    edges: EdgeKey[];
    groups?: number[];
    instances?: number[];
}
/** 选区 → 新 definition + 一个实例（轴 = 包围盒最小角）。 */
 | {
    op: "makeComponent";
    at: PoolRef;
    faces: FaceKey[];
    edges: EdgeKey[];
    name: string;
    groups?: number[];
    instances?: number[];
}
/** 拍平（纪元排期 T9 / DT7）：faces = 作用域（空 = 池里全部）；规划在 planar.ts（纯函数，预演同一份）；执行时结算出 BURST = 整步拒绝（零破面不变量）。 */
 | {
    op: "makePlanar";
    at: PoolRef;
    faces: FaceKey[];
    deg: number;
    target: PlanarTarget;
    eraseInner: boolean;
}
/** 应用缩放（2026-10-26，user「这样的话我们需要一个apply scale」）：def 里的实例 instance 的缩放烘进它的定义；这一份只剩旋转 + 平移，同一定义的别的份乘反比补偿（外观不变）。 */
 | {
    op: "applyScale";
    def: number;
    instance: number;
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
}
/** 导入外来 glb（T11 / DT2，2026-10-26）：节点树原样变成组件挂在 at 下面；scene 里的网格是提交前装好的膜（scene/import-build.ts castImport）。place = 文件坐标 → at 的定义坐标。 */
 | {
    op: "importScene";
    at: PoolRef;
    scene: ImportedScene;
    place: Xform;
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
/** sides（DT8，2026-10-26）：每张面涂哪一侧，与 faces 对齐（0 = 平面法向 +n 那侧、1 = −n 那侧）；缺 = 两侧都涂（老复现包 / 老行为）。 */
 | {
    op: "paintFaces";
    at: PoolRef;
    faces: FaceKey[];
    material: number | null;
    sides?: (0 | 1)[];
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
/** 隐藏 / 显示（DT49；at = 所在的池）：一个子实例（藏父连子）和 / 或这个池里的一批面 / 边（面层 / 边层 hidden；「挖洞看里面」）。只藏不删：不画、不吸、点不中。 */
 | {
    op: "setHidden";
    at: PoolRef;
    instance?: number;
    faces?: FaceKey[];
    edges?: EdgeKey[];
    on: boolean;
}
/** 全部显示：整个场景里所有被隐藏的实例、面、边都放回来（DT49）。 */
 | {
    op: "unhideAll";
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
/** 画图用的坐标架（DT86）：根 = 绘图轴；组 = 组的坐标架；组件 = definition 的 drawFrame。frame = null = 重置（根 → 世界；组 → 它所在那层的坐标架；组件 → 跟组件原点）。不碰几何。 */
 | {
    op: "setDrawFrame";
    at: PoolRef;
    frame: Frame | null;
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
    weld: number; /** 防碎距离（米）；缺 = 默认 0.1 mm（老复现包照旧）。 */
    guard?: number;
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
/** 护栏拒绝（不是崩溃）：这一步会让组件斜切 → 整步撤回，提示行说原因（不弹错误胶囊、不要复现包）。 */
export declare class ShearRejected extends Error {
}
/** 拍平结算出破面：算法没想到的情况（user「如果有，说明我们算法可能想错了」）→ 整步撤回、弹错误（要复现包）。 */
export declare class PlanarBurst extends Error {
}
/**
 * 执行一条指令。斜切护栏（2026-10-26，user「斜切：和gltf对齐……在发生的时候护栏住，然后提示报错」）：执行后出现了**新的**斜切实例 → 抛 ShearRejected
 * （History 回滚整步）。老文件里本来就斜切的不算（不然那份文件之后什么都改不了）。
 */
export declare function applyOp(s: Scene, op: Op): ApplyResult;
export declare function describeOp(op: Op): string;
