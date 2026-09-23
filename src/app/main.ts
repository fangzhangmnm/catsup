// main.ts —— app 壳接线：工具条 / 顶栏 / 菜单 / 状态行 / 调试日志 sheet / OBJ 逃生口 / PWA 更新 toast / 文档生命周期 boot 编排。
// created 2026-09-06 by Claude Fable 5.1（0.3 app 壳纪元开工：user「离开 lab 变成一个 prototypical 但是正经的东西…先做无地骑士，
// 无 store 无导入导出…去掉那些很 lab 的东西，好好做 ui，可以留一个 gltf 或者 obj 的 io 逃生口」）
// 0.5 转正纪元起：文档生命周期 = src/app/session.ts（三态家）+ @internal/store 单一接缝 + @internal/gallery；OBJ 只剩逃生口。
// v0.5.7（2026-09-22，Claude Fable 5.1）：boot 改用包的 restoreLastSession（回执条三态编排）+ **本地恢复先于 initAuth**（零网络秒开）
//   + 登录 / 回线 / 回前台显式快进 + 崩溃安全 flush 三件；审计 = ai-docs/20260922-lifecycle-alignment-with-weebpaint.md。

import { APP_VERSION } from "../version.ts";
import { deviceKvGet, deviceKvSet, migrateLegacyUiPrefs } from "./device-kv.ts";
import { Session, supportsOpenPicker, supportsSavePicker } from "./session.ts";
import { restoreLastSession, readSlate, setRestoreAttempt, type RestoreOutcome } from "@internal/gallery";
import { initGalleryHost } from "./gallery-host.ts";
import { auth, ensureStore, hasStore, requireStore } from "../app-store.ts";
import { captureThumbnail } from "./thumbnail.ts";
import { initSheets, openChoiceSheet } from "./ui/sheets.ts";
import { reportError as funnel } from "./error-funnel.ts";
import { Editor, TOOLS, type Tool } from "../editor/editor.ts";
import { faceTriangles } from "../editor/render3.ts";
import { exportObj, parseObjSegments } from "../editor/obj-io.ts";
import { attachGestures } from "./gestures.ts";
import { Locomotion } from "./locomotion.ts";
import { VR } from "./vr.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { initPwaShell } from "./pwa-shell.ts";
import { iconHtml } from "./ui/icon.ts";
import { togglePopupMenu, closePopupMenu, type PopupMenuItem } from "./ui/popup-menu.ts";
import { showNotice, type NoticeOpts } from "./ui/notice.ts";
import { initCrashRecovery } from "./crash-recovery.ts";
import { crashStore } from "./crash-store.ts";
import { initDebugLog, note, record, toText as debugLogText, entries as debugLogEntries } from "./debug-log.ts";
import { initDebugLogSheet, openDebugLogSheet, closeDebugLogSheet } from "./debug-log-sheet.ts";
import { traceLine } from "./debug-lines.ts";

// 黑匣子最早起（实验台 sunset → 调试日志，user 2026-09-20）：开机 URL 行必须在 initAuth 之前抓——MSAL 处理完 redirect 会抹掉 hash。
initDebugLog();

