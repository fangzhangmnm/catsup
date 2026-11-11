import { Kernel, type BrepSnapshot, type EdgeId, type FaceEvent, type FaceId, type Pt3, type Seg3 } from "../kernel/kernel.ts";
import { type Frame, type Xform, WORLD_FRAME, frameAt, transformFrame } from "./xform.ts";
import { type Guides } from "./guides.ts";
import type { BodyKind } from "./body-kind.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import type { MirrorSetting } from "../mesh/mirror.ts";
import type { KernelView } from "./kernel-view.ts";
import { type CarriedJson, type Channels, type ColorMap, type LayerDoc, type ShelfDoc, type TextureDoc } from "../format/document.ts";
import { type Guid } from "../format/guid.ts";
import type { Stamp } from "../format/migrate/index.ts";
export { type BodyKind, BODY_KINDS, isBodyKind } from "./body-kind.ts";
export type DefId = number;
export type GroupId = number;
export type InstId = number;
/** 材质（文档级，= glTF core material）：颜色（sRGB 0..1）+ channels（通道名 → 一摞贴图 GUID；图在贴图表里，2026-11-10 起材质不装图）。面 → 槽号 → 槽表 → 这张表；只有「清理没人用的材质」删（ops.ts purgeMaterials，同一步重排所有槽表）。 */
export interface Material {
    /** 身份（文件 / 跨文件都认它）。下标只是这次会话的句柄。 */
    readonly guid: Guid;
    readonly name: string;
    readonly color: readonly [number, number, number];
    /** 通道名 → 一摞贴图 GUID（这一版只用 color、一摞一张）。问「用哪张图」只经 Scene.colorMapOf。 */
    readonly channels?: Channels;
    /** 文件里材质扩展本版不认识的键（原样带回；format/document.ts MaterialDoc.extra）。 */
    readonly extra?: CarriedJson;
}
export interface Group {
    readonly id: GroupId;
    readonly guid: Guid;
    parent: GroupId | null; /** 进这个组画图用的坐标架（本 definition 坐标）；组没有原点（DT86）。 */
    axes: Frame;
    kernel: Kernel;
    name?: string; /** 参考几何（0.11；本 definition 坐标）。 */
    guides: Guides;
}
export interface Instance {
    readonly id: InstId;
    readonly guid: Guid;
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
    /**
     * 进了这个组件画图用的坐标架（DT86，2026-10-26 Claude Opus 5.5；user「坐标架同意 组件原点同意」）：definition 坐标；缺 = 跟组件原点（= 定义自己的坐标系）。
     * 只管推断 / 网格 / 画的平面，不碰几何、不是组件原点（组件原点 = 定义坐标系，改它挪几何：user「原点挪几何，因为是低频commitment，改画画坐标架不挪」）。
     * 根定义不用它：根的坐标架 = Scene.axes。组的坐标架 = Group.axes（组不配有原点：user「组不是物体只是管理sticky geometry用的。所以有坐标架，但是不配有原点」）。
     */
    drawFrame?: Frame;
}
/** 网格身体（Blender 式三角网最小形，user 2026-10-24 命名 `mesh` / 「网格」；契约 §2）：定义坐标；默认剔背面；材质槽同 brep 语义。 */
/** 2026-10-27：身体 = 可编辑的 mesh 内核（src/mesh/；单池、单面、顶点 id 寻址）；文件里的载荷见 format/scene-doc.ts（M3 前仍是三角汤）。 */
/**
 * 一套贴图坐标（贴图主线 1-3b）：和内核里同一个 GUID、每角两个数的那一列是一对（以这张表为准：内核里每角两个数的列不一定都是贴图坐标）。
 * width / height = 画布的格数（整数）；pxPerM = 铺的时候用的密度（每米几格）。条目不可变（改 = 换一个对象）；表的先后没有意思。
 * 只经 startPaint（加）和 meshLayoutPaint（换高）两条指令改（守卫 test/paint-start-guard.test.ts）。
 */
