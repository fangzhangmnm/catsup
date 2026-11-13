import type { MeshKernel } from "../mesh-kernel.ts";
import { type MeshSel } from "./duplicate.ts";
import type { Pt3 } from "../../kernel/geom.ts";
export type FacePlan = {
    readonly kind: "fill";
} | {
    readonly kind: "ring";
    readonly ring: readonly number[];
    readonly how: "chain" | "quad" | "points";
} | {
    readonly kind: "edge";
    readonly a: number;
    readonly b: number;
};
/** 选区说的是哪一种面（只读）。eye = 本地坐标的眼睛位置（旁边没有面时朝它）；null = 不管。 */
export declare function planMakeFace(k: MeshKernel, sel: MeshSel, eye: Pt3 | null): FacePlan | string;
