// view-gizmo.ts —— 右上角导航 gizmo（Blender / Unity 的那个：user 2026-10-21「视图之类的能不能参考unity blender editor」）。
// created 2026-10-21 by Claude Fable 5.1。
// 三根轴的小球随相机转：点 X / Y / Z 球 = 切到那个正视图（SU 叫法：+X 右视 / −X 左视 / +Y 后视 / −Y 前视 / +Z 顶视 / −Z 底视），
// 已经在那个视图再点 = 翻到对面（Blender 同款）；在 gizmo 上拖 = 环绕。下面竖着三个小拖柄（Blender 同款）：✋ 平移（拖）、🔍 缩放（上下拖）、
// ⛶ 缩放到全部（点）——单指针（数位笔 / 无键盘鼠标 / 以后 Quest 射线）四件导航全齐，不用 Shift。
// user 2026-10-21「模仿unity也有鼠标模式时点上去可以pan和zoom的小图标…也许不是overlay而是下面放三个，这样数位笔是不是导航就方便了因为没有shift」
// 「只保留最essential的」：透视 / 步行 / 穿墙 / 粗线稿偶尔才用 → ☰。
// 零 three：轴向量用相机的 right / up / forward 投到 2D；rAF 轮询相机键（yaw / pitch / 投影）只在变了时重画。
import type { Editor } from "../editor/editor.ts";
import { iconHtml } from "./ui/icon.ts";

const AXES: { id: string; v: [number, number, number]; color: string; label: string; view: "right" | "left" | "back" | "front" | "top" | "bottom"; opposite: "right" | "left" | "back" | "front" | "top" | "bottom" }[] = [
  { id: "+x", v: [1, 0, 0], color: "#d9342b", label: "X", view: "right", opposite: "left" },
  { id: "-x", v: [-1, 0, 0], color: "#d9342b", label: "", view: "left", opposite: "right" },
  { id: "+y", v: [0, 1, 0], color: "#2e8b57", label: "Y", view: "back", opposite: "front" },
  { id: "-y", v: [0, -1, 0], color: "#2e8b57", label: "", view: "front", opposite: "back" },
  { id: "+z", v: [0, 0, 1], color: "#1e6fd9", label: "Z", view: "top", opposite: "bottom" },
  { id: "-z", v: [0, 0, -1], color: "#1e6fd9", label: "", view: "bottom", opposite: "top" },
];
const SIZE = 96, C = SIZE / 2, LEN = 34, R_POS = 9.5, R_NEG = 7;

export interface ViewGizmoOpts { isWalking(): boolean; /** 透视 / 平行切了（宿主刷新菜单勾选之类）。 */ onProjection?(): void; /** 画布（透视对齐要知道 gizmo 在画布上的哪儿）。 */ canvas?: HTMLElement; }
export interface ViewGizmo { render(): void; dispose(): void; }

