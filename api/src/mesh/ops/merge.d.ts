import type { Pt3 } from "../../kernel/geom.ts";
import type { MeshKernel } from "../mesh-kernel.ts";
export declare function mergeVerts(k: MeshKernel, ids: readonly number[], target?: "center" | "first" | Pt3): number;
