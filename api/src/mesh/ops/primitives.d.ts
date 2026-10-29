import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel } from "../mesh-kernel.ts";
export type PrimitiveKind = "circleLoop" | "squareLoop" | "box" | "cylinder" | "cone" | "sphere" | "plane";
export interface PrimitiveFrame {
    o: Pt3;
    x: Pt3;
    y: Pt3;
    z: Pt3;
}
/** size：立方体 = [宽, 深, 高]；圆柱 / 圆锥 = [半径, 半径, 高]；球 = [半径, 半径, 半径]；平面 / 方框 = [宽, 深, 0]；圆圈 = [x 半径, y 半径, 0]（不等 = 椭圆）。segments：圆的段数（≥ 3）；球的纬向圈数 = segments / 2。
 *  返回新长出来的面 / 点 / 裸线（圆圈 / 方框只有点和裸线）。 */
export declare function addPrimitive(k: MeshKernel, kind: PrimitiveKind, f: PrimitiveFrame, size: readonly [number, number, number], segments?: number): {
    faces: number[];
    verts: number[];
    edges: number[];
};
/** 每种的默认尺寸（米）、人话名字、有没有段数、尺寸怎么量（边长 = 方的；直径 = 圆的）。顺序 = 菜单 / 下拉里的顺序（线圈排前面：user「更常用的是2d的edge loop」）。 */
export declare const PRIMITIVES: Readonly<Record<PrimitiveKind, {
    label: string;
    size: [number, number, number];
    round: boolean;
    measure: "边长" | "直径";
}>>;
/** 平的（能拖出长宽比的）几种。 */
export declare const isFlatPrimitive: (kind: PrimitiveKind) => boolean;
/** 一个世界长度（边长 / 直径，按 measure）→ addPrimitive 的三个尺寸；aspect = 深 / 宽（只平的几种认）。 */
export declare function primitiveDims(kind: PrimitiveKind, sz: number, aspect?: number): [number, number, number];
/** 默认的那个世界长度（边长 / 直径）。 */
export declare const primitiveDefaultLen: (kind: PrimitiveKind) => number;
