// app/ui/tree-drag.ts —— 通用树拖拽：一棵按显示顺序排好、每行带深度的树 + 指针位置 → 放到哪（放进谁 / 插到谁前面）。
// created 2026-10-30 by Claude Opus 5.5 · CatsUp 0.18 物品栏纪元 I3（设计稿 ai-docs/20261030-inventory-design.md §2.1）。
// user 10-30「话说真的不做拖拽吗。如果做了的话以后可以weebpaint也跟着学。不过拖拽的难点是作为一个有孩子物体的最后一个孩子和作为这个物体的下一个兄弟会有歧义」「hierarchy拖拽同意」。
// 不认识 CatsUp：只吃每行的深度；以后进 @internal/workbench-elements，WeebPaint 的图层组也能用。
// 判法（VS Code 文件树 / Blender 大纲 / Notion 通行）：
//  · 指针在一行中间（上下各让 25%）= 放进这一行（当它的孩子）。
//  · 在两行之间的缝 = 插入；插到哪一层看横向：起拖时的横坐标 = 原来那层，往右一格缩进 = 深一层、往左 = 浅一层，
//    夹在缝上下两行允许的范围里（最深 = 上面那行的孩子，最浅 = 下面那行的兄弟）——这就是「最后一个孩子 / 下一个兄弟」的歧义怎么解。
//  · 拖着的那一行连同它的子孙不能当落点（放进自己 = 死循环）。
// 手势：鼠标 / 笔 = 按下挪 4 像素起拖；手指 = 长按起拖（平时上下划 = 滚列表），长按没挪就松手 = onHold（宿主弹菜单，和画布长按同一个意思）；
// 拖到列表上下边缘自动滚；Esc / 被打断 = 取消。

export interface TreeRow { readonly depth: number }
export type TreeDrop =
  /** 放进 parent 那一行（当它的孩子）。 */
  | { readonly kind: "into"; readonly parent: number }
  /** 插进 parent（−1 = 最外层）的孩子里、before 那一行前面（null = 排最后）；插入线画在 lineAfter 那一行下面、缩进到 depth。 */
  | { readonly kind: "insert"; readonly parent: number; readonly before: number | null; readonly depth: number; readonly lineAfter: number };

/** i 那一行的子孙到哪为止（不含）。 */
export function subtreeEnd(rows: readonly TreeRow[], i: number): number {
  let j = i + 1;
  while (j < rows.length && rows[j].depth > rows[i].depth) j++;
  return j;
}

/** 落点（纯函数）：at.row = 指针在哪一行（越界按最近的那行）、fy = 在那一行里的竖向位置 0..1、depth = 想要的深度（宿主按横向挪了几格缩进算）。 */
export function dropAt(rows: readonly TreeRow[], dragged: number, at: { row: number; fy: number; depth: number }, opts: { minDepth?: number; edge?: number } = {}): TreeDrop | null {
  const n = rows.length;
  if (!n || dragged < 0 || dragged >= n) return null;
  const end = subtreeEnd(rows, dragged), inSub = (j: number): boolean => j >= dragged && j < end;
  const edge = opts.edge ?? 0.25, minDepth = opts.minDepth ?? 0;
  const r = Math.max(0, Math.min(n - 1, at.row)), fy = at.row < 0 ? 0 : at.row >= n ? 1 : at.fy;
  if (fy >= edge && fy <= 1 - edge) return inSub(r) ? null : { kind: "into", parent: r };
  let a = fy < edge ? r - 1 : r;
  if (a >= 0 && inSub(a)) a = dragged - 1;   // 缝挨着拖着的那一块 = 那一块上面那条缝
  let b = a + 1;
  if (inSub(b)) b = end;
  if (a < 0) return null;   // 第一行上面：没有地方
  const lo = Math.max(minDepth, b < n ? rows[b].depth : minDepth), hi = rows[a].depth + 1;
  if (lo > hi) return null;
  const d = Math.max(lo, Math.min(hi, at.depth));
  let parent = -1;
  if (d === rows[a].depth + 1) parent = a;
  else if (d > 0) for (let j = a; j >= 0; j--) if (rows[j].depth === d - 1) { parent = j; break; }
  if (parent >= 0 && inSub(parent)) return null;
  return { kind: "insert", parent, before: b < n && rows[b].depth === d ? b : null, depth: d, lineAfter: a };
}

export interface TreeDragOpts {
  /** 一行的选择器（列表里按出现顺序 = rows() 的顺序）。 */
  readonly rowSelector: string;
  rows(): readonly TreeRow[];
  /** 一格缩进多少像素（判深度 + 插入线缩进）。 */
  readonly indent: number;
  /** 第 0 层插入线的左缘（像素，相对列表）。 */
  readonly lineLeft: number;
  readonly minDepth?: number;
  /** 自动滚的那个元素（缺 = 列表自己）。 */
  readonly scroller?: HTMLElement;
  canDrag?(row: number): boolean;
  onDrop(dragged: number, drop: TreeDrop): void;
  /** 手指长按起拖、没挪就松手。 */
  onHold?(row: number, el: HTMLElement): void;
}

const LONG_PRESS_MS = 400, MOUSE_SLOP = 4, TOUCH_SLOP = 8, SCROLL_ZONE = 28, SCROLL_STEP = 8;