// 通知 = 桌面 toast + VR 字幕位（同一份文案；vr 未进会话时后者无事）
function notify(opts: NoticeOpts): void {
  showNotice(opts);
  vr?.toast(opts.text, opts.level ?? "neutral");
}
// 错误上报（内核/求解器抛错、渲染循环抛错、全局 uncaught）：console 必留 + toast/字幕；同文案 2 s 内只报一次（预演每帧都会撞同一错）
let lastErr = { text: "", at: 0 };
function reportError(where: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[catsup] ${where}:`, err);
  // 栈顶两帧的函数名（esbuild --keep-names 保住）：真机没 devtools，toast 就是唯一线索
  const frames = err instanceof Error && err.stack ? err.stack.split("\n").slice(1, 4).map((l) => (l.match(/at\s+([\w$.<>]+)/) ?? [])[1]).filter(Boolean) : [];
  const text = `出错（${where}）：${msg}${frames.length ? ` @ ${frames.join(" < ")}` : ""}`;
  const now = performance.now();
  if (text === lastErr.text && now - lastErr.at < 2000) return;
  lastErr = { text, at: now };
  record("error", `[${where}] ${msg}${frames.length ? ` @ ${frames.join(" < ")}` : ""}`);   // 黑匣子（去重之后：预演每帧撞同一错只记一次）
  notify({ id: "err", text, level: "error" });
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

// ---------- UI 偏好（纯 UI 状态，不是模型数据）——device-kv 器官（全 app 唯一 localStorage 入口，红线守卫执法） ----------
migrateLegacyUiPrefs(["fingerDraws", "leftHanded"]);
deviceKvSet("ui.lab", null);   // 实验台 sunset（2026-09-20）：旧开关键清掉
const PREF = {
  get(key: string): string | null { return deviceKvGet(`ui.${key}`); },
  set(key: string, v: string): void { deviceKvSet(`ui.${key}`, v); },
};
let fingerDraws = PREF.get("fingerDraws") === "1";
let leftHanded = PREF.get("leftHanded") === "1";   // VR：左手持笔（工具手/面板手对调）

// ---------- DOM ----------
const canvas = $<HTMLCanvasElement>("board");
const stage = $("stage");
const hintEl = $("hint");
const tipEl = $("tip");
const marqueeEl = $("marquee");
const toolbarEl = $("toolbar");
const buildEl = $("build");

const HINT_DEFAULT = "画线 L · 矩形 R · 移动 M · 推拉 P · 橡皮 E · 选择 空格 ｜ 右键/单指拖=环绕 · 双指=平移缩放 · 滚轮=缩放 ｜ Esc 取消";
const HINT_WALK = "步行：WASD 走 · Shift 冲刺 · 空格 跳（双击=飞行开关）· Ctrl 蹲 · Q/E 下/上 · ←→ 转身 · 右键拖=看 · T 按住瞄准瞬移（↑↓ 力度 ←→ 落地朝向）· G 回上一点 ｜ 工具 L R M P · 选择 Tab · 橡皮 X";
const HINT_VR = "VR：左摇杆走（按下冲刺）· 右摇杆 ←→ 转身 · 前推瞄准瞬移（左摇杆 ↑↓ 力度 ←→ 落地朝向）· 后拉回上一点 · A 跳（双击=飞行开关）B 蹲 · 扳机画 · 手腕面板选工具 · X/Y 撤销重做";
const hintDefault = (): string => (vr?.isPresenting() ? HINT_VR : locomotion?.isWalking() ? HINT_WALK : HINT_DEFAULT);

// ---------- Editor ----------
let _session: Session | null = null;   // editor.host.changed 要同步喂 session（lazyblank 首笔安家）；session 在 editor 之后才建
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
  trace: (e) => note("op", traceLine(e)),   // 记账面包屑 → 黑匣子（一 op 一行；失败行带 op JSON）
  marquee: (r) => {
    if (!r) { marqueeEl.hidden = true; return; }
    const b = canvas.getBoundingClientRect();
    marqueeEl.hidden = false;
    Object.assign(marqueeEl.style, { left: `${b.left + r.x}px`, top: `${b.top + r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  },
  changed: () => { syncUi(); _session?.noteChange(); },   // 同步：首笔安家在 commit 的同一调用栈里翻旗（WeebPaint wp:histchange 同形）
  error: (err, where) => reportError(where === "commit" ? "提交" : "预演", err),
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
      case "respawn": { const sp = locomotion.defaultSpawn(); locomotion.sim.reset(sp.pos, sp.heading, { x: 0, y: 0, z: 1.6 }); break; }
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
    { id: "noclip", label: "穿墙飞行", hint: "双击空格切换 · Q/E 下/上", checked: locomotion.noclip, disabled: !locomotion.isWalking() },
  ],
  onPick: (id) => {
    if (id === "persp") { editor.toggleProjection(); return "keep"; }
    if (id === "walk") { setWalk(!locomotion.isWalking()); return "keep"; }
    if (id === "noclip") { locomotion.setNoclip(!locomotion.noclip); return "keep"; }
    editor.setView(id);
  },
}));

