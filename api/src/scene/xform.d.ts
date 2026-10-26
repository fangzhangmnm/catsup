import { type PlaneParams, type Pt3 } from "../kernel/geom.ts";
export type Xform = readonly [number, number, number, number, number, number, number, number, number, number, number, number];
export declare const IDENTITY: Xform;
export declare const isIdentity: (m: Xform) => boolean;
export declare const applyPt: (m: Xform, p: Pt3) => Pt3;
export declare const applyDir: (m: Xform, d: Pt3) => Pt3;
/** a ∘ b：先 b 后 a。 */
export declare function compose(a: Xform, b: Xform): Xform;
export declare function invert(m: Xform): Xform;
export declare const translation: (t: Pt3) => Xform;
/** 绕过 center、方向 axis（单位化）转 angle 弧度（右手）。 */
export declare function rotationAbout(center: Pt3, axis: Pt3, angle: number): Xform;
/** 以 center 为不动点、按三轴各自系数缩放（世界轴）。 */
export declare function scalingAbout(center: Pt3, s: Pt3): Xform;
/** 平面变换：法向走逆转置，d 由变换后的一个面上点重算；输出 canonical。 */
/** 沿一根方向缩放（绕 center）：线性部分 = I + (f − 1)·a aᵀ（a = 单位方向）；轴不和世界轴对齐时用（变换工具的单轴缩放块，2026-10-26）。 */
export declare function scalingAlong(center: Pt3, axis: Pt3, f: number): Xform;
export declare function applyPlane(m: Xform, pl: PlaneParams): PlaneParams;
/** 行列式（镜像 < 0；均匀缩放 = cbrt(|det|)）。 */
export declare const det3: (m: Xform) => number;
/** 是否刚体（正交 + 行列式 +1，容差 1e-9）。 */
export declare function isRigid(m: Xform): boolean;
/** glTF 4×4 列主序（Y-up 换轴由调用方做）。 */
export declare const toMatrix16: (m: Xform) => number[];
export declare function fromMatrix16(a: readonly number[]): Xform;
/** 轴框（group 的编辑轴 / definition 的轴）：原点 + 三正交单位向量。 */
export interface Frame {
    origin: Pt3;
    x: Pt3;
    y: Pt3;
    z: Pt3;
}
export declare const WORLD_FRAME: Frame;
export declare const frameAt: (origin: Pt3) => Frame;
export declare function transformFrame(m: Xform, f: Frame): Frame;
export declare const frameToXform: (f: Frame) => Xform;
