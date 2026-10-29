// controller/keymap.ts —— 分层键表 + 上下文栈：「什么时候按 X 是什么意思」（UX 心智模型 §2.7；账本 UX17 / UX18）。created 2026-10-28 by Claude Fable 5.1
// user 10-28「不是说x代表什么，而是说，在什么时候，按x是什么意思」「状态机会组合爆炸吧。然后写条件容易错，行为树可能太复杂了专业也不对口」
// 「X 我的建议是在选择模式下面x才是删除？move模式相当于blender帮你自动按G，所以这个时候x永远路由到轴」。
//
// 做法（Blender 键表分层 / Emacs minor-mode 键表那派，不是状态机、不是 when 条件表）：
//   · 每一层 = 一张小表「和弦 → 动作」；层有：全局、工作台（自由建模）、工具（操作工具：移动 / 旋转 / 缩放 / 挤出 / 插入 / 沿法线）、手势中、镜像会话、数值小窗、步行三阶段。
//   · 每次按键从编辑器现状**算出**压着哪几层（layersOf，纯函数，没有转移），从顶往下找第一个绑了这个和弦的层（resolve）。
//   · 层是加法不是乘法；「什么时候」= 现在栈里有什么。层内偶尔用 when 谓词（有没有选区 / 在不在走路），尽量少。
//   · 这个文件零 DOM、零编辑器 import（只认和弦和一个只读上下文）；动作是字符串 id，app 层（main.ts）按 id 做事。守卫 test/keymap.test.ts。
// 这一版 = v0.15.46 的 keydown 那串 if 抄成层（行为照旧），只改了 user 拍的 X（UX17）：操作工具里 X / Y / Z 永远 = 轴，选择工具里 X = 删除；
// 另一处有意的清理：按着 Shift 的字母键不再误触工具键（以前 Shift+L 也会切到画线）。
import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";

export interface KeyEvt { readonly key: string; readonly code: string; readonly shift: boolean; readonly ctrl: boolean; readonly alt: boolean }
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
  /** 手势中打数要不要这一下（编辑器问：手势进行中、工具收数、键 = 回车 / 退格 / 这个量写得出来的字；Blender「S Z 0」，2026-10-28 晚）。没给 = 不要。 */
  readonly typingWants?: (e: KeyEvt) => boolean;
}
export type Chord = string;
export interface Binding { readonly chord: Chord; readonly action: string; readonly label: string; readonly when?: (c: KeyContext, e: KeyEvt) => boolean }
export interface Layer { readonly id: string; readonly bindings: readonly Binding[]; /** 独占：没绑的键也吞掉、不往下传（FPS 里键盘归走路）。 */ readonly exclusive?: boolean }
export interface Resolved { readonly action: string; readonly label: string; readonly layer: string; readonly chord: Chord }

/** 按键 → 和弦：修饰键按 ctrl+ / alt+ / shift+ 的固定顺序；字母按物理键（code：Mac 上 Alt+字母打出别的字）；别的按 key 小写（space / tab / escape / enter / delete / backspace / arrowright / "."）。 */
export function chordOf(e: KeyEvt): Chord {
  let name: string;
  if (e.code.startsWith("Key")) name = e.code.slice(3).toLowerCase();
  else if (e.code.startsWith("Digit")) name = e.code.slice(5);
  else name = e.key === " " ? "space" : e.key.toLowerCase();
  return (e.ctrl ? "ctrl+" : "") + (e.alt ? "alt+" : "") + (e.shift ? "shift+" : "") + name;
}

const B = (chord: Chord, action: string, label: string, when?: Binding["when"]): Binding => (when ? { chord, action, label, when } : { chord, action, label });
const notWalking = (c: KeyContext): boolean => !c.walking;

/** 工具键（SketchUp 对齐，user 2026-09-02「默认对齐 SU」）：同一个键再按一下 = 组里换下一把（app 层做轮换）。步行时空格 / E / S / Q / A / T 归走路。 */
const TOOL_KEYS: readonly [Chord, Tool][] = [["space", "select"], ["l", "line"], ["r", "rect"], ["c", "circle"], ["a", "arc"], ["m", "move"], ["q", "rotate"], ["s", "scale"], ["p", "pp"], ["k", "knife"], ["f", "offset"], ["w", "followme"], ["b", "paint"], ["e", "erase"], ["t", "tape"], ["tab", "select"], ["x", "erase"]];
const TAKEN_BY_WALK = new Set<Chord>(["space", "e", "s", "q", "a", "t"]);