type MenuId = "new" | "gallery" | "save" | "saveas" | "open" | "download" | "cloud" | "export" | "import" | "finger" | "clear" | "help" | "debuglog" | "update" | "vr" | "lefthand";
btnMenu.addEventListener("click", () => togglePopupMenu<MenuId>({
  anchor: btnMenu,
  items: () => [
    // 转正纪元（2026-09-20）：文档生命周期 = WeebPaint 无地标准三态；图库 = @internal/gallery
    { id: "new", label: "新建模型", icon: "new" },
    { id: "gallery", label: "图库", icon: "gallery", hint: hasStore() ? undefined : "本机 + OneDrive" },
    { id: "save", label: session.home.kind === "transient" ? (supportsSavePicker() ? "保存到磁盘…" : "保存（下载 .glb）") : "保存", icon: "floppy-disk", hint: "Ctrl+S", separatorBefore: true },
    ...(session.home.kind !== "gallery" ? [{ id: "saveas" as MenuId, label: supportsSavePicker() ? "另存到磁盘…" : "另存（下载 .glb）", icon: "save-as" }] : []),
    { id: "open", label: "打开本地 .glb…", icon: "folder-open", hint: "Ctrl+O" },
    { id: "download", label: "导出 .glb（下载一份）", icon: "download" },
    { id: "cloud", label: auth.isSignedIn() ? "退出 OneDrive 登录" : "登录 OneDrive", icon: "cloud", separatorBefore: true, disabled: !auth.isAuthConfigured(), hint: auth.isAuthConfigured() ? undefined : "未配置 client id" },
    { id: "export", label: "导出 OBJ…", icon: "export", hint: "Blender 逃生口", separatorBefore: true },
    { id: "import", label: "导入 OBJ…", icon: "import" },
    // 0.4 VR 纪元：只在 navigator.xr 支持 immersive-vr 时露出（Quest 浏览器）；随时进出，模型与工具状态原样
    ...(vr.isSupported() ? [
      { id: "vr" as MenuId, label: vr.isPresenting() ? "退出 VR" : "进入 VR", icon: "hand", separatorBefore: true, hint: "Quest · 手腕面板" },
      { id: "lefthand" as MenuId, label: "VR 左手持笔", checked: leftHanded, hint: "面板换到右手" },
    ] : []),
    { id: "finger", label: "手指也能画", checked: fingerDraws, separatorBefore: true, hint: gestures.penEverSeen() ? "已见过笔，手指=相机" : undefined },
    { id: "clear", label: "清空模型", icon: "trash-can", separatorBefore: true },
    { id: "help", label: "快捷键与手势", icon: "keyboard" },
    { id: "debuglog", label: "调试日志", icon: "wrench", hint: "复制给开发者" },
    { id: "update", label: `强制更新（清缓存重启）· ${APP_VERSION}`, icon: "refresh" },
  ],
  onPick: (id) => {
    switch (id) {
      case "new": void session.newDoc(); break;
      case "gallery": void galleryHost.open(); break;
      case "save": smartSave(); break;
      case "saveas": void session.settleToFile(); break;
      case "open": openLocal(); break;
      case "download": session.exportDownload(); break;
      case "cloud": if (auth.isSignedIn()) { void cloudSignOut(); } else { cloudSignIn(); } break;
      case "export": doExport(); break;
      case "import": objInput.click(); break;
      case "finger": fingerDraws = !fingerDraws; PREF.set("fingerDraws", fingerDraws ? "1" : "0"); return "keep";
      case "debuglog": openDebugLogSheet(); break;
      case "clear":
        notify({ id: "clear", text: "清空整个模型？（可撤销）", level: "warning", actions: [{ label: "清空", primary: true, onClick: () => editor.clearAll() }, { label: "取消", onClick: () => {} }] });
        break;
      case "help": toggleHelp(true); break;
      case "update": note("sw", "force reset requested (menu)"); pwa.forceReset(); break;
      case "vr": if (vr.isPresenting()) vr.exit(); else vr.enter(); break;
      case "lefthand": leftHanded = !leftHanded; PREF.set("leftHanded", leftHanded ? "1" : "0"); return "keep";
    }
  },
}));

