import type { Pt3 } from "../kernel/geom.ts";
import { type BrepSnapshot } from "../kernel/kernel.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { type Guides } from "../scene/guides.ts";
import { type DefId, type EditContext, type GroupId, type InstId, type Scene } from "../scene/scene.ts";
import { type Frame, type Xform } from "../scene/xform.ts";
export interface TransferGroup {
    readonly parent: number | null;
    readonly snap: BrepSnapshot;
    readonly axes: Frame;
    readonly name?: string;
    readonly guides: Guides;
}
export interface TransferInstance {
    readonly parent: number | null;
    readonly def: DefId;
    readonly xform: Xform;
    readonly name?: string;
    readonly locked?: boolean;
    readonly layer?: number;
    readonly hidden?: boolean;
}
/** 网格体散几何：faces.mat / 边 flags 原样；mat = 文档材质 id（−1 = 无）。 */
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
