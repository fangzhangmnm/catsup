// controller/chips.ts —— 键名芯片（MFD）的数据：一排**固定槽位**，换工具 / 换层只换字不换位置（账本 UX19 推荐：战斗机 MFD 的 OSB 纪律——触屏也能长肌肉记忆）。
// created 2026-10-28 by Claude Opus 5.5。user 10-28：「其实飞行上面就有点像仪表盘被MFD取代这个概念 关键是tablet的话确实弹按钮比bind shortcut快，但是键鼠老登反而是觉得shortcut快，
// 但是可能键鼠新人反而觉得mfd快」「结论是不做二选一」。一张层表两种渲染：键表照旧接键盘；这里把「现在这一层按什么是什么」排成芯片，芯片印键名（新人照着学）。
// 字从哪来：锁轴 / 确认 / 取消 = 键表（resolveKey，和真按下去是同一条）；Shift / Ctrl / Alt = 这把工具的立场表那一格（stance.ts）。纯数据，渲染器 = app/mfd.ts。
// 2026-10-28 晚 user：「这些能不能实时响应按键，以及有context的时候才显示，他们没有context的时候不显示。然后ipad的时候能不能不显示键位」→
//   ① 实时：芯片带 on（锁着的轴 / 按着的修饰键 = 亮）；② 有事可做才出：锁轴 = 手势进行中或已经锁着、修饰键 = 手势进行中或正按着它，闲着什么都不出；
//   ③ 没键盘（笔 / 手指的设备）= 不印键名、修饰键槽不出（按不了，留着只是一句没法用的话）；锁轴 / 确认 / 取消照旧能点。
//   user 同晚「吸附不要太长的解释，就叫吸附」→ 芯片只印名字（立场表那格冒号前那段：「吸附：点 > 边 > 面」→「吸附」；chipLabel）；解释留给按住一会儿的状态行（stanceShown）。
//   user 同晚「ipad上面用这些来锁确实舒服。相当于xyz是toggle shift是按住，但是ipad上面shift反而变成toggle，对吧」→ 没键盘时修饰键芯片 = 开关（点一下锁住、再点放开；latch），
//   亮着就一直出（不许有看不见的状态在改行为）；app 换工具 / 换工作台时放开。「有事可做」的定义：手势进行中 / 锁着 / 锁住的修饰键 / 这把工具对选区做事（立场表变换中心 ≠ 无）且有选区。
//   顺手：立场表里只是「附注」的格子（整格是括号：「（Alt+S / Alt+W = 这把工具）」）不出芯片；「（= 复制）」= 和另一个键同义 → 并进那一枚（键名「Ctrl/Alt」）。
import type { KeyContext, KeyEvt } from "./keymap.ts";
import { chordLabel, resolveKey } from "./keymap.ts";
import type { Stance } from "./stance.ts";

/** 槽位（顺序 = 屏上从左到右，永远这个顺序）。 */
export const CHIP_SLOTS = ["lock", "shift", "ctrl", "alt", "confirm", "cancel"] as const;
export type ChipSlot = (typeof CHIP_SLOTS)[number];
/** 一个按键芯片：keys = 印在芯片上的键名；label = 意思；press = 点它 = 按了这个和弦（null = 不是和弦）；latch = 点它 = 锁住 / 放开这个修饰键（没键盘时）；on = 现在亮着（锁着 / 按着）。 */
export interface ChipKey { readonly keys: string; readonly label: string; readonly press: string | null; readonly latch?: "shift" | "ctrl" | "alt"; readonly on: boolean }
export interface Chip { readonly slot: ChipSlot; readonly items: readonly ChipKey[] }
/** 这一刻的实时状态（app 给；没给 = 什么都没按、没锁、有键盘）。 */
export interface ChipLive {
  /** 现在按着的修饰键。 */
  readonly held: { readonly shift: boolean; readonly ctrl: boolean; readonly alt: boolean };
  /** 现在锁着的轴（方向键 / X Y Z；没锁 = null）。 */
  readonly axisLock: "x" | "y" | "z" | null;
  /** 现在锁着的面（Shift + 方向键；没锁 = null）。 */
  readonly planeLock: string | null;
  /** 印键名吗：键鼠 = 印；笔 / 手指的设备 = 不印、修饰键槽不出（user「ipad的时候能不能不显示键位」）。 */
  readonly keys: boolean;
  /** 指针正按在画布上（拖着没松）。 */
  readonly pressing: boolean;
  /** 没键盘时点芯片锁住的修饰键（= 一直按着）。 */
  readonly latched: { readonly shift: boolean; readonly ctrl: boolean; readonly alt: boolean };
}
export const IDLE_LIVE: ChipLive = { held: { shift: false, ctrl: false, alt: false }, axisLock: null, planeLock: null, keys: true, pressing: false, latched: { shift: false, ctrl: false, alt: false } };

