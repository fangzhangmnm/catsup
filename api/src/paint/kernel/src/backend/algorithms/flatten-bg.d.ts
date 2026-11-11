export declare function flattenToBg(src: Uint8ClampedArray, br: number, bg: number, bb: number): Uint8ClampedArray;
/** 导出底色配置值 → rgb。"transparent"/非法/缺省 = null（=透明，不 flatten）。
 *  UI 层负责把色名/色温 parse 成 #rrggbb（parseColorName）；这里只认 6 位 hex，防御性收口。 */
export declare function parseExportBg(bg: string | null | undefined): {
    r: number;
    g: number;
    b: number;
} | null;
