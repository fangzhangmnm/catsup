// main.ts —— app 壳接线：工具条 / 顶栏 / 菜单 / 状态行 / 调试日志 sheet / OBJ 逃生口 / PWA 更新 toast / 文档生命周期 boot 编排。
// created 2026-09-06 by Claude Fable 5.1（0.3 app 壳纪元开工：user「离开 lab 变成一个 prototypical 但是正经的东西…先做无地骑士，
// 无 store 无导入导出…去掉那些很 lab 的东西，好好做 ui，可以留一个 gltf 或者 obj 的 io 逃生口」）
// 0.5 转正纪元起：文档生命周期 = src/app/session.ts（三态家）+ @internal/store 单一接缝 + @internal/gallery；OBJ 只剩逃生口。
// v0.5.7（2026-09-22，Claude Fable 5.1）：boot 改用包的 restoreLastSession（回执条三态编排）+ **本地恢复先于 initAuth**（零网络秒开）
//   + 登录 / 回线 / 回前台显式快进 + 崩溃安全 flush 三件；审计 = ai-docs/20260922-lifecycle-alignment-with-weebpaint.md。

import { APP_VERSION } from "../version.ts";
import { mountToolStrip } from "./tool-strip.ts";
import { mountVcb } from "./vcb.ts";
import { perf } from "../editor/perf-stats.ts";
import { LENGTH_UNITS, fmtVcbLength } from "../editor/vcb.ts";
import { mountSelectionBar, openContextMenuAt } from "./context-menu.ts";
import { selectionRoute } from "./selection-actions.ts";
import { mountViewGizmo } from "./view-gizmo.ts";
import { deviceKvGet, deviceKvSet, migrateLegacyUiPrefs } from "./device-kv.ts";
import { Session, supportsOpenPicker, supportsSavePicker } from "./session.ts";
import { restoreLastSession, readSlate, setRestoreAttempt, type RestoreOutcome } from "@internal/gallery";
import { initGalleryHost } from "./gallery-host.ts";
import { auth, ensureStore, hasStore, requireStore } from "../app-store.ts";
import { captureThumbnail } from "./thumbnail.ts";
import { initSheets, openChoiceSheet } from "./ui/sheets.ts";
import { reportError as funnel } from "./error-funnel.ts";
import { Editor, GRID_STEPS, TOOLS, type Tool } from "../editor/editor.ts";
import { LINE_WEIGHTS } from "../editor/render3.ts";
import { PALETTE_ZH } from "./palette.ts";
import { faceTriangles } from "../editor/render3.ts";
import { exportObj, parseObjSegments } from "../editor/obj-io.ts";
import { attachGestures } from "./gestures.ts";
import { Locomotion } from "./locomotion.ts";
import { VR } from "./vr.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { initPwaShell } from "./pwa-shell.ts";
import { iconHtml } from "./ui/icon.ts";
import { openPopupMenu, togglePopupMenu, closePopupMenu, type PopupMenuItem } from "./ui/popup-menu.ts";
import { showNotice, type NoticeOpts } from "./ui/notice.ts";
import { initCrashRecovery } from "./crash-recovery.ts";
import { crashStore } from "./crash-store.ts";
import { initDebugLog, note, record, toText as debugLogText, entries as debugLogEntries } from "./debug-log.ts";
import { initDebugLogSheet, openDebugLogSheet, closeDebugLogSheet } from "./debug-log-sheet.ts";
import { capture as reproCapture } from "./repro-box.ts";
import { traceLine } from "./debug-lines.ts";
import { WORLD_FRAME } from "../scene/xform.ts";

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
/** 线稿粗细（设备像素）：存过就用存的；没存过 → 高 DPI（iPad / Retina）默认 1.5，否则 1（原生）。user 10-24「ipad上面细线稿是不舒服…有1.5这种选项吗」 */
const lineWeightInit = (): number => { const v = Number(PREF.get("lineWeight")); return LINE_WEIGHTS.includes(v) ? v : (window.devicePixelRatio >= 2 ? 1.5 : 1); };

// ---------- DOM ----------
const canvas = $<HTMLCanvasElement>("board");
const stage = $("stage");
const hintEl = $("hint");
const tipEl = $("tip");
const marqueeEl = $("marquee");
const toolbarEl = $("toolbar");
const buildEl = $("build");

