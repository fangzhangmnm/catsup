// commands/command.ts —— 指令 = 带类型的内核动词：(环境, 一个单位, 参数) → 要提交的 op。created 2026-10-27 by Claude Fable 5.1
// 注册表分两层（ai-docs/20261027-command-registry-proposal-v2.md v2.2；user 10-27 晚「我们UX和command kernel可以分开一下」「具体的动词和ux要分家」）：
//   · 指令（这个文件）：纯函数，不认上下文、不认菜单、不认工具、不重载——一条指令只吃一种单位，族名 = 单位种类（守卫测试钉死）。
//     撤销记录和复现包记的是它；user 的 UX 怎么变它都不动。
//   · 动作（action.ts）：UX 动词——右键菜单项、快捷键、笔刷的一个落点、工具松手那一下。它看选区、看上下文、看点了几下，决定调哪几条指令。
//     「同一个挪动工具，挪物体和挪顶点是同一个指令吗」——不是：挪物体改变换矩阵、挪 SU 点写坐标再过结算机、挪网格点写位置数组，三条带类型的指令；
//     一个挪动工具按手里的东西路由，混选一拖松手 = 一步里三条调用。
// 第一族 = 修复（repairs/，10-26 Opus 做成的可扔模块原样搬进来改名；行为零变化）。
// 2026-10-27 夜 接缝（Fable）：三种单位齐了——PoolUnit（brep 池）/ MeshUnit（网格体）/ ObjectUnit（摆着的一份实例）；第一个路由型动作 = 挪（move/）。
import type { Op } from "../ops.ts";
import type { DefId, InstId, PoolRef, Scene } from "../../scene/scene.ts";
import type { BodyKind } from "../../scene/body-kind.ts";
import type { Xform } from "../../scene/xform.ts";
import type { BrepSelection, MeshSelection } from "../tools.ts";
import type { ParamField, ParamValue } from "../param-panel.ts";

/** 族 = 指令吃的单位种类。brep / mesh = 两个内核各自的动词；object = 组 / 组件 / 实例这些容器；select = 选区；view = 相机和显示（不记撤销）；doc = 文件和文档设置；paint = 画布像素；simulation = 读任何几何、产出一个物体。
 *  不按纪元起名、不按菜单起名、不按工作台起名（user 10-27「赞」）。 */
export type CommandFamily = "brep" | "mesh" | "object" | "select" | "view" | "doc" | "paint" | "simulation";   // simulation 不简写（user 10-27「模拟叫sim，或者长一点的，不简写。magic是ux概念，而且我可能到时候会换别的」）
export type CommandId = `${CommandFamily}.${string}`;
export function familyOf(id: CommandId): CommandFamily { return id.slice(0, id.indexOf(".")) as CommandFamily; }

/** brep 族的单位：一个池（组件定义里的一个组；SU 内核）+ 这个池里选中的部分（null = 整个池）+ 池到当前上下文的变换（世界格点用）。 */
export interface PoolUnit { readonly kind: "brep"; readonly at: PoolRef; readonly sel: BrepSelection | null; readonly xf: Xform; }
/** mesh 族的单位：一个网格体（定义；网格体没有组，池 = 定义）+ 选中的部分（null = 整个网格）+ 到当前上下文的变换。 */
export interface MeshUnit { readonly kind: "mesh"; readonly def: DefId; readonly sel: MeshSelection | null; readonly xf: Xform; }
/**
 * object 族的单位：场景里**摆着的一份**（实例：at 池里的 instance；它的定义 def、身体种类 body、这个定义在场景里有几份 copies、它在 at 里的变换 xf）。
 * 「凡是摆着的都是带变换矩阵的物体」（注册表提案 §7.2）：挪 / 转 / 缩 / 锁 / 藏改的是这一份；改定义的指令（转换身体种类）声明 perDefinition，框架按定义去重、披露「N 份一起变」。
 */
export interface ObjectUnit { readonly kind: "object"; readonly at: PoolRef; readonly instance: InstId; readonly def: DefId; readonly name: string; readonly body: BodyKind; readonly copies: number; readonly xf: Xform; }
/** 单位的并集。指令按单位种类泛型化：一条指令只吃一种，不重载（user 10-27「函数的话是有type的……不需要重载」）。 */
export type Unit = PoolUnit | MeshUnit | ObjectUnit;
export type UnitKind = Unit["kind"];

/** 指令能看到的东西（只读；指令不碰 Editor 本体）。 */
export interface CommandEnv {
  readonly scene: Scene;
  /** 画图吸附用的格子边长（格距 ÷ 细分）。 */
  gridFineStep(): number;
  /** 「吸到格点」格子边长的选项（第一项 = 画图的格子，id = "grid"；其余 id = 米数）。 */
  snapStepChoices(): { id: string; label: string; hint?: string }[];
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
  /** 做完的选区（活动池本地 id；纪元账本 FM14「做完的东西留在选区里」）：规划时在副本上跑一遍算出来（op 确定性 = 提交后同一批 id）。只有一个单位给了才用。 */
  select?: { verts?: number[]; edges?: number[]; faces?: number[] };
}

export interface Command<U extends Unit = Unit> {
  readonly id: CommandId;
  /** 吃哪种单位 = 族名（守卫钉死：familyOf(id) === unit）。 */
  readonly unit: U["kind"];
  /** 动词的名字（马后炮小窗标题、提示里用）；菜单上的字归动作。 */
  readonly title: string;
  defaults(env: CommandEnv): Record<string, ParamValue>;
  /** 马后炮里能改的参数（「含子物体」由框架加）。 */
  params(env: CommandEnv): ParamField[];
  /** 纯规划：一个单位上要做什么（不提交）。 */
  plan(env: CommandEnv, unit: U, v: Params): PlanOut;
  done(n: number, extra: number, v: Params): string;
  readonly none: string;
  /** skipped > 0 时提示里补的那半句。 */
  skippedText?(n: number, v: Params): string;
  /** 露不露用的便宜数法（缺 = 用 plan 的 count；完整规划太贵的指令给它）。 */
  quickCount?(env: CommandEnv, unit: U): number;
  /** 可能要等很久的指令：先估（秒）；框架按家族规矩问「做 / 不做」（user 10-26「不要因为性能静默不做，宁愿弹警告问」）。null = 不用问。 */
  estimate?(env: CommandEnv, units: readonly U[], v: Params): { seconds: number; what: string } | null;
  /** 深的单位先跑（恢复层级：父层会把素组合进组件，先合父层、轮到那个组时它已经不在了）。 */
  readonly deepFirst?: boolean;
  /** 提示里披露「合并了 N 个点 / 面多了 M 张」（会挪点的指令）。 */
  readonly tally?: boolean;
  /** 没事可做也打开右下角参数（改段数：都已经是默认段数时，还得能挑别的段数）。 */
  readonly offerAlways?: boolean;
  /** object 族：改的是定义不是这一份（转换身体种类）——框架按定义去重，同一定义的几份实例只喂一次（copies 披露）。 */
  readonly perDefinition?: boolean;
}

/** 一次指令调用（动作路由出来的；撤销记录 / 复现包以后记它）。 */
export interface CommandCall { readonly command: CommandId; readonly unit: Unit; readonly params: Params; }
