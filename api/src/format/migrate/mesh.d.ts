import type { MeshDoc } from "../document.ts";
export declare function polygonsFromTriangles(positions: Float32Array, indices: Uint32Array, triMaterial?: Uint16Array): {
    doc: MeshDoc;
    skipped: number;
};
/**
 * 网格体的默认平滑，缺了怎么办（2026-11-12 Claude Opus 5.5，从 mesh/mesh-kernel.ts 的 SMOOTH_DEFAULT_LEGACY 搬来 = 读的门口；user 11-13「backward compatibility的税……严格隔离」）：
 * CATSUP_mesh 1.1 起才有 smoothDefault；没这个键的文件（1.0）= 全是棱、只看手标（和以前逐字一样）。网格内核建出来时一律按这里给的设，内核里没有「老文件的默认」。
 * MeshDoc 本身不填（读进来缺就缺着，原样写回去字节不变）；只在 MeshDoc → 网格内核那一下（mesh/mesh-doc.ts kernelFromMeshDoc）问这里。
 */
export declare const OLD_FILE_SMOOTH_DEFAULT: NonNullable<MeshDoc["smoothDefault"]>;
export declare const smoothDefaultOf: (d: MeshDoc) => NonNullable<MeshDoc["smoothDefault"]>;
