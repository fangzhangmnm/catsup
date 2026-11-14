import type { EditContext, InstId, Scene } from "../../scene/scene.ts";
import type { Op } from "../ops.ts";
/** after = 提交之后人该在哪、选中什么、提示行怎么说（编辑器照着做；找新铸的那一份按 GUID）。 */
export type AddParentPlan = {
    readonly op: Extract<Op, {
        op: "addParent" | "wrapRoot";
    }>;
    after(s: Scene, ctx: EditContext): {
        readonly ctx?: EditContext;
        readonly select?: InstId;
        readonly say: string;
    } | null;
} | {
    readonly why: string;
};
/** picks = 选中的子物体（这一层的直接孩子）；null = 你所在的这一层自己。 */
export declare function planAddParent(s: Scene, ctx: EditContext, picks: readonly InstId[] | null, name: string): AddParentPlan;
