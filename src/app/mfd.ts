// mfd.ts —— 键名芯片（MFD）的渲染器：左下角提示行上面一排固定槽位（数据 = controller/chips.ts chipsOf；账本 UX19）。created 2026-10-28 by Claude Opus 5.5
// 规矩（UX19 推荐）：槽位固定（锁轴 · Shift · Ctrl · Alt · 确认 · 取消，空槽占位不显示）；芯片印键名 + 意思；触屏上能点的（锁轴 / 确认 / 取消）= 按了那个键（走同一个 resolveKey）；
// 修饰键芯片只显示（触屏上「按住」要做成锁定式，另算）；电脑上默认开、左边小钮收起（记在这台设备），笔 / 手指的设备不许收。
// 2026-10-28 晚（user「实时响应按键」「有context的时候才显示」「ipad的时候能不能不显示键位」）：亮着的芯片（锁着 / 按着）加 .on；没键盘不印键名；闲着整排不出（规则在 chips.ts）。
import { CHIP_SLOTS, chipsOf, type ChipLive } from "../controller/chips.ts";
import type { KeyContext } from "../controller/keymap.ts";
import type { Stance } from "../controller/stance.ts";

export interface MfdDeps {
  ctx(): KeyContext;
  stance(): Stance | undefined;
  /** 这一刻：按着哪些修饰键、锁着哪根轴 / 哪个面、印不印键名。 */
  live(): ChipLive;
  /** 点了能按的芯片：按这个和弦（app 走 resolveKey → runKeyAction）。 */
  press(chord: string): void;
  /** 点了修饰键开关（没键盘时）：锁住 / 放开。 */
  latch(m: "shift" | "ctrl" | "alt"): void;
  /** 这台设备收起了吗（电脑上）。 */
  collapsed(): boolean;
  setCollapsed(on: boolean): void;
  /** 笔 / 手指的设备：不许收。 */
  touchy(): boolean;
}
export interface Mfd { render(): void }

export function mountMfd(parent: HTMLElement, d: MfdDeps): Mfd {
  const root = document.createElement("div"); root.className = "mfd"; root.hidden = true;
  const toggle = document.createElement("button"); toggle.type = "button"; toggle.className = "mfd-toggle"; toggle.title = "键名芯片：收起 / 展开（这台设备记住）";
  toggle.addEventListener("click", () => { d.setCollapsed(!d.collapsed()); mfd.render(); });
  root.appendChild(toggle);
  const slots = new Map(CHIP_SLOTS.map((s) => { const el = document.createElement("div"); el.className = "mfd-slot"; el.dataset.slot = s; root.appendChild(el); return [s, el] as const; }));
  parent.prepend(root);
  let lastKey = "";
  const mfd: Mfd = {
    render() {
      const L = d.live(), chips = chipsOf(d.ctx(), d.stance(), L), touchy = d.touchy(), collapsed = !touchy && d.collapsed();
      const key = JSON.stringify([chips, touchy, collapsed, L.keys]);
      if (key === lastKey) return;
      lastKey = key;
      root.hidden = !chips.length;
      root.classList.toggle("collapsed", collapsed);
      toggle.hidden = touchy; toggle.textContent = collapsed ? "键 ›" : "‹";
      for (const [s, el] of slots) {
        el.replaceChildren();
        const c = collapsed ? undefined : chips.find((x) => x.slot === s);
        el.classList.toggle("empty", !c);
        for (const it of c?.items ?? []) {
          const tappable = !!(it.press || it.latch);
          const b = document.createElement(tappable ? "button" : "span");
          b.className = "mfd-chip" + (tappable ? " pressable" : "") + (it.latch ? " latch" : "") + (it.on ? " on" : "") + (L.keys ? "" : " nokeys");
          if (b instanceof HTMLButtonElement) { b.type = "button"; const ch = it.press, la = it.latch; b.setAttribute("aria-pressed", String(it.on)); b.addEventListener("click", (ev) => { ev.stopPropagation(); if (la) d.latch(la); else if (ch) d.press(ch); }); }
          const t = document.createElement("span"); t.textContent = it.label;
          if (L.keys) { const k = document.createElement("kbd"); k.textContent = it.keys; b.append(k); }
          b.append(t); el.appendChild(b);
        }
      }
    },
  };
  return mfd;
}
