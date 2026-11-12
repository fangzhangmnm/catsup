// ui/image-view.ts —— 一张图 + 平移缩放 + 上面叠一层折线（画布小窗的「看」那一半；施工单十六第二节）。created 2026-11-11 by Claude Opus 5.5
// 只认识：一张图（一格 = 图上一个像素）、两种粗细的线段（格坐标）、按编号取的多边形（选中 / 悬停时涂一层）、一个「这一点落在哪个编号上」的回调。
// **不认识三维**（不 import 场景 / 编辑器 / 画画内核）：以后搬进家族共享的面板库时原样搬（统筹：「分两半写，中间一条窄的缝」）；三维那一半 = app/canvas-window.ts。
// 手感：滚轮 = 在光标处放大缩小；按住拖 = 平移；两指 = 捏合 + 平移；点一下（没怎么动）= click(编号)；鼠标停在上面 = hover(编号)。放大用最近邻，一格 ≥ 8 个屏幕像素时画格线。
// 只在变了的时候画（合到下一帧画一次），不跟着三维每帧画。

export interface ImageViewHooks {
  /** 图上这一点（格）落在哪个编号上；没有 = null。 */
  pick(x: number, y: number): number | null;
  /** 鼠标悬停的编号变了（离开 = null）。 */
  hover?(id: number | null): void;
  /** 点了一下（没拖）：点中的编号，点空处 = null。 */
  click?(id: number | null): void;
  /**
   * 落笔（可选；施工单二十一第 2 刀）：按下那一下要不要当成画——宿主看手上的工具定（笔 / 鼠标左键）；手指永远是看（挪、缩），不来问。
   * 要 = 这一下之后的移动 / 抬起都交给 down / move / up（格坐标，可以带小数），不平移、不点选；画着时别的指针不理（一笔当中不挪不缩）。
   */
  stroke?: {
    wants(e: { readonly pointerType: string; readonly button: number }): boolean;
    down(x: number, y: number, e: PointerEvent): void;
    move(x: number, y: number, e: PointerEvent): void;
    /** cancelled = pointercancel（系统收走了这个指针）。 */
    up(x: number, y: number, e: PointerEvent, cancelled: boolean): void;
  };
  /** 悬停时亮出来的笔印：这一点上手上的笔有多大（直径，格）；不画 = null。放大到看得见格子时，格心落在这个圆里的格也亮出来。 */
  brushAt?(x: number, y: number): number | null;
}
export interface ImageView {
  /** 换图（宽高 = 格数；图的像素和格一一对应）。null = 没有图（画底色）。 */
  setImage(src: CanvasImageSource | null, width: number, height: number): void;
  /** 线段（每条 4 个数 x0, y0, x1, y1，格）：thin = 细线、thick = 粗线。 */
  setLines(thin: Float32Array, thick: Float32Array): void;
  /** 按编号取多边形（选中 / 悬停时涂一层用）。 */
  setRings(ring: (id: number) => ArrayLike<number> | undefined): void;
  /** 选中的编号 + 悬停的编号。 */
  setMarks(selected: Iterable<number>, hover: number | null): void;
  /** 整张图放进窗口。 */
  fit(): void;
  /** 现在一格几个屏幕像素。 */
  scale(): number;
  /** 图上一点（格）在窗口里的位置（CSS 像素，相对画布左上角；探针用）。 */
  toScreen(x: number, y: number): { x: number; y: number };
  dispose(): void;
}

const GRID_FROM = 8;        // 一格 ≥ 这么多屏幕像素才画格线
const CLICK_SLOP = 4;       // 按下到抬起动了不到这么多 CSS 像素 = 点一下
const ZOOM_MIN = 1 / 64, ZOOM_MAX = 256;

