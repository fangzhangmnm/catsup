// input-dom.ts —— 输入闸接到网页上：全 app 唯一的闸实例 + 唯一的门口（window 捕获阶段）。created 2026-11-05 by Claude Opus 5.5
// 规则都在 controller/input-gate.ts（node 能测）；这里只管「事件 → 问闸 → 吞不吞」。设计 = ai-docs/20261105-input-gate-design.md §3 第一层。
//   从 sheets.ts 搬来（工单 C 的同步闸门输入锁，WeebPaint QA 2026-08-21 同一课：遮罩挡得住指针，挡不住 window 上的键盘分发），推广到所有写了 root 的模态面。
//   pointerup / pointermove / keyup 不吞：面升起的时候手势可能正按着，吞了抬起会把手势和键态卡死（升起之后的新按下才吞）。
import { createInputGate, type Source } from "../controller/input-gate.ts";

export const inputGate = createInputGate();

const GUARDED: Readonly<Record<string, Source>> = {
  keydown: "key", keypress: "key",
  pointerdown: "pointer", mousedown: "pointer", dblclick: "pointer", click: "pointer", contextmenu: "pointer",
  touchstart: "touch", wheel: "wheel",
};

/** 这一下归浏览器、不归 app：Tab 挪焦点（面开着时要能挪到面上的钮）、刷新、开发者工具。面卡死的时候人还得能刷新。 */
function browserKey(e: KeyboardEvent): boolean {
  if (e.key === "Tab" || e.key === "F5" || e.key === "F12") return true;
  return (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r";
}
function swallow(e: Event): void { e.stopImmediatePropagation(); e.preventDefault(); }

function guard(e: Event): void {
  const source = GUARDED[e.type];
  if (e.type === "keydown" && (e as KeyboardEvent).key === "Escape") {
    if (inputGate.escape() !== "none") swallow(e);   // Esc 只给最上面那个面，不往下传（以前关完弹窗再传到编辑器，顺手把人从组件里退出来）
    return;
  }
  if (!e.isTrusted) return;   // 程序发的不是人按的：下载的 a.click()、文件框的 input.click() 在忙碌遮罩底下也得走通；第二层（消费者自检）还会再问一次
  if (source === "key" && browserKey(e as KeyboardEvent)) return;
  const target = e.target as { closest?: (sel: string) => unknown } | null;
  if (inputGate.blocks(source, (root) => !!target?.closest?.(root as string))) swallow(e);
}

/** 焦点在能打字的控件上：键盘归它（数值框、改名框、搜索框）。看 activeElement，不看事件目标：闸要能在没有事件的时候回答。 */
function isTextEl(el: Element | null): boolean {
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable === true;
}

/** 外点关菜单的那一下：点在画布上 = 只关菜单，不再穿到工具（以前拿着画线工具点外面关菜单，同时起了一笔）；点在别的钮上照常（一下就换到那个钮）。 */
export function dismissPress(e: Event): void {
  if ((e.target as Element | null)?.id === "board") { e.stopPropagation(); e.preventDefault(); }
}

let installed = false;
/** 开机最早装：window 上的捕获监听按注册先后跑，门口要排第一。 */
export function installInputDom(): void {
  if (installed) return;
  installed = true;
  for (const type of Object.keys(GUARDED)) window.addEventListener(type, guard, { capture: true, passive: false });
  inputGate.face({ kind: "text", label: "文本框", rank: 10, up: () => isTextEl(document.activeElement) });
}
