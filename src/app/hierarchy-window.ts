// hierarchy-window.ts —— 层级浮窗：物件树（editor/object-tree.ts）画成一行一行，小三角 / 名字 / 小眼睛 / 「…」。created 2026-10-30 by Claude Opus 5.5
// 0.18 物品栏纪元 I1（设计稿 ai-docs/20261030-inventory-design.md §2 / §9.2；user 10-30「hierarchy就是有小三角有小眼睛的。右键或者点...就是物品按钮」）。
// · 一行 = 一个物件；组不进树（user 10-24「组永远不进hierarchy」）。第一行「根」= 模型最外一层（和左上面包屑同一个叫法）。
// · 点名字 = 选中它（先走进它挂的那一层）；双击 = 进去编辑；小眼睛 = 藏 / 显（一步撤销）；「…」/ 右键 = 菜单，和画布上右键同一张表
//   （物件行 = 物件菜单 objectMenuItems；最外层那行 = 空白处菜单 menuItems(hud, "empty")）——不另拼菜单项，菜单对着谁就是谁的（设计稿 §2）。
// · 没起名（名字是四位十六进制码）= 淡色等宽（MoonSinger 没起名的歌同款）。
import type { Editor, PoolPick } from "../editor/editor.ts";
import { contextPath, hierarchyTree, pathKey, pickKey, setHiddenOp, type HierNode } from "../editor/object-tree.ts";
import { createFloatWin, type FloatWin, type MenuWindowSpec } from "./ui/menu-window.ts";
import { openPopupMenu } from "./ui/popup-menu.ts";
import { iconHtml } from "./ui/icon.ts";
import { foldSubmenus } from "./context-menu.ts";
import { menuItems, objectMenuItems } from "./selection-actions.ts";
import type { HudModel } from "./ui/hud-model.ts";

export interface HierarchyWindow { toggle(anchor: HTMLElement): void; isOpen(): boolean; refresh(): void }

export function createHierarchyWindow(editor: Editor, hud: HudModel, deps: { store: MenuWindowSpec<string>["store"]; after(): void; onOpenChange?(open: boolean): void }): HierarchyWindow {
  const fw: FloatWin = createFloatWin({ id: "hierarchy", title: "层级", store: deps.store, bodyClass: "tree-body", bodyRole: "tree", onOpenChange: (o) => { if (o) render(); deps.onOpenChange?.(o); } });
  const expanded = new Set<string>([""]);   // 展开着的行（键 = 一路的物件编号；只活这次）
  let sig = "";

  /** 走到 path 那一层（已经在那 = 不动）。 */
  const goTo = (path: readonly PoolPick[]): void => {
    if (pathKeyFull(contextPath(editor.sceneRef, editor.context)) === pathKeyFull(path)) return;
    editor.exitTo(0);
    for (const p of path) editor.enterPool(p);
  };
  const pathKeyFull = (path: readonly PoolPick[]): string => path.map(pickKey).join("/");
  const select = (n: HierNode): void => {
    if (n.kind === "root") { goTo([]); editor.selectPools([]); deps.after(); return; }
    goTo(n.path.slice(0, -1)); editor.selectPools([n.path[n.path.length - 1]]); deps.after();
  };
  const openMenu = (n: HierNode, anchor: HTMLElement): void => {
    select(n);
    openPopupMenu<string>({ anchor, align: "start", items: () => foldSubmenus(n.kind === "root" ? menuItems(hud, "empty") : objectMenuItems(hud)), onPick: (id) => { hud.pick(id); deps.after(); } });
  };

  function render(): void {
    const scene = editor.sceneRef, tree = hierarchyTree(scene), here = contextPath(scene, editor.context), hereKey = pathKey(here), hereFull = pathKeyFull(here);
    for (let i = 1; i <= here.length; i++) expanded.add(pathKey(here.slice(0, i)));   // 你所在的那一层一路展开
    const selected = new Set(editor.selectedPoolKeys());
    const rows: { n: HierNode; depth: number; sel: boolean }[] = [];
    const walk = (n: HierNode, depth: number): void => {
      const parentFull = pathKeyFull(n.path.slice(0, -1)), last = n.path[n.path.length - 1];
      rows.push({ n, depth, sel: !!last && parentFull === hereFull && selected.has(pickKey(last)) });
      if (expanded.has(n.key)) for (const c of n.children) walk(c, depth + 1);
    };
    walk(tree, 0);
    const nextSig = JSON.stringify(rows.map((r) => [r.n.key, r.n.label, r.n.hidden, r.n.locked, r.n.children.length, expanded.has(r.n.key), r.sel])) + hereKey;
    if (nextSig === sig) return;
    sig = nextSig;
    const body = fw.body;
    body.replaceChildren();
    for (const { n, depth, sel } of rows) {
      const row = document.createElement("div");
      row.className = "tree-row"; row.setAttribute("role", "treeitem"); row.dataset.key = n.key; row.style.paddingLeft = `${4 + depth * 14}px`;
      row.classList.toggle("is-here", n.key === hereKey); row.classList.toggle("is-selected", sel); row.classList.toggle("is-hidden", n.hidden);
      const caret = document.createElement("button"); caret.type = "button"; caret.className = "tree-caret"; caret.setAttribute("aria-label", expanded.has(n.key) ? "收起" : "展开");
      caret.textContent = n.children.length ? (expanded.has(n.key) ? "▾" : "▸") : ""; caret.disabled = !n.children.length;
      caret.addEventListener("click", (ev) => { ev.stopPropagation(); if (expanded.has(n.key)) expanded.delete(n.key); else expanded.add(n.key); render(); });
      const name = document.createElement("span"); name.className = `tree-name${n.unnamed ? " is-unnamed" : ""}`; name.textContent = n.label; name.title = n.unnamed ? `${n.label}（没起名）` : n.label;
      row.append(caret, name);
      if (n.locked) { const lk = document.createElement("span"); lk.className = "tree-lock"; lk.innerHTML = iconHtml("lock"); lk.title = "锁着"; row.append(lk); }
      if (n.kind !== "root") {
        const eye = document.createElement("button"); eye.type = "button"; eye.className = "tree-eye"; eye.title = n.hidden ? "显示" : "藏起来"; eye.innerHTML = iconHtml(n.hidden ? "visibility-hide" : "visibility-show");
        eye.addEventListener("click", (ev) => { ev.stopPropagation(); const op = setHiddenOp(editor.sceneRef, n, !n.hidden); if (op) { editor.commitOp(op); deps.after(); } });
        row.append(eye);
      }
      const more = document.createElement("button"); more.type = "button"; more.className = "tree-more"; more.title = "菜单"; more.innerHTML = iconHtml("more");
      more.addEventListener("click", (ev) => { ev.stopPropagation(); openMenu(n, more); });
      row.append(more);
      row.addEventListener("click", () => select(n));
      row.addEventListener("dblclick", () => { goTo(n.path); deps.after(); });
      row.addEventListener("contextmenu", (ev) => { ev.preventDefault(); openMenu(n, more); });
      body.append(row);
    }
  }

  return {
    toggle: (anchor) => fw.toggle(anchor, "start"),
    isOpen: () => fw.isOpen(),
    refresh: () => { if (fw.isOpen()) render(); },
  };
}
