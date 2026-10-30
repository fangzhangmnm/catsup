// controller/stance.ts —— 工具的立场表：每把工具 × 每个工作台一行，写明它「抓什么 / 点一下是什么 / 空处拖是什么 / 沿什么动 / 吸不吸 / 修饰键 / 变换中心 / 做完选区去留」。
// created 2026-10-28 by Claude Fable 5.1（0.16 镜像 + UX 整理纪元；UX 心智模型 `ai-docs/20261028-ux-mental-model.md` §2.3 / §7 原话对账）。
//
// 为什么是一张表（user 10-28）：「关键是不同的子工具的选择逻辑是不是都不一样。能不能把这些逻辑整理出来做一个深模块窄接口」「我嘲笑pre ai modeling software的原因是他们是直乘。所以才需要配置用户preference
// = 元编程…我们现在都变成我们自己的立场。比如我之前说了select和lasso和rect select走不同的默认布尔模式，然后用的轴向也是不一样的…这个是智能，但是这个的智能的实现能不能不屎山」。
// 立场 = 数据，不是散在各工具里的 if：同一把工具在硬表面（SketchUp 语义）和自由建模（Blender 语义）立场不同 = 表里两行并排（周账 F-117「两套肌肉记忆焊在一起」的解法：把焊缝画出来）。
// 工具模块（tools/*.ts）只剩「拿到目标以后做什么」。引擎读表的地方：tools/selecting.ts（抓什么 / 布尔默认）、tool-config.ts（「选区」两档的出厂值按设备）；守卫 test/stance.test.ts（每把工具每个工作台必有一行、语法 / 锁和手势模块一致）。
// 住在 src/controller/（user 10-28「控制器的代码单独一个文件夹 对」）：控制器 = 无头骑士，这个文件夹里不许运行时 import 内核 / 网格 / three / DOM（守卫同一个测试）；老文件碰到哪个搬哪个。
// 这一版 = 零行为变更：每格按 v0.15.46 的现状填，出处见心智模型 §7（原话 → 格子）。还没做的（套索、选区把手…）在表里标 todo，不发明行为。
import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";
import type { SelMode } from "../editor/tools.ts";

/** 没选区时按下作用在谁上（= 捕捉优先级；半径见 solver.ts HIT_PX / MESH_VERT_HIT_PX）。 */
export type Grab =
  | "element"       // 点 > 边 > 面（常量半径）
  | "face"          // 只认面（点和边不挡路，小面也按得到；挤边 / 点 = 先选中）
  | "pointOrEdge"   // 点 / 边上的点（切割的落点）
  | "pick"          // 取点：吸附求解出来的那个点（画线 / 卷尺这类）
  | "scrub"         // 刮：按住划过的都算（橡皮 / 油漆桶）
  | "handle"        // 把手 / 缩放柄
  | "ground"        // 地面（步行放置）
  | "none";
/** 点一下（没拖）是什么。 */
export type Tap =
  | "select"        // 选它 / 点空处清（和选择工具同一套 selecting.ts clickSelect）
  | "place"         // 放这一步的点（SketchUp 点 → 挪 → 点 / 画线点 → 点）
  | "drop"          // 落点（切割）
  | "apply"         // 直接做（油漆桶点一下 = 涂；橡皮点一下 = 擦）
  | "none";
/** 没选区又按在空处拖是什么。 */
export type EmptyDrag = "box" | "lasso" | "scrub" | "none";
/** 默认沿什么动 / 沿什么量。 */
export type Direction =
  | "frame"      // 坐标架（硬表面：推断的轴 / 面 / 点，user 10-28「硬表面默认轴…用轴来设定绘图面」）
  | "normal"     // 法向（挤出面；沿法线）
  | "perp"       // 垂直（挤出边 / 点，user「默认垂直」）
  | "inPlane"    // 面内（偏移 / 插入）
  | "viewPlane"  // 视线平面（自由建模挪 = 相对拖）
  | "viewAxis"   // 绕视线（自由建模转）
  | "uniform"    // 均匀（自由建模缩）
  | "drawPlane"  // 画面平面（画线 / 矩形 / 圆 / 弧 / 尺规：从相机或坐标架挑）
  | "none";
