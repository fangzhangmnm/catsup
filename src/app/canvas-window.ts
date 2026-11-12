// app/canvas-window.ts —— 画布小窗第一版（只看；施工单十六第二节，ai-docs/20261111-paint-workorders-16.md）。created 2026-11-11 by Claude Opus 5.5
// user 11-11：「做一个debug用的rudimentary的uv和贴图查看器小窗……现在只是用来帮助我debug看数据的」「我们还是需要透明诚实，虽然是高级功能用户一般不会动」。
// 长远的样子（看 → 在上面画 → 改贴图坐标，最后归共享面板库）在 ai-docs/20261111-paint-moves-design.md 第七节；这一版只看，不改任何东西。
// 两半、中间一条窄的缝：「看」那一半 = ui/image-view.ts（一张图 + 平移缩放 + 线，不认识三维）；本文件 = 三维这边递进去的东西：
//   画布上的线（paint/atlas-outline.ts：片里的细、片的外沿粗）、「这一点落在哪张面上」、选中 / 悬停的集合，外加图从哪来、底下两行字。
// 图从哪来：热的画 = 画板落定的内容读回一次（PaintBoard.composeBytes：不带正在画的那一笔）；一笔当中不读（committedKey 一笔当中不变，抬笔才变）；
//   冷的画 = 存盘时存的那张合成图（PNG，浏览器解一次）；还没有 = 底色。开着小窗画一笔：每帧只多比一次键（不读回、不重算线）。
// 两边一起亮：三维里选中的面 → 这里涂蓝；这里悬停 → 三维里那张面按悬停的样子亮（peekWorld，经 viewExtras 交给渲染）+ 底下一行写它是谁；
//   这里点一张面 = 在三维里选中它（一步、进撤销；要正在编辑这个物件——没在编辑就说一句，不替人进去）。三维里点了一张面 = 自动切到那张面所在的 atlas。
// 开着不进文件（这一次打开期间记着）；位置按设备记（和别的浮窗同一个 WIN_POS）。它进输入闸的名册（refwin：有焦点时键盘归它，不挡三维）。
// 在上面画（施工单二十一第 2 刀）：手上的工具只有左边工具柱里那一个（设计稿「一只手，两块画面」）。画画工作台里笔 / 橡皮落在这里 = 二维笔（deps.paint.open，和模型上的笔
//   同一块画板、同一串撤销）；吸管点一下 = 取这里显示的颜色；别的工具照旧（拖 = 挪、点 = 选面）。手指永远是看。一笔开着（这里画的或模型上画的）= 每帧只读回变了的那块，跟着变。
import type { Editor } from "../editor/editor.ts";
import { paintsOf } from "../editor/mesh-edits/start-paint.ts";
import { atlasOutline, type AtlasOutline } from "../paint/atlas-outline.ts";
import type { PaintBoards } from "../paint/boards.ts";
import { bytesSay, openMemory, paintTargetSize } from "../paint/open-memory.ts";
import { xformScale } from "../paint/space-target.ts";
import { buildTexelTable, paintFaces } from "../paint/texel-table.ts";
import { ID_STRIDE } from "../scene/world-view.ts";
import { F_SEAM } from "../mesh/mesh-kernel.ts";
import { PALETTE } from "../minccino/index.ts";
import { cellSay } from "./canvas-size-picker.ts";
import { inputGate } from "./input-dom.ts";
import { mountImageView } from "./ui/image-view.ts";
import { createBareFloatWin } from "./ui/bare-float-win.ts";
import type { PopupMenuItem } from "./ui/popup-menu.ts";

/** 接缝在小窗里的颜色 = 三维里接缝线的颜色（施工单二十二 B）。 */
const SEAM_CSS = `#${PALETTE.edgeAccent.toString(16).padStart(6, "0")}`;

