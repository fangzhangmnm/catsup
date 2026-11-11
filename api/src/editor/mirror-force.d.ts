import type { Scene } from "../scene/scene.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { type ForceSide, type MirrorAxis, type MirrorSetting } from "../mesh/mirror.ts";
import { type Op } from "./ops.ts";
export interface ForceEnv {
    readonly scene: Scene;
    readonly mirrors: ReadonlyMap<number, MirrorSetting>;
    /** 每个网格体上一次以哪半为准（选边的第三顺位；补完对称化写回）。 */
    readonly lastSide: Map<number, -1 | 1>;
    /** 正在提交镜像并点（同一步里紧跟的 meshMerge）：这几条不各自触发对称化，等整步最后那一次。 */
    readonly merging: boolean;
}
/** 提交前记下的：开着强行对称的每个网格体的内核版本号；指令冲着的那个另拷一份（判「动了哪边」）。 */
export type ForceSnaps = Map<number, {
    rev: number;
    before: MeshKernel | null;
}>;
/** 强行对称管这个网格体吗（提交 / 预演共用）：开着强行对称、是网格体、这条 op 不是镜像自己的 / 只改看法的（分类表 meta）。 */
export declare function forcesOn(env: ForceEnv, def: number, op: Op): MirrorSetting | null;
/** 这一步以哪半为准（提交 / 预演同一个 = mirror.ts forceSide）。op = null：指令不是冲着它来的（点名的 id 不在它的空间里）。 */
export declare function forceSideFor(env: ForceEnv, def: number, before: MeshKernel, after: MeshKernel, ax: MirrorAxis, op: Op | null): ForceSide;
/**
 * 提交前（第 2 层：看改没改到这个网格体，不看指令名——粘贴 / 合并 / 炸开 / 分离以前不对称化，之后在另一边做一步就被当成「另一半」删掉）：
 * 每个开着强行对称的网格体记下内核版本号；指令冲着的那个（op.def / 落点池 at 的定义 / 合并的目标）另拷一份。
 */
export declare function forceSnapshot(env: ForceEnv, op: Op): ForceSnaps | null;
/**
 * 画的收尾钩子（贴图主线 1-3b，editor/paint-upkeep.ts）：强行对称那一步先选边，再给留着的那半补位置；丢掉的那半还有走画没位置的 = 即使形状已经对称也对称化（镜过去的面照抄位置）。
 * 两个方法都是同一步里提交（commit）。
 */
export interface ForcePaintHook {
    /** 这个网格体这一步有没有走画、还没有位置的面。 */
    pending(def: number): boolean;
    /** 给留着的那半（side）补位置；返回丢掉的那半还有没有走画没位置的面（有 = 要对称化）。side = null：对称化做不成，全部都补。 */
    layout(def: number, side: -1 | 1 | null): boolean;
}
/**
 * 提交后：版本号变了、又不对称了的网格体，选边（第 0 / 5 层）→ 先在拷贝上试对称化 → 成了就交 commit 一条 meshSymmetrize（同一步，撤销一起撤）。
 * 带画（paint 钩子）：形状对称、但这一步有走画没位置的面，也选边、补留着那半的位置；丢掉的那半还有要抄的才对称化。
 * 返回要接在提示行后面的话（看不出哪边 / 那半是空的 / 两半都没有 / 劈不开）；没有 = 空串。
 */
export declare function forceAfter(env: ForceEnv, op: Op, snaps: ForceSnaps, commit: (op: Op) => void, paint?: ForcePaintHook): string;
/**
 * 第 1 层：换原点（setAxes 落在定义根上）/ 应用缩放作用在开着强行对称的网格体上 = 模型可能整个对镜像面挪位。在整份拷贝上先做一遍（不用影子：换原点会连带改别处实例的变换）：
 * 仍对称 = null（照做）；不对称 = 要问的那个网格体（编辑器问「关掉镜像，照做 / 取消」，不硬拦）。镜像编辑不问（那个模式下挪原点正是推荐做法）。
 */
export declare function originNeedsAsk(env: ForceEnv, op: Op): number | null;
