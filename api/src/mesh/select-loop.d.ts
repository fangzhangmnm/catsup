import type { MeshKernel } from "./mesh-kernel.ts";
import { type MirrorAxis } from "./mirror.ts";
export type LoopKind = "loop" | "hole" | "wire";
export interface LoopResult {
    readonly edges: number[];
    readonly kind: LoopKind;
    readonly closed: boolean;
}
export interface LoopOpts {
    readonly mirror?: {
        readonly axis: MirrorAxis;
        readonly tol: number;
    };
}
/** 从 e 出发走一条（环 / 洞 / 裸线）；e 不存在 = 空。 */
export declare function edgeLoop(m: MeshKernel, e: number, opts?: LoopOpts): LoopResult;
