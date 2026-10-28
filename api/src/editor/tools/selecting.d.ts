import type { ToolPointer } from "../editor.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { SelMode } from "../tools.ts";
/**
 * 没选区时按下抓什么（每个工具一个词；user 10-28「关键是不同的子工具的选择逻辑是不是都不一样。能不能把这些逻辑整理出来做一个深模块窄接口」）：
 * "element" = 点 > 边 > 面（常量半径，纪元账本 FM165；移动 / 旋转 / 缩放 / 沿法线）；"face" = 只认面（点和边不挡路、小面也按得到；挤出、插入 / 倒角）。
 */
export type Grab = "element" | "face";
export interface Target {
    readonly verts: number[];
    readonly edges: number[];
    readonly faces: number[]; /** 来自选区（不是按下处抓的）。 */
    readonly fromSelection: boolean;
}
/** 按下这一下作用在什么上：有选区 = 选区；没选区 = 按下处按 grab 抓的那一个；空处 = "box"（拖 = 框选，BoxDrag）。只管网格体（自由建模）。 */
export declare function pressTarget(ctx: ToolCtx, at: {
    x: number;
    y: number;
}, grab: Grab): Target | "box";
/** 右下角「选区」两档：多选（= 一直按着 Shift）？ */
export declare const multiSelect: (ctx: ToolCtx) => boolean;
/**
 * 这一下怎么合进选区：Ctrl（⌘）= 减选；Shift 或「多选」档 = 拖 = 加选、点 = 切换；别的 = 替换（FM158）。
 * Alt 不算减选（它留给「点边选环」；移动复制照旧认 Alt，那是 copy 的事）。
 */
export declare function selModeOf(ctx: ToolCtx, ev: ToolPointer, box: boolean): SelMode;
/** 点一下（第 n 下）：和选择工具同一套（见文件头）。 */
export declare function clickSelect(ctx: ToolCtx, ev: ToolPointer, n: number): void;
export interface ScreenBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
/** 框选：框里的点（自由建模，FM139）/ 边 / 面 / 子物体 / 空组件 / 参考点（参考线无限长、框选会全中，不收）。 */
export declare function boxSelect(ctx: ToolCtx, box: ScreenBox, mode: SelMode): void;
/** 拖框：按下记起点；拖过点按容差才出框；松手 = 框选（没拖出框 = 什么都不做，那是「点」，归 clickSelect）。 */
export declare class BoxDrag {
    private start;
    private cur;
    active(): boolean;
    begin(ev: {
        x: number;
        y: number;
    }): void;
    /** 跟手（在拖框 = true）。 */
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): boolean;
    /** 松手：框选（按这一下的修饰键 / 两档定怎么合）。 */
    finish(ctx: ToolCtx, ev: ToolPointer): void;
    cancel(ctx?: ToolCtx): void;
    private box;
}
