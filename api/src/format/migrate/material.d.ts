/** 文件里的 baseColorFactor（前三个分量）→ app 里的 sRGB 材质色。ext = 这个材质的 CATSUP_material 原样（没有 = null）。 */
export declare function materialColorFromFile(bc: readonly (number | undefined)[], ext: Record<string, unknown> | null): [number, number, number];