/** 吸附立场（user 10-28「cad的理科生脑子是复杂吸附，自由建模摸形体…是viewport no snapping」）。 */
export type SnapStance =
  | "infer"   // 硬表面：默认推断（点 / 边 / 面 / 轴 / 格点 / 整格 / 15°），Shift = 临时反过来
  | "off"     // 自由建模：底按设备（SNAP_BASE：鼠标 = 关、笔 / 手指 = 右上角吸附锁钮），Shift = 把底反过来（点 > 线 > 面 / 15° / 0.1 一档）
  | "none";   // 根本没有吸附这回事（草稿 / 步行 / 选择）
/** 变换中心（user 10-26「不要叫轴心。叫变换中心」；默认按选的是什么：单组件 = 它的原点、散几何 / 多组件 = 包围盒；临时 = pick）。 */
export type Center = "auto" | "grab" | "mean" | "bbox" | "none";
/** 做完以后选区去哪（user 10-28「如果一开始没选区的话…操作好了还是没选区…只有有选区的时候才保留选区」）。 */
export type After = "keepIfHad" | "keep" | "clear" | "none";

export interface Stance {
  readonly grab: Grab;
  readonly tap: Tap;
  readonly emptyDrag: EmptyDrag;
  readonly direction: Direction;
  readonly snap: SnapStance;
  /** 按住 Shift = 什么（人话；规律 = 把本工作台的吸附立场反过来；选择 = 加 / 切换；UX 心智模型 §3-3 等手柄上线后统一）。 */
  readonly shift: string;
  /** 按住 Ctrl（⌘）= 这把工具的另一种做法（复制 / 从中心 / 加边 / 溶解 / 减选 / 吸色…）；"—" = 没有。 */
  readonly ctrl: string;
  /** 按住 Alt = 换目标 / 换变体（环 / 洞、沿法线…）；"—" = 没有（Alt 还当复制 = UX 心智模型 §3-2 要改）。 */
  readonly alt: string;
  readonly center: Center;
  /** 方向键 / X Y Z 锁的种类（= ToolHandler.lock；null = 这把工具不吃锁）。 */
  readonly lock: "axis" | "plane" | null;
  /** 手势语法（= ToolHandler.grammar）：steps = 按下 / 点 = 一步、再按 = 落定；direct = 按住拖、松手提交。 */
  readonly grammar: "steps" | "direct";
  readonly after: After;
  /** 充能（硬表面：悬停停留的点进充能集，生命周期 = 工具子步）。 */
  readonly charge: boolean;
  /** 意图门（硬表面：屏上拖的方向判意图，反方向的吸附不合法）。 */
  readonly intent: boolean;
  /**
   * 有选区时按下作用在什么上（账本 UX30，user 10-28「move类的东西，在有选择的时候，如果空白处拖动是类似blender的做法，但是如果有明显的选择含义，比如点一个点，那么还是换选择」
   * 「所以相当于看点的是选区，空白，还是选区外的可选择对象」）：split3 = 按在选区上（含选中面 / 边的边和点）→ 对选区做；空处 → 对选区做（Blender）；
   * 选区外的可选对象 → 选区换成它、再做、做完留着它。缺 = 这把工具的手势模块自己管（硬表面 SketchUp 语义、画线 / 刮 / 尺规不看选区）。读的人 = tools/selecting.ts pressTarget。
   */
  readonly press?: "split3";
  /** 还没做的部分（表里先写明立场、不发明行为）。 */
  readonly todo?: string;
}

/**
 * 选区布尔的默认值按手势 × 设备（UX 心智模型 §3-7 user 10-28 拍：鼠标 点 = 替换 / 框 = 替换 / 套索 = 加；笔 点 = 切换 / 框 = 加 / 套索 = 加——笔没有 Shift，框错了清掉重来；手指以后、先照笔）。
 * 设备词定死：mouse = 键鼠；pen = iPad 上的 Apple Pencil（有触屏的设备）；finger = 没有笔的触屏（以后）。Shift / Ctrl / 右下角「选区」两档在这上面覆盖（selecting.ts selModeOf）。
 */
