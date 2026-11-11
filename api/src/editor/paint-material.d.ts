import type { Op } from "./ops.ts";
import type { PaintPick } from "./editor.ts";
import type { Material, Scene } from "../scene/scene.ts";
/** 蘸的东西 → 文档材质：已经有 = found（下标；内置默认背面 = 它的句柄；null = 默认）；没有 = 按顺序要提交的指令（提交完新材质的下标 = materials.length − 1）。 */
export declare function materialForPick(s: Scene, p: PaintPick): {
    readonly found: number | null;
} | {
    readonly ops: readonly Op[];
};
/** 吸色：这个材质当「蘸的」是什么（默认背面 = 那一格；有原图 = 图；否则 = 颜色）。 */
export declare function pickOfMaterial(s: Scene, m: Material): NonNullable<PaintPick>;
