// repairs/repair.ts —— 修复指令的模块接口（纪元账本 DT6 / DT85 / DT99–DT104）。created 2026-10-26 by Claude Opus 5.5
// user 10-26：「以及这些修复的东西即使可能代码量不大，但是也做成可以扔的模块化的，最好是各种命令都这样」。
// 一个修复 = 一个模块（这个文件夹里一个文件 / 一个子文件夹）：自己的规划、参数、提示文案、菜单项、自己那条插件指令怎么执行，全在里面。
// 清单 = index.ts 一个数组；编辑器 / 修复面板 / 菜单只照清单遍历，不认识任何具体修复。扔掉一个 = 删它的文件 + 清单里一行，tsc 照过。
// 这是「指令注册表」（家族周账 F-98，留给 Fable 攒例子）的第一批例子：形状先在修复这一族上跑通，以后别的命令照抄或者被注册表吸收。
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
  snapStepChoices(): { id: string; label: string; hint?: string }[];
  /** 池本地坐标 → 格子坐标（own = 这个池自己的坐标架；world = 根上的绘图轴经上下文换过来）。 */
  snapLattice(at: PoolRef, xf: Xform, frame: "own" | "world"): Xform;
  /** 油漆桶的锐角阈值（拍平的默认角度，同一个量）。 */
  sharpDeg(): number;
}

/** 修复作用的一个池：有选区 = 只看选区（sel），没选 = 整个池；xf = 这个池到当前上下文的变换（世界格点用）。 */
export interface RepairPool { readonly at: PoolRef; readonly sel: Selection | null; readonly xf: Xform; }

export interface RepairPlanOut {
  /** 要提交的指令（空 = 这个池没事做）。 */
  ops: Op[];
  /** 会碰几处（菜单 / 面板说明行 / 提示里的数）。 */
  count: number;
  /** 第二个数（拍平：擦几条内线；吸格点：几条圆整条平移；恢复层级：合成几个组件）。 */
  extra?: number;
  /** 没碰的（拍平：曲面片；吸格点：只选了一部分的圆上的点）。 */
  skipped?: number;
}

export type RepairValues = Readonly<Record<string, ParamValue>>;

export interface RepairModule {
  /** 清单里的身份（菜单 / 面板勾选 / 会话记忆的键）。 */
  readonly id: string;
  readonly title: string;
  /** 修复面板里的那一步：标签 + 默认勾不勾。 */
  readonly panel: { readonly on: boolean; label(ctx: RepairCtx): string };
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
  readonly menu?: { readonly icon: string; label(n: number): string };
  /** 菜单 / 「修复…」露不露用的便宜数法（缺 = 用 plan 的 count；完整规划太贵的模块给它）。 */
  quickCount?(ctx: RepairCtx, pool: RepairPool): number;
  /** 深的池先跑（恢复层级：父层会把素组合进组件，先合父层、轮到那个组时它已经不在了）。 */
  readonly deepFirst?: boolean;
  /** 提示里披露「合并了 N 个点 / 面多了 M 张」（会挪点的修复）。 */
  readonly tally?: boolean;
}