export interface UvSetRow {
    readonly guid: Guid;
    readonly name: string;
    readonly width: number;
    readonly height: number;
    readonly pxPerM: number;
    /** 按一格多大开的 = "density"（加面放不下时画布长大）；缺 = 按总大小开的（画布不自己变大；施工单十六第四节，文件里 CATSUP_mesh 2.1）。 */
    readonly fit?: "density";
}
export interface MeshBody {
    readonly kind: "mesh";
    kernel: MeshKernel;
    materialSlots: number[]; /** 有哪几套贴图坐标（GUID → 一行；1-3b）。撤销跟着骨架快照走（浅拷）。 */
    uvSets: Map<Guid, UvSetRow>;
}
export type Body = BrepBody | MeshBody;
/** 定义 = 对象层的管理单位（CatsUp 的，不是 SU 内部结构）：名字 + 一个身体 + 子实例。复合（brep + 卡片同住）靠子实例，不靠多身体。 */
export interface Definition {
    readonly id: DefId;
    readonly guid: Guid;
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
    /** 网格体的「对称」属性（镜像编辑 / 强行对称 + 镜像面；UX 心智模型 §2.1 物体窗口的字段；文件 CATSUP_mesh 1.2 `mirror`）：按定义 id 记。编辑方式那一层。
     *  **2026-11-09 起进撤销**（计划书 20261109-audit-fixes-plan §3 第 7 条，user 没回「要不要」、按默认做）：只经 op `setMeshMirror` 写（骨架级），clone / cloneSkeleton 各拷一份——
     *  以前共享（0.15 账本 FM134「不进撤销」），撤销后模型回来了、强行对称还开着，下一步又改。定义转成硬表面体 / 删掉后留下的旧条目无害（读的人按 kindOf 筛）。 */
    readonly meshMirrors: Map<DefId, MirrorSetting>;
    readonly defs: Map<number, Definition>;
    readonly root: DefId;
    /** 文档材质表（下标 = 运行时句柄，别跨撤销 / 清理攥着；要记住一个材质就记 guid 或对象）。 */
    readonly materials: Material[];
    /** 绘图轴（0.11 尺规纪元）：根上下文的轴，世界坐标；轴工具可搬 / 转，默认 = 世界帧。进 CATSUP_document.axes。 */
    axes: Frame;
    /** 层表（0.14 契约 §4）：id 0 永远是默认层；进 CATSUP_document.layers。 */
    layers: LayerDoc[];
    nextLayer: number;
    /** 贴图表（CATSUP_textures；2026-11-10 贴图主线 1-0½）：GUID → 一行。条目不可变（改 = 换一个对象）；撤销的快照浅拷这张表。只经 addTexture 加、只经 op purgeTextures 删。 */
    readonly textures: Map<Guid, TextureDoc>;
    /** 文件里的贴图表是更新版写的（major 比本版新）：本版读不出里面有什么、原字节存盘带回。不是 null = 不许加贴图、不许清理（存盘时新加的会和带回的那张表打架）。 */
    texturesFrozen: Stamp | null;
    /** 素材架（CATSUP_shelf；计划书 §2.8 / §15）。条目只存引用（GUID）；架上的算活着（resources.ts liveDefs）。 */
    shelf: ShelfDoc;
    /** 文件里的素材架是更新版写的（major 比本版新，计划书 §15.1-D）：本版读不出里面有什么（上面的 shelf 是空的）、原字节存盘带回。不是 null = 架子不能改、清理不做（看不见架上收着谁，清理会删到）。 */
    shelfFrozen: Stamp | null;
    private nextDef;
    constructor(rootKernel?: Kernel, rootGuid?: Guid);
    mintDef(name: string, kernel: Kernel, guid?: Guid): Definition;
    mintGroup(defId: DefId, parent: GroupId | null, kernel: Kernel, axes: Frame, guid?: Guid): Group;
    /** 定义里全部顶点（本定义坐标 → 再经 m）：根池 + 各组 + 各实例（递归、经实例变换）。建组件 / 建组时算包围盒和原点用（2026-10-26 嵌套）。 */
    pointsOfDef(defId: DefId, m?: Xform, depth?: number): Pt3[];
    /** 空定义（导入的空节点，T11）：brep、没顶点、没组、没实例——编辑器画小三轴代替几何（看得见、点得中）。 */
    isBare(defId: DefId): boolean;
    mintInstance(defId: DefId, parent: GroupId | null, target: DefId, xform: Xform, guid?: Guid): Instance;
    /** 材质在某 definition 里的槽号（没有就开一个）。 */
    slotFor(defId: DefId, material: number): number;
    /** 槽号 → 材质（无 / 越界 = null）。 */
    materialOfSlot(defId: DefId, slot: number | undefined): Material | null;
    addMaterial(m: Omit<Material, "guid"> & {
        readonly guid?: Guid;
    }): number;
    /** 贴图表加一行（同一个 GUID = 换掉那一行：粘贴「更新」走这里）。 */
    addTexture(t: TextureDoc): void;
    /**
     * 这张面走不走画（贴图主线 1-3b；全仓问这个）：面的材质过 paintIn 不是空、画的 definition 就是这张面所在的定义、这个定义的 uvSets 里有那一套 → 那张画和那一套；
     * 差一样都按普通材质（底色）算 = null。网格体才有画（硬表面 = null）。
     */
    facePaint(defId: DefId, slot: number | undefined): {
        textureDoc: TextureDoc;
        uvSet: UvSetRow;
    } | null;
    /** 「这个材质用哪张图」（那个口；全仓问这个，不读材质里的字段）：颜色那一槽的第一张、而且是带尺寸的原图；不是 = null（按底色画）。查表，每张面都会问。 */
    colorMapOf(m: Material): ColorMap | null;
    def(id: DefId): Definition;
    group(ref: {
        def: DefId;
        group: GroupId;
    }): Group;
    instance(defId: DefId, id: InstId): Instance;
    /** 按身份找定义（线性：定义是几百量级；批量的在调用方建表）。 */
    defByGuid(g: Guid): Definition | undefined;
    /** 按身份找材质的下标（−1 = 没有）。 */
    materialByGuid(g: Guid): number;
    /** definition 身体的种类（门 1：op / 渲染 / 格式按它派发）。 */
    kindOf(def: DefId): BodyKind;
    /** definition 的 brep 身体（不是 brep → 抛：内核 op / 分组 / 参考几何只对 brep 成立）。 */
    brep(id: DefId): BrepBody;
    kernelOf(p: PoolRef): Kernel;
    /** definition 的 mesh 身体（不是 mesh → 抛）。 */
    mesh(id: DefId): MeshBody;
    /** 池的显示视图（渲染 / 拾取 / 吸附读的那份契约 kernel-view.ts）：brep 池 = 内核本身；mesh 池 = 它的派生视图。场景层只经这里认内核。 */
    viewOf(p: PoolRef): KernelView;
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
    /** 池的参考几何（只有 SU 体有；网格体 = 空——合成视图 / 编辑器对任何种类的活动池都能问）。 */
    guidesOf(ref: PoolRef): Guides;
    /**
     * 上下文的坐标架（世界坐标）= 推断引擎的「纸的边」（0.11 尺规纪元 ①；DT86 叫「坐标架」）：根 = 绘图轴；进了 group = 那个 group 的坐标架；
     * 进了组件实例 = 那个 definition 的坐标架（没摆过 = 组件原点）——都乘上链上的实例变换。
     */
    frameOfContext(ctx: EditContext): Frame;
    /** 一串实例链最里面那个组件的原点（世界坐标；= 它的定义坐标系经链上变换）。根 = 世界帧。 */
    originOfChain(chain: readonly InstId[]): Frame;
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
    /** 骨架拷贝（撤销的 skeleton 记录；history.ts）：定义 / 组的元数据 / 实例 / 材质 / 层 / 轴 / 参考几何都拷，**内核共享**（不拷几何）。O(定义 + 实例 + 组)。 */
    cloneSkeleton(): Scene;
    /** 预演的影子场景（计划书 §12 C1）：骨架拷贝 + 这个池的内核换成给的影子。槽表是拷的（预演开槽不碰真身），别的池和真身共享（op 改不到外面 = op-locks.ts previewableIn 守）。 */
    shadowOf(ref: PoolRef, shadow: Kernel | MeshKernel): Scene;
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
export declare function poolBounds(k: KernelView, m?: Xform): {
    min: Pt3;
    max: Pt3;
} | null;
export { WORLD_FRAME, frameAt, transformFrame };
