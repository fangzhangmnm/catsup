import { type SceneStore } from "../format/scene-store.ts";
import type { CatsupDocument } from "../format/document.ts";
import { type Guid } from "../format/guid.ts";
import { type Bundle, type Decision, type Frontier, type MergePlan } from "../identity/graph.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { type DefId, type EditContext, type GroupId, type InstId, type Material, type PoolRef, type Scene } from "../scene/scene.ts";
import type { Xform } from "../scene/xform.ts";
import type { Op } from "./ops.ts";
import { type TransferInstance, type TransferPayload } from "./transfer.ts";
export { KEEP, type Decision } from "../identity/graph.ts";
/**
 * 载荷在身份层眼里的样子（设计书 §1「包」）：闭包 + 对照表成文件形状，从「要摆的、面上用的」往下走（素材导入没有摆放 = closure.roots）。
 * 老复现包：实例的 def / layer 是数字句柄、没有对照表，不进包（landPayload 原样认）。
 */
export declare function payloadBundle(p: Pick<TransferPayload, "brep" | "groups" | "mesh" | "instances" | "materials" | "closure">): Bundle;
type PastePayload = Parameters<typeof payloadBundle>[0];
/** 这一贴的计划：frontier → plan（applyPlan 在 landPayload）。 */
export interface PastePlan {
    readonly store: SceneStore;
    readonly bundle: Bundle;
    readonly plan: MergePlan;
}
export declare function planPaste(s: Scene, p: PastePayload, d?: Decision, f?: Frontier): PastePlan;
/** 这一贴不能做的话，说为什么（站在要被更新的组件里面 / 会成环）。inside = 编辑上下文这一路上的定义（指令只知道贴进哪个定义，所以传它一个；编辑器传整条链）。 */
export declare function pasteBlocked(s: Scene, pp: PastePlan, into: DefId, inside?: readonly DefId[]): string | null;
/** 落地之后怎么认载荷里的东西（ops.ts 的 paste 用）。 */
export interface LandedPayload {
    defOf(i: TransferInstance): number | undefined;
    layerOf(i: TransferInstance): number | undefined;
    materialOf(code: number): number;
    defGuid(g: Guid): Guid;
}
/** 按计划落地（新建带原 GUID、更新原地换身体、断开铸新）。 */
export declare function landPayload(s: Scene, pp: PastePlan, table: readonly Material[] | undefined): LandedPayload;
/** 进指令之前：闭包只留这个计划要的定义（指令流永不驱逐，同一个文件里贴一百次不许攒一百份闭包；提示行照用没剪的那份载荷）。重放时场景状态相同，结果相同。 */
export declare function trimClosure(s: Scene, p: TransferPayload, d?: Decision, pp?: PastePlan): TransferPayload;
/** 弹窗的一行（事实，不是「谁新」：文件里没有版本号，机器判不了）。 */
export interface ConflictRow {
    readonly kind: string;
    readonly name: string;
    readonly placed: number;
    readonly faces: number;
    readonly locked: number;
    readonly shelved: boolean; /** 组件两边各几张面。 */
    readonly hereFaces?: number;
    readonly incomingFaces?: number; /** 材质两边的颜色（sRGB 0..1）+ 有没有贴图。 */
    readonly hereMaterial?: Material;
    readonly incomingMaterial?: Material;
}
export declare function conflictRows(f: Frontier): ConflictRow[];
/** 三种处理各走不走得通：null = 走得通，字符串 = 为什么走不通（人话）。 */
export type PasteWays = Readonly<Record<Decision["entries"], string | null>>;
/** 跨打开贴之前的预查（内容不一样才有）：弹窗的事实 + 三种处理走不走得通 + 算好的前沿（后面的计划接着用，一贴只比一次内容）。stuck = 三种都走不通时的人话（不弹窗：不问没答案的问题）。 */
export interface PasteConflict {
    readonly rows: readonly ConflictRow[];
    readonly ways: PasteWays;
    readonly frontier: Frontier;
    readonly stuck: string | null;
}
/** 跨打开贴之前：有内容不一样的条目吗（有 = 要问，一行一条）。同一次打开不调（永不问）。ctx = 站在哪（这一路上的定义不能被更新）；into = 贴进哪个定义（查成环）：手动粘贴 = 站的这一层，导入素材 = 根（落在根、不摆放，站在哪都不会贴进站着的这一层）。 */
export declare function pasteConflict(s: Scene, p: TransferPayload, ctx?: EditContext, into?: DefId): PasteConflict | null;
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
/** 导入素材点了之后再查一遍（瑞士奶酪，和 preparePaste 同款）：指令只知道贴进根，站的这一路只有编辑器知道。不能做 = 人话（不带前缀）。 */
export declare const importBlocked: (s: Scene, p: TransferPayload, d: Decision, ctx: EditContext, f?: Frontier) => string | null;
/** 素材导入这一步的指令：纯合并的 paste，带上「还没在架上的」上架（断开之后是新身份，所以上架在 paste 里按落地之后的 GUID 做），一步撤销。already = 已经在架上的几个。 */
export declare function shelfImportOp(s: Scene, doc: CatsupDocument, picks: readonly Guid[], d?: Decision, f?: Frontier): {
    op: Op;
    payload: TransferPayload;
    already: number;
};
/**
 * 编辑器这一贴要的全部（从 editor.ts 搬出来，棘轮是让本体别长）：能不能贴（不能 = 返回人话）、指令、贴完怎么找「新的」、提示行。
 * 站在要被更新的定义里（编辑上下文这一路上任何一层）= 拒，不只是贴进的那一层：换身体会让上下文链断掉（设计书 §6）。
 */
