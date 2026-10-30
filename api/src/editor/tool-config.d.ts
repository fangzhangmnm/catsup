import type { QuantityTag } from "./units.ts";
/** 选区默认档：有笔 / 触屏的设备 = 多选，键鼠 = 替换（user 10-28「平板上选择能不能默认是点击xor」）。node（测试）里没有 navigator = 替换。 */
/** 「选区」两档的出厂值按设备（controller/stance.ts BOOLEAN_DEFAULT：鼠标点一下 = 替换 → 「替换」档；笔点一下 = 切换 → 「多选」档）。有触屏的设备 = 笔（iPad；手指版以后，先照笔）。 */
export declare function selectModeFor(device: "mouse" | "pen" | "finger"): "replace" | "multi";
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
    /** 这个数是一个物理量（值存 SI：米 / 米每秒）：显示、− +、打字都按用户选的单位（units.ts；2026-10-28 user「都单位和用户选择单位对齐」）。给了它 unit 就不看。 */
    readonly quantity?: QuantityTag;
    readonly scope: OptionScope;
    /** 只在这几个工作台露（软边橡皮的「最大角度」只管硬表面：网格体的边是拓扑，标平滑不看角度）。 */
    readonly modes?: readonly string[];
}
export interface BoolOption {
    readonly kind: "bool";
    readonly label: string;
    readonly def: boolean;
    readonly scope: OptionScope;
    /** 有图标 = 画成图标开关（label 当提示字；拾取 点 / 边 / 面，user 10-28 夜「最好换成icon」）。 */
    readonly icon?: string;
    /** 只在同一组里另一个 enum 选项取这几个值时才露（拉出的「锁比例」只给平的形状）。 */
    readonly shownWhen?: {
        readonly key: string;
        readonly in: readonly string[];
    };
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
        /** 空处拖 = 框 / 套索（账本 UX5「套索要进 0.16」；2026-10-28 Claude Opus 5.5）：选择工具和自由建模的操作工具（没选区时空处拖）共用这一项。布尔默认照 stance.ts BOOLEAN_DEFAULT（鼠标：框 = 替换、套索 = 加）。 */
        readonly drag: {
            readonly kind: "enum";
            readonly label: "空处拖";
            readonly values: readonly [{
                readonly id: "box";
                readonly label: "框";
                readonly hint: "拉一个矩形，整个框进来的才算";
            }, {
                readonly id: "lasso";
                readonly label: "套索";
                readonly hint: "画一圈，整个圈进来的才算";
            }];
            readonly def: "box";
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
                readonly hint: "只选了一个组件 = 组件原点；组 / 散几何 / 几个物件 = 包围盒中心";
            }, {
                readonly id: "bbox";
                readonly label: "包围盒中心";
            }, {
                readonly id: "mean";
                readonly label: "顶点平均";
                readonly hint: "全部选中顶点的平均位置（Blender 叫 Median Point）";
            }, {
                readonly id: "active";
                readonly label: "最后选的物件原点";
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
            readonly modes: readonly ["geometry"];
        };
    };
    /** 新建（自由建模；纪元账本 FM182，user 10-27「然后能不能加一个新建的tool，就是拖动然后新建，可以马前炮和马后炮，如果你想用马前炮的尺寸就点击」）：
     *  新建什么 + 点一下时的尺寸（= 马前炮；拖 = 拖多大就多大）。尺寸 = 边长（立方体 / 平面）或直径（圆柱 / 圆锥 / 球），存米、按显示单位显示。马后炮（对齐 / 尺寸 / 段数）照右键新建那一套。 */
    readonly create: {
        readonly kind: {
            readonly kind: "enum";
            readonly label: "形状";
            readonly values: readonly [{
                readonly id: "circleLoop";
                readonly label: "圆圈（只有边）";
            }, {
                readonly id: "squareLoop";
                readonly label: "方框（只有边）";
            }, {
                readonly id: "box";
                readonly label: "立方体";
            }, {
                readonly id: "cylinder";
                readonly label: "圆柱";
            }, {
                readonly id: "cone";
                readonly label: "圆锥";
            }, {
                readonly id: "sphere";
                readonly label: "球";
            }, {
                readonly id: "plane";
                readonly label: "平面";
            }];
            readonly def: "circleLoop";
            readonly scope: "session";
        };
        readonly lockAspect: {
            readonly kind: "bool";
            readonly label: "锁比例";
            readonly def: false;
            readonly scope: "session";
            readonly shownWhen: {
                readonly key: "kind";
                readonly in: readonly ["circleLoop", "squareLoop", "plane"];
            };
        };
        readonly size: {
            readonly kind: "number";
            readonly label: "点一下的尺寸";
            readonly def: 1;
            readonly min: 0.01;
            readonly max: 10000;
            readonly step: 0.01;
            readonly quantity: {
                readonly q: "length";
            };
            readonly scope: "session";
        };
    };
    /** 软选择（比例编辑，Blender 的 O；user 10-28 夜「为什么不先做软选择，然后weebpaint的slider放哪里」；纪元账本 FM1 / FM20「软编辑半径全局共享，像 WeebPaint 的笔刷大小滑条」）：
     *  开着 = 移动 / 旋转 / 缩放 / 沿法线也带着选区周围的点走，越远越少（mesh/soft-select.ts）。半径按屏幕像素存（手上看到多大就多大，和 WeebPaint 笔刷一样），
     *  按下那一刻在轴心那里换算成世界长度；左边那根竖滑条 / [ ] 键调（以后的软编辑笔刷共用这一个半径）。 */
    readonly soft: {
        readonly on: {
            readonly kind: "bool";
            readonly label: "软选择";
            readonly def: false;
            readonly scope: "session";
        };
        readonly radius: {
            readonly kind: "number";
            readonly label: "软半径";
            readonly def: 120;
            readonly min: 10;
            readonly max: 800;
            readonly step: 1;
            readonly unit: "px";
            readonly scope: "session";
        };
    };
    /** 沿边滑（自由建模移动的一种模式；Blender G G；user 10-28 夜「5 做，快捷键同意，然后手势的话就是g的gizmos的一种模式」）：开着 = 移动时每个点只沿它连出去的边滑（不离开原来的面）。 */
    readonly slide: {
        readonly on: {
            readonly kind: "bool";
            readonly label: "沿边滑";
            readonly def: false;
            readonly scope: "session";
        };
    };
    /** 拾取范围（自由建模；user 10-28 晚「移动之类的的chip还是加一个拾取范围吧。点线面，要不三个toggle，放在马前炮可以吗？」）：
     *  点 / 边 / 面各一个开关，关掉的那一级点不中、框不到，下一级顶上（Blender 的 1 / 2 / 3 选择模式，这里是三个独立开关）。全关 = 当全开。
     *  自由建模里按「点 > 边 > 面」抓东西的工具共用这一组（选择 / 移动 / 旋转 / 缩放 / 沿法线；context-bar 按立场表 grab = element 挂上）。 */
    readonly pick: {
        readonly verts: {
            readonly kind: "bool";
            readonly label: "点";
            readonly def: true;
            readonly scope: "session";
            readonly icon: "select-vertex";
        };
        readonly edges: {
            readonly kind: "bool";
            readonly label: "边";
            readonly def: true;
            readonly scope: "session";
            readonly icon: "select-edge";
        };
        readonly faces: {
            readonly kind: "bool";
            readonly label: "面";
            readonly def: true;
            readonly scope: "session";
            readonly icon: "select-face";
        };
    };
    /** 软编辑笔刷（鼓起 / 抹平 / 压平，2026-10-29 Opus 5.5）：一下刷多少；半径在左栏 dial（和软选择共用）。 */
    readonly brush: {
        readonly strength: {
            readonly kind: "number";
            readonly label: "力度";
            readonly def: 0.5;
            readonly min: 0.05;
            readonly max: 1;
            readonly step: 0.05;
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