export interface CanvasWindowDeps {
  readonly editor: Editor;
  readonly boards: PaintBoards;
  hint(text: string): void;
  onOpenChange?(open: boolean): void;
  /** 这张画最近一次存下去的字节多大（热的画存过之后贴图行里没有字节，得问存盘那边；paint/save.ts PaintSaver.lastSizes）。 */
  savedSizes?(texture: string): { readonly ora: number; readonly png: number } | null;
  /** 在画布上画（施工单二十一第 2 刀；main.ts 递进来）。缺 = 只看（单测 / 老入口）。 */
  readonly paint?: CanvasPaintPort;
  /** 「…」里「新建平铺的画…」（施工单二十一第 3 刀；main.ts 递进来：问大小 → 编空白分层字节 → 指令 addTiledPaint → showTiled）。缺 = 菜单里没有这一项。 */
  newTiled?(): void;
}
/** 画布上落笔的口（宿主的）：工具、开一笔、吸色、笔印多大。坐标 = 画布格（可以带小数）。 */
export interface CanvasPaintPort {
  /** 手上能在画布上用的那把（笔 / 橡皮 / 吸管）；别的 = null。 */
  tool(): "paintPen" | "paintEraser" | "eyedrop" | null;
  /** 开一笔：落笔的门不让（锁 / 冷的……）= null（门自己说了）。 */
  open(texture: string, p: CanvasPointer): CanvasStroke | null;
  /** 吸管：取这一格显示的颜色。 */
  eyedrop(texture: string, x: number, y: number): void;
  /** 手上那支笔的大小（画布格；悬停笔印）；不是笔 = null。 */
  brushSize(): number | null;
}
export interface CanvasPointer { readonly x: number; readonly y: number; readonly pressure: number; readonly pointerType: string; readonly at: number }
export interface CanvasStroke { move(p: CanvasPointer): void; up(): void; cancel(): void }
export interface CanvasWindow {
  toggle(anchor: HTMLElement): void;
  open(anchor: HTMLElement): void;
  isOpen(): boolean;
  /** 界面例行刷新（选区 / 上下文 / 场景变了）：物件、atlas、线、高亮跟上；没变就什么都不做。关着 = 什么都不做。 */
  sync(): void;
  /** 每帧开画之前：画板落定的内容变了 = 读回一次（一笔当中不变 → 不读）。关着 = 什么都不做。 */
  frame(): void;
  /** 三维这边要亮的面（世界编号）：小窗里悬停的那张面在每一份摆放里的编号；没有 = null。 */
  peekWorld(): ReadonlySet<number> | null;
  /** 探针用：现在的样子和计数。 */
  probe(): CanvasWindowProbe;
  /** 显示这张平铺的画（新建完 / 探针用）：打开小窗、切过去、先变热（好直接画）。不是平铺的画 = 什么都不做。 */
  showTiled(texture: string, anchor?: HTMLElement): void;
  readonly el: HTMLElement;
}
export interface CanvasWindowProbe {
  open: boolean; def: number | null; tex: string | null; width: number; height: number;
  /** 正在显示的平铺的画（施工单二十一第 3 刀）；没有 = null（显示的是这个物件的画）。 */
  tiled: string | null;
  faces: number[]; thin: number; thick: number; seam: number; patches: number; covered: number; shared: number;
  selected: number[]; hover: number | null; debugView: boolean;
  /** 读回了几次 / 线重算了几次 / 冷图解了几次（开着画一笔：笔当中不涨）。 */
  readbacks: number; outlines: number; decodes: number;
  /** 一笔开着时跟着变：读回了几次、一共读了多少格；这里正在画一笔吗。 */
  liveReads: number; liveCells: number; drawing: boolean;
  /** 小窗里那张图（热的画读回来的那张）的字节哈希 + 宽高（探针拿它和画板的显示那张 / 落定那张逐字节比）；不是读回来的图 = null。 */
  workHash(): { hash: string; w: number; h: number } | null;
  hoverLine: string; statsLine: string; showNums: boolean; collapsed: boolean;
  /** 图上一点（格）在页面上的位置（探针点它用）。 */
  screenOf(x: number, y: number): { x: number; y: number } | null;
}

