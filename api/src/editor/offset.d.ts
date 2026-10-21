import type { Pt } from "../kernel/geom.ts";
/** 外环（任意绕向）按 d 偏移；退化边合并；退化到 < 3 点 → []。 */
export declare function offsetRing(ring: readonly Pt[], d: number): Pt[];
