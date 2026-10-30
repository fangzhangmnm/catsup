// hierarchy-window.ts —— 层级浮窗：物件树（editor/object-tree.ts）画成一行一行，小三角 / 名字 / 小眼睛 / 「…」。created 2026-10-30 by Claude Opus 5.5
// 0.18 物品栏纪元 I1（设计稿 ai-docs/20261030-inventory-design.md §2 / §9.2；user 10-30「hierarchy就是有小三角有小眼睛的。右键或者点...就是物品按钮」）。
// · 一行 = 一个物件；组不进树（user 10-24「组永远不进hierarchy」）。第一行「根」= 模型最外一层（和左上面包屑同一个叫法）。
// · 点名字 = 选中它（先走进它挂的那一层）；双击 = 进去编辑；小眼睛 = 藏 / 显（一步撤销）；「…」/ 右键 = 菜单，和画布上右键同一张表
//   （物件行 = 物件菜单 objectMenuItems；根那行 = ROOT_MENU，见下）——不另拼菜单项，菜单对着谁就是谁的（设计稿 §2）。
// · 没起名（名字是四位十六进制码）= 淡色等宽（MoonSinger 没起名的歌同款）。
// · 根 = 普通组件（I13，user 10-30「我们要和godot一样根和其他节点一视同仁，然后右键菜单之类的也一样。都是普通的组件。可以改名。只是没有父亲没法爆炸罢了」）：
//   显示它的组件名、菜单和物件行同一个样子（改名… / 炸开 灰着 / 物件设置…）。
// · 第二页「资源」（I10 第一版，user「我们没有一个中心化的按引用计数的东西吗？学blender」「到时候也有这种引用和孤儿管理面板」）：scene/resources.ts 清点，
//   组件摆了几份 / 孤儿、材质用在几处 / 没人用；「清理没人用的组件…」= 确认框列名字 → purgeDefs 一步撤销。材质清理等身份换 GUID（I11）。
import type { Editor, PoolPick } from "../editor/editor.ts";
import { contextPath, hierarchyTree, isHex4, pathKey, pickKey, setHiddenOp, type HierNode } from "../editor/object-tree.ts";
import { census, orphanDefs } from "../scene/resources.ts";
import { createFloatWin, type FloatWin, type MenuWindowSpec } from "./ui/menu-window.ts";
import { openPopupMenu } from "./ui/popup-menu.ts";
import { iconHtml } from "./ui/icon.ts";
import { foldSubmenus } from "./context-menu.ts";
import { objectMenuItems } from "./selection-actions.ts";
import type { HudModel } from "./ui/hud-model.ts";
import type { PopupMenuItem } from "./ui/popup-menu.ts";

export interface HierarchyWindow { toggle(anchor: HTMLElement): void; isOpen(): boolean; refresh(): void }

type Page = "tree" | "res";
const PAGES: readonly { id: Page; label: string; icon: string }[] = [{ id: "tree", label: "层级", icon: "hierarchy-tree" }, { id: "res", label: "资源", icon: "object" }];
/** 根那一行的菜单：和物件行同一个样子；根没有父亲 = 炸开灰着（没有藏 / 锁：那是「摆出来的那一份」的属性，根没有那一份）。 */
const ROOT_MENU: PopupMenuItem<string>[] = [
  { id: "renameRoot", label: "改名…", icon: "rename" },
  { id: "explodeRoot", label: "炸开", icon: "explode-folder", disabled: true, hint: "根没有父亲，炸不开" },
  { id: "objectWindowSelf", label: "物件设置…", icon: "settings" },
];

