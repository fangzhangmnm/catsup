import type { Edge, Face, FaceId, Vertex } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";
export declare class ScreenIndex {
    private vcells;
    private ecells;
    private fcells;
    private bigFaces;
    private constructor();
    private gather;
    verticesNear(sx: number, sy: number, r: number): Vertex[];
    edgesNear(sx: number, sy: number, r: number): Edge[];
    facesNear(sx: number, sy: number, r: number): Face[];
    private static cache;
    static for(k: GeomView, pf: PointerFrame, vp: Viewport): ScreenIndex | null;
}
export type { FaceId };
