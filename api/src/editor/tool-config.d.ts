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
    /** 圆规 / 球规（DT50，2026-10-26）：画参考圆还是参考球。 */
    readonly compass: {
        readonly shape: {
            readonly kind: "enum";
            readonly label: "画";
            readonly values: readonly [{
                readonly id: "circle";
                readonly label: "圆";
                readonly hint: "参考圆：画在圆心所在的平面上";
            }, {
                readonly id: "sphere";
                readonly label: "球";
                readonly hint: "参考球：离球心固定距离的点都吸得到（关卡里「绳子够得到哪」）";
            }];
            readonly def: "circle";
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
    /** 推拉两种（user 2026-10-25「pull可以选择加边（就是不自愈），然后看一下对应的快捷键是什么」）：接着长（默认，顺着推拉方向的侧面直接拉长）/ 加边（原来那圈边留着、侧面分两段）；按住 Ctrl = 临时加边（SketchUp Push/Pull + Ctrl 同款键位）。 */
    readonly pp: {
        readonly mode: {
            readonly kind: "enum";
            readonly label: "推拉";
            readonly values: readonly [{
                readonly id: "heal";
                readonly label: "接着长";
                readonly hint: "顺着推拉方向的侧面直接拉长（不多一圈线）";
            }, {
                readonly id: "ring";
                readonly label: "加边";
                readonly hint: "原来那圈边留着、侧面分两段（按住 Ctrl 临时切）";
            }];
            readonly def: "heal";
            readonly scope: "session";
            readonly modifiers: {
                readonly ctrl: "ring";
            };
        };
    };
    /** 轴工具两种（user 2026-10-25「轴工具能不能不设置方向，就设置点，有两种模式？」「默认是只设置点」）：只设原点 = 点一下、朝向不变；原点 + 方向 = 原来的三下。 */
    readonly axes: {
        readonly mode: {
            readonly kind: "enum";
            readonly label: "设什么";
            readonly values: readonly [{
                readonly id: "point";
                readonly label: "只设原点";
            }, {
                readonly id: "full";
                readonly label: "原点 + 方向";
            }];
            readonly def: "point";
            readonly scope: "session";
        };
    };
    /** 选择怎么合进已有选区。2026-10-28 收成两档（纪元账本 FM158；user「我觉得四个模式太麻烦了……就是两个模式，非shift模式是替换。shift模式是 拖动是加选，然后点击是xor」
     *  「12同意」）：替换 / 多选（= 按住 Shift：拖 = 加选、点 = 切换）；Ctrl 照旧减选；多选里点空处 = 清空；有笔 / 触屏的设备默认多选（平板多选高频、没有 Shift）。 */
    readonly select: {
        readonly mode: {
            readonly kind: "enum";
            readonly label: "选区";
            readonly values: readonly [{
                readonly id: "replace";
                readonly label: "替换";
                readonly hint: "新选的换掉原来的（键鼠：按住 Shift = 多选、Ctrl = 减选）";
            }, {
                readonly id: "multi";
                readonly label: "多选";
                readonly hint: "拖 = 加选；点 = 没选的加上、选了的去掉；点空处 = 清空（键鼠：按住 Ctrl = 减选）";
            }];
            readonly def: string;
            readonly scope: "session";
        };
    };
    /** 移动的「复制」开关（DT14，user 2026-10-25「平板上想一下如何复制move，我觉得可以算到move的context menu里面可以开复制」）：开着 = 每次移动都是复制（锁住式，平板没有 Ctrl）；键盘 Ctrl / Alt 照旧临时复制。 */
    readonly move: {
        readonly copy: {
            readonly kind: "bool";
            readonly label: "复制";
            readonly def: false;
            readonly scope: "session";
        };
    };
    /** 变换（2026-10-26，user「transform的时候ctrl应该是复制吧」「transform能不能马后炮可以切换 pivot…是工具自己记住的选项。而且每个工具单独记」）：
     *  复制 = 同移动（开着 = 每次都是复制；按住 Ctrl 临时复制）；变换中心 = 箭头 / 环放在哪、绕哪转（包围盒中心 / 顶点平均 = Blender 的 Median Point / 最后选的物体原点 = Blender 的 Active Element（user「不同的pivot模式就用共同的bbox或者最后一个的pivot」）；
     *  默认「自动」= 只选一个组 / 组件就绕它的轴原点、别的情况包围盒中心（user 2026-10-26「选的是组件的时候应该默认是pivot…选loose geom的时候默认是bb，或者多组件的时候默认是bb」））。 */
    readonly transform: {
        readonly pivot: {
            readonly kind: "enum";
            readonly label: "变换中心";
            readonly values: readonly [{
                readonly id: "auto";
                readonly label: "自动";
                readonly hint: "只选了一个组件 = 组件原点；组 / 散几何 / 几个物体 = 包围盒中心";
            }, {
                readonly id: "bbox";
                readonly label: "包围盒中心";
            }, {
                readonly id: "mean";
                readonly label: "顶点平均";
                readonly hint: "全部选中顶点的平均位置（Blender 叫 Median Point）";
            }, {
                readonly id: "active";
                readonly label: "最后选的物体原点";
                readonly hint: "最后选中的那个组 / 组件的轴原点（Blender 叫 Active Element）；没选组 / 组件 = 包围盒中心";
            }];
            readonly def: "auto";
            readonly scope: "session";
        };
        readonly copy: {
            readonly kind: "bool";
            readonly label: "复制";
            readonly def: false;
            readonly scope: "session";
        };
    };
    /** 旋转的「复制」开关（同移动；按住 Ctrl 临时复制；user 2026-10-26「移动旋转也是ctrl复制开关吧」）。 */
    readonly rotate: {
        readonly copy: {
            readonly kind: "bool";
            readonly label: "复制";
            readonly def: false;
            readonly scope: "session";
        };
    };
    /** 焊边橡皮（user 2026-10-24「有一个最大角度护栏」）：接点两边的转角 ≤ 这个角才焊成一条长弧 / 折线；共轴（0°）直接真合并；更尖的不碰。 */
    readonly weldErase: {
        /** 反向（user 10-26「软边橡皮快捷键和马前炮可以变成相反操作（就是标记硬边），焊边也一样」）：拆开 = 刮过的曲线炸回一段段；按住 Shift = 这里选的反面。 */
        readonly action: {
            readonly kind: "enum";
            readonly label: "动作";
            readonly values: readonly [{
                readonly id: "weld";
                readonly label: "焊接";
            }, {
                readonly id: "split";
                readonly label: "拆开";
                readonly hint: "刮过的曲线拆回一段段（按住 Shift 临时反过来）";
            }];
            readonly def: "weld";
            readonly scope: "session";
        };
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
        /** 反向（同上）：硬化 = 刮过的边去掉软 + 平滑（Blender 的 mark sharp）；按住 Shift = 这里选的反面。 */
        readonly action: {
            readonly kind: "enum";
            readonly label: "动作";
            readonly values: readonly [{
                readonly id: "soften";
                readonly label: "软化";
            }, {
                readonly id: "harden";
                readonly label: "硬化";
                readonly hint: "刮过的边变硬（= 标记硬边；按住 Shift 临时反过来）";
            }];
            readonly def: "soften";
            readonly scope: "session";
        };
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
