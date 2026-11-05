import { type Ref } from "../identity/kinds.ts";
import { type Guid } from "../identity/guid.ts";
import type { DefinitionDoc, LayerDoc } from "./document.ts";
export declare const DEFINITION = "definition", MATERIAL = "material", LAYER = "layer";
export declare const defRef: (guid: Guid) => Ref;
export declare const materialRef: (guid: Guid) => Ref;
export declare const layerRef: (guid: Guid) => Ref;
/** 定义这种条目在图上的样子：文件形状 + 它实例上层代号的那张对照表（层代号是源文件层表的代号，家规「编号只当对照表的代号」；离开那份文件就得带着表走）。 */
export interface DefinitionEntry {
    readonly def: DefinitionDoc;
    readonly layerGuid: (code: number) => Guid | undefined;
}
export declare const layerGuidOfTable: (layers: readonly LayerDoc[]) => ((code: number) => Guid | undefined);
