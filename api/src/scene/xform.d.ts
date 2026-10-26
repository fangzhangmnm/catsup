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
/**
 * 斜切（剪切）：3×3 部分的三列不两两正交 = 分解不成「平移 · 旋转 · 缩放」。glTF 节点矩阵不许（规范：必须能分解成 TRS）——
 * CatsUp 跟 glTF 对齐（2026-10-26 user「斜切：和gltf对齐。然后如果发生斜切能不能在发生的时候护栏住，然后提示报错？」）。
 * 镜像（负缩放）不算斜切；容差按夹角余弦（数值误差 ~1e−15，远小于它）。
 */
export declare function hasShear(m: Xform, cosTol?: number): boolean;
/** 沿几根互相垂直的方向一起缩放 f（变换工具的平面缩放块 = 两根；单轴块 = 一根）。 */
export declare function scalingAlongAxes(center: Pt3, axes: readonly Pt3[], f: number): Xform;
/**
 * 法向的变换：逆转置作用在法向 n' = (M⁻¹)ᵀ n，**不归一、不规范化**（朝向保留）。长度 = 本地沿法向 1 个单位在世界里是多少分之一：
 * 本地平面沿法向挪 d ⇔ 世界平面沿 normalize(n') 挪 d / |n'|。推拉这类「本地按法向走多远」的动词换到世界一律走它（2026-10-26：
 * 转 180° 的负重轮推拉方向反了——工具拿了 applyPlane 规范化过的世界法向，组件里的 +x 到世界是 −x、被规范化翻回 +x，只换了长度没换正负）。
 */
export declare function applyNormal(m: Xform, n0: Pt3): Pt3;
/** 平面的变换（结果规范化：共面的面共用一个平面记录，朝向丢了——要朝向用 applyNormal）。 */
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