/** 把拖拽挂到列表上（事件委托：列表内容重画不掉）。返回拆掉的函数。列表要 position: relative（插入线按它定位）。 */
export function attachTreeDrag(list: HTMLElement, opts: TreeDragOpts): () => void {
  const scroller = opts.scroller ?? list;
  const line = document.createElement("div"); line.className = "tree-drop-line";
  type State = { id: number; type: string; row: number; x0: number; y0: number; x: number; y: number; started: boolean; moved: boolean; timer: number; raf: number; drop: TreeDrop | null };
  let st: State | null = null;
  const rowEls = (): HTMLElement[] => [...list.querySelectorAll<HTMLElement>(opts.rowSelector)];
  const clearMarks = (): void => { for (const el of rowEls()) el.classList.remove("is-drop-into", "is-drop-parent", "is-drag-source"); line.remove(); };
  const locate = (y: number): { row: number; fy: number } => {
    const els = rowEls();
    for (let i = 0; i < els.length; i++) { const r = els[i].getBoundingClientRect(); if (y < r.bottom) return { row: i, fy: y < r.top ? 0 : (y - r.top) / Math.max(1, r.height) }; }
    return { row: els.length - 1, fy: 1 };
  };
  const paint = (): void => {
    if (!st) return;
    clearMarks();
    const els = rowEls(), d = st.drop;
    els[st.row]?.classList.add("is-drag-source");
    if (!d) return;
    if (d.kind === "into") { els[d.parent]?.classList.add("is-drop-into"); return; }
    if (d.parent >= 0) els[d.parent]?.classList.add("is-drop-parent");
    const r = els[d.lineAfter];
    if (!r) return;
    line.style.top = `${r.offsetTop + r.offsetHeight - 1}px`; line.style.left = `${opts.lineLeft + d.depth * opts.indent}px`;
    list.append(line);
  };
  const update = (): void => {
    if (!st?.started) return;
    const rows = opts.rows(), at = locate(st.y);
    st.drop = at.row < 0 || !rows[st.row] ? null : dropAt(rows, st.row, { row: at.row, fy: at.fy, depth: rows[st.row].depth + Math.round((st.x - st.x0) / opts.indent) }, { minDepth: opts.minDepth });
    paint();
  };
  const tick = (): void => {
    if (!st?.started) return;
    const r = scroller.getBoundingClientRect(), dy = st.y < r.top + SCROLL_ZONE ? -SCROLL_STEP : st.y > r.bottom - SCROLL_ZONE ? SCROLL_STEP : 0;
    if (dy) { const top = scroller.scrollTop; scroller.scrollTop += dy; if (scroller.scrollTop !== top) update(); }
    st.raf = requestAnimationFrame(tick);
  };
  const begin = (): void => {
    if (!st) return;
    st.started = true;
    try { list.setPointerCapture(st.id); } catch { /* 手指长按时指针可能已经不在了：照样拖，move 走 window */ }
    list.classList.add("is-dragging");
    update(); tick();
  };
  /** 拖完松手后浏览器还会补一个 click：吞掉（不然会当成「点这一行 = 选中」）。 */
  const swallowClick = (): void => { const kill = (e: Event): void => { e.stopPropagation(); e.preventDefault(); }; window.addEventListener("click", kill, true); setTimeout(() => window.removeEventListener("click", kill, true), 0); };
  const end = (commit: boolean): void => {
    const s = st;
    if (!s) return;
    st = null;
    clearTimeout(s.timer); cancelAnimationFrame(s.raf); clearMarks(); list.classList.remove("is-dragging");
    if (!s.started) return;
    swallowClick();
    if (!commit) return;
    if (s.type === "touch" && !s.moved) { const el = rowEls()[s.row]; if (el) opts.onHold?.(s.row, el); return; }
    if (s.drop) opts.onDrop(s.row, s.drop);
  };
  const onDown = (ev: PointerEvent): void => {
    if (st || ev.button !== 0) return;
    const t = ev.target as Element;
    if (t.closest("button, input")) return;   // 小三角 / 小眼睛 / 「…」照常点
    const el = t.closest<HTMLElement>(opts.rowSelector);
    if (!el || !list.contains(el)) return;
    const row = rowEls().indexOf(el);
    if (row < 0 || (opts.canDrag && !opts.canDrag(row))) return;
    st = { id: ev.pointerId, type: ev.pointerType, row, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, started: false, moved: false, timer: 0, raf: 0, drop: null };
    if (ev.pointerType === "touch") st.timer = window.setTimeout(() => { if (st && !st.started) begin(); }, LONG_PRESS_MS);
  };
  const onMove = (ev: PointerEvent): void => {
    if (!st || ev.pointerId !== st.id) return;
    st.x = ev.clientX; st.y = ev.clientY;
    const far = Math.hypot(st.x - st.x0, st.y - st.y0);
    if (!st.started) {
      if (st.type === "touch") { if (far > TOUCH_SLOP) end(false); }   // 长按前就划走 = 滚列表
      else if (far > MOUSE_SLOP) begin();
      return;
    }
    if (far > TOUCH_SLOP) st.moved = true;
    ev.preventDefault();
    update();
  };
  const onUp = (ev: PointerEvent): void => { if (st && ev.pointerId === st.id) end(true); };
  const onCancel = (ev: PointerEvent): void => { if (st && ev.pointerId === st.id) end(false); };
  const onKey = (ev: KeyboardEvent): void => { if (st?.started && ev.key === "Escape") { ev.stopPropagation(); ev.preventDefault(); end(false); } };
  const onTouchMove = (ev: TouchEvent): void => { if (st?.started) ev.preventDefault(); };   // 拖着时别让列表滚走
  const onMenu = (ev: Event): void => { if (st?.type === "touch") { ev.preventDefault(); ev.stopPropagation(); } };   // 安卓长按会冒系统菜单事件：拖拽 / 长按归这里
  list.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("keydown", onKey, true);
  list.addEventListener("touchmove", onTouchMove, { passive: false });
  list.addEventListener("contextmenu", onMenu, true);
  return () => {
    end(false);
    list.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onKey, true);
    list.removeEventListener("touchmove", onTouchMove);
    list.removeEventListener("contextmenu", onMenu, true);
  };
}
