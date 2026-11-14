// hierarchy-window.ts —— 层级浮窗：物件树（editor/object-tree.ts）画成一行一行，小三角 / 名字 / 小眼睛 / 「…」。created 2026-10-30 by Claude Opus 5.5
// 0.18 物品栏纪元 I1（设计稿 ai-docs/20261030-inventory-design.md §2 / §9.2；user 10-30「hierarchy就是有小三角有小眼睛的。右键或者点...就是物品按钮」）。
// · 一行 = 一个物件；组不进树（user 10-24「组永远不进hierarchy」）。第一行「根」= 模型最外一层（和左上面包屑同一个叫法）。
// · 点名字 = 选中它（先走进它挂的那一层）；双击 = 进去编辑；小眼睛 = 藏 / 显（一步撤销）；「…」/ 右键 = 菜单，和画布上右键同一张表
//   （物件行 = 物件菜单 objectMenuItems；根那行 = ROOT_MENU，见下）——不另拼菜单项，菜单对着谁就是谁的（设计稿 §2）。
// · 没起名（名字是四位十六进制码）= 淡色等宽（MoonSinger 没起名的歌同款）。
// · 根 = 普通组件（I13，user 10-30「我们要和godot一样根和其他节点一视同仁，然后右键菜单之类的也一样。都是普通的组件。可以改名。只是没有父亲没法爆炸罢了」）：
//   显示它的组件名、菜单和物件行同一个样子（改名… / 炸开 灰着 / 物件设置…）。
// · 第二页「资源」（标题「层级 ▾」下拉换页；I10 第一版，user「我们没有一个中心化的按引用计数的东西吗？学blender」「到时候也有这种引用和孤儿管理面板」）：scene/resources.ts 清点，
//   组件摆了几份 / 孤儿、材质用在几处 / 只在孤儿里 / 没人用；「清理没人用的组件…」「清理没人用的材质…」= 确认框列名字 → purgeDefs / purgeMaterials 一步撤销（身份地基 ID-2）。
//   贴图（2026-11-10 贴图主线 1-0½，第一版，摆法以后磨）：名字 / 尺寸 / 几个材质在用；清掉材质图不跟着走（家规：不许顺手删别的条目）→ 没人用的在这里「清理没人用的贴图…」→ purgeTextures。
//   素材架（身份地基 ID-3，计划书 §15）：架上有东西才出那一节（按文件夹缩进、行尾「取下」）；组件 / 材质行尾「上架」；底部「从别的模型导入素材…」。架子是更新版写的 = 本版读不出、那一节只有一行说明，上架 / 导入 / 清理都不开（清理会删到看不见的架上的东西）。
// · 拖一行（I3，user 10-30「hierarchy拖拽同意」；身份地基 ID-2）：通用树拖拽 ui/tree-drag.ts 判落点（一行中间 = 放进去；缝 = 横向定深度）→ object-tree.ts moveRowOp。
//   换父亲（世界位置不变）= editor.oneStep 里「退到根 → 提交 → 走到新父亲那层 → 选中它」；同一层的缝 = 排到那个位置（文件里按这个顺序存）。都是一步撤销，这一份的 GUID 不变。
//   手指：长按起拖；长按没挪就松手 = 弹这一行的菜单（和画布长按同一个意思）。
import type { Editor, PoolPick } from "../editor/editor.ts";
import { contextPath, hierarchyTree, isHex4, moveRowOp, pathKey, pickKey, setHiddenOp, type HierNode } from "../editor/object-tree.ts";
import { attachTreeDrag, type TreeDrop } from "./ui/tree-drag.ts";
import { copiesNote } from "../editor/objects/move-to.ts";
import { census, orphanDefs, unusedMaterials, unusedTextures } from "../scene/resources.ts";
import { createFloatWin, type FloatWin, type MenuWindowSpec } from "./ui/menu-window.ts";
import type { ShelfActions } from "./shelf-actions.ts";
import { openPopupMenu } from "./ui/popup-menu.ts";
import { iconHtml } from "./ui/icon.ts";
import { foldSubmenus } from "./context-menu.ts";
import { objectMenuItems } from "./selection-actions.ts";
import type { HudModel } from "./ui/hud-model.ts";
import type { PopupMenuItem } from "./ui/popup-menu.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { newChildChoices, newChildKindOf } from "./kind-pages.ts";
import { hex4 } from "../config.ts";

