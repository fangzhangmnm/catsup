import { Kernel, type BrepSnapshot, type EdgeId, type FaceEvent, type FaceId, type Pt3, type Seg3 } from "../kernel/kernel.ts";
import { type Frame, type Xform, WORLD_FRAME, frameAt, transformFrame } from "./xform.ts";
import { type Guides } from "./guides.ts";
import type { BodyKind } from "./body-kind.ts";
import { type LayerDoc } from "../format/document.ts";
export { type BodyKind, BODY_KINDS, isBodyKind } from "./body-kind.ts";
export type DefId = number;
export type GroupId = number;
export type InstId = number;
/** 材质（文档级，= glTF core material）：颜色（sRGB 0..1）+ 可选贴图（原图字节 + 物理尺寸 米）。只增不删（面按索引引用）。 */
export interface Material {
    readonly name: string;
    readonly color: readonly [number, number, number];
    readonly texture?: {
        readonly mimeType: string;
        readonly bytes: Uint8Array;
        readonly sizeM: readonly [number, number];
    };
}
export interface Group {
    readonly id: GroupId;
    parent: GroupId | null;
    axes: Frame;
    kernel: Kernel;
    name?: string; /** 参考几何（0.11；本 definition 坐标）。 */
    guides: Guides;
}
export interface Instance {
    readonly id: InstId;
    def: DefId;
    parent: GroupId | null;
    xform: Xform;
    name?: string; /** 锁定（A27）。 */
    locked?: boolean; /** 层（契约 §4）：缺 = 继承父上下文的有效层。 */
    layer?: number; /** 隐藏（DT49；glTF KHR_node_visibility）：藏这一份连同里面的一切；不画、不吸、点不中。 */
    hidden?: boolean;
}
/** brep 身体 = 肥皂膜内核：根上的散几何汤（kernel）+ group 分区（「组不是物体层级，只是 brep 模式下面方便编辑的分组拆组」，user）+ 参考几何 + 材质槽。 */
export interface BrepBody {
    readonly kind: "brep";
    kernel: Kernel;
    groups: Map<GroupId, Group>;
    nextGroup: number;
    /** 材质槽：槽号 → 文档材质索引（契约 §5.3；面存槽号，实例可重映射——重映射未做）。 */
    materialSlots: number[];
    /** 根池的参考几何（0.11；definition 坐标）。group 的在 Group.guides。 */
    guides: Guides;
}
/** 网格身体（Blender 式三角网最小形，user 2026-10-24 命名 `mesh` / 「网格」；契约 §2）：定义坐标；默认剔背面；材质槽同 brep 语义。 */
export interface MeshBody {
    readonly kind: "mesh";
    positions: Float32Array;
    indices: Uint32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    triMaterial?: Uint16Array;
    materialSlots: number[];
}
export type Body = BrepBody | MeshBody;
/** 定义 = 对象层的管理单位（CatsUp 的，不是 SU 内部结构）：名字 + 一个身体 + 子实例。复合（brep + 卡片同住）靠子实例，不靠多身体。 */
export interface Definition {
    readonly id: DefId;
    name: string;
    body: Body;
    instances: Map<InstId, Instance>;
    nextInst: number;
}
/** 几何池地址 = (definition, group | null)。 */
export interface PoolRef {
    def: DefId;
    group: GroupId | null;
}
export declare const poolKey: (p: PoolRef) => string;
export declare const samePool: (a: PoolRef, b: PoolRef) => boolean;
/** 编辑上下文：从根 definition 进了哪些实例（链）+ 当前在哪个 group 里。运行时态，不落盘、不进 op。 */
export interface EditContext {
    chain: readonly InstId[];
    group: GroupId | null;
}
export declare const ROOT_CONTEXT: EditContext;
export declare class Scene {
    readonly defs: Map<number, Definition>;
    readonly root: DefId;
    /** 文档材质表（只增）。 */
    readonly materials: Material[];
    /** 绘图轴（0.11 尺规纪元）：根上下文的轴，世界坐标；轴工具可搬 / 转，默认 = 世界帧。进 CATSUP_document.axes。 */
    axes: Frame;
    /** 层表（0.14 契约 §4）：id 0 永远是默认层；进 CATSUP_document.layers。 */
    layers: LayerDoc[];
    nextLayer: number;
    private nextDef;
    constructor(rootKernel?: Kernel);
    mintDef(name: string, kernel: Kernel): Definition;
    mintGroup(defId: DefId, parent: GroupId | null, kernel: Kernel, axes: Frame): Group;
    /** 定义里全部顶点（本定义坐标 → 再经 m）：根池 + 各组 + 各实例（递归、经实例变换）。建组件 / 建组时算包围盒和原点用（2026-10-26 嵌套）。 */
    pointsOfDef(defId: DefId, m?: Xform, depth?: number): Pt3[];
    /** 空定义（导入的空节点，T11）：brep、没顶点、没组、没实例——编辑器画小三轴代替几何（看得见、点得中）。 */
    isBare(defId: DefId): boolean;
    mintInstance(defId: DefId, parent: GroupId | null, target: DefId, xform: Xform): Instance;
    /** 材质在某 definition 里的槽号（没有就开一个）。 */
    slotFor(defId: DefId, material: number): number;
    /** 槽号 → 材质（无 / 越界 = null）。 */
    materialOfSlot(defId: DefId, slot: number | undefined): Material | null;
    addMaterial(m: Material): number;
    def(id: DefId): Definition;
    group(ref: {
        def: DefId;
        group: GroupId;
    }): Group;
    instance(defId: DefId, id: InstId): Instance;
    /** definition 身体的种类（门 1：op / 渲染 / 格式按它派发）。 */
    kindOf(def: DefId): BodyKind;
    /** definition 的 brep 身体（不是 brep → 抛：内核 op / 分组 / 参考几何只对 brep 成立）。 */
    brep(id: DefId): BrepBody;
    kernelOf(p: PoolRef): Kernel;
    /** 池锁着吗（A27）：group 自己或任何祖先 group 锁着；根池永不锁（锁的是对象，不是定义）。 */
    poolLocked(p: PoolRef): boolean;
    /** 子项锁着吗（自己或祖先 group）。 */
    pickLocked(def: DefId, pick: {
        kind: "group";
        group: GroupId;
    } | {
        kind: "instance";
        instance: InstId;
    }): boolean;
    hasPool(p: PoolRef): boolean;
    /** 上下文的 definition（链末实例的定义；空链 = 根）。 */
    defOfContext(ctx: EditContext): DefId;
    poolOfContext(ctx: EditContext): PoolRef;
    /** 池的参考几何（可变引用；池本地坐标）。 */
    guidesOf(ref: PoolRef): Guides;
    /**
     * 上下文的帧（世界坐标）= 推断引擎的「纸的边」（0.11 尺规纪元 ①）：根 = 绘图轴；进了 group = 那个 group 的轴；
     * 进了组件实例 = 那个 definition 的轴（= 单位帧，组件的轴工具未做）——都乘上链上的实例变换。
     */
    frameOfContext(ctx: EditContext): Frame;
    /** 上下文的世界变换（链上实例变换的乘积；group 不带变换）。 */
    xformOfContext(ctx: EditContext): Xform;
    /** group 的子 group / 子实例（同一 definition 内，按 parent 链）。 */
    childGroups(defId: DefId, parent: GroupId | null): Group[];
    childInstances(defId: DefId, parent: GroupId | null): Instance[];
    /** definition 是否（直接或间接）引用 target——防循环引用。 */
    references(defId: DefId, target: DefId, seen?: Set<number>): boolean;
    /** 某 definition 的实例总数（跨所有 definition）。 */
    instanceCount(target: DefId): number;
    /** 全场景的「池 + 世界变换」展开（渲染 / 拾取 / 吸附的输入；嵌套实例递归；深度上限防循环）。 */
    pools(ctx?: EditContext, opts?: {
        into?: EditContext;
    }): Generator<{
        pool: PoolRef;
        xform: Xform;
        chain: readonly InstId[];
        depth: number;
    }>;
    clone(): Scene;
}
/** 从池里抠出一份子快照：选中的膜（含其环边）+ 选中的边（含端点）。索引 = 本地顺序。 */
export declare function extractSnapshot(k: Kernel, faces: readonly FaceId[], edges: readonly EdgeId[]): BrepSnapshot;
/**
 * 快照整体变换（坐标 + 平面），输出仍是合法快照（Kernel.fromBrep 能装）：平面重新规范化；规范法向和变换后的法向（逆转置）反了 → 这张平面上的面
 * 两个表面互换（面的「侧」跟着法向走：p 在 n 那侧 ⇔ M p 在 M⁻ᵀn 那侧）；外环按规范法向重新排成逆时针（镜像 / 规范法向翻了都会把绕向弄反）。
 * 2026-10-26 Claude Opus 5.5（DT8 两个表面）：以前只换坐标和平面、环不动——转过的组复制一份就「outer ring is not CCW」装不进去（旋转复制组、转着阵列组都会炸）。
 */
