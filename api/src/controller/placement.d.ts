import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";
import type { Surface } from "../editor/commands/action.ts";
/** 一格装一组、显示当前那把、小三角换（SU 小三角，user 10-24）。 */
export type RailSlot = {
    readonly tool: Tool;
} | {
    readonly flyout: "shapes" | "erasers";
};
/** 后面的组：pinned = 常驻；pool = 用过才长出来；budget = 这组最多几格。 */
export interface RailGroup {
    readonly id: string;
    readonly pinned: readonly Tool[];
    readonly pool: readonly Tool[];
    readonly budget: number;
}
/** 形状格的一组（矩形 / 中心矩形 / 圆角矩形 / 圆 / 弧）。橡皮格的一组 = tool-ids.ts ERASERS（SSoT 在那）。 */
export declare const SHAPES: readonly Tool[];
/** 第一组常驻（不吃预算）。 */
export declare const RAIL_FIRST: readonly RailSlot[];
export declare const RAIL_GROUPS: readonly RailGroup[];
/**
 * 工作台自己定死的一列（不走分组 / 预算）。自由建模 = user 10-27「选 拉 挪 转 缩 刀 删 插 八个常用的，先这么试一下」+「用两字词语吧和硬表面对齐」；
 * 验证 = 步行第一格（v0.15.43，user「12同意」）+ 选择 / 移动 / 旋转 + 尺规（v0.15.44「以及尺规还是要的」）。没列的工作台 = 走上面的分组。
 */
export declare const RAIL_FIXED: Readonly<Partial<Record<ModeId, readonly Tool[]>>>;
/** 同一把工具在某个工作台里另起的名字（user 10-27「要不要在自由建模工作台里显示成「拉」 可以」「或者叫挤出也行，更标准」；插入那一格合租倒角，user 10-28「3插入倒角」）。 */
export declare const RAIL_LABELS: Readonly<Partial<Record<ModeId, Partial<Record<Tool, string>>>>>;
export type MenuTab = "file" | "model" | "settings" | "help";
export interface MenuTabDef {
    readonly id: MenuTab;
    readonly label: string;
    readonly icon: string;
}
export declare const MENU_TABS: readonly MenuTabDef[];
/** ☰ 的一行放在哪：页 + 先后 + 分区小标题 / 前面一条线。id = 渲染器认的行（main.ts menuRow）；渲染器给 null = 这一行现在不露。 */
export interface MenuRow {
    readonly id: string;
    readonly tab: MenuTab;
    readonly section?: string;
    readonly separatorBefore?: boolean;
}
export declare const MENU_ROWS: readonly MenuRow[];
/** 一个放置面现在谁画：renderer = 那个文件（相对 src/）；pending = 还没有渲染器，写明为什么；preRegister = 这个面本来就没有界面、动作可以先登记在这（搜索 / 脚本接口）。 */
export type SurfaceStatus = {
    readonly renderer: string;
} | {
    readonly pending: string;
    readonly preRegister?: true;
};
/**
 * 注册表的每个放置面（commands/action.ts Surface）现在谁画。守卫：放在「pending 且不准先登记」的面上的动作 = 红（那种动作哪都看不见）；renderer 文件得真的在。
 * 加一个面 = Surface 加一个词 + 这里一行；接上渲染器 = 把 pending 换成 renderer。
 */
export declare const SURFACE_RENDERERS: Readonly<Record<Surface, SurfaceStatus>>;
