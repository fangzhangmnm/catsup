import type { EdgeId, Pt3 } from "../kernel/kernel.ts";
import type { WorldView } from "../scene/world-view.ts";
export interface MarkEnv {
    /** 工作台 id（自由建模 = freeform、硬表面 = geometry）。 */
    readonly workbench: string;
    /** 在编辑（没在镜像会话的预演里、没上演示锁）：演示锁 = 不编辑 = 不画结构线（场景表 6）。 */
    readonly editing: boolean;
    /** 缓存键 = 合成视图的身份（几何 / 预演一变它就是新的）。 */
    readonly key: string;
}
/** 自由建模：能改的那一层的平滑边（世界坐标；棱照常画，平滑边淡淡地画出来、也点得中——纪元账本 FM138）。 */
export declare function softEdgesOf(view: WorldView, g: (id: number) => number, env: MarkEnv): {
    key: string;
    segs: {
        id: EdgeId;
        a: Pt3;
        b: Pt3;
    }[];
} | null;
/** 顶点小圆点 = 表的 editDots 行：正在编辑的这一层（self 那一档：根上 = 根自己的几何，进了组 = 那个组的池）任何画风都画，硬表面和自由建模同一条（user 11-13：「默认物体有线，在编辑的物体有额外的点」
 *  「root也有root的geometry的，我说的没在编辑就是所有不在当前你的层级的物体」）。上了修改锁 / 在预演里 = 不在编辑 = 不画。别的工作台不画（工作台自己报「改不改几何」= 第 1 版第五节第 1 条一起收）。 */
export declare function vertDotsOf(view: WorldView, g: (id: number) => number, env: MarkEnv): {
    key: string;
    pts: Pt3[];
} | null;
