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
import { actionById, routesOf } from "../editor/commands/registry.ts";
import type { MenuSpec } from "./ui/menu-window.ts";
import type { AttributeRow } from "../scene/attribute-list.ts";
import { bytesSay, typeSay } from "./attribute-names.ts";
import { castChoices, kindPageOf, newChildChoices, newChildKindOf, type KindPageRow } from "./kind-pages.ts";
import { hex4 } from "../config.ts";
import { CAST_ACTIONS } from "../editor/objects/index.ts";
import type { ParamValue } from "../editor/param-panel.ts";

export type ObjectTarget = Exclude<MenuTarget, "selection">;
/**
 * 四页（第 1 版第五节第 2 条；物体种类施工稿第三节，user 11-13 夜定）：物体 = 设置的是谁 + 物件级动词（转种类，以后创建父物体 / 新建子物体）；
 * 种类那一页（页名 = 种类的名字，空物体没有）= 种类自己报的字段 + 种类自己的动词（细分、默认平滑、接缝……）+ 机器（修复面板…）；
 * 元素 = 只读；材质和贴图 = 只读 + 出口（把画拿掉，放置表 objectMaterials）。记住上次停在哪一页（跟文件走）。选了几种物体 = 没有种类页，动词都放物体页。
 */
function tabsFor(editor: Editor, target: ObjectTarget): readonly { id: string; label: string }[] {
  const def = soleDef(editor, target), kindTab = def === undefined ? null : kindPageOf(editor, def).tab;
  return [{ id: "object", label: "物体" }, ...(kindTab ? [{ id: "kind", label: kindTab }] : []), { id: "elements", label: "元素" }, { id: "materials", label: "材质和贴图" }];
}
// 每个种类自己的那几行字段 / 元素页 / 材质页 = kind-pages.ts（第 1 版第五节第 1、2 条）：这里不认识种类，照着画（守卫 test/kind-pages.test.ts：本文件不许出现种类的名字）。