/** 全局层（最底）。 */
export const GLOBAL: Layer = {
  id: "global",
  bindings: [
    ...TOOL_KEYS.map(([k, t]) => B(k, `tool.key:${k}:${t}`, `工具：${t}`, (c) => !(c.walking && TAKEN_BY_WALK.has(k)))),
    B("g", "component.make", "建组件"),
    B("h", "hide", "隐藏选中", notWalking),
    B("shift+z", "view.zoomExtents", "缩放到全部"),
    B(".", "view.zoomTo", "缩放到选区"),
    B("shift+tab", "grid.toggle", "格点吸附开 / 关"),
    B("ctrl+a", "select.all", "全选"), B("ctrl+i", "select.invert", "反选"), B("alt+a", "select.none", "全不选"),
    B("ctrl+x", "edit.cut", "剪切", (c) => c.hasSelection), B("ctrl+c", "edit.copy", "拷贝", (c) => c.hasSelection), B("ctrl+v", "edit.paste", "粘贴（原位）"),
    B("alt+h", "show.all", "全部显示"), B("alt+z", "view.xray", "X 光"),
    B("ctrl+g", "group.make", "建组"), B("ctrl+j", "objects.join", "合并物体（Blender Ctrl+J）", (c) => c.hasSelection), B("ctrl+shift+g", "group.explode", "炸开"),
    B("ctrl+z", "undo", "撤销"), B("ctrl+shift+z", "redo", "重做"), B("ctrl+y", "redo", "重做"),
    B("delete", "delete", "删除", (c) => c.hasSelection), B("backspace", "delete", "删除", (c) => c.hasSelection),
    B("escape", "escape", "取消 / 退一层"),
    // 方向键锁（A9，SketchUp 同款）：→ X / ← Y / ↑ Z / ↓ 解；Shift+方向键 = 面锁
    B("arrowright", "lock.key:x", "锁 X", notWalking), B("arrowleft", "lock.key:y", "锁 Y", notWalking), B("arrowup", "lock.key:z", "锁 Z", notWalking), B("arrowdown", "lock.key:none", "解锁", notWalking),
    B("shift+arrowright", "lock.key:x:plane", "面锁 YZ", notWalking), B("shift+arrowleft", "lock.key:y:plane", "面锁 XZ", notWalking), B("shift+arrowup", "lock.key:z:plane", "面锁 XY", notWalking), B("shift+arrowdown", "lock.key:none:plane", "面锁：光标下的面", notWalking),
  ],
};

