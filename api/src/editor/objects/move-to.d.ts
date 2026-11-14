import type { BodyKind } from "../../scene/body-kind.ts";
import type { EditContext, InstId, Scene } from "../../scene/scene.ts";
import type { Op } from "../ops.ts";
export type MoveDest = {
    readonly kind: "into";
    readonly instance: InstId;
} | {
    readonly kind: "up";
};
type Pick = {
    readonly kind: "group";
    readonly group: number;
} | {
    readonly kind: "instance";
    readonly instance: InstId;
};
export interface MovePlan {
    /** 搬到的那一层的身体种类（几何要贴进去：种类对不上编辑器先问）。 */
    readonly kind: BodyKind;
    /** 子物体那几条（几何 / 组走载荷，不在这里）。 */
    readonly ops: readonly Op[];
    /** 选中的组（跟几何一起走载荷）。 */
    readonly groups: readonly Pick[];
    /** 「移出一层」搬上去的子物体的 GUID（编辑器退一层之后按它们选中）。 */
    readonly movedGuids: readonly string[];
    readonly say: string;
}
/** 搬进 / 搬出一个摆了好几份的组件，提示行后面跟的那一句（「移到…」「移出一层」和层级窗口拖动同一句；施工单第九节小调整）。n ≤ 1 = 空串；name = null = 「原来那个组件」。 */
export declare const copiesNote: (name: string | null, n: number, way: "more" | "less") => string;
export declare function planMove(scene: Scene, ctx: EditContext, picks: readonly Pick[], hasGeometry: boolean, dest: MoveDest, locked: (p: Pick) => boolean): MovePlan | {
    readonly why: string;
};
export {};
