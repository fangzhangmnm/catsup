// app/keyboard-seen.ts —— 这次打开之后按过实体键盘吗（只此一处判；统筹 11-13 第 D 件，user 改的判据）。created 2026-11-13 by Claude Opus 5.5
// user：Surface 这种笔和键盘混着用的机器上，最后一次指针是笔，照「最后一次用的是不是鼠标」就一直不显示快捷键 → 改成「这次打开之后按过实体键盘 = 显示」。
// 只认真的按键：
//   · isTrusted（脚本发的不算）；
//   · 不是在输入框 / 文本区 / 可编辑区里打的字（屏幕软键盘只在这些地方有焦点时才出来，在画布上按键的只有实体键盘）；
//   · 不是输入法组字（key = "Unidentified" / keyCode 229：软键盘和输入法常这样报）；单按修饰键也算（Shift 是实体键）。
// 我们自己的数字键盘（右下角胶囊）不发 keydown，天然不算。
// **规矩（统筹 11-13）：「有没有键盘」只问这里，「手里是什么指针」只问 main.ts 的 lastPointerType，两个问题不许互相代替。**
// 用的人：工具栏右上角的小字快捷键（body 上的 class，CSS 显示）、键名芯片「印不印键名」。提示摆哪边、选区动作走右键还是浮条、视图拖柄藏不藏、选区两档的出厂值问的是指针，照旧跟 lastPointerType；
// 提示行用触屏说法还是键鼠说法（main.ts touchy）混着两个问题（指针怎么点 + 有没有键可按），是待拆的账：哪句提示在 Surface 上说错了再拆。
let seen = false;
const subs = new Set<() => void>();

/** 一下按键算不算实体键盘（纯判，不改状态）。 */
export function isPhysicalKey(ev: { isTrusted: boolean; key: string; keyCode?: number; isComposing?: boolean; target: unknown }): boolean {
  if (!ev.isTrusted || ev.isComposing || ev.key === "Unidentified" || ev.keyCode === 229) return false;
  const t = ev.target as { tagName?: string; isContentEditable?: boolean } | null;
  const tag = typeof t?.tagName === "string" ? t.tagName.toUpperCase() : "";
  return !(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable === true);
}
/** 这次打开之后按过实体键盘吗。 */
export function keyboardSeen(): boolean { return seen; }
/** keydown 进来先问这里（app 的键盘入口，捕获阶段）。第一次算数时通知一次。 */
export function noteKeyEvent(ev: Parameters<typeof isPhysicalKey>[0]): void {
  if (seen || !isPhysicalKey(ev)) return;
  seen = true;
  for (const f of subs) f();
}
/** 按过的那一刻通知（已经按过 = 马上通知）。 */
export function onKeyboardSeen(f: () => void): () => void { if (seen) f(); subs.add(f); return () => subs.delete(f); }
