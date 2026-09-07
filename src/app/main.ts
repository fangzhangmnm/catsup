// main.ts —— app 壳接线：工具条 / 顶栏 / 菜单 / 状态行 / 实验台抽屉 / OBJ 逃生口 / PWA 更新 toast。
// created 2026-09-06 by Claude Fable 5.1（0.3 app 壳纪元开工：user「离开 lab 变成一个 prototypical 但是正经的东西…先做无地骑士，
// 无 store 无导入导出…去掉那些很 lab 的东西，好好做 ui，可以留一个 gltf 或者 obj 的 io 逃生口」）
// 无地骑士：零持久化——模型只活在内存里；OBJ 是唯一出入口。

import { APP_VERSION } from "../version.ts";
import { Editor, TOOLS, type Tool, describeEvent } from "../editor/editor.ts";
import { PRESETS } from "../editor/presets.ts";
import { faceTriangles } from "../editor/render3.ts";
import { exportObj, parseObjSegments } from "../editor/obj-io.ts";
import type { FaceEvent } from "../kernel/kernel.ts";
import { attachGestures } from "./gestures.ts";
import { Locomotion } from "./locomotion.ts";
import { VR } from "./vr.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { initPwaShell } from "./pwa-shell.ts";
import { iconHtml } from "./ui/icon.ts";
import { togglePopupMenu, closePopupMenu, type PopupMenuItem } from "./ui/popup-menu.ts";
import { showNotice } from "./ui/notice.ts";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

// ---------- UI 偏好（纯 UI 状态，不是模型数据；无地骑士不碰任何模型持久化） ----------
const PREF = {
  get(key: string): string | null { try { return localStorage.getItem(`catsup.ui.${key}`); } catch { return null; } },
  set(key: string, v: string): void { try { localStorage.setItem(`catsup.ui.${key}`, v); } catch { /* 无痕/禁用：偏好不落地也能用 */ } },
};
let fingerDraws = PREF.get("fingerDraws") === "1";
let leftHanded = PREF.get("leftHanded") === "1";   // VR：左手持笔（工具手/面板手对调）
let labOpen = PREF.get("lab") === "1" || new URLSearchParams(location.search).has("lab");

// ---------- DOM ----------
const canvas = $<HTMLCanvasElement>("board");
const stage = $("stage");
const hintEl = $("hint");
const tipEl = $("tip");
const marqueeEl = $("marquee");
const toolbarEl = $("toolbar");
const logEl = $("labLog");
const labEl = $("lab");
const buildEl = $("build");

const HINT_DEFAULT = "画线 L · 矩形 R · 移动 M · 推拉 P · 橡皮 E · 选择 空格 ｜ 右键/单指拖=环绕 · 双指=平移缩放 · 滚轮=缩放 ｜ Esc 取消";
const HINT_WALK = "步行：WASD 走 · Shift 冲刺 · 空格 跳 · Ctrl 蹲 · ←→ 转身 · 右键拖=看 · T 按住瞄准瞬移（↑↓ 力度 ←→ 落地朝向）· G 回上一点 ｜ 工具 L R M P · 选择 Tab · 橡皮 X";
const HINT_VR = "VR：左摇杆走（按下冲刺）· 右摇杆 ←→ 转身 · 前推瞄准瞬移（左摇杆 ↑↓ 力度 ←→ 落地朝向）· 后拉回上一点 · A 跳 B 蹲 · 扳机画 · 手腕面板选工具 · X/Y 撤销重做";
const hintDefault = (): string => (vr?.isPresenting() ? HINT_VR : locomotion?.isWalking() ? HINT_WALK : HINT_DEFAULT);

