// controller/keymap.ts —— 分层键表 + 上下文栈：「什么时候按 X 是什么意思」（UX 心智模型 §2.7；账本 UX17 / UX18）。created 2026-10-28 by Claude Fable 5.1
// user 10-28「不是说x代表什么，而是说，在什么时候，按x是什么意思」「状态机会组合爆炸吧。然后写条件容易错，行为树可能太复杂了专业也不对口」
// 「X 我的建议是在选择模式下面x才是删除？move模式相当于blender帮你自动按G，所以这个时候x永远路由到轴」。
//
// 做法（Blender 键表分层 / Emacs minor-mode 键表那派，不是状态机、不是 when 条件表）：
//   · 每一层 = 一张小表「和弦 → 动作」；层有：全局、工作台（自由建模）、手势中、镜像会话、数值小窗、步行三阶段。（「操作工具层」2026-11-13 拿掉：轴键只在动作里管用，锁的一轮第二步。）
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
  /** 有任何选中（含参考几何）：删除 / Esc 看这个。 */
  readonly anySelection: boolean;
  /** 有工具能动的选中（点 / 边 / 面 / 组 / 组件）：剪切 / 拷贝 / 合并 / 复制并挪看这个（只选着参考线时这几个键不响）。 */
  readonly actableSelection: boolean;
  /** 步行阶段：off / place（放置中）/ walk（FPS）/ edit（原地编辑）。 */
  readonly walk: "off" | "place" | "walk" | "edit";
  /** locomotion 在步行模式（FPS 或原地编辑）。 */
  readonly walking: boolean;
  readonly mirrorSession: boolean;
  /** 当前工具吃哪种锁（null = 不吃：选择 / 橡皮…）。 */
  readonly lockStyle: "axis" | "plane" | null;
  /** 打字要不要这一下（「正在打的字」的唯一主人 controller/typed-input.ts 问：手势中打数 / 刚做完一步的数值小窗，去向它自己定；2026-10-29 周账 F-125 并成一层）。。 */
  readonly typingWants: (e: KeyEvt) => boolean;
  /** 正在打字（缓冲里有字）：自由建模的 1 / 2 / 3 只在没在打的时候归拾取。缺 = 没在打。 */
  readonly typing?: boolean;
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
const TOOL_KEYS: readonly [Chord, Tool][] = [["space", "select"], ["r", "rect"], ["c", "circle"], ["a", "arc"], ["m", "move"], ["q", "rotate"], ["s", "scale"], ["p", "pp"], ["f", "offset"], ["w", "followme"], ["b", "paint"], ["e", "erase"], ["t", "tape"], ["tab", "select"]];   // X 不再是橡皮的第二个键（锁的一轮第三步：X 让给轴键 / 动作外的删除小菜单；橡皮只剩 E，统筹 11-13）
const TAKEN_BY_WALK = new Set<Chord>(["space", "e", "s", "q", "a", "t"]);

