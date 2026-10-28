// machine-window.ts —— 车间里的机器：一台机器 = 放置表的一个面 + 一个面板（一把军刀，装一个工作状态的低频指令）。created 2026-10-28 by Claude Fable 5.1。
// user 2026-10-28：「修复我建议是专门做一个窗口，修复是一个工具面包，类似瑞士军刀这种，而不是放在物体属性里面，因为物体属性还是多放字段，修复还是折腾几何的」
// 「以后低频指令都这么做，比如以后骨骼动画。可能就是一个工作状态用一把军刀」「就是相当于有好几个不同机器。每个机器一个面板，然后左栏是你的手和常用工具袋」「然后不同的tab是不同的车间」。
// 车间 = 工作台（左上那个下拉）；机器 = 下面 MACHINES 表的一行（在哪些车间露、钮的图标、面板里放置表之外还有什么）；手 + 工具袋 = 左栏（controller/stance.ts）。
// 加一台机器 = 放置表加一个面的词（commands/action.ts Surface）+ 这张表加一行 + 指令的放置写到那个面；面板、钮、按车间露都是通用的，不另写。
// 机器只对「你所在的这一层」说话（withMenuTarget("self")）；物体窗口（object-window.ts）是字段，不是机器。
import type { Editor } from "../editor/editor.ts";
import type { Surface } from "../editor/commands/action.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { togglePopupMenu, type PopupMenuItem } from "./ui/popup-menu.ts";
import { foldSubmenus } from "./context-menu.ts";

export interface Machine {
  /** 放置表里的面：这台机器的指令都放在这个词名下。 */
  readonly id: Surface;
  /** 钮的字 / 面板第一行。 */
  readonly label: string;
  readonly icon: string;
  /** 这台机器现在露不露（缺 = 一直露）。按身体种类 / 车间判。 */
  readonly when?: (editor: Editor) => boolean;
  /** 面板顶上、放置表之外的行（修复机器的「修复面板…」= 几步一起跑的复合入口，不是一条指令）。 */
  readonly head?: (editor: Editor, hud: HudModel) => HudItem[];
  /** 一条都没有时面板说什么。 */
  readonly none: (editor: Editor) => string;
}

/** 机器表：一行一台。 */
export const MACHINES: readonly Machine[] = [
  // 修复 = 硬表面体的几何工具面包（九条修复 + 修复面板…；只在硬表面体里露）
  { id: "repairWindow", label: "修复", icon: "wrench", when: (e) => e.activeKind() === "brep", head: (_e, hud) => hud.edits().filter((it) => it.id === "repairPanel" && !it.hidden), none: () => "没有要修的" },
];

/** 开一台机器的面板（钮上开 = 再点一下关）；after = 做完刷 UI（main.ts syncUi）。 */
export function openMachineWindow(editor: Editor, hud: HudModel, m: Machine, anchor: HTMLElement, after: () => void, align: "start" | "end" = "end"): void {
  togglePopupMenu<string>({
    anchor, align,
    items: () => machineItems(editor, hud, m),
    onPick: (id) => { editor.withMenuTarget("self", () => hud.pick(id)); after(); },   // 单位只在 runAction 开头取一次 → 马后炮重做也用同一批
  });
}

/** 面板里显示什么（纯函数：探针 / 测试也能问）：第一行 = 机器名 + 这一层是谁；然后 head 行 + 放置表这个面上现在能做的（带数量；同名子菜单折成一行）。 */
export function machineItems(editor: Editor, hud: HudModel, m: Machine): PopupMenuItem<string>[] {
  const who = editor.describeTarget("self");
  const head = m.head?.(editor, hud) ?? [];
  const acts = editor.withMenuTarget("self", () => editor.commandMenu(m.id));
  const rows = foldSubmenus([...head, ...acts.map((a): HudItem => ({ id: `action:${a.id}`, label: a.label, icon: a.icon, ...(a.submenu ? { submenu: a.submenu } : {}) }))]);
  if (!rows.length) rows.push({ id: "none", label: m.none(editor), note: true });
  return [{ id: "who", label: `${m.label}：${who.title}`, note: true }, ...rows];
}