export function mountCanvasWindow(d: CanvasWindowDeps): CanvasWindow {
  const { editor, boards } = d;
  // 壳 = 没有标题栏的浮窗（ui/bare-float-win.ts，照参考窗；画画手感账 P-10）：左上圆钮（点收起、拖挪窗）、右上「…」和 ×、右下斜纹角；画布贴满
  const win = createBareFloatWin({ id: "canvas", label: "画布小窗", icon: "checkerboard-background", min: { w: 200, h: 160 },
    more: { items: () => menuItems(), onPick: (id) => pickMenu(id) },
    onOpenChange: (o) => { if (o) { stamp = ""; key = ""; sync(); } else { hover = null; pinned = null; editor.draw(); } d.onOpenChange?.(o); } });
  win.el.classList.add("canvas-win");
  const viewHost = win.body; viewHost.classList.add("canvas-win-view");
  const empty = document.createElement("div"); empty.className = "canvas-win-empty"; empty.hidden = true;
  // 叠在画布上的两条：上沿 = 停在 / 点到一张面时它是谁（只在那时浮出来）；下沿 = 这张画的数（「…」里「显示数字」开了才出，半透明）
  const hoverLine = document.createElement("div"); hoverLine.className = "canvas-win-line canvas-win-info"; hoverLine.hidden = true;
  const statsLine = document.createElement("div"); statsLine.className = "canvas-win-line canvas-win-stats"; statsLine.hidden = true;
  viewHost.append(empty, hoverLine, statsLine);

  // —— 状态 ——
  let tiled: string | null = null;   // 正在显示的平铺的画（不属于哪个物件；有它时小窗就是一张图：没有轮廓、没有面）
  let def: number | null = null, tex: string | null = null, outline: AtlasOutline | null = null, key = "", stamp = "", selKey = "", hover: number | null = null, pinned: number | null = null, debugView = false, showNums = false;
  let readbacks = 0, outlines = 0, decodes = 0, owner: { key: string; canvas: HTMLCanvasElement } | null = null;
  let liveVer = -1, liveReads = 0, liveCells = 0, stroke: CanvasStroke | null = null;   // 一笔开着时跟着变：读到哪一版、读回了几次、一共读了多少格；这里正在画的那一笔
  const work = document.createElement("canvas");   // 读回的那张图放这里（只是显示：字节不经它进出文件）
  const coldIds = new WeakMap<object, number>(); let coldNext = 1;

  const ptr = (x: number, y: number, e: PointerEvent): CanvasPointer => ({ x, y, pressure: e.pressure, pointerType: e.pointerType, at: e.timeStamp });
  const view = mountImageView(viewHost, {
    pick: (x, y) => outline?.facesAt(x, y)[0] ?? null,
    hover: (id) => { hover = id; writeHover(); editor.draw(); },
    click: (id) => { pinned = id; writeHover(); if (id !== null) selectIn3d(id); },   // 点到的那张面：它是谁那一行留着（触屏没有悬停），点空处收起
    stroke: {
      // 笔 / 鼠标左键 + 手上是能在画布上用的那把 + 这里有一张画 = 画；不然照旧（拖 = 挪、点 = 选面）
      wants: (e) => !!d.paint && shown() !== null && d.paint.tool() !== null && (e.pointerType === "pen" || (e.pointerType === "mouse" && e.button === 0)),
      down: (x, y, e) => {
        const t = shown();
        if (!d.paint || t === null) return;
        if (d.paint.tool() === "eyedrop") { d.paint.eyedrop(t, x, y); return; }
        stroke = d.paint.open(t, ptr(x, y, e));
      },
      move: (x, y, e) => { stroke?.move(ptr(x, y, e)); },
      up: (x, y, e, cancelled) => { const s = stroke; stroke = null; if (!s) return; if (cancelled) s.cancel(); else { s.move(ptr(x, y, e)); s.up(); } },
    },
    brushAt: () => { const t = d.paint?.tool(); return t === "paintPen" || t === "paintEraser" ? d.paint!.brushSize() : null; },
  });
  /** 「…」菜单：最上面一节 = 这个物件的每一张画（当前那张打勾，点了就换）；下面 = 每格归谁（开关）· 整张 · 显示数字（开关）。 */
  const menuItems = (): PopupMenuItem<string>[] => {
    const all = def === null ? [] : paintsOf(editor.sceneRef, def), tl = tiledList();
    return [
      ...all.map((p, i) => ({ id: `tex:${p.tex}`, label: `${p.name}（${p.uvSet.width} × ${p.uvSet.height}）`, checked: tiled === null && p.tex === tex, ...(i === 0 ? { sectionBefore: "这个物件的画" } : {}) })),
      // 平铺的画（施工单二十一第 3 刀）：整份文件的，不属于哪个物件；只在这里画
      ...tl.map((t, i) => ({ id: `tiled:${t.tex}`, label: `${t.name}（${sizeSay(t.tex)}一张 ${mSay(t.sizeM[0])} × ${mSay(t.sizeM[1])}）`, checked: t.tex === tiled, ...(i === 0 ? { sectionBefore: "平铺的画" } : {}) })),
      ...(d.newTiled ? [{ id: "newTiled", label: "新建平铺的画…", ...(tl.length ? {} : { sectionBefore: "平铺的画" }) }] : []),
      { id: "own", label: "每格归谁", checked: debugView, hint: "调试视图", ...(all.length || tl.length || d.newTiled ? { separatorBefore: true } : {}) },
      { id: "fit", label: "整张" },
      { id: "nums", label: "显示数字", checked: showNums },
    ];
  };
  const pickMenu = (id: string): void | "keep" => {
    if (id.startsWith("tex:")) { tiled = null; tex = id.slice(4); key = ""; stamp = ""; pinned = null; sync(); return; }
    if (id.startsWith("tiled:")) { showTiled(id.slice(6)); return; }
    if (id === "newTiled") { d.newTiled?.(); return; }
    if (id === "own") { debugView = !debugView; stamp = ""; sync(); return "keep"; }
    if (id === "fit") { view.fit(); return; }
    if (id === "nums") { showNums = !showNums; statsLine.hidden = !showNums || !outline; return "keep"; }
  };
  inputGate.face({ kind: "refwin", label: "画布小窗", rank: 21, root: ".float-win[data-win=canvas]", up: () => win.isOpen() && win.el.contains(document.activeElement) });   // 有焦点（圆钮 / 菜单）时键盘归它；不挡三维

  /** 整份文件里的平铺的画（按贴图去重；材质表的先后）。 */
  const tiledList = (): { tex: string; name: string; sizeM: readonly [number, number] }[] => {
    const S = editor.sceneRef, out: { tex: string; name: string; sizeM: readonly [number, number] }[] = [], seen = new Set<string>();
    for (const m of S.materials) { const tp = S.tiledPaintOf(m); if (tp && !seen.has(tp.textureDoc.guid)) { seen.add(tp.textureDoc.guid); out.push({ tex: tp.textureDoc.guid, name: tp.textureDoc.name || m.name, sizeM: tp.sizeM }); } }
    return out;
  };
  /** 小窗现在显示（也是落笔）的那张：平铺的画优先，否则这个物件的那张。 */
  const shown = (): string | null => tiled ?? tex;
  const mSay = (v: number): string => `${Math.round(v * 1000) / 1000} 米`;
  /** 平铺的画多大（像素）：热的 = 画板；冷的 = 合成图；还不知道 = 空。 */
  const sizeSay = (t: string): string => { const b = boards.get(t) ?? boards.board(t); return b ? `${b.width} × ${b.height} 像素，` : ""; };
  function showTiled(t: string, anchor?: HTMLElement): void {
    if (!tiledList().some((x) => x.tex === t)) return;
    if (!win.isOpen()) win.open(anchor ?? win.el);   // 没开着：开（第一次挨着 anchor；之后照上一次的位置，越界的拉回来）
    tiled = t; key = ""; stamp = ""; hover = null; pinned = null;
    if (boards.stateOf(editor.sceneRef, t) === "cold") void boards.warm(editor.sceneRef, t).then(() => { stamp = ""; sync(); editor.draw(); }).catch(() => { /* 只能看不能画：登记处已经说了原因 */ });   // 先变热：好直接画
    sync();
  }
  /** 看哪个物件：正在编辑的网格体；不在网格体里 = 选中的那一个物件（是网格体的话）；都不是 = null。 */
  const currentDef = (): number | null => {
    const S = editor.sceneRef, here = S.defOfContext(editor.context);
    if (S.kindOf(here) === "mesh") return here;
    const picks = editor.selectedPoolPicks();
    if (picks.length !== 1 || picks[0].kind !== "instance") return null;
    const inst = S.def(here).instances.get(picks[0].instance);
    return inst && S.kindOf(inst.def) === "mesh" ? inst.def : null;
  };
  const editingDef = (): boolean => def !== null && editor.sceneRef.defOfContext(editor.context) === def;
  const place = (): ReturnType<typeof paintsOf>[number] | null => (def === null || tex === null ? null : paintsOf(editor.sceneRef, def).find((p) => p.tex === tex) ?? null);
  const scaleOf = (dd: number): number => { const s = editor.worldGeom().slots.find((x) => x.pool.def === dd && x.pool.group === null); return s ? xformScale(s.xform) : 1; };

  function sync(): void {
    if (!win.isOpen()) return;
    const S = editor.sceneRef, nd = currentDef();
    if (nd !== def) { def = nd; tex = null; key = ""; stamp = ""; hover = null; }
    const all = def === null ? [] : paintsOf(S, def);
    // 三维里选了面 → 切到那张面所在的画（只在选区变了的那一下切：之后人手动换的不抢回来）
    const sel = editingDef() ? editor.selectedMeshFaces() : [], sk = `${def}|${sel.join(",")}`;
    if (sk !== selKey) {
      selKey = sk;
      const body = def !== null ? S.def(def).body : null;
      if (body?.kind === "mesh") for (const f of sel) { const t = S.facePaint(def!, body.kernel.faceMat[f])?.textureDoc.guid; if (t && all.some((p) => p.tex === t)) { if (t !== tex || tiled !== null) { tex = t; tiled = null; key = ""; stamp = ""; } break; } }
    }
    if (tiled !== null && !tiledList().some((x) => x.tex === tiled)) { tiled = null; stamp = ""; }   // 那张平铺的画没了（撤销新建、清理）
    if (tiled !== null) {   // 平铺的画：一张图，没有轮廓、没有面
      outline = null; key = ""; view.setLines(new Float32Array(0), new Float32Array(0)); view.setMarks([], null); hoverLine.hidden = true; hoverLine.textContent = "";
      empty.hidden = true;
      const t = tiledList().find((x) => x.tex === tiled)!, b = boards.get(tiled);
      statsLine.textContent = `平铺的画「${t.name}」 · ${sizeSay(tiled)}在模型上一张 ${mSay(t.sizeM[0])} × ${mSay(t.sizeM[1])} · 只在这里画${b ? ` · ${b.layerCount()} 层` : ""}`;
      statsLine.hidden = !showNums;
      frame(); return;
    }
    if (tex === null || !all.some((p) => p.tex === tex)) { tex = all[0]?.tex ?? null; key = ""; stamp = ""; }
    const p = place();
    if (!p || def === null) {
      outline = null; view.setLines(new Float32Array(0), new Float32Array(0)); view.setImage(null, 1, 1); hoverLine.hidden = true; statsLine.hidden = true;
      empty.hidden = false;
      empty.textContent = def === null ? "进到一个画过的物件里（或者选中它），这里显示它的画布" : "这个物件还没开始画：点上面的「开始画…」";
      hoverLine.textContent = ""; statsLine.textContent = ""; return;
    }
    empty.hidden = true;
    const body = S.def(def).body;
    if (body.kind !== "mesh") return;
    const k = body.kernel, nk = `${def}|${tex}|${p.uvSet.guid}|${p.uvSet.width}x${p.uvSet.height}|${k.rev}`;
    if (nk !== key) {
      key = nk; outlines++;
      const on = k.faces().filter((f) => S.facePaint(def!, k.faceMat[f])?.textureDoc.guid === tex);
      outline = atlasOutline(k, p.uvSet.guid, on, p.uvSet.width, p.uvSet.height, (a, b) => { const e = k.edgeOf(a, b); return e >= 0 && k.hasFlag(e, F_SEAM); });
      view.setLines(outline.thin, outline.thick, { lines: outline.seam, color: SEAM_CSS });
      view.setRings((id) => outline?.rings.get(id));
      if (hover !== null && !outline.rings.has(hover)) hover = null;
      owner = null; stamp = "";
    }
    view.setMarks(sel.filter((f) => outline!.rings.has(f)), hover);
    writeHover(); writeStats();
    frame();
  }
  /** 图：热的 = 读回落定的内容；冷的 = 存下的合成图；调试视图 = 每格归谁。键没变 = 不动。 */
  function frame(): void {
    if (!win.isOpen()) return;
    if (tiled !== null) { showImage(tiled, null); return; }   // 平铺的画：热 / 冷 / 一笔开着，和下面同一套
    if (tex === null || !outline) return;
    const p = place(); if (!p) return;
    showImage(tex, p);
  }
  /** 一张画显示什么：一笔开着 = 跟着变；热的 = 读回落定的内容；冷的 = 存下的合成图；调试视图（只有铺在坐标上的画有）= 每格归谁；都没有 = 底色。 */
  function showImage(t: string, p: ReturnType<typeof place>): void {
    const hot = boards.get(t), cold = hot ? null : boards.board(t), own = debugView && p !== null;
    if (hot && hot.strokeOpen && !own) { live(hot); return; }   // 一笔开着（这里画的或模型上画的）：跟着变
    liveVer = -1;
    const ns = own ? `own|${key}` : hot ? `hot|${hot.committedKey()}` : cold ? `cold|${idOf(cold.image as object)}` : `none|${t}|${p ? `${p.uvSet.width}x${p.uvSet.height}` : ""}`;
    if (ns === stamp) return;
    stamp = ns;
    if (own) { const c = ownerCanvas(p!.uvSet.guid, p!.uvSet.width, p!.uvSet.height); view.setImage(c, c.width, c.height); return; }
    if (hot) {
      const px = hot.composeBytes(); readbacks++;
      if (!px) { view.setImage(null, hot.width, hot.height); return; }
      work.width = hot.width; work.height = hot.height;
      work.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(px), hot.width, hot.height), 0, 0);
      view.setImage(work, hot.width, hot.height); return;
    }
    const ref = cold?.image as { bytes?: Uint8Array; mimeType?: string } | undefined;
    if (cold && ref?.bytes) {
      const want = stamp; decodes++;
      void createImageBitmap(new Blob([ref.bytes as BlobPart], { type: ref.mimeType ?? "image/png" })).then((bm) => { if (stamp === want) view.setImage(bm, cold.width, cold.height); else bm.close(); }).catch(() => { if (stamp === want) view.setImage(null, cold.width, cold.height); });
      return;
    }
    view.setImage(null, p?.uvSet.width ?? 1, p?.uvSet.height ?? 1);   // 还没有内容（新开、还没打开过）= 底色
  }
  /**
   * 一笔开着时：显示的那张（带着这一笔）每帧读回变了的那块（画板的变化史；第一次 / 说不清 = 整张），贴进小窗那张图。和三维那边看的是同一张合成图。
   * 抬笔后 stamp 对不上 → 照旧整张读回落定的（composeBytes）。
   */
  function live(b: NonNullable<ReturnType<PaintBoards["get"]>>): void {
    const v = b.compose();
    if (!v) return;
    stamp = `live|${v.version}`;
    if (v.version === liveVer) return;
    const whole = liveVer < 0 || work.width !== b.width || work.height !== b.height, ch = whole ? "all" : b.changedSince(liveVer);
    let r = { x: 0, y: 0, w: b.width, h: b.height };
    if (ch !== "all") {
      if (ch.empty) { liveVer = v.version; return; }
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const q of ch.runs()) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x + q.w); y1 = Math.max(y1, q.y + q.h); }
      r = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    const got = b.shownBytes(r);
    if (!got) return;
    if (whole) { work.width = b.width; work.height = b.height; }
    if (r.w > 0 && r.h > 0) work.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(got.px.buffer, got.px.byteOffset, got.px.byteLength), r.w, r.h), r.x, r.y);
    liveVer = got.version; liveReads++; liveCells += r.w * r.h;
    view.setImage(work, b.width, b.height);
  }
  const idOf = (o: object): number => { let n = coldIds.get(o); if (n === undefined) { n = coldNext++; coldIds.set(o, n); } return n; };
  /** 调试视图：每格归哪块多边形（和画画用的那张归属表同一个算法、同样往外延）；没人要 = 棋盘格。 */
  function ownerCanvas(uvSet: string, W: number, H: number): HTMLCanvasElement {
    if (owner?.key === key) return owner.canvas;
    const body = editor.sceneRef.def(def!).body;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    if (body.kind === "mesh") {
      const t = buildTexelTable(W, H, paintFaces(body.kernel, uvSet), 4), img = new ImageData(W, H), px = img.data;
      for (let i = 0; i < W * H; i++) {
        const o = t.owner[i], x = i % W, y = (i / W) | 0;
        if (o < 0) { const v = (x + y) & 1 ? 200 : 235; px[4 * i] = px[4 * i + 1] = px[4 * i + 2] = v; }
        else { const h = (Math.imul(o + 1, 2654435761) >>> 0) / 4294967296, [r, g, b] = hsl(h, 0.55, 0.6); px[4 * i] = r; px[4 * i + 1] = g; px[4 * i + 2] = b; }
        px[4 * i + 3] = 255;
      }
      c.getContext("2d")!.putImageData(img, 0, 0);
    }
    owner = { key, canvas: c };
    return c;
  }
  /** 停在 / 点到一张面时它是谁：只在那时浮出来（悬停优先，没悬停 = 最后点到的那张；都没有 = 收起）。 */
  function writeHover(): void {
    const p = place(), f = hover ?? pinned;
    if (f === null || !outline || !p || !outline.rings.has(f)) { hoverLine.textContent = ""; hoverLine.hidden = true; return; }
    hoverLine.hidden = false;
    const r = outline.rings.get(f)!, n = r.length / 2; let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += r[2 * i] * r[2 * j + 1] - r[2 * j] * r[2 * i + 1]; cx += r[2 * i]; cy += r[2 * i + 1]; }
    const share = outline.facesAt(cx / n, cy / n).length;
    hoverLine.textContent = `面 ${f} · 第 ${outline.patchOf.get(f)} 片 · 占 ${Math.round(Math.abs(a) / 2)} 格 · 一格约 ${cellSay(scaleOf(def!) / p.uvSet.pxPerM)}${share > 1 ? ` · 这块 ${share} 张面共用（镜像 / 复制出来的面）` : ""}`;
  }
  function writeStats(): void {
    const p = place(); if (!p || !outline || def === null) { statsLine.hidden = true; return; }
    statsLine.hidden = !showNums;   // 数照算（探针核对），显示与否看「显示数字」
    const W = p.uvSet.width, H = p.uvSet.height, row = editor.sceneRef.textures.get(tex!), hot = boards.get(tex!), body = editor.sceneRef.def(def).body;
    const saved = hot ? d.savedSizes?.(tex!) ?? null : null;   // 热的：存盘那边最近一次编的；冷的：贴图行里读进来的
    const ora = saved ? saved.ora : row?.content.kind === "layered" ? row.content.ora?.byteLength ?? 0 : 0, png = saved ? saved.png : row?.composite?.png.byteLength ?? 0;
    const pct = (n: number): string => `${Math.round((1000 * n) / (W * H)) / 10}%`;
    statsLine.textContent = [
      `${W} × ${H}（${p.uvSet.fit === "density" ? "按一格多大开的：加面放不下时画布变大" : "按总大小开的：画布不自己变大"}）`, `一格约 ${cellSay(scaleOf(def) / p.uvSet.pxPerM)}`, `${outline.patches} 片 · ${outline.faces.length} 张面`,
      `面占画布 ${pct(outline.covered)}${outline.shared ? `（其中 ${pct(outline.shared)} 是两张以上的面共用）` : ""}`,
      hot ? `${hot.layerCount()} 层` : "层数：还没打开",
      ora || png ? `存进文件占（最近一次编的）分层 ${bytesSay(ora)} · 合成图 ${png ? bytesSay(png) : "没有"}` : "还没编进过文件",   // 存盘、自动保存、崩溃快照都会编；热的画以存盘那边的缓存为准
      `打开画占显存 ${bytesSay(openMemory(W, H, body.kind === "mesh" ? paintTargetSize(body.kernel, outline.patchOf.keys()) : undefined).fixed)}`,   // 面表 / 三角形表跟着这张画有哪些面（施工单十九第 1 刀）
    ].join(" · ");
  }
  function selectIn3d(f: number): void {
    if (!editingDef()) { d.hint("没在编辑这个物件：双击进到它里面，点这里的面才会在三维里选中"); return; }
    const w = editor.worldGeom(), active = w.activeSlot();
    if (active.pool.def !== def) { d.hint("没在编辑这个物件：双击进到它里面，点这里的面才会在三维里选中"); return; }
    editor.selectExpand({ face: w.global(f) }, 0, "replace");
    selKey = "";   // 自己选的：不触发「切到那张画」以外的事
    sync();
  }
  let peekCache: { k: string; set: Set<number> } | null = null;
  return {
    el: win.el,
    toggle: (a) => win.toggle(a),
    open: (a) => win.open(a),
    isOpen: () => win.isOpen(),
    sync, frame, showTiled,
    peekWorld() {
      if (!win.isOpen() || hover === null || def === null) return null;
      const w = editor.worldGeom(), k2 = `${def}|${hover}|${w.slots.length}`;
      if (peekCache?.k === k2) return peekCache.set;
      const set = new Set<number>();
      for (const s of w.slots) if (s.pool.def === def && s.pool.group === null) set.add(s.index * ID_STRIDE + hover);
      peekCache = { k: k2, set };
      return set;
    },
    probe: () => ({
      open: win.isOpen(), def, tex, tiled, width: tiled !== null ? (boards.get(tiled)?.width ?? 0) : outline?.width ?? 0, height: tiled !== null ? (boards.get(tiled)?.height ?? 0) : outline?.height ?? 0, faces: [...(outline?.faces ?? [])],
      thin: (outline?.thin.length ?? 0) / 4, thick: (outline?.thick.length ?? 0) / 4, seam: (outline?.seam.length ?? 0) / 4, patches: outline?.patches ?? 0, covered: outline?.covered ?? 0, shared: outline?.shared ?? 0,
      selected: editingDef() ? editor.selectedMeshFaces().filter((f) => outline?.rings.has(f)) : [], hover, debugView, showNums, collapsed: win.collapsed(), readbacks, outlines, decodes, liveReads, liveCells, drawing: stroke !== null,
      hoverLine: hoverLine.textContent ?? "", statsLine: statsLine.textContent ?? "",
      workHash: () => { if (!work.width || !work.height || !stamp.startsWith("hot") && !stamp.startsWith("live")) return null; const px = work.getContext("2d")!.getImageData(0, 0, work.width, work.height).data; let h = 2166136261; for (let i = 0; i < px.length; i++) { h ^= px[i]; h = Math.imul(h, 16777619); } return { hash: (h >>> 0).toString(16), w: work.width, h: work.height }; },
      screenOf: (x, y) => { const r = viewHost.querySelector("canvas")?.getBoundingClientRect(); if (!r) return null; const p = view.toScreen(x, y); return { x: r.left + p.x, y: r.top + p.y }; },
    }),
  };
}
function hsl(h: number, s: number, l: number): [number, number, number] {
  const f = (n: number): number => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
