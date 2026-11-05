import type { Guid } from "../identity/guid.ts";
import type { DefinitionDoc, MaterialDoc } from "./document.ts";
export declare function canonDefinition(d: DefinitionDoc, layerGuid: (code: number) => Guid | undefined): unknown;
/** 材质：整条逐字比（名字 / 贴图字节 ……），颜色先走一遍写盘那道色彩空间换算（来回有 1e-16 的浮点噪声，存过一次之后不再变；不走 = 一边存过一边没存就判不一样）。 */
export declare const canonMaterial: (m: MaterialDoc) => unknown;