const evtOf = (chord: string): KeyEvt => {
  const p = chord.split("+"), n = p[p.length - 1];
  return { key: n === "space" ? " " : n, code: /^[a-z]$/.test(n) ? `Key${n.toUpperCase()}` : n, shift: p.includes("shift"), ctrl: p.includes("ctrl"), alt: p.includes("alt") };
};
const live = (c: KeyContext, chord: string): string | null => { const r = resolveKey(c, evtOf(chord)); return r && r !== "swallow" ? r.label : null; };
/** 锁轴的和弦 → 锁哪根轴（自由建模 X / Y / Z；硬表面 → ← ↑ = 红 X / 绿 Y / 蓝 Z）。 */
const LOCK_AXIS: Readonly<Record<string, "x" | "y" | "z">> = { x: "x", y: "y", z: "z", arrowright: "x", arrowleft: "y", arrowup: "z" };
/** 面锁（user 10-28 晚「xy yz xz的锁做了吗」：键盘早有，芯片补上）：和弦 → 法向轴（锁 XY = 法向 Z）+ 名字。顺序 = XY · YZ · XZ。 */
const LOCK_PLANE: readonly { readonly ff: string; readonly hard: string; readonly n: "x" | "y" | "z"; readonly name: string }[] = [
  { ff: "shift+z", hard: "shift+arrowup", n: "z", name: "XY" }, { ff: "shift+x", hard: "shift+arrowright", n: "x", name: "YZ" }, { ff: "shift+y", hard: "shift+arrowleft", n: "y", name: "XZ" },
];
const MOD_KEY = { shift: "Shift", ctrl: "Ctrl", alt: "Alt" } as const;

/** 立场表那一格给人看的样子：去掉施工附注（「（…要改…）」「（…§3-3…）」「（UX35）」这种账本代号——界面不许出代号）。状态行的「按住 Shift：…」用它。 */
export function stanceShown(t: string): string {
  return t.replace(/（[^）]*(要改|要搬|§|UX\d)[^）]*）/g, "").trim();
}
/** 芯片上印的名字：给人看的样子取冒号前那段（「吸附：点 > 边 > 面」→「吸附」；user「吸附不要太长的解释，就叫吸附」）。 */
export function chipLabel(t: string): string {
  return stanceShown(t).split("：")[0].trim();
}

/**
 * 这一刻的芯片（每个槽一个；这个槽现在没东西 = 不在结果里，渲染器不占位）。
 * 锁轴：这把工具吃锁、而且（手势进行中 / 已经锁着 / 对选区做事且有选区）才出——自由建模的操作工具 = X / Y / Z（UX17），别处 = 方向键 → ← ↑；字 = 键表里这个键现在的意思；锁着的那根亮。
 *   后面跟面锁 XY / YZ / XZ（自由建模 Shift+Z / X / Y，硬表面 Shift+↑ → ←；键表里这个和弦现在绑着才出），锁着的那个面亮。
 * Shift / Ctrl / Alt：立场表那一格的名字（"—" = 没有）；有键盘 = 手势进行中或正按着才出、只显示；没键盘 = 开关（latch），手势进行中 / 对选区做事 / 锁着才出。亮 = 按着或锁着。
 * 确认：镜像会话的回车。取消：等下一点 / 键盘起手 / 镜像会话（拖着没松不出）。
 */