/** 自由建模工作台层（Blender 键位；user 10-27「能不能blender 快捷键无缝接上」）。 */
export const FREEFORM: Layer = {
  id: "workbench:freeform",
  bindings: [
    B("g", "modal:move", "移动（键盘起手）"), B("r", "modal:rotate", "旋转（键盘起手）"), B("s", "modal:scale", "缩放（键盘起手）"), B("e", "modal:pp", "挤出（键盘起手）"), B("i", "modal:offset", "插入（键盘起手）"),
    B("a", "select.all", "全选"), B("j", "mesh.connect", "连线"),
    B("shift+a", "tool.key:shift+a:create", "拉出"), B("shift+d", "mesh.duplicateMove", "复制并接着挪（Blender Shift+D）", (c) => !c.gesture && c.hasSelection),
    B("o", "soft.toggle", "软选择 开 / 关"), B("[", "soft.smaller", "软半径 小一点"), B("]", "soft.bigger", "软半径 大一点"),   // Blender O；[ ] = WeebPaint 调笔刷粗细同款（user 10-28 夜「weebpaint的slider」）   // Blender 的「添加」= 这里的新建工具（user 10-28 晚「Shift+A 同意」）
    B("x", "delete.ifAny", "删除"),   // 选择工具里 X = 删除（操作工具层在上面把 X 接走 = 轴，UX17）
    B("y", "lock.arm:y", "先锁 Y", (c) => !c.gesture), B("z", "lock.arm:z", "先锁 Z", (c) => !c.gesture),
    B("shift+y", "lock.arm:y:plane", "先锁面 XZ", (c) => !c.gesture), B("shift+z", "lock.arm:z:plane", "先锁面 XY", (c) => !c.gesture),
    B("alt+s", "modal:shrink", "沿法线（键盘起手）"), B("alt+w", "modal:shrink", "沿法线（键盘起手）"),
    B("ctrl+r", "mesh.loopCutArm", "环切（下一下点边）"), B("ctrl+b", "modal:offset:bevel", "倒角（键盘起手）"), B("ctrl+shift+b", "modal:offset:bevelVerts", "倒角（点）（键盘起手）"),
    // 拿着不吃锁的工具（选择）按方向键 = 先锁好、下一下生效；吃锁的工具落到全局层的 lockKey
    ...(["arrowright", "arrowleft", "arrowup"] as const).map((k, i) => B(k, `lock.arm:${"xyz"[i]}`, `先锁 ${"XYZ"[i]}`, (c) => !c.gesture && !c.lockStyle)),
    ...(["arrowright", "arrowleft", "arrowup"] as const).map((k, i) => B(`shift+${k}`, `lock.arm:${"xyz"[i]}:plane`, `先锁面`, (c) => !c.gesture && !c.lockStyle)),
  ],
};

/** 操作工具层（自由建模的移动 / 旋转 / 缩放 / 挤出 / 插入 / 沿法线）：= Blender 帮你自动按了 G，所以 X / Y / Z 永远 = 轴（手势里锁、手势外先锁）。 */
export const OP_TOOLS: ReadonlySet<Tool> = new Set<Tool>(["move", "rotate", "scale", "pp", "offset", "shrink"]);
export const TOOL_OPS: Layer = {
  id: "tool:ops",
  bindings: [
    B("x", "lock.axis:x", "锁 X"), B("y", "lock.axis:y", "锁 Y"), B("z", "lock.axis:z", "锁 Z"),
    B("shift+x", "lock.axis:x:plane", "面锁 YZ"), B("shift+y", "lock.axis:y:plane", "面锁 XZ"), B("shift+z", "lock.axis:z:plane", "面锁 XY"),
  ],
};

/** 手势中（自由建模）：X / Y / Z 锁轴、Shift = 锁面（Blender 同款）。 */
export const GESTURE: Layer = {
  id: "gesture",
  bindings: [
    B("x", "lock.key:x", "锁 X"), B("y", "lock.key:y", "锁 Y"), B("z", "lock.key:z", "锁 Z"),
    B("shift+x", "lock.key:x:plane", "面锁 YZ"), B("shift+y", "lock.key:y:plane", "面锁 XZ"), B("shift+z", "lock.key:z:plane", "面锁 XY"),
    B("g", "move.slideToggle", "这一次沿边滑（Blender G G）", (c) => c.tool === "move"),
  ],
};
/** 手势中打数（Blender「S Z 0」= 缩放、锁 Z、打 0、回车；user 10-28 晚「这也是一个新的模式」）：它说要就给它——数字 / 小数点 / 正负号、有数之后的单位字、退格、回车。
 *  X / Y / Z 它不要（单位里没有这三个字母）→ 落到下面的手势层照旧锁轴，打到一半也能锁。读法和单位文本框同一个（units.ts parseQuantity / quantityKey）。 */