/** 全局层（最底）。 */
export const GLOBAL: Layer = {
  id: "global",
  bindings: [
    // 硬表面 E = 推拉（统筹 11-13 并进锁的一轮第三步：X 让给轴键之后两个键一次拿干净，橡皮不占键、在工具栏「橡皮格」里拿 / 换三种）。只在硬表面：
    // 排在通用工具键前面（同一层先匹配先赢，同 K 的写法）；自由建模的 E（挤出起手）在上面一层、画画 / 验证 / 表面走下面通用那条，都不受影响。P 这一步还留着当推拉。
    B("e", "tool.key:e:pp", "工具：pp（硬表面里 E = 推拉；橡皮在工具栏上拿）", (c) => c.mode === "geometry" && !c.walking),
    ...TOOL_KEYS.map(([k, t]) => B(k, `tool.key:${k}:${t}`, `工具：${t}`, (c) => !(c.walking && TAKEN_BY_WALK.has(k)))),
    // K：自由建模 = 切割；硬表面 = 画线（画线本来就能切开面；user 10-29「brep里面K也是线，先这样弄一下，之后可以好好理」）
    B("k", "tool.key:k:line", "工具：line（硬表面里 K 也是画线）", (c) => c.mode === "geometry"), B("k", "tool.key:k:knife", "工具：knife"),
    B("g", "component.make", "建组件"),
    B("h", "hide", "隐藏选中", notWalking),
    B("shift+z", "view.zoomExtents", "缩放到全部"),
    B(".", "view.zoomTo", "缩放到选区"),
    B("shift+tab", "grid.toggle", "格点吸附开 / 关"),
    B("\\", "ui.hideWindows", "藏起 / 叫回所有窗（手指 = 四指轻点）"),   // user 10-30「一键藏起所有窗，像 Procreate 四指轻点全屏。 现在就可以做」
    // L / Shift+L = 选连着的一块 / 拿掉（Blender；user 11-13 批：两个建模工作台都是，硬表面画线只剩 K）；手势进行中、步行、画画里不响应
    B("l", "select.linked", "选连着的一块（光标下打中的那一块加进选区；Blender L）", (c) => (c.mode === "geometry" || c.mode === "freeform") && !c.gesture && !c.walking),
    B("shift+l", "select.linked:remove", "从选区拿掉光标下连着的那一块（Blender Shift+L）", (c) => (c.mode === "geometry" || c.mode === "freeform") && !c.gesture && !c.walking),
    B("ctrl+a", "select.all", "全选"), B("ctrl+i", "select.invert", "反选"), B("alt+a", "select.none", "全不选"),
    B("ctrl+x", "edit.cut", "剪切", (c) => c.actableSelection), B("ctrl+c", "edit.copy", "拷贝", (c) => c.actableSelection), B("ctrl+v", "edit.paste", "粘贴（原位）"),
    B("ctrl+s", "doc.save", "保存"), B("ctrl+o", "doc.open", "打开本地文件…"),   // 以前直接写在 main.ts 的文档级 keydown 里、不在键表（帮助页不列、冲突守卫看不见；user 10-30「ctrl o ctrl s 修」）
    B("alt+h", "show.all", "全部显示"), B("alt+z", "view.xray", "X 光"),
    B("ctrl+g", "group.make", "建组"), B("ctrl+j", "objects.join", "把选中的合并进光标下那个（Blender Ctrl+J）", (c) => c.actableSelection), B("ctrl+shift+g", "group.explode", "炸开"),
    B("ctrl+z", "undo", "撤销"), B("ctrl+shift+z", "redo", "重做"), B("ctrl+y", "redo", "重做"),
    B("delete", "delete", "删除", (c) => c.anySelection), B("backspace", "delete", "删除", (c) => c.anySelection),
    B("x", "delete.menu", "删除（光标处弹小菜单；硬表面没有现成的溶解）", (c) => c.mode === "geometry" && !c.walking),   // 动作外 X（统筹 11-13 第 1 条，两个工作台都是；动作里 = 手势层的轴键）
    B("escape", "escape", "取消 / 退一层"),
    // 方向键锁（A9）2026-11-13 退掉：user「锁xyz就xyz，不用方向键」（锁的一轮第三步）；方向键空出来先不绑别的
  ],
};

/** 自由建模工作台层（Blender 键位；user 10-27「能不能blender 快捷键无缝接上」）。 */
export const FREEFORM: Layer = {
  id: "workbench:freeform",
  bindings: [
    B("g", "modal:move", "移动（键盘起手）"), B("r", "modal:rotate", "旋转（键盘起手）"), B("s", "modal:scale", "缩放（键盘起手）"), B("e", "modal:pp", "挤出（键盘起手）"), B("i", "modal:offset", "插入（键盘起手）"),
    B("a", "select.all", "全选"), B("j", "mesh.connect", "连线"), B("f", "mesh.makeFace", "造面（Blender F：一圈边 = 补洞，一条链 / 两条边 / 几个点 = 一张面，两个点 = 一条边）"),   // 压过全局的 F（偏移 / 插入；插入留 I）；user 11-13 重做小屋子卡在 F
    B("shift+a", "tool.key:shift+a:create", "拉出"), B("shift+d", "mesh.duplicateMove", "复制并接着挪（Blender Shift+D）", (c) => !c.gesture && c.actableSelection),
    B("o", "soft.toggle", "软选择 开 / 关"), B("[", "soft.smaller", "软半径 小一点"), B("]", "soft.bigger", "软半径 大一点"),   // Blender O；[ ] = WeebPaint 调笔刷粗细同款（user 10-28 夜「weebpaint的slider」）   // Blender 的「添加」= 这里的新建工具（user 10-28 晚「Shift+A 同意」）
    B("shift+h", "hide.others", "藏起没选中的（Blender Shift+H；H = 藏选中的、Alt+H = 全部显示在全局层）", (c) => !c.gesture),   // 统筹 11-13
    // 动作外按 X = 在光标处弹小菜单「删除 / 溶解」（拿着什么工具都一样；统筹 11-13 按 user「动作里外」那条线定，原来的「X = 立刻删除」和操作工具里的「先锁」同一刀换掉）。
    // 动作外 Y / Z 不响应（Shift+Z 落到全局层 = 缩放到全部）；动作里 X / Y / Z / N / T 归手势层 = 轴。
    B("x", "delete.menu", "删除 / 溶解（光标处弹小菜单）"),
    B("alt+s", "modal:shrink", "沿法线（键盘起手）"), B("alt+w", "modal:shrink", "沿法线（键盘起手）"),
    B("ctrl+r", "mesh.loopCutArm", "环切（下一下点边）"), B("ctrl+b", "modal:offset:bevel", "倒角（键盘起手）"), B("ctrl+shift+b", "modal:offset:bevelVerts", "倒角（点）（键盘起手）"),
  ],
};

