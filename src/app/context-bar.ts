// context-bar.ts —— 上下文条深模块（A25，2026-10-24 Claude Opus 5.5）：屏幕底部一条，三类条目同一个口进、一处排版。
// user 2026-10-24「context bar好像油漆桶和选择没有统一，记账统一一下，做一个深模块」「上下文菜单你做一个深模块窄接口，不要屎山」。
// 此前是两套：底部工具选项条（tool-strip.ts，由工具配置表生成）+ 顶部选区浮条（context-menu.ts mountSelectionBar）。现在一条：
//   [工具的 chip（leading）][工具选项（ToolConfig 表生成）][工具动作] │ [选区动作]
// 来源：
//   工具选项 = editor.config 的表（加选项 = 表里加一行，本模块不认识任何具体工具）；
//   工具 chip / 动作 = 宿主按工具 id 给（provider）；
//   选区动作 = selection-actions.ts 那张表，只在「浮条路由」（笔 / 手指；鼠标走右键菜单）、有选区、不在手势中时进条。
// 形状：enum → 下拉标准件（select-field）；number → − 值 +（触屏友好，不弹软键盘；精确输入归数值小窗）；bool → 开关钮。三类都空 → 整条隐藏。
import { createSelectField } from "./ui/select-field.ts";
import { iconHtml } from "./ui/icon.ts";
import type { Editor } from "../editor/editor.ts";
import { optionGroupOf, type OptionEntry } from "../editor/tool-config.ts";
import type { HudItem } from "./ui/hud-model.ts";

/** 工具自己的动作 / chip（轴 → 重置轴；卷尺 / 量角器 → 删除所有参考线；油漆桶 → 当前材质 / 吸色）。 */
export interface BarAction { id: string; label: string; disabled?: boolean; onClick(): void; /** 色块（CSS background；材质 chip）。 */ swatch?: string; /** 开关态。 */ active?: boolean; title?: string }
export interface ContextBarProviders {
  /** 排在工具选项前面的 chip（表面工具：当前材质 → 吸色，user 10-24 定的顺序）。 */
  leading?(tool: string): BarAction[];
  /** 排在工具选项后面的动作。 */
  actions?(tool: string): BarAction[];
  /** 选区动作（已按路由 / 有无选区 / 手势中筛过；空 = 不显示这一段）。 */
  selection?(): HudItem[];
  /** 选区动作被点（宿主路由到 hud.pick）。 */
  pickSelection?(id: string): void;
}
export interface ContextBar { render(): void; }

export function mountContextBar(root: HTMLElement, editor: Editor, p: ContextBarProviders): ContextBar {
  const config = editor.config;
  const render = (): void => {
    const tool = editor.tool, group = optionGroupOf(tool);
    const entries = config.entries(group), leading = p.leading?.(tool) ?? [], actions = p.actions?.(tool) ?? [], sel = p.selection?.() ?? [];
    const hasTool = entries.length + leading.length + actions.length > 0;
    root.hidden = !hasTool && sel.length === 0;
    root.replaceChildren();
    for (const a of leading) root.appendChild(actionBtn(a));
    for (const e of entries) root.appendChild(control(group, e));
    for (const a of actions) root.appendChild(actionBtn(a));
    if (sel.length) {
      if (hasTool) { const sep = document.createElement("span"); sep.className = "bar-sep"; sep.setAttribute("aria-hidden", "true"); root.appendChild(sep); }
      for (const it of sel) root.appendChild(selectionBtn(it));
    }
  };
  const actionBtn = (a: BarAction): HTMLButtonElement => {
    const b = document.createElement("button"); b.type = "button"; b.className = "strip-action" + (a.active ? " on" : "") + (a.swatch ? " strip-chip" : ""); b.disabled = !!a.disabled;
    if (a.title) b.title = a.title;
    if (a.active !== undefined) b.setAttribute("aria-pressed", a.active ? "true" : "false");
    if (a.swatch) { const sw = document.createElement("span"); sw.className = "strip-swatch"; sw.style.background = a.swatch; b.appendChild(sw); }
    b.appendChild(document.createTextNode(a.label));
    b.addEventListener("click", () => { a.onClick(); render(); });
    return b;
  };
  const selectionBtn = (it: HudItem): HTMLButtonElement => {
    const b = document.createElement("button"); b.type = "button"; b.className = "selbar-btn" + (it.danger ? " danger" : ""); b.disabled = !!it.disabled; b.title = it.label;
    b.innerHTML = `${it.icon ? iconHtml(it.icon) : ""}<span></span>`;
    (b.lastElementChild as HTMLElement).textContent = it.label;
    b.addEventListener("click", () => p.pickSelection?.(it.id));
    return b;
  };
  const control = (tool: string, e: OptionEntry): HTMLElement => {
    const wrap = document.createElement("label");
    wrap.className = "strip-field";
    const lab = document.createElement("span"); lab.className = "strip-label"; lab.textContent = e.def.label; wrap.appendChild(lab);
    switch (e.def.kind) {
      case "enum": {   // 下拉标准件（B40）：受控值 = 工具配置里的当前值
        const def = e.def, cur = String(e.value);
        const sel = createSelectField({ className: "strip-select", ariaLabel: def.label, items: () => def.values.map((v) => ({ value: v.id, label: v.label, ...(v.hint ? { hint: v.hint } : {}) })), value: () => cur, onChange: (v) => { config.set(tool as never, e.key as never, v); } });
        wrap.appendChild(sel.el);
        break;
      }
      case "number": {
        const def = e.def;
        const box = document.createElement("span"); box.className = "strip-number";
        const mk = (t: string, d: number): HTMLButtonElement => { const b = document.createElement("button"); b.type = "button"; b.className = "strip-step"; b.textContent = t; b.addEventListener("click", () => { config.set(tool as never, e.key as never, (config.get(tool as never, e.key as never) as number) + d); }); return b; };
        const val = document.createElement("span"); val.className = "strip-value"; val.textContent = `${e.value}${def.unit ?? ""}`;
        box.append(mk("−", -def.step), val, mk("+", def.step));
        wrap.appendChild(box);
        break;
      }
      case "bool": {
        const b = document.createElement("button"); b.type = "button"; b.className = "strip-toggle" + (e.value ? " on" : ""); b.textContent = e.value ? "开" : "关";
        b.addEventListener("click", () => { config.set(tool as never, e.key as never, !e.value); });
        wrap.appendChild(b);
        break;
      }
    }
    return wrap;
  };
  config.subscribe(() => render());
  render();
  return { render };
}
