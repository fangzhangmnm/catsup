import type { MeshDoc } from "../format/document.ts";
import { MeshKernel } from "./mesh-kernel.ts";
/** 文件里面的那个字节（MeshDoc.faceFlags）：第 1 位 = 面上的隐藏（hide_poly）；别的位没有定义。属性地基轮 3b 起内存里是两列，文件的形状不变，门口来回换。 */
export declare const FILE_FACE_HIDDEN = 1;
/** 文件里那两个字节这一版认识的位：面 = 隐藏；边 = 五列 + 裸线（reserved-columns.ts EDGE_BYTE_BITS）。别的位 = 更新版写的、这一版不认识。 */
export declare const FILE_FACE_KNOWN = 1, FILE_EDGE_KNOWN: number;
/**
 * 读的门口（format/mesh-payload.ts decodeMeshItem，读文件只这一处调）：载荷里这一版不认识的位就地去掉，返回带着它们的面、边各几个。
 * 统筹 11-13（规程第九½节末）：不认识的位不拒开文件——不读、打开时说一句（notes.unknownMarks）、保存时不写（内存里没有它们）。
 * 真坏了（环越界、表长对不上）照旧抛，那是 kernelFromMeshDoc 的事。去掉之后一个位都不剩的边那一行 = 读的时候跳过（「这条边没有标记」）。
 */
export declare function dropUnknownMarks(d: MeshDoc): {
    faces: number;
    edges: number;
};
/** 内核 → 载荷：角上的每一列原样带上（没有列 = 不写 columns，和以前逐字节一样）；skip 里的 id 不写。 */
export declare function meshDocFromKernel(m: MeshKernel, skip?: ReadonlySet<string>): MeshDoc;
export declare function kernelFromMeshDoc(d: MeshDoc, where?: string): MeshKernel;