/** 手势中（自由建模）：轴键 = 编辑器 axisPress → 语法模块 controller/axis-constraint.ts（单按 = 要这个方向、加 Shift = 垂直于它的面、同一个键再按 = 取消；
 *  设计稿 ai-docs/20261113-axis-constraint-module-design.md，锁的一轮第二步）。N = 按键那一刻光标下那张面的法线、T = 光标下那条边。别的层不绑这几个键当轴。 */
const AXIS_KEY_NAMES: readonly (readonly [string, string, string])[] = [["x", "沿 X", "只在 YZ 面里"], ["y", "沿 Y", "只在 XZ 面里"], ["z", "沿 Z", "只在 XY 面里"], ["n", "沿光标下那张面的法线", "只在光标下那张面里"], ["t", "沿光标下那条边", "只在垂直于光标下那条边的面里"]];
export const GESTURE: Layer = {
  id: "gesture",
  bindings: [
    ...AXIS_KEY_NAMES.flatMap(([k, one, plane]) => [B(k, `axis.press:${k}`, one), B(`shift+${k}`, `axis.press:${k}:shift`, plane)]),
    B("g", "move.slideToggle", "这一次沿边滑（Blender G G）", (c) => c.mode === "freeform" && c.tool === "move"),
  ],
};
/** 手势中打数（Blender「S Z 0」= 缩放、锁 Z、打 0、回车；user 10-28 晚「这也是一个新的模式」）：它说要就给它——数字 / 小数点 / 正负号、有数之后的单位字、退格、回车。
 *  X / Y / Z 它不要（单位里没有这三个字母）、N / T 在单位还没开始打时不要（units.ts quantityKey）→ 落到下面的手势层照旧当轴，打到一半也能锁。读法和单位文本框同一个（units.ts parseQuantity / quantityKey）。 */
export const TYPING: Layer = { id: "typing", bindings: [B("*", "typing.key", "打数", (c, e) => c.typingWants(e))] };
/** 自由建模的拾取范围（Blender 1 / 2 / 3；user 10-29「mesh模式里面123对应单选点线面。然后什么是都可以选？」；按法一处定 = pick-kinds.ts）：
 *  压在「刚做完一步」的数值小窗上面——没在打字时数字键归它（Blender 做完一步按 1 / 2 / 3 照样换点边面；改刚才那一步走右下角的马后炮）；
 *  小窗里已经有字了就让给打字。手势中的打数（S Z 0）在更上面，不受影响。 */
const notTyping = (c: KeyContext): boolean => !c.typing;
export const PICK: Layer = { id: "freeform:pick", bindings: [
  B("1", "pick.solo:verts", "只选点（再按 1 = 都能选）", notTyping), B("2", "pick.solo:edges", "只选边（再按 2 = 都能选）", notTyping), B("3", "pick.solo:faces", "只选面（再按 3 = 都能选）", notTyping),
  B("shift+1", "pick.toggle:verts", "点：能选 / 不能选", notTyping), B("shift+2", "pick.toggle:edges", "边：能选 / 不能选", notTyping), B("shift+3", "pick.toggle:faces", "面：能选 / 不能选", notTyping),
] };   // 手势中打数 + 数值小窗 = 同一层（主人 typed-input.ts 定去向）
/** 镜像会话（马前炮）：回车 = 应用（Esc = 取消走全局的 escape → editor.cancel）。 */
export const MIRROR: Layer = { id: "mirror-session", bindings: [B("enter", "mirror.apply", "应用镜像")] };
/** 数值小窗：它说要就给它（数字开头 / 缓冲非空时的单位字母 / 回车 / 退格）。 */
/** 步行三阶段。 */
export const WALK_EDIT: Layer = { id: "walk:edit", bindings: [B("tab", "walk.resume", "继续走（从按 Tab 那一帧接着走）", (c) => !c.gesture), B("escape", "walk.exit", "离开步行", (c) => !c.gesture && !c.anySelection)] };   // Tab 来回切（user 10-29「fps的暂停的时候tab应该能切回去」）
export const WALK_PLACE: Layer = { id: "walk:place", bindings: [B("escape", "walk.cancelPlace", "取消放置")] };
export const WALK_FPS: Layer = { id: "walk:fps", exclusive: true, bindings: [B("tab", "walk.editInPlace", "原地编辑"), B("escape", "walk.exit", "离开步行")] };