export function chipsOf(c: KeyContext, stance: Stance | undefined, L: ChipLive = IDLE_LIVE): Chip[] {
  const out: Chip[] = [];
  const locked = L.axisLock !== null || L.planeLock !== null;
  const onSel = c.hasSelection && !!stance && stance.center !== "none";   // 这把工具对选区做事、而且有选区：下一下按下去就用得上锁 / 修饰键
  if (c.lockStyle && !c.walking && (c.gesture || locked || onSel)) {
    const chords = c.mode === "freeform" ? ["x", "y", "z"] : ["arrowright", "arrowleft", "arrowup"];
    const items: ChipKey[] = chords.flatMap((ch) => { const l = live(c, ch); return l ? [{ keys: chordLabel(ch), label: l, press: ch, on: L.planeLock === null && L.axisLock === LOCK_AXIS[ch] }] : []; });
    for (const P of LOCK_PLANE) { const ch = c.mode === "freeform" ? P.ff : P.hard; if (live(c, ch)) items.push({ keys: chordLabel(ch), label: `锁 ${P.name}`, press: ch, on: L.planeLock === P.n }); }
    if (items.length) out.push({ slot: "lock", items });
  }
  {
    // 立场表那一格 → 意思：去掉施工附注；整格是括号 = 附注不是按住的意思（不出）；「（= X）」= 和意思是 X 的那个键同义（并进去）
    const meaning = { shift: "", ctrl: "", alt: "" }, alias: { m: "shift" | "ctrl" | "alt"; of: string }[] = [];
    for (const m of ["shift", "ctrl", "alt"] as const) {
      const t = stanceShown(stance?.[m] ?? "—");
      if (!t || t === "—") continue;
      const eq = /^（=\s*(.+?)）$/.exec(t);
      if (eq) { alias.push({ m, of: eq[1].trim() }); continue; }
      if (/^（[^）]*）$/.test(t)) continue;
      meaning[m] = t;   // 并同义键按全称比；印的时候才缩成名字
    }
    for (const m of ["shift", "ctrl", "alt"] as const) {
      if (!meaning[m]) continue;
      const mates = alias.filter((a) => a.of === meaning[m]).map((a) => a.m), all = [m, ...mates];
      const latched = all.some((k) => L.latched[k]), on = latched || all.some((k) => L.held[k]);
      // 有键盘：手势进行中或正按着才出（按住就是用法，只显示）；没键盘：芯片 = 开关，手势进行中 / 对选区做事 / 锁着才出
      if (L.keys ? !(c.gesture || on) : !(c.gesture || onSel || latched)) continue;
      out.push({ slot: m, items: [{ keys: all.map((k) => MOD_KEY[k]).join("/"), label: chipLabel(meaning[m]), press: null, ...(L.keys ? {} : { latch: m }), on }] });
    }
  }
  if (c.mirrorSession) { const l = live(c, "enter"); if (l) out.push({ slot: "confirm", items: [{ keys: "Enter", label: l, press: "enter", on: false }] }); }
  // 取消什么时候有意义（user 10-28 晚「取消什么时候是有意义的好好想一下。没意义的chip不放」）：只在「操作开着、手是空的」时——
  //   点了一下在等下一点（画到一半的线 / 移动等第二下）、键盘起手跟着光标走的（G / R / S）、镜像会话。按着没松的拖 = 松手本身就是决定，鼠标按着也点不到芯片 → 不出。
  if (c.mirrorSession || (c.gesture && !L.pressing)) out.push({ slot: "cancel", items: [{ keys: "Esc", label: "取消", press: "escape", on: false }] });
  return out;
}