const HINT_DEFAULT = "画线 L · 矩形 R · 圆 C · 弧 A · 卷尺 T · 移动 M · 旋转 Q · 缩放 S · 推拉 P · 偏移 F · 跟随 W · 油漆桶 B · 橡皮 E · 选择 空格 ｜ 建组 Ctrl+G · 建组件 G · 双击进组 / 点空处或 Esc 出 ｜ 右键/单指拖=环绕 · 双指=平移缩放";
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
  trace: (e) => {
    note("op", traceLine(e));   // 记账面包屑 → 黑匣子（一 op 一行；失败行带 op JSON）
    if (e.kind === "fail" && e.brep) reproCapture({ where: e.where, message: e.message, brep: e.brep, ...(e.op ? { op: e.op } : {}), ...(e.preview ? { preview: e.preview } : {}), ...(e.pool ? { pool: e.pool } : {}) });   // 复现包（只住内存，关窗就没）
  },
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
  { tool: "circle", icon: "circle", label: "圆", key: "C" },
  { tool: "arc", icon: "arc", label: "弧", key: "A" },
  { tool: "move", icon: "move", label: "移动", key: "M" },
  { tool: "rotate", icon: "rotate", label: "旋转", key: "Q" },
  { tool: "scale", icon: "scale-uniform", label: "缩放", key: "S" },
  { tool: "pp", icon: "push-pull", label: "推拉", key: "P" },
  { tool: "offset", icon: "selection-expand", label: "偏移", key: "F" },   // 图标 = stopgap（图标库 TODO 已登记 offset）
  { tool: "followme", icon: "move-to-folder", label: "跟随", key: "W" },   // 图标 = stopgap（图标库 TODO 已登记 follow-me）
  { tool: "paint", icon: "paint-bucket", label: "油漆桶", key: "B" },
  { tool: "erase", icon: "eraser", label: "橡皮", key: "E" },
  { tool: "tape", icon: "dimensions", label: "卷尺", key: "T" },   // 0.11 尺规；图标 = stopgap（图标库 TODO 已登记 tape-measure）
  { tool: "axes", icon: "axes", label: "轴", key: "" },           // 0.11 尺规：三下定帧（原点 / X / Y）；SU 无默认键
  { tool: "protractor", icon: "protractor", label: "量角器", key: "" },   // 0.11 尺规；图标库没有 → 占位（TODO 已登记 protractor）
];
// HUD 数据模型：桌面 DOM 工具栏与 VR 手腕面板消费同一份（A13 第 6 条）
const hud: HudModel = {
  version: APP_VERSION,
  tools: (): HudItem[] => TOOL_SPEC.map((t) => ({ id: t.tool, label: t.label, icon: t.icon, key: t.key, active: editor.tool === t.tool })),
  edits: (): HudItem[] => [
    { id: "undo", label: "撤销", icon: "arrow-undo", disabled: !editor.canUndo() },
    { id: "redo", label: "重做", icon: "arrow-redo", disabled: !editor.canRedo() },
    { id: "delete", label: "删除", icon: "trash-can", danger: true, hidden: !editor.hasSelection() },
    { id: "group", label: "建组", icon: "collection", hidden: !editor.hasGeometrySelection() },
    { id: "component", label: "建组件", icon: "object", hidden: !editor.hasGeometrySelection() },
    { id: "explode", label: "炸开", icon: "explode-folder", hidden: !editor.hasPoolSelection() },
    { id: "explodeCurve", label: "炸开曲线", icon: "explode-folder", hidden: !editor.hasCurveSelection() },
    { id: "enter", label: "进入编辑", icon: "selection-expand", hidden: !editor.hasPoolSelection() },
    { id: "exit", label: "退出一层", icon: "back", hidden: editor.contextDepth() === 0 },
    { id: "soften", label: "软化选区", icon: "blur", hidden: !editor.hasGeometrySelection() },
    { id: "harden", label: "硬化选区", icon: "sharpen", hidden: !editor.hasGeometrySelection() },
    { id: "connected", label: "选择连通体", icon: "select", hidden: !editor.hasGeometrySelection() },
    { id: "deselect", label: "取消选择", icon: "x", hidden: !editor.hasSelection() },   // user 2026-10-24「有东西选择的时候应该永远有取消选择的上下文胶囊」
  ],
  vr: (): HudItem[] => [
    { id: "noclip", label: locomotion.noclip ? "飞行中" : "穿墙飞行", active: locomotion.noclip },
    { id: "respawn", label: "回出生点" },
    { id: "exitvr", label: "退出 VR", danger: true },
  ],
  status: () => hintEl.textContent ?? "",
  pick: (id) => {
    if (id === "paint" && editor.tool === "paint") { toggleMatSheet(matSheet.hidden); return; }   // 油漆桶已选中再点 = 材质面板（WeebPaint 画笔再点开面板同款；材质钮撤了）
    if ((TOOLS as readonly string[]).includes(id)) { editor.setTool(id as Tool); return; }
    switch (id) {
      case "undo": editor.undo(); break;
      case "redo": editor.redo(); break;
      case "delete": editor.deleteSelection(); break;
      case "deselect": editor.cancel(); break;
      case "group": editor.makeGroup(); break;
      case "component": editor.makeComponent(`组件 ${editor.sceneRef.defs.size}`); break;
      case "explode": editor.explodeSelection(); break;
      case "explodeCurve": editor.explodeCurveSelection(); break;
      case "enter": editor.enterSelected(); break;
      case "exit": editor.exitContext(); break;
      case "soften": { const n = editor.softenSelection(true); notify({ text: n ? `软化了 ${n} 条边（soft + smooth）` : "选区里没有两膜之间的边", level: "info" }); break; }
      case "harden": { const n = editor.softenSelection(false); notify({ text: n ? `硬化了 ${n} 条边` : "选区里没有两膜之间的边", level: "info" }); break; }
      case "connected": editor.selectConnected(); break;
      case "noclip": locomotion.setNoclip(!locomotion.noclip); vr.invalidatePanel(); break;
      case "respawn": { const sp = locomotion.defaultSpawn(); locomotion.sim.reset(sp.pos, sp.heading, { x: 0, y: 0, z: 1.6 }); break; }
      case "exitvr": vr.exit(); break;
    }
  },
};
// 左柱（2026-10-24 user 定稿，参考 SU 不照抄；「鼠标就是选择」）：
//   第一组常驻：选择 / 画线 / 形状格（矩形 / 圆 / 弧，显示当前那个，小三角换）/ 橡皮。
//   后面每组有**预算**，开局只显示常驻的，组下面一条矮的「⌄」展开条弹整组；池里的工具用过了、且还有预算，就长出一格「最近」槽；
//   柱子不够高时先吃最近槽、再吃常驻（吃掉的都在 ⌄ 里）。第二组常驻推拉 / 移动，第三组常驻卷尺 / 轴，第四组常驻油漆桶（以后 + 元数据分析）。
//   su 的视角操作不进左柱（右边 view 栏管）。旧「更多」钮与按高度给最近格的逻辑撤。
type RailGroup = { id: string; pinned: Tool[]; pool: Tool[]; budget: number };
const SHAPES: Tool[] = ["rect", "circle", "arc"];
const RAIL_GROUPS: RailGroup[] = [
  { id: "edit", pinned: ["pp", "move"], pool: ["offset", "followme", "rotate", "scale"], budget: 4 },
  { id: "measure", pinned: ["tape", "axes"], pool: ["protractor"], budget: 3 },
  { id: "paint", pinned: ["paint"], pool: [], budget: 1 },
];
const specOf = (t: Tool) => TOOL_SPEC.find((x) => x.tool === t)!;
let shapeCurrent: Tool = "rect";
/** 本次会话里用过的池工具（按最近使用）；开局为空 = 只显示常驻。 */
const usedPool = new Map<string, Tool[]>(RAIL_GROUPS.map((g) => [g.id, []]));
/** 组内全部工具按最近使用（吃常驻时按它填）。 */
const groupMru = new Map<string, Tool[]>(RAIL_GROUPS.map((g) => [g.id, [...g.pinned, ...g.pool]]));
const bumpFront = (list: Tool[], t: Tool): void => { const i = list.indexOf(t); if (i > 0) list.splice(i, 1); if (i !== 0) list.unshift(t); };
function noteToolUse(t: Tool): void {
  if (SHAPES.includes(t)) shapeCurrent = t;
  for (const g of RAIL_GROUPS) {
    if (g.pool.includes(t)) bumpFront(usedPool.get(g.id)!, t);
    if (g.pinned.includes(t) || g.pool.includes(t)) bumpFront(groupMru.get(g.id)!, t);
  }
}
const LONG_PRESS_MS = 450;
const flyoutItems = (tools: Tool[]) => tools.map((x) => { const s2 = specOf(x); return { id: x, label: s2.label, icon: s2.icon, hint: s2.key, checked: editor.tool === x }; });
const mkToolBtn = (t: Tool, flyout?: () => Tool[]): HTMLButtonElement => {
  const sp = specOf(t);
  const b = document.createElement("button");
  b.type = "button"; b.className = "tool"; b.title = sp.key ? `${sp.label}（${sp.key}）` : sp.label;
  b.innerHTML = `${iconHtml(sp.icon)}<span class="tool-label"></span>${flyout ? '<span class="tool-flyout" aria-hidden="true"></span>' : ""}`;
  (b.querySelector(".tool-label") as HTMLElement).textContent = sp.label;
  if (!flyout) { b.addEventListener("click", () => hud.pick(t)); return b; }
  // 小三角 / 长按 / 右键 = 弹出整组；点主体 = 用当前这个（SU 小三角，user 10-24「sketchup 的加一个小三角的方案不错」）
  const openFlyout = (): void => { togglePopupMenu<Tool>({ anchor: b, align: "start", items: () => flyoutItems(flyout()), onPick: (x) => hud.pick(x) }); };
  const inCorner = (ev: MouseEvent): boolean => ev.offsetX > b.clientWidth - 18 && ev.offsetY > b.clientHeight - 18;
  let press: { timer: number; x: number; y: number } | null = null;
  const clearPress = (): void => { if (press) { clearTimeout(press.timer); press = null; } };
  b.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    if (inCorner(ev)) { press = null; return; }
    clearPress();
    press = { x: ev.clientX, y: ev.clientY, timer: window.setTimeout(() => { press = null; openFlyout(); }, LONG_PRESS_MS) };
  });
  b.addEventListener("pointermove", (ev) => { if (press && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > 12) clearPress(); });
  b.addEventListener("pointerup", clearPress); b.addEventListener("pointercancel", clearPress); b.addEventListener("pointerleave", clearPress);
  b.addEventListener("click", (ev) => { if (inCorner(ev)) openFlyout(); else hud.pick(t); });
  b.addEventListener("contextmenu", (ev) => { ev.preventDefault(); openFlyout(); });
  return b;
};
/** 矮的「⌄」展开条：弹整组（user「...和下箭头做矮一点」）。 */
const mkMore = (tools: Tool[]): HTMLButtonElement => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "rail-more"; b.title = "这一组的全部工具"; b.innerHTML = iconHtml("chevron-down");
  b.addEventListener("click", () => togglePopupMenu<Tool>({ anchor: b, align: "start", items: () => flyoutItems(tools), onPick: (x) => hud.pick(x) }));
  return b;
};
/** 第一组之外能放几格：格 48 px；固定 = 撤销 重做 2（☰ / 云 2026-10-24 搬去左上横排）+ 第一组 4；每组一条矮展开条 ≈ 22 px。 */
function groupCapacity(): number {
  const avail = window.innerHeight - 20 - RAIL_GROUPS.length * 22;
  return Math.max(RAIL_GROUPS.length, Math.floor(avail / 48) - 6);
}
/** 每组想要几格 = min(预算, 常驻 + 用过的)；分配：先每组 1，再按组序补到想要的。 */
function allocate(): number[] {
  const want = RAIL_GROUPS.map((g) => Math.min(g.budget, g.pinned.length + usedPool.get(g.id)!.length));
  const out = RAIL_GROUPS.map(() => 1);
  let left = groupCapacity() - out.length;
  for (let i = 0; i < out.length && left > 0; i++) { const add = Math.max(0, Math.min(want[i] - out[i], left)); out[i] += add; left -= add; }
  return out;
}
function renderSlots(): void {
  noteToolUse(editor.tool);
  toolbarEl.replaceChildren();
  const add = (t: Tool, fly?: () => Tool[]): void => { const b = mkToolBtn(t, fly); b.classList.toggle("active", t === editor.tool); toolbarEl.appendChild(b); };
  add("select"); add("line"); add(shapeCurrent, () => SHAPES); add("erase");   // 第一组常驻
  const slots = allocate();
  RAIL_GROUPS.forEach((g, gi) => {
    const k = slots[gi];
    const all = [...g.pinned, ...g.pool];
    const sep = document.createElement("div"); sep.className = "rail-sep"; toolbarEl.appendChild(sep);
    let shown: Tool[];
    if (k >= g.pinned.length) shown = [...g.pinned, ...usedPool.get(g.id)!.slice(0, k - g.pinned.length)];
    else shown = groupMru.get(g.id)!.slice(0, k);   // 常驻也被吃：按组内最近使用填
    for (const t of shown) add(t);
    if (all.length > shown.length) toolbarEl.appendChild(mkMore(all));
  });
}
window.addEventListener("resize", () => renderSlots());

