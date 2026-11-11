import type { EditContext, Scene } from "../scene/scene.ts";
/** 上下文人话：「根」/「组件 名 › 组」。 */
export declare function contextLabelOf(scene: Scene, ctx: EditContext): string;
/** 面包屑（#25）：根 › 组件「名」› 组 › …；depth = 点它要退到的层数。 */
export declare function contextCrumbsOf(scene: Scene, ctx: EditContext): {
    label: string;
    depth: number;
}[];