export type Device = "mouse" | "pen" | "finger";
export const BOOLEAN_DEFAULT: Readonly<Record<Device, Readonly<Record<"click" | "box" | "lasso", SelMode>>>> = {
  mouse: { click: "replace", box: "replace", lasso: "add" },
  pen: { click: "toggle", box: "add", lasso: "add" },
  finger: { click: "toggle", box: "add", lasso: "add" },
};

/** 吸附的底（自由建模 `snap: "off"` 那些工具；周账 F-128，user 10-29「shift是反转吸附同意。不过这样的话触屏版的shift clip的话需要是一开始默认开着吸附，然后toggle反转」）：
 *  鼠标 = 底是关（Blender：naive G 就是屏幕空间，按住 Shift 才吸）；笔 / 手指 = 底跟右上角吸附锁钮（和硬表面同一颗钮，开着就吸），键名芯片锁住 Shift = 反过来。
 *  规律一句话：吸 = 底 XOR Shift，没有第三种状态；硬表面的底一直是锁钮（stance "infer"），不在此列。读它的只有编辑器给工具的 ctx.snapBase()。 */
export const SNAP_BASE: Readonly<Record<Device, "lock" | "off">> = { mouse: "off", pen: "lock", finger: "lock" };

const S = (s: Stance): Stance => s;
/** 硬表面取量工具的公共立场（SketchUp 语义）。 */
const HARD_PICK = { grab: "pick" as const, tap: "place" as const, emptyDrag: "none" as const, snap: "infer" as const, shift: "格点 / 整格 / 15° 反转", center: "none" as const, grammar: "steps" as const, after: "none" as const, charge: true, intent: true };
const RULER = S({ ...HARD_PICK, direction: "drawPlane", ctrl: "—", alt: "—", lock: "axis", intent: false });

/** 硬表面建模（SketchUp 语义；user「sketchup的行为不变」）。 */
const GEOMETRY: Partial<Record<Tool, Stance>> = {
  select: S({ grab: "element", tap: "select", emptyDrag: "box",   /* 框 / 套索 = 选项「空处拖」（tool-config select.drag，v0.16.11） */ direction: "none", snap: "none", shift: "点 = 切换、框 = 加", ctrl: "减选", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false, todo: "再点选区 = 扩缩条" }),
  line: S({ ...HARD_PICK, direction: "drawPlane", ctrl: "—", alt: "—", lock: "axis", intent: true }),
  rect: S({ ...HARD_PICK, direction: "drawPlane", ctrl: "临时从中心", alt: "—", lock: "plane", intent: false }),
  crect: S({ ...HARD_PICK, direction: "drawPlane", ctrl: "临时从角", alt: "—", lock: "plane", intent: false }),
  rrect: S({ ...HARD_PICK, direction: "drawPlane", ctrl: "—", alt: "—", lock: "plane", intent: false }),   // 三击：边 / 角度 / 长度（user 10-26）
  circle: S({ ...HARD_PICK, direction: "drawPlane", ctrl: "—", alt: "—", lock: "plane", intent: false }),
  arc: S({ ...HARD_PICK, direction: "drawPlane", shift: "提示里显示扫过的角度", ctrl: "—", alt: "—", lock: "plane", intent: false }),
  move: S({ grab: "element", tap: "place", emptyDrag: "none", direction: "frame", snap: "infer", shift: "格点反转", ctrl: "复制（Alt / ⌘ 也认 → §3-2 要改）", alt: "（= 复制）", center: "grab", lock: "axis", grammar: "steps", after: "none", charge: true, intent: true, todo: "第一下先悬停找参考点再取（user 10-24）" }),
  rotate: S({ grab: "element", tap: "place", emptyDrag: "none", direction: "frame", snap: "infer", shift: "15° 档反转", ctrl: "复制", alt: "（= 复制）", center: "grab", lock: "plane", grammar: "steps", after: "none", charge: true, intent: true }),   // 三击：圆心 / 参考 / 角度
  scale: S({ grab: "handle", tap: "none", emptyDrag: "none", direction: "frame", snap: "infer", shift: "面心柄 = 等比、锚点仍在对面（UX35）", ctrl: "—", alt: "—", center: "bbox", lock: null, grammar: "direct", after: "keep", charge: false, intent: true }),
  transform: S({ grab: "handle", tap: "none", emptyDrag: "none", direction: "frame", snap: "infer", shift: "格点反转", ctrl: "复制", alt: "（= 复制）", center: "auto", lock: null, grammar: "direct", after: "keep", charge: false, intent: false, todo: "临时变换中心（pick）、xy / yz / xz 面块把手（user 10-26）" }),
  pp: S({ grab: "face", tap: "place", emptyDrag: "none", direction: "normal", snap: "infer", shift: "整格反转", ctrl: "加边（不自愈）", alt: "—", center: "none", lock: null, grammar: "steps", after: "none", charge: false, intent: true }),   // 充能不用：一维投影（user 10-24）
  offset: S({ grab: "face", tap: "place", emptyDrag: "none", direction: "inPlane", snap: "infer", shift: "格点反转", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "steps", after: "none", charge: false, intent: true }),
  followme: S({ grab: "face", tap: "none", emptyDrag: "none", direction: "none", snap: "infer", shift: "—", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
  erase: S({ grab: "scrub", tap: "apply", emptyDrag: "scrub", direction: "none", snap: "none", shift: "硬化（§3-3 要搬到 Ctrl）", ctrl: "软化 + 平滑", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
  weldErase: S({ grab: "scrub", tap: "apply", emptyDrag: "scrub", direction: "none", snap: "none", shift: "动作反过来（拆）", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
  softErase: S({ grab: "scrub", tap: "apply", emptyDrag: "scrub", direction: "none", snap: "none", shift: "动作反过来（硬）", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
  eraseFace: S({ grab: "face", tap: "apply", emptyDrag: "none", direction: "none", snap: "none", shift: "—", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
  tape: S({ ...RULER, todo: "直尺 / 圆规合租小三角（user 10-25）" }),
  protractor: S({ ...RULER, lock: "plane" }),
  compass: S({ ...RULER, lock: "plane" }),
  axes: S({ ...RULER, lock: null, snap: "infer", charge: true }),   // 两模式：三下定帧 / 点一下只换位置（user 10-26）
};

/** 表面工作台（上色）。 */
const SURFACE: Partial<Record<Tool, Stance>> = {
  select: GEOMETRY.select!,
  paint: S({ grab: "face", tap: "apply", emptyDrag: "scrub", direction: "none", snap: "none", shift: "连通体", ctrl: "平滑组", alt: "吸色", center: "none", lock: null, grammar: "direct", after: "keep", charge: false, intent: false }),   // 单 / 双 / 三击 = 一张 / 共面泛洪 / 整个（user 10-24）；有选区 = 直接涂选区
};

/** 自由建模（Blender 语义；user「有机体建模是不能有snap的…naive g就是screen space」）。 */
const FREEFORM_XFORM = { press: "split3" as const, grab: "element" as const, tap: "select" as const, emptyDrag: "box" as const, snap: "off" as const, center: "mean" as const, lock: "axis" as const, grammar: "steps" as const, after: "keepIfHad" as const, charge: false, intent: false };
const FREEFORM: Partial<Record<Tool, Stance>> = {
  select: S({ ...GEOMETRY.select!, alt: "点边 = 环 / 洞" }),
  move: S({ ...FREEFORM_XFORM, direction: "viewPlane", shift: "吸附：反过来（点 > 边 > 面）", ctrl: "—", alt: "—" }),   // 底 = SNAP_BASE：鼠标关、触屏跟锁钮；芯片只印「吸附」
  rotate: S({ ...FREEFORM_XFORM, direction: "viewAxis", shift: "15° 一档：反过来", ctrl: "—", alt: "—" }),
  scale: S({ ...FREEFORM_XFORM, direction: "uniform", shift: "0.1 一档：反过来", ctrl: "—", alt: "—" }),
  shrink: S({ ...FREEFORM_XFORM, direction: "normal", shift: "—", ctrl: "—", alt: "（Alt+S / Alt+W = 这把工具）" }),
  pp: S({ ...FREEFORM_XFORM, grab: "face", direction: "normal", shift: "反过来：面 = 屏幕平面自由拖、边 / 点 = 沿各自垂直方向", ctrl: "—", alt: "—" }),   // 面默认沿法向；边 / 点默认屏幕平面（Blender 手感，user 10-28 晚）
  offset: S({ ...FREEFORM_XFORM, grab: "face", direction: "inPlane", shift: "—", ctrl: "（Ctrl+B / Ctrl+Shift+B 键盘 = 倒角 / 倒点）", alt: "—", lock: null }),   // 面 = 插入、边 = 倒角、点 = 倒点
  knife: S({ grab: "pointOrEdge", tap: "drop", emptyDrag: "none", direction: "inPlane", snap: "infer", shift: "—", ctrl: "（Ctrl+R = 环切）", alt: "—", center: "none", lock: null, grammar: "steps", after: "clear", charge: false, intent: false }),   // 同边两下 = 环切；刀吸点 / 边
  erase: S({ grab: "scrub", tap: "apply", emptyDrag: "scrub", direction: "none", snap: "none", shift: "—", ctrl: "溶解", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
  softErase: S({ grab: "scrub", tap: "apply", emptyDrag: "scrub", direction: "none", snap: "none", shift: "动作反过来（硬 = 手标棱）", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),   // 网格体的软边橡皮（2026-10-29 Opus）
  create: S({ grab: "pick", tap: "place", emptyDrag: "none", direction: "none", snap: "off", shift: "锁 / 放开长宽比（平的形状）· 转朝向时 15° 一档", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "keep", charge: false, intent: false }),   // 新建（FM182）：落点 = 按下那一点打到的点 / 边 / 面 / 地面；点一下 = 马前炮尺寸、拖 = 拖多大、松手出环转朝向（UX57）；做完新的那个留在选区
  // 软编辑笔刷（2026-10-29 Opus 5.5，账本 UX53）：按住刮、不用先选；半径 = 左栏 dial（和软选择共用）；Shift = 临时抹平（Blender 同款）
  brushGrab: S({ grab: "scrub", tap: "none", emptyDrag: "none", direction: "viewPlane", snap: "none", shift: "临时抹平", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
  brushDraw: S({ grab: "scrub", tap: "apply", emptyDrag: "none", direction: "normal", snap: "none", shift: "临时抹平", ctrl: "反过来（压进去）", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
  brushSmooth: S({ grab: "scrub", tap: "apply", emptyDrag: "none", direction: "none", snap: "none", shift: "—", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
  brushFlatten: S({ grab: "scrub", tap: "apply", emptyDrag: "none", direction: "normal", snap: "none", shift: "临时抹平", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),
};

/** 验证工作台（步行 + 摆东西 + 尺规）。 */
const VERIFY: Partial<Record<Tool, Stance>> = {
  walk: S({ grab: "ground", tap: "place", emptyDrag: "none", direction: "none", snap: "none", shift: "—", ctrl: "—", alt: "—", center: "none", lock: null, grammar: "direct", after: "none", charge: false, intent: false }),   // 编辑器这边没有手势（放置归 app 层 locomotion）
  select: GEOMETRY.select!, move: GEOMETRY.move!, rotate: GEOMETRY.rotate!, tape: GEOMETRY.tape!, protractor: GEOMETRY.protractor!, compass: GEOMETRY.compass!, axes: GEOMETRY.axes!,
};

/** 物体工作台（选物体 / 摆放）：和硬表面同一份选择 / 移动 / 旋转 / 缩放的立场。 */
const OBJECT: Partial<Record<Tool, Stance>> = { select: GEOMETRY.select!, move: GEOMETRY.move!, rotate: GEOMETRY.rotate!, scale: GEOMETRY.scale!, transform: GEOMETRY.transform! };

export const STANCE: Readonly<Record<ModeId, Partial<Record<Tool, Stance>>>> = { geometry: GEOMETRY, surface: SURFACE, freeform: FREEFORM, verify: VERIFY, object: OBJECT };

/** 这把工具在这个工作台的立场（没有 = 守卫测试会红；运行时返回 undefined 让调用方自己兜底）。 */
export function stanceOf(mode: ModeId, tool: Tool): Stance | undefined { return STANCE[mode]?.[tool]; }
/** 指针种类 → 设备词（鼠标 / 笔 / 手指）。手指版还没做：有触屏的设备上 touch 指针先按笔的默认。 */
export function deviceOf(pointerType: string): Device { return pointerType === "mouse" ? "mouse" : pointerType === "pen" ? "pen" : "finger"; }
