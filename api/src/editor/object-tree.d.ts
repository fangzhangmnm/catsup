import type { DefId, EditContext, GroupId, InstId, Scene } from "../scene/scene.ts";
import type { Op } from "./ops.ts";
export type HierPick = {
    kind: "group";
    group: GroupId;
} | {
    kind: "instance";
    instance: InstId;
};
export interface HierNode {
    /** 键 = 一路的物件编号（「i3/i7」；最外层 = ""；组不进键，挪进挪出组展开状态不丢）。 */
    readonly key: string;
    readonly kind: "root" | "instance";
    readonly label: string;
    /** 名字是四位十六进制码（没起名）→ 淡色等宽。 */
    readonly unnamed: boolean;
    readonly path: readonly HierPick[];
    /** 这一行住在哪个组件定义里（藏 / 显的指令打在这里）。 */
    readonly def: DefId;
    readonly hidden: boolean;
    readonly locked: boolean;
    readonly children: readonly HierNode[];
}
/** 家族约定的四位码（WeebPaint / MoonSinger / CatsUp 默认名 `yyyymmdd-hex4` 里那四位）：名字正好是它 = 没起名。 */
export declare const isHex4: (s: string) => boolean;
export declare const pickKey: (p: HierPick) => string;
export declare const pathKey: (path: readonly HierPick[]) => string;
/** 程序给根起的占位名（每个老文件都是它）：按没起名显示。 */
export declare const ROOT_PLACEHOLDER = "model";
/** 整棵树（最外层是根那一行）。根 = 普通组件（user 10-30「我们要和godot一样根和其他节点一视同仁」）：显示它的组件名，没起名（四位码 / 程序占位的 model）淡色。 */
export declare function hierarchyTree(scene: Scene): HierNode;
/** 你现在在哪一层 → 路径（实例链上每个实例前面补上它挂的组链，最后补当前组的链）。 */
export declare function contextPath(scene: Scene, ctx: EditContext): HierPick[];
/** 这一行「藏 / 显」（on = 藏）的指令：实例的藏标记（藏这一份连同里面的一切，DT49）。一条指令 = 一步撤销；已经是这样了 = null。 */
export declare function setHiddenOp(scene: Scene, node: HierNode, on: boolean): Op | null;
