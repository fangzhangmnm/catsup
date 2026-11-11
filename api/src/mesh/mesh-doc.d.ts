import type { MeshDoc, UvSetMeta } from "../format/document.ts";
import { MeshKernel } from "./mesh-kernel.ts";
/** uvSets = 这个网格体的贴图坐标表（MeshBody.uvSets 的行）：每一行从内核里同 GUID 的列取角上的数。不给 = 不带贴图坐标。 */
export declare function meshDocFromKernel(m: MeshKernel, uvSets?: readonly UvSetMeta[]): MeshDoc;
export declare function kernelFromMeshDoc(d: MeshDoc, where?: string): MeshKernel;
