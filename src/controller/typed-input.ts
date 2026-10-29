// typed-input.ts —— 「正在打的字」的唯一主人（周账 F-125 输入统一；设计 ai-docs/20261029-input-unification.md）。created 2026-10-29 by Claude Fable 5.1
//   以前两份缓冲各管各的：编辑器的 typedBuf（手势中打数，Blender「S Z 0」）+ 右下角数值小窗的 buf（刚做完一步按精确值重做，SketchUp 式）；
//   键表两层（gesture:typing / vcb）、两套「哪个键能进」、两个回车、触屏小键盘只给后者。现在：一份字、一个去向（target）、一张键表层、一个小键盘。
//   去向由现状决定（问宿主）：手势进行中且这把工具收数 = gesture；否则刚做完一步能改 = vcb；都不是 = null（没人收字）。去向一变字就清。
//   语法：gesture = units.ts quantityKey（这个量写得出来的字）；vcb = 数值小窗的老语法（数字开头；单位 / 段数 s / 阵列 x 只能跟在后面）。
//   回车 = 定（gesture → 手势落定；vcb → 应用）；退格删一个（手势里空着也吞掉，别漏成删除选区）；Esc 只管 vcb（清空）；手势里的 Esc 归手势层。
//   零 DOM、零编辑器 import：controller 是无头骑士（test/stance.test.ts 第四条）。
import { quantityKey, type QuantityTag } from "../editor/units.ts";

export type TypedTarget = "gesture" | "vcb";
export interface TypedInputDeps {
  /** 手势进行中且这把工具收数 → 收什么量；否则 null。 */
  gestureQuantity(): QuantityTag | null;
  /** 刚做完一步、数值小窗能改它。 */
  vcbOpen(): boolean;
}
export interface TypedEvent { kind: "change" | "confirm" | "cancel"; target: TypedTarget; text: string }
export interface TypedInput {
  /** 现在字往哪去（null = 没人收）。 */
  target(): TypedTarget | null;
  text(): string;
  /** 这一下按键归不归打字（键表层问它；不改状态）。 */
  wants(key: string, mods?: { ctrl?: boolean; alt?: boolean; meta?: boolean }): boolean;
  /** 打一个键（键盘 / 小键盘共用）：true = 收了。 */
  feed(key: string): boolean;
  /** 小键盘的字面（⌫ / 清空 / ↵ / 空格 / 别的 = 字）。 */
  press(glyph: string): void;
  clear(): void;
  /** 现状可能变了（手势开始 / 结束、一步做完 / 下一步开始）：去向变了就清字。 */
  sync(): void;
  subscribe(cb: (e: TypedEvent) => void): () => void;
}

const VCB_START = /^[0-9,\-+*/]$/;   // 「.」不能开头：空的时候「.」= 缩放到选区（Blender 小键盘 .）；.5 要打 0.5
const VCB_CONT = /^[0-9.,\-+*/xsmc°'"ftindeg ]$/i;   // 接着打：单位后缀（m / cm / mm / ft / in / ' / " / ° / deg）、段数 s、阵列 x、英制分数里的空格

export function createTypedInput(d: TypedInputDeps): TypedInput {
  let buf = "", last: TypedTarget | null = null;
  const subs = new Set<(e: TypedEvent) => void>();
  const emit = (kind: TypedEvent["kind"], target: TypedTarget): void => { for (const cb of subs) { try { cb({ kind, target, text: buf }); } catch { /* 订阅者的错不许打断打字 */ } } };
  const target = (): TypedTarget | null => (d.gestureQuantity() ? "gesture" : d.vcbOpen() ? "vcb" : null);
  const sync = (): void => { const t = target(); if (t !== last) { last = t; if (buf) { buf = ""; if (t) emit("change", t); } } };
  const wants = (key: string, mods?: { ctrl?: boolean; alt?: boolean; meta?: boolean }): boolean => {
    if (mods?.ctrl || mods?.alt || mods?.meta) return false;
    const t = target();
    if (!t) return false;
    if (t === "gesture") return key === "Enter" || key === "Backspace" || quantityKey(d.gestureQuantity()!, buf, key);
    if (key === "Enter" || key === "Escape" || key === "Backspace") return !!buf;
    return VCB_START.test(key) || (!!buf && VCB_CONT.test(key));
  };
  const feed = (key: string): boolean => {
    sync();
    const t = target();
    if (!t || !wants(key)) return false;
    if (key === "Enter") { if (t === "vcb" && !buf.trim()) return false; emit("confirm", t); return true; }
    if (key === "Escape") { buf = ""; emit("cancel", t); return true; }
    buf = key === "Backspace" ? buf.slice(0, -1) : buf + key;
    emit("change", t);
    return true;
  };
  return {
    target, text: () => buf, wants, feed,
    press: (g) => { if (g === "⌫") feed("Backspace"); else if (g === "清空") { sync(); const t = target(); buf = ""; if (t) emit("change", t); } else if (g === "↵") feed("Enter"); else feed(g === "空格" ? " " : g); },
    clear: () => { sync(); const t = target(); if (buf) { buf = ""; if (t) emit("change", t); } },
    sync,
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
  };
}
