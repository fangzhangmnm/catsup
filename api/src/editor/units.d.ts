export type LengthUnit = "m" | "cm" | "mm" | "ft" | "in";
export declare const LENGTH_UNITS: readonly {
    id: LengthUnit;
    label: string;
}[];
export declare const UNIT_M: Readonly<Record<LengthUnit, number>>;
export declare const isLengthUnit: (x: unknown) => x is LengthUnit;
export declare function setDisplayUnit(u: LengthUnit): void;
export declare function displayUnit(): LengthUnit;
/** 读数：按给定单位；数值经过取整的前面带「~」（和原来米制的 fmtLen 同一个约定）。米制下 < 1 m 自动念厘米（原行为逐字不变）。 */
export declare function formatLength(m: number, unit: LengthUnit, digits?: number): string;
export declare function fmtLen(m: number, digits?: number): string;
/** 面积读数：米制 < 1 m² 念 cm²（原行为）；cm / mm 念各自的平方；英制念平方英尺（英寸单位念平方英寸）。 */
export declare function fmtArea(m2: number): string;
export declare const fmtDeg: (rad: number) => string;
/** 数值小窗回显（精确，不带 ~）：英尺英寸写 3' 6.5"。 */
export declare function fmtVcbLength(m: number, unit: LengthUnit): string;
/** 文档 settings.displayUnit ↔ 显示单位（格式里英尺英寸一直写作 "ft-in"）。 */
export declare function unitFromSettings(s: {
    displayUnit?: string;
}): LengthUnit;
export declare function unitToSettings(u: LengthUnit): string;
