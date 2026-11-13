export type UnitSystem = "metric" | "metric-mm" | "imperial" | "dnd";
/** 显示 / 输入的长度单位（units.ts LengthUnit 的一部分）：不带单位的数按它算。 */
export type SystemDisplay = "m" | "mm" | "ft";
export interface UnitSystemRow {
    readonly id: UnitSystem;
    readonly label: string;
    /** 下拉里的说明。 */
    readonly hint: string;
    /** 显示 / 不带单位的数按什么。 */
    readonly display: SystemDisplay;
    /** 读数（提示、吸附标签、数值回显）怎么写：auto-si = 按大小自动挑 fm … Gm；mm = 一律毫米（最多两位小数、末尾的零去掉）；ft-in = 英尺英寸。 */
    readonly readout: "auto-si" | "mm" | "ft-in";
    /** 整齐长度（网格一层 / 吸附一档）的短写：si = 按大小挑；mm = 一律毫米；imperial = 英寸分数 / 英寸 / 英尺。 */
    readonly stepStyle: "si" | "mm" | "imperial";
    /** 网格自动换层的进位表（米，从细到粗；相邻两层整数倍）。 */
    readonly ladder: readonly number[];
    /** 吸附的几档（米，从细到粗；每档整除进位表里比它粗的下一层）。 */
    readonly snaps: readonly number[];
    /** 换到这个单位制时吸附落在哪一档（米；在 snaps 里）。 */
    readonly defaultSnap: number;
    /** ≥ 1 英里后面加「约 x mi」。 */
    readonly miles: boolean;
    /** 速度那半按哪一家（D&D 当英制）。 */
    readonly speedFamily: "metric" | "imperial";
    /** 给旧版本照写的旧键（3.4 之前的读者靠 displayUnit 显示、靠 gridPreset 认制式；gridPreset 缺 = 公制）。
     *  缺 displayUnit = 不写（毫米那一行：统筹 11-13「pre-alpha，舍去历史包袱」——不给旧版本照顾，旧版本见到新值按公制开）。 */
    readonly legacy: {
        readonly displayUnit?: "m" | "ft-in";
        readonly gridPreset?: "architectural" | "dnd";
    };
}
export declare const IN_M = 0.0254, FT_M = 0.3048;
/**
 * 表（顺序 = 下拉里的顺序）。单位制 2026-10-30 user「把显示长度单位，grid制式，格距收成一个东西。就是单位。格子跟着单位。公制 英制 dnd三种」；
 * 吸附档 / 默认档 user 10-30 拍（「米的默认是0.2 dnd的默认是1ft」「dnd吸附为什么只有两档，没有更细的」「然后英制没有ft的snapping也奇怪」）。
 */
export declare const UNIT_SYSTEM_ROWS: readonly UnitSystemRow[];
export declare const isUnitSystem: (x: unknown) => x is UnitSystem;
/** 这一行（id 不认识 = 公制那一行；过了读的门口的 id 一定认识）。 */
export declare const unitSystemRow: (id: UnitSystem) => UnitSystemRow;
