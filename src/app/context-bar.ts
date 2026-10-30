// context-bar.ts —— 上下文条深模块（A25，2026-10-24 Claude Opus 5.5）：屏幕底部一条，三类条目同一个口进、一处排版。
// user 2026-10-24「context bar好像油漆桶和选择没有统一，记账统一一下，做一个深模块」「上下文菜单你做一个深模块窄接口，不要屎山」。
// 此前是两套：底部工具选项条（tool-strip.ts，由工具配置表生成）+ 顶部选区浮条（context-menu.ts mountSelectionBar）。现在一条：
//   [工具的 chip（leading）][工具选项（ToolConfig 表生成）][工具动作] │ [选区动作]
// 来源：
//   工具选项 = editor.config 的表（加选项 = 表里加一行，本模块不认识任何具体工具）；
//   工具 chip / 动作 = 宿主按工具 id 给（provider）；
//   选区动作 = selection-actions.ts 那张表，只在「浮条路由」（笔 / 手指；鼠标走右键菜单）、有选区、不在手势中时进条。
// 形状：enum → 下拉标准件（select-field）；number → − 值 +（触屏友好，不弹软键盘；精确输入归数值小窗）；bool → 开关钮。三类都空 → 整条隐藏。
import { fieldControl, fieldEditing } from "./ui/field-control.ts";
import type { ParamValue } from "../editor/param-panel.ts";
import { iconHtml } from "./ui/icon.ts";
import { PICK_KINDS, pickAfter, type PickKind, type PickSet } from "../controller/pick-kinds.ts";
import type { Editor } from "../editor/editor.ts";
import { optionGroupOf, type OptionEntry } from "../editor/tool-config.ts";
import { stanceOf } from "../controller/stance.ts";
import type { HudItem } from "./ui/hud-model.ts";

/** 工具自己的动作 / chip（轴 → 重置轴；卷尺 / 量角器 / 圆规 → 删除所有参考几何；油漆桶 → 当前材质 / 吸色）。 */
export interface BarAction { id: string; label: string; disabled?: boolean; onClick(): void; /** 色块（CSS background；材质 chip）。 */ swatch?: string; /** 开关态。 */ active?: boolean; title?: string }
export interface ContextBarProviders {
  /** 排在工具选项前面的 chip（表面工具：当前材质 → 吸色，user 10-24 定的顺序）。 */
  leading?(tool: string): BarAction[];
  /** 排在工具选项后面的动作。 */
  actions?(tool: string): BarAction[];
  /** 选区动作（已按路由 / 有无选区 / 手势中筛过；空 = 不显示这一段）。 */
  selection?(): HudItem[];
  /** 选区动作被点（宿主路由到 hud.pick）。 */
  pickSelection?(id: string, el?: HTMLElement): void;
  /** 每次重画完（这一段住在右下参数小窗里：宿主据此重算整个面板藏不藏，2026-10-25）。 */
  afterRender?(): void;
}
export interface ContextBar { render(): void; }

export function mountContextBar(root: HTMLElement, editor: Editor, p: ContextBarProviders): ContextBar {
  const config = editor.config;
  const render = (): void => {
    const tool = editor.tool, group = optionGroupOf(tool);
    const entries = config.entries(group).filter((e) => !(e.def.kind === "number" && e.def.modes && !e.def.modes.includes(editor.modeId))), leading = p.leading?.(tool) ?? [], actions = p.actions?.(tool) ?? [], sel = p.selection?.() ?? [];
    const hasTool = entries.length + leading.length + actions.length > 0;
    root.hidden = !hasTool && sel.length === 0;
    if (fieldEditing(root)) return;   // 正在就地打字：不重画
    root.replaceChildren();
    for (const a of leading) root.appendChild(actionBtn(a));
    for (const e of entries) root.appendChild(control(group, e));
    // 沿边滑（自由建模移动的一种模式；G G）
    if (editor.modeId === "freeform" && tool === "move") for (const e of config.entries("slide")) root.appendChild(control("slide", e));
    // 软选择（自由建模的移动 / 旋转 / 缩放 / 沿法线；开关在这里，半径在左边竖滑条）
    if (editor.modeId === "freeform" && ["move", "rotate", "scale", "shrink"].includes(tool)) for (const e of config.entries("soft")) if (e.key === "on") root.appendChild(control("soft", e));
    // 拾取范围（自由建模，按「点 > 边 > 面」抓东西的工具；tool-config.ts pick；user 10-28 晚「放在马前炮」）：挂在工具自己的选项后面
    if (editor.modeId === "freeform" && stanceOf("freeform", tool)?.grab === "element") root.appendChild(pickToggles());
    for (const a of actions) root.appendChild(actionBtn(a));
    if (sel.length) {
      if (hasTool) { const sep = document.createElement("span"); sep.className = "bar-sep"; sep.setAttribute("aria-hidden", "true"); root.appendChild(sep); }
      for (const it of sel) root.appendChild(selectionBtn(it));
    }
    p.afterRender?.();
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
    b.addEventListener("click", () => p.pickSelection?.(it.id, b));
    return b;
  };
  // 拾取三颗图标开关（user 10-28 夜「拾取能不能点边面自己就是toggleable，最好换成icon」）：各管各的；
  // 关掉最后亮着的那颗 = 三颗全亮——全关在 selecting.ts pickKinds 里本来就当全开，照实画出来，不画一排全灭却照样都点得中
  const pickToggles = (): HTMLElement => {
    const wrap = document.createElement("span"); wrap.className = "strip-field"; wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", "拾取");
    const lab = document.createElement("span"); lab.className = "strip-label"; lab.textContent = "拾取"; wrap.appendChild(lab);
    const es = config.entries("pick");
    for (const e of es) {
      const on = !!e.value, b = document.createElement("button"); b.type = "button"; b.className = "strip-icon-toggle" + (on ? " on" : "");
      b.title = `拾取${e.def.label}`; b.setAttribute("aria-pressed", on ? "true" : "false"); b.dataset.pick = e.key;
      b.innerHTML = iconHtml(e.def.kind === "bool" && e.def.icon ? e.def.icon : "icon-missing");
      b.addEventListener("click", () => {
        const next = pickAfter(Object.fromEntries(es.map((x) => [x.key, !!x.value])) as PickSet, e.key as PickKind, "toggle");   // 按法一处定（pick-kinds.ts，和 1 / 2 / 3 键共用）
        for (const k of PICK_KINDS) config.set("pick", k as never, next[k] as never);
      });
      wrap.appendChild(b);
    }
    return wrap;
  };
  // 控件本体住 ui/field-control.ts（参数小窗共用，2026-10-25）；这里只把工具配置的值和写回接上
  const control = (tool: string, e: OptionEntry): HTMLElement => fieldControl(e.def, e.value as ParamValue, (v) => { config.set(tool as never, e.key as never, v as never); });
  config.subscribe(() => render());
  render();
  return { render };
}