export function createHierarchyWindow(editor: Editor, hud: HudModel, deps: { store: MenuWindowSpec<string>["store"]; after(): void; confirm(title: string, message: string, okLabel: string): Promise<boolean>; onOpenChange?(open: boolean): void }): HierarchyWindow {
  const fw: FloatWin = createFloatWin({ id: "hierarchy", title: "层级", store: deps.store, bodyClass: "tree-body", onOpenChange: (o) => { if (o) render(); deps.onOpenChange?.(o); } });
  const expanded = new Set<string>([""]);   // 展开着的行（键 = 一路的物件编号；只活这次）
  let sig = "", page: Page = "tree";
  const tabs = document.createElement("div"); tabs.className = "menu-tabs"; tabs.setAttribute("role", "tablist");
  const pane = document.createElement("div"); pane.className = "tree-pane";
  fw.body.append(tabs, pane);
  for (const p of PAGES) {
    const b = document.createElement("button"); b.type = "button"; b.className = "menu-tab"; b.dataset.page = p.id; b.setAttribute("role", "tab");
    b.innerHTML = `${iconHtml(p.icon)}<span>${p.label}</span>`;
    b.addEventListener("click", () => { page = p.id; sig = ""; render(); fw.clamp(); });
    tabs.append(b);
  }
  const titleEl = fw.el.querySelector(".float-title");

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
    openPopupMenu<string>({ anchor, align: "start", items: () => (n.kind === "root" ? ROOT_MENU : foldSubmenus(objectMenuItems(hud))), onPick: (id) => { hud.pick(id); deps.after(); } });
  };

  function render(): void {
    for (const b of tabs.children) { const on = (b as HTMLElement).dataset.page === page; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); }
    if (titleEl) titleEl.textContent = page === "tree" ? "层级" : "资源";
    pane.setAttribute("role", page === "tree" ? "tree" : "list");
    if (page === "res") { renderResources(); return; }
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
    const nextSig = "tree" + JSON.stringify(rows.map((r) => [r.n.key, r.n.label, r.n.hidden, r.n.locked, r.n.children.length, expanded.has(r.n.key), r.sel])) + hereKey;
    if (nextSig === sig) return;
    sig = nextSig;
    const body = pane;
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

  /** 资源页：组件（摆了几份 / 孤儿）+ 材质（用在几处 / 没人用）+ 清理没人用的组件。 */
  function renderResources(): void {
    const scene = editor.sceneRef, c = census(scene), orphans = orphanDefs(c);
    const nextSig = "res" + JSON.stringify([c.defs.map((d) => [d.def, d.name, d.live, d.users.length, d.placed]), c.materials.map((m) => [m.name, m.faces])]);
    if (nextSig === sig) return;
    sig = nextSig;
    pane.replaceChildren();
    const head = (text: string): void => { const h = document.createElement("div"); h.className = "res-head"; h.textContent = text; pane.append(h); };
    const row = (name: string, meta: string, opts: { unnamed?: boolean; orphan?: boolean; swatch?: string }): void => {
      const r = document.createElement("div"); r.className = `tree-row res-row${opts.orphan ? " is-orphan" : ""}`; r.setAttribute("role", "listitem");
      if (opts.swatch) { const sw = document.createElement("span"); sw.className = "res-swatch"; sw.style.background = opts.swatch; r.append(sw); }
      const nm = document.createElement("span"); nm.className = `tree-name${opts.unnamed ? " is-unnamed" : ""}`; nm.textContent = name;
      const mt = document.createElement("span"); mt.className = "res-meta"; mt.textContent = meta;
      r.append(nm, mt); pane.append(r);
    };
    const defs = [...c.defs].sort((a, b) => Number(b.live) - Number(a.live));
    head(`组件（${defs.length}）`);
    if (!defs.length) row("（还没有组件）", "", { orphan: true });
    for (const d of defs) row(d.name, d.live ? `摆了 ${d.placed} 份${d.users.length > d.placed ? `（另有 ${d.users.length - d.placed} 份在孤儿里）` : ""}` : d.users.length ? "孤儿（只摆在孤儿里）" : "孤儿（一份都没摆）", { unnamed: isHex4(d.name), orphan: !d.live });
    head(`材质（${c.materials.length}）`);
    if (!c.materials.length) row("（还没有材质）", "", { orphan: true });
    const rgb = (m: readonly number[]): string => `rgb(${m.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255)).join(",")})`;
    for (const m of c.materials) row(m.name, m.faces ? `用在 ${m.faces} 处` : "没人用", { orphan: !m.faces, swatch: rgb(scene.materials[m.index].color) });
    const foot = document.createElement("div"); foot.className = "res-foot";
    const purge = document.createElement("button"); purge.type = "button"; purge.className = "res-purge"; purge.disabled = !orphans.length;
    purge.textContent = orphans.length ? `清理没人用的组件（${orphans.length} 个）…` : "没有没人用的组件";
    purge.addEventListener("click", () => void (async () => {
      const ids = orphanDefs(census(editor.sceneRef)), names = ids.map((id) => `「${editor.sceneRef.def(id).name}」`);
      if (!ids.length) return;
      if (!(await deps.confirm("清理没人用的组件", `要删 ${ids.length} 个没摆在模型里的组件（被删的组件里摆着的、别处也没用的，一起算孤儿）：\n${names.join("、")}\n\n能撤销（一步）。`, `清理 ${ids.length} 个`))) return;
      editor.commitOp({ op: "purgeDefs", defs: ids });
      deps.after(); render();
    })());
    foot.append(purge);
    const unusedMats = c.materials.filter((m) => !m.faces).length;
    if (unusedMats) { const note = document.createElement("div"); note.className = "res-note"; note.textContent = `没人用的材质 ${unusedMats} 个：材质现在按「第几个」编号，删一个后面全挪号；清理等材质换成永久编号（GUID）以后做。`; foot.append(note); }
    pane.append(foot);
  }

  return {
    toggle: (anchor) => fw.toggle(anchor, "start"),
    isOpen: () => fw.isOpen(),
    refresh: () => { if (fw.isOpen()) render(); },
  };
}
