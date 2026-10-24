// tool-strip.ts —— 底部工具选项条：从 ToolConfig 的表**生成**（零手写控件；加选项 = 表里加一行）。
// created 2026-10-21 by Claude Fable 5.1（0.9 QoL：工具配置深模块）。
// 形状：enum → 带文字的下拉（≥ 4 项走 select，feedback 2026-09-09「纯图标行打哑谜 → 带文字下拉」）；number → − 值 +（触屏友好，不弹软键盘；
// 精确输入归 VCB #11）；bool → 开关钮。当前工具没有选项 → 整条隐藏。不进 HudModel（VR 已 sunset；要进时按同一张表再长一个渲染器）。
import type { Editor } from "../editor/editor.ts";
import type { OptionEntry } from "../editor/tool-config.ts";

export interface ToolStrip { render(): void; }
/** 工具自己的动作（user 2026-10-24「轴是工具，轴不归汉堡管，归工具管，工具的上下文菜单该开始做了」）：轴 → 重置轴；卷尺 / 量角器 → 删除所有参考线。 */
export interface StripAction { id: string; label: string; disabled?: boolean; onClick(): void; }

export function mountToolStrip(root: HTMLElement, editor: Editor, opts?: { actions?(tool: string): StripAction[] }): ToolStrip {
  const config = editor.config;
  const render = (): void => {
    const tool = editor.tool;
    const entries = config.entries(tool);
    const actions = opts?.actions?.(tool) ?? [];
    root.hidden = entries.length === 0 && actions.length === 0;
    root.replaceChildren();
    for (const e of entries) root.appendChild(control(tool, e));
    for (const a of actions) {
      const b = document.createElement("button"); b.type = "button"; b.className = "strip-action"; b.textContent = a.label; b.disabled = !!a.disabled;
      b.addEventListener("click", () => { a.onClick(); render(); });
      root.appendChild(b);
    }
  };
  const control = (tool: string, e: OptionEntry): HTMLElement => {
    const wrap = document.createElement("label");
    wrap.className = "strip-field";
    const lab = document.createElement("span"); lab.className = "strip-label"; lab.textContent = e.def.label; wrap.appendChild(lab);
    switch (e.def.kind) {
      case "enum": {
        const sel = document.createElement("select");
        sel.className = "strip-select";
        for (const v of e.def.values) { const o = document.createElement("option"); o.value = v.id; o.textContent = v.label; if (v.hint) o.title = v.hint; sel.appendChild(o); }
        sel.value = String(e.value);
        sel.title = e.def.values.find((v) => v.id === e.value)?.hint ?? "";
        sel.addEventListener("change", () => { config.set(tool as never, e.key as never, sel.value); });
        wrap.appendChild(sel);
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
