import type { EdgeId, FaceId, Kernel } from "./kernel.ts";
type FloodView = Pick<Kernel, "face" | "graph">;
/** 跨边判定：这条边能不能灌过去。 */
export type EdgeGate = (eid: EdgeId) => boolean;
/** 现成的判定。角度一律用弯折角（Kernel.bendDeg：0 = 平展、180 = 对折；2026-10-26 以前用二面角绝对值，尖屋脊会被当成平的）。 */
export declare const gates: {
    /** 只过软边 = 曲面（SketchUp 的 Surface；0.10 设计稿 §4.2：soft 决定成不成一张面来选，smooth 只管着色）。 */
    readonly soft: (k: Pick<Kernel, "isSoft">) => EdgeGate;
    /** 过软边，或两膜夹角 ≤ deg 的边（油漆桶「到锐角为止」）。 */
    readonly softOrFlat: (k: Pick<Kernel, "isSoft" | "bendDeg">, deg: number) => EdgeGate;
    /** 任何边（连通的面）。 */
    readonly any: () => EdgeGate;
    /** 夹角小于 deg 的**硬**边（拍平 DT7 的候选：软边从来不是候选，平滑组自动不碰）。 */
    readonly hardBelow: (k: Pick<Kernel, "isSoft" | "bendDeg">, deg: number) => EdgeGate;
};
/** 从种子面灌：经 gate 放行的边走到邻面。种子不存在 → []。 */
export declare function floodFaces(k: FloodView, seed: FaceId, gate: EdgeGate): FaceId[];
/** 曲面：从一张面出发沿软边灌出的面集（派生态，不存）。 */
export declare function surfaceFaces(k: Pick<Kernel, "face" | "isSoft" | "graph">, seed: FaceId): FaceId[];
/** 把一批面全部分组：每组 = 经 gate 放行的边连起来、且都在这批面里的连通分量。组内顺序 = 灌到的顺序；组之间按各自最小的面 id 排（确定性）。 */
export declare function partitionFaces(k: FloodView, faces: Iterable<FaceId>, gate: EdgeGate): FaceId[][];
/** 连通体（三击）：从这些边 / 面出发，经边、顶点（含没面的线）、面走到底。返回边集 + 面集（种子在里面）。 */
export declare function connectedFrom(k: FloodView, seedEdges: Iterable<EdgeId>, seedFaces: Iterable<FaceId>): {
    edges: Set<EdgeId>;
    faces: Set<FaceId>;
};
export {};
