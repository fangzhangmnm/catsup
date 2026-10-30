export type LengthUnit = "m" | "cm" | "mm" | "ft" | "in";
export declare const LENGTH_UNITS: readonly {
    id: LengthUnit;
    label: string;
}[];
export declare const UNIT_M: Readonly<Record<LengthUnit, number>>;
export declare const isLengthUnit: (x: unknown) => x is LengthUnit;
export type UnitSystem = "metric" | "imperial" | "dnd";
export declare function setUnitSystem(sys: UnitSystem): void;
export declare function unitSystemNow(): UnitSystem;
export declare function displayUnit(): LengthUnit;
export declare const MILE_M = 1609.344;
/**
 * 一个整齐长度（网格的一层 / 吸附的一档）的短写：公制按大小挑 fm … Gm、去掉多余的零（10 m、1 km、100 µm）；英制 / D&D 写英寸分数、英寸或英尺（1/16 in、6 in、5 ft），
 * ≥ 1 英里后面加「约 x mi」。sys 缺 = 当前单位制。
 */
export declare function fmtStep(m: number, sys?: UnitSystem): string;
/** 读数：按给定单位；数值经过取整的前面带「~」（和原来米制的 fmtLen 同一个约定）。米制下 < 1 m 自动念厘米（原行为逐字不变）。 */
export declare function formatLength(m: number, unit: LengthUnit, digits?: number): string;
/** 看的字（提示 / 吸附标签 / 读数 / 网格标记）：按当前单位制；英制 / D&D ≥ 1 英里后面加「约 x mi」（不进网格进位、不进输入框）。 */
export declare function fmtLen(m: number, digits?: number): string;
export declare function aboutMiles(m: number): string;
/** 面积读数：米制 < 1 m² 念 cm²（原行为）；cm / mm 念各自的平方；英制念平方英尺（英寸单位念平方英寸）。 */
export declare function fmtArea(m2: number): string;
export declare const fmtDeg: (rad: number) => string;
/** 数值小窗回显（精确，不带 ~）：英尺英寸写 3' 6.5"。 */
export declare function fmtVcbLength(m: number, unit: LengthUnit): string;
export declare function parseLength(part: string, unit: LengthUnit): number | {
    error: string;
};
/** 量的种类。angle（2026-10-28 晚加）= 存弧度、显示 / 打字按度；factor = 倍数（无量纲，打 % 也认）——键盘起手里打数（S Z 0）和单位文本框走同一个读法（user「所以就是一个parser啦，看一下能不能和单位文本框深模块窄接口」）。 */
export type Quantity = "length" | "speed" | "angle" | "factor";
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
 * 打字时这个键能不能接进这一段量的文字（键盘起手里打数用；和 parseQuantity 是同一张「这个量怎么写」）：
 * 数字 / 小数点 / 正负号永远能；单位那几个字只在已经有数之后（长度 m c i n f t ' " 空格 /，角度 ° d e g r a，倍数 %）。
 * X / Y / Z 永远不接（它们是锁轴，打到一半也能锁，Blender 同款）。
 */
export declare function quantityKey(tag: QuantityTag, buf: string, key: string): boolean;
/**
 * − / + 一下：在显示单位的整格上走一格（先落到格上，再走；user「都单位和用户选择单位对齐」）。dir = +1 = SI 变大（配速是越走越快 = 数变小）。
 * 速度走不动（配速走到 0 以下）= 原样。
 */
export declare function nudgeQuantity(si: number, dir: 1 | -1, tag: QuantityTag, siStep: number): number;
