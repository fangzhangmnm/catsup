// view-gizmo.ts —— 右上角导航 gizmo（Blender / Unity 的那个：user 2026-10-21「视图之类的能不能参考unity blender editor」）。
// created 2026-10-21 by Claude Fable 5.1。
// 三根轴的小球随相机转：点 X / Y / Z 球 = 切到那个正视图（SU 叫法：+X 右视 / −X 左视 / +Y 后视 / −Y 前视 / +Z 顶视 / −Z 底视），
// 已经在那个视图再点 = 翻到对面（Blender 同款）；在 gizmo 上拖 = 环绕。下面竖着三个小拖柄（Blender 同款）：✋ 平移（拖）、🔍 缩放（上下拖）、
// ⛶ 缩放到全部（点）——单指针（数位笔 / 无键盘鼠标 / 以后 Quest 射线）四件导航全齐，不用 Shift。
// user 2026-10-21「模仿unity也有鼠标模式时点上去可以pan和zoom的小图标…也许不是overlay而是下面放三个，这样数位笔是不是导航就方便了因为没有shift」
// 「只保留最essential的」：透视 / 步行 / 穿墙 / 粗线稿偶尔才用 → ☰。
// 零 three：轴向量用相机的 right / up / forward 投到 2D；rAF 轮询相机键（yaw / pitch / 投影）只在变了时重画。
// 镜像（自由建模）也画在这里（2026-10-28 user「其实我倾向于不画。可以画在gizmos之类的上面。而不要干扰用户观察建模」）：开着 = 正中一块紫色小方片，
// 朝向 = 镜像面（跟着物体自己的轴）；有点对面找不到（镜像编辑挪它们只改一边）= 橙色虚线 + 个数。
import type { Editor } from "../editor/editor.ts";
import { iconHtml } from "./ui/icon.ts";
import { VIEW_GIZMO_DRAG_SLOP_PX } from "../controller/feel.ts";

const AXES: { id: string; v: [number, number, number]; color: string; label: string; view: "right" | "left" | "back" | "front" | "top" | "bottom"; opposite: "right" | "left" | "back" | "front" | "top" | "bottom" }[] = [
  { id: "+x", v: [1, 0, 0], color: "#d9342b", label: "X", view: "right", opposite: "left" },
  { id: "-x", v: [-1, 0, 0], color: "#d9342b", label: "", view: "left", opposite: "right" },
  { id: "+y", v: [0, 1, 0], color: "#2e8b57", label: "Y", view: "back", opposite: "front" },
  { id: "-y", v: [0, -1, 0], color: "#2e8b57", label: "", view: "front", opposite: "back" },
  { id: "+z", v: [0, 0, 1], color: "#1e6fd9", label: "Z", view: "top", opposite: "bottom" },
  { id: "-z", v: [0, 0, -1], color: "#1e6fd9", label: "", view: "bottom", opposite: "top" },
];
const SIZE = 96, C = SIZE / 2, LEN = 34, R_POS = 9.5, R_NEG = 7;
/** 镜像面小方片的半边长（轴长为 1）；颜色和模型上中缝点同一个紫，对不上 = 橙。 */
const MIRROR_HALF = 0.5, MIRROR_FILL = "#8b5cf6", MIRROR_WARN = "#e8890c";

export interface ViewGizmoOpts { isWalking(): boolean; /** 透视 / 平行切了（宿主刷新菜单勾选之类）。 */ onProjection?(): void; }
export interface ViewGizmo { render(): void; dispose(): void; }

