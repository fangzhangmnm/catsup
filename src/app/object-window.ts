// object-window.ts —— 物体窗口（UX 心智模型 §2.1「一个窗口只看一个指针」/ §2.2 菜单三层；created 2026-10-28 by Claude Fable 5.1）。
// user 2026-10-28：「自己的object property: 物体设置选窗」「选窗要说明选择的是哪个object」「镜像细分默认平滑这些都收到选窗里面」
// 「选中的只有组件 → 不是直接开物体窗口，而是物体的菜单……物体选项只是其中一项」「物体属性的镜像面不能拖。是工具的镜像面可以拖」
// 「不要blender的object property……它把所有相关的context堆在一起了」「物体属性还是多放字段，修复还是折腾几何的」（修复是机器，machine-window.ts）。
// 2026-10-29 user「修复菜单不应该挂在视图那边，而是物品选项里面的一个tab」→ 10-30「物件的清理碎渣为什么不放到修复面板里面，那样物件就不需要分tab了。然后可以恢复成菜单的样式而不是浮窗」：
// 不分页签——字段 + 物件级动词下面一行「修复面板…」开那台机器的板（九条修复连同清理碎渣都在板上，这里不再列一遍）；这一层也是弹出菜单，不是常驻浮窗。
// 指针（当前 = 谁）：self = 你所在的这一层（右边「物体」钮）；children = 选中的子组件（物体菜单 / 浮条的「物体设置…」）。窗口第一行写清是谁。
// 内容 = 字段 + 物体级动词：对称 + 镜像面（网格体）、转换种类、细分、默认平滑 ›。本体 = 共享 popup-menu（下拉行）；动词来自放置表 objectWindow 面
// （editor.commandMenu("objectWindow")），数和跑都在 editor.withMenuTarget(target) 里。
import type { Editor, MenuTarget } from "../editor/editor.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { openPopupMenu, togglePopupMenu, type PopupMenuItem } from "./ui/popup-menu.ts";
import { foldSubmenus } from "./context-menu.ts";
import { MACHINES, type Machine } from "./machine-window.ts";
import type { MenuSpec } from "./ui/menu-window.ts";
import type { MirrorAxis, MirrorMode } from "../mesh/mirror.ts";

export type ObjectTarget = Exclude<MenuTarget, "selection">;
// 强行对称排第一 = 主入口（user 10-28「就是水杉和blender那种啊，强行对称」）；镜像编辑 = 只挪点的那种（Blender 编辑模式的 X 镜像）
const MIRROR_MODES: readonly { id: "off" | MirrorMode; label: string; hint: string }[] = [
  { id: "off", label: "关", hint: "不镜" },
  { id: "force", label: "强行对称", hint: "沿镜像面切开、另一半镜过来，每一步都镜" },
  { id: "edit", label: "镜像编辑", hint: "只挪点：对面的点一起改" },
];

