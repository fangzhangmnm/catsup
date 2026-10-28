import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel } from "../mesh-kernel.ts";
export type PrimitiveKind = "box" | "cylinder" | "cone" | "sphere" | "plane";
export interface PrimitiveFrame {
    o: Pt3;
    x: Pt3;
    y: Pt3;
    z: Pt3;
}
/** size：立方体 = [宽, 深, 高]；圆柱 / 圆锥 = [半径, 半径, 高]；球 = [半径, 半径, 半径]；平面 = [宽, 深, 0]。segments：圆的段数（≥ 3）；球的纬向圈数 = segments / 2。 */
export declare function addPrimitive(k: MeshKernel, kind: PrimitiveKind, f: PrimitiveFrame, size: readonly [number, number, number], segments?: number): {
    faces: number[];
    verts: number[];
};
/** 每种的默认尺寸（米）和人话名字。 */
export declare const PRIMITIVES: Readonly<Record<PrimitiveKind, {
    label: string;
    size: [number, number, number];
    round: boolean;
}>>;