export const TYPING: Layer = { id: "gesture:typing", bindings: [B("*", "gesture.type", "打数（手势中）", (c, e) => !!c.typingWants?.(e))] };
/** 镜像会话（马前炮）：回车 = 应用（Esc = 取消走全局的 escape → editor.cancel）。 */
export const MIRROR: Layer = { id: "mirror-session", bindings: [B("enter", "mirror.apply", "应用镜像")] };
/** 数值小窗：它说要就给它（数字开头 / 缓冲非空时的单位字母 / 回车 / 退格）。 */
export const VCB: Layer = { id: "vcb", bindings: [B("*", "vcb.feed", "数值小窗", (c, e) => c.vcbWants(e))] };
/** 步行三阶段。 */
export const WALK_EDIT: Layer = { id: "walk:edit", bindings: [B("escape", "walk.exit", "离开步行", (c) => !c.gesture && !c.hasSelection)] };
export const WALK_PLACE: Layer = { id: "walk:place", bindings: [B("escape", "walk.cancelPlace", "取消放置")] };
export const WALK_FPS: Layer = { id: "walk:fps", exclusive: true, bindings: [B("tab", "walk.editInPlace", "原地编辑"), B("escape", "walk.exit", "离开步行")] };

/** 现在压着哪几层（从底到顶）。纯函数：没有转移，每次按键现算。 */
export function layersOf(c: KeyContext): Layer[] {
  const out: Layer[] = [GLOBAL];
  const freeform = c.mode === "freeform" && !c.walking;
  if (freeform) out.push(FREEFORM);
  if (freeform && OP_TOOLS.has(c.tool)) out.push(TOOL_OPS);
  if (freeform && c.gesture) out.push(GESTURE);
  if (c.gesture) out.push(TYPING);
  if (c.mirrorSession) out.push(MIRROR);
  out.push(VCB);
  if (c.walk === "edit") out.push(WALK_EDIT);
  if (c.walk === "place") out.push(WALK_PLACE);
  if (c.walk === "walk") out.push(WALK_FPS);
  return out;
}

/** 这一下按键 → 动作（从顶往下第一个绑了的层）；"swallow" = 独占层吞掉了没绑的键；null = 没人要（交给浏览器）。 */
export function resolveKey(c: KeyContext, e: KeyEvt): Resolved | "swallow" | null {
  const chord = chordOf(e), stack = layersOf(c);
  for (let i = stack.length - 1; i >= 0; i--) {
    const L = stack[i];
    for (const b of L.bindings) if ((b.chord === chord || b.chord === "*") && (!b.when || b.when(c, e))) return { action: b.action, label: b.label, layer: L.id, chord };
    if (L.exclusive) return "swallow";
  }
  return null;
}

/** 披露 / 帮助页用：现在这个和弦从顶往下各层分别是什么（第一条就是生效的）。 */
export function explainKey(c: KeyContext, e: KeyEvt): { layer: string; label: string }[] {
  const chord = chordOf(e), out: { layer: string; label: string }[] = [];
  for (const L of [...layersOf(c)].reverse()) for (const b of L.bindings) if ((b.chord === chord || b.chord === "*") && (!b.when || b.when(c, e))) out.push({ layer: L.id, label: b.label });
  return out;
}

// ---------- 披露：按住一个修饰键时这一层有什么（接线清单第 5 条；2026-10-28 Claude Opus 5.5）----------
/** 和弦 → 一下假的按键（判 when 用）：字母 / 数字按物理键还原。 */
const evtOfChord = (ch: Chord): KeyEvt => {
  const parts = ch.split("+"), name = parts[parts.length - 1];
  const code = /^[a-z]$/.test(name) ? `Key${name.toUpperCase()}` : /^[0-9]$/.test(name) ? `Digit${name}` : name;
  return { key: name === "space" ? " " : name, code, shift: parts.includes("shift"), ctrl: parts.includes("ctrl"), alt: parts.includes("alt") };
};
/**
 * 现在压着的层里带这个修饰键的和弦（从顶往下；同一个和弦第一个生效的那条；when 不成立的跳过、让下层的露出来；独占层到此为止）。
 * 读的人 = app 的状态行：按住 Shift / Ctrl / Alt 一小会儿不按别的键 = 露出来。
 */