/** 窗口要的（main.ts 给）：after = 改完刷 UI（syncUi）；openMachine = 开那台机器的板（修复页的「修复面板…」）。 */
export interface ObjectWindowDeps { after(): void; openMachine(m: Machine): void }
/** 这一层露着的机器（= 窗口里它们各一页；只在「这一层」上有：机器只对你所在的这一层说话）。 */
const machinesFor = (editor: Editor, target: ObjectTarget): readonly Machine[] => (target === "self" ? MACHINES.filter((m) => !m.when || m.when(editor)) : []);
/** 物件窗口的菜单（弹出版和浮窗版共用一份）：页签（这一层 = 属性 + 露着的机器）+ 内容 + 点了做什么。 */
export function objectWindowMenu(editor: Editor, hud: HudModel, target: ObjectTarget, deps: ObjectWindowDeps): MenuSpec<string> {
  const after = deps.after, machines = machinesFor(editor, target);
  // 不分页签（user 10-30「物件的清理碎渣为什么不放到修复面板里面，那样物件就不需要分tab了。然后可以恢复成菜单的样式而不是浮窗」）：
  // 字段 + 物件级动词，下面每台露着的机器一行「<机器>面板…」= 开那块板（九条修复连同清理碎渣都在板上，不在这里再列一遍）
  return {
    items: () => [...objectWindowItems(editor, target), ...machines.map((m, i): PopupMenuItem<string> => ({ id: `machine:${m.id}:board`, label: `${m.label}面板…`, icon: m.icon, ...(i === 0 ? { separatorBefore: true } : {}) }))],
    onPick: (id) => {
      if (id.startsWith("machine:")) {   // 机器页：「修复面板…」= 开那台机器的板；别的 = 在这一层上跑那条指令（窗口不关，好接着修）
        const [, mid, ...rest] = id.split(":"), m = machines.find((x) => x.id === mid), cmd = rest.join(":");
        if (!m) return;
        if (!cmd.startsWith("action:")) { deps.openMachine(m); return; }
        editor.withMenuTarget("self", () => hud.pick(cmd)); after(); return "keep";
      }
      const def = soleDef(editor, target);
      if (id.startsWith("mirror:mode:")) { const m = id.slice("mirror:mode:".length); editor.setMirror(m === "off" ? null : (m as MirrorMode), undefined, def); after(); return "keep"; }
      if (id.startsWith("mirror:axis:")) { editor.setMirror(editor.mirrorOf(def)?.mode ?? "edit", Number(id.slice("mirror:axis:".length)) as MirrorAxis, def); after(); return "keep"; }
      if (id.startsWith("action:")) { editor.withMenuTarget(target, () => hud.pick(id)); after(); return; }   // 单位只在 runAction 开头取一次 → 马后炮重做也用同一批（跑完目标恢复成选区没关系）
      return "keep";
    },
  };
}
/** 物件窗口 = 弹出菜单（这一层 = 左上物件钮 / 空白处「物件设置…」，再点一下钮收起；选中的子组件 = 物体菜单 / 浮条的「物体设置…」）。2026-10-30 起这一层也不再是常驻浮窗。 */
export function openObjectWindow(editor: Editor, hud: HudModel, target: ObjectTarget, anchor: HTMLElement, deps: ObjectWindowDeps, align: "start" | "end" = "end"): void {
  (target === "self" ? togglePopupMenu : openPopupMenu)<string>({ anchor, align, ...objectWindowMenu(editor, hud, target, deps) });
}

/** 窗口正对着的唯一定义（对称这种「属性」只对一个定义有意义；选了几种物体 = 没有当前）。 */
function soleDef(editor: Editor, target: ObjectTarget): number | undefined { const d = editor.describeTarget(target).defs; return d.length === 1 ? d[0] : undefined; }

/** 窗口里显示什么（纯函数：探针 / 测试也能问）。 */
export function objectWindowItems(editor: Editor, target: ObjectTarget): PopupMenuItem<string>[] {
  const who = editor.describeTarget(target), def = soleDef(editor, target);
  const out: PopupMenuItem<string>[] = [{ id: "who", label: who.title, note: true }];   // 第一行：设置的是谁
  // 对称 = 网格体的属性（硬表面体没有；转成网格体之后才有）。镜像面只能选不能拖（拖的是工具「镜像…」的那张面）
  const isMesh = def !== undefined && editor.kindOfDef(def) === "mesh", ms = isMesh ? editor.mirrorOf(def) : null;
  if (isMesh) {
    out.push({ id: "mirror:mode", label: "对称", icon: "axes", choices: MIRROR_MODES.map((m) => ({ id: `mirror:mode:${m.id}`, label: m.label, hint: m.hint, checked: (ms?.mode ?? "off") === m.id })) });
    if (ms) out.push({ id: "mirror:axis", label: "镜像面", icon: "axes", choices: ([0, 1, 2] as const).map((a) => ({ id: `mirror:axis:${a}`, label: "XYZ"[a], hint: `物件自己的 ${"XYZ"[a]} = 0 这一面`, checked: ms.axis === a })) });
  }
  // 放置表 objectWindow 面上现在能做的（转换种类 / 细分 / 默认平滑 ›）
  const acts = editor.withMenuTarget(target, () => editor.commandMenu("objectWindow"));
  out.push(...foldSubmenus(acts.map((m): HudItem => ({ id: `action:${m.id}`, label: m.label, icon: m.icon, ...(m.submenu ? { submenu: m.submenu } : {}) }))));
  return out;
}
