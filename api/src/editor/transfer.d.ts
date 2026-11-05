import type { Pt3 } from "../kernel/geom.ts";
import { type BrepSnapshot } from "../kernel/kernel.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { type Guides } from "../scene/guides.ts";
import { type DefId, type EditContext, type GroupId, type InstId, type Material, type Scene } from "../scene/scene.ts";
import { type Frame, type Xform } from "../scene/xform.ts";
import type { CatsupDocument, DefinitionDoc, LayerDoc } from "../format/document.ts";
import { type Guid } from "../format/guid.ts";
import type { Op } from "./ops.ts";
export interface TransferGroup {
    readonly parent: number | null;
    readonly snap: BrepSnapshot;
    readonly axes: Frame;
    readonly name?: string;
    readonly guides: Guides;
}
export interface TransferInstance {
    readonly parent: number | null;
    readonly def: Guid;
    readonly xform: Xform;
    readonly name?: string;
    readonly locked?: boolean;
    readonly layer?: Guid;
    readonly hidden?: boolean;
}
/** 载荷自带的条目（文件形状）。definitions 里实例上的 layer 是源文件那张层表的代号，经 layers 的 id 对回 GUID；槽表是材质 GUID，在 TransferPayload.materials 里找。 */
export interface TransferClosure {
    readonly definitions: readonly DefinitionDoc[];
    readonly layers: readonly LayerDoc[];
    /** 合并从谁往下走：缺 = 从载荷里摆放的实例走；素材导入没有摆放，= 挑中的那几个。 */
    readonly roots?: readonly Guid[];
}
/** 网格体散几何：faces.mat / 边 flags 原样；mat = 载荷 materials 表的下标（−1 = 无）。 */
export interface MeshFragment {
    readonly verts: Pt3[];
    readonly faces: {
        readonly ring: number[];
        readonly mat: number;
    }[];
    readonly edges: {
        readonly a: number;
        readonly b: number;
        readonly flags: number;
    }[];
}
export interface TransferPayload {
    /** 从哪种身体抠出来的（提示用）。 */
    readonly from: BodyKind;
    readonly brep?: BrepSnapshot;
    readonly groups?: TransferGroup[];
    readonly mesh?: MeshFragment;
    readonly instances?: TransferInstance[];
    /** 面上材质编号的对照表（brep 面层 / groups 面层 / mesh.faces[].mat 都是它的下标）+ 闭包里定义用到的材质（按 GUID 查）。 */
    readonly materials?: readonly Material[];
    /** 实例用到的定义（递归）+ 层。有实例才有。 */
    readonly closure?: TransferClosure;
}
export interface TransferCounts {
    faces: number;
    edges: number;
    groups: number;
    instances: number;
}
export declare const transferCounts: (p: TransferPayload) => TransferCounts;
export declare const transferEmpty: (p: TransferPayload) => boolean;
/** 人话：「3 张面、1 个组、2 个物件」。 */
export declare function transferSay(p: TransferPayload): string;
/** 从活动池抠一份（世界坐标）：选中的面 / 边 + 选中的组（子树）+ 选中的实例。什么都没选中 = null。 */
export declare function extract(s: Scene, ctx: EditContext, sel: {
    faces: Iterable<number>;
    edges: Iterable<number>;
}, pools: readonly ({
    kind: "group";
    group: GroupId;
} | {
    kind: "instance";
    instance: InstId;
})[]): TransferPayload | null;
/** 目标容器接不接：接 = ok；不接 = 要把散几何转成目标的种类（组件实例什么都接）。 */
export declare function accept(p: TransferPayload, target: BodyKind): {
    ok: true;
} | {
    ok: false;
    cast: BodyKind;
    what: string;
};
/** 用户点了「转」：散几何按目标种类转（物体设置窗的 castBody 同一套，确定性）；组转成网格体后不再是组（网格体没有组），里面的实例挂到载荷根上。 */
export declare function castPayload(p: TransferPayload, to: BodyKind): TransferPayload;
/** 世界坐标 → 目标容器本地（Xi = 目标上下文世界变换的逆）。 */
export declare function localize(p: TransferPayload, Xi: Xform): TransferPayload;
/** 进指令之前：闭包只留这一贴真要新建的定义（指令流永不驱逐，同一个文件里贴一百次不许攒一百份闭包；提示行的「用了已有的」照用没剪的那份载荷）。重放时场景状态相同，结果相同。 */
export declare function trimClosure(s: Scene, p: TransferPayload): TransferPayload;
/** 从别的文件抠闭包（素材导入：只读那份文件、挑几个组件）：没有摆放，只有 picks 往下走到底的定义 + 材质 + 层。文档的根不算（它不是素材）。 */
export declare function payloadFromDocument(doc: CatsupDocument, picks: readonly Guid[]): TransferPayload;
/** 那份文件里能上架的组件（素材架上的东西要有名字，user 10-30：没起名的不列、数出来说一声）。摆了几份 = 那份文件里的总数。 */
export declare function importCandidates(doc: CatsupDocument): {
    rows: {
        guid: Guid;
        name: string;
        kind: BodyKind;
        placed: number;
    }[];
    unnamed: number;
};
/** 素材导入这一步的指令：纯合并的 paste + 还没在架上的上架，一步撤销。already = 已经在架上的几个。 */
export declare function shelfImportOp(s: Scene, doc: CatsupDocument, picks: readonly Guid[]): {
    op: Op;
    payload: TransferPayload;
    already: number;
};
/** 贴进 into 这个定义会不会造环（查的是合并之后的样子：同 GUID 用目标那条，不在的看闭包）。 */
export declare function pasteWouldCycle(s: Scene, p: TransferPayload, into: DefId): boolean;
/** 贴之前这个文件里有哪些条目（pasteReport 比对用）。 */
export interface PasteBefore {
    readonly defs: ReadonlySet<Guid>;
    readonly materials: ReadonlySet<Guid>;
    readonly layers: ReadonlySet<Guid>;
}
export declare const pasteBefore: (s: Scene) => PasteBefore;
/** 这一贴用了本文件已有的哪些、新建了哪些（只数载荷里提到的）。闭包里被已有定义挡住、没建出来的两边都不算。 */
export interface PasteReport {
    readonly reusedDefs: readonly string[];
    readonly createdDefs: readonly string[];
    readonly reusedMaterials: readonly string[];
    readonly createdMaterials: readonly string[];
    readonly createdLayers: readonly string[];
}
export declare function pasteReport(before: PasteBefore, after: Scene, p: TransferPayload): PasteReport;
/**
 * 提示行补的那半句。fromOtherModel = 这份剪贴板是在别的模型里拷的：那边改过的同 GUID 组件这里用的是本文件那版（user 11-04「第一次新建，之后再贴只多摆一份」），必须说（不静默）；
 * 同一个模型里每次贴都「用了已有的」，那是常态，不说。新建的永远说（同一个模型里 = 撤销过了头、按拷贝时的样子建回来）。
 */
export declare function pasteSay(r: PasteReport, fromOtherModel: boolean): string;
