import type { Op } from "../ops.ts";
import type { PoolRef, Scene } from "../../scene/scene.ts";
import type { Xform } from "../../scene/xform.ts";
import type { Selection } from "../tools.ts";
import type { ParamField, ParamValue } from "../param-panel.ts";
/** 编辑器给修复模块的窄接口（模块不碰 Editor 本体）。 */
export interface RepairCtx {
    readonly scene: Scene;
    /** 画图吸附用的格子边长（格距 ÷ 细分）。 */
    gridFineStep(): number;
    /** 「吸到格点」格子边长的选项（第一项 = 画图的格子，id = "grid"；其余 id = 米数）。 */
    snapStepChoices(): {
        id: string;
        label: string;
        hint?: string;
    }[];
    /** 池本地坐标 → 格子坐标（own = 这个池自己的坐标架；world = 根上的绘图轴经上下文换过来）。 */
    snapLattice(at: PoolRef, xf: Xform, frame: "own" | "world"): Xform;
    /** 油漆桶的锐角阈值（拍平的默认角度，同一个量）。 */
    sharpDeg(): number;
    /** 画圆工具当前的段数（改段数的默认）。 */
    circleSegments(): number;
}
/** 修复作用的一个池：有选区 = 只看选区（sel），没选 = 整个池；xf = 这个池到当前上下文的变换（世界格点用）。 */
export interface RepairPool {
    readonly at: PoolRef;
    readonly sel: Selection | null;
    readonly xf: Xform;
}
export interface RepairPlanOut {
    /** 要提交的指令（空 = 这个池没事做）。 */
    ops: Op[];
    /** 会碰几处（菜单 / 面板说明行 / 提示里的数）。 */
    count: number;
    /** 第二个数（拍平：擦几条内线；吸格点：几条圆整条平移；恢复层级：合成几个组件）。 */
    extra?: number;
    /** 没碰的（拍平：曲面片；吸格点：只选了一部分的圆上的点）。 */
    skipped?: number;
    /** 提示里补的话（每个池一句以内；框架去重后接在后面）。 */
    notes?: string[];
}
export type RepairValues = Readonly<Record<string, ParamValue>>;
export interface RepairModule {
    /** 清单里的身份（菜单 / 面板勾选 / 会话记忆的键）。 */
    readonly id: string;
    readonly title: string;
    /** 修复面板里的那一步：标签 + 默认勾不勾。 */
    readonly panel: {
        readonly on: boolean;
        label(ctx: RepairCtx): string;
    };
    defaults(ctx: RepairCtx): Record<string, ParamValue>;
    /** 马后炮里能改的参数（「含子物体」由框架加）。 */
    fields(ctx: RepairCtx): ParamField[];
    /** 纯规划：一个池里要做什么（不提交）。 */
    plan(ctx: RepairCtx, pool: RepairPool, v: RepairValues): RepairPlanOut;
    done(n: number, extra: number, v: RepairValues): string;
    readonly none: string;
    /** skipped > 0 时提示里补的那半句。 */
    skippedText?(n: number, v: RepairValues): string;
    /** 编辑条上的入口（缺 = 只在修复面板里）。 */
    readonly menu?: {
        readonly icon: string;
        label(n: number): string;
    };
    /** 菜单 / 「修复…」露不露用的便宜数法（缺 = 用 plan 的 count；完整规划太贵的模块给它）。 */
    quickCount?(ctx: RepairCtx, pool: RepairPool): number;
    /** 深的池先跑（恢复层级：父层会把素组合进组件，先合父层、轮到那个组时它已经不在了）。 */
    readonly deepFirst?: boolean;
    /** 提示里披露「合并了 N 个点 / 面多了 M 张」（会挪点的修复）。 */
    readonly tally?: boolean;
    /** 没事可做也打开右下角参数（改段数：都已经是默认段数时，还得能挑别的段数）。 */
    readonly offerAlways?: boolean;
}
