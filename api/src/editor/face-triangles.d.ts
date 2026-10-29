import type { GeomView } from "../scene/world-view.ts";
import type { FaceId, Pt3 } from "../kernel/kernel.ts";
export declare function faceTriangles(k: GeomView, id: FaceId): [Pt3, Pt3, Pt3][];
