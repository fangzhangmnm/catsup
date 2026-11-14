import type { SlotRel } from "../scene/world-view.ts";
export type ReachRow<T> = Readonly<Record<SlotRel, T>> & {
    readonly readBy: string;
};
export declare const REACH: {
    /** 编辑用的线（结构线）：always = 任何画风都画（这一层自己的几何，编辑要看得见自己在改什么）；style = 只在画风自己要线时画（画风表 material.edges = "all"：线稿 / 像素描边 / 1-bit / Tron），
     *  那是画风的线（user 11-13 更正：「默认的『线稿』画风 默认物体有线，在编辑的物体有额外的点，不要改变默认的画风」）。能改的那一层靠 editDots 那一行的顶点小圆点区分。 */
    readonly editLines: {
        self: "always";
        child: "style";
        outer: "style";
        twin: "style";
        readBy: string;
    };
    /** 编辑用的点（顶点小圆点）：只画这一层自己的（根上 = 根自己的几何；进了组 = 组那个池），硬表面和自由建模同一条，任何画风（user 11-13：「root也有root的geometry的，我说的没在编辑就是所有不在当前你的层级的物体」+「就用顶点」，不用粗线）。 */
    readonly editDots: {
        self: "edit";
        child: "never";
        outer: "never";
        twin: "never";
        readBy: string;
    };
    /** 淡出：进了物件之后，外面的和分身整块淡（根层没有外面，不淡）。 */
    readonly dim: {
        self: false;
        child: false;
        outer: true;
        twin: true;
        readBy: string;
    };
    /** 共面时谁在前（深度优先级）。照现状登记。 */
    readonly depthFront: {
        self: true;
        child: false;
        outer: false;
        twin: false;
        readBy: string;
    };
    /** 点一下得到什么。照现状登记。 */
    readonly click: {
        self: "element";
        child: "wholeChild";
        outer: "none";
        twin: "none";
        readBy: string;
    };
    /** 框选。照现状登记。 */
    readonly boxSelect: {
        self: "element";
        child: "wholeChild";
        outer: "none";
        twin: "none";
        readBy: string;
    };
    /** 双击。照现状登记。 */
    readonly doubleClick: {
        self: "nothing";
        child: "enter";
        outer: "exitOne";
        twin: "exitOne";
        readBy: string;
    };
    /** 悬停亮不亮：这一层的元素照各工具自己亮（油漆桶 / 橡皮…）；子物体 = 点一下会选到它的工具（立场表 tap = select）悬停时整个亮一下（统筹 11-13 第 1 版施工单：「光标移到子物体上整个亮一下」，和悬停同色）；外面的 / 分身不亮。 */
    readonly hover: {
        self: "element";
        child: "wholeChild";
        outer: "none";
        twin: "none";
        readBy: string;
    };
    /** 吸附：都吸，远近按 tier（自己 0 / 孩子·父母·兄弟 1 / 其他 2）；手势中分身在手里不吸。照现状登记。 */
    readonly snap: {
        self: "near";
        child: "byTier";
        outer: "byTier";
        twin: "byTierNotInGesture";
        readBy: string;
    };
    /** 藏：藏掉的、层关掉的不进世界；「只看这个」= 只留 self / child。照现状登记。 */
    readonly hide: {
        self: "byFlag";
        child: "byFlag";
        outer: "byFlagOrIsolate";
        twin: "byFlagOrIsolate";
        readBy: string;
    };
    /** 工具能不能改它。照现状登记。 */
    readonly edit: {
        self: "all";
        child: "wholeObject";
        outer: "no";
        twin: "sameDefinition";
        readBy: string;
    };
    /** 选中的标记。照现状登记。 */
    readonly selectionMark: {
        self: "element";
        child: "wholeChild";
        outer: "none";
        twin: "none";
        readBy: string;
    };
};
export type ReachRowId = keyof typeof REACH;
export declare const SLOT_RELS: readonly SlotRel[];