/** 现在压着哪几层（从底到顶）。纯函数：没有转移，每次按键现算。 */
export function layersOf(c: KeyContext): Layer[] {
  const out: Layer[] = [GLOBAL];
  const freeform = c.mode === "freeform" && !c.walking;
  if (freeform) out.push(FREEFORM);
  if ((freeform || (c.mode === "geometry" && !c.walking)) && c.gesture) out.push(GESTURE);   // 轴键：两个建模工作台的动作里都是（锁的一轮第三步接上硬表面）
  if (c.gesture) out.push(TYPING);   // 手势中：打数压在手势层上面（数字 / 单位先给它，X Y Z 不是量的字、照旧锁轴）
  if (c.mirrorSession) out.push(MIRROR);
  if (!c.gesture) out.push(TYPING);   // 刚做完一步：数值小窗在镜像会话下面、步行层下面（同一层对象，两个位置）
  if (freeform && !c.gesture) out.push(PICK);   // 1 / 2 / 3 压在数值小窗上面（没在打字时）
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
  gesture: { title: "建模 · 手势进行中（硬表面 / 自由建模）", when: "按下了还没落定（轴键只管这一下：落定 / 取消就没了；同一个键再按 = 取消它）" },
  "freeform:pick": { title: "自由建模 · 拾取范围", when: "在网格体里、没在打数时（Blender 的 1 / 2 / 3）" },
  typing: { title: "打数", when: "手势进行中直接打（移动 / 旋转 / 缩放 / 挤出 / 插入 / 沿法线；S Z 0 = 沿 Z 压平；回车 / 点一下 = 定，退格改，Esc 取消）；或刚做完一步、右下角小窗亮着时打数字按精确值重做" },
  "mirror-session": { title: "镜像会话", when: "硬表面「镜像…」把手出来时" },
  "walk:edit": { title: "步行 · 原地编辑", when: "" },
  "walk:place": { title: "步行 · 放置", when: "点地面落人之前" },
  "walk:fps": { title: "步行", when: "键盘归走路：WASD 走、空格跳，别的只认下面这几个" },
};
export const ALL_LAYERS: readonly Layer[] = [GLOBAL, FREEFORM, GESTURE, TYPING, PICK, MIRROR, WALK_EDIT, WALK_PLACE, WALK_FPS];
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
export const TOOL_CYCLES: Readonly<Record<Chord, readonly Tool[]>> = { e: ["erase", "weldErase", "softErase"], r: ["rect", "crect", "rrect"], t: ["tape", "protractor", "axes"] };
/**
 * 工具键能跨到哪些工作台（统筹 11-11）：在这一行的工作台里按工具键、要的工具不在这里 = 明着换到这一行列出的工作台里有这把工具、又管得了正在编辑的这种身体的那个
 * （按工作台表的先后），提示行说一句「换到了『X』工作台」，再拿工具。没在表里 = 不跳：编辑器的 setTool 拒收、说这把工具在哪（它自己从不换工作台）。
 * 内容 = 以前 setTool 悄悄做的那条规则原样（按 B 在哪都拿得到油漆桶，SketchUp 式；user 可能一直在用），只是限定在这张表列出的工作台之间。
 * 画画工作台不出现在这张表里（守卫 test/workbench-tools.test.ts）：从画画出不去（那里 E 人以为是画画的橡皮，以前一按就被切到自由建模、拿建模的橡皮擦掉了模型）、
 * 别处也不能靠工具键进画画（进画画要叫醒画板，只能明着进）。新加的工作台默认不在表里，要通才登记。
 */
