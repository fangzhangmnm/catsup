import { type Pt3 } from "../../kernel/geom.ts";
import { type XformGizmo, type XformHandle } from "../transform-gizmo.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
/** 哪一家：移动 / 旋转 / 缩放 / 挤出（箭头 + 中心）/ 变换（三家一起，一直挂着）。 */
export type HandleFamily = "move" | "rotate" | "scale" | "pull" | "transform";
/**
 * 按下抓到的把手：axis = 只沿 / 绕这根（世界、单位长）；plane = 只在这个面里（它的法向）；两个都没有 = 中心（或变换的等比块）。
 * op = 这一下做哪种（变换工具按把手定：箭头 / 中心 = 挪、环 = 转、方块 / 平面块 / 等比块 = 缩，和硬表面的变换工具同一套意思；别的家 = 自己那种，挤出没有）。say = 提示行里怎么说。
 */
export interface Grip {
    readonly id: XformHandle | "mc";
    readonly axis: Pt3 | null;
    readonly plane: Pt3 | null;
    readonly op?: "move" | "rotate" | "scale";
    readonly say: string;
}
/** 手柄画哪几样（ViewState.xformGizmo.parts）。 */
export type HandlePart = "arrows" | "rings" | "cubes" | "planes" | "center";
export declare class MeshHandles {
    /** 鼠标悬停的把手（高亮；拖着的时候换成正抓着的那个）。 */
    private hot;
    readonly family: HandleFamily;
    constructor(family: HandleFamily);
    /** 这一刻的手柄：开着（变换 = 一直开着）∧ 有选区才有。原点 = 选区的点的平均（世界）；轴 = 朝向（物件 / 世界 / 法向）。 */
    gizmo(ctx: ToolCtx): XformGizmo | null;
    /** 三根轴（世界、单位长、右手系）。物件 = 上下文坐标架（和 X / Y / Z 锁轴同一套）；法向 = 选中的面的法向当 Z（边 / 点 = 连着的面的平均），X 取物件 X 去掉法向那一份。 */
    private axes;
    /** 按下处抓到哪个把手（屏距最近；中心 / 箭头 / 方块 / 平面块先比，都不在圈里才看环——和硬表面的变换工具同一个挑法）；没开 / 没抓到 = null。 */
    grip(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): Grip | null;
    /** 鼠标悬停：记下光标下的把手（高亮）。 */
    hover(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    /** 换下一个朝向（物件 → 世界 → 法向 → 物件）；返回提示行那一句。 */
    cycleOrient(ctx: ToolCtx): string;
    /**
     * 点一下之后（选法已经跑完）：onSelection = 这一下点在已经选着的东西上、不是双击（selecting.ts clickSelect 的返回）。
     * 点第二下 = 出手柄；手柄已经在 = 换朝向；选到别的 / 点空了 = 收起（变换的手柄一直挂着，只换朝向）。返回提示行那一句（null = 不说）。
     */
    afterTap(ctx: ToolCtx, ev: ToolPointer, onSelection: boolean): string | null;
    private say;
    /** 这一帧画什么。drag = 正在拖：原点跟着预演走（被挪的点现在的平均，世界），高亮正抓着的那个；没开 = 什么都不加。 */
    view(ctx: ToolCtx, drag: {
        origin: Pt3 | null;
        id: string | null;
    } | null): Partial<ViewState>;
}
