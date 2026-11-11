export type TangentMode = "clampedAuto" | "auto" | "free" | "flat" | "linear" | "constant";
export type WrapMode = "clamp" | "loop" | "pingPong";
export type TangentSide = "in" | "out" | "both";
export interface Keyframe {
    t: number;
    v: number;
    inTan: number;
    outTan: number;
    inMode: TangentMode;
    outMode: TangentMode;
    broken: boolean;
    inWeight?: number;
    outWeight?: number;
}
export interface AnimCurve {
    keys: Keyframe[];
    preWrap: WrapMode;
    postWrap: WrapMode;
}
export declare const TANGENT_MODES: readonly TangentMode[];
export declare const DEFAULT_TANGENT_MODE: TangentMode;
export declare const DEFAULT_WEIGHT: number;
export declare const MIN_WEIGHT = 0.05;
/** 建曲线：按 t 排序；同 t（|Δt| < 1e-9）后者覆盖前者；缺省切线模式 clampedAuto；建完即 refreshTangents。 */
export declare function makeCurve(pts: Array<{
    t: number;
    v: number;
} & Partial<Keyframe>>, wrap?: WrapMode): AnimCurve;
/** (0,0)–(1,1)：clampedAuto 两端切线都是割线 1 → 逐点恒等（bakeLut8 逐字节 lut[x] == x）。 */
export declare function identityCurve(): AnimCurve;
export declare function cloneCurve(c: AnimCurve): AnimCurve;
/** 结构相等（切线 / 模式 / broken 全比；浮点按 1e-12 容差）。 */
export declare function curveEquals(a: AnimCurve, b: AnimCurve): boolean;
export declare function evaluate(c: AnimCurve, t: number): number;
/** n 个等距采样（含两端）；domain 缺省 [0,1]。 */
export declare function bakeLut(c: AnimCurve, n: number, domain?: [number, number]): Float32Array;
/** 256 项 8-bit LUT：t = x/255 → round(v·255) clamp 0..255。curves-kernel 消费。 */
export declare function bakeLut8(c: AnimCurve): Uint8Array;
/** 每 key 按 in/outMode 重算切线；free 不动。任何改 key 集合 / 位置的操作之后都要调（本模块的 verb 已内建）。 */
export declare function refreshTangents(c: AnimCurve): void;
/** 插入 key。v 缺省 = evaluate(t)（新点落在原曲线上；auto 邻居切线随之重算，形状微变——Unity AddKey 同）。
 *  同 t（|Δt| < 1e-9）→ 覆盖该 key 的 v。返回 key 的 index。 */
export declare function insertKey(c: AnimCurve, t: number, v?: number): number;
/** 删 key。曲线至少留 1 个 key（再删 = no-op 返回 false）。 */
export declare function removeKey(c: AnimCurve, i: number): boolean;
/** 移 key（t 与 v）；lockT = 只动 v。越过邻居自动重排（Unity）；返回新 index。 */
export declare function moveKey(c: AnimCurve, i: number, t: number, v: number, o?: {
    lockT?: boolean;
}): number;
/** 设切线模式。auto / clampedAuto 隐含非 broken 且两侧同设；其余按 side（非 broken 时 side 也镜像成 both）。 */
export declare function setTangentMode(c: AnimCurve, i: number, mode: TangentMode, side?: TangentSide): void;
/** 把手拖动：该侧变 free 并写斜率；非 broken 时镜像另一侧。 */
export declare function setTangent(c: AnimCurve, i: number, side: "in" | "out", slope: number): void;
/** 断开 / 联动。联动回去时若任一侧是 free → 两侧都变 free 取平均斜率（Unity「unify」近似）。 */
export declare function setBroken(c: AnimCurve, i: number, broken: boolean): void;
/** 开/关加权（两侧）：开 = 缺的侧补 DEFAULT_WEIGHT（形状不变）；关 = 删两侧权重键（回 Hermite，形状可能变）。 */
export declare function setWeighted(c: AnimCurve, i: number, on: boolean): void;
export declare function isWeighted(k: Keyframe, side: "in" | "out"): boolean;
/** 写某侧权重（钳 [MIN_WEIGHT, 1]；再钳到与该段另一端权重之和 ≤ 1，防控制点交叉）；该侧若非加权则顺手变加权。 */
export declare function setWeight(c: AnimCurve, i: number, side: "in" | "out", w: number): void;
/** 运行时校验（读持久化 / 笔刷 JSON 用）：形状合法 → 归一化副本；否则 null。 */
export declare function sanitizeCurve(raw: unknown): AnimCurve | null;
