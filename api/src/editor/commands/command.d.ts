import type { Op } from "../ops.ts";
import type { PoolRef, Scene } from "../../scene/scene.ts";
import type { Xform } from "../../scene/xform.ts";
import type { Selection } from "../tools.ts";
import type { ParamField, ParamValue } from "../param-panel.ts";
/** 族 = 指令吃的单位种类。brep / mesh = 两个内核各自的动词；object = 组 / 组件 / 实例这些容器；select = 选区；view = 相机和显示（不记撤销）；doc = 文件和文档设置；paint = 画布像素；sim = 读任何几何、产出一个物体。
 *  不按纪元起名、不按菜单起名、不按工作台起名（user 10-27「赞」）。 */
export type CommandFamily = "brep" | "mesh" | "object" | "select" | "view" | "doc" | "paint" | "sim";
export type CommandId = `${CommandFamily}.${string}`;
export declare function familyOf(id: CommandId): CommandFamily;
/** brep 族的单位：一个池（组件定义里的一个组；今天的池都是 SU 内核）+ 这个池里选中的部分（null = 整个池）+ 池到当前上下文的变换（世界格点用）。 */
export interface PoolUnit {
    readonly at: PoolRef;
    readonly sel: Selection | null;
    readonly xf: Xform;
}
/** 单位的并集：mesh 族 / object 族的单位类型随 M2 / 物体族加进来；到那时 Command 按单位种类泛型化，不重载。 */
export type Unit = PoolUnit;
/** 指令能看到的东西（只读；指令不碰 Editor 本体）。 */
export interface CommandEnv {
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
export type Params = Readonly<Record<string, ParamValue>>;
/** 一个单位上的规划结果。 */
export interface PlanOut {
    /** 要提交的指令（空 = 这个单位没事做）。 */
    ops: Op[];
    /** 会碰几处（菜单 / 面板说明行 / 提示里的数）。 */
    count: number;
    /** 第二个数（拍平：擦几条内线；吸格点：几条圆整条平移；恢复层级：合成几个组件）。 */
    extra?: number;
    /** 没碰的（拍平：曲面片；吸格点：只选了一部分的圆上的点）。 */
    skipped?: number;
    /** 提示里补的话（每个单位一句以内；框架去重后接在后面）。 */
    notes?: string[];
    /** 要擦几条「面和面之间的」线：框架据此估时、先问 user（不静默跳过；user 10-26「宁愿弹警告问 yes no」）。 */
    erases?: number;
}
export interface Command {
    readonly id: CommandId;
    /** 动词的名字（马后炮小窗标题、提示里用）；菜单上的字归动作。 */
    readonly title: string;
    defaults(env: CommandEnv): Record<string, ParamValue>;
    /** 马后炮里能改的参数（「含子物体」由框架加）。 */
    params(env: CommandEnv): ParamField[];
    /** 纯规划：一个单位上要做什么（不提交）。 */
    plan(env: CommandEnv, unit: PoolUnit, v: Params): PlanOut;
    done(n: number, extra: number, v: Params): string;
    readonly none: string;
    /** skipped > 0 时提示里补的那半句。 */
    skippedText?(n: number, v: Params): string;
    /** 露不露用的便宜数法（缺 = 用 plan 的 count；完整规划太贵的指令给它）。 */
    quickCount?(env: CommandEnv, unit: PoolUnit): number;
    /** 深的单位先跑（恢复层级：父层会把素组合进组件，先合父层、轮到那个组时它已经不在了）。 */
    readonly deepFirst?: boolean;
    /** 提示里披露「合并了 N 个点 / 面多了 M 张」（会挪点的指令）。 */
    readonly tally?: boolean;
    /** 没事可做也打开右下角参数（改段数：都已经是默认段数时，还得能挑别的段数）。 */
    readonly offerAlways?: boolean;
}