export const TOOL_KEY_JUMPS: Readonly<Partial<Record<ModeId, readonly ModeId[]>>> = {
  geometry: ["freeform", "surface", "verify", "object"],
  freeform: ["geometry", "surface", "verify", "object"],
  surface: ["geometry", "freeform", "verify", "object"],
  verify: ["geometry", "freeform", "surface", "object"],
  object: ["geometry", "freeform", "surface", "verify"],   // 摆放（空物体，2026-11-13）：跳转照样按「管不管得了这种身体」筛——摆放只管空物体，别处的工具也管不了空物体，所以这两头实际上谁也跳不到谁；登记上是为了规矩只有一条
};
export interface ToolKey { readonly chord: Chord; readonly how: "pick" | "cycle" | "modal"; readonly label: string }
/**
 * 这个工作台里这把工具的键（和真按下去同一条 resolveKey；手上拿着别的工具、有选区、没在手势里）：
 * pick = 从别的工具按它就拿起这把；cycle = 那个键的组里再按几下轮到它；modal = 键盘起手（Blender G / R / S / E；label = 键表那一条，带变体时用得上）。
 * inMode = 这个工作台有没有这把工具（轮换只在工作台有的工具里转，app toolKey 同规矩）。
 */
export function toolKeysOf(mode: ModeId, tool: Tool, inMode: (t: Tool) => boolean = () => true): ToolKey[] {
  const from: Tool = tool === "select" ? "line" : "select";
  const c: KeyContext = { mode, tool: from, gesture: false, anySelection: true, actableSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null, typingWants: () => false };
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
/** 肌肉记忆层面的「意思」：轴键（axis.press，两个建模工作台的动作里同一套）按轴算一个意思；「选这把工具」和「键盘起手做这件事」是同一个动词就算一个意思。 */
export function meaningOf(action: string): string {
  const lock = /^axis\.press:([xyz])(:shift)?$/.exec(action);
  if (lock) return `锁 ${lock[1].toUpperCase()}${lock[2] ? " 面" : ""}`;
  const tool = /^tool\.key:[^:]+:(.+)$/.exec(action), modal = /^modal:([a-z]+)/.exec(action);
  const verb = tool?.[1] ?? modal?.[1];
  return verb ? `动词 ${verb}` : action;
}
/** 拿来比的几个地方（会来回切的：两个建模工作台 × 拿着选择 / 移动，加验证、表面）。 */
export const MUSCLE_CONTEXTS: Readonly<Record<string, Omit<KeyContext, "typingWants">>> = {
  "硬表面·选择": { mode: "geometry", tool: "select", gesture: false, anySelection: true, actableSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null },
  "硬表面·移动": { mode: "geometry", tool: "move", gesture: false, anySelection: true, actableSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: "axis" },
  "自由建模·选择": { mode: "freeform", tool: "select", gesture: false, anySelection: true, actableSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null },
  "自由建模·移动": { mode: "freeform", tool: "move", gesture: false, anySelection: true, actableSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: "axis" },
  "验证·选择": { mode: "verify", tool: "select", gesture: false, anySelection: true, actableSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null },
  "表面·选择": { mode: "surface", tool: "select", gesture: false, anySelection: true, actableSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null },
};
/** 现在的冲突：和弦 → 意思 → 在哪几个地方（没绑的不算；只有一种意思的不列）。 */
export function muscleConflicts(): Map<Chord, Map<string, string[]>> {
  const out = new Map<Chord, Map<string, string[]>>(), chords = new Set<Chord>();
  for (const L of ALL_LAYERS) for (const b of L.bindings) if (b.chord !== "*") chords.add(b.chord);
  for (const ch of [...chords].sort()) {
    const by = new Map<string, string[]>();
    for (const [where, c0] of Object.entries(MUSCLE_CONTEXTS)) {
      const r = resolveKey({ ...c0, typingWants: () => false }, evtOfChord(ch));
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
// user 10-29 拍：这六个「保持现状」（两个工作台各留各的；账本 UX71）。新冲出来的照旧 = 守卫红、再拍。
export const KNOWN_CONFLICTS: Readonly<Record<Chord, string>> = {
  a: "硬表面 = 弧 · 自由建模 = 全选（Blender）",
  e: "硬表面 = 推拉 · 自由建模 = 挤出起手（同一个动词）· 验证 / 表面 = 橡皮（锁的一轮第三步：硬表面 E 换成推拉、橡皮不占键）",
  f: "硬表面 = 偏移 · 自由建模 = 造面（Blender F；user 11-13 重做小屋子卡在 F，统筹插队单：硬表面的 F 不动、插入留 I）",
  g: "硬表面 = 建组件（SketchUp）· 自由建模 = 抓起来移动（Blender）",
  k: "硬表面 = 画线 · 自由建模 = 切割（user 10-29「brep里面K也是线，先这样弄一下，之后可以好好理」：画线本来就能切开面，算同一个「切」的手感）",
  r: "硬表面 = 矩形 · 自由建模 = 旋转（Blender）",
};

