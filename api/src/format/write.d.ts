import type { CatsupDocument } from "./document.ts";
import type { Xform } from "../scene/xform.ts";
export declare const CATSUP_EXTENSIONS: readonly ["CATSUP_document", "CATSUP_definitions", "CATSUP_brep", "CATSUP_instance", "CATSUP_material", "CATSUP_desk"];
/** Z-up 3×4 → glTF Y-up 4×4 列主序：C·M·C⁻¹，C = (x,y,z)→(x,z,−y)。 */
export declare function xformToGltfMatrix(m: Xform): number[];
export declare function writeCatsup(doc: CatsupDocument): Uint8Array;
/** 「导出模型」的选择：textures = 贴图嵌进文件（false = 只留底色）；lines = 带边线 primitive；only = 只导这几份物体（世界变换 + 定义下标；缺 = 整个模型）。 */
export interface ModelExportOpts {
    textures: boolean;
    lines: boolean;
    only?: readonly {
        definition: number;
        xform: Xform;
        name?: string;
    }[];
}
export declare function writeGltfModel(doc: CatsupDocument, opts: ModelExportOpts): Uint8Array;
