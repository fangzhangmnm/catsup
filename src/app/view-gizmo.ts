// view-gizmo.ts —— 右上角导航 gizmo（Blender / Unity 的那个：user 2026-10-21「视图之类的能不能参考unity blender editor」）。
// created 2026-10-21 by Claude Fable 5.1。
// 三根轴的小球随相机转：点 X / Y / Z 球 = 切到那个正视图（SU 叫法：+X 右视 / −X 左视 / +Y 后视 / −Y 前视 / +Z 顶视 / −Z 底视），
// 已经在那个视图再点 = 翻到对面（Blender 同款）；在 gizmo 上拖 = 环绕。下面只挂一个小钮：缩放到全部（迷路回家）。
// user 2026-10-21「可以先不用做全量的。简洁，只保留最essential的。想一下手指模式你需要什么，或者只有鼠标没有键盘的时候」：
// 没键盘时真正缺的 = 切正视图（球）、缩放到全部（钮）；透视 / 步行 / 穿墙 / 粗线稿偶尔才用 → ☰。
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

export interface ViewGizmoOpts { isWalking(): boolean; }
export interface ViewGizmo { render(): void; dispose(): void; }

export function mountViewGizmo(root: HTMLElement, editor: Editor, opts: ViewGizmoOpts): ViewGizmo {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`); svg.setAttribute("class", "gizmo-svg"); svg.setAttribute("aria-label", "视图方向");
  root.appendChild(svg);
  const btns = document.createElement("div"); btns.className = "gizmo-btns"; root.appendChild(btns);
  const mk = (icon: string, title: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement("button"); b.type = "button"; b.className = "gizmo-btn"; b.title = title; b.innerHTML = iconHtml(icon);
    b.addEventListener("click", onClick); btns.appendChild(b); return b;
  };
  mk("maximize-viewport", "缩放到全部（Shift+Z）", () => editor.zoomExtents());

  // 轴 → 屏幕 2D（相机 right / up / forward）
  const project = (): { a: typeof AXES[number]; x: number; y: number; depth: number }[] => {
    const cam = editor.cam, r = cam.right(), u = cam.up(), f = cam.forward();
    return AXES.map((a) => {
      const [x, y, z] = a.v;
      return { a, x: C + LEN * (x * r.x + y * r.y + z * r.z), y: C - LEN * (x * u.x + y * u.y + z * u.z), depth: x * f.x + y * f.y + z * f.z };
    }).sort((p, q) => q.depth - p.depth);   // 远的先画
  };
  let key = "";
  const render = (): void => {
    const cam = editor.cam;
    const k = `${cam.yaw.toFixed(4)}|${cam.pitch.toFixed(4)}|${cam.projection}|${opts.isWalking()}`;
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
  const up = (ev: PointerEvent): void => {
    if (!down || ev.pointerId !== down.id) return;
    const wasClick = !down.moved; down = null;
    if (!wasClick || opts.isWalking()) return;
    const p = toSvg(ev);
    let best: (typeof AXES)[number] | null = null, bd = 14;
    for (const q of project()) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q.a; } }
    if (!best) return;
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
