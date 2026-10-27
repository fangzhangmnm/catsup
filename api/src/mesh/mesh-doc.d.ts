import type { MeshDoc } from "../format/document.ts";
import { MeshKernel } from "./mesh-kernel.ts";
export declare function meshDocFromKernel(m: MeshKernel): MeshDoc;
export declare function kernelFromMeshDoc(d: MeshDoc, where?: string): MeshKernel;