export function mountViewGizmo(root: HTMLElement, editor: Editor, opts: ViewGizmoOpts): ViewGizmo {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`); svg.setAttribute("class", "gizmo-svg"); svg.setAttribute("aria-label", "视图方向");
  // 钮挤在 gizmo 圆圈外的角上（user 2026-10-25 手绘：☰ 右上、手左下、放大镜右下）：外面套一个比圆大一圈的方框，钮摆在方框的角上，不压轴的小球
  const dial = document.createElement("div"); dial.className = "gizmo-dial"; root.appendChild(dial);
  dial.appendChild(svg);
  const btns = document.createElement("div"); btns.className = "gizmo-btns gizmo-nav"; dial.appendChild(btns);   // ☰ 由 main 插进来（.gizmo-menu）
  const mk = (icon: string, title: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement("button"); b.type = "button"; b.className = "gizmo-btn"; b.title = title; b.innerHTML = iconHtml(icon);
    b.addEventListener("click", onClick); btns.appendChild(b); return b;
  };
  // 拖柄：按住拖 = 平移 / 缩放；点一下 = onTap（user 2026-10-25「放大镜和fit vp合租」「怎么区分双击和pan？怎么防抖？」）。
  // 点 vs 拖：按下后挪过 DRAG_SLOP 才算拖、才开始动相机——笔点下去手抖几 px 不会误缩放 / 误平移（防抖）；没挪过就松手 = 点一下。
  const DRAG_SLOP = 6;   // CSS px
  const drag = (b: HTMLButtonElement, onDrag: (dx: number, dy: number) => void, onTap?: () => void): void => {
    let d: { id: number; x: number; y: number; x0: number; y0: number; moving: boolean } | null = null;
    b.addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); b.setPointerCapture(ev.pointerId); d = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, moving: false }; b.classList.add("dragging"); });
    b.addEventListener("pointermove", (ev) => {
      if (!d || ev.pointerId !== d.id) return;
      if (!d.moving) { if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < DRAG_SLOP) return; d.moving = true; d.x = ev.clientX; d.y = ev.clientY; return; }   // 过了门槛从这儿起算，不把门槛那几 px 补进去
      onDrag(ev.clientX - d.x, ev.clientY - d.y); d.x = ev.clientX; d.y = ev.clientY; editor.draw();
    });
    const end = (ev: PointerEvent): void => {
      if (!d || ev.pointerId !== d.id) return;
      const tap = !d.moving && ev.type === "pointerup";
      d = null; b.classList.remove("dragging");
      if (tap) onTap?.();
    };
    b.addEventListener("pointerup", end); b.addEventListener("pointercancel", end);
  };
  const bPan = mk("hand", "平移（按住拖）", () => {}); bPan.classList.add("gizmo-pan");
  drag(bPan, (dx, dy) => editor.cam.pan(dx, dy, editor.vp()));
  const bZoom = mk("zoom", "缩放：点一下 = 有选区缩放到选区、没有就缩放到全部（Shift+Z）；按住上下拖 = 缩放", () => {}); bZoom.classList.add("gizmo-zoom");   // 图标 zoom = 图标库 PENDING（fable 自画未过目）
  drag(bZoom, (_dx, dy) => editor.cam.zoomBy(Math.pow(1.01, dy)), () => editor.zoomTo());   // 缩放到全部的钮并进来了（user「zoom to selected和zoom to fit可以合租用放大镜……点击是zoom to，拖动是放大」）

  // 轴 → 屏幕 2D。平行投影 = 相机 right / up 直接投；透视 = 按 gizmo 所在那块屏幕的透视投（user 2026-10-25「gizmos能不能按照透视对齐」）：
  // gizmo 中心沿视线打到和焦点同深度的点 P，三根轴从 P 出发按真透视投到屏幕，方向和长短就和 gizmo 周围的轴向线（网格）平行。
  const persp = (): { P: { x: number; y: number; z: number }; px: number; sx: number; sy: number } | null => {
    const cam = editor.cam, canvas = opts.canvas;
    if (cam.projection !== "persp" || !canvas) return null;
    const vp = editor.vp(), cr = canvas.getBoundingClientRect(), gr = svg.getBoundingClientRect();
    const sx = gr.left + gr.width / 2 - cr.left, sy = gr.top + gr.height / 2 - cr.top;
    const f = cam.forward(), r = cam.right(), u = cam.up(), e = cam.eye(), t = cam.target, th = Math.tan(cam.fovY / 2), asp = vp.w / vp.h;
    const nx = (2 * sx) / vp.w - 1, ny = 1 - (2 * sy) / vp.h;
    const d = (t.x - e.x) * f.x + (t.y - e.y) * f.y + (t.z - e.z) * f.z;   // 焦点深度
    const dir = { x: f.x + r.x * nx * th * asp + u.x * ny * th, y: f.y + r.y * nx * th * asp + u.y * ny * th, z: f.z + r.z * nx * th * asp + u.z * ny * th };
    return { P: { x: e.x + dir.x * d, y: e.y + dir.y * d, z: e.z + dir.z * d }, px: (2 * d * th) / vp.h, sx, sy };   // px = 焦点深度上 1 屏幕像素多少米
  };
  const project = (): { a: typeof AXES[number]; x: number; y: number; depth: number }[] => {
    const cam = editor.cam, r = cam.right(), u = cam.up(), f = cam.forward(), pv = persp();
    if (pv) {
      const vp = editor.vp(), step = pv.px * 40, base = cam.angularPx(pv.P, vp);
      const d2 = AXES.map((a) => { const [x, y, z] = a.v, q = cam.angularPx({ x: pv.P.x + x * step, y: pv.P.y + y * step, z: pv.P.z + z * step }, vp); return { a, dx: q.x - base.x, dy: q.y - base.y, depth: x * f.x + y * f.y + z * f.z }; });
      const s = LEN / Math.max(1e-6, ...d2.filter((v) => v.a.label).map((v) => Math.hypot(v.dx, v.dy)));   // 方向、相对长短照透视；最长那根 = 原来的长度（不让 gizmo 缩小）
      return d2.map((v) => ({ a: v.a, x: C + s * v.dx, y: C + s * v.dy, depth: v.depth })).sort((p, q) => q.depth - p.depth);
    }
    return AXES.map((a) => {
      const [x, y, z] = a.v;
      return { a, x: C + LEN * (x * r.x + y * r.y + z * r.z), y: C - LEN * (x * u.x + y * u.y + z * u.z), depth: x * f.x + y * f.y + z * f.z };
    }).sort((p, q) => q.depth - p.depth);   // 远的先画
  };
  let key = "";
  const render = (): void => {
    const cam = editor.cam;
    const vpk = editor.vp();
    const k = `${cam.yaw.toFixed(4)}|${cam.pitch.toFixed(4)}|${cam.projection}|${opts.isWalking()}|${cam.projection === "persp" ? `${cam.target.x.toFixed(3)},${cam.target.y.toFixed(3)},${cam.target.z.toFixed(3)}|${cam.halfH.toFixed(3)}|${vpk.w}x${vpk.h}` : ""}`;   // 透视对齐跟焦点 / 远近 / 视口走
    if (k === key) return;
    key = k;
    const pts = project();
    let html = "";
    for (const p of pts) if (p.a.label) html += `<line x1="${C}" y1="${C}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${p.a.color}" stroke-width="2" stroke-linecap="round" opacity="${p.depth > 0 ? 0.45 : 0.9}"/>`;
    for (const p of pts) {
      const neg = !p.a.label, rr = neg ? R_NEG : R_POS, op = p.depth > 0 ? 0.55 : 1;
      html += `<g class="gizmo-axis" data-id="${p.a.id}" opacity="${op}"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rr}" fill="${neg ? "rgba(255,255,255,.75)" : p.a.color}" stroke="${p.a.color}" stroke-width="${neg ? 1.5 : 0}"/>`;
      if (!neg) html += `<text x="${p.x.toFixed(1)}" y="${(p.y + 3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${p.a.label}</text>`;
      html += "</g>";
    }
    svg.innerHTML = html;
  };
  // 点球 = 切视图（已在该视图 → 对面）；拖 = 环绕
  let down: { x: number; y: number; moved: boolean; id: number } | null = null;
  const toSvg = (ev: PointerEvent): { x: number; y: number } => { const b = svg.getBoundingClientRect(); return { x: ((ev.clientX - b.left) / b.width) * SIZE, y: ((ev.clientY - b.top) / b.height) * SIZE }; };
  svg.addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); svg.setPointerCapture(ev.pointerId); down = { x: ev.clientX, y: ev.clientY, moved: false, id: ev.pointerId }; });
  svg.addEventListener("pointermove", (ev) => {
    if (!down || ev.pointerId !== down.id) return;
    const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) < 3) return;
    down.moved = true;
    editor.cam.orbit(dx, dy); editor.draw(); render();
    down.x = ev.clientX; down.y = ev.clientY;
  });
  let lastEmptyTap: { t: number; x: number; y: number } | null = null;   // 空处双击 = 透视 / 平行切换
  const up = (ev: PointerEvent): void => {
    if (!down || ev.pointerId !== down.id) return;
    const wasClick = !down.moved; down = null;
    if (!wasClick || opts.isWalking()) return;
    const p = toSvg(ev);
    let best: (typeof AXES)[number] | null = null, bd = 14;
    for (const q of project()) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q.a; } }
    if (!best) {
      // 空处（没点中轴球）双击 = 透视 / 平行切换（user 2026-10-25「gizmos双击可以切换透视和平行」）；轴球上的点击照旧切视图，两下 = 翻到对面
      const now = performance.now(), l = lastEmptyTap;
      if (l && now - l.t < 400 && Math.hypot(ev.clientX - l.x, ev.clientY - l.y) < 12) { lastEmptyTap = null; editor.toggleProjection(); render(); opts.onProjection?.(); return; }
      lastEmptyTap = { t: now, x: ev.clientX, y: ev.clientY };
      return;
    }
    lastEmptyTap = null;
    const cam = editor.cam, before = `${cam.yaw.toFixed(3)}|${cam.pitch.toFixed(3)}`;
    editor.setView(best.view);
    if (`${cam.yaw.toFixed(3)}|${cam.pitch.toFixed(3)}` === before) editor.setView(best.opposite);   // 已经在这个视图 → 翻到对面
    render();
  };
  svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
  let raf = 0;
  const tick = (): void => { render(); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  render();
  return { render, dispose: () => cancelAnimationFrame(raf) };
}