// ---------- 顶栏 ----------
const btnUndo = $<HTMLButtonElement>("btnUndo");
const btnRedo = $<HTMLButtonElement>("btnRedo");
const btnMenu = $<HTMLButtonElement>("btnMenu");
// 商城 = 物品栏（B27：资产 / 以后的图层 / 场景树的家；user「先左上 汉堡云商城吧。以后想到有趣的再说」）：第一版 = 模型里的组件清单（真数据），从底部抽上来
const btnShop = $<HTMLButtonElement>("btnShop"), shopEl = $<HTMLElement>("shop"), shopList = $<HTMLElement>("shopList"), shopHint = $<HTMLElement>("shopHint");
function renderShop(): void {
  const scene = editor.sceneRef;
  const counts = new Map<number, number>();
  for (const d of scene.defs.values()) for (const inst of d.instances.values()) counts.set(inst.def, (counts.get(inst.def) ?? 0) + 1);
  const defs = [...scene.defs.values()].filter((d) => d.id !== scene.root);
  shopList.replaceChildren();
  for (const d of defs) {
    const row = document.createElement("div"); row.className = "shop-row";
    row.innerHTML = `${iconHtml("object")}<span class="shop-name"></span><span class="shop-count"></span>`;
    (row.querySelector(".shop-name") as HTMLElement).textContent = d.name;
    (row.querySelector(".shop-count") as HTMLElement).textContent = `${counts.get(d.id) ?? 0} 个实例 · ${d.kernel.faces().length} 面`;
    shopList.appendChild(row);
  }
  shopHint.textContent = defs.length ? `组件 ${defs.length} 种 · 图层 / 场景树以后在这里` : "还没有组件：选中几何 → 建组件（G）。图层 / 场景树以后在这里";
}
btnShop.addEventListener("click", () => { renderShop(); shopEl.hidden = false; });
$("shopClose").addEventListener("click", () => { shopEl.hidden = true; });
shopEl.addEventListener("click", (ev) => { if (ev.target === shopEl) shopEl.hidden = true; });
type MenuId = "new" | "gallery" | "save" | "saveas" | "open" | "download" | "cloud" | "export" | "import" | "finger" | "clear" | "help" | "debuglog" | "update" | "vr" | "lefthand" | "softenAll" | "unit" | "material" | "thick" | "guidesClear" | "axesReset" | "grid" | "lw:1" | "lw:1.5" | "lw:2" | "lw:3" | "noclip" | "persp" | "walk";
/** ☰ 与右上角「视图」共用一张动作表（id 不重叠）。 */
function menuPick(id: MenuId): void | "keep" {
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
      case "softenAll": { const n = editor.softenByAngle(20); notify({ text: n ? `软化了 ${n} 条边（夹角 ≤ 20°）` : "没有夹角 ≤ 20° 的边", level: "info" }); break; }
      case "material": toggleMatSheet(true); break;
      case "persp": editor.toggleProjection(); return "keep";
      case "walk": setWalk(!locomotion.isWalking()); return "keep";
      case "thick": editor.setLineStyle(editor.lineStyle === "thick" ? "pixel" : "thick"); return "keep";
      case "lw:1": case "lw:1.5": case "lw:2": case "lw:3": { const w = Number(id.slice(3)); editor.setLineWeight(w); PREF.set("lineWeight", String(w)); return "keep"; }
      case "guidesClear": editor.clearGuides(); return "keep";
      case "grid": editor.setGrid({ on: !editor.grid.on }); return "keep";
      case "axesReset": { const f = editor.contextFrame(); editor.setContextAxes(editor.contextDepth() > 0 ? { ...WORLD_FRAME, origin: f.origin } : WORLD_FRAME); return "keep"; }
      case "noclip": locomotion.setNoclip(!locomotion.noclip); return "keep";
      case "unit": { const i = LENGTH_UNITS.findIndex((u) => u.id === editor.vcbUnit); editor.vcbUnit = LENGTH_UNITS[(i + 1) % LENGTH_UNITS.length].id; syncUi(); return "keep"; }
      case "clear":
        notify({ id: "clear", text: "清空整个模型？（可撤销）", level: "warning", actions: [{ label: "清空", primary: true, onClick: () => editor.clearAll() }, { label: "取消", onClick: () => {} }] });
        break;
      case "help": toggleHelp(true); break;
      case "update": note("sw", "force reset requested (menu)"); pwa.forceReset(); break;
      case "vr": if (vr.isPresenting()) vr.exit(); else vr.enter(); break;
      case "lefthand": leftHanded = !leftHanded; PREF.set("leftHanded", leftHanded ? "1" : "0"); return "keep";
    }
}
// ☰（左上）：文件 / 云 / 模型 / 设置 / 帮助——票 2 WeebPaint 范式：人话小标题分区，不是子菜单（user 2026-10-24「汉堡菜单weebpaint化也应该开始做了」）。
// 视图类（透视 / 线稿 / 网格 / 单位 / 步行 / 飞行 / VR）归右上角「视图」（user「步行飞行粗线稿这些都是视图啊，视图时是归右上角的汉堡管」「单位也归视图管」）；
// 轴 / 参考线归工具条（user「轴是工具，轴不归汉堡管，归工具管」）。
btnMenu.addEventListener("click", () => togglePopupMenu<MenuId>({
  anchor: btnMenu,
  items: () => [
    { id: "new", label: "新建模型", icon: "new", sectionBefore: "文件" },   // 版图 = ai-docs/20261024-ui-layout.md
    { id: "gallery", label: "图库", icon: "gallery", hint: hasStore() ? undefined : "本机 + OneDrive" },
    { id: "save", label: session.home.kind === "transient" ? (supportsSavePicker() ? "保存到磁盘…" : "保存（下载 .glb）") : "保存", icon: "floppy-disk", hint: "Ctrl+S" },
    ...(session.home.kind !== "gallery" ? [{ id: "saveas" as MenuId, label: supportsSavePicker() ? "另存到磁盘…" : "另存（下载 .glb）", icon: "save-as" }] : []),
    { id: "open", label: "打开本地 .glb…", icon: "folder-open", hint: "Ctrl+O" },
    { id: "download", label: "导出 .glb（下载一份）", icon: "download" },
    { id: "export", label: "导出 OBJ…", icon: "export", hint: "Blender 逃生口" },
    { id: "import", label: "导入 OBJ…", icon: "import" },
    { id: "cloud", label: auth.isSignedIn() ? "退出 OneDrive 登录" : "登录 OneDrive", icon: "cloud", sectionBefore: "云", disabled: !auth.isAuthConfigured(), hint: auth.isAuthConfigured() ? undefined : "未配置 client id" },
    { id: "softenAll", label: "软化所有 ≤ 20° 的边", icon: "blur", sectionBefore: "模型", hint: "平滑组" },
    { id: "material", label: "材质…", icon: "color", hint: "油漆桶蘸什么" },
    { id: "clear", label: "清空模型", icon: "trash-can" },
    { id: "finger", label: "手指也能画", checked: fingerDraws, sectionBefore: "设置", hint: gestures.penEverSeen() ? "已见过笔，手指=相机" : undefined },
    { id: "help", label: "快捷键与手势", icon: "keyboard", sectionBefore: "帮助" },
    { id: "debuglog", label: "调试日志", icon: "wrench", hint: "复制给开发者" },
    { id: "update", label: `强制更新（清缓存重启）· ${APP_VERSION}`, icon: "refresh" },
  ],
  onPick: menuPick,
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
editor.renderer3.setLineWeight(lineWeightInit());   // 线稿粗细：存的 / 高 DPI 默认 1.5（直接打渲染器：此时 HUD 元素还没挂，不能走 host.changed）
const toolStrip = mountToolStrip(document.getElementById("toolStrip") as HTMLElement, editor, {
  // 工具的上下文动作（user 2026-10-24「轴是工具…归工具管，工具的上下文菜单该开始做了」）
  actions: (tool) => {
    if (tool === "axes") return [{ id: "axesReset", label: "重置轴", onClick: () => { menuPick("axesReset"); } }];
    if (tool === "tape" || tool === "protractor") return [{ id: "guidesClear", label: "删除所有参考线", disabled: !editor.hasGuides(), onClick: () => { menuPick("guidesClear"); } }];
    return [];
  },
});
const vcb = mountVcb(document.getElementById("vcb") as HTMLElement, editor);
const selBar = mountSelectionBar(document.getElementById("selBar") as HTMLElement, editor, hud, () => selectionRoute(lastPointerType));
let lastPointerType = "mouse";
canvas.addEventListener("pointerdown", (ev) => { if (ev.pointerType !== lastPointerType) { lastPointerType = ev.pointerType; syncUi(); } }, { capture: true });
const crumbsEl = document.getElementById("crumbs") as HTMLElement;
function renderCrumbs(): void {
  const crumbs = editor.contextCrumbs();
  crumbsEl.hidden = crumbs.length <= 1;
  crumbsEl.replaceChildren();
  crumbs.forEach((c, i) => {
    if (i > 0) { const sep = document.createElement("span"); sep.className = "crumb-sep"; sep.textContent = "›"; crumbsEl.appendChild(sep); }
    const last = i === crumbs.length - 1;
    const b = document.createElement(last ? "span" : "button");
    b.className = "crumb" + (last ? " current" : "");
    b.textContent = c.label;
    if (!last) { (b as HTMLButtonElement).type = "button"; b.title = `退到这里`; b.addEventListener("click", () => editor.exitTo(c.depth)); }
    crumbsEl.appendChild(b);
  });
}
// 网格芯片（0.11 ⑤；user「如果 active 的话就显示，点开可以调设置或者关。不 active 就收进…」）：网格开着才露出，点开 = 格距 / 细分 / 关
type GridMenuId = `step:${number}` | "sub:5" | "sub:10" | "off";
const gridChip = document.getElementById("gridChip") as HTMLElement;
function renderGridChip(): void {
  const g = editor.grid;
  gridChip.hidden = !g.on;
  gridChip.textContent = `网格 ${fmtVcbLength(g.step, editor.vcbUnit)} · 1/${g.subdiv}`;
}
gridChip.addEventListener("click", () => togglePopupMenu<GridMenuId>({
  anchor: gridChip, align: "end",
  items: () => [
    ...GRID_STEPS.map((s) => ({ id: `step:${s}` as GridMenuId, label: `格距 ${fmtVcbLength(s, editor.vcbUnit)}`, checked: Math.abs(editor.grid.step - s) < 1e-9 })),
    { id: "sub:5" as GridMenuId, label: "吸附 1/5", checked: editor.grid.subdiv === 5, separatorBefore: true, hint: "仪表盘式" },
    { id: "sub:10" as GridMenuId, label: "吸附 1/10", checked: editor.grid.subdiv === 10, hint: "尺子式" },
    { id: "off" as GridMenuId, label: "关闭网格", separatorBefore: true },
  ],
  onPick: (id) => {
    if (id === "off") { editor.setGrid({ on: false }); return; }
    if (id === "sub:5" || id === "sub:10") editor.setGrid({ subdiv: id === "sub:5" ? 5 : 10 });
    else editor.setGrid({ step: Number(id.slice(5)) });
    return "keep";
  },
}));
function syncUi(): void {
  renderGridChip();
  renderSlots();
  renderCrumbs();
  toolStrip.render();
  vcb.render();
  selBar.render();
  btnUndo.disabled = !editor.canUndo();
  btnRedo.disabled = !editor.canRedo();

  vr?.invalidatePanel();
}

// ---------- 帮助 ----------
const helpEl = $("help");
function toggleHelp(on: boolean): void { helpEl.hidden = !on; }
$("helpClose").addEventListener("click", () => toggleHelp(false));
helpEl.addEventListener("click", (e) => { if (e.target === helpEl) toggleHelp(false); });

// ---------- 材质面板（油漆桶蘸什么）：家族色库 pull 的色板 + 导入图片 + 默认灰 ----------
const matSheet = $("matSheet");
const matGrid = $("matGrid");
const matImageInput = $<HTMLInputElement>("matImage");
const hexToRgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
function toggleMatSheet(on: boolean): void { matSheet.hidden = !on; if (on) renderMatGrid(); }
function renderMatGrid(): void {
  matGrid.replaceChildren();
  const cur = editor.paint;
  const mk = (label: string, bg: string, onPick: () => void, active: boolean, title?: string): void => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "swatch" + (active ? " active" : ""); b.title = title ?? label;
    b.style.background = bg;
    const t = document.createElement("span"); t.className = "swatch-label"; t.textContent = label; b.appendChild(t);
    b.addEventListener("click", () => { onPick(); renderMatGrid(); if (editor.tool !== "paint") editor.setTool("paint"); });
    matGrid.appendChild(b);
  };
  mk("默认", "#d6d6d6", () => editor.setPaint(null), cur === null, "默认灰（去掉材质）");
  for (const c of PALETTE_ZH) mk(c.name, c.hex, () => editor.setPaint({ kind: "color", name: c.name, color: hexToRgb(c.hex) }), cur?.kind === "color" && cur.name === c.name, `${c.name} ${c.hex}`);
  // 文档里已有的贴图材质（可再蘸）
  editor.materials().forEach((m) => {
    if (!m.texture) return;
    const url = URL.createObjectURL(new Blob([m.texture.bytes as BlobPart], { type: m.texture.mimeType }));
    mk(m.name, `center / cover url(${url})`, () => editor.setPaint({ kind: "texture", name: m.name, mimeType: m.texture!.mimeType, bytes: m.texture!.bytes, sizeM: [m.texture!.sizeM[0], m.texture!.sizeM[1]] }), cur?.kind === "texture" && cur.bytes === m.texture!.bytes, `${m.name}（${m.texture.sizeM[0]} × ${m.texture.sizeM[1]} m）`);
  });
}
$("matClose").addEventListener("click", () => toggleMatSheet(false));
$("matPickImage").addEventListener("click", () => matImageInput.click());
matSheet.addEventListener("click", (e) => { if (e.target === matSheet) toggleMatSheet(false); });
matImageInput.addEventListener("change", async () => {
  const file = matImageInput.files?.[0];
  matImageInput.value = "";
  if (!file) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: file.type || "image/png" }));
    const w = 1, h = bmp.height / Math.max(1, bmp.width);   // 默认 1 m 宽，按比例高（SU 导入图片材质同款起点；尺寸调整 = 以后的「摆贴图」）
    bmp.close();
    const name = file.name.replace(/\.[^.]+$/, "") || "贴图";
    editor.setPaint({ kind: "texture", name, mimeType: file.type || "image/png", bytes, sizeM: [w, h] });
    toggleMatSheet(false);
    editor.setTool("paint");
    notify({ text: `贴图「${name}」已蘸上（${bmp.width}×${bmp.height} px → ${w} × ${h.toFixed(2)} m）：点面涂上`, level: "info" });
  } catch (err) {
    notify({ text: `图片读不了：${(err as Error).message}`, level: "error" });
  }
});


