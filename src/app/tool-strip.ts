// tool-strip.ts —— 底部工具选项条：从 ToolConfig 的表**生成**（零手写控件；加选项 = 表里加一行）。
// created 2026-10-21 by Claude Fable 5.1（0.9 QoL：工具配置深模块）。
// 形状：enum → 带文字的下拉（≥ 4 项走 select，feedback 2026-09-09「纯图标行打哑谜 → 带文字下拉」）；number → − 值 +（触屏友好，不弹软键盘；
// 精确输入归 VCB #11）；bool → 开关钮。当前工具没有选项 → 整条隐藏。不进 HudModel（VR 已 sunset；要进时按同一张表再长一个渲染器）。
import { createSelectField } from "./ui/select-field.ts";
import type { Editor } from "../editor/editor.ts";
import { optionGroupOf, type OptionEntry } from "../editor/tool-config.ts";

export interface ToolStrip { render(): void; }
/** 工具自己的动作（user 2026-10-24「轴是工具，轴不归汉堡管，归工具管，工具的上下文菜单该开始做了」）：轴 → 重置轴；卷尺 / 量角器 → 删除所有参考线。 */
export interface StripAction { id: string; label: string; disabled?: boolean; onClick(): void; /** 色块（CSS background；材质 chip）。 */ swatch?: string; /** 开关态（吸色锁定）。 */ active?: boolean; title?: string; }

/** leading = 排在选项前面的 chip（表面工具：当前材质 → 吸色 → 范围 → 阈值，user 2026-10-24 定的顺序）。 */
export function mountToolStrip(root: HTMLElement, editor: Editor, opts?: { actions?(tool: string): StripAction[]; leading?(tool: string): StripAction[] }): ToolStrip {
  const config = editor.config;
  const render = (): void => {
    const tool = editor.tool, group = optionGroupOf(tool);
    const entries = config.entries(group);
    const actions = opts?.actions?.(tool) ?? [], leading = opts?.leading?.(tool) ?? [];
    root.hidden = entries.length === 0 && actions.length === 0 && leading.length === 0;
    root.replaceChildren();
    const btn = (a: StripAction): HTMLButtonElement => {
      const b = document.createElement("button"); b.type = "button"; b.className = "strip-action" + (a.active ? " on" : "") + (a.swatch ? " strip-chip" : ""); b.disabled = !!a.disabled;
      if (a.title) b.title = a.title;
      if (a.active !== undefined) b.setAttribute("aria-pressed", a.active ? "true" : "false");
      if (a.swatch) { const sw = document.createElement("span"); sw.className = "strip-swatch"; sw.style.background = a.swatch; b.appendChild(sw); }
      b.appendChild(document.createTextNode(a.label));
      b.addEventListener("click", () => { a.onClick(); render(); });
      return b;
    };
    for (const a of leading) root.appendChild(btn(a));
    for (const e of entries) root.appendChild(control(group, e));
    for (const a of actions) root.appendChild(btn(a));
  };
  const control = (tool: string, e: OptionEntry): HTMLElement => {
    const wrap = document.createElement("label");
    wrap.className = "strip-field";
    const lab = document.createElement("span"); lab.className = "strip-label"; lab.textContent = e.def.label; wrap.appendChild(lab);
    switch (e.def.kind) {
      case "enum": {
        // 下拉标准件（B40，user「不要用ios自带的。丑」）：受控值 = 工具配置里的当前值
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