// ---------- 移动（步行相机 / VR 共用的 player）----------
const locomotion = new Locomotion(editor, canvas);
editor.viewExtras = () => ({ near: locomotion.isWalking() ? 0.05 : undefined, teleport: locomotion.teleportArc() });
// XR 画质 A/B（dev 诊断，真机不重 build 就能比：?xrfov=0..1 周边降采样、?xrscale=0.5..2 framebuffer 缩放；默认 0 / 1.0，见 render3）
{
  const q = new URLSearchParams(location.search);
  const fov = Number(q.get("xrfov")), sc = Number(q.get("xrscale"));
  if (q.has("xrfov") || q.has("xrscale")) editor.renderer3.setXRQuality({ foveation: q.has("xrfov") && Number.isFinite(fov) ? fov : undefined, framebufferScale: q.has("xrscale") && Number.isFinite(sc) ? sc : undefined });
}
let loopLast = 0;
function loopTick(t: number): void {
  const dt = loopLast ? Math.min(0.1, (t - loopLast) / 1000) : 1 / 60;
  loopLast = t;
  // 循环边界（user：「错误的时候 vr 不应跟卡死」）：一帧抛错 = 报错 + 取消手势，循环继续；不吞（console + 字幕都看得见）
  try {
    if (vr.isPresenting()) vr.tick(dt);   // XR：vr.tick 内含 locomotion.tick + 指针事件 + 面板
    else {
      locomotion.tick(dt);
      // 桌面 T 充能中 = 工具停摆（VR 同款）：手势取消、预告清掉；手势路由的 toolBlocked 挡后续指针事件
      if (locomotion.sim.state.teleport.charging) { if (editor.isGestureActive()) editor.cancel(); editor.pointerLeave(); }
    }
  } catch (err) {
    reportError(vr.isPresenting() ? "VR 帧" : "步行帧", err);
    try { editor.cancel(); } catch { /* 取消本身失败也不许把循环带死 */ }
  }
  try { editor.draw(); } catch (err) { reportError("渲染", err); }
}
// 全局兜底：任何 uncaught error / unhandled rejection 都上 toast（VR 里 = 字幕），不再静默
window.addEventListener("error", (ev) => reportError("脚本", ev.error ?? ev.message));
window.addEventListener("unhandledrejection", (ev) => reportError("异步", ev.reason));
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
  notify({ text: `已导出 ${a.download}（${editor.kernel.faces().length} 面 / ${editor.kernel.edges().length} 边）`, level: "info" });
}
objInput.addEventListener("change", async () => {
  const file = objInput.files?.[0];
  objInput.value = "";
  if (!file) return;
  try {
    const r = parseObjSegments(await file.text());
    if (!r.segs.length) { notify({ text: "OBJ 里没有可用的边", level: "warning" }); return; }
    const evs = editor.addSegments(r.segs, `导入 ${file.name}`);
    editor.zoomExtents();
    notify({ text: `导入 ${file.name}：${r.segs.length} 条边 → ${evs.length} 个膜事件`, level: "info" });
  } catch (err) {
    notify({ text: `导入失败：${(err as Error).message}`, level: "error" });
  }
});

// ---------- 手势 & 键盘 ----------
const gestures = attachGestures(canvas, editor, {
  fingerDraws: () => fingerDraws,
  onUndo: () => editor.undo(),
  onRedo: () => editor.redo(),
  look: (dx, dy) => locomotion.look(dx, dy),
  walking: () => locomotion.isWalking(),
  toolBlocked: () => locomotion.sim.state.teleport.charging,
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
  if (ev.key === "Escape") { closePopupMenu(); toggleHelp(false); closeDebugLogSheet(); editor.cancel(); }
});

// ---------- 尺寸 ----------
function resize(): void { editor.resize(window.devicePixelRatio || 1); }
new ResizeObserver(resize).observe(stage);
window.addEventListener("resize", resize);

// ---------- PWA ----------
const pwa = initPwaShell({
  onUpdateAvailable: () => { note("sw", "update available → notice"); notify({
    id: "update", text: "有新版本", level: "info",
    actions: [{ label: "刷新", primary: true, onClick: () => { note("sw", "reload requested"); pwa.reload(); } }],
  }); },
  onLog: (m) => note("sw", m),
  // WeebPaint 同形：点「刷新」前先把脏文档落本地（图库家 implicit 存；transient/file 家 implicit = no-op，由 beforeunload 挽留兜）
  onBeforeReload: async () => { note("sw", "reload requested → implicit save"); await _session?.save({ implicit: true, localOnly: true }); },
  // 回前台：打开中文档显式快进 + 图库开着就刷列表（WeebPaint onForeground 同形；判据 = 登录态）
  onForeground: () => { void _session?.refreshOpenDoc(); if (galleryHost.isOpen()) galleryHost.refresh(); },
});
buildEl.textContent = `${APP_VERSION}${pwa.isDevRoute ? " · dev" : ""}`;
if (new URLSearchParams(location.search).has("reset")) notify({ text: `已清缓存重启 · ${APP_VERSION}`, level: "info" });

