// minccino/contract/geometry.ts —— 引擎自己的几何同形类型。和仓里的 Pt3（kernel）/ Xform（scene）**结构相同**，所以提供者能直接传、引擎不 import 它们
// （边界标准：引擎只认自己的类型，见 src/minccino/README.md）。created 2026-10-29 by Claude Fable 5.1

/** 一个点 / 向量（米，右手系 +Z 上）。与 `kernel/kernel.ts Pt3` 同形。 */
export interface Vec3 { readonly x: number; readonly y: number; readonly z: number }

/** 3×4 行主序仿射变换（与 `scene/xform.ts Xform` 同形）：[r00 r01 r02 tx, r10 r11 r12 ty, r20 r21 r22 tz]。 */
export type Xform12 = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

/** 4×4 列主序矩阵（WebGL / three 同序），16 个数。相机的 view / projection 用它。 */
export type Mat4 = readonly number[];

export const IDENTITY_XFORM: Xform12 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

/** 坐标架：原点 + 三根单位轴（与 `scene/xform.ts Frame` 同形）。地面网格 / 三色轴跟它走（6c 起由消费方递进来）。 */
export interface Frame3 { readonly origin: Vec3; readonly x: Vec3; readonly y: Vec3; readonly z: Vec3 }
export const WORLD_FRAME3: Frame3 = { origin: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } };
