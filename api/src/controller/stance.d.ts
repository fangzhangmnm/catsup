import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";
import type { SelMode } from "../editor/tools.ts";
/** 没选区时按下作用在谁上（= 捕捉优先级；半径见 solver.ts HIT_PX / MESH_VERT_HIT_PX）。 */
export type Grab = "element" | "face" | "pointOrEdge" | "pick" | "scrub" | "handle" | "ground" | "none";
/** 点一下（没拖）是什么。 */
export type Tap = "select" | "place" | "drop" | "apply" | "none";
/** 没选区又按在空处拖是什么。 */
export type EmptyDrag = "box" | "lasso" | "scrub" | "none";
/** 默认沿什么动 / 沿什么量。 */
export type Direction = "frame" | "normal" | "perp" | "inPlane" | "viewPlane" | "viewAxis" | "uniform" | "drawPlane" | "none";
/** 吸附立场（user 10-28「cad的理科生脑子是复杂吸附，自由建模摸形体…是viewport no snapping」）。 */
export type SnapStance = "infer" | "off" | "none";
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
export declare const BOOLEAN_DEFAULT: Readonly<Record<Device, Readonly<Record<"click" | "box" | "lasso", SelMode>>>>;
/** 吸附的底（自由建模 `snap: "off"` 那些工具；周账 F-128，user 10-29「shift是反转吸附同意。不过这样的话触屏版的shift clip的话需要是一开始默认开着吸附，然后toggle反转」）：
 *  鼠标 = 底是关（Blender：naive G 就是屏幕空间，按住 Shift 才吸）；笔 / 手指 = 底跟右上角吸附锁钮（和硬表面同一颗钮，开着就吸），键名芯片锁住 Shift = 反过来。
 *  规律一句话：吸 = 底 XOR Shift，没有第三种状态；硬表面的底一直是锁钮（stance "infer"），不在此列。读它的只有编辑器给工具的 ctx.snapBase()。 */
export declare const SNAP_BASE: Readonly<Record<Device, "lock" | "off">>;
export declare const STANCE: Readonly<Record<ModeId, Partial<Record<Tool, Stance>>>>;
/** 这把工具在这个工作台的立场（没有 = 守卫测试会红；运行时返回 undefined 让调用方自己兜底）。 */
export declare function stanceOf(mode: ModeId, tool: Tool): Stance | undefined;
/** 指针种类 → 设备词（鼠标 / 笔 / 手指）。手指版还没做：有触屏的设备上 touch 指针先按笔的默认。 */
export declare function deviceOf(pointerType: string): Device;
