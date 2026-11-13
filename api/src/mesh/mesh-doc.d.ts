import type { MeshDoc } from "../format/document.ts";
import { MeshKernel } from "./mesh-kernel.ts";
/** 文件里面的那个字节（MeshDoc.faceFlags）：第 1 位 = 面上的隐藏（hide_poly）；别的位没有定义。属性地基轮 3b 起内存里是两列，文件的形状不变，门口来回换。 */
export declare const FILE_FACE_HIDDEN = 1;
/** 内核 → 载荷：角上的每一列原样带上（没有列 = 不写 columns，和以前逐字节一样）；skip 里的 id 不写。 */
export declare function meshDocFromKernel(m: MeshKernel, skip?: ReadonlySet<string>): MeshDoc;
export declare function kernelFromMeshDoc(d: MeshDoc, where?: string): MeshKernel;
