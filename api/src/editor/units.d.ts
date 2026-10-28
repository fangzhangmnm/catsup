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
/** 一段长度文字 → 米；裸数 = 按 unit。看不懂 / 带了不是长度的后缀 → { error }（人话）。 */
export declare function parseLength(part: string, unit: LengthUnit): number | {
    error: string;
};
export type Quantity = "length" | "speed";
/** 速度用在谁身上：同一个 m/s，人走看配速、车看 km/h / mph、船和飞机看节（user 10-22「我会马拉松，开车和开飞机……配速，mph和knots这样我能和现实体感比」）。 */
export type Mover = "foot" | "road" | "water" | "air";
export interface QuantityTag {
    readonly q: Quantity; /** 速度才有；不给 = 走路。 */
    readonly mover?: Mover;
}
export type SpeedUnit = "m/s" | "km/h" | "mph" | "kn" | "min/km" | "min/mi";
export declare const SPEED_UNITS: readonly {
    id: SpeedUnit;
    label: string;
}[];
/** 速度显示单位覆盖（以后的设置页写；现在只在内存里，还没存 = user「以后理一下」）。null = 回默认。 */
export declare function setSpeedUnit(mover: Mover, u: SpeedUnit | null): void;
/** 公制还是英制（跟着当前长度显示单位）。 */
export declare function unitSystem(u?: LengthUnit): "metric" | "imperial";
/** 这类东西的速度现在按什么单位显示。 */
export declare function speedUnitFor(mover?: Mover): SpeedUnit;
/** 显示（精确，不带 ~）：长度按当前显示单位（米 3 位小数、英尺英寸到 1/16″）；速度按 speedUnitFor。 */
export declare function formatQuantity(si: number, tag: QuantityTag): string;
/** 读输入：什么单位都接（长度 = parseLength 那一套，速度 = 配速 / km/h / mph / 节 / m/s）；裸数 = 当前显示单位。 */
export declare function parseQuantity(text: string, tag: QuantityTag): number | {
    error: string;
};
/**
 * − / + 一下：在显示单位的整格上走一格（先落到格上，再走；user「都单位和用户选择单位对齐」）。dir = +1 = SI 变大（配速是越走越快 = 数变小）。
 * 速度走不动（配速走到 0 以下）= 原样。
 */
export declare function nudgeQuantity(si: number, dir: 1 | -1, tag: QuantityTag, siStep: number): number;
