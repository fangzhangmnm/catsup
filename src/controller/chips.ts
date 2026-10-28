// controller/chips.ts —— 键名芯片（MFD）的数据：一排**固定槽位**，换工具 / 换层只换字不换位置（账本 UX19 推荐：战斗机 MFD 的 OSB 纪律——触屏也能长肌肉记忆）。
// created 2026-10-28 by Claude Opus 5.5。user 10-28：「其实飞行上面就有点像仪表盘被MFD取代这个概念 关键是tablet的话确实弹按钮比bind shortcut快，但是键鼠老登反而是觉得shortcut快，
// 但是可能键鼠新人反而觉得mfd快」「结论是不做二选一」。一张层表两种渲染：键表照旧接键盘；这里把「现在这一层按什么是什么」排成芯片，芯片印键名（新人照着学）。
// 字从哪来：锁轴 / 确认 / 取消 = 键表（resolveKey，和真按下去是同一条）；Shift / Ctrl / Alt = 这把工具的立场表那一格（stance.ts）。纯数据，渲染器 = app/mfd.ts。
import type { KeyContext, KeyEvt } from "./keymap.ts";
import { chordLabel, resolveKey } from "./keymap.ts";
import type { Stance } from "./stance.ts";

/** 槽位（顺序 = 屏上从左到右，永远这个顺序）。 */
export const CHIP_SLOTS = ["lock", "shift", "ctrl", "alt", "confirm", "cancel"] as const;
export type ChipSlot = (typeof CHIP_SLOTS)[number];
/** 一个按键芯片：keys = 印在芯片上的键名；label = 意思；press = 触屏上点它 = 按了这个和弦（null = 只显示：修饰键要按住，点一下没有意义）。 */
export interface ChipKey { readonly keys: string; readonly label: string; readonly press: string | null }
export interface Chip { readonly slot: ChipSlot; readonly items: readonly ChipKey[] }

const evtOf = (chord: string): KeyEvt => {
  const p = chord.split("+"), n = p[p.length - 1];
  return { key: n === "space" ? " " : n, code: /^[a-z]$/.test(n) ? `Key${n.toUpperCase()}` : n, shift: p.includes("shift"), ctrl: p.includes("ctrl"), alt: p.includes("alt") };
};
const live = (c: KeyContext, chord: string): string | null => { const r = resolveKey(c, evtOf(chord)); return r && r !== "swallow" ? r.label : null; };

/**
 * 这一刻的芯片（每个槽一个；这个槽现在没东西 = 不在结果里，渲染器照样占位）。
 * 锁轴：这把工具吃锁才有——自由建模的操作工具 = X / Y / Z（UX17），别处 = 方向键 → ← ↑；字 = 键表里这个键现在的意思。
 * Shift / Ctrl / Alt：立场表那一格（"—" = 没有）。确认：镜像会话的回车。取消：手势进行中 / 镜像会话的 Esc。
 */
export function chipsOf(c: KeyContext, stance: Stance | undefined): Chip[] {
  const out: Chip[] = [];
  if (c.lockStyle && !c.walking) {
    const chords = c.mode === "freeform" ? ["x", "y", "z"] : ["arrowright", "arrowleft", "arrowup"];
    const items = chords.flatMap((ch) => { const l = live(c, ch); return l ? [{ keys: chordLabel(ch), label: l, press: ch }] : []; });
    if (items.length) out.push({ slot: "lock", items });
  }
  for (const m of ["shift", "ctrl", "alt"] as const) {
    const t = stance?.[m];
    if (t && t !== "—") out.push({ slot: m, items: [{ keys: m === "shift" ? "Shift" : m === "ctrl" ? "Ctrl" : "Alt", label: t.replace(/（[^）]*要改[^）]*）/g, "").trim(), press: null }] });
  }
  if (c.mirrorSession) { const l = live(c, "enter"); if (l) out.push({ slot: "confirm", items: [{ keys: "Enter", label: l, press: "enter" }] }); }
  if (c.gesture || c.mirrorSession) out.push({ slot: "cancel", items: [{ keys: "Esc", label: "取消", press: "escape" }] });
  return out;
}
