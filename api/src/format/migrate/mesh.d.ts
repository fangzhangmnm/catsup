import type { MeshDoc } from "../document.ts";
export declare function polygonsFromTriangles(positions: Float32Array, indices: Uint32Array, triMaterial?: Uint16Array): {
    doc: MeshDoc;
    skipped: number;
};