export interface HierarchyWindow { toggle(anchor: HTMLElement): void; isOpen(): boolean; refresh(): void }

type Page = "tree" | "res";
const MERGE_PREF = "hier.mergeCopies";
/** 种类小图标（图标库待过目层 kind-brep / kind-mesh，Opus 10-30 自画）；以后的种类（化身 / 公告板 / 灯…）加一行。 */
const KIND_ICON: Record<string, string> = { brep: "kind-brep", mesh: "kind-mesh" };
const kindIcon = (k: string): string => KIND_ICON[k] ?? "object";
const KIND_LABEL: Record<string, string> = { brep: "硬表面体", mesh: "网格体" };
const ROW_PAD = 4, INDENT = 14, CARET_W = 24;   // 行左边距 / 一层缩进 / 小三角宽（含间隙）：拖拽插入线按它们画
const PAGES: readonly { id: Page; label: string; icon: string }[] = [{ id: "tree", label: "层级", icon: "hierarchy-tree" }, { id: "res", label: "资源", icon: "object" }];
/** 根那一行的菜单：和物件行同一个样子；根没有父亲 = 炸开灰着（没有藏 / 锁：那是「摆出来的那一份」的属性，根没有那一份）。 */
const ROOT_MENU: PopupMenuItem<string>[] = [
  { id: "renameRoot", label: "改名…", icon: "rename" },
  { id: "explodeRoot", label: "炸开", icon: "explode-folder", disabled: true, hint: "根没有父亲，炸不开" },
  { id: "objectWindowSelf", label: "物件设置…", icon: "settings" },
];

