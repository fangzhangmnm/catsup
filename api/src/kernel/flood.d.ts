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
/** 面的一侧：0 = 平面法向 +n 那侧，1 = −n 那侧（= 面层 material / materialBack）。 */
export type Side = 0 | 1;
/**
 * 面 f 在它的哪条环边上「面在左手边」（从 +n 看）：+1 = 沿 a→b 走面在左、−1 = 在右。内核约定外环逆时针、洞环顺时针（都是面在左），
 * 这里照环的实际绕向算（signedArea），不靠约定。
 */
type RingView = {
    readonly edges: readonly {
        readonly edge: EdgeId;
        readonly forward: boolean;
    }[];
    readonly pts: readonly {
        readonly x: number;
        readonly y: number;
    }[];
};
export declare function faceLeftSign(k: {
    face(id: FaceId): {
        readonly outer: RingView;
        readonly holes: readonly RingView[];
    } | undefined;
}, fid: FaceId, eid: EdgeId): number | null;
/**
 * 按侧灌：从 (seed, side) 出发，经 gate 放行的边走到邻面的**对应那一侧**。跨边 e 从 A 到 B：两张面「面在左」的符号相反 = 两张面的 +n 朝同一边
 * （朝向一致）→ 侧不变；相同 = 朝向相反 → 侧翻转。同一张面两侧都灌到（莫比乌斯环）就两侧都在结果里。顺序 = 灌到的顺序。
 */
export declare function floodSides(k: FloodView, seed: FaceId, side: Side, gate: EdgeGate): {
    face: FaceId;
    side: Side;
}[];
export {};