export function modifierChords(c: KeyContext, mod: "shift" | "ctrl" | "alt"): { chord: Chord; label: string; layer: string }[] {
  const seen = new Set<Chord>(), out: { chord: Chord; label: string; layer: string }[] = [];
  for (const L of [...layersOf(c)].reverse()) {
    for (const b of L.bindings) {
      if (b.chord === "*" || seen.has(b.chord) || !b.chord.split("+").slice(0, -1).includes(mod)) continue;
      if (b.when && !b.when(c, evtOfChord(b.chord))) continue;
      seen.add(b.chord); out.push({ chord: b.chord, label: b.label, layer: L.id });
    }
    if (L.exclusive) break;
  }
  return out;
}
/** 和弦给人看：shift+z → Shift+Z；ctrl+shift+b → Ctrl+Shift+B；arrowright → →。 */
export function chordLabel(ch: Chord): string {
  const ARROWS: Record<string, string> = { arrowleft: "←", arrowright: "→", arrowup: "↑", arrowdown: "↓" };
  return ch.split("+").map((p) => ARROWS[p] ?? (p.length === 1 ? p.toUpperCase() : p === "ctrl" ? "Ctrl" : p === "alt" ? "Alt" : p === "shift" ? "Shift" : p[0].toUpperCase() + p.slice(1))).join("+");
}

// ---------- 快捷键表（帮助页从这里生成，不手抄；账本 UX40 / 接线清单第 11 条，user 10-28「快捷键用数据生成，然后使用手册到时候得好好写归，和快捷键分开来是两个东西宣发纪元」）----------
/** 每一层给人看的名字 + 什么时候压上来（层的 id → 一节）。加一层 = 这里一行（守卫：每层都得有）。 */
export const LAYER_DOCS: Readonly<Record<string, { title: string; when: string }>> = {
  global: { title: "到处都在", when: "" },
  "workbench:freeform": { title: "自由建模", when: "在网格体里" },
  "tool:ops": { title: "自由建模 · 拿着操作工具", when: "移动 / 旋转 / 缩放 / 挤出 / 插入 / 沿法线" },
  gesture: { title: "自由建模 · 手势进行中", when: "按下了还没落定" },
  "gesture:typing": { title: "手势中打数", when: "移动 / 旋转 / 缩放 / 挤出 / 插入 / 沿法线进行中直接打（S Z 0 = 沿 Z 压平）；回车 / 点一下 = 定，退格改，Esc 取消" },
  "mirror-session": { title: "镜像会话", when: "硬表面「镜像…」把手出来时" },
  vcb: { title: "数值小窗", when: "刚做完一步、右下角小窗亮着时打数字" },
  "walk:edit": { title: "步行 · 原地编辑", when: "" },
  "walk:place": { title: "步行 · 放置", when: "点地面落人之前" },
  "walk:fps": { title: "步行", when: "键盘归走路：WASD 走、空格跳，别的只认下面这几个" },
};
export const ALL_LAYERS: readonly Layer[] = [GLOBAL, FREEFORM, TOOL_OPS, GESTURE, TYPING, MIRROR, VCB, WALK_EDIT, WALK_PLACE, WALK_FPS];
/**
 * 快捷键表（数据 → 文字；帮助页「快捷键」一节就是它）：每层一节、每条 = 和弦（给人看的写法）+ 做什么。工具键的名字由调用方给（左柱那张表的中文，keymap 不认识中文工具名）。
 * 同一层里同一个和弦只列一次（when 分情况的几条合成一行，用「 / 」连）。"*"（数值小窗吃一切）写成一句话。
 */
export function keyDocs(toolLabel: (t: Tool) => string): { title: string; when: string; rows: { keys: string; does: string }[] }[] {
  return ALL_LAYERS.map((L) => {
    const doc = LAYER_DOCS[L.id] ?? { title: L.id, when: "" }, by = new Map<Chord, string[]>();
    for (const b of L.bindings) {
      const m = /^tool\.key:[^:]+:(.+)$/.exec(b.action), label = m ? toolLabel(m[1] as Tool) : b.label;
      const list = by.get(b.chord) ?? by.set(b.chord, []).get(b.chord)!;
      if (!list.includes(label)) list.push(label);
    }
    return { title: doc.title, when: doc.when, rows: [...by].map(([ch, labels]) => ({ keys: ch === "*" ? "数字 / 运算符" : chordLabel(ch), does: labels.join(" / ") })) };
  });
}

