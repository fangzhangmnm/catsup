import type { CatsupDocument } from "./document.ts";
import type { Xform } from "../scene/xform.ts";
export declare const CATSUP_EXTENSIONS: readonly ["CATSUP_document", "CATSUP_definitions", "CATSUP_brep", "CATSUP_instance", "CATSUP_material", "CATSUP_desk"];
/** Z-up 3×4 → glTF Y-up 4×4 列主序：C·M·C⁻¹，C = (x,y,z)→(x,z,−y)。 */
export declare function xformToGltfMatrix(m: Xform): number[];
export declare function writeCatsup(doc: CatsupDocument): Uint8Array;
