import type { Guid } from "../identity/guid.ts";
import type { DefinitionDoc, MaterialDoc, TextureDoc } from "./document.ts";
export declare function canonDefinition(d: DefinitionDoc, layerGuid: (code: number) => Guid | undefined): unknown;
/** 材质：整条逐字比（名字 / 贴图字节 ……），颜色先走一遍写盘那道色彩空间换算（来回有 1e-16 的浮点噪声，存过一次之后不再变；不走 = 一边存过一边没存就判不一样）。 */
export declare const canonMaterial: (m: MaterialDoc) => unknown;
/** 贴图：整条逐字比（名字 / value / 尺寸 / 字节……）；不认识的内容和行里不认识的键先把文件里的号换成字节。2026-11-10 Claude Opus 5.5（贴图主线 1-0½）。 */
export declare const canonTexture: (t: TextureDoc) => unknown;
