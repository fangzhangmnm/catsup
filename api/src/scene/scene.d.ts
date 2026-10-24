import { Kernel, type BrepSnapshot, type EdgeId, type FaceId, type Pt3, type Seg3 } from "../kernel/kernel.ts";
import { type Frame, type Xform, WORLD_FRAME, frameAt, transformFrame } from "./xform.ts";
import { type Guides } from "./guides.ts";
import type { BodyKind } from "./body-kind.ts";
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
    guides: Guides; /** 锁定（A27，SU Lock）：不能改内部、不能整体移 / 删 / 进入；推断照吃。对象层属性，所有 kind 通用。 */
    locked?: boolean;
}
export interface Instance {
    readonly id: InstId;
    def: DefId;
    parent: GroupId | null;
    xform: Xform;
    name?: string; /** 锁定（A27）。 */
    locked?: boolean;
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
/** 卡片身体（A26 参考人卡片）：载荷以后定；现在只是让 kind 联合有第二个真成员。 */
export interface CardBody {
    readonly kind: "card";
}
export type Body = BrepBody | CardBody;
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
    private nextDef;
    constructor(rootKernel?: Kernel);
    mintDef(name: string, kernel: Kernel): Definition;
    mintGroup(defId: DefId, parent: GroupId | null, kernel: Kernel, axes: Frame): Group;
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
/** 快照整体变换（坐标 + 平面）。 */
export declare function transformSnapshot(snap: BrepSnapshot, m: Xform): BrepSnapshot;
/** 把一份快照（经变换）并进池：膜当像（OR、新 id）、裸边当线段，走结算机（sticky）。炸开 / 粘贴用。
 *  materialMap：快照的槽号 → 目标池 definition 的槽号（跨 definition 搬家时重映射；缺省恒等）。 */
export declare function absorbSnapshot(k: Kernel, snap: BrepSnapshot, m?: Xform, materialMap?: (slot: number) => number): void;
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