/** 窗口要的（main.ts 给）：after = 改完刷 UI（syncUi）；openMachine = 开那台机器的板（修复页的「修复面板…」）。 */
export interface ObjectWindowDeps { after(): void; openMachine(m: Machine): void }
/** 这一层露着的机器（= 窗口里它们各一页；只在「这一层」上有：机器只对你所在的这一层说话）。 */
const machinesFor = (editor: Editor, target: ObjectTarget): readonly Machine[] => (target === "self" ? MACHINES.filter((m) => !m.when || m.when(editor)) : []);
/** 物件窗口的菜单（弹出版和浮窗版共用一份）：页签（这一层 = 属性 + 露着的机器）+ 内容 + 点了做什么。 */
export function objectWindowMenu(editor: Editor, hud: HudModel, target: ObjectTarget, deps: ObjectWindowDeps): MenuSpec<string> {
  const after = deps.after, machines = machinesFor(editor, target);
  // 每台露着的机器一行「<机器>面板…」= 开那块板（九条修复连同清理碎渣都在板上，不在这里再列一遍；user 10-30），住种类那一页（没有种类页 = 物体页）
  const tabs = tabsFor(editor, target), home = tabs.some((t) => t.id === "kind") ? "kind" : "object";
  return {
    tabs, tabKey: "objectWindow",
    items: () => [
      ...objectWindowItems(editor, target),
      ...machines.map((m, i): PopupMenuItem<string> => ({ id: `machine:${m.id}:board`, label: `${m.label}面板…`, icon: m.icon, tab: home, ...(i === 0 ? { separatorBefore: true } : {}) })),
      ...objectElementItems(editor, target),
      ...objectMaterialItems(editor, target),
    ],
    onPick: (id) => {
      if (id.startsWith("machine:")) {   // 机器页：「修复面板…」= 开那台机器的板；别的 = 在这一层上跑那条指令（窗口不关，好接着修）
        const [, mid, ...rest] = id.split(":"), m = machines.find((x) => x.id === mid), cmd = rest.join(":");
        if (!m) return;
        if (!cmd.startsWith("action:")) { deps.openMachine(m); return; }
        editor.withMenuTarget("self", () => hud.pick(cmd)); after(); return "keep";
      }
      const def = soleDef(editor, target);
      const hit = def === undefined ? null : fieldChoice(kindPageOf(editor, def).fields({ editor, def }), id);   // 种类自己的字段：选项 id = 「字段键:值」
      if (hit) { if (!hit.row.off) hit.row.set(hit.value); after(); return "keep"; }
      { const k = newChildKindOf(id); if (k) { editor.newChild(k, hex4()); after(); return; } }   // 新建子物体：进到新的那一层 = 窗口关掉
      if (id === "addParent") { editor.addParent(target, hex4()); after(); return; }
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

/** 动作归哪一页：全部路由都是物件族（吃摆着的一份实例、改它的定义：转种类这类）= 物体页；别的（这个种类自己的动词）= 种类页。 */
const objectFamily = (actionId: string): boolean => { const a = actionById(actionId); return !!a && routesOf(a).every((r) => r.kind === "object"); };
const actionItems = (acts: readonly { id: string; label: string; icon: string; submenu?: { label: string; item: string } }[]): HudItem[] =>
  acts.map((m): HudItem => ({ id: `action:${m.id}`, label: m.label, icon: m.icon, ...(m.submenu ? { submenu: m.submenu } : {}) }));
/** 物体页 + 种类那一页显示什么（纯函数：探针 / 测试也能问）。 */
export function objectWindowItems(editor: Editor, target: ObjectTarget): PopupMenuItem<string>[] {
  const who = editor.describeTarget(target), def = soleDef(editor, target), kindTab = tabsFor(editor, target).some((t) => t.id === "kind");
  const acts = editor.withMenuTarget(target, () => editor.commandMenu("objectWindow"));   // 放置表 objectWindow 面上现在能做的
  const casts = def === undefined ? null : castChoices(editor, def), castIds = new Set(Object.values(CAST_ACTIONS));
  const own = (kindTab ? acts.filter((m) => objectFamily(m.id)) : acts).filter((m) => !casts || !castIds.has(m.id)), kinds = kindTab ? acts.filter((m) => !objectFamily(m.id)) : [];
  // 切换种类 ›（第 1 版第五节第 4 条）：一个物体时 = 列出能切到的每一种、右边说丢什么、走不通的灰掉写原因；选了好几个 = 照旧平铺的转换动作
  const castRow: PopupMenuItem<string>[] = casts?.length ? [{ id: "cast", label: "切换种类", icon: "object", children: casts.map((c) => ({ id: `action:${c.action}`, label: c.label, hint: c.off ?? c.hint, ...(c.off ? { disabled: true } : {}) })) }] : [];
  // 新建子物体 ›（第 1 版第五节第 5 条）：只在「这一层」（新的孩子长在你所在的这一层、落在它的原点，建完直接进去）；选中的子物体那一份没有
  const newRow: PopupMenuItem<string>[] = target === "self" ? [{ id: "newChild", label: "新建子物体", icon: "object", children: newChildChoices().map((c) => ({ id: c.id, label: c.label })) }] : [];
  // 创建父物体（第 1 版第五节第 7 条；和切换种类是两个按钮）：新父亲 = 空物体，这个物体整个放到它下面、位置不动；做不了 = 灰掉写原因
  const parentWhy = editor.addParentWhy(target), parentRow: PopupMenuItem<string>[] = [{ id: "addParent", label: "创建父物体", icon: "object", ...(parentWhy ? { disabled: true, hint: parentWhy } : {}) }];
  // 坐标架（统筹 11-13 夜审查 a 第 2 条）：一行说明它现在是跟着原点还是另摆了；重置走放置表那一条（object.resetFrame，另摆了才露）
  const frameRow: PopupMenuItem<string>[] = def === undefined ? [] : [{ id: "frame", label: editor.sceneRef.def(def).frame ? "坐标架：另摆了（右边三色轴；重置 = 回到原点）" : "坐标架：跟着原点", note: true, tab: "object" }];
  const out: PopupMenuItem<string>[] = [{ id: "who", label: who.title, note: true, tab: "object" }, ...frameRow, ...[...castRow, ...parentRow, ...newRow, ...foldSubmenus(actionItems(own))].map((it) => ({ ...it, tab: "object" }))];   // 第一行：设置的是谁
  if (!kindTab) return out;
  const fields = def === undefined ? [] : kindPageOf(editor, def).fields({ editor, def });   // 这个种类自己报的字段（网格体 = 对称 + 镜像面）
  out.push(...[...fields.map(fieldItem), ...foldSubmenus(actionItems(kinds))].map((it) => ({ ...it, tab: "kind" })));
  if (!fields.length && !kinds.length) out.push({ id: "kind:none", label: "这个种类现在没有自己的选项", note: true, tab: "kind" });
  return out;
}
/** 「材质和贴图」页（第一版只看）：种类报的材质 / 画 / 贴图坐标几行 + 放置表 objectMaterials 面上的出口（把画拿掉）。纯函数。 */
export function objectMaterialItems(editor: Editor, target: ObjectTarget): PopupMenuItem<string>[] {
  const tab = "materials", def = soleDef(editor, target);
  if (def === undefined) return [{ id: "mat:none", label: "选了好几个物体：材质和贴图页一次只看一个", note: true, tab }];
  const rows = kindPageOf(editor, def).materials({ editor, def }).map((r, i): PopupMenuItem<string> => (r.kind === "note" ? { id: `mat:${i}`, label: r.text, note: true, tab, ...(r.section ? { sectionBefore: r.section } : {}) } : { ...fieldItem(r), tab }));
  const acts = editor.withMenuTarget(target, () => editor.commandMenu("objectMaterials"));
  return [...rows, ...foldSubmenus(actionItems(acts)).map((it, i) => ({ ...it, tab, ...(i === 0 ? { separatorBefore: true } : {}) }))];
}

/** 「元素」页的分组先后 = 几何那一行的先后（统筹 11-13 深夜：点 → 边 → 面 → 角）；没有列的组不出。 */
const ELEMENT_GROUPS: readonly { readonly on: AttributeRow["on"] | "point"; readonly title: string; readonly unit: string }[] = [
  { on: "point", title: "点上", unit: "个" }, { on: "edge", title: "边上", unit: "条" }, { on: "face", title: "面上", unit: "张" }, { on: "corner", title: "角上", unit: "个" },
];
/**
 * 「元素」页（属性地基轮 3½ 第一版：只看；删、改名、加一列在第二版）：几何个数一行 + 每一列一行（名字、类型、个数、大小），按挂在哪分组。
 * 网格体的行带小灰字原名（名字就是键）；硬表面的行不带（那套还没搬上属性表）、层是稀疏存的（「有 N 条 / 张」、大小「—」）。纯函数：探针 / 测试也能问。
 */
export function objectElementItems(editor: Editor, target: ObjectTarget): PopupMenuItem<string>[] {
  const tab = "elements", def = soleDef(editor, target);
  if (def === undefined) return [{ id: "el:none", label: "选了好几个物体：元素页一次只看一个", note: true, tab }];
  const page = kindPageOf(editor, def).elements({ editor, def });
  if ("none" in page) return [{ id: "el:none", label: page.none, note: true, tab }];
  const list = page.list, g = list.geometry;
  const geo = [`点 ${g.points}`, `边 ${g.edges}`, `面 ${g.faces}`, ...(g.corners !== null ? [`角 ${g.corners}`] : []), `不挂面的线 ${g.wires}`].join(" · ");
  const out: PopupMenuItem<string>[] = [{ id: "el:geometry", label: geo, readout: { cells: [] }, tab }];
  if (!list.rows.length) { out.push({ id: "el:empty", label: "还没有元素属性", note: true, tab }); return out; }
  out.push({ id: "el:head", label: "", readout: { cells: ["类型", "个数", "大小"] }, tab });
  for (const grp of ELEMENT_GROUPS) {
    const rows = list.rows.filter((r) => r.on === grp.on)
      .map((r) => ({ r, name: page.nameOf(r) }))
      .sort((a, b) => a.name.label.localeCompare(b.name.label, "zh") || a.r.id.localeCompare(b.r.id));
    rows.forEach(({ r, name }, i) => out.push({
      id: `el:${r.on}:${r.id}`, label: name.label, tab, ...(i === 0 ? { sectionBefore: grp.title } : {}),
      readout: { code: name.code, cells: [typeSay(r.type), r.sparse ? `有 ${r.count} ${grp.unit}` : String(r.count), r.bytes === null ? "—" : bytesSay(r.bytes)] },
    }));
  }
  return out;
}

/** 字段 → 窗口里的一行：枚举 / 开关 = 一排选项（选项 id = 「字段键:值」）；数值 = 先只显示（还没有种类报数值字段；要了再接参数小窗那个控件）。 */
function fieldItem(r: KindPageRow): PopupMenuItem<string> {
  if (r.kind === "note") return { id: `note:${r.text.slice(0, 16)}`, label: r.text, note: true };
  const off = r.off ? { hint: r.off } : {};
  if (r.def.kind === "enum") return { id: r.key, label: r.def.label, icon: r.icon, ...off, choices: r.def.values.map((v) => ({ id: `${r.key}:${v.id}`, label: v.label, ...(v.hint ? { hint: v.hint } : {}), checked: r.value === v.id })) };
  if (r.def.kind === "bool") return { id: r.key, label: r.def.label, icon: r.icon, ...off, choices: [{ id: `${r.key}:true`, label: "开", checked: r.value === true }, { id: `${r.key}:false`, label: "关", checked: r.value === false }] };
  return { id: r.key, label: `${r.def.label}：${String(r.value)}`, icon: r.icon, note: true };
}
/** 点的那个选项是哪个字段的哪个值（不是字段的选项 = null）。 */
function fieldChoice(rows: readonly KindPageRow[], id: string): { row: Extract<KindPageRow, { kind: "field" }>; value: ParamValue } | null {
  for (const row of rows) {
    if (row.kind !== "field" || !id.startsWith(`${row.key}:`)) continue;
    const raw = id.slice(row.key.length + 1);
    return { row, value: row.def.kind === "bool" ? raw === "true" : row.def.kind === "number" ? Number(raw) : raw };
  }
  return null;
}