export declare function transformSnapshot(snap: BrepSnapshot, m: Xform): BrepSnapshot;
/** 把一份快照（经变换）并进池：膜当像（OR、新 id）、裸边当线段，走结算机（sticky）。炸开 / 粘贴用。
 *  materialMap：快照的槽号 → 目标池 definition 的槽号（跨 definition 搬家时重映射；缺省恒等）。
 *  有变换时先过 transformSnapshot（环的绕向、两个表面跟着法向走，DT8）——镜像炸开 / 镜像指令的那一份颜色在对的一侧。 */
export declare function absorbSnapshot(k: Kernel, snap0: BrepSnapshot, m?: Xform, materialMap?: (slot: number) => number): FaceEvent[];
/** 快照的属性层 → absorb 载荷（边层按线段、面层按每面值；material 可重映射）。 */
export declare function snapshotLayerPayload(snap: BrepSnapshot, P: readonly Pt3[], materialMap?: (slot: number) => number): {
    edgeSegs: Record<string, Seg3[]>;
    faceLayers: (Record<string, number> | undefined)[];
};
/** 快照里 material 面层按映射改写（跨 definition 搬家）。 */
export declare function remapSnapshotMaterial(snap: BrepSnapshot, remap: (slot: number) => number): BrepSnapshot;
/** 轴框默认：选区包围盒的最小角（SU 把组件轴放在包围盒角）。 */
export declare function bboxMin(pts: readonly Pt3[]): Pt3;
export declare function poolBounds(k: Kernel, m?: Xform): {
    min: Pt3;
    max: Pt3;
} | null;
export { WORLD_FRAME, frameAt, transformFrame };