// ---------- Editor ----------
const editor = new Editor(canvas, {
  hint: (t) => { hintEl.textContent = t ?? hintDefault(); },
  tip: (t, cx, cy) => {
    if (t) {
      tipEl.textContent = t;
      tipEl.hidden = false;
      tipEl.style.left = `${cx + 14}px`;
      tipEl.style.top = `${cy - 28}px`;
    } else tipEl.hidden = true;
  },
  events: (evs) => appendLog(evs),
  separator: (t) => appendSep(t),
  marquee: (r) => {
    if (!r) { marqueeEl.hidden = true; return; }
    const b = canvas.getBoundingClientRect();
    marqueeEl.hidden = false;
    Object.assign(marqueeEl.style, { left: `${b.left + r.x}px`, top: `${b.top + r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  },
  changed: () => syncUi(),
});

// ---------- 工具条 ----------
const TOOL_SPEC: { tool: Tool; icon: string; label: string; key: string }[] = [
  { tool: "select", icon: "select", label: "选择", key: "空格" },
  { tool: "line", icon: "line", label: "画线", key: "L" },
  { tool: "rect", icon: "rectangle", label: "矩形", key: "R" },
  { tool: "move", icon: "move", label: "移动", key: "M" },
  { tool: "pp", icon: "push-pull", label: "推拉", key: "P" },
  { tool: "erase", icon: "eraser", label: "橡皮", key: "E" },
];
// HUD 数据模型：桌面 DOM 工具栏与 VR 手腕面板消费同一份（A13 第 6 条）
const hud: HudModel = {
  version: APP_VERSION,
  tools: (): HudItem[] => TOOL_SPEC.map((t) => ({ id: t.tool, label: t.label, icon: t.icon, key: t.key, active: editor.tool === t.tool })),
  edits: (): HudItem[] => [
    { id: "undo", label: "撤销", icon: "arrow-undo", disabled: !editor.canUndo() },
    { id: "redo", label: "重做", icon: "arrow-redo", disabled: !editor.canRedo() },
    { id: "delete", label: "删除", icon: "trash-can", danger: true, hidden: !editor.hasSelection() },
  ],
  vr: (): HudItem[] => [
    { id: "noclip", label: locomotion.noclip ? "飞行中" : "穿墙飞行", active: locomotion.noclip },
    { id: "respawn", label: "回出生点" },
    { id: "exitvr", label: "退出 VR", danger: true },
  ],
  status: () => hintEl.textContent ?? "",
  pick: (id) => {
    if ((TOOLS as readonly string[]).includes(id)) { editor.setTool(id as Tool); return; }
    switch (id) {
      case "undo": editor.undo(); break;
      case "redo": editor.redo(); break;
      case "delete": editor.deleteSelection(); break;
      case "noclip": locomotion.setNoclip(!locomotion.noclip); vr.invalidatePanel(); break;
      case "respawn": { const p = locomotion.sim.state; locomotion.sim.reset({ x: 0, y: 0, z: Math.max(0, locomotion.world.floorZ()) }, p.heading, locomotion.sim.state.trackingOrigin ? { x: 0, y: 0, z: 1.6 } : { x: 0, y: 0, z: 1.6 }); break; }
      case "exitvr": vr.exit(); break;
    }
  },
};
const toolBtns = new Map<Tool, HTMLButtonElement>();
for (const spec of hud.tools()) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tool";
  b.title = `${spec.label}（${spec.key}）`;
  b.innerHTML = `${iconHtml(spec.icon!)}<span class="tool-label"></span>`;
  (b.querySelector(".tool-label") as HTMLElement).textContent = spec.label;
  b.addEventListener("click", () => hud.pick(spec.id));
  toolbarEl.appendChild(b);
  toolBtns.set(spec.id as Tool, b);
}
// 删面（lab 仪器：SU 没有这个工具——选面+Delete 才是正道；只在实验台里露出）
{
  const b = $<HTMLButtonElement>("labEraseFace");
  b.addEventListener("click", () => editor.setTool("eraseFace"));
  toolBtns.set("eraseFace", b);
}

// ---------- 顶栏 ----------
const btnUndo = $<HTMLButtonElement>("btnUndo");
const btnRedo = $<HTMLButtonElement>("btnRedo");
const btnDelete = $<HTMLButtonElement>("btnDelete");
const btnMenu = $<HTMLButtonElement>("btnMenu");
const btnView = $<HTMLButtonElement>("btnView");
const btnFit = $<HTMLButtonElement>("btnFit");
btnUndo.addEventListener("click", () => editor.undo());
btnRedo.addEventListener("click", () => editor.redo());
btnDelete.addEventListener("click", () => editor.deleteSelection());
btnFit.addEventListener("click", () => editor.zoomExtents());

type ViewId = "iso" | "top" | "front" | "right" | "back" | "left" | "persp" | "walk" | "noclip";
btnView.addEventListener("click", () => togglePopupMenu<ViewId>({
  anchor: btnView, align: "end",
  items: () => [
    // 视图名带方位（user 2026-09-07「视图菜单同意。前视=向北看」；convention：+Y 北、物体的前朝 −Y）
    { id: "iso", label: "等轴", icon: "persp-iso", disabled: locomotion.isWalking() },
    { id: "top", label: "顶视", hint: "俯视", disabled: locomotion.isWalking() },
    { id: "front", label: "前视", hint: "向北看", disabled: locomotion.isWalking() },
    { id: "right", label: "右视", hint: "向西看", disabled: locomotion.isWalking() },
    { id: "back", label: "后视", hint: "向南看", disabled: locomotion.isWalking() },
    { id: "left", label: "左视", hint: "向东看", disabled: locomotion.isWalking() },
    { id: "persp", label: "透视", checked: editor.cam.projection === "persp", separatorBefore: true, disabled: locomotion.isWalking() },
    // 0.4 VR 纪元：步行/飞行相机 = 不戴头显验证移动/teleport/碰撞的唯一途径（与 VR 共用 src/player/）
    { id: "walk", label: "步行相机", hint: "WASD · 空格跳 · 右键拖看", checked: locomotion.isWalking(), separatorBefore: true },
    { id: "noclip", label: "穿墙飞行", hint: "Q/E 下/上", checked: locomotion.noclip, disabled: !locomotion.isWalking() },
  ],
  onPick: (id) => {
    if (id === "persp") { editor.toggleProjection(); return "keep"; }
    if (id === "walk") { setWalk(!locomotion.isWalking()); return "keep"; }
    if (id === "noclip") { locomotion.setNoclip(!locomotion.noclip); return "keep"; }
    editor.setView(id);
  },
}));

type MenuId = "export" | "import" | "finger" | "lab" | "clear" | "help" | "update" | "vr" | "lefthand";
btnMenu.addEventListener("click", () => togglePopupMenu<MenuId>({
  anchor: btnMenu,
  items: () => [
    { id: "export", label: "导出 OBJ…", icon: "export", hint: "Blender 逃生口" },
    { id: "import", label: "导入 OBJ…", icon: "import" },
    // 0.4 VR 纪元：只在 navigator.xr 支持 immersive-vr 时露出（Quest 浏览器）；随时进出，模型与工具状态原样
    ...(vr.isSupported() ? [
      { id: "vr" as MenuId, label: vr.isPresenting() ? "退出 VR" : "进入 VR", icon: "hand", separatorBefore: true, hint: "Quest · 手腕面板" },
      { id: "lefthand" as MenuId, label: "VR 左手持笔", checked: leftHanded, hint: "面板换到右手" },
    ] : []),
    { id: "finger", label: "手指也能画", checked: fingerDraws, separatorBefore: true, hint: gestures.penEverSeen() ? "已见过笔，手指=相机" : undefined },
    { id: "lab", label: "实验台（膜事件日志 / 场景预置）", checked: labOpen },
    { id: "clear", label: "清空模型", icon: "trash-can", separatorBefore: true },
    { id: "help", label: "快捷键与手势", icon: "keyboard" },
    { id: "update", label: `强制更新（清缓存重启）· ${APP_VERSION}`, icon: "refresh" },
  ],
  onPick: (id) => {
    switch (id) {
      case "export": doExport(); break;
      case "import": objInput.click(); break;
      case "finger": fingerDraws = !fingerDraws; PREF.set("fingerDraws", fingerDraws ? "1" : "0"); return "keep";
      case "lab": setLab(!labOpen); return "keep";
      case "clear":
        showNotice({ id: "clear", text: "清空整个模型？（可撤销）", level: "warning", actions: [{ label: "清空", primary: true, onClick: () => editor.clearAll() }, { label: "取消", onClick: () => {} }] });
        break;
      case "help": toggleHelp(true); break;
      case "update": pwa.forceReset(); break;
      case "vr": if (vr.isPresenting()) vr.exit(); else vr.enter(); break;
      case "lefthand": leftHanded = !leftHanded; PREF.set("leftHanded", leftHanded ? "1" : "0"); return "keep";
    }
  },
}));

// ---------- 移动（步行相机 / VR 共用的 player）----------
const locomotion = new Locomotion(editor, canvas);
editor.viewExtras = () => ({ near: locomotion.isWalking() ? 0.05 : undefined, teleport: locomotion.teleportArc() });
let loopLast = 0;
function loopTick(t: number): void {
  const dt = loopLast ? Math.min(0.1, (t - loopLast) / 1000) : 1 / 60;
  loopLast = t;
  if (vr.isPresenting()) vr.tick(dt);   // XR：vr.tick 内含 locomotion.tick + 指针事件 + 面板
  else locomotion.tick(dt);
  editor.draw();
}
/** 连续渲染循环只在需要时跑（步行 / XR）；否则按需 draw。 */
function syncLoop(): void {
  const need = locomotion.isWalking() || vr.isPresenting();
  loopLast = 0;
  editor.setLoop(need ? loopTick : null);
}
const vr = new VR({
  editor, locomotion, hud,
  leftHanded: () => leftHanded,
  onChange: () => { syncLoop(); syncUi(); hintEl.textContent = hintDefault(); },
  log: (m) => console.warn(m),
});
function setWalk(on: boolean): void {
  if (on) locomotion.enterWalk(); else locomotion.exitWalk();
  syncLoop();
  hintEl.textContent = hintDefault();
  syncUi();
}

// ---------- 状态同步 ----------
function syncUi(): void {
  for (const [t, b] of toolBtns) b.classList.toggle("active", t === editor.tool);
  btnUndo.disabled = !editor.canUndo();
  btnRedo.disabled = !editor.canRedo();
  btnDelete.hidden = !editor.hasSelection();
  vr?.invalidatePanel();
}

// ---------- 实验台抽屉 ----------
function appendLog(events: FaceEvent[]): void {
  for (const ev of events) {
    const div = document.createElement("div");
    div.className = "ev";
    div.textContent = describeEvent(ev);
    logEl.prepend(div);
  }
  while (logEl.childElementCount > 400) logEl.lastElementChild?.remove();
}
function appendSep(text: string): void {
  const div = document.createElement("div");
  div.className = "sep";
  div.textContent = `── ${text} ──`;
  logEl.prepend(div);
}
{
  const presetsEl = $("labPresets");
  for (const p of PRESETS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = p.name;
    b.title = p.note;
    b.addEventListener("click", () => editor.applyPreset(p.name));
    presetsEl.appendChild(b);
  }
  $("labClearLog").addEventListener("click", () => { logEl.textContent = ""; });
  $("labClose").addEventListener("click", () => setLab(false));
}
function setLab(on: boolean): void {
  labOpen = on;
  PREF.set("lab", on ? "1" : "0");
  labEl.hidden = !on;
  if (!on && editor.tool === "eraseFace") editor.setTool("select");
  requestAnimationFrame(resize);
}

// ---------- 帮助 ----------
const helpEl = $("help");
function toggleHelp(on: boolean): void { helpEl.hidden = !on; }
$("helpClose").addEventListener("click", () => toggleHelp(false));
helpEl.addEventListener("click", (e) => { if (e.target === helpEl) toggleHelp(false); });

// ---------- OBJ 逃生口 ----------
const objInput = $<HTMLInputElement>("objFile");
function doExport(): void {
  const text = exportObj(editor.kernel, { triangulateHoled: faceTriangles, version: APP_VERSION });
  const blob = new Blob([text], { type: "model/obj" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `catsup-${stamp}.obj`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  showNotice({ text: `已导出 ${a.download}（${editor.kernel.faces().length} 面 / ${editor.kernel.edges().length} 边）`, level: "info" });
}
objInput.addEventListener("change", async () => {
  const file = objInput.files?.[0];
  objInput.value = "";
  if (!file) return;
  try {
    const r = parseObjSegments(await file.text());
    if (!r.segs.length) { showNotice({ text: "OBJ 里没有可用的边", level: "warning" }); return; }
    const evs = editor.addSegments(r.segs, `导入 ${file.name}`);
    editor.zoomExtents();
    showNotice({ text: `导入 ${file.name}：${r.segs.length} 条边 → ${evs.length} 个膜事件`, level: "info" });
  } catch (err) {
    showNotice({ text: `导入失败：${(err as Error).message}`, level: "error" });
  }
});

// ---------- 手势 & 键盘 ----------
const gestures = attachGestures(canvas, editor, {
  fingerDraws: () => fingerDraws,
  onUndo: () => editor.undo(),
  onRedo: () => editor.redo(),
  look: (dx, dy) => locomotion.look(dx, dy),
  walking: () => locomotion.isWalking(),
});
window.addEventListener("keydown", (ev) => {
  const target = ev.target as HTMLElement | null;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
  if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    // SU 对齐（user 2026-09-02：默认对齐 SU，确实不爽再挪；WASD 留给未来 fly cam）
    // 步行模式（0.4）：空格=跳、E=上升 归 player；选择/橡皮另有双模式通用键 Tab / X
    const map: Record<string, Tool> = { " ": "select", l: "line", r: "rect", m: "move", p: "pp", e: "erase", tab: "select", x: "erase" };
    const key = ev.key.toLowerCase();
    const t = map[key];
    const takenByWalk = locomotion.isWalking() && (key === " " || key === "e");
    if (t && !takenByWalk) { ev.preventDefault(); editor.setTool(t); return; }
  }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "z" || ev.key === "Z")) {
    ev.preventDefault();
    if (ev.shiftKey) editor.redo(); else editor.undo();
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "y" || ev.key === "Y")) { ev.preventDefault(); editor.redo(); return; }
  if (ev.key === "Delete" || ev.key === "Backspace") { if (editor.hasSelection()) { ev.preventDefault(); editor.deleteSelection(); } return; }
  if (ev.key === "Escape") { closePopupMenu(); toggleHelp(false); editor.cancel(); }
});

// ---------- 尺寸 ----------
function resize(): void { editor.resize(window.devicePixelRatio || 1); }
new ResizeObserver(resize).observe(stage);
window.addEventListener("resize", resize);

// ---------- PWA ----------
const pwa = initPwaShell({
  onUpdateAvailable: () => showNotice({
    id: "update", text: "有新版本", level: "info",
    actions: [{ label: "刷新", primary: true, onClick: () => { pwa.reload(); } }],
  }),
});
buildEl.textContent = `${APP_VERSION}${pwa.isDevRoute ? " · dev" : ""}`;
if (new URLSearchParams(location.search).has("reset")) showNotice({ text: `已清缓存重启 · ${APP_VERSION}`, level: "info" });

// ---------- 探针钩子（scripts/probe-boot.mjs 用；不是 API） ----------
(window as unknown as { __catsup: unknown }).__catsup = { editor, locomotion, vr, hud, version: APP_VERSION };

// ---------- 起 ----------
labEl.hidden = !labOpen;
editor.setTool("line");
hintEl.textContent = hintDefault();
resize();
