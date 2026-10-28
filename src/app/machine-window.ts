// machine-window.ts —— 车间里的机器：一台机器 = 放置表的一个面 + 一块指令板（一把军刀，装一个工作状态的低频指令）。created 2026-10-28 by Claude Fable 5.1；v0.16.20 面板 → 浮板（指令板，Claude Opus 5.5）。
// user 2026-10-28：「修复我建议是专门做一个窗口，修复是一个工具面包，类似瑞士军刀这种，而不是放在物体属性里面，因为物体属性还是多放字段，修复还是折腾几何的」
// 「以后低频指令都这么做，比如以后骨骼动画。可能就是一个工作状态用一把军刀」「就是相当于有好几个不同机器。每个机器一个面板，然后左栏是你的手和常用工具袋」「然后不同的tab是不同的车间」。
// 车间 = 工作台（左上那个下拉）；机器 = 下面 MACHINES 表的一行（在哪些车间露、钮的图标、面板里放置表之外还有什么）；手 + 工具袋 = 左栏（controller/stance.ts）。
// 加一台机器 = 放置表加一个面的词（commands/action.ts Surface）+ 这张表加一行 + 指令的放置写到那个面；面板、钮、按车间露都是通用的，不另写。
// 机器只对「你所在的这一层」说话（withMenuTarget("self")）；物体窗口（object-window.ts）是字段，不是机器。
import type { Editor } from "../editor/editor.ts";
import type { Surface } from "../editor/commands/action.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import type { PopupMenuItem } from "./ui/popup-menu.ts";
import { closeBoard, currentBoard, openBoard, type BoardPosStore } from "./ui/command-board.ts";
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

/** 板要的东西（main.ts 给）：位置记在这台设备；参数区（右下角那一块，vcb.ts）在板开着、正在用这台机器的马前炮时住进板里；手机竖屏抽屉和物品栏抢同一个位置。 */
export interface MachineBoardDeps {
  store: BoardPosStore;
  params: { setHome(el: HTMLElement | null, accepts?: () => boolean): void };
  /** 抽屉模式（手机竖屏）开了：物品栏收起。 */
  onDrawer(): void;
  /** 做完刷 UI（main.ts syncUi）。 */
  after(): void;
}
let liveBoard: { m: Machine; refresh(): void } | null = null;
/** 板上的数（几处可修）跟着模型变：syncUi 调。 */
export function refreshMachineBoard(): void { liveBoard?.refresh(); }

/**
 * 开一台机器的指令板（钮上开 = 再点一下关；UX 心智模型 §8 补 4：大机器 = 子工作流，板上每颗钮只路由到注册表的指令）。
 * 板 = 浮板（ui/command-board.ts：一次一块、能拖、长按标题归位、手机竖屏 = 底部抽屉）；内容 = 放置表这一面上的指令（带数量，点 = 跑，板不关）
 * + 正在用的那条的参数（马前炮：右下角那一块参数区住进板里，同一套控件；应用完的马后炮回右下角）。
 * 修复这台：开板 = 直接进修复面板（勾哪几步 + 检查 + 应用）——它就是修复的子工作流；关板 = 没应用的修复面板一起收。
 */
export function openMachineWindow(editor: Editor, hud: HudModel, m: Machine, anchor: HTMLElement, deps: MachineBoardDeps): void {
  if (currentBoard()?.id === m.id) { closeBoard(); return; }
  const body = document.createElement("div"); body.className = "board-machine";
  const paramsSlot = document.createElement("div"); paramsSlot.className = "board-params";
  const list = document.createElement("div"); list.className = "board-list";
  body.append(paramsSlot, list);
  const ownsSession = (): boolean => m.id === "repairWindow" && editor.repairPanelOpen() && editor.paramPanel()?.phase === "before";
  const run = (id: string): void => { editor.withMenuTarget("self", () => hud.pick(id)); deps.after(); refresh(); };   // 单位只在 runAction 开头取一次 → 马后炮重做也用同一批
  const refresh = (): void => {
    const items = machineItems(editor, hud, m);
    board.setTitle(String(items[0]?.label ?? m.label));
    list.replaceChildren();
    for (const it of items.slice(1)) {
      if (it.note) { const d = document.createElement("div"); d.className = "board-note"; d.textContent = it.label; list.appendChild(d); continue; }
      const kids = it.children ?? [it];
      for (const k of kids) {
        if (k.id === "repairPanel" && ownsSession()) continue;   // 修复面板已经在板上开着
        const b = document.createElement("button"); b.type = "button"; b.className = "board-cmd"; b.dataset.cmd = k.id; b.disabled = !!k.disabled;
        b.textContent = k.label + (k.hint ? `　${k.hint}` : "");
        b.addEventListener("click", () => run(k.id));
        list.appendChild(b);
      }
    }
  };
  const r = anchor.getBoundingClientRect();
  const board = openBoard({
    id: m.id, title: m.label, body, store: deps.store, onDrawer: deps.onDrawer,
    defaultPos: () => ({ x: r.left - 320, y: Math.max(60, r.top - 20) }),
    onClose: () => {
      liveBoard = null;
      if (ownsSession()) editor.pressParam("cancel");   // 没应用的修复面板跟着板一起收（不然它会掉到右下角）
      deps.params.setHome(null);
      deps.after();
    },
  });
  deps.params.setHome(paramsSlot, ownsSession);
  liveBoard = { m, refresh };
  if (m.id === "repairWindow" && editor.repairWorth() && !editor.repairPanelOpen()) editor.withMenuTarget("self", () => editor.beginRepairPanel());   // 开板 = 进修复面板（子工作流）
  refresh();
  deps.after();
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
