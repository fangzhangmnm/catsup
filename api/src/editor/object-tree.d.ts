import type { DefId, EditContext, GroupId, InstId, Scene } from "../scene/scene.ts";
import { type Xform } from "../scene/xform.ts";
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
/** 路径的世界变换（沿路把实例变换乘起来；组不带变换）。 */
export declare function worldOfPath(scene: Scene, path: readonly HierPick[]): Xform;
/** 这一行展开后装的是哪个组件定义（根 = 模型根；物件 = 它摆的那个组件）。 */
export declare function contentDef(scene: Scene, n: HierNode): DefId;
export type Reparent = {
    readonly op: Op;
    readonly into: DefId;
    readonly from: DefId;
    readonly name: string;
} | {
    readonly why: string;
};
/**
 * 把 node 这一行挪到 target 底下当孩子（I3）：一条 batch = 删原处（eraseInstance）+ 原位贴进 target 装的那个组件（paste，世界位置不变）——撤销一步。
 * 挂在 target 组件的最外层（不进它里面的组：组不进层级窗，user 10-24）。已经是 target 的孩子 = null（不动）。
 * 拒绝（人话）：根不能挪 / 放进自己或自己里面（组件互相装 = 死循环）/ 自己或路上锁着 / 目标或目标路上锁着 / 会斜切（glTF 不许组件斜切；执行时还有全局护栏兜底）。
 * 原处和目标都可能摆了好几份（同一个组件）：这一份在每一份里都没了 / 都多了——SketchUp 同款，调用方要把份数说出来。
 */
export declare function reparentOp(scene: Scene, node: HierNode, target: HierNode): Reparent | null;
