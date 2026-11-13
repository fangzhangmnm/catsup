import type { MeshDoc } from "../format/document.ts";
import { MeshKernel } from "./mesh-kernel.ts";
/** 内核 → 载荷：角上的每一列原样带上（没有列 = 不写 columns，和以前逐字节一样）；skip 里的 id 不写。 */
export declare function meshDocFromKernel(m: MeshKernel, skip?: ReadonlySet<string>): MeshDoc;
export declare function kernelFromMeshDoc(d: MeshDoc, where?: string): MeshKernel;