// ---------- 探针钩子（scripts/probe-boot.mjs 用；不是 API） ----------
// ---------- 转正纪元（2026-09-20）：文档生命周期 + 图库 + 云端 ----------
initSheets();
initDebugLogSheet();
// smart save 钮（三条杠下面；对齐 WeebPaint save-status + smartSaveAndPush；user 2026-09-20「title 意义不明可以不要，三条杠下面加一个 smart save button」）
const btnSave = $<HTMLButtonElement>("btnSave");
const btnSaveIcon = document.getElementById("btnSaveIcon") as unknown as SVGUseElement;
const SAVE_ICON: Record<ReturnType<Session["saveState"]>, string> = { none: "floppy-disk", dirty: "floppy-disk", "local-only": "floppy-disk", saving: "cloud-upload", "cloud-off": "floppy-disk", unpushed: "cloud-pending", synced: "cloud-synced" };
function updateSaveStatus(): void {
  const st = session.saveState();
  btnSave.dataset.state = st;
  btnSaveIcon.setAttribute("href", `#${st === "local-only" && session.home.kind === "gallery" ? "cloud-unavailable" : SAVE_ICON[st]}`);   // 图库家未登录 = 斜杠云（云不可用，登录可修）
  btnSave.title = session.saveTitle();
  document.title = `${session.dirty() ? "● " : ""}${session.displayName()} — CatsUp`;   // 文档名住标题栏（不产生历史记录）
  // 「上次开着什么」= @internal/gallery 回执条，唯一写点在 session.setHome（v0.5.7；旧 last-doc / last-scene 键退役）。
  //   gallery-attached = 「这台设备曾挂过图库」（WeebPaint registry 的单库等价物）：boot 据此在 initAuth 之前接店、本地恢复。
  deviceKvSet("gallery-attached", hasStore() ? "1" : null);
}
/** smart save = Ctrl+S = 点钮：非图库家 → 保存/安家；图库家已登录 → 存+推（不脏也推，让时间戳走字）；已配置未登录 → 本地存 + 「现在登录同步？」。 */
let cloudPromptDeclined = false;   // 同一 session 点过「暂不」→ 之后只状态行提示，不再弹
function smartSave(): void {
  if (session.home.kind !== "gallery" || !auth.isAuthConfigured() || (auth.isSignedIn() && navigator.onLine !== false)) { void session.save(); return; }
  void session.save();   // 已配置未登录：本地保存照做（不 await——sheet 与 IDB 事务并行）
  if (cloudPromptDeclined || navigator.onLine === false) return;
  // iOS 红线：loginRedirect 必须在 click listener 内同步发起 → 走 onPick（sheets.ts 在 resolve 之前同步调它）
  void openChoiceSheet<"signin" | "later">("现在登录 OneDrive 同步？", "已保存到本机。登录后这台和其他设备的图库都能看到它。", [
    { label: "登录", value: "signin", primary: true, onPick: () => cloudSignIn() },
    { label: "暂不", value: "later" },
  ]).then((c) => { if (c === "later") cloudPromptDeclined = true; });
}
btnSave.addEventListener("click", () => smartSave());
const session = new Session({
  editor,
  captureThumbnail: () => captureThumbnail(editor),
  onHomeChanged: updateSaveStatus,
  setStatus: (text, error) => { note("doc", (error ? "✗ " : "") + text); notify({ text, level: error ? "error" : "info" }); },
  online: () => navigator.onLine !== false,
});
_session = session;
let storeWired = false;
function wireStore(): void {
  if (storeWired) return;
  const st = ensureStore();
  storeWired = true;
  st.files.onRenamed((from, to) => { if (session.home.kind === "gallery" && session.home.path === from) session.setActivePath(to); });
  updateSaveStatus();
}
const galleryHost = initGalleryHost({
  mountEl: $("galleryMount"), fullEl: $("galleryFull"),
  activeName: () => (session.home.kind === "gallery" ? session.home.path : null),
  openDoc: (n) => session.openFromGallery(n),
  renameActive: () => session.renameActive(),
  setActiveName: (n) => session.setActivePath(n),
  pushDoc: (n) => session.pushDoc(n),
  offloadDoc: (n) => session.offloadDoc(n),
  flushLocal: () => session.flushLocal(),
  setStatus: (text, error) => { note("gallery", (error ? "✗ " : "") + text); notify({ text, level: error ? "error" : "info" }); },
  onFolderChanged: (dir) => { session.currentDir = dir; },
  onOpened: () => { wireStore(); Session.persistOnGesture(); session.slateGalleryOpened(); },   // 回执条：停在图库（有意状态 → 下次开机回图库）
  onClosed: () => { session.slateGalleryClosed(); (document.activeElement as HTMLElement | null)?.blur?.(); editor.resize(window.devicePixelRatio || 1); },   // 图库按钮别留着焦点吃快捷键
});
$("galleryBack").addEventListener("click", () => galleryHost.close());
$("galleryNew").addEventListener("click", () => { void session.newDoc().then((ok) => { if (ok) galleryHost.close(); }); });
$("galleryTrashBtn").addEventListener("click", () => { galleryHost.setView("trash"); $("galleryTrashBar").hidden = false; });
$("galleryTrashBack").addEventListener("click", () => { galleryHost.setView("files"); $("galleryTrashBar").hidden = true; });
$("galleryEmptyTrash").addEventListener("click", () => {
  void openChoiceSheet<"local" | "cloud" | "both">("清空回收站", "清空哪边？（不可恢复）", [{ label: "本机与云端", value: "both", danger: true }, { label: "只清本机", value: "local" }, { label: "只清云端", value: "cloud" }])
    .then((scope) => { if (scope) void galleryHost.emptyTrash(scope); });
});
const cloudBtn = $<HTMLButtonElement>("galleryCloudBtn");
let signInNav = false;   // 登录 redirect 导航中：beforeunload 别挡（WeebPaint _signInNav 同款）
const acct = (a: unknown): string => { const h = (a as { homeAccountId?: unknown } | null)?.homeAccountId; return typeof h === "string" && h ? h.slice(0, 8) + "…" : "-"; };
function cloudSignIn(): void {
  if (!auth.isAuthConfigured()) { notify({ text: "云端未配置（client id 为空）", level: "warning" }); return; }
  // 黑匣子（user 09-20「onedrive 授权还是没反应」）：点击 → 快照 → signIn 起跳，每一步一行；回程在 boot 的 [auth] init 行
  note("auth", `sign-in click: home=${session.home.kind} dirtyLocal=${session.dirtyLocalHome()} online=${String(navigator.onLine)} store=${hasStore()}`);
  Session.persistOnGesture(); wireStore();
  const go = (): void => {
    signInNav = true;
    note("auth", "signIn(redirect, select_account) → leaving page");
    auth.signIn({ prompt: "select_account" }).catch((e) => { signInNav = false; note("auth", "signIn rejected (still on page)"); funnel(e); });
  };
  // 脏的 file / transient 模型：redirect 前留 pending-adoption 帧（IDB 写必须在导航前落完——bfcache/IDB 锁案卷），回来自动领养
  if (session.needsRedirectSnapshot()) {
    const t0 = performance.now();
    void session.prepareForRedirect()
      .then(() => note("auth", `redirect snapshot ok ${(performance.now() - t0).toFixed(0)}ms`), (e) => note("auth", `redirect snapshot failed: ${String((e as { message?: unknown })?.message ?? e)}`))
      .finally(go);
  } else go();   // 手势同步栈起跳（iOS redirect）
}
async function cloudSignOut(): Promise<void> { note("auth", "sign-out click"); try { await auth.signOut(); notify({ text: "已退出 OneDrive 登录（本机副本仍在）", level: "info" }); } catch (e) { funnel(e); } }
type CloudId = "in" | "out" | "refresh";
cloudBtn.addEventListener("click", () => togglePopupMenu<CloudId>({
  anchor: cloudBtn, align: "end",
  items: () => [
    ...(auth.isSignedIn()
      ? [{ id: "refresh" as CloudId, label: "刷新云端", icon: "refresh" }, { id: "out" as CloudId, label: "退出登录", icon: "cloud", hint: (auth.getActiveAccount() as { username?: string } | null)?.username }]
      : [{ id: "in" as CloudId, label: "登录 OneDrive", icon: "cloud", disabled: !auth.isAuthConfigured(), hint: auth.isAuthConfigured() ? "个人账号" : "未配置 client id" }]),
  ],
  onPick: (id) => { if (id === "in") cloudSignIn(); else if (id === "out") void cloudSignOut(); else galleryHost.refresh(); },
}));
function updateCloudChip(): void { cloudBtn.dataset.cloudState = auth.isSignedIn() ? "in" : "out"; (document.getElementById("galleryCloudIcon") as unknown as SVGUseElement).setAttribute("href", auth.isSignedIn() ? "#cloud-synced" : "#cloud"); }
auth.onAuthChanged((st) => {
  note("auth", `changed signedIn=${st.signedIn} reason=${st.reason ?? "-"} probing=${!!st.probing} account=${acct(st.account)}`);
  updateCloudChip(); updateSaveStatus();
  if (st.signedIn) void session.refreshOpenDoc();   // 登录落地（boot 静默 / redirect 回程 / 续签）→ 打开中文档显式快进（WeebPaint wp:auth-changed 同形）
  if (galleryHost.isOpen()) galleryHost.refresh();
});
window.addEventListener("online", () => { updateSaveStatus(); void session.refreshOpenDoc(); }); window.addEventListener("offline", updateSaveStatus);
// 打开本地 .glb：FSA 有就用（文件家可原地写回），没有走 <input type=file>（只读进来，保存 = 下载）
const glbInput = $<HTMLInputElement>("glbFile");
function openLocal(): void { if (supportsOpenPicker()) void session.openLocalPicker(); else glbInput.click(); }
glbInput.addEventListener("change", async () => {
  const file = glbInput.files?.[0]; glbInput.value = "";
  if (file) await session.openLocalBytes(new Uint8Array(await file.arrayBuffer()), file.name, null);
});
stage.addEventListener("dragover", (e) => { if (e.dataTransfer?.types.includes("Files")) { e.preventDefault(); } });
stage.addEventListener("drop", async (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (!file || !/\.glb$/i.test(file.name)) return;
  e.preventDefault();
  await session.openLocalBytes(new Uint8Array(await file.arrayBuffer()), file.name, null);
});
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === "s") { e.preventDefault(); smartSave(); }
  else if (k === "o") { e.preventDefault(); openLocal(); }
});
// 崩溃安全 flush 三件（WeebPaint es.start 同形，只本地不推）：hidden（切后台被系统回收的唯一可靠钩子）/ blur / pagehide。
//   #60-C：pagehide persisted=true（要进 bfcache）**不写**——冻结页里起的 IDB 写在 WebKit 永远 commit 不了、只会持锁（案卷 20260909-bfcache-idb-lock）。
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") session.flushForHide();
  else if (galleryHost.isOpen()) galleryHost.refresh();   // 回前台的文档快进走 pwa-shell onForeground（无条件挂）
});
window.addEventListener("blur", () => session.flushForHide());
window.addEventListener("pagehide", (e) => {
  if (!e.persisted) session.flushForHide();
  session.onPageHide(e.persisted);   // file / transient：正常关闭即焚快照（bfcache 冻结不算；pending-adoption 库内拒删）
});
// 承重层（T-crash 附加层的设计前提）：**任何家**脏 → 关页 / 刷新前浏览器挽留 + 偷偷起本地保存（dialog 弹着时后台 IDB 事务大概率跑完；
//   WeebPaint topbar-menu 同形，user「可以弹挽留对话框，应该弹」「挽留的时候偷偷本地备份」）；登录 redirect 期间不挡。
window.addEventListener("beforeunload", (e) => {
  if (signInNav || !session.dirty()) return;
  e.preventDefault(); e.returnValue = "";
  session.save({ implicit: true, localOnly: true }).catch(() => {});   // transient / file 家 implicit = no-op（不背着用户写磁盘）
});
window.addEventListener("online", () => { if (galleryHost.isOpen()) galleryHost.refresh(); });
setInterval(() => { if (document.visibilityState === "visible" && galleryHost.isOpen()) galleryHost.refresh(); }, 60_000);

