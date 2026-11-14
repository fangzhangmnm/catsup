import type { Pt3 } from "../kernel/geom.ts";
import { type BrepSnapshot } from "../kernel/kernel.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { type Guides } from "../scene/guides.ts";
import { type CastLoss } from "../scene/kinds.ts";
import { type EditContext, type GroupId, type InstId, type Material, type Scene } from "../scene/scene.ts";
import { type Frame, type Xform } from "../scene/xform.ts";
import type { DefinitionDoc, LayerDoc, TextureDoc } from "../format/document.ts";
import type { Guid } from "../format/guid.ts";
import { type Bundle } from "../identity/graph.ts";
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
    /** 上面这些材质指着的贴图（文件形状，按 GUID 查；2026-11-10 贴图主线 1-0½：贴图是独立的条目，跟着材质走）。 */
    readonly textures?: readonly TextureDoc[];
    /** 实例用到的定义（递归）+ 层。有实例才有。 */
    readonly closure?: TransferClosure;
    /** 散面里有几张在贴图坐标上有位置：剪贴板不带角上的数（统筹 11-11 定，1-2½），这几张贴过去就没有贴图坐标了——拷贝那一下的提示行说出来（第 1 版第五节 2½ 第三稿第 3 条：带不过去在那一步报）。 */
    readonly uvLeft?: number;
}
export declare const docsOfKind: <T>(b: Bundle, kind: string) => T[];
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
/**
 * 拷贝 / 剪切用的那一口（1-3b 第六节）：选中的网格体面里有走画的 = 拒（{ blocked: 原因 }，判断 = scene/paint.ts paintMoveBlocked）；剪切走拷贝，所以也不会先删掉再贴不上。
 * 整个物件（实例）照拷：同一份文件里贴出来的另一份摆放共用同一张画；跨文件贴的时候粘贴那一步再拦。
 */
export declare function extractForCopy(s: Scene, ctx: EditContext, sel: {
    faces: Iterable<number>;
    edges: Iterable<number>;
}, pools: Parameters<typeof extract>[3]): TransferPayload | {
    readonly blocked: string;
} | null;
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
/** 目标容器接不接：接 = ok；不接 = 要把散几何转成目标的种类（组件实例什么都接）+ 转过去带不过去什么（castLosses，组转成网格体 = 组分区没了）。 */
export declare function accept(p: TransferPayload, target: BodyKind): {
    ok: true;
} | {
    ok: false;
    cast: BodyKind;
    what: string;
    losses: readonly CastLoss[];
};
/** 用户点了「转」：散几何按目标种类转（物体设置窗的 castBody 同一套，确定性）；组转成网格体后不再是组（网格体没有组），里面的实例挂到载荷根上。 */
export declare function castPayload(p: TransferPayload, to: BodyKind): TransferPayload;
/** 世界坐标 → 目标容器本地（Xi = 目标上下文世界变换的逆）。 */
export declare function localize(p: TransferPayload, Xi: Xform): TransferPayload;
