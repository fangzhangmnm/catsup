// select-field.ts —— 下拉标准件：原生 <select> 的替身（按钮 + 弹层菜单），CatsUp 版。created 2026-10-24 by Claude Opus 5.5
// 照 WeebPaint src/ui/select-field.ts（2026-09-02 Claude Fable 5.1，C6 下拉标准件）的「按钮 + 弹层」那半搬来，接 CatsUp 自己的 popup-menu；
// 没搬它的 Vue 组件那半（CatsUp 不用 Vue）和定宽缩写钮面（CatsUp 的下拉都在有地方的位置）。
// 为什么不用原生 <select>（user 2026-10-24「和weebpaint一样用多媒体下拉框深模块，不要用ios自带的。丑」；WeebPaint 考古 T6）：
//   原生下拉的打开态归系统——iPad 上系统字体弹层、夜间配色不受控、装不了 SVG 图标。守卫测试 test/no-native-select.test.ts 禁止再出现。
// 以后抬进 @internal/workbench-elements 共享（两家各一份 = 重复造轮子）：内部库 bump minor 要 user 批，先记总账。
import { togglePopupMenu, type PopupMenuItem } from "./popup-menu.ts";
import { iconHtml } from "./icon.ts";

export interface SelectItem { value: string; label: string; icon?: string; hint?: string; group?: string; disabled?: boolean }
export interface SelectFieldOpts {
  items: () => SelectItem[];
  /** 受控：当前值由消费者持有，钮面永远从它派生。 */
  value: () => string;
  onChange: (v: string) => void;
  align?: "start" | "end";
  ariaLabel?: string;
}
export interface SelectField {
  readonly el: HTMLElement;
  readonly value: string;
  /** 值在外面改了 → 重画钮面。 */
  refresh(): void;
  dispose(): void;
}

/** 把一个现成的按钮节点变成下拉（静态节点：index.html 里的 <button>）。 */
export function mountSelectField(el: HTMLElement, opts: SelectFieldOpts): SelectField {
  el.classList.add("select-field");
  el.setAttribute("aria-haspopup", "listbox");
  if (opts.ariaLabel) el.setAttribute("aria-label", opts.ariaLabel);
  el.replaceChildren();
  const iconEl = document.createElement("span"); iconEl.className = "select-field-icon"; iconEl.hidden = true;
  const label = document.createElement("span"); label.className = "select-field-label";
  const caret = document.createElement("span"); caret.className = "select-field-caret"; caret.setAttribute("aria-hidden", "true");
  el.append(iconEl, label, caret);
  const refresh = (): void => {
    const v = opts.value(), cur = opts.items().find((it) => it.value === v);
    el.dataset.value = v;
    label.textContent = cur?.label ?? v;
    el.title = cur?.hint ?? "";
    if (cur?.icon) { iconEl.innerHTML = iconHtml(cur.icon); iconEl.hidden = false; } else { iconEl.replaceChildren(); iconEl.hidden = true; }
  };
  const toMenu = (): PopupMenuItem[] => {
    const cur = opts.value(), out: PopupMenuItem[] = [];
    let group: string | undefined;
    for (const it of opts.items()) {
      const head = it.group !== group ? it.group : undefined; group = it.group;
      out.push({ id: it.value, label: it.label, ...(it.icon ? { icon: it.icon } : {}), ...(it.hint ? { hint: it.hint } : {}), checked: it.value === cur, ...(it.disabled ? { disabled: true } : {}), ...(head ? { sectionBefore: head } : {}) });
    }
    return out;
  };
  const onClick = (ev: Event): void => {
    ev.stopPropagation();
    togglePopupMenu<string>({ anchor: el, align: opts.align ?? "start", items: toMenu, onPick: (v) => { if (v !== opts.value()) opts.onChange(v); refresh(); } });
  };
  el.addEventListener("click", onClick);
  refresh();
  return { el, get value() { return opts.value(); }, refresh, dispose() { el.removeEventListener("click", onClick); } };
}

/** 现建一个下拉按钮（工具选项条这种动态生成的场合）。 */
export function createSelectField(opts: SelectFieldOpts & { className?: string }): SelectField {
  const b = document.createElement("button");
  b.type = "button";
  if (opts.className) b.className = opts.className;
  return mountSelectField(b, opts);
}