// ---------- boot：文档生命周期三态恢复（@internal/gallery restoreLastSession；WeebPaint boot.ts 同形接线）----------
/** 端口注入；编排（首次 → lazyblank / 上次图库 → 图库 / 上次文档 → 恢复；崩溃环断路；失败 canvas-first 不清回执条）在包里，有单测。 */
function bootRestore(): Promise<RestoreOutcome> {
  return restoreLastSession({
    hasGallery: () => hasStore(),
    getResume: () => readSlate().opened,
    restore: (name) => session.restore(name),
    setNameMemoryOnly: () => {},          // CatsUp 的家只在内存（Session.home），落点函数自己重立身份；回执条永不在此清（纪律②）
    updateSaveStatus,
    openGallery: async () => { session.beginLazyBlank(); await galleryHost.open(); },   // 覆盖层底下要有画布：lazyblank 垫底
    openFreshCanvas: async () => { session.beginLazyBlank(); },
    openBlankCanvas: async () => {},      // 无库：开机就是 transient（Session 初始态），零变更
    onNoGallery: () => {},
    onOpened: (name) => note("boot", `restored "${name}"`),
    onNotFound: (name) => { note("boot", `restore failed "${name}" → fresh canvas (slate kept)`); notify({ text: `上次的模型「${name.replace(/\.glb$/i, "")}」本机没有副本；登录后会再试`, level: "warning" }); },
    getRestoreAttempt: () => readSlate().restoreAttempt,
    setRestoreAttempt: (name) => setRestoreAttempt(name),
    onCrashLoopSkipped: (name) => notify({ text: `上次打开「${name.replace(/\.glb$/i, "")}」时崩溃了，这次没有自动打开——可从图库手动打开`, level: "warning" }),
    isDocLockedElsewhere: async () => false,   // 双实例互认（Web Locks）未移植——审计 §5 后续
    onLockedElsewhere: () => {},
  });
}
void (async () => {
  // 黑匣子前提（2026-09-20 发现）：store 的 reportStoreError 在 createStore() 之前是静默 no-op（0.15.0 error-handling.ts），而 redirect 回程的
  //   handleRedirectPromise 失败（error 级）/ [auth] init 诊断（log 级）都发生在 initAuth 里 → 曾挂过图库（登录点击必挂 → 回程必真）
  //   或 URL 带 OAuth 回程碎片时**先接线再 initAuth**，一条都不许漏。纯无地首开仍不碰 createStore。
  const oauthReturn = /(^|[#&?])(code|error|state)=/.test(location.hash);
  if (deviceKvGet("gallery-attached") === "1" || oauthReturn) { try { wireStore(); } catch (e) { funnel(e, "warning"); } }
  // ① 先从本地恢复上次的模型，**再** initAuth（v0.5.7；WeebPaint 顺序）：此刻 store 视为未登录（0.14 起在线 = 有网 ∧ 已登录）→ open()
  //   直接读本地副本、零网络，模型秒开；登录落地后 onAuthChanged → refreshOpenDoc 后台干净快进。反过来先等 MSAL（脚本 + 静默续签 iframe）
  //   再开 = 开机多等一次 Graph 往返才见模型（v0.5.6 的样子）。app-store.ts 头注释钉了这条顺序契约。
  const t0 = performance.now();
  let outcome: RestoreOutcome | null = null;
  if (hasStore()) { try { outcome = await bootRestore(); } catch (e) { funnel(new Error("[boot] restore failed: " + String(e)), "warning"); } }
  note("boot", `restore store=${hasStore()} outcome=${outcome ?? "landless"} home=${session.home.kind}${session.home.kind === "gallery" ? ":" + session.home.path + (session.lazy ? " (lazy)" : "") : ""} ${(performance.now() - t0).toFixed(0)}ms`);
  updateSaveStatus();
  if (auth.isAuthConfigured()) {
    try { const st = await auth.initAuth(); note("auth", `init signedIn=${st.signedIn} probing=${!!st.probing} account=${acct(st.account)}`); }
    catch (e) { note("auth", "init failed (MSAL not loaded — sign-in click will retry)"); funnel(e, "log"); }
  } else note("auth", "not configured (client id empty)");
  updateCloudChip();
  if (auth.isSignedIn() && !hasStore()) {   // 登录了但这台设备还没挂过图库（清过 device-kv / 新装）：接店 + 走一遍三态（回执条多半空 → lazyblank）
    try { wireStore(); outcome = await bootRestore(); note("boot", `restore after auth outcome=${outcome}`); } catch (e) { funnel(e, "warning"); }
  } else if (outcome === "blank-failed" && auth.isSignedIn() && session.isUntouchedLazyBlank()) {
    // ② 本地没副本（iOS 7 天驱逐 / 卸载过 / 别台设备的回执条不会到这）→ ① 时未登录拉不到；现在登录了、用户还没动笔 → 再试一次（回执条没清，纪律②）
    try { outcome = await bootRestore(); note("boot", `restore retry after auth outcome=${outcome}`); } catch (e) { funnel(e, "warning"); }
  }
  updateSaveStatus();
  await initCrashRecovery({ session, notify, closeGallery: () => { if (galleryHost.isOpen()) galleryHost.close(); } });   // T-crash：redirect 流产者自动领养 + crash 帧通知
})();

(window as unknown as { __catsup: unknown }).__catsup = { editor, locomotion, vr, hud, session, galleryHost, crash: crashStore, store: () => (hasStore() ? requireStore() : null), version: APP_VERSION, debugLog: { toText: debugLogText, entries: debugLogEntries, open: openDebugLogSheet } };

// ---------- 起 ----------
editor.setTool("line");
hintEl.textContent = hintDefault();
resize();
