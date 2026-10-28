import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel } from "../mesh-kernel.ts";
import { type ExtrudeResult } from "./extrude.ts";
/** 一张面（环 P、法向 n）往里收 dist 之后的环（等宽；尖角处限长 4×dist）。 */
export declare function insetRing(P: readonly Pt3[], n: Pt3, dist: number): Pt3[];
/** 这张面最多能收多少（形心到各边所在直线的最短距离 × 0.98；再收环会自交）。 */
export declare function maxInset(P: readonly Pt3[], n: Pt3): number;
/** 插入：这些面各自往里插一圈（dist 本地长度；超过这张面的上限就按上限）。返回每张面的挤出结果（新点映射 + 那一圈四边形）。 */
export declare function insetFaces(k: MeshKernel, fs: readonly number[], dist: number): ExtrudeResult[];