// ---------- OBJ 逃生口 ----------
const objInput = $<HTMLInputElement>("objFile");
function doExport(): void {
  const world = editor.worldGeom();
  const text = exportObj(world, { triangulateHoled: faceTriangles, version: APP_VERSION });
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
  notify({ text: `已导出 ${a.download}（${world.faces().length} 面 / ${world.edges().length} 边）`, level: "info" });
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
  // #19 上下文菜单：桌面右键任何工具都行（SU）；触屏长按只在选择工具里
  onContext: (x, y, cx, cy) => openContextMenuAt(editor, hud, x, y, cx, cy),
  longPressEnabled: () => editor.tool === "select",
  // #23 user「move反而是点两下」「旋转和move对齐」：移动 = 点两下、旋转 = 点三下，笔 / 手指也开；画线 / 矩形 / 推拉在笔 / 手指上仍只拖（误触连线案）
  armable: (pt) => pt === "mouse" || pt === "pen" || editor.tool === "move" || editor.tool === "rotate",   // 笔也点两下（B23）；手指只在移动 / 旋转（#23）
});
// 视图 = 右上角导航 gizmo（Blender / Unity 式；user 2026-10-21「视图之类的能不能参考unity blender editor」）。视图弹层退役；透视 / 步行 / 穿墙 / 粗线稿进 ☰。
// 放在 locomotion 之后（render 立刻会问 isWalking）。
const viewGizmo = mountViewGizmo($("viewGizmo"), editor, { isWalking: () => locomotion.isWalking() });
// 右上角「视图」菜单（user 2026-10-24「视图时是归右上角的汉堡管」）：透视 / 线稿 / 网格 / 单位 / 步行 / 飞行 / VR
const viewMenuBtn = document.createElement("button");
viewMenuBtn.type = "button"; viewMenuBtn.className = "gizmo-btn"; viewMenuBtn.title = "视图"; viewMenuBtn.innerHTML = iconHtml("menu");
($("viewGizmo").querySelector(".gizmo-btns") as HTMLElement).prepend(viewMenuBtn);
viewMenuBtn.addEventListener("click", () => togglePopupMenu<MenuId>({
  anchor: viewMenuBtn, align: "end",
  items: () => [
    { id: "persp", label: "透视", checked: editor.cam.projection === "persp", disabled: locomotion.isWalking(), sectionBefore: "视图" },
    ...LINE_WEIGHTS.map((w) => ({ id: `lw:${w}` as MenuId, label: w === 1 ? "线稿 1 px（原生细线）" : `线稿 ${w} px`, checked: editor.lineWeight === w, hint: w === 1 ? "最快，不分轮廓" : "轮廓 / 悬空边加粗", ...(w === 1 ? { sectionBefore: "线稿粗细（设备像素）" } : {}) })),
    { id: "grid", label: "网格吸附", checked: editor.grid.on, hint: `${fmtVcbLength(editor.grid.step, editor.vcbUnit)} · 1/${editor.grid.subdiv}` },
    { id: "unit", label: `单位：${LENGTH_UNITS.find((u) => u.id === editor.vcbUnit)?.label ?? editor.vcbUnit}`, hint: "点一下换下一个" },
    { id: "walk", label: "步行相机", hint: "WASD · 空格跳", checked: locomotion.isWalking(), sectionBefore: "相机" },
    { id: "noclip", label: "穿墙飞行", hint: "双击空格切换", checked: locomotion.noclip, disabled: !locomotion.isWalking() },
    ...(vr.isSupported() ? [
      { id: "vr" as MenuId, label: vr.isPresenting() ? "退出 VR" : "进入 VR", icon: "hand", sectionBefore: "VR", hint: "Quest" },
      { id: "lefthand" as MenuId, label: "VR 左手持笔", checked: leftHanded, hint: "面板换到右手" },
    ] : []),
  ],
  onPick: menuPick,
}));
void viewGizmo;
window.addEventListener("keydown", (ev) => {
  const target = ev.target as HTMLElement | null;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
  if (vcb.feedKey(ev)) { ev.preventDefault(); return; }   // 数值小窗：数字开头直接进小窗（SU 同款），字母只在缓冲非空时进
  if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    // SU 对齐（user 2026-09-02：默认对齐 SU，确实不爽再挪；WASD 留给未来 fly cam）
    // 步行模式（0.4）：空格=跳、E=上升 归 player；选择/橡皮另有双模式通用键 Tab / X
    const map: Record<string, Tool> = { " ": "select", l: "line", r: "rect", c: "circle", a: "arc", m: "move", q: "rotate", s: "scale", p: "pp", f: "offset", w: "followme", b: "paint", e: "erase", t: "tape", tab: "select", x: "erase" };
    const key = ev.key.toLowerCase();
    const t = map[key];
    const takenByWalk = locomotion.isWalking() && (key === " " || key === "e" || key === "s" || key === "q" || key === "a" || key === "t");
    if (t && !takenByWalk) { ev.preventDefault(); editor.setTool(t); return; }
    if (key === "g") { ev.preventDefault(); if (editor.hasGeometrySelection()) editor.makeComponent(`组件 ${editor.sceneRef.defs.size}`); return; }   // SU：G = 建组件
    if (key === "z" && ev.shiftKey) { ev.preventDefault(); editor.zoomExtents(); return; }   // SU：Shift+Z = 缩放到全部
  }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "g" || ev.key === "G")) { ev.preventDefault(); if (ev.shiftKey) editor.explodeSelection(); else editor.makeGroup(); return; }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "z" || ev.key === "Z")) {
    ev.preventDefault();
    if (ev.shiftKey) editor.redo(); else editor.undo();
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "y" || ev.key === "Y")) { ev.preventDefault(); editor.redo(); return; }
  if (ev.key === "Delete" || ev.key === "Backspace") { if (editor.hasSelection()) { ev.preventDefault(); editor.deleteSelection(); } return; }
  if (ev.key === "Escape") {
    closePopupMenu(); toggleHelp(false); closeDebugLogSheet(); toggleMatSheet(false);
    // 手势中 / 有选区 → 取消；否则在 group / 组件里 → 退出一层（SU：Esc 关组）
    if (!editor.isGestureActive() && !editor.hasSelection() && editor.contextDepth() > 0) editor.exitContext(); else editor.cancel();
  }
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
  // 网页标题永远只是「CatsUp」（index.html 写死）：文档名进标题 = 浏览器历史按文档名记那个地址（user 2026-10-14「就放一个自己的名字，不解释，google也这么干的」，全家族同一标准）
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

(window as unknown as { __catsup: unknown }).__catsup = { perf, editor, locomotion, vr, hud, session, galleryHost, crash: crashStore, store: () => (hasStore() ? requireStore() : null), version: APP_VERSION, debugLog: { toText: debugLogText, entries: debugLogEntries, open: openDebugLogSheet } };

// ---------- 起 ----------
editor.setTool("line");
hintEl.textContent = hintDefault();
resize();