export function createHierarchyWindow(editor: Editor, hud: HudModel, deps: { store: MenuWindowSpec<string>["store"]; after(): void; shelf: ShelfActions; confirm(title: string, message: string, okLabel: string): Promise<boolean>; hint(text: string): void; /** 这台设备记的开关（「同一组件合成一行」）。 */ pref: { get(key: string): string | null; set(key: string, value: string): void }; onOpenChange?(open: boolean): void }): HierarchyWindow {
  // 换页 = 标题下拉（user 10-30「两个大按钮太占地方了。我想的是窗口名字就是下拉」）
  const fw: FloatWin = createFloatWin({ id: "hierarchy", title: "层级", store: deps.store, bodyClass: "tree-body", onOpenChange: (o) => { if (o) render(); deps.onOpenChange?.(o); },
    titleMenu: {
      items: () => [...PAGES.map((p) => ({ id: p.id, label: p.label, icon: p.icon, checked: page === p.id })),
        { id: "mergeCopies", label: "同一组件合成一行（×N）", checked: merge, sectionBefore: "显示" }],
      onPick: (id) => { if (id === "mergeCopies") { merge = !merge; deps.pref.set(MERGE_PREF, merge ? "1" : "0"); } else page = id as Page; sig = ""; render(); fw.clamp(); },
    } });
  let merge = deps.pref.get(MERGE_PREF) !== "0";   // 默认开（user 10-30「hierarchy显示的时候应该collapse同实例变成 x几，可以开这个开关」）
  const expanded = new Set<string>([""]);   // 展开着的行（键 = 一路的物件编号；只活这次）
  let sig = "", page: Page = "tree";
  const pane = document.createElement("div"); pane.className = "tree-pane";
  fw.body.append(pane);
  let shown: { n: HierNode; depth: number }[] = [];   // 层级页现在画着的行（拖拽按它判）
  attachTreeDrag(pane, {
    rowSelector: ".tree-row", indent: INDENT, lineLeft: ROW_PAD + CARET_W, minDepth: 1, scroller: fw.body,
    rows: () => (page === "tree" ? shown : []),
    canDrag: (i) => page === "tree" && shown[i]?.n.kind === "instance",
    onDrop: (i, d) => dropRow(i, d),
    onHold: (i, el) => { const n = shown[i]?.n; if (n) openMenu(n, el.querySelector<HTMLElement>(".tree-more") ?? el); },
  });

  /** 走到 path 那一层（已经在那 = 不动）。 */
  const goTo = (path: readonly PoolPick[]): void => {
    if (pathKeyFull(contextPath(editor.sceneRef, editor.context)) === pathKeyFull(path)) return;
    editor.exitTo(0);
    for (const p of path) editor.enterPool(p);
  };
  const pathKeyFull = (path: readonly PoolPick[]): string => path.map(pickKey).join("/");
  /** 合成那一行的几份里，和第一份在同一层的那些（不同组里的选不到一起：选区只在一层里）。 */
  const sameLayer = (n: HierNode): HierNode[] => { const k = pathKeyFull(n.children[0].path.slice(0, -1)); return n.children.filter((m) => pathKeyFull(m.path.slice(0, -1)) === k); };
  const select = (n: HierNode): void => {
    if (n.kind === "root") { goTo([]); editor.selectPools([]); deps.after(); return; }
    if (n.kind === "copies") { const ms = sameLayer(n); goTo(ms[0].path.slice(0, -1)); editor.selectPools(ms.map((m) => m.path[m.path.length - 1])); deps.after(); return; }
    goTo(n.path.slice(0, -1)); editor.selectPools([n.path[n.path.length - 1]]); deps.after();
  };
  /** 改名 = 和「…」菜单的「改名…」同一条路（选中它 → 同一张改名单）。合成那一行 = 改组件名：挑一份没有自己名字的（有自己名字的那份改的是它自己）。 */
  const renameRow = (n: HierNode): void => {
    if (n.kind === "root") { select(n); hud.pick("renameRoot"); deps.after(); return; }
    const s0 = editor.sceneRef, own = (m: HierNode): boolean => { const last = m.path[m.path.length - 1]; return last?.kind === "instance" && s0.instance(m.def, last.instance).name !== undefined; };
    const one = n.kind === "copies" ? (sameLayer(n).find((m) => !own(m)) ?? sameLayer(n)[0]) : n;
    select(one); hud.pick("rename"); deps.after();
  };
  /** 拖完松手：换父亲 / 排到同一层的那个位置（一步撤销）；挡下来 / 原地不动 = 提示行说为什么。 */
  const dropRow = (i: number, d: TreeDrop): void => {
    const src = shown[i]?.n, tgt = shown[d.parent]?.n;
    if (!src || !tgt) return;   // （拖到合成那一行上 = moveRowOp 说「先展开」）
    const beforeRow = d.kind === "insert" && d.before !== null ? (shown[d.before]?.n ?? null) : null;
    const r = moveRowOp(editor.sceneRef, src, tgt, d.kind === "into" ? undefined : beforeRow);
    if (r === null) { deps.hint(d.kind === "into" ? `「${src.label}」本来就在「${tgt.label}」底下` : `「${src.label}」本来就排在这里`); return; }
    if ("why" in r) { deps.hint(`挪不了：${r.why}`); return; }
    const s0 = editor.sceneRef, copies = (def: number): number => (def === s0.root ? 1 : s0.instanceCount(def)), fromN = copies(r.from), intoN = copies(r.into);
    const instByGuid = (): number | undefined => [...editor.sceneRef.def(r.into).instances.values()].find((x) => x.guid === r.guid)?.id;
    if (r.index !== undefined) {   // 同一层排序：句柄不变，选中它（你在它里面的话退到它这一层）
      const self = src.path[src.path.length - 1], at = r.index;
      const moved = editor.oneStep(() => {
        editor.commitOp(r.op);
        if ([...editor.sceneRef.def(r.into).instances.values()][at]?.guid !== r.guid) return false;   // 没提交（演示锁）：编辑器已经说了原因
        goTo(src.path.slice(0, -1)); editor.selectPools([self]);
        return true;
      }, { title: "排序" });
      if (!moved) { deps.after(); return; }
      deps.hint(`把「${r.name}」排到${beforeRow ? `「${beforeRow.label}」前面` : "这一层最后"}${fromN > 1 ? `（这个组件摆了 ${fromN} 份，每份里的顺序都一起变）` : ""}`);
      deps.after();
      return;
    }
    const moved = editor.oneStep(() => {
      editor.exitTo(0);
      editor.commitOp(r.op);
      const fresh = instByGuid();
      if (fresh === undefined) return false;   // 没提交（演示锁 / 斜切护栏）：编辑器已经说了原因
      for (const p of tgt.path) editor.enterPool(p);
      editor.selectPools([{ kind: "instance", instance: fresh }]);
      return true;
    }, { title: "换父亲" });
    if (!moved) { deps.after(); return; }
    expanded.add(tgt.key);
    const notes = [copiesNote(null, fromN, "less"), copiesNote(tgt.label, intoN, "more")].filter(Boolean);   // 和「移到…」同一句（objects/move-to.ts copiesNote）
    deps.hint(`把「${r.name}」挪进「${tgt.label}」底下（位置不动${notes.length ? "；" + notes.join("；") : ""}）`);
    deps.after();
  };
  /** 新建子物体（第 1 版第五节第 5 条）：在这一行的物体里面建（先进到它里面，落在它的原点），建完直接进去；合成的那一行（×N）没有这一项（不知道进哪一份）。 */
  const newChildRow = (n: HierNode): PopupMenuItem<string>[] => (n.kind === "copies" ? [] : [{ id: "newChild", label: "新建子物体", icon: "object", children: newChildChoices().map((c) => ({ id: c.id, label: c.label })) }]);
  const newChildIn = (n: HierNode, kind: BodyKind): void => {
    const path = n.kind === "root" ? [] : n.path;
    goTo(path);
    if (pathKeyFull(contextPath(editor.sceneRef, editor.context)) !== pathKeyFull(path)) { deps.hint(`进不去「${n.label}」（锁着的先解锁），没建子物体`); deps.after(); return; }
    editor.newChild(kind, hex4()); deps.after();
  };
  const openMenu = (n: HierNode, anchor: HTMLElement): void => {
    select(n);
    openPopupMenu<string>({ anchor, align: "start", items: () => [...(n.kind === "root" ? ROOT_MENU : foldSubmenus(objectMenuItems(hud))), ...newChildRow(n)], onPick: (id) => { const k = newChildKindOf(id); if (k) { newChildIn(n, k); return; } hud.pick(id); deps.after(); } });
  };

  /** 展开 / 收起；合成那一行 = 手风琴：同一层一次只展开一组（user 10-30「可以做成手风琴展开，一次只能展开一个」）。 */
  function toggle(n: HierNode): void {
    if (expanded.has(n.key)) { expanded.delete(n.key); render(); return; }
    if (n.kind === "copies") { const sib = n.key.slice(0, n.key.lastIndexOf("|x") + 2); for (const k of [...expanded]) if (k !== n.key && k.startsWith(sib)) expanded.delete(k); }
    expanded.add(n.key); render();
  }
  function render(): void {
    fw.setTitle(PAGES.find((p) => p.id === page)!.label);
    pane.setAttribute("role", page === "tree" ? "tree" : "list");
    if (page === "res") { renderResources(); return; }
    const scene = editor.sceneRef, tree = hierarchyTree(scene, { mergeCopies: merge }), here = contextPath(scene, editor.context), hereKey = pathKey(here), hereFull = pathKeyFull(here);
    for (let i = 1; i <= here.length; i++) expanded.add(pathKey(here.slice(0, i)));   // 你所在的那一层一路展开
    const selected = new Set(editor.selectedPoolKeys());
    const rows: { n: HierNode; depth: number; sel: boolean; band: boolean }[] = [];
    const isSel = (m: HierNode): boolean => { const last = m.path[m.path.length - 1]; return !!last && pathKeyFull(m.path.slice(0, -1)) === hereFull && selected.has(pickKey(last)); };
    // 手风琴不是层级（user 10-30「同类折叠我说了是手风琴不是小三角，不要误导用户」）：那几份是同一层的兄弟，展开后画在同一深度、用一条竖线圈成一组；小三角只给真的父子
    const walk = (n: HierNode, depth: number, band = false): void => {
      if (n.kind === "copies" && n.children.some((c) => hereKey === c.key || hereKey.startsWith(c.key + "/"))) expanded.add(n.key);   // 你在其中一份里面 = 这一组展开
      const open = expanded.has(n.key);
      rows.push({ n, depth, band: band || (n.kind === "copies" && open), sel: n.kind === "copies" ? !open && n.children.some(isSel) : n.kind === "instance" && isSel(n) });   // 合成那一行收着时，里面有选中的就整行亮
      if (open) for (const c of n.children) n.kind === "copies" ? walk(c, depth, true) : walk(c, depth + 1, band);   // 摊开的那几份自己展开的内容也圈在这一组里
    };
    walk(tree, 0);
    const nextSig = "tree" + JSON.stringify(rows.map((r) => [r.n.key, r.n.label, r.n.body, r.n.count, r.n.hidden, r.n.locked, r.n.children.length, expanded.has(r.n.key), r.sel, r.depth, r.band])) + hereKey;
    shown = rows;
    if (nextSig === sig) return;
    sig = nextSig;
    const body = pane;
    body.replaceChildren();
    for (const { n, depth, sel, band } of rows) {
      const row = document.createElement("div");
      row.className = "tree-row"; row.setAttribute("role", "treeitem"); row.dataset.key = n.key; row.style.paddingLeft = `${ROW_PAD + depth * INDENT}px`;
      row.classList.toggle("is-here", n.key === hereKey); row.classList.toggle("is-selected", sel); row.classList.toggle("is-hidden", n.hidden); row.classList.toggle("in-band", band);
      const kids = n.kind !== "copies" && n.children.length > 0;   // 合成行不给小三角：它的「展开」是手风琴（计数那颗钮），不是孩子
      const caret = document.createElement("button"); caret.type = "button"; caret.className = "tree-caret"; caret.setAttribute("aria-label", expanded.has(n.key) ? "收起" : "展开");
      caret.textContent = kids ? (expanded.has(n.key) ? "▾" : "▸") : ""; caret.disabled = !kids;
      caret.addEventListener("click", (ev) => { ev.stopPropagation(); toggle(n); });
      const kind = document.createElement("span"); kind.className = "tree-kind"; kind.innerHTML = iconHtml(kindIcon(n.body)); kind.title = KIND_LABEL[n.body] ?? n.body;
      const name = document.createElement("span"); name.className = `tree-name${n.unnamed ? " is-unnamed" : ""}`; name.textContent = n.label; name.title = n.unnamed ? `${n.label}（没起名）` : n.label;
      row.append(caret, kind, name);
      if (n.kind === "copies") {
        const open = expanded.has(n.key);
        row.classList.add("is-copies");
        const c = document.createElement("button"); c.type = "button"; c.className = "tree-count"; c.setAttribute("aria-expanded", String(open));
        c.textContent = `×${n.count} ${open ? "⌃" : "⌄"}`; c.title = `同一个组件摆了 ${n.count} 份，点一下${open ? "收起" : "在同一层摊开"}（同一层一次只摊开一组；标题下拉可以关掉合成）`;
        c.addEventListener("click", (ev) => { ev.stopPropagation(); toggle(n); });
        row.append(c);
      }
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
      // 双击名字 = 改名，双击别处 = 进去编辑（合成行 = 摊开 / 收起）（user 10-30「hierarchy里面双击名字应该是重命名，双击其他地方可以是编辑」）
      row.addEventListener("dblclick", (ev) => { if ((ev.target as Element | null)?.closest?.(".tree-name")) { renameRow(n); return; } if (n.kind === "copies") { toggle(n); return; } goTo(n.path); deps.after(); });
      row.addEventListener("contextmenu", (ev) => { ev.preventDefault(); openMenu(n, more); });
      body.append(row);
    }
  }

  /** 资源页：素材架（有东西才出）+ 组件（摆了几份 / 孤儿）+ 材质（用在几处 / 没人用）+ 导入素材 + 清理没人用的组件。 */
  function renderResources(): void {
    const scene = editor.sceneRef, c = census(scene), orphans = orphanDefs(c);
    const frozen = scene.shelfFrozen !== null, texFrozen = scene.texturesFrozen !== null;
    const nextSig = "res" + JSON.stringify([c.defs.map((d) => [d.def, d.name, d.live, d.users.length, d.placed, d.shelved]), c.materials.map((m) => [m.guid, m.name, m.faces, m.orphanFaces, m.shelved]), c.textures.map((t) => [t.guid, t.name, t.materials, t.shelved]), c.shelf, frozen, texFrozen]);
    if (nextSig === sig) return;
    sig = nextSig;
    pane.replaceChildren();
    const head = (text: string): void => { const h = document.createElement("div"); h.className = "res-head"; h.textContent = text; pane.append(h); };
    const row = (name: string, meta: string, opts: { unnamed?: boolean; orphan?: boolean; swatch?: string; kind?: string; depth?: number; act?: { label: string; run(): void } }): void => {
      const r = document.createElement("div"); r.className = `tree-row res-row${opts.orphan ? " is-orphan" : ""}`; r.setAttribute("role", "listitem");
      if (opts.kind) { const k = document.createElement("span"); k.className = "tree-kind"; k.innerHTML = iconHtml(kindIcon(opts.kind)); k.title = KIND_LABEL[opts.kind] ?? opts.kind; r.append(k); }
      if (opts.swatch) { const sw = document.createElement("span"); sw.className = "res-swatch"; sw.style.background = opts.swatch; r.append(sw); }
      const nm = document.createElement("span"); nm.className = `tree-name${opts.unnamed ? " is-unnamed" : ""}`; nm.textContent = name;
      const mt = document.createElement("span"); mt.className = "res-meta"; mt.textContent = meta;
      if (opts.depth) r.style.paddingLeft = `${6 + opts.depth * 14}px`;
      r.append(nm, mt);
      if (opts.act) { const { label, run } = opts.act, b = document.createElement("button"); b.type = "button"; b.className = "res-act"; b.textContent = label; b.addEventListener("click", (ev) => { ev.stopPropagation(); run(); }); r.append(b); }
      pane.append(r);
    };
    const note = (text: string): void => { const n = document.createElement("div"); n.className = "res-note res-shelf-note"; n.textContent = text; pane.append(n); };
    const swatchOf = (m: readonly number[]): string => `rgb(${m.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255)).join(",")})`;
    if (frozen) { head("素材架"); note("这份文件的素材架是更新版写的：本版读不出架上有什么、也不能改，保存时原样带回。"); }
    else if (c.shelf.length) {
      head(`素材架（${c.shelf.filter((x) => x.type !== "folder").length}）`);
      for (const x of c.shelf) {
        if (x.type === "folder") { row(x.name, "文件夹", { depth: x.depth }); continue; }
        const take = { label: "取下", run: () => { editor.commitOp({ op: "shelfTake", item: x.guid }); deps.after(); render(); } };
        const swatch = x.material !== undefined ? swatchOf(scene.materials[x.material].color) : undefined, kind = x.def !== undefined ? scene.kindOf(x.def) : undefined;
        row(x.name, x.type === "material" ? "材质" : "", { depth: x.depth, act: take, ...(swatch ? { swatch } : {}), ...(kind ? { kind } : {}) });
      }
    }
    const putBtn = (run: () => void): { act?: { label: string; run(): void } } => (frozen ? {} : { act: { label: "上架", run } });
    const defs = [...c.defs].sort((a, b) => Number(b.live) - Number(a.live));
    head(`组件（${defs.length}）`);
    if (!defs.length) row("（还没有组件）", "", { orphan: true });
    for (const d of defs) row(d.name, d.live ? `${d.shelved ? "在素材架上 · " : ""}摆了 ${d.placed} 份${d.users.length > d.placed ? `（另有 ${d.users.length - d.placed} 份在孤儿里）` : ""}` : frozen ? "没摆在模型里（可能收在素材架上）" : d.users.length ? "孤儿（只摆在孤儿里）" : "孤儿（一份都没摆）", { unnamed: isHex4(d.name), orphan: !d.live, kind: d.kind, ...(d.shelved ? {} : putBtn(() => void deps.shelf.putDef(d.def).then(render))) });
    head(`材质（${c.materials.length}）`);
    if (!c.materials.length) row("（还没有材质）", "", { orphan: true });
    for (const m of c.materials) row(m.name, `${m.shelved && (m.faces || m.orphanFaces) ? "在素材架上 · " : ""}${m.faces ? `用在 ${m.faces} 处` : m.orphanFaces ? `只用在没人用的组件里（${m.orphanFaces} 处）` : m.shelved ? "收在素材架上" : frozen ? "没有面在用（可能收在素材架上）" : "没人用"}`, { orphan: !m.faces && !m.shelved, swatch: swatchOf(scene.materials[m.index].color), ...(m.shelved ? {} : putBtn(() => { deps.shelf.putMaterial(m.guid); render(); })) });
    head(`贴图（${c.textures.length}）`);
    if (texFrozen) note("这份文件的贴图表是更新版写的：本版读不懂里面有什么、也不能改，保存时原样带回。");
    else if (!c.textures.length) row("（还没有贴图）", "", { orphan: true });
    for (const t of c.textures) {
      const size = t.sizeM ? `${t.sizeM[0]} × ${t.sizeM[1]} m` : "单品的画", look = t.content === "image" ? "" : " · 本版显示成灰色占位";
      row(t.name || "（没起名）", `${size} · ${t.materials ? `${t.materials} 个材质在用` : t.shelved ? "收在素材架上" : "没人用（清掉材质后图会留下）"}${look}`, { unnamed: !t.name, orphan: !t.materials && !t.shelved });
    }
    const foot = document.createElement("div"); foot.className = "res-foot";
    const imp = document.createElement("button"); imp.type = "button"; imp.className = "res-import"; imp.disabled = frozen; imp.textContent = "从别的模型导入素材…"; imp.title = "从一份 .catsup 里挑组件放上这份模型的素材架（只读那份文件）";
    imp.addEventListener("click", () => deps.shelf.pickImport());
    foot.append(imp);
    const purge = document.createElement("button"); purge.type = "button"; purge.className = "res-purge"; purge.disabled = frozen || !orphans.length;
    purge.textContent = frozen ? "这份文件先不能清理组件（看不见架上收着什么）" : orphans.length ? `清理没人用的组件（${orphans.length} 个）…` : "没有没人用的组件";
    purge.addEventListener("click", () => void (async () => {
      const ids = orphanDefs(census(editor.sceneRef)), names = ids.map((id) => `「${editor.sceneRef.def(id).name}」`);
      if (!ids.length) return;
      if (!(await deps.confirm("清理没人用的组件", `要删 ${ids.length} 个没摆在模型里的组件（被删的组件里摆着的、别处也没用的，一起算孤儿）：\n${names.join("、")}\n\n能撤销（一步）。`, `清理 ${ids.length} 个`))) return;
      editor.commitOp({ op: "purgeDefs", defs: ids });
      deps.after(); render();
    })());
    foot.append(purge);
    const unused = unusedMaterials(c), orphanOnly = c.materials.filter((m) => !m.faces && m.orphanFaces).length;
    const purgeM = document.createElement("button"); purgeM.type = "button"; purgeM.className = "res-purge"; purgeM.disabled = frozen || !unused.length;
    purgeM.textContent = frozen ? "这份文件先不能清理材质（看不见架上收着什么）" : unused.length ? `清理没人用的材质（${unused.length} 个）…` : "没有没人用的材质";
    purgeM.addEventListener("click", () => void (async () => {
      const s1 = editor.sceneRef, ids = unusedMaterials(census(s1)), names = ids.map((i) => `「${s1.materials[i].name}」`);
      if (!ids.length) return;
      if (!(await deps.confirm("清理没人用的材质", `要删 ${ids.length} 个没有任何面在用的材质：\n${names.join("、")}\n\n能撤销（一步）。`, `清理 ${ids.length} 个`))) return;
      editor.commitOp({ op: "purgeMaterials", materials: ids });
      deps.after(); render();
    })());
    foot.append(purgeM);
    if (orphanOnly) { const n = document.createElement("div"); n.className = "res-note"; n.textContent = `另有 ${orphanOnly} 个材质只用在没人用的组件里：先清理这些组件，它们才算没人用。`; foot.append(n); }
    const unusedT = unusedTextures(c);
    const purgeT = document.createElement("button"); purgeT.type = "button"; purgeT.className = "res-purge"; purgeT.disabled = frozen || texFrozen || !unusedT.length;
    purgeT.textContent = texFrozen ? "这份文件先不能清理贴图（贴图表是更新版写的）" : frozen ? "这份文件先不能清理贴图（看不见架上收着什么）" : unusedT.length ? `清理没人用的贴图（${unusedT.length} 张）…` : "没有没人用的贴图";
    purgeT.addEventListener("click", () => void (async () => {
      const s1 = editor.sceneRef, ids = unusedTextures(census(s1)), names = ids.map((g) => `「${s1.textures.get(g)?.name || "没起名"}」`);
      if (!ids.length) return;
      if (!(await deps.confirm("清理没人用的贴图", `要删 ${ids.length} 张没有材质指着的贴图：\n${names.join("、")}\n\n能撤销（一步）。`, `清理 ${ids.length} 张`))) return;
      editor.commitOp({ op: "purgeTextures", textures: ids });
      deps.after(); render();
    })());
    foot.append(purgeT);
    pane.append(foot);
  }

  return {
    toggle: (anchor) => fw.toggle(anchor, "start"),
    isOpen: () => fw.isOpen(),
    refresh: () => { if (fw.isOpen()) render(); },
  };
}
