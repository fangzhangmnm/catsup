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
/** 油漆桶涂哪些面（user 2026-10-21「油漆桶应该有不同的模式，对应平滑组啊，整个connected啊，整个component啊，以及锐角之类的」）。 */
export declare const PAINT_MODES: readonly [{
    readonly id: "single";
    readonly label: "一张面";
    readonly hint: "只涂点到的面（有面选区且点在选区里 = 整个选区）";
}, {
    readonly id: "smooth";
    readonly label: "平滑组";
    readonly hint: "沿平滑边（smooth）连通的面一起涂（Ctrl）";
}, {
    readonly id: "sharp";
    readonly label: "到锐角为止";
    readonly hint: "沿夹角 ≤ 阈值的边连通的面一起涂（Ctrl+Shift）";
}, {
    readonly id: "connected";
    readonly label: "连通体";
    readonly hint: "沿任何边连通的面一起涂（Shift）";
}, {
    readonly id: "pool";
    readonly label: "整个组 / 组件";
    readonly hint: "点到的 group / 组件里的全部面（在外面点也行）";
}];
export declare const TOOL_OPTIONS: {
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
    readonly arc: {
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
    readonly paint: {
        readonly mode: {
            readonly kind: "enum";
            readonly label: "涂哪些";
            readonly values: readonly [{
                readonly id: "single";
                readonly label: "一张面";
                readonly hint: "只涂点到的面（有面选区且点在选区里 = 整个选区）";
            }, {
                readonly id: "smooth";
                readonly label: "平滑组";
                readonly hint: "沿平滑边（smooth）连通的面一起涂（Ctrl）";
            }, {
                readonly id: "sharp";
                readonly label: "到锐角为止";
                readonly hint: "沿夹角 ≤ 阈值的边连通的面一起涂（Ctrl+Shift）";
            }, {
                readonly id: "connected";
                readonly label: "连通体";
                readonly hint: "沿任何边连通的面一起涂（Shift）";
            }, {
                readonly id: "pool";
                readonly label: "整个组 / 组件";
                readonly hint: "点到的 group / 组件里的全部面（在外面点也行）";
            }];
            readonly def: "single";
            readonly scope: "session";
            readonly modifiers: {
                readonly ctrl: "smooth";
                readonly shift: "connected";
                readonly ctrlShift: "sharp";
            };
        };
        readonly sharpDeg: {
            readonly kind: "number";
            readonly label: "锐角阈值";
            readonly def: 20;
            readonly min: 1;
            readonly max: 90;
            readonly step: 1;
            readonly unit: "°";
            readonly scope: "session";
        };
    };
};
export type CatsUpToolConfig = ToolConfig<typeof TOOL_OPTIONS>;
export type PaintMode = (typeof PAINT_MODES)[number]["id"];
export {};
