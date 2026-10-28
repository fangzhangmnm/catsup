// context-menu.ts —— 选区上下文菜单 + 选区浮条（#19，2026-10-21，Claude Fable 5.1）。
// user 2026-10-21：「component相关的是否右键菜单是最好的选项。然后ipad怎么办，长按吗？」
// 一份内容（= HudModel.edits() 去掉撤销 / 重做）、三个入口：桌面右键（任何工具，SU 同款：指针下的东西不在选区就先选它）、
// 触屏长按（只在选择工具里，gestures.ts 计时）、顶部选区浮条（选中东西就出现，零长按可发现）。菜单本体 = 共享 popup-menu 深模块，
// 定位靠一个 0×0 的锚点元素挪到指针处。
import type { Editor } from "../editor/editor.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { openPopupMenu, type PopupMenuItem } from "./ui/popup-menu.ts";
import { iconHtml } from "./ui/icon.ts";
import { type SelectionRoute, selectionActions } from "./selection-actions.ts";

/** 在画布点 (x, y)（client 坐标 cx, cy）弹菜单。没有可做的动作就不弹。 */
export function openContextMenuAt(editor: Editor, hud: HudModel, x: number, y: number, cx: number, cy: number): void {
  const hit = editor.pickAt(x, y);
  const hasHit = hit.face !== undefined || hit.edge !== undefined || hit.vertex !== undefined;
  editor.noteContextPoint(x, y, !hasHit);   // 新建物体的落点；空白处右键 = 自己的菜单（新建那几项只在这时露）
  if (hasHit && !editor.hitInSelection(hit)) editor.selectExpand(hit, 0);
  const items = selectionActions(hud);
  if (!items.length) return;
  let anchor = document.getElementById("ctxAnchor") as HTMLElement | null;
  if (!anchor) { anchor = document.createElement("div"); anchor.id = "ctxAnchor"; document.body.appendChild(anchor); }
  anchor.style.left = `${cx}px`; anchor.style.top = `${cy}px`;
  openPopupMenu({
    anchor,
    items: () => foldSubmenus(selectionActions(hud)),
    onPick: (id) => { hud.pick(id); },
  });
}

/** 表 → 右键菜单的行：带 submenu 的几项按子菜单名并成一行（摆在第一项的位置），其余原样。 */
export function foldSubmenus(items: readonly HudItem[]): PopupMenuItem[] {
  const out: PopupMenuItem[] = [], groups = new Map<string, PopupMenuItem>();
  for (const it of items) {
    if (!it.submenu) { out.push({ id: it.id, label: it.label, icon: it.icon, disabled: it.disabled }); continue; }
    let g = groups.get(it.submenu.label);
    if (!g) { g = { id: `submenu:${it.submenu.label}`, label: it.submenu.label, icon: it.icon, children: [] }; groups.set(it.submenu.label, g); out.push(g); }
    g.children!.push({ id: it.id, label: it.submenu.item, icon: it.icon, disabled: it.disabled, ...(it.active !== undefined ? { checked: it.active } : {}) });   // 子菜单里的开关项带勾（镜像 › 关 / 镜像编辑 / 强行对称 / 轴）
  }
  return out;
}

// （顶部选区浮条 mountSelectionBar 2026-10-24 并进 context-bar.ts 的上下文条，A25）
