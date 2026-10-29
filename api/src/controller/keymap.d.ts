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
    /** 打字要不要这一下（「正在打的字」的唯一主人 controller/typed-input.ts 问：手势中打数 / 刚做完一步的数值小窗，去向它自己定；2026-10-29 周账 F-125 并成一层）。。 */
    readonly typingWants: (e: KeyEvt) => boolean;
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
/** 手势中打数（Blender「S Z 0」= 缩放、锁 Z、打 0、回车；user 10-28 晚「这也是一个新的模式」）：它说要就给它——数字 / 小数点 / 正负号、有数之后的单位字、退格、回车。
 *  X / Y / Z 它不要（单位里没有这三个字母）→ 落到下面的手势层照旧锁轴，打到一半也能锁。读法和单位文本框同一个（units.ts parseQuantity / quantityKey）。 */
export declare const TYPING: Layer;
/** 镜像会话（马前炮）：回车 = 应用（Esc = 取消走全局的 escape → editor.cancel）。 */
export declare const MIRROR: Layer;
/** 数值小窗：它说要就给它（数字开头 / 缓冲非空时的单位字母 / 回车 / 退格）。 */
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
/**
 * 现在压着的层里带这个修饰键的和弦（从顶往下；同一个和弦第一个生效的那条；when 不成立的跳过、让下层的露出来；独占层到此为止）。
 * 读的人 = app 的状态行：按住 Shift / Ctrl / Alt 一小会儿不按别的键 = 露出来。
 */
export declare function modifierChords(c: KeyContext, mod: "shift" | "ctrl" | "alt"): {
    chord: Chord;
    label: string;
    layer: string;
}[];
/** 和弦给人看：shift+z → Shift+Z；ctrl+shift+b → Ctrl+Shift+B；arrowright → →。 */
export declare function chordLabel(ch: Chord): string;
/** 每一层给人看的名字 + 什么时候压上来（层的 id → 一节）。加一层 = 这里一行（守卫：每层都得有）。 */
export declare const LAYER_DOCS: Readonly<Record<string, {
    title: string;
    when: string;
}>>;
export declare const ALL_LAYERS: readonly Layer[];
/**
 * 快捷键表（数据 → 文字；帮助页「快捷键」一节就是它）：每层一节、每条 = 和弦（给人看的写法）+ 做什么。工具键的名字由调用方给（左柱那张表的中文，keymap 不认识中文工具名）。
 * 同一层里同一个和弦只列一次（when 分情况的几条合成一行，用「 / 」连）。"*"（数值小窗吃一切）写成一句话。
 */
export declare function keyDocs(toolLabel: (t: Tool) => string): {
    title: string;
    when: string;
    rows: {
        keys: string;
        does: string;
    }[];
}[];
/** 同一个键再按一下 = 组里换下一把（user 10-25；app 层 toolKey 做轮换，数据住这里，提示也读它）：键 → 组（组内第一个 = 那个键原本切到的工具）。 */
export declare const TOOL_CYCLES: Readonly<Record<Chord, readonly Tool[]>>;
export interface ToolKey {
    readonly chord: Chord;
    readonly how: "pick" | "cycle" | "modal";
    readonly label: string;
}
/**
 * 这个工作台里这把工具的键（和真按下去同一条 resolveKey；手上拿着别的工具、有选区、没在手势里）：
 * pick = 从别的工具按它就拿起这把；cycle = 那个键的组里再按几下轮到它；modal = 键盘起手（Blender G / R / S / E；label = 键表那一条，带变体时用得上）。
 * inMode = 这个工作台有没有这把工具（轮换只在工作台有的工具里转，app toolKey 同规矩）。
 */
export declare function toolKeysOf(mode: ModeId, tool: Tool, inMode?: (t: Tool) => boolean): ToolKey[];
/** 工具提示里的键那一截（「M · G 键盘起手」；没有键 = ""）：pick 直接写键名；没有 pick 才写 cycle「再按 E / X」；modal 写「G 键盘起手」（同义的并成「Alt+S / Alt+W 键盘起手」）、带变体的写那条的名字（「Ctrl+B 倒角」）。 */
export declare function toolKeyText(mode: ModeId, tool: Tool, inMode?: (t: Tool) => boolean): string;
/** 肌肉记忆层面的「意思」：锁轴的几种时机（马上锁 / 先锁下一下 / 手势中锁）算一个意思；「选这把工具」和「键盘起手做这件事」是同一个动词就算一个意思。 */
export declare function meaningOf(action: string): string;
/** 拿来比的几个地方（会来回切的：两个建模工作台 × 拿着选择 / 移动，加验证、表面）。 */
export declare const MUSCLE_CONTEXTS: Readonly<Record<string, Omit<KeyContext, "typingWants">>>;
/** 现在的冲突：和弦 → 意思 → 在哪几个地方（没绑的不算；只有一种意思的不列）。 */
export declare function muscleConflicts(): Map<Chord, Map<string, string[]>>;
/**
 * 已知的冲突（10-28 登记 = 当时的现状；UX15 列过前五个），**等 user 逐条拍**：留着（两个工作台各是各的肌肉记忆）/ 改掉某一边。拍了就改这里和键表。
 * 新冒出来的（不在这里）= 守卫红：先想清楚是不是真要这么绑，要的话登记进来并告诉 user。
 */
export declare const KNOWN_CONFLICTS: Readonly<Record<Chord, string>>;
