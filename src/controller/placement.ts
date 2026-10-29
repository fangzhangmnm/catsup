// controller/placement.ts —— 放置表的 app 那半：左柱（手 + 工具袋）和 ☰ 放什么、第几（UX 心智模型 §2.2 / §8 补 3；账本 UX34；接线清单第 1 条）。
// created 2026-10-28 by Claude Opus 5.5
// user 10-28：「放置表管的事不同的面板里面放什么指令，不只是左栏和右键菜单」。注册表里的指令（修复 / 转换 / 网格体动词）住 editor/commands 的放置表；
// 这里是注册表管不着的两块——左柱放的是**工具**（立场表 controller/stance.ts 的行），☰ 放的是 app 动词（保存 / 图库 / 定稿 / 设置…）。
// 分工：**这张表 = 放哪、第几**（数据）；渲染器（app/main.ts）= 长什么样（字 / 图标 / 动态的勾和数字 / 点了做什么）。
// 改左柱分组、改 ☰ 某页的顺序 = 改这里一行，不碰 main.ts。守卫 test/placement.test.ts。
import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";
import type { Surface } from "../editor/commands/action.ts";

// ---------------- 左柱 ----------------
// 2026-10-24 user 定稿（参考 SU 不照抄；「鼠标就是选择」）：第一组常驻 选择 / 画线 / 形状格 / 橡皮格；后面每组有**预算**，开局只显示常驻，
// 池里的工具用过了、且还有预算就长出一格「最近」槽；柱子不够高先吃最近槽、再吃常驻（吃掉的都在 ⌄ 里）。su 的视角操作不进左柱（右边 view 栏管）。

/** 一格装一组、显示当前那把、小三角换（SU 小三角，user 10-24）。 */
export type RailSlot = { readonly tool: Tool } | { readonly flyout: "shapes" | "erasers" };
/** 后面的组：pinned = 常驻；pool = 用过才长出来；budget = 这组最多几格。 */
export interface RailGroup { readonly id: string; readonly pinned: readonly Tool[]; readonly pool: readonly Tool[]; readonly budget: number }

/** 形状格的一组（矩形 / 中心矩形 / 圆角矩形 / 圆 / 弧）。橡皮格的一组 = tool-ids.ts ERASERS（SSoT 在那）。 */
export const SHAPES: readonly Tool[] = ["rect", "crect", "rrect", "circle", "arc"];
/** 第一组常驻（不吃预算）。 */
export const RAIL_FIRST: readonly RailSlot[] = [{ tool: "select" }, { tool: "line" }, { flyout: "shapes" }, { flyout: "erasers" }];
export const RAIL_GROUPS: readonly RailGroup[] = [
  { id: "edit", pinned: ["pp", "move"], pool: ["offset", "followme", "rotate", "scale", "transform"], budget: 4 },
  { id: "measure", pinned: ["tape", "axes"], pool: ["protractor", "compass"], budget: 3 },   // 卷尺 / 轴常驻（v0.15.19 误把 user 10-27「卷尺和座标架相对比较低频，不需要常驻」读成也管硬表面，那句说的是自由建模）
  { id: "paint", pinned: ["paint"], pool: [], budget: 1 },
];
/**
 * 工作台自己定死的一列（不走分组 / 预算）。自由建模 = user 10-27「选 拉 挪 转 缩 刀 删 插 八个常用的，先这么试一下」+「用两字词语吧和硬表面对齐」；
 * 验证 = 步行第一格（v0.15.43，user「12同意」）+ 选择 / 移动 / 旋转 + 尺规（v0.15.44「以及尺规还是要的」）。没列的工作台 = 走上面的分组。
 */
/** 定死一列里的小三角组（2026-10-28 夜 user「沿法向移动和推拉合租小三角」）：列里写组的第一把，格子显示最近用的那把，小三角 / 长按 / 右键 = 整组。 */
export const RAIL_FIXED_FLYOUTS: Readonly<Partial<Record<ModeId, Partial<Record<Tool, readonly Tool[]>>>>> = {
  freeform: { pp: ["pp", "shrink"] },
};
export const RAIL_FIXED: Readonly<Partial<Record<ModeId, readonly Tool[]>>> = {
  // create = 拉出（FM182；user 10-28 夜「拉出放到推拉上面」）；删除 / 插入倒角搬进下面的折叠组（「删除，插入倒角也折叠」）
  freeform: ["select", "create", "pp", "move", "rotate", "scale", "knife"],
  verify: ["walk", "select", "move", "rotate", "tape", "protractor", "compass", "axes"],
};
/**
 * 定死一列下面的折叠组（user 10-28 夜「笔刷小三角同意。然后算是自动折叠的不是常驻的。删除，插入倒角也折叠」）：
 * 平时只有一条矮「…」（点开 = 整组）；这次会话里用过的按最近使用长出来，最多 budget 格（和硬表面后面几组的「池」同一个意思，只是没有常驻）。
 * 小三角组（RAIL_FIXED_FLYOUTS）也能放进来：写组的第一把，长出来的那格显示最近用的那把。
 */
