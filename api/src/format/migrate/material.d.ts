import { type TextureDoc } from "../document.ts";
/** 文件里的 baseColorFactor（前三个分量）→ app 里的 sRGB 材质色。ext = 这个材质的 CATSUP_material 原样（没有 = null）。 */
export declare function materialColorFromFile(bc: readonly (number | undefined)[], ext: Record<string, unknown> | null): [number, number, number];
/** 嵌在材质里的一张图 → 贴图表的一行（现铸身份）。 */
export declare function textureFromLegacyMaterial(materialName: string, image: {
    readonly mimeType: string;
    readonly bytes: Uint8Array;
}, extSizeM: unknown): TextureDoc;