// ---------- 工具的键（工具提示 / 小三角 / 手腕面板从这里生成，不手抄；2026-10-28 晚 Claude Opus 5.5）----------
// user 10-28 晚「tooltip你没有更新，这背后有什么架构问题和可以设计瑞士奶酪的修」：以前左柱按钮的提示读 main.ts 工具表里手写的键名（第二份拷贝，而且不分工作台：
// 自由建模「删除（E）」，可那里 E = 挤出键盘起手）。键表 v0.16.3 立的时候、帮助页 v0.16.17 改生成的时候都没把它收进来。现在提示 = 这里按真按键（resolveKey）现算。
/** 同一个键再按一下 = 组里换下一把（user 10-25；app 层 toolKey 做轮换，数据住这里，提示也读它）：键 → 组（组内第一个 = 那个键原本切到的工具）。 */
export const TOOL_CYCLES: Readonly<Record<Chord, readonly Tool[]>> = { e: ["erase", "weldErase", "softErase"], x: ["erase", "weldErase", "softErase"], r: ["rect", "crect", "rrect"], t: ["tape", "protractor", "axes"] };
export interface ToolKey { readonly chord: Chord; readonly how: "pick" | "cycle" | "modal"; readonly label: string }
/**
 * 这个工作台里这把工具的键（和真按下去同一条 resolveKey；手上拿着别的工具、有选区、没在手势里）：
 * pick = 从别的工具按它就拿起这把；cycle = 那个键的组里再按几下轮到它；modal = 键盘起手（Blender G / R / S / E；label = 键表那一条，带变体时用得上）。
 * inMode = 这个工作台有没有这把工具（轮换只在工作台有的工具里转，app toolKey 同规矩）。
 */
export function toolKeysOf(mode: ModeId, tool: Tool, inMode: (t: Tool) => boolean = () => true): ToolKey[] {
  const from: Tool = tool === "select" ? "line" : "select";
  const c: KeyContext = { mode, tool: from, gesture: false, hasSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null, vcbWants: () => false };
  const chords: Chord[] = [];
  for (const L of ALL_LAYERS) for (const b of L.bindings) if (b.chord !== "*" && !chords.includes(b.chord)) chords.push(b.chord);
  const out: ToolKey[] = [];
  for (const ch of chords) {
    const r = resolveKey(c, evtOfChord(ch));
    if (!r || r === "swallow") continue;
    const pick = /^tool\.key:([^:]+):(.+)$/.exec(r.action), modal = /^modal:([a-zA-Z]+)(:.+)?$/.exec(r.action);
    if (pick) {
      const cyc = (TOOL_CYCLES[pick[1]] ?? []).filter(inMode);
      if (pick[2] === tool) out.push({ chord: ch, how: "pick", label: r.label });
      else if (cyc.includes(tool) && cyc.includes(pick[2] as Tool)) out.push({ chord: ch, how: "cycle", label: r.label });
    } else if (modal && modal[1] === tool) out.push({ chord: ch, how: "modal", label: modal[2] ? r.label : "" });
  }
  return out;
}
/** 工具提示里的键那一截（「M · G 键盘起手」；没有键 = ""）：pick 直接写键名；没有 pick 才写 cycle「再按 E / X」；modal 写「G 键盘起手」（同义的并成「Alt+S / Alt+W 键盘起手」）、带变体的写那条的名字（「Ctrl+B 倒角」）。 */
export function toolKeyText(mode: ModeId, tool: Tool, inMode?: (t: Tool) => boolean): string {
  const ks = toolKeysOf(mode, tool, inMode);
  const pick = ks.filter((k) => k.how === "pick").map((k) => chordLabel(k.chord));
  const cyc = ks.filter((k) => k.how === "cycle").map((k) => chordLabel(k.chord));
  const plain = ks.filter((k) => k.how === "modal" && !k.label).map((k) => chordLabel(k.chord));
  const variants = ks.filter((k) => k.how === "modal" && k.label).map((k) => `${chordLabel(k.chord)} ${k.label.replace(/（键盘起手）$/, "")}`);
  return [...pick, ...(!pick.length && cyc.length ? [`再按 ${cyc.join(" / ")}`] : []), ...(plain.length ? [`${plain.join(" / ")} 键盘起手`] : []), ...variants].join(" · ");
}