export function mountViewGizmo(root: HTMLElement, editor: Editor, opts: ViewGizmoOpts): ViewGizmo {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`); svg.setAttribute("class", "gizmo-svg"); svg.setAttribute("aria-label", "视图方向");
  // 一列（user 2026-10-25「汉堡，手和放大镜，上下挪一下。给gizmos留出空间」「手和放大镜可以大一些，占满gizmos的行宽」；之前是叠在 gizmo 角上）：
  // ☰ 一行在上（靠右；main 插进 .gizmo-top）→ gizmo 本体 → 手 + 放大镜一行在下，各占半宽
  const top = document.createElement("div"); top.className = "gizmo-top"; root.appendChild(top);
  root.appendChild(svg);
  const btns = document.createElement("div"); btns.className = "gizmo-btns gizmo-nav"; root.appendChild(btns);
  const mk = (icon: string, title: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement("button"); b.type = "button"; b.className = "gizmo-btn"; b.title = title; b.innerHTML = iconHtml(icon);
    b.addEventListener("click", onClick); btns.appendChild(b); return b;
  };
  // 拖柄：按住拖 = 平移 / 缩放；点一下 = onTap（user 2026-10-25「放大镜和fit vp合租」「怎么区分双击和pan？怎么防抖？」）。
  // 点 vs 拖：按下后挪过 DRAG_SLOP 才算拖、才开始动相机——笔点下去手抖几 px 不会误缩放 / 误平移（防抖）；没挪过就松手 = 点一下。
  const DRAG_SLOP = VIEW_GIZMO_DRAG_SLOP_PX;   // CSS px（手感表）
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

  // 轴 → 屏幕 2D。平行投影 = 相机 right / up 直接投；透视 = gizmo 自己一块小屏幕、自己在正中，用相机同一个视场角做透视
  // （user 2026-10-25「不和场景共用vp。而是自己算透视，相当于自己有一块小屏幕，这样自己是居中的，就不会歪」）：
  // 近的轴端大、远的轴端小，但不随 gizmo 在大屏幕上的位置歪（v0.13.68 按所在那块屏幕的透视投 = 歪，撤）。
  /** 一个世界方向（轴长为单位）→ 小屏幕上的点 + 深度（正 = 远）。 */
  const projectVec = (x: number, y: number, z: number): { x: number; y: number; depth: number } => {
    const cam = editor.cam, r = cam.right(), u = cam.up(), f = cam.forward();
    const cx = x * r.x + y * r.y + z * r.z, cy = x * u.x + y * u.y + z * u.z, cz = x * f.x + y * f.y + z * f.z;
    if (cam.projection !== "persp") return { x: C + LEN * cx, y: C - LEN * cy, depth: cz };
    const D = (C / LEN) / Math.tan(cam.fovY / 2), k = D / Math.max(0.2, D + cz);   // 小屏幕半高 = C px；轴长 1 = LEN px（在中心那个深度）→ 眼到中心的距离（轴长为单位）
    return { x: C + LEN * cx * k, y: C - LEN * cy * k, depth: cz };
  };
  const project = (): { a: typeof AXES[number]; x: number; y: number; depth: number }[] =>
    AXES.map((a) => ({ a, ...projectVec(a.v[0], a.v[1], a.v[2]) })).sort((p, q) => q.depth - p.depth);   // 远的先画
  // 方框裁到轴端小球最远能到的地方，上下的钮贴着（user 2026-10-25「gizmos上下空间留多了。你重新算一下。贴着」）：
  // 平行投影 = LEN + R_POS；透视 = LEN / √(1 − 1/D²) + R_POS（轴斜向镜头 sinφ = 1/D 时屏上最长）；+1 = 描边。视场 50° → 46.5（原来留到 48）。
  let boxR = C, boxFov = NaN;
  const fitBox = (): void => {
    const fov = editor.cam.fovY;
    if (fov === boxFov) return;
    boxFov = fov;
    const D = (C / LEN) / Math.tan(fov / 2);
    boxR = D * D > 1.05 ? Math.min(C, Math.max(LEN, LEN / Math.sqrt(1 - 1 / (D * D))) + R_POS + 1) : C;
    svg.setAttribute("viewBox", `${C - boxR} ${C - boxR} ${2 * boxR} ${2 * boxR}`);
    root.style.setProperty("--gizmo-w", `${2 * boxR}px`);
  };
  let key = "";
  const render = (): void => {
    const cam = editor.cam;
    fitBox();
    const mi = editor.mirrorIndicator();
    const mk = mi ? `${mi.mode}|${mi.unpaired}|${[mi.span[0], mi.span[1]].map((d) => `${d.x.toFixed(3)},${d.y.toFixed(3)},${d.z.toFixed(3)}`).join("|")}` : "-";
    const k = `${cam.yaw.toFixed(4)}|${cam.pitch.toFixed(4)}|${cam.projection}|${opts.isWalking()}|${boxR}|${mk}`;
    if (k === key) return;
    key = k;
    const pts = project();
    let html = "";
    if (mi) {
      // 镜像面：正中一块小方片（垫在轴下面）；强行对称 = 实心一点
      const [a, b] = mi.span, h = MIRROR_HALF, warn = mi.unpaired > 0;
      const cs = [[h, h], [-h, h], [-h, -h], [h, -h]].map(([s, t]) => projectVec(a.x * s + b.x * t, a.y * s + b.y * t, a.z * s + b.z * t));
      const stroke = warn ? MIRROR_WARN : MIRROR_FILL;
      html += `<g class="gizmo-mirror" data-mode="${mi.mode}" data-unpaired="${mi.unpaired}"><title>${warn ? `镜像：${mi.unpaired} 个点对面找不到（模型对这个镜像面不对称），镜像编辑挪它们只改一边` : mi.mode === "force" ? "强行对称开着" : "镜像编辑开着"}</title>`;
      html += `<polygon points="${cs.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" fill="${MIRROR_FILL}" fill-opacity="${mi.mode === "force" ? 0.4 : 0.22}" stroke="${stroke}" stroke-width="1.5"${warn ? ` stroke-dasharray="3 2"` : ""}/>`;
      if (warn) { const c0 = cs.reduce((m, p) => (p.y > m.y ? p : m)); html += `<text x="${c0.x.toFixed(1)}" y="${(c0.y + 9).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="${MIRROR_WARN}">${mi.unpaired}</text>`; }
      html += "</g>";
    }
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
  const toSvg = (ev: PointerEvent): { x: number; y: number } => { const b = svg.getBoundingClientRect(); return { x: C - boxR + ((ev.clientX - b.left) / b.width) * 2 * boxR, y: C - boxR + ((ev.clientY - b.top) / b.height) * 2 * boxR }; };   // 方框裁过：viewBox 从 C − boxR 起
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
