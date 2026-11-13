import type { MeshKernel } from "./mesh-kernel.ts";
export interface HidePick {
    readonly faces: ReadonlySet<number>;
    readonly edges: ReadonlySet<number>;
}
/** 这一下要藏的面和边（都是现在还露着的；已经藏着的不再列）。others = 藏没选中的。 */
export declare function planHide(m: MeshKernel, sel: HidePick, others: boolean): {
    faces: number[];
    edges: number[];
};
/** 这个点藏没藏（= 它有边、边全藏着；world-view.ts 的 hiddenVerts 同一条规矩）：藏完从选区里拿掉藏起来的点。 */
export declare function vertHidden(m: MeshKernel, v: number): boolean;
