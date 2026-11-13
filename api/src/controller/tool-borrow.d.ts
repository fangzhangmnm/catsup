import type { Tool } from "../editor/tool-ids.ts";
/** 底 = 一直拿着的那把（左柱实心高亮）；借 = 快捷键临时拿起的那把（蓝色空心框；null = 没借）。现在手上的 = 借 ?? 底。 */
export interface Hold {
    readonly base: Tool;
    readonly temp: Tool | null;
}
export type HoldEvent = {
    readonly e: "take";
    readonly tool: Tool;
} | {
    readonly e: "borrow";
    readonly tool: Tool;
} | {
    readonly e: "back";
};
export declare const held: (h: Hold) => Tool;
export declare function nextHold(h: Hold, ev: HoldEvent): Hold;
/** 这一下快捷键拿起的工具算不算借：自由建模里除了回「选」的键都算；别的工作台都不算。 */
export declare const keyBorrows: (mode: string, tool: Tool) => boolean;
/**
 * 借来的那把这一下做完了吗（只在没有手势在进行时问）：
 * modal = 这次是键盘起手（G / R / S / E / I…）进去的——手势一收（落定、取消、原地留下，提交被拒也算）就算完；
 * cancelled = 有手势时被收了（Esc / 右键取消，或者收刀 / 收笔：切好的那几刀早就提交了，收的那一下本身不提交）；atStart ∧ hadOp = 这一步开始时手势在进行、这一步提交了改动（拖完落定、点落定、收刀、环切切完）。
 * 点一下选东西、框选、手势外按 Delete / 右键菜单里的指令都不算（借着移动先点一个点再拖，是常用的）。
 */
export declare function runEnded(r: {
    readonly busy: boolean;
    readonly modal: boolean;
    readonly cancelled: boolean;
    readonly atStart: boolean;
    readonly hadOp: boolean;
}): boolean;
/** 编辑器里那一个字段：状态 + 这一次借用的记号。只记账、不换工具（换工具由编辑器照平常那条路做）。 */
export declare class ToolHold {
    private h;
    private modal;
    private cancelled;
    private atStart;
    constructor(tool: Tool);
    get state(): Hold;
    /** 借的那把换了（借上 / 换成借另一把 / 回去 / 真的换）= 这一次借用的记号清掉：G 途中按 R 借旋转，G 的「键盘起手」记号不能带给 R。 */
    apply(ev: HoldEvent): Hold;
    /** 一步开始：手势在不在进行。 */
    begin(busy: boolean): void;
    /** 键盘起手成功了（这一次借用到手势收了就算完）。 */
    noteModal(): void;
    /** 这一次被收了：取消（Esc / 右键）、收刀 / 收笔（编辑器 endChain：「收」钮、同一处再点、Esc、抬笔）——有手势在进行才算「做完」。 */
    noteEnd(busy: boolean): void;
    /** 一步收尾 / 步外的取消之后问：借来的做完了 → 返回要回去的那把（底），不然 null。没借的时候只清记号。 */
    settle(busy: boolean, hadOp: boolean): Tool | null;
}