// ---------- 肌肉记忆冲突（账本 UX15，user 10-28「其实玩游戏最怕的就是两个魂系游戏，一个的x是紧急躲避，一个的x是喝药」）----------
// 原则：同一个键在会来回切的几个地方意思不许不同；没有孟婆汤，就让冲突看得见、逐条拍。守卫 test/keymap.test.ts：新冒出来的冲突 = 红；下面登记的 = 已知、等 user 拍。
/** 肌肉记忆层面的「意思」：锁轴的几种时机（马上锁 / 先锁下一下 / 手势中锁）算一个意思；「选这把工具」和「键盘起手做这件事」是同一个动词就算一个意思。 */
export function meaningOf(action: string): string {
  const lock = /^lock\.(?:arm|key|axis):([xyz])(:plane)?$/.exec(action);
  if (lock) return `锁 ${lock[1].toUpperCase()}${lock[2] ? " 面" : ""}`;
  const tool = /^tool\.key:[^:]+:(.+)$/.exec(action), modal = /^modal:([a-z]+)/.exec(action);
  const verb = tool?.[1] ?? modal?.[1];
  return verb ? `动词 ${verb}` : action;
}
/** 拿来比的几个地方（会来回切的：两个建模工作台 × 拿着选择 / 移动，加验证、表面）。 */
export const MUSCLE_CONTEXTS: Readonly<Record<string, Omit<KeyContext, "vcbWants">>> = {
  "硬表面·选择": { mode: "geometry", tool: "select", gesture: false, hasSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null },
  "硬表面·移动": { mode: "geometry", tool: "move", gesture: false, hasSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: "axis" },
  "自由建模·选择": { mode: "freeform", tool: "select", gesture: false, hasSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null },
  "自由建模·移动": { mode: "freeform", tool: "move", gesture: false, hasSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: "axis" },
  "验证·选择": { mode: "verify", tool: "select", gesture: false, hasSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null },
  "表面·选择": { mode: "surface", tool: "select", gesture: false, hasSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null },
};
/** 现在的冲突：和弦 → 意思 → 在哪几个地方（没绑的不算；只有一种意思的不列）。 */
export function muscleConflicts(): Map<Chord, Map<string, string[]>> {
  const out = new Map<Chord, Map<string, string[]>>(), chords = new Set<Chord>();
  for (const L of ALL_LAYERS) for (const b of L.bindings) if (b.chord !== "*") chords.add(b.chord);
  for (const ch of [...chords].sort()) {
    const by = new Map<string, string[]>();
    for (const [where, c0] of Object.entries(MUSCLE_CONTEXTS)) {
      const r = resolveKey({ ...c0, vcbWants: () => false }, evtOfChord(ch));
      if (r === null || r === "swallow") continue;
      const m = meaningOf(r.action); (by.get(m) ?? by.set(m, []).get(m)!).push(where);
    }
    if (by.size > 1) out.set(ch, by);
  }
  return out;
}
/**
 * 已知的冲突（10-28 登记 = 当时的现状；UX15 列过前五个），**等 user 逐条拍**：留着（两个工作台各是各的肌肉记忆）/ 改掉某一边。拍了就改这里和键表。
 * 新冒出来的（不在这里）= 守卫红：先想清楚是不是真要这么绑，要的话登记进来并告诉 user。
 */
export const KNOWN_CONFLICTS: Readonly<Record<Chord, string>> = {
  a: "硬表面 = 弧 · 自由建模 = 全选（Blender）",
  e: "硬表面 = 橡皮 · 自由建模 = 挤出（Blender）",
  g: "硬表面 = 建组件（SketchUp）· 自由建模 = 抓起来移动（Blender）",
  r: "硬表面 = 矩形 · 自由建模 = 旋转（Blender）",
  x: "硬表面 = 橡皮（轮换）· 自由建模选择 = 删除 · 自由建模操作工具 = 锁 X（UX17 user 拍的）",
  "shift+z": "硬表面 = 缩放到全部 · 自由建模 = 锁面 XY（Blender）",
};