export const RAIL_FIXED_FOLD: Readonly<Partial<Record<ModeId, { readonly pool: readonly Tool[]; readonly budget: number }>>> = {
  freeform: { pool: ["erase", "offset"], budget: 3 },
};
/** 同一把工具在某个工作台里另起的名字（user 10-27「要不要在自由建模工作台里显示成「拉」 可以」「或者叫挤出也行，更标准」；插入那一格合租倒角，user 10-28「3插入倒角」）。 */
export const RAIL_LABELS: Readonly<Partial<Record<ModeId, Partial<Record<Tool, string>>>>> = { freeform: { pp: "挤出", erase: "删除", offset: "插入/倒角" } };   // 拉出 = 工具本名（自由建模独有）

// ---------------- ☰ ----------------
// 分页 = WeebPaint 范式（A30，user 2026-10-24「汉堡菜单应该tab制度，和weebpaint一样」）；文件页 = 合租法（user 10-24「看一下weebpaint是怎么收的更干净的，谁和谁合租」）：
// 新建 / 打开 / 导入合一行、导出与另存合一行，各开小弹层；保存走顶栏保存钮，登录走图库页——都不占菜单行。

export type MenuTab = "file" | "model" | "settings" | "help";
export interface MenuTabDef { readonly id: MenuTab; readonly label: string; readonly icon: string }
export const MENU_TABS: readonly MenuTabDef[] = [
  { id: "file", label: "文件", icon: "floppy-disk" },
  { id: "model", label: "模型", icon: "object" },
  { id: "settings", label: "设置", icon: "settings" },
  { id: "help", label: "帮助", icon: "help" },
];
/** ☰ 的一行放在哪：页 + 先后 + 分区小标题 / 前面一条线。id = 渲染器认的行（main.ts menuRow）；渲染器给 null = 这一行现在不露。 */
export interface MenuRow { readonly id: string; readonly tab: MenuTab; readonly section?: string; readonly separatorBefore?: boolean }
export const MENU_ROWS: readonly MenuRow[] = [
  { id: "gallery", tab: "file" },
  { id: "newOpen", tab: "file" },
  { id: "exportHub", tab: "file" },
  { id: "finalize", tab: "file" },          // 定稿 / 改稿（同一行，渲染器按状态换字）
  { id: "softenAll", tab: "model" },
  { id: "weldAllBreaks", tab: "model" },
  { id: "makePlanarAll", tab: "model" },
  { id: "material", tab: "model" },
  { id: "clear", tab: "model", separatorBefore: true },
  { id: "finger", tab: "settings" },
  { id: "factoryReset", tab: "settings", section: "开发者" },   // 家规 2½：还原出厂住开发者菜单；「强制更新」是另一个钮，留在帮助页
  { id: "help", tab: "help" },
  { id: "debuglog", tab: "help" },
  { id: "update", tab: "help" },
];

// ---------------- 放置面的渲染器登记 ----------------
/** 一个放置面现在谁画：renderer = 那个文件（相对 src/）；pending = 还没有渲染器，写明为什么；preRegister = 这个面本来就没有界面、动作可以先登记在这（搜索 / 脚本接口）。 */
export type SurfaceStatus = { readonly renderer: string } | { readonly pending: string; readonly preRegister?: true };
/**
 * 注册表的每个放置面（commands/action.ts Surface）现在谁画。守卫：放在「pending 且不准先登记」的面上的动作 = 红（那种动作哪都看不见）；renderer 文件得真的在。
 * 加一个面 = Surface 加一个词 + 这里一行；接上渲染器 = 把 pending 换成 renderer。
 */
export const SURFACE_RENDERERS: Readonly<Record<Surface, SurfaceStatus>> = {
  contextBar: { renderer: "app/selection-actions.ts" },     // 几何层：右键菜单 + 笔 / 手指浮条
  objectWindow: { renderer: "app/object-window.ts" },       // 物体窗口（字段 + 物体级动词）
  repairWindow: { renderer: "app/machine-window.ts" },      // 修复这台机器的面板
  repairPanel: { renderer: "editor/editor.ts" },            // 修复面板的步骤表（REPAIR_STEPS；以后搬上指令板）
  objectMenu: { pending: "子组件的物件菜单现在由 HudItem.layer = child 画（selection-actions.ts objectMenuItems），注册表还没往这放" },
  hamburger: { pending: "☰ 放的是 app 动词，表 = 本文件 MENU_ROWS，不是注册表指令" },
  toolStrip: { pending: "左柱放的是工具，表 = 本文件 RAIL_*，不是注册表指令" },
  contextMenu: { pending: "右键菜单走 contextBar 那张表" },
  radial: { pending: "环形菜单还没做（UX 账本：radial 备选）" },
  viewMenu: { pending: "视图 ☰ 还是 main.ts 手写，下一刀吃进来" },
  wristPanel: { pending: "VR 手腕面板直接吃 HudModel.edits()（VR 暂 sunset）" },
  search: { pending: "空格搜索等名字稳定（UX21）", preRegister: true },
  api: { pending: "脚本接口没做", preRegister: true },
};
