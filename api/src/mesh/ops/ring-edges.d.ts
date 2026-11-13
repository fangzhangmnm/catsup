import type { EdgeOrigin, EdgeShape, MeshKernel } from "../mesh-kernel.ts";
export declare function declareRingEdges(k: MeshKernel, ring: readonly number[], originOf: (a: number, b: number) => EdgeOrigin | null): void;
/** 一对点的键（不分先后）。 */
export declare const pairKey: (a: number, b: number) => string;
/** 一张「新的一对点 → 原来哪条边的旧样子」的表 → declareRingEdges 要的 originOf（一份 / 一块）。 */
export declare const fromShapes: (m: ReadonlyMap<string, EdgeShape>, kind: "copy" | "piece") => ((a: number, b: number) => EdgeOrigin | null);