export declare function preparePaste(s: Scene, ctx: EditContext, at: PoolRef, p: TransferPayload, d: Decision, toLocal: Xform, f?: Frontier): string | {
    op: Op;
    fresh(after: Scene): {
        pools: [string, {
            kind: "instance";
            instance: InstId;
        } | {
            kind: "group";
            group: GroupId;
        }][];
        meshFaces: number[];
    };
    say(after: Scene, copies: number, crossOpen: boolean): string;
};
/** 贴进 into 这个定义会不会造环（查的是合并之后的样子：同 GUID 用目标那条，不在的看闭包）。 */
export declare function pasteWouldCycle(s: Scene, p: TransferPayload, into: DefId, d?: Decision): boolean;
/** 贴之前记一下这一贴的计划（pasteReport 用）。 */
export interface PasteBefore {
    readonly defs: ReadonlySet<Guid>;
    readonly plan: MergePlan;
    readonly bundle: Bundle;
}
export declare const pasteBefore: (s: Scene, p: TransferPayload, d?: Decision, f?: Frontier) => PasteBefore;
/** 这一贴用了本文件已有的哪些、新建 / 更新 / 断开了哪些（只数真走到的：被已有定义挡住、没走到的都不算）。 */
export interface PasteReport {
    readonly reusedDefs: readonly string[];
    readonly createdDefs: readonly string[];
    readonly updatedDefs: readonly string[];
    readonly detachedDefs: readonly string[];
    readonly reusedMaterials: readonly string[];
    readonly createdMaterials: readonly string[];
    readonly updatedMaterials: readonly string[];
    readonly createdLayers: readonly string[];
}
export declare function pasteReport(before: PasteBefore, after: Scene): PasteReport;
/**
 * 提示行补的那半句（拷来的可能是同一文件重开之后的，所以不说「别的模型」，设计书 §8）。crossOpen = 这份剪贴板不是这次打开里拷的：留了这里那版必须说（不静默）；
 * 同一次打开里每次贴都「用了已有的」，那是常态，不说。新建 / 更新 / 断开的永远说（同一次打开里新建 = 撤销过了头、按拷贝时的样子建回来）。
 */
export declare function pasteSay(r: PasteReport, crossOpen: boolean): string;
