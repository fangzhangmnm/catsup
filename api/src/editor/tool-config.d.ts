export type OptionScope = "session" | "device" | "doc";
export interface Modifiers {
    ctrl?: boolean;
    shift?: boolean;
}
export interface EnumOption {
    readonly kind: "enum";
    readonly label: string;
    readonly values: readonly {
        readonly id: string;
        readonly label: string;
        readonly hint?: string;
    }[];
    readonly def: string;
    readonly scope: OptionScope;
    /** 按住修饰键时临时成为哪个值（ctrl / shift / ctrlShift）。 */
    readonly modifiers?: {
        readonly ctrl?: string;
        readonly shift?: string;
        readonly ctrlShift?: string;
    };
}
export interface NumberOption {
    readonly kind: "number";
    readonly label: string;
    readonly def: number;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    /** 显示单位（纯标注；值的量纲由选项自己定义——调参纪律） */
    readonly unit?: string;
    readonly scope: OptionScope;
}
export interface BoolOption {
    readonly kind: "bool";
    readonly label: string;
    readonly def: boolean;
    readonly scope: OptionScope;
}
export type OptionDef = EnumOption | NumberOption | BoolOption;
export type OptionTable = Readonly<Record<string, Readonly<Record<string, OptionDef>>>>;
type ValueOf<D> = D extends EnumOption ? D["values"][number]["id"] : D extends NumberOption ? number : D extends BoolOption ? boolean : never;
/** 持久化接缝（device scope 用）：同步 get / set，与 app 的 device-kv 同形。 */
export interface OptionKv {
    get(key: string): string | null;
    set(key: string, v: string | null): void;
}
/** 一个工具当前的全部选项（给 UI 生成用）。 */
export interface OptionEntry {
    readonly key: string;
    readonly def: OptionDef;
    readonly value: string | number | boolean;
}
export declare class ToolConfig<T extends OptionTable> {
    private readonly values;
    private readonly subs;
    readonly table: T;
    private readonly kv;
    private readonly kvPrefix;
    /** node strip-types 不认参数属性，故显式赋值。 */
    constructor(table: T, kv?: OptionKv, kvPrefix?: string);
    private k;
    private kvKey;
    /** 当前值（合法性由 set 保证）。 */
    get<K extends keyof T & string, O extends keyof T[K] & string>(tool: K, key: O): ValueOf<T[K][O]>;
    /** 写值：非法值被拒（返回 false，不改）；合法则存 + 按 scope 落盘 + 通知订阅者。 */
    set<K extends keyof T & string, O extends keyof T[K] & string>(tool: K, key: O, value: ValueOf<T[K][O]> | string | number | boolean): boolean;
    /** 回默认（一个工具的全部选项）。 */
    reset(tool: keyof T & string): void;
    /** 按住修饰键时的有效值（只对带 modifiers 的 enum 有意义；其余原样）。 */
    effective<K extends keyof T & string, O extends keyof T[K] & string>(tool: K, key: O, mods: Modifiers): ValueOf<T[K][O]>;
    /** 一个工具的选项条目（声明顺序），没有选项 → []。 */
    entries(tool: string): OptionEntry[];
    /** 某个 enum 值的标签（UI / hint 用）。 */
    labelOf(tool: string, key: string, value: string): string;
    subscribe(fn: (tool: string, key: string) => void): () => void;
    private coerce;
}
/** 工具 → 选项组：表面指派工具（油漆桶 / 以后的碰撞、贴图投影）共用 `surface` 一组（user「锐角阈值和模式的持久化不同工具共享」）。 */
export declare function optionGroupOf(tool: string): string;
export declare const TOOL_OPTIONS: {
    /** 矩形从哪画（user 2026-10-24「中心rect……还是要」；SU 按 Ctrl / Option 从中心）：Ctrl 按着 = 临时从中心。 */
    readonly rect: {
        readonly from: {
            readonly kind: "enum";
            readonly label: "起点";
            readonly values: readonly [{
                readonly id: "corner";
                readonly label: "从角";
            }, {
                readonly id: "center";
                readonly label: "从中心";
            }];
            readonly def: "corner";
            readonly scope: "session";
            readonly modifiers: {
                readonly ctrl: "center";
            };
        };
    };
    readonly circle: {
        readonly segments: {
            readonly kind: "number";
            readonly label: "段数";
            readonly def: 24;
            readonly min: 3;
            readonly max: 96;
            readonly step: 1;
            readonly scope: "session";
        };
    };
    /** 弧的四种（SU 对照；user 2026-10-24「几种arc模式也看一下」）：两点弧 / 圆心弧 / 三点弧 / 扇形；定义住 arc-build.ts。 */
    readonly arc: {
        readonly mode: {
            readonly kind: "enum";
            readonly label: "画法";
            readonly values: readonly {
                id: import("./arc-build.ts").ArcMode;
                label: string;
                hint: string;
            }[];
            readonly def: "two";
            readonly scope: "session";
        };
        readonly segments: {
            readonly kind: "number";
            readonly label: "段数";
            readonly def: 12;
            readonly min: 2;
            readonly max: 96;
            readonly step: 1;
            readonly scope: "session";
        };
    };
    /** 焊边橡皮（user 2026-10-24「有一个最大角度护栏」）：接点两边的转角 ≤ 这个角才焊成一条长弧 / 折线；共轴（0°）直接真合并；更尖的不碰。 */
    readonly weldErase: {
        readonly maxDeg: {
            readonly kind: "number";
            readonly label: "最大角度";
            readonly def: 45;
            readonly min: 1;
            readonly max: 90;
            readonly step: 1;
            readonly unit: "°";
            readonly scope: "session";
        };
    };
    /** 软边橡皮（「第三个橡皮……原理一样。共面就删边，不共面就改软边」）：两膜二面角 ≤ 这个角才软化（+ 平滑）；共面直接删边并面；更尖的不碰。默认 20° 对齐 SU Soften。 */
    readonly softErase: {
        readonly maxDeg: {
            readonly kind: "number";
            readonly label: "最大角度";
            readonly def: 20;
            readonly min: 1;
            readonly max: 90;
            readonly step: 1;
            readonly unit: "°";
            readonly scope: "session";
        };
    };
    /** 表面指派共用（user 2026-10-24 要的持久化 = 跟机器；scope device，经 host 递来的 device-kv）。 */
    readonly surface: {
        readonly tier: {
            readonly kind: "enum";
            readonly label: "范围";
            readonly values: readonly [{
                readonly id: "smooth";
                readonly label: "平滑组";
                readonly hint: "沿软边连通的面 = 一张逻辑面（单击）";
            }, {
                readonly id: "sharp";
                readonly label: "到锐角为止";
                readonly hint: "沿软边或夹角 ≤ 阈值的边连通的面（双击）";
            }, {
                readonly id: "connected";
                readonly label: "连通体";
                readonly hint: "沿任何边连通的面（三击）";
            }];
            readonly def: "smooth";
            readonly scope: "device";
        };
        readonly sharpDeg: {
            readonly kind: "number";
            readonly label: "锐角阈值";
            readonly def: 20;
            readonly min: 1;
            readonly max: 90;
            readonly step: 1;
            readonly unit: "°";
            readonly scope: "device";
        };
    };
};
export type CatsUpToolConfig = ToolConfig<typeof TOOL_OPTIONS>;
export {};
