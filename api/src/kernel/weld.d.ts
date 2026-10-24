import type { Kernel } from "./kernel.ts";
import type { CurveId, CurveSpec } from "./curves.ts";
import type { EdgeId } from "./kernel.ts";
export interface WeldPlan {
    edges: EdgeId[];
    closed: boolean;
    spec: CurveSpec;
    curves: CurveId[];
}
export declare function planWeld(k: Kernel, ids: readonly EdgeId[]): WeldPlan | string;
