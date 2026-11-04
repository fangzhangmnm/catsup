import { type Guid } from "./guid.ts";
import { type SideCounts } from "./bake.ts";
import type { CatsupDocument } from "./document.ts";
import type { Xform } from "../scene/xform.ts";
export declare const CATSUP_EXTENSIONS: readonly ["CATSUP_document", "CATSUP_definitions", "CATSUP_brep", "CATSUP_instance", "CATSUP_material", "CATSUP_desk"];
/** Z-up 3×4 → glTF Y-up 4×4 列主序：C·M·C⁻¹，C = (x,y,z)→(x,z,−y)。 */
export declare function xformToGltfMatrix(m: Xform): number[];
export declare function writeCatsup(doc: CatsupDocument): Uint8Array;
/** 「导出模型」的选择：textures = 贴图嵌进文件（false = 只留底色）；lines = 带边线 primitive；only = 只导这几份物体（世界变换 + 定义的 GUID；缺 = 整个模型）。 */
export interface ModelExportOpts {
    textures: boolean;
    lines: boolean;
    only?: readonly {
        definition: Guid;
        xform: Xform;
        name?: string;
    }[];
}
/** 导出说明行的数（导出表单；计划书 §9.2½ ②）：这次要导的硬表面定义里，N 张面两侧都出、其中 M 张两侧材质不同、K 张两侧都是默认背面。一份定义只算一次（摆几份都一样）。 */
export declare function exportSideCounts(doc: CatsupDocument, only?: readonly Guid[]): SideCounts;
export declare function writeGltfModel(doc: CatsupDocument, opts: ModelExportOpts): Uint8Array;
