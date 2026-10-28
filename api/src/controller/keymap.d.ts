import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";
export interface KeyEvt {
    readonly key: string;
    readonly code: string;
    readonly shift: boolean;
    readonly ctrl: boolean;
    readonly alt: boolean;
}
/** 查表要看的现状（app 层每次按键现算；全是只读）。 */
export interface KeyContext {
    readonly mode: ModeId;
    readonly tool: Tool;
    /** 手势进行中（按下没松 / 点了一下在等第二下 / 键盘起手的模态中）。 */
    readonly gesture: boolean;
    readonly hasSelection: boolean;
    /** 步行阶段：off / place（放置中）/ walk（FPS）/ edit（原地编辑）。 */
    readonly walk: "off" | "place" | "walk" | "edit";
    /** locomotion 在步行模式（FPS 或原地编辑）。 */
    readonly walking: boolean;
    readonly mirrorSession: boolean;
    /** 当前工具吃哪种锁（null = 不吃：选择 / 橡皮…）。 */
    readonly lockStyle: "axis" | "plane" | null;
    /** 数值小窗要不要这一下（它有自己的缓冲状态，问它）。 */
    readonly vcbWants: (e: KeyEvt) => boolean;
}
export type Chord = string;
export interface Binding {
    readonly chord: Chord;
    readonly action: string;
    readonly label: string;
    readonly when?: (c: KeyContext, e: KeyEvt) => boolean;
}
export interface Layer {
    readonly id: string;
    readonly bindings: readonly Binding[]; /** 独占：没绑的键也吞掉、不往下传（FPS 里键盘归走路）。 */
    readonly exclusive?: boolean;
}
export interface Resolved {
    readonly action: string;
    readonly label: string;
    readonly layer: string;
    readonly chord: Chord;
}
/** 按键 → 和弦：修饰键按 ctrl+ / alt+ / shift+ 的固定顺序；字母按物理键（code：Mac 上 Alt+字母打出别的字）；别的按 key 小写（space / tab / escape / enter / delete / backspace / arrowright / "."）。 */
export declare function chordOf(e: KeyEvt): Chord;
/** 全局层（最底）。 */
export declare const GLOBAL: Layer;
/** 自由建模工作台层（Blender 键位；user 10-27「能不能blender 快捷键无缝接上」）。 */
export declare const FREEFORM: Layer;
/** 操作工具层（自由建模的移动 / 旋转 / 缩放 / 挤出 / 插入 / 沿法线）：= Blender 帮你自动按了 G，所以 X / Y / Z 永远 = 轴（手势里锁、手势外先锁）。 */
export declare const OP_TOOLS: ReadonlySet<Tool>;
export declare const TOOL_OPS: Layer;
/** 手势中（自由建模）：X / Y / Z 锁轴、Shift = 锁面（Blender 同款）。 */
export declare const GESTURE: Layer;
/** 镜像会话（马前炮）：回车 = 应用（Esc = 取消走全局的 escape → editor.cancel）。 */
export declare const MIRROR: Layer;
/** 数值小窗：它说要就给它（数字开头 / 缓冲非空时的单位字母 / 回车 / 退格）。 */
export declare const VCB: Layer;
/** 步行三阶段。 */
export declare const WALK_EDIT: Layer;
export declare const WALK_PLACE: Layer;
export declare const WALK_FPS: Layer;
/** 现在压着哪几层（从底到顶）。纯函数：没有转移，每次按键现算。 */
export declare function layersOf(c: KeyContext): Layer[];
/** 这一下按键 → 动作（从顶往下第一个绑了的层）；"swallow" = 独占层吞掉了没绑的键；null = 没人要（交给浏览器）。 */
export declare function resolveKey(c: KeyContext, e: KeyEvt): Resolved | "swallow" | null;
/** 披露 / 帮助页用：现在这个和弦从顶往下各层分别是什么（第一条就是生效的）。 */
export declare function explainKey(c: KeyContext, e: KeyEvt): {
    layer: string;
    label: string;
}[];
