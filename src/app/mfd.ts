// mfd.ts —— 键名芯片（MFD）的渲染器：左下角提示行上面一排固定槽位（数据 = controller/chips.ts chipsOf；账本 UX19）。created 2026-10-28 by Claude Opus 5.5
// 规矩（UX19 推荐）：槽位固定（锁轴 · Shift · Ctrl · Alt · 确认 · 取消，空槽占位不显示）；芯片印键名 + 意思；触屏上能点的（锁轴 / 确认 / 取消）= 按了那个键（走同一个 resolveKey）；
// 修饰键芯片只显示（触屏上「按住」要做成锁定式，另算）；电脑上默认开、左边小钮收起（记在这台设备），笔 / 手指的设备不许收。
import { CHIP_SLOTS, chipsOf } from "../controller/chips.ts";
import type { KeyContext } from "../controller/keymap.ts";
import type { Stance } from "../controller/stance.ts";

export interface MfdDeps {
  ctx(): KeyContext;
  stance(): Stance | undefined;
  /** 点了能按的芯片：按这个和弦（app 走 resolveKey → runKeyAction）。 */
  press(chord: string): void;
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
      const chips = chipsOf(d.ctx(), d.stance()), touchy = d.touchy(), collapsed = !touchy && d.collapsed();
      const key = JSON.stringify([chips, touchy, collapsed]);
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
          const b = document.createElement(it.press ? "button" : "span");
          b.className = "mfd-chip" + (it.press ? " pressable" : "");
          if (b instanceof HTMLButtonElement) { b.type = "button"; const ch = it.press!; b.addEventListener("click", (ev) => { ev.stopPropagation(); d.press(ch); }); }
          const k = document.createElement("kbd"); k.textContent = it.keys;
          const t = document.createElement("span"); t.textContent = it.label;
          b.append(k, t); el.appendChild(b);
        }
      }
    },
  };
  return mfd;
}
