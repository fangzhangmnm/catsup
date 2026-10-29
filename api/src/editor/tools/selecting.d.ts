import type { ToolPointer } from "../editor.ts";
import type { GestureStart } from "../editor.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { SelMode } from "../tools.ts";
import type { Tool } from "../tool-ids.ts";
import { type ScreenArea } from "../marquee.ts";
/**
 * 没选区时按下抓什么 = 立场表（stance.ts）那把工具在自由建模那一行的「抓什么」（user 10-28「关键是不同的子工具的选择逻辑是不是都不一样。能不能把这些逻辑整理出来做一个深模块窄接口」）：
 * "element" = 点 > 边 > 面（常量半径，纪元账本 FM165；移动 / 旋转 / 缩放 / 沿法线）；"face" = 只认面（点和边不挡路、小面也按得到；挤出、插入 / 倒角）。
 */
export interface Target {
    readonly verts: number[];
    readonly edges: number[];
    readonly faces: number[];
    /** 来自选区（不是按下处抓的）。 */ readonly fromSelection: boolean;
    /** 按在选区外的东西上（立场 press = split3）：真做了（落定那一步）才把选区换成它——按下时还分不清是点还是拖，点一下要照旧走点选（Shift 加选不能被它截胡）。 */
    readonly adopt?: {
        readonly verts: number[];
        readonly edges: number[];
        readonly faces: number[];
    };
}
/** 落定那一步里调（commitOp 之前）：把选区换成按下时抓到的那个（Target.adopt）；没有 = 什么都不做。 */
export declare function adoptPress(ctx: ToolCtx, adopt: Target["adopt"] | null | undefined): void;
/** 按下处抓到的东西（立场表「抓什么」：element = 点 > 边 > 面，face = 只认面）；没东西 = null。只管网格体（自由建模）。 */
/** 拾取范围（工具条三个开关，自由建模）：关掉的那一级不参赛；全关 = 当全开（不让人把自己锁死）。硬表面 = undefined（照旧）。 */
export declare function pickKinds(ctx: ToolCtx): {
    verts: boolean;
    edges: boolean;
    faces: boolean;
} | undefined;
/**
 * 按下这一下作用在什么上（只管网格体 = 自由建模）：
 * 没选区 = 按下处按这把工具的立场抓那一个；空处 = "box"（拖 = 框选，BoxDrag）。
 * 有选区 = 看立场表 press 列（账本 UX30）：split3 = 按在选区上 / 空处 → 选区；按在选区外的可选对象上 → 对它做，落定那一步里选区换成它（Target.adopt → adoptPress）、做完留着；
 *   只是点一下（没拖）= 工具走 clickSelect，选区照点选的规矩变（Shift 加选不被截胡）。
 * 缺 press = 有选区就是选区（不管按在哪）。
 */
export declare function pressTarget(ctx: ToolCtx, at: {
    x: number;
    y: number;
    start?: GestureStart;
}, tool: Tool): Target | "box";
/** 右下角「选区」两档：多选（= 一直按着 Shift）？ */
export declare const multiSelect: (ctx: ToolCtx) => boolean;
/**
 * 这一下怎么合进选区：Ctrl（⌘）= 减选；Shift 或「多选」档 = 笔的默认（拖 = 加选、点 = 切换）；别的 = 鼠标的默认（替换）。默认值表 = stance.ts BOOLEAN_DEFAULT（按设备：鼠标 / 笔 / 手指）；
 * 「多选」档就是「把笔的默认搬到鼠标上」，笔的设备上它默认开着（tool-config.ts）。Alt 不算减选（它留给「点边选环」；移动复制照旧认 Alt，那是 copy 的事）。
 */
export declare function selModeOf(ctx: ToolCtx, ev: ToolPointer, box: boolean | "lasso"): SelMode;
/** 点一下（第 n 下）：和选择工具同一套（见文件头）。 */
export declare function clickSelect(ctx: ToolCtx, ev: ToolPointer, n: number, opts?: {
    growBar?: boolean;
}): void;
export interface ScreenBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
/** 框选 / 套索：区域里的点（自由建模，FM139）/ 边 / 面 / 子物体 / 空组件 / 参考点（参考线无限长、框选会全中，不收）。区域 = 框或套索（marquee.ts ScreenArea），遮挡同一套。 */
export declare function boxSelect(ctx: ToolCtx, box: ScreenArea, mode: SelMode): void;
/** 拖框 / 套索：按下记起点；拖过点按容差才出框（套索 = 开始记轨迹）；松手 = 框选 / 套索选（没拖出去 = 什么都不做，那是「点」，归 clickSelect）。
 *  框还是套索 = 选择工具的选项「空处拖」（tool-config.ts select.drag；账本 UX5「套索要进 0.16」），按下那一刻读定。 */
export declare class BoxDrag {
    private start;
    private cur;
    private lasso;
    active(): boolean;
    begin(ev: {
        x: number;
        y: number;
    }, ctx?: ToolCtx): void;
    /** 跟手（在拖框 = true）。 */
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): boolean;
    /** 松手：框选 / 套索选（按这一下的修饰键 / 两档定怎么合；套索的默认布尔照 stance.ts BOOLEAN_DEFAULT.lasso）。 */
    finish(ctx: ToolCtx, ev: ToolPointer): void;
    cancel(ctx?: ToolCtx): void;
    private box;
}