export function mountImageView(host: HTMLElement, hooks: ImageViewHooks): ImageView {
  const cv = document.createElement("canvas");
  cv.className = "image-view";
  cv.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:crosshair";
  host.appendChild(cv);
  const g = cv.getContext("2d")!;
  let img: CanvasImageSource | null = null, W = 1, H = 1;
  let thin = new Float32Array(0), thick = new Float32Array(0);
  let ringOf: (id: number) => ArrayLike<number> | undefined = () => undefined;
  let sel: number[] = [], hov: number | null = null;
  let tip: { x: number; y: number; d: number } | null = null;   // 悬停的笔印（格）
  let k = 1, ox = 0, oy = 0, fitted = false;   // 屏幕(CSS 像素) = 格 × k + o
  let raf = 0;
  const dpr = (): number => window.devicePixelRatio || 1;
  const size = (): { w: number; h: number } => ({ w: cv.clientWidth, h: cv.clientHeight });
  const schedule = (): void => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };

  const draw = (): void => {
    const { w, h } = size(), d = dpr();
    if (!(w > 0 && h > 0)) return;
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    if (!fitted) { doFit(); }
    g.setTransform(d, 0, 0, d, 0, 0);
    g.fillStyle = "#6b6f75"; g.fillRect(0, 0, w, h);
    // 图
    g.save(); g.translate(ox, oy); g.scale(k, k);
    g.fillStyle = "#d6d6d6"; g.fillRect(0, 0, W, H);
    if (img) { g.imageSmoothingEnabled = k < 1; g.drawImage(img, 0, 0, W, H); }
    g.restore();
    // 格线（放大到一格够大时；只画看得见的那一段）
    if (k >= GRID_FROM) {
      const x0 = Math.max(0, Math.floor(-ox / k)), x1 = Math.min(W, Math.ceil((w - ox) / k)), y0 = Math.max(0, Math.floor(-oy / k)), y1 = Math.min(H, Math.ceil((h - oy) / k));
      g.beginPath();
      for (let x = x0; x <= x1; x++) { const sx = Math.round(x * k + ox) + 0.5; g.moveTo(sx, y0 * k + oy); g.lineTo(sx, y1 * k + oy); }
      for (let y = y0; y <= y1; y++) { const sy = Math.round(y * k + oy) + 0.5; g.moveTo(x0 * k + ox, sy); g.lineTo(x1 * k + ox, sy); }
      g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 1; g.stroke();
    }
    // 选中 / 悬停：涂一层
    const fill = (id: number, color: string): void => {
      const r = ringOf(id); if (!r || r.length < 6) return;
      g.beginPath(); g.moveTo(r[0] * k + ox, r[1] * k + oy);
      for (let i = 2; i < r.length; i += 2) g.lineTo(r[i] * k + ox, r[i + 1] * k + oy);
      g.closePath(); g.fillStyle = color; g.fill();
    };
    for (const id of sel) fill(id, "rgba(40,120,255,0.38)");
    if (hov !== null) fill(hov, "rgba(255,150,30,0.45)");
    // 线：先黑底再白芯（什么颜色的画上都看得见）
    const lines = (a: Float32Array, under: number, over: number): void => {
      if (!a.length) return;
      g.beginPath();
      for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i] * k + ox, a[i + 1] * k + oy); g.lineTo(a[i + 2] * k + ox, a[i + 3] * k + oy); }
      g.lineCap = "round"; g.strokeStyle = "rgba(0,0,0,0.55)"; g.lineWidth = under; g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = over; g.stroke();
    };
    lines(thin, 1.6, 0.6);
    lines(thick, 3, 1.4);
    // 悬停的笔印：圆（什么颜色的画上都看得见）；放大到看得见格子时，格心落在圆里的格亮出来
    if (tip) {
      const r = tip.d / 2, cx = tip.x * k + ox, cy = tip.y * k + oy;
      if (k >= GRID_FROM) {
        g.fillStyle = "rgba(255,255,255,0.32)";
        for (let y = Math.max(0, Math.floor(tip.y - r)); y <= Math.min(H - 1, Math.ceil(tip.y + r)); y++) for (let x = Math.max(0, Math.floor(tip.x - r)); x <= Math.min(W - 1, Math.ceil(tip.x + r)); x++) {
          if ((x + 0.5 - tip.x) ** 2 + (y + 0.5 - tip.y) ** 2 <= r * r) g.fillRect(x * k + ox, y * k + oy, k, k);
        }
      }
      g.beginPath(); g.arc(cx, cy, Math.max(1.5, r * k), 0, Math.PI * 2);
      g.strokeStyle = "rgba(0,0,0,0.6)"; g.lineWidth = 2; g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 1; g.stroke();
    }
  };
  const doFit = (): void => {
    const { w, h } = size();
    if (!(w > 0 && h > 0)) return;
    k = Math.min((w - 16) / W, (h - 16) / H); if (!(k > 0)) k = 1;
    ox = (w - W * k) / 2; oy = (h - H * k) / 2; fitted = true;
  };
  const toImg = (sx: number, sy: number): { x: number; y: number } => ({ x: (sx - ox) / k, y: (sy - oy) / k });
  const local = (e: { clientX: number; clientY: number }): { x: number; y: number } => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const zoomAt = (sx: number, sy: number, f: number): void => { const nk = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k * f)), p = toImg(sx, sy); k = nk; ox = sx - p.x * k; oy = sy - p.y * k; schedule(); };

  // —— 输入 ——
  const ptrs = new Map<number, { x: number; y: number }>();
  let down: { x: number; y: number; moved: boolean } | null = null, pinch: { d: number; cx: number; cy: number } | null = null;
  let drawing: number | null = null;   // 正在画的那个指针（stroke 钩子收下的）
  const setTip = (p: { x: number; y: number } | null): void => {
    const d = p && hooks.brushAt ? hooks.brushAt(p.x, p.y) : null;
    const nt = p && d !== null ? { x: p.x, y: p.y, d } : null;
    if (!nt && !tip) return;
    tip = nt; schedule();
  };
  const setHover = (id: number | null): void => { if (id === hov) return; hov = id; hooks.hover?.(id); schedule(); };
  const onDown = (e: PointerEvent): void => {
    if (drawing !== null) { e.preventDefault(); return; }   // 一笔当中别的指针不理（不挪不缩）
    if (e.pointerType !== "touch" && !ptrs.size && hooks.stroke?.wants({ pointerType: e.pointerType, button: e.button })) {
      cv.setPointerCapture(e.pointerId); drawing = e.pointerId;
      const q = toImg(local(e).x, local(e).y); setTip(q); hooks.stroke.down(q.x, q.y, e);
      e.preventDefault(); return;
    }
    cv.setPointerCapture(e.pointerId);
    const p = local(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) down = { x: p.x, y: p.y, moved: false };
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; if (down) down.moved = true; }
    e.preventDefault();
  };
  const onMove = (e: PointerEvent): void => {
    const p = local(e), prev = ptrs.get(e.pointerId);
    if (drawing !== null) {
      if (e.pointerId !== drawing) return;
      const evs = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
      for (const c of evs.length ? evs : [e]) { const q = toImg(local(c).x, local(c).y); hooks.stroke!.move(q.x, q.y, c); }
      setTip(toImg(p.x, p.y)); return;
    }
    if (!prev) { if (e.pointerType === "mouse" || e.pointerType === "pen") { const q = toImg(p.x, p.y); setHover(hooks.pick(q.x, q.y)); setTip(q); } return; }
    ptrs.set(e.pointerId, p);
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      ox += cx - pinch.cx; oy += cy - pinch.cy;
      if (pinch.d > 1 && d > 1) zoomAt(cx, cy, d / pinch.d);
      pinch = { d, cx, cy }; schedule(); return;
    }
    if (down && !down.moved && Math.hypot(p.x - down.x, p.y - down.y) > CLICK_SLOP) down.moved = true;
    if (down?.moved) { ox += p.x - prev.x; oy += p.y - prev.y; schedule(); }
  };
  const onUp = (e: PointerEvent): void => {
    if (drawing !== null) {
      if (e.pointerId !== drawing) return;
      drawing = null;
      const q = toImg(local(e).x, local(e).y); hooks.stroke!.up(q.x, q.y, e, e.type === "pointercancel");
      if (e.pointerType !== "mouse") setTip(null);
      return;
    }
    const p = local(e), had = ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (had && ptrs.size === 0 && down) {
      if (!down.moved) { const q = toImg(p.x, p.y); hooks.click?.(hooks.pick(q.x, q.y)); }
      down = null;
    }
  };
  const onWheel = (e: WheelEvent): void => { e.preventDefault(); const p = local(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015))); };
  const onLeave = (e: PointerEvent): void => { if ((e.pointerType === "mouse" || e.pointerType === "pen") && !ptrs.size && drawing === null) { setHover(null); setTip(null); } };
  cv.addEventListener("pointerdown", onDown);
  cv.addEventListener("pointermove", onMove);
  cv.addEventListener("pointerup", onUp);
  cv.addEventListener("pointercancel", onUp);
  cv.addEventListener("pointerleave", onLeave);
  cv.addEventListener("wheel", onWheel, { passive: false });
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => schedule()) : null;
  ro?.observe(cv);

  return {
    setImage(src, width, height) { const changed = width !== W || height !== H; img = src; W = Math.max(1, width); H = Math.max(1, height); if (changed) fitted = false; schedule(); },
    setLines(a, b) { thin = a; thick = b; schedule(); },
    setRings(f) { ringOf = f; schedule(); },
    setMarks(s, h) { sel = [...s]; hov = h; schedule(); },
    fit() { fitted = false; schedule(); },
    scale: () => k,
    toScreen: (x, y) => ({ x: x * k + ox, y: y * k + oy }),
    dispose() { if (raf) cancelAnimationFrame(raf); ro?.disconnect(); cv.remove(); },
  };
}
