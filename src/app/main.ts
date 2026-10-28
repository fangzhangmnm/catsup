// main.ts —— app 壳接线：工具条 / 顶栏 / 菜单 / 状态行 / 调试日志 sheet / OBJ 逃生口 / PWA 更新 toast / 文档生命周期 boot 编排。
// created 2026-09-06 by Claude Fable 5.1（0.3 app 壳纪元开工：user「离开 lab 变成一个 prototypical 但是正经的东西…先做无地骑士，
// 无 store 无导入导出…去掉那些很 lab 的东西，好好做 ui，可以留一个 gltf 或者 obj 的 io 逃生口」）
// 0.5 转正纪元起：文档生命周期 = src/app/session.ts（三态家）+ @internal/store 单一接缝 + @internal/gallery；OBJ 只剩逃生口。
// v0.5.7（2026-09-22，Claude Fable 5.1）：boot 改用包的 restoreLastSession（回执条三态编排）+ **本地恢复先于 initAuth**（零网络秒开）
//   + 登录 / 回线 / 回前台显式快进 + 崩溃安全 flush 三件；审计 = ai-docs/20260922-lifecycle-alignment-with-weebpaint.md。

import { mountSelectField, type SelectField } from "./ui/select-field.ts";
import { ERASERS } from "../editor/tool-ids.ts";
import { planeLockLabel } from "../editor/locks.ts";
import { type Ladder, loadLadder, remindersFor } from "../editor/scale-ref.ts";
import { SCALE_TIP_MAX, scaleTipHtml } from "./scale-tip.ts";
import { type ChoiceOption, multiSummary, openMultiSelect } from "./ui/choice-layer.ts";
import { ARC_MODES } from "../editor/arc-build.ts";
import { APP_VERSION } from "../version.ts";
import { mountContextBar } from "./context-bar.ts";
import { mountVcb } from "./vcb.ts";
import { perf } from "../editor/perf-stats.ts";
import { LENGTH_UNITS, fmtVcbLength, type LengthUnit } from "../editor/units.ts";
import { openContextMenuAt } from "./context-menu.ts";
import { selectionActions, selectionRoute } from "./selection-actions.ts";
import { mountViewGizmo } from "./view-gizmo.ts";
import { deviceKvGet, deviceKvSet, migrateLegacyUiPrefs } from "./device-kv.ts";
import { Session, supportsOpenPicker, supportsSavePicker } from "./session.ts";
import { createReferenceHost } from "./reference-host.ts";
import { restoreLastSession, readSlate, setRestoreAttempt, type RestoreOutcome } from "@internal/gallery";
import { initGalleryHost } from "./gallery-host.ts";
import { runFactoryReset, finishFactoryResetAtBoot, hasFactoryResetMarker } from "./factory-reset.ts";
import { auth, ensureStore, hasStore, requireStore } from "../app-store.ts";
import { captureThumbnail } from "./thumbnail.ts";
import { initSheets, openChoiceSheet, openConfirmSheet, isBusyActive } from "./ui/sheets.ts";
import { reportError as funnel } from "./error-funnel.ts";
import { Editor, GRID_PLANES, GRID_PRESETS, TOOLS, gridPreset, gridStepsFor, nearestGridStep, type Tool, type GridPlane, type GridPreset } from "../editor/editor.ts";
import type { CommandId } from "../editor/commands/command.ts";
import type { ModeId } from "../editor/mode.ts";
import { LINE_WEIGHTS } from "../editor/render3.ts";
import { README_SECTIONS } from "./readme-docs.ts";
import { escapeHtml, renderMdLite } from "./ui/md-lite.ts";
import { PALETTE_ZH } from "./palette.ts";
import { faceTriangles } from "../editor/render3.ts";
import { exportObj, parseObjSegments } from "../editor/obj-io.ts";
import { isForeignGlb, readForeignGlb } from "../format/gltf-import.ts";
import { attachGestures } from "./gestures.ts";
import { Locomotion } from "./locomotion.ts";
import { VR } from "./vr.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { initPwaShell } from "./pwa-shell.ts";
import { iconHtml } from "./ui/icon.ts";
import { configureTabMemory, openPopupMenu, togglePopupMenu, closePopupMenu, type PopupMenuItem } from "./ui/popup-menu.ts";
import { showNotice, closeNotice, type NoticeOpts } from "./ui/notice.ts";
import { conflictGate } from "../store-ui.ts";   // 2026-10-26：自动保存撞上云端 → 横幅接手
import { initCrashRecovery } from "./crash-recovery.ts";
import { crashStore } from "./crash-store.ts";
import { initDebugLog, note, record, toText as debugLogText, entries as debugLogEntries } from "./debug-log.ts";
import { initDebugLogSheet, openDebugLogSheet, closeDebugLogSheet, setLastStepProvider } from "./debug-log-sheet.ts";
import { capture as reproCapture, count as reproCount, toJson as reproJson, exportJson as reproExport, lastStepEntry } from "./repro-box.ts";
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
let lastStepProvider: (() => Parameters<typeof lastStepEntry>[0] | null) | null = null;   // editor 建好后接上（reportError 在它之前就可能被叫）
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
  // 胶囊上直接给寄包的口（user 2026-10-24「错误之后的小胶囊好像没有给下载上一步的包和操作的选项」）：内核拒绝的复现包 + 刚提交的上一步
  const actions: NoticeOpts["actions"] = [];
  const say = (t: string): void => notify({ id: "repro", text: t, level: "info" });
  if (reproCount() > 0) actions.push({ label: `复现包 (${reproCount()})`, onClick: () => { void reproExport(reproJson(), "catsup-repro", say); } });
  const step = lastStepProvider?.();
  if (step) actions.push({ label: "上一步", onClick: () => { void reproExport(reproJson([lastStepEntry(step)]), "catsup-last-step", say); } });
  actions.push({ label: "日志", onClick: () => openDebugLogSheet() });
  notify({ id: "err", text, level: "error", actions });
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
deviceKvSet("ui.menuTab.main", null); deviceKvSet("ui.menuTab.view", null);   // v0.13.73 按设备记过停留页，v0.13.74 改跟文件走（user「不是应该跟文件吗」）：旧键清掉
let fingerDraws = PREF.get("fingerDraws") === "1";
// B43 尺度参考：最多几条（这台设备记住；user「有一个最多条目数」）。样式只剩字的深浅（user「要不不要图像，就字的深淡」）
let lastTipHtml = "";
let tipSize = { w: 0, h: 0 };
let scaleMax: number = (SCALE_TIP_MAX as readonly number[]).includes(Number(PREF.get("scaleMax"))) ? Number(PREF.get("scaleMax")) : 3;
let leftHanded = PREF.get("leftHanded") === "1";   // VR：左手持笔（工具手/面板手对调）
/** 线稿粗细（设备像素）：存过就用存的；没存过 → 高 DPI（iPad / Retina）默认 1.5，否则 1（原生）。user 10-24「ipad上面细线稿是不舒服…有1.5这种选项吗」 */
const lineWeightInit = (): number => { const v = Number(PREF.get("lineWeight")); return LINE_WEIGHTS.includes(v) ? v : (window.devicePixelRatio >= 2 ? 1.5 : 1); };

// ---------- DOM ----------
const canvas = $<HTMLCanvasElement>("board");
const stage = $("stage");
const hintEl = $("hint");
const tipEl = $("tip");
/** 盖上图库（或别的整屏覆盖层）前收掉画布上的光标提示 / 悬停（user 10-26：回图库之后读数框还挂在左上角——从菜单进图库指针没「离开画布」，画线中途离开也不清）。 */
function hideCanvasTip(): void { tipEl.hidden = true; lastTipHtml = ""; editor.pointerLeave(); }
const marqueeEl = $("marquee");
const toolbarEl = $("toolbar");
const readoutEl = $("readout");
/** 右下读数（面积 / 长 / 手势尺寸）先关（user 2026-10-25「面积和长可以先不显示……右边把小窗位置都让出来」）；尺寸仍在光标旁的小提示和参数小窗的数值里。 */
const READOUT_ON = false;
const buildEl = $("build");

const HINT_DEFAULT = "";   // 左下角默认不再列快捷键（user 2026-10-25「左下角的那行快捷键早应该删掉了」）；只在真有提示时显示，快捷键在使用手册里
const HINT_WALK = "步行：WASD 走 · Shift 冲刺 · 空格 跳（双击=飞行开关）· Ctrl 蹲 · Q/E 下/上 · ←→ 转身 · 右键拖=看 · T 按住瞄准瞬移（↑↓ 力度 ←→ 落地朝向）· G 回上一点 ｜ 工具 L R M P · 选择 Tab · 橡皮 X";
const HINT_VR = "VR：左摇杆走（按下冲刺）· 右摇杆 ←→ 转身 · 前推瞄准瞬移（左摇杆 ↑↓ 力度 ←→ 落地朝向）· 后拉回上一点 · A 跳（双击=飞行开关）B 蹲 · 扳机画 · 手腕面板选工具 · X/Y 撤销重做";
const hintDefault = (): string => (vr?.isPresenting() ? HINT_VR : locomotion?.isWalking() ? HINT_WALK : HINT_DEFAULT);

// ---------- Editor ----------
let _session: Session | null = null;   // editor.host.changed 要同步喂 session（lazyblank 首笔安家）；session 在 editor 之后才建
const editor = new Editor(canvas, {
  optionKv: { get: (k) => deviceKvGet(k), set: (k, v) => deviceKvSet(k, v) },   // 工具选项 device 持久化（surface 组：user「锐角阈值和模式的持久化不同工具共享」）
  hint: (t) => { hintEl.textContent = t ?? hintDefault(); },
  confirm: (title, message, okLabel) => openConfirmSheet(title, message, { warning: true, okLabel, cancelLabel: "不做" }),   // 慢的修复先问（user「宁愿弹警告问yes no」）
  tip: (t, cx, cy, scale, measure) => {
    const html = scaleTipHtml(t, scale ?? null, scaleMax, measure || undefined);   // 读数第一行；B43 参考第二行（user「优先显示长度，参考只是参考」）
    if (html) {
      if (html !== lastTipHtml) { tipEl.innerHTML = html; lastTipHtml = html; tipEl.hidden = false; tipSize = { w: tipEl.offsetWidth, h: tipEl.offsetHeight }; }   // 字没变不重写、不重量（拖动时每帧都会叫到这里）
      tipEl.hidden = false;
      // 笔 / 手指时摆到光标左上（user「tooltip右手惯用手的话会被笔挡住」）；左手持笔 = 右上；鼠标照旧右下
      const handy = lastPointerType === "pen" || lastPointerType === "touch";
      let x = !handy ? cx + 14 : leftHanded ? cx + 18 : cx - 18 - tipSize.w;
      let y = !handy ? cy - 28 : cy - 18 - tipSize.h;
      x = Math.max(4, Math.min(window.innerWidth - tipSize.w - 4, x)); y = Math.max(4, Math.min(window.innerHeight - tipSize.h - 4, y));
      tipEl.style.left = `${x}px`;
      tipEl.style.top = `${y}px`;
    } else { tipEl.hidden = true; lastTipHtml = ""; }
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
  readout: (text) => { readoutEl.textContent = text; readoutEl.hidden = !READOUT_ON || !text; },   // 右下血槽位（A28）；10-25 先不显示（READOUT_ON）
});

// ---------- 工具条 ----------
const TOOL_SPEC: { tool: Tool; icon: string; label: string; key: string }[] = [
  { tool: "select", icon: "select", label: "选择", key: "空格" },
  { tool: "line", icon: "line", label: "画线", key: "L" },
  { tool: "rect", icon: "rectangle", label: "矩形", key: "R" },
  { tool: "crect", icon: "rectangle", label: "中心矩形", key: "" },   // user 10-27「中心矩形能单独做一个工具吗」；图标 = stopgap（图标库 TODO 已登记 rectangle-center）
  { tool: "rrect", icon: "rotated-rectangle", label: "旋转矩形", key: "" },   // SU Rotated Rectangle（user 10-24）；图标 = 图标库 PENDING 层自画未过目
  { tool: "circle", icon: "circle", label: "圆", key: "C" },
  { tool: "arc", icon: "arc", label: "弧", key: "A" },
  { tool: "move", icon: "move", label: "移动", key: "M" },
  { tool: "rotate", icon: "rotate", label: "旋转", key: "Q" },
  { tool: "scale", icon: "scale-uniform", label: "缩放", key: "S" },   // 2026-10-26 恢复（user「box也需要……先留着move rotate scale，transform做单独的，就是恢复之前的scale」）
  { tool: "transform", icon: "free-transform", label: "变换", key: "" },   // 箭头 + 环 + 缩放块 + 变换中心（2026-10-26；专用图标在图标库待办，先用 free-transform；快捷键暂不占）
  { tool: "pp", icon: "push-pull", label: "推拉", key: "P" },
  { tool: "offset", icon: "selection-expand", label: "偏移", key: "F" },   // 图标 = stopgap（图标库 TODO 已登记 offset）
  { tool: "followme", icon: "move-to-folder", label: "跟随", key: "W" },   // 图标 = stopgap（图标库 TODO 已登记 follow-me）
  { tool: "paint", icon: "paint-bucket", label: "油漆桶", key: "B" },
  { tool: "erase", icon: "eraser", label: "橡皮", key: "E" },
  { tool: "weldErase", icon: "eraser-weld", label: "焊边橡皮", key: "" },   // 橡皮家族（user 10-24）；图标 = 图标库 PENDING 层自画未过目
  { tool: "softErase", icon: "eraser-soft", label: "软边橡皮", key: "" },   // 同上
  { tool: "tape", icon: "dimensions", label: "卷尺", key: "T" },   // 0.11 尺规；图标 = stopgap（图标库 TODO 已登记 tape-measure）
  { tool: "axes", icon: "axes", label: "坐标架", key: "" },           // 0.11 尺规：三下定帧（原点 / X / Y）；SU 无默认键
  { tool: "protractor", icon: "protractor", label: "量角器", key: "" },
  { tool: "compass", icon: "compass", label: "圆规", key: "" },
  { tool: "knife", icon: "knife", label: "切割", key: "K" },   // 自由建模的切割 + 环切（2026-10-27 Opus 5.5；user「刀应该叫切割」「小刀图标」）；图标 = 图标库 PENDING 层自画、未过目   // DT50 圆规 / 球规（工具条「画：圆 / 球」）；没有快捷键、不进 T 的轮换（尺规 2.0 §0 user「收到...里面当玩具」）；图标 = 图标库 PENDING 层自画未过目
];
// HUD 数据模型：桌面 DOM 工具栏与 VR 手腕面板消费同一份（A13 第 6 条）
const hud: HudModel = {
  version: APP_VERSION,
  tools: (): HudItem[] => TOOL_SPEC.map((t0) => { const t = specOf(t0.tool); return { id: t.tool, label: t.label, icon: t.icon, key: t.key, active: editor.tool === t.tool }; }),
  edits: (): HudItem[] => { const brepOnly = editor.activeKind() !== "brep";   // 网格体的池：SU 体的动词先不露（自由建模工作台的同名动词 = M4），露了点不动 = 误导
    return [
    { id: "undo", label: "撤销", icon: "arrow-undo", disabled: !editor.canUndo() },
    { id: "redo", label: "重做", icon: "arrow-redo", disabled: !editor.canRedo() },
    { id: "delete", label: "删除", icon: "trash-can", danger: true, hidden: !editor.hasSelection() },   // 网格体的点 / 边 / 面也能删了（v0.15.22）
    { id: "group", label: "建组", icon: "collection", hidden: brepOnly || (!editor.hasGeometrySelection() && !editor.hasPoolSelection()) },   // 选了组 / 组件也能建（装进去，2026-10-26 嵌套）
    { id: "component", label: "建组件", icon: "object", hidden: brepOnly || (!editor.hasGeometrySelection() && !editor.hasPoolSelection()) },
    { id: "explode", label: "炸开", icon: "explode-folder", hidden: brepOnly || !editor.hasPoolSelection() },
    { id: "mirror", label: "镜像…", icon: "flip-horizontal", hidden: brepOnly || !editor.hasSelection() || editor.mirrorActive() },   // DT23（user 2026-10-25「你选中，右键mirror之后……」）
    { id: "weld", label: "焊接", icon: "arc", hidden: !editor.canWeldSelection() },   // B19：边链 → 一条曲线（图标 = stopgap，图标库 TODO 已登记 weld）
    { id: "explodeCurve", label: "炸开曲线", icon: "explode-folder", hidden: !editor.hasCurveSelection() },
    { id: "enter", label: "进入编辑", icon: "selection-expand", hidden: !editor.hasPoolSelection() },
    { id: "lock", label: "锁定", icon: "lock", hidden: !editor.hasUnlockedPoolSelection() },     // A27：不能改 / 移 / 进入，推断照吃
    { id: "unlock", label: "解锁", icon: "unlock", hidden: !editor.hasLockedSelection() },
    { id: "hide", label: "隐藏", icon: "visibility-hide", hidden: brepOnly || !editor.hasHideableSelection() },
    { id: "applyScale", label: "应用缩放", icon: "scale-uniform", hidden: !editor.hasScaledInstanceSelection() },
    { id: "componentOrigin", label: "改组件原点…", icon: "axes", hidden: !editor.canEditComponentOrigin() },   // DT86：物体的指令（SU 右键「更改轴」、Blender「设置原点」）；user「专门入口同意，赞。这样小白能找到」
    // 修复指令（DT85）：有选区 = 选中的、没选 = 整个物体；含子物体默认开（数字按现在的范围算）。新指令不进 ☰（user 10-26「以后这些指令不住汉堡，等攒多了我帮他们找家」）
    { id: "repairPanel", label: "修复…", icon: "wrench", hidden: editor.repairPanelOpen() || !editor.repairWorth() },   // T6 / DT6 + DT9：修复面板（几步一起跑 = 一步撤销）+「检查」高亮微折软边
    // 各个修复模块自己的入口（src/editor/repairs/ 清单；user 10-26「做成可以扔的模块化的」）：拉正 / 吸到格点 / 焊断口 / 拍平 / 软边变硬 / 恢复层级…
    ...editor.commandMenu().map((m): HudItem => ({ id: `action:${m.id}`, label: m.label, icon: m.icon })),   // 注册表 contextBar 面上的动作（修复九条 + 物体族的两条转换）
    { id: "exit", label: "退出一层", icon: "back", hidden: editor.contextDepth() === 0 },
    { id: "soften", label: "软化选区", icon: "blur", hidden: brepOnly || !editor.hasGeometrySelection() },
    { id: "harden", label: "硬化选区", icon: "sharpen", hidden: brepOnly || !editor.hasGeometrySelection() },
    { id: "connected", label: "选择连通体", icon: "select", hidden: !editor.hasGeometrySelection() && !editor.hasPointSelection() },
    { id: "invert", label: "反选", icon: "selection-invert", hidden: !editor.hasSelection() },   // Blender Ctrl+I（user 10-26「我们现在选择有shift之类的多选，反选吗」）
    { id: "deselect", label: "取消选择", icon: "x", hidden: !editor.hasSelection() },   // user 2026-10-24「有东西选择的时候应该永远有取消选择的上下文胶囊」
  ]; },
  vr: (): HudItem[] => [
    { id: "noclip", label: locomotion.noclip ? "飞行中" : "穿墙飞行", active: locomotion.noclip },
    { id: "respawn", label: "回出生点" },
    { id: "exitvr", label: "退出 VR", danger: true },
  ],
  status: () => hintEl.textContent ?? "",
  pick: (id) => {
    if (id === "paint" && editor.tool === "paint") { toggleMatSheet(matSheet.hidden); return; }   // 油漆桶已选中再点 = 材质面板（WeebPaint 画笔再点开面板同款；材质钮撤了）
    if ((TOOLS as readonly string[]).includes(id)) { editor.setTool(id as Tool); return; }
    if (id.startsWith("action:")) { editor.runAction(id.slice("action:".length)); return; }
    switch (id) {
      case "undo": editor.undo(); break;
      case "redo": editor.redo(); break;
      case "delete": editor.deleteSelection(); break;
      case "deselect": editor.cancel(); break;
      case "group": editor.makeGroup(); break;
      case "component": editor.makeComponent(`组件 ${editor.sceneRef.defs.size}`); break;
      case "explode": editor.explodeSelection(); break;
      case "mirror": editor.beginMirror(); break;
      case "weld": editor.weldSelection(); break;
      case "explodeCurve": editor.explodeCurveSelection(); break;
      case "enter": editor.enterSelected(); break;
      case "lock": editor.lockSelection(true); break;
      case "unlock": editor.lockSelection(false); break;
      case "hide": editor.hideSelection(); break;
      case "applyScale": editor.applyScaleSelection(); break;
      case "componentOrigin": editor.beginComponentOrigin(); syncUi(); break;
      case "repairPanel": editor.beginRepairPanel(); break;
      case "exit": editor.exitContext(); break;
      case "soften": { const n = editor.softenSelection(true); notify({ text: n ? `软化了 ${n} 条边（soft + smooth）` : "选区里没有两膜之间的边", level: "info" }); break; }
      case "harden": { const n = editor.softenSelection(false); notify({ text: n ? `硬化了 ${n} 条边` : "选区里没有两膜之间的边", level: "info" }); break; }
      case "connected": editor.selectConnected(); break;
      case "invert": editor.invertSelection(); break;
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
const SHAPES: Tool[] = ["rect", "crect", "rrect", "circle", "arc"];
/** 橡皮格：橡皮 / 焊边橡皮 / 软边橡皮，显示当前那把，小三角换（ERASERS 的 SSoT 在 tool-ids.ts）。 */
let eraserCurrent: Tool = "erase";
const RAIL_GROUPS: RailGroup[] = [
  { id: "edit", pinned: ["pp", "move"], pool: ["offset", "followme", "rotate", "scale", "transform"], budget: 4 },
  { id: "measure", pinned: [], pool: ["tape", "axes", "protractor", "compass"], budget: 3 },   // user 10-27「卷尺和座标架相对比较低频，不需要常驻，虽然还在」：用过才长出来，平时收在 ⌄ 里
  { id: "paint", pinned: ["paint"], pool: [], budget: 1 },
];
/** 同一把工具在某个工作台里另起的名字（user 10-27「要不要在自由建模工作台里显示成「拉」 可以」「或者叫挤出也行，更标准」）。 */
const MODE_TOOL_LABEL: Partial<Record<ModeId, Partial<Record<Tool, string>>>> = { freeform: { pp: "挤出", erase: "删除", offset: "插入" } };
/** 工作台自己定死的左柱（不走分组 / 预算）。自由建模 = user 10-27「选 拉 挪 转 缩 刀 删 插 八个常用的，先这么试一下」+「用两字词语吧和硬表面对齐」：选择 · 挤出 · 移动 · 旋转 · 缩放 · 切割 · 删除 · 插入（删除 / 插入还没做的不露）。 */
const MODE_RAIL: Partial<Record<ModeId, readonly Tool[]>> = { freeform: ["select", "pp", "move", "rotate", "scale", "knife", "erase", "offset"] };
const specOf = (t: Tool) => { const sp = TOOL_SPEC.find((x) => x.tool === t)!, l = MODE_TOOL_LABEL[editor.modeId]?.[t]; return l ? { ...sp, label: l } : sp; };
/** 同一个键再按一下的轮换组（user 10-25）：键 → 组（组内第一个 = 那个键原本切到的工具）。 */
const KEY_CYCLES: Record<string, readonly Tool[]> = { e: ERASERS, x: ERASERS, r: ["rect", "crect", "rrect"], t: ["tape", "protractor", "axes"] };
let shapeCurrent: Tool = "rect";
/** 本次会话里用过的池工具（按最近使用）；开局为空 = 只显示常驻。 */
const usedPool = new Map<string, Tool[]>(RAIL_GROUPS.map((g) => [g.id, []]));
/** 组内全部工具按最近使用（吃常驻时按它填）。 */
const groupMru = new Map<string, Tool[]>(RAIL_GROUPS.map((g) => [g.id, [...g.pinned, ...g.pool]]));
const bumpFront = (list: Tool[], t: Tool): void => { const i = list.indexOf(t); if (i > 0) list.splice(i, 1); if (i !== 0) list.unshift(t); };
function noteToolUse(t: Tool): void {
  if (SHAPES.includes(t)) shapeCurrent = t;
  if (ERASERS.includes(t)) eraserCurrent = t;
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
  b.type = "button"; b.className = "rail-more"; b.title = "这一组的全部工具"; b.innerHTML = iconHtml("more");   // user 10-24「工具栏用...不要用小箭头。也是黑色」
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
  const inMode = (t: Tool): boolean => editor.modeTools().includes(t);   // 左柱只排当前模式的工具（刀 ③：表面模式 = 选择 + 油漆桶）
  const add = (t: Tool, fly?: () => Tool[]): void => { if (!inMode(t)) return; const b = mkToolBtn(t, fly); b.classList.toggle("active", t === editor.tool); toolbarEl.appendChild(b); };
  const fixed = MODE_RAIL[editor.modeId];
  if (fixed) { for (const t of fixed) add(t); return; }   // 这个工作台有自己定死的一列（自由建模）
  add("select"); add("line"); if (SHAPES.some(inMode)) add(shapeCurrent, () => SHAPES.filter(inMode)); if (ERASERS.some(inMode)) add(eraserCurrent, () => ERASERS.filter(inMode));   // 第一组常驻
  const slots = allocate();
  RAIL_GROUPS.forEach((g, gi) => {
    const k = slots[gi];
    const all = [...g.pinned, ...g.pool].filter(inMode);
    if (!all.length) return;
    const sep = document.createElement("div"); sep.className = "rail-sep"; toolbarEl.appendChild(sep);
    let shown: Tool[];
    if (k >= g.pinned.length) shown = [...g.pinned, ...usedPool.get(g.id)!.slice(0, k - g.pinned.length)];
    else shown = groupMru.get(g.id)!.slice(0, k);   // 常驻也被吃：按组内最近使用填
    shown = shown.filter(inMode);
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
    (row.querySelector(".shop-count") as HTMLElement).textContent = `${counts.get(d.id) ?? 0} 个实例 · ${d.body.kind === "brep" ? d.body.kernel.faces().length : 0} 面`;
    shopList.appendChild(row);
  }
  shopHint.textContent = defs.length ? `组件 ${defs.length} 种 · 图层 / 场景树以后在这里` : "还没有组件：选中几何 → 建组件（G）。图层 / 场景树以后在这里";
}
// 非模态（user 2026-10-25「物品栏不应该是模态的」）：开着照样画，内容跟着模型变；抽屉多高，贴底的 HUD 就往上让多少（「物品栏弹起来时会把小窗顶到上面，然后其他的hud也一样」）
btnShop.addEventListener("click", () => { if (!shopEl.hidden) { shopEl.hidden = true; return; } renderShop(); shopEl.hidden = false; });
$("shopClose").addEventListener("click", () => { shopEl.hidden = true; });
{
  const sheet = shopEl.querySelector<HTMLElement>(".sheet")!;
  const sync = (): void => { document.documentElement.style.setProperty("--drawer-h", shopEl.hidden ? "0px" : `${Math.ceil(sheet.getBoundingClientRect().height)}px`); };
  new ResizeObserver(sync).observe(sheet);   // 开 / 关（0 ↔ 高）和内容变高都会触发
}
type MenuId = "newOpen" | "exportHub" | "new" | "gallery" | "save" | "saveas" | "open" | "download" | "cloud" | "export" | "import" | "importGlb" | "finger" | "clear" | "help" | "debuglog" | "update" | "factoryReset" | "vr" | "lefthand" | "softenAll" | "weldAllBreaks" | "makePlanarAll" | `unit:${string}` | "material" | "thick" | "guidesClear" | "axesReset" | "grid" | "lw:1" | "lw:1.5" | "lw:2" | "lw:3" | "lw:pick" | "unit:pick" | "finalize" | "revise" | "noclip" | "persp" | "xray" | "walk" | "refwin" | "unhideAll";
/** ☰ 与右上角「视图」共用一张动作表（id 不重叠）。 */
function menuPick(id: MenuId): void | "keep" {
    if (id.startsWith("unit:")) { editor.vcbUnit = id.slice(5) as LengthUnit; syncUi(); return "keep"; }   // 单位（B40：一排可勾选项）
    switch (id) {
      case "newOpen": openPopupMenu<MenuId>({ anchor: btnMenu, items: () => [
        { id: "new", label: "新建模型", icon: "new" },
        { id: "open", label: "打开本地 .glb…", icon: "folder-open", hint: "Ctrl+O" },
        { id: "importGlb", label: "导入 glb…", icon: "import", hint: "别的软件导出的；层级变成组件，放进当前位置" },
        { id: "import", label: "导入 OBJ…", icon: "import" },
      ], onPick: menuPick }); break;
      case "exportHub": openPopupMenu<MenuId>({ anchor: btnMenu, items: () => [
        ...(session.home.kind !== "gallery" ? [{ id: "saveas" as MenuId, label: supportsSavePicker() ? "另存到磁盘…" : "另存（下载 .glb）", icon: "save-as" }] : []),
        { id: "download", label: "导出 .glb（下载一份）", icon: "download" },
        { id: "export", label: "导出 OBJ…", icon: "export", hint: "Blender 逃生口" },
      ], onPick: menuPick }); break;
      case "new": void session.newDoc(); break;
      case "finalize": void (async () => { if (await openConfirmSheet(`定稿第 ${session.finalRev() + 1} 版？`, "之后锁住几何与材质，只能看、量、导出；☰「改稿」随时解锁（版本号不减）。", { okLabel: "定稿" })) await session.finalize(); })(); break;
      case "revise": void session.revise(); break;
      case "gallery": hideCanvasTip(); void galleryHost.open(); break;
      case "save": smartSave(); break;
      case "saveas": void session.settleToFile(); break;
      case "open": openLocal(); break;
      case "download": session.exportDownload(); break;
      case "cloud": if (auth.isSignedIn()) { void cloudSignOut(); } else { cloudSignIn(); } break;
      case "export": doExport(); break;
      case "import": objInput.click(); break;
      case "importGlb": glbImportInput.click(); break;
      case "finger": fingerDraws = !fingerDraws; PREF.set("fingerDraws", fingerDraws ? "1" : "0"); return "keep";
      case "debuglog": openDebugLogSheet(); break;
      case "softenAll": { const n = editor.softenByAngle(20); notify({ text: n ? `软化了 ${n} 条边（夹角 ≤ 20°）` : "没有夹角 ≤ 20° 的边", level: "info" }); break; }
      case "weldAllBreaks": editor.repair("brep.weld", "context"); break;
      case "makePlanarAll": editor.repair("brep.planar", "context"); break;
      case "material": toggleMatSheet(true); break;
      case "persp": editor.toggleProjection(); return "keep";
      case "xray": editor.setXray(!editor.xray); return "keep";
      case "unhideAll": editor.unhideAll(); break;
      case "walk": setWalk(!locomotion.isWalking()); return "keep";
      case "thick": editor.setLineStyle(editor.lineStyle === "thick" ? "pixel" : "thick"); return "keep";
      case "lw:1": case "lw:1.5": case "lw:2": case "lw:3": { const w = Number(id.slice(3)); editor.setLineWeight(w); PREF.set("lineWeight", String(w)); return "keep"; }
      case "guidesClear": editor.clearGuides(); return "keep";
      case "grid": editor.setGrid({ on: !editor.grid.on }); return "keep";
      case "axesReset": editor.resetContextFrame(); return "keep";
      case "noclip": locomotion.setNoclip(!locomotion.noclip); return "keep";
      case "refwin": refHost.toggle(); break;   // 参考窗（视图 ☰「参考」页；开 = 给它焦点，开窗 → Ctrl+V 一步到位）
      case "clear":
        notify({ id: "clear", text: "清空整个模型？（可撤销）", level: "warning", actions: [{ label: "清空", primary: true, onClick: () => editor.clearAll() }, { label: "取消", onClick: () => {} }] });
        break;
      case "help": toggleHelp(true); break;
      case "update": note("sw", "force reset requested (menu)"); pwa.forceReset(); break;
      // 还原出厂设置（家规 2½；factory-reset.ts）：两步护栏在它里面；成功 = 带 ?factory= reload，开机 finishFactoryResetAtBoot 收尾
      case "factoryReset": note("app", "factory reset requested (menu)"); void runFactoryReset({
        setStatus: (msg, error) => notify({ text: msg, level: error ? "error" : "info" }),
        beforeWipe: () => { session.haltForReset(); },
        clearOwnShell: () => pwa.clearOwnShell(),
      }); break;
      case "vr": if (vr.isPresenting()) vr.exit(); else vr.enter(); break;
      case "lefthand": leftHanded = !leftHanded; PREF.set("leftHanded", leftHanded ? "1" : "0"); return "keep";
    }
}
// ☰（左上）：文件 / 云 / 模型 / 设置 / 帮助——票 2 WeebPaint 范式：人话小标题分区，不是子菜单（user 2026-10-24「汉堡菜单weebpaint化也应该开始做了」）。
// 视图类（透视 / 线稿 / 网格 / 单位 / 步行 / 飞行 / VR）归右上角「视图」（user「步行飞行粗线稿这些都是视图啊，视图时是归右上角的汉堡管」「单位也归视图管」）；
// 轴 / 参考线归工具条（user「轴是工具，轴不归汉堡管，归工具管」）。
// ☰ = WeebPaint 式 tab 制（A30，user 2026-10-24「汉堡菜单应该tab制度，和weebpaint一样」）；文件页顺序 = 家族统一（F-81）：
// 图库 → 新建 / 打开（含导入）→ 保存 / 导出 → 定稿；CatsUp 没有的改名 / 加密 / 回到打开时版本不出现。版图 = ai-docs/20261024-ui-layout.md
const MAIN_MENU_TABS = [
  { id: "file", label: "文件", icon: "floppy-disk" },
  { id: "model", label: "模型", icon: "object" },
  { id: "settings", label: "设置", icon: "settings" },
  { id: "help", label: "帮助", icon: "help" },
] as const;
btnMenu.addEventListener("click", () => togglePopupMenu<MenuId>({
  anchor: btnMenu, tabs: MAIN_MENU_TABS, tabKey: "main",
  items: () => [
    // 文件页 = WeebPaint 合租法（user 10-24「看一下weebpaint是怎么收的更干净的，谁和谁合租」）：新建 / 打开 / 导入合一行、另存 / 导出合一行，各开小弹层；
    // 保存走顶栏保存钮（Ctrl+S），登录走保存时的问询与图库页云账号钮——都不占菜单行（WeebPaint 同款）
    { id: "gallery", label: "图库", icon: "gallery", tab: "file", hint: hasStore() ? undefined : "本机 + OneDrive" },
    { id: "newOpen", label: "新建 / 打开…", icon: "folder-open", tab: "file", hint: "Ctrl+O" },
    { id: "exportHub", label: "导出与另存…", icon: "export", tab: "file" },
    session.finalRecord()
      ? { id: "revise" as MenuId, label: `改稿（解锁；定稿第 ${session.finalRecord()!.rev} 版）`, icon: "unlock", tab: "file" }
      : { id: "finalize" as MenuId, label: session.finalRev() ? `定稿…（第 ${session.finalRev() + 1} 版）` : "定稿…", icon: "lock", tab: "file", hint: "锁住几何 / 材质" },
    { id: "softenAll", label: "软化所有 ≤ 20° 的边", icon: "blur", tab: "model", hint: "平滑组" },
    ...(editor.repairLoaded("brep.weld") ? [((): { id: MenuId; label: string; icon: string; tab: string; hint: string; disabled: boolean } => { const n = editor.repairCount("brep.weld", "context"); return { id: "weldAllBreaks", label: n ? `焊接全部断口（${n}）` : "焊接全部断口", icon: "arc", tab: "model", hint: "当前在编辑的整个物体（含子物体）", disabled: !n }; })()] : []),   // T7 / DT5   // 修复模块扔掉了 = 这一项不出
    ...(editor.repairLoaded("brep.planar") ? [((): { id: MenuId; label: string; icon: string; tab: string; hint: string; disabled: boolean } => { const n = editor.repairCount("brep.planar", "context"); return { id: "makePlanarAll", label: n ? `拍平几乎共面的面（${n} 组）` : "拍平几乎共面的面", icon: "sharpen", tab: "model", hint: "弯折小于锐角阈值的硬边分开的面", disabled: !n }; })()] : []),   // T9 / DT7   // 修复模块扔掉了 = 这一项不出
    { id: "material", label: "材质…", icon: "color", tab: "model", hint: "油漆桶蘸什么" },
    { id: "clear", label: "清空模型", icon: "trash-can", tab: "model", separatorBefore: true },
    { id: "finger", label: "手指也能画", checked: fingerDraws, tab: "settings", hint: gestures.penEverSeen() ? "已见过笔，手指=相机" : undefined },
    // 「开发者」节（家规 2½：还原出厂住开发者菜单；「强制更新（清缓存重启）」是另一个钮，留在帮助页）
    { id: "factoryReset", label: "还原出厂设置…", icon: "trash-can", tab: "settings", sectionBefore: "开发者", hint: "两步确认" },
    { id: "help", label: "使用手册", icon: "help", tab: "help" },
    { id: "debuglog", label: "调试日志", icon: "wrench", tab: "help", hint: "复制给开发者" },
    { id: "update", label: "强制更新", icon: "refresh", tab: "help", hint: APP_VERSION.replace(/-\d{4}-\d{2}-\d{2}$/, "") },   // WeebPaint 同款：版本号 = 行尾小字（user 10-24「字超了……weebpaint用的应该是小字」）
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
// 上下文条（A25，2026-10-24 Opus）：工具选项 / 工具动作 / 选区动作同一条（user「context bar好像油漆桶和选择没有统一……做一个深模块」）
const toolStrip = mountContextBar(document.getElementById("toolStrip") as HTMLElement, editor, {
  // 工具的上下文动作（user 2026-10-24「轴是工具…归工具管，工具的上下文菜单该开始做了」）
  // 表面工具的上下文条开头（user 2026-10-24「先显示选中的材质，然后是eyedropper，然后是范围，然后是阈值」）
  leading: (tool) => {
    if (tool !== "paint") return [];
    const p = editor.paint;
    const swatch = p === null ? "#d6d6d6" : p.kind === "color" ? `rgb(${Math.round(p.color[0] * 255)}, ${Math.round(p.color[1] * 255)}, ${Math.round(p.color[2] * 255)})` : `center / cover url(${textureUrl(p.bytes, p.mimeType)})`;
    const H = editor.toolHandler("paint") as { eyedropper?: boolean } | undefined;
    return [
      { id: "paintPick", label: p === null ? "默认" : p.name, swatch, title: "当前材质（点开换）", onClick: () => { toggleMatSheet(true); } },
      { id: "eyedropper", label: "吸色", active: !!H?.eyedropper, title: "吸色：点一张面读它的材质（Ctrl / Alt 按住 = 临时）", onClick: () => { if (H) H.eyedropper = !H.eyedropper; } },
    ];
  },
  actions: (tool) => {
    if (tool === "axes") return [{ id: "axesReset", label: "重置坐标架", title: "最外层 = 回到世界；组里 = 回到外面那层的；组件里 = 回到组件原点", onClick: () => { menuPick("axesReset"); } }, ...(editor.hasSelection() ? [{ id: "axesToSel", label: "移到选择中心", title: "坐标架原点移到选区的中心（之后右下角可换算法）", onClick: () => { editor.axesToSelectionCenter(); syncUi(); } }] : []), ...(editor.inComponentRoot() ? [{ id: "axesToOrigin", label: "设为组件原点", title: "把组件原点对到现在的坐标架（几何反挪、每份实例补，世界里不动；一步撤销）", onClick: () => { editor.setComponentOriginToFrame(); syncUi(); } }] : [])];   // DT86 user「比起被记住的开关我建议是一个可以随手按一下的按钮」   // user 2026-10-25「轴的context菜单里面没有移动到选择。这个blender里面我天天用」
    if (tool === "tape" || tool === "protractor" || tool === "compass") return [{ id: "guidesClear", label: "删除所有参考几何", disabled: !editor.hasGuides(), onClick: () => { menuPick("guidesClear"); } }];
    if (tool === "transform") {   // 临时变换中心（user 2026-10-26「变换的时候右下角有一个pick pivot选项，然后你可以pick, 用对齐引擎，以及可能的grid」）
      const H = editor.toolHandler("transform") as { picking?: boolean; hasTempPivot?: boolean; startPickPivot?(): void; clearPivot?(): void } | undefined;
      if (!H || !editor.hasSelection()) return [];
      return [
        { id: "pickPivot", label: H.picking ? "点一下定变换中心…" : H.hasTempPivot ? "重选变换中心" : "选变换中心", active: !!H.picking, title: "拾一个临时变换中心（吸附照常、网格开着也吸格点）；转 / 缩都绕它，换选区就作废", onClick: () => { H.startPickPivot?.(); syncUi(); editor.draw(); } },
        ...(H.hasTempPivot ? [{ id: "clearPivot", label: "清除临时变换中心", onClick: () => { H.clearPivot?.(); syncUi(); editor.draw(); } }] : []),
      ];
    }
    return [];
  },
  // 选区动作：笔 / 手指路由才进条（鼠标走右键菜单，#19 的路由不变）；有选区、不在手势中
  selection: () => (selectionRoute(lastPointerType) === "bar" && editor.hasSelection() && !editor.isGestureActive() ? selectionActions(hud) : []),
  pickSelection: (id) => { hud.pick(id as never); },
  afterRender: () => { vcbRef?.render(); },   // 上下文选项住在参数小窗里（user 2026-10-25「参数小窗就是上下文选项条，全搬进去」）
});
const vcb = mountVcb(document.getElementById("vcb") as HTMLElement, editor);
vcbRef = vcb;
// eslint-disable-next-line no-var
var lastPointerType = "mouse";
// eslint-disable-next-line no-var
var vcbRef: { render(): void } | null = null;   // var：上下文条 mount 时就回调 afterRender（参数小窗那时还没挂）   // var：上下文条的 selection provider 在 mount 时就读它（加载期）
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
  // 只看这个（DT44，user 2026-10-25「然后左上角的hierarchy tree可以切换只看该组件」）：外面的藏起来（不画、不吸、点不中），再点放回来
  if (crumbs.length > 1) {
    const t = document.createElement("button"); t.type = "button";
    t.className = "crumb-toggle" + (editor.isolate ? " on" : "");
    t.textContent = "只看这个"; t.setAttribute("aria-pressed", String(editor.isolate));
    t.title = editor.isolate ? "外面的藏起来了：点一下放回来" : "把这个组 / 组件外面的都藏起来（不画、不吸附、点不中）";
    t.addEventListener("click", () => { editor.setIsolate(!editor.isolate); renderCrumbs(); });
    crumbsEl.appendChild(t);
  }
}
// 网格芯片（0.11 ⑤；user「如果 active 的话就显示，点开可以调设置或者关。不 active 就收进…」）：网格开着才露出，点开 = 格距 / 细分 / 关
type GridMenuId = `preset:${GridPreset}` | `step:${number}` | `plane:${string}` | "sub:5" | "sub:10" | "off" | "on" | `lock:${"x" | "y" | "z" | "none"}` | `plock:${"x" | "y" | "z"}`;
/** 格距怎么念：按制式自带的单位（D&D 的 5 ft 不念成 1.524 m），不跟 vcbUnit。 */
const fmtGridStep = (step: number, preset: GridPreset): string => fmtVcbLength(step, gridPreset(preset).unit);
/** 左上编辑模式下拉框（硬表面建模 / 表面；以后 + 有机体建模）。 */
function renderModeSelect(): void {
  modeField?.refresh();
}
/** 视图汉堡「栅格」页（user 2026-10-25「先把右下收到右上汉堡里」：右下角栅格芯片撤了，栅格设置只住这一处）：吸附开关 + 制式 / 格距 / 栅格面 / 细分。 */
function gridTabItems(): { id: GridMenuId | MenuId; label: string; checked?: boolean; hint?: string; separatorBefore?: boolean; sectionBefore?: string; tab: string; choices?: { id: GridMenuId; label: string; hint?: string; checked?: boolean }[] }[] {
  const g = editor.grid, steps = gridStepsFor(g.preset);
  return [
    { id: "grid" as MenuId, label: "栅格吸附", checked: g.on, tab: "grid", hint: g.on ? `${gridPreset(g.preset).label} · ${fmtGridStep(g.step, g.preset)} · 1/${g.subdiv}` : "关" },
    // 单选组一组一行下拉（user 2026-10-25「能下拉框的就做」）：名字 + 当前值 ▾，点开旁边一层
    { id: "preset:si" as GridMenuId, label: "制式", tab: "grid", choices: GRID_PRESETS.map((p) => ({ id: `preset:${p.id}` as GridMenuId, label: p.label, checked: g.preset === p.id, ...(p.id === "dnd" ? { hint: "5 ft 一格 · 1/5 = 1 ft" } : p.id === "architectural" ? { hint: "SketchUp 建筑模板那套" } : {}) })) },   // 制式 ≠ 长度单位（user 10-24「这两个分开来」）
    { id: `step:${steps[0]}` as GridMenuId, label: "格距", tab: "grid", choices: steps.map((st) => ({ id: `step:${st}` as GridMenuId, label: fmtGridStep(st, g.preset), checked: Math.abs(g.step - st) < 1e-9 })) },
    { id: "plane:xy" as GridMenuId, label: "栅格面", tab: "grid", choices: GRID_PLANES.map((p) => ({ id: `plane:${p.id}` as GridMenuId, label: p.label, checked: g.plane === p.id, hint: p.id === "xy" ? "画平面" : "画立面：空处落点也在这面上" })) },
    { id: "sub:5" as GridMenuId, label: "吸附细分", tab: "grid", choices: [
      { id: "sub:5" as GridMenuId, label: "1/5", checked: g.subdiv === 5, hint: "仪表盘式" },
      { id: "sub:10" as GridMenuId, label: "1/10", checked: g.subdiv === 10, hint: "尺子式" },
    ] },
  ];
}
/** 吸附钮的菜单（右键 / 长按）：锁 + 跳到视图汉堡的「栅格」页。栅格设置不在这里重复一份。 */
function snapMenuItems(): { id: GridMenuId | "gridSettings"; label: string; checked?: boolean; hint?: string; separatorBefore?: boolean; sectionBefore?: string }[] {
  return [...lockMenuItems(), { id: "gridSettings", label: "栅格设置…", separatorBefore: true, hint: "视图 ☰ · 栅格" }];
}
/** 锁的菜单段（按当前工具的锁种：沿轴走的工具 = 方向锁 + 面锁；先定平面的工具 = 只有面锁；不吃锁 = 不出这段）。键位提示 = 方向键。 */
function lockMenuItems(): { id: GridMenuId; label: string; checked?: boolean; hint?: string; sectionBefore?: string; separatorBefore?: boolean }[] {
  const style = editor.lockStyle(), a = editor.axisLock, p = editor.planeLock, none = a === null && p === null;
  if (style === "plane") return [
    { id: "lock:none", label: "不锁", checked: none, sectionBefore: "面锁（矩形 / 圆 / 弧 / 旋转）", hint: "↓" },
    { id: "plock:x", label: "面锁 YZ", checked: p === "x", hint: "→" },
    { id: "plock:y", label: "面锁 XZ", checked: p === "y", hint: "←" },
    { id: "plock:z", label: "面锁 XY", checked: p === "z", hint: "↑" },
  ];
  if (style === "axis") return [
    { id: "lock:none", label: "不锁", checked: none, sectionBefore: "方向锁 / 面锁（画线 / 移动 / 卷尺）", hint: "↓" },
    { id: "lock:x", label: "方向锁 X", checked: a === "x", hint: "→" },
    { id: "lock:y", label: "方向锁 Y", checked: a === "y", hint: "←" },
    { id: "lock:z", label: "方向锁 Z", checked: a === "z", hint: "↑" },
    { id: "plock:x", label: "面锁 YZ", checked: p === "x", hint: "Shift+→", separatorBefore: true },
    { id: "plock:y", label: "面锁 XZ", checked: p === "y", hint: "Shift+←" },
    { id: "plock:z", label: "面锁 XY", checked: p === "z", hint: "Shift+↑" },
  ];
  return [];
}
const isGridId = (id: string): id is GridMenuId => /^(preset|step|plane|sub|lock|plock):/.test(id) || id === "on" || id === "off";
function onGridPick(id: GridMenuId): "keep" | void {
    if (id.startsWith("lock:")) { const a = id.slice(5); editor.setAxisLock(a === "none" ? null : (a as "x" | "y" | "z")); syncUi(); return "keep"; }
    if (id.startsWith("plock:")) { editor.setPlaneLock(id.slice(6) as "x" | "y" | "z"); syncUi(); return "keep"; }
    if (id === "on") { editor.setGrid({ on: true }); syncUi(); return "keep"; }

    if (id === "off") { editor.setGrid({ on: false }); syncUi(); return; }
    if (id.startsWith("preset:")) { const preset = id.slice(7) as GridPreset; editor.setGrid({ preset, step: nearestGridStep(editor.grid.step, preset) }); }
    else if (id.startsWith("plane:")) editor.setGrid({ plane: id.slice(6) as GridPlane });
    else if (id === "sub:5" || id === "sub:10") editor.setGrid({ subdiv: id === "sub:5" ? 5 : 10 });
    else editor.setGrid({ step: Number(id.slice(5)) });
    return "keep";
}
function syncUi(): void {
  renderSnapWidget();
  ensureScaleLadder();   // B43：选了参考项就（空闲时）拉数据
  renderModeSelect();
  renderSlots();
  renderCrumbs();
  if (!shopEl.hidden) renderShop();
  toolStrip.render();
  vcb.render();
  btnUndo.disabled = !editor.canUndo();
  btnRedo.disabled = !editor.canRedo();

  vr?.invalidatePanel();
}

// ---------- 帮助 ----------
const helpEl = $("helpSheet");   // 不能叫 help：图标 sprite 里有 <symbol id="help">（守卫 test/page-ids.test.ts）
let helpRendered = false;
function toggleHelp(on: boolean): void {
  if (on && !helpRendered) {   // 使用手册 = readme-docs.ts 各节（md-lite 渲染，抄 WeebPaint readme-panel）
    helpRendered = true;
    $("helpBody").innerHTML = README_SECTIONS.map((sec) => `<section id="help-${sec.id}"><h3>${escapeHtml(sec.title)}</h3>${renderMdLite(sec.body)}</section>`).join("");
  }
  helpEl.hidden = !on;
}
$("helpClose").addEventListener("click", () => toggleHelp(false));
helpEl.addEventListener("click", (e) => { if (e.target === helpEl) toggleHelp(false); });

// ---------- 材质面板（油漆桶蘸什么）：家族色库 pull 的色板 + 导入图片 + 默认灰 ----------
const matSheet = $("matSheet");
const matGrid = $("matGrid");
const matImageInput = $<HTMLInputElement>("matImage");
/** 贴图字节 → object URL（按字节对象缓存，免得每次刷新上下文条都漏一个 URL）。 */
const _texUrls = new WeakMap<Uint8Array, string>();
const textureUrl = (bytes: Uint8Array, mime: string): string => { let u = _texUrls.get(bytes); if (!u) { u = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime })); _texUrls.set(bytes, u); } return u; };
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

// ---------- 导入外来 glb（T11 / DT2）：节点树原样变成组件；打开照旧拒 ----------
const glbImportInput = $<HTMLInputElement>("glbImportFile");
glbImportInput.addEventListener("change", async () => {
  const file = glbImportInput.files?.[0];
  glbImportInput.value = "";
  if (!file) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isForeignGlb(bytes)) { notify({ text: `「${file.name}」是 CatsUp 自己的模型，请用「打开」`, level: "warning" }); return; }
    const data = readForeignGlb(bytes, file.name.replace(/\.glb$/i, ""));
    const t0 = performance.now();
    const r = editor.importForeign(data);
    note("import", `${file.name}: ${data.nodes.length} nodes, ${data.meshes.length} meshes, ${Math.round(performance.now() - t0)} ms`);
    if (!r.ok) { notify({ text: `导入失败：${r.reason}`, level: "error" }); return; }
    editor.zoomExtents();
    const c = r.cast, parts = [`${r.instances} 个组件`, `${c.triangles - c.degenerate - c.duplicate - c.rejected} 个三角面`];
    if (c.repaired) parts.push(`${c.repaired} 个有毛病的三角面已切好`);
    if (c.rejected) parts.push(`${c.rejected} 个坏三角面没导进来`);
    if (c.degenerate || c.duplicate) parts.push(`丢掉 ${c.degenerate + c.duplicate} 个退化 / 重复的`);
    if (r.empties) parts.push(`${r.empties} 个空节点（画成小三轴）`);
    notify({ text: `导入 ${file.name}：${parts.join("，")}${data.losses.length ? `。没带进来：${data.losses.join("、")}` : ""}`, level: c.rejected ? "warning" : "info" });
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
const viewGizmo = mountViewGizmo($("viewGizmo"), editor, { isWalking: () => locomotion.isWalking(), onProjection: () => syncUi() });
// 右上角「视图」菜单（user 2026-10-24「视图时是归右上角的汉堡管」）：透视 / 线稿 / 网格 / 单位 / 步行 / 飞行 / VR
const viewMenuBtn = document.createElement("button");
viewMenuBtn.type = "button"; viewMenuBtn.className = "gizmo-btn gizmo-menu"; viewMenuBtn.title = "视图"; viewMenuBtn.innerHTML = iconHtml("menu");
($("viewGizmo").querySelector(".gizmo-top") as HTMLElement).appendChild(viewMenuBtn);
// ---------- B43 尺度参考：数据懒加载 + 视图 ☰「参考」页 ----------
let ladder: Ladder | null = null;
let ladderTimer = 0;
// eslint-disable-next-line no-var
var viewMenuHandle: { refresh(): void; isOpen(): boolean } | null = null;   // var：加载回来时刷新开着的菜单
/** 拉梯子数据（279 KB / gzip 58 KB）：选了参考项才拉；开机时等 1.5 s 再拉（启动优先），用户点了参考页 / 选了一项 = 立刻拉。 */
function ensureScaleLadder(now = false): void {
  if (ladder || !editor.scaleRefs.length && !now) return;
  if (!now) { if (!ladderTimer) ladderTimer = window.setTimeout(() => ensureScaleLadder(true), 1500); return; }
  loadLadder().then((L) => { ladder = L; editor.setScaleLadder(L); if (viewMenuHandle?.isOpen()) viewMenuHandle.refresh(); })
    .catch((e) => { note("scale", `size ladder load failed: ${(e as Error).message}`); });
}
type RefMenuId = `ref:${string}` | `refmax:${number}`;
const isRefId = (id: string): id is RefMenuId => id.startsWith("ref:") || id.startsWith("refmax:");
/** 选单的选项（下拉多选用）：按题材分组；ALL 那一项就叫题材名（数据 v3 起的名字），只有一项的题材收进「其他」。 */
function refOptions(L: Ladder): ChoiceOption[] {
  const themes = new Map<string, Ladder["menu"]>();
  for (const m of L.menu) { const t = themes.get(m.theme) ?? []; t.push(m); themes.set(m.theme, t); }
  const head = (m: Ladder["menu"][number]): string => m.names.zh.split(" · ")[0];
  const multi: ChoiceOption[] = [], single: ChoiceOption[] = [];
  for (const [, ms] of themes) {
    if (ms.length === 1) { single.push({ id: ms[0].id, label: head(ms[0]), group: "其他" }); continue; }
    for (const m of ms) multi.push({ id: m.id, label: m.view === "ALL" ? head(m) : m.names.zh.split(" · ").slice(1).join(" · "), group: head(m) });
  }
  return [...multi, ...single];
}
/** 「参考」页（选单只有一个、多选取并集——user「要不还是不如多重订阅吧，不然不同的室内室外会组合烦死」）：
 *  一行「看哪些」= 下拉多选（user「所以我们需要一个下拉多选的ux模块哦。而不是几百个选项浪费面板空间」）+「最多几条」+ 新手提醒。 */
function refTabItems(): { id: RefMenuId; label: string; checked?: boolean; hint?: string; tab: string; sectionBefore?: string; separatorBefore?: boolean; choices?: { id: RefMenuId; label: string; checked?: boolean }[]; value?: string; note?: boolean }[] {
  const tab = "ref", cur = editor.scaleRefs;
  const L = ladder;
  if (!L) { ensureScaleLadder(true); return [{ id: "ref:none", label: "参考数据加载中…", note: true, tab, sectionBefore: "尺度参考" }]; }
  const opts = refOptions(L), label = (id: string): string => { const o = opts.find((x) => x.id === id); return o ? (o.group && o.group !== "其他" && o.label !== o.group ? `${o.group} · ${o.label}` : o.label) : id; };
  const out: ReturnType<typeof refTabItems> = [{ id: "ref:pick", label: "看哪些", value: multiSummary(cur.map(label)), tab, sectionBefore: "尺度参考" }];
  out.push({ id: "refmax:3", label: "最多", tab, sectionBefore: "试用（这台设备记住）", choices: SCALE_TIP_MAX.map((n) => ({ id: `refmax:${n}` as RefMenuId, label: `${n} 条`, checked: scaleMax === n })) });
  const notes = remindersFor(L, cur);
  if (cur.some((x) => x.endsWith("/DND"))) notes.push({ id: "srd", text: "DnD 规则数据出自 SRD 5.1（Wizards of the Coast，CC BY 4.0）。" });   // 署名：仓鼠的 dnd 提醒写了版本没写许可
  notes.forEach((n, i) => out.push({ id: "ref:none", label: n.text, note: true, tab, ...(i === 0 ? { sectionBefore: "新手提醒" } : {}) }));
  return out;
}
function onRefPick(id: RefMenuId): "keep" {
  if (id.startsWith("refmax:")) { scaleMax = Number(id.slice(7)); PREF.set("scaleMax", String(scaleMax)); return "keep"; }
  if (id === "ref:pick" && ladder) {
    const L = ladder, anchor = document.querySelector<HTMLElement>('.popup-menu .menu-item[data-menu-id="ref:pick"]');
    if (anchor) openMultiSelect({
      anchor, ariaLabel: "看哪些参考", options: () => refOptions(L), values: () => editor.scaleRefs,
      onToggle: (x) => { editor.toggleScaleRef(x); ensureScaleLadder(true); viewMenuHandle?.refresh(); },
      onClear: () => { editor.clearScaleRefs(); viewMenuHandle?.refresh(); }, clearLabel: "全部取消（不显示）",
    });
  }
  return "keep";
}
/** 视图汉堡分页（user 2026-10-25「汉堡分页，这个汉堡转管视口，以后渲染方案也它管，专管viewer」）：显示 / 栅格 / 参考 / 相机；以后渲染方案也进来。
 *  「参考」页 = 参考窗（屏幕上的参考图 / 文字 / 视频，user 2026-10-25「这个算视图，应该放右边汉堡」）+ B43 尺度参考。 */
const VIEW_MENU_TABS = [
  { id: "display", label: "显示" },
  { id: "grid", label: "栅格" },
  { id: "ref", label: "参考" },
  { id: "camera", label: "相机" },
] as const;
type ViewTab = (typeof VIEW_MENU_TABS)[number]["id"];
function openViewMenu(tab?: ViewTab): void {
  const opts = {
    anchor: viewMenuBtn, align: "end" as const, tabs: VIEW_MENU_TABS, tabKey: "view", tab,
    items: () => [
      { id: "persp" as MenuId, label: "透视", checked: editor.cam.projection === "persp", disabled: locomotion.isWalking(), tab: "display" },
      { id: "xray" as MenuId, label: "X 光", checked: editor.xray, hint: "Alt+Z：选择工具点得到被挡住的点 / 边，边透过面画出来", tab: "display" },   // DT17 拾取 + 叠加层（半透明留 Tron 纪元）
      ((): { id: MenuId; label: string; icon: string; hint: string; disabled: boolean; tab: string } => { const c = editor.hiddenCount(), n = c.instances + c.faces + c.edges; return { id: "unhideAll", label: n ? `全部显示（${n}）` : "全部显示", icon: "visibility-show", hint: "Alt+H", disabled: !n, tab: "display" }; })(),   // DT49
      // 单选组一组一行下拉（user 2026-10-25「线稿粗细，单位都做成下拉框，整个汉堡目录排查一下，能下拉框的就做」）
      { id: "lw:pick" as MenuId, label: "线稿粗细", tab: "display", choices: LINE_WEIGHTS.map((w) => ({ id: `lw:${w}` as MenuId, label: w === 1 ? "1 px（原生细线）" : `${w} px`, checked: editor.lineWeight === w, hint: w === 1 ? "最快，不分轮廓" : "轮廓 / 悬空边加粗" })) },   // 设备像素
      { id: "unit:pick" as MenuId, label: "单位", tab: "display", choices: LENGTH_UNITS.map((u) => ({ id: `unit:${u.id}` as MenuId, label: u.label, checked: editor.vcbUnit === u.id })) },
      ...gridTabItems(),
      { id: "refwin" as MenuId, label: "参考窗", checked: refHost.isOpen(), hint: refHost.count() ? `${refHost.count()} 张` : "图片 · 文字 · 视频", tab: "ref" },
      ...refTabItems(),
      { id: "walk" as MenuId, label: "步行相机", hint: "WASD · 空格跳", checked: locomotion.isWalking(), tab: "camera" },
      { id: "noclip" as MenuId, label: "穿墙飞行", hint: "双击空格切换", checked: locomotion.noclip, disabled: !locomotion.isWalking(), tab: "camera" },
      ...(vr.isSupported() ? [
        { id: "vr" as MenuId, label: vr.isPresenting() ? "退出 VR" : "进入 VR", icon: "hand", sectionBefore: "VR", hint: "Quest", tab: "camera" },
        { id: "lefthand" as MenuId, label: "VR 左手持笔", checked: leftHanded, hint: "面板换到右手", tab: "camera" },
      ] : []),
    ],
    onPick: (id: MenuId | GridMenuId | RefMenuId): void | "keep" => { if (isRefId(id)) return onRefPick(id); if (isGridId(id)) { onGridPick(id); return "keep"; } const r = menuPick(id as MenuId); syncUi(); return r; },
  };
  viewMenuHandle = tab ? openPopupMenu<MenuId | GridMenuId | RefMenuId>(opts) : togglePopupMenu<MenuId | GridMenuId | RefMenuId>(opts);
}
viewMenuBtn.addEventListener("click", () => openViewMenu());
void viewGizmo;
// 视图侧挂件条（user 2026-10-24「以后视图侧会有很多挂件。snap只是其中第一个」）：gizmo 下面一列；第一个 = 吸附——点一下开 / 关栅格吸附，
// 右键 / 长按 = 菜单（方向锁、制式、栅格面、格距、细分）；钮角标 = 当前方向锁。
const widgets = document.createElement("div"); widgets.className = "gizmo-btns gizmo-widgets"; $("viewGizmo").appendChild(widgets);
const snapBtn = document.createElement("button"); snapBtn.type = "button"; snapBtn.className = "gizmo-btn gizmo-snap"; snapBtn.title = "栅格吸附（点一下开 / 关；右键或长按 = 方向锁 / 面锁、栅格设置）";
snapBtn.innerHTML = iconHtml("snap-grid") + '<span class="gizmo-badge" hidden></span><span class="gizmo-snaplock"></span>';   // 锁 = 这是「吸附」不是「显示栅格」（user「吸附的话得图标加一个锁」）：开着锁上、关着打开
widgets.appendChild(snapBtn);
snapBtnRef = snapBtn;
const openSnapMenu = (): void => { togglePopupMenu<GridMenuId | "gridSettings">({ anchor: snapBtn, align: "end", items: snapMenuItems, onPick: (id) => { if (id === "gridSettings") { openViewMenu("grid"); return; } return onGridPick(id); } }); };
let snapPress: { t: number; fired: boolean } | null = null;
snapBtn.addEventListener("pointerdown", () => { const press = { t: window.setTimeout(() => { press.fired = true; openSnapMenu(); }, 450), fired: false }; snapPress = press; });
const snapPressEnd = (): void => { if (snapPress) window.clearTimeout(snapPress.t); };
snapBtn.addEventListener("pointerup", snapPressEnd); snapBtn.addEventListener("pointercancel", snapPressEnd); snapBtn.addEventListener("pointerleave", snapPressEnd);
snapBtn.addEventListener("click", () => { if (snapPress?.fired) { snapPress = null; return; } snapPress = null; editor.setGrid({ on: !editor.grid.on }); syncUi(); });
snapBtn.addEventListener("contextmenu", (ev) => { ev.preventDefault(); snapPressEnd(); openSnapMenu(); });
// var（提升）而不是 const：editor 的 host.changed → syncUi 可能在本段执行之前就被叫到（加载过程），那时挂件还没建，跳过即可
// eslint-disable-next-line no-var
var snapBtnRef: HTMLButtonElement | undefined;
function renderSnapWidget(): void {
  const btn = snapBtnRef;
  if (!btn) return;
  btn.classList.toggle("on", editor.grid.on);
  const lk = btn.querySelector(".gizmo-snaplock") as HTMLElement, want = editor.grid.on ? "lock" : "unlock";
  if (lk.dataset.icon !== want) { lk.dataset.icon = want; lk.innerHTML = iconHtml(want); }
  const badge = btn.querySelector(".gizmo-badge") as HTMLElement;
  const a = editor.axisLock, p = editor.planeLock, axis = a ?? (p === "face" ? null : p);
  badge.hidden = !a && !p; badge.textContent = a ? a.toUpperCase() : p ? planeLockLabel(p) : ""; badge.dataset.axis = axis ?? "";
}
window.addEventListener("keyup", (ev) => { if (ev.key === "Shift") editor.setShiftHeld(false); });   // DT51：松开 Shift = 格点吸附回到右上锁钮的状态
window.addEventListener("blur", () => editor.setShiftHeld(false));
window.addEventListener("keydown", (ev) => {
  const target = ev.target as HTMLElement | null;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
  if (refHost.hasFocus()) return;   // 参考窗有焦点：空格 / ← → 归它（视频播放、逐帧、翻页），工具快捷键让路
  if (vcb.feedKey(ev)) { ev.preventDefault(); return; }
  if (ev.key === "Enter" && editor.mirrorActive()) { ev.preventDefault(); editor.pressParam("apply"); syncUi(); return; }   // 镜像会话：回车 = 应用（Esc = 取消走 editor.cancel）   // 数值小窗：数字开头直接进小窗（SU 同款），字母只在缓冲非空时进
  if (ev.key === "Shift") editor.setShiftHeld(true);   // DT51：按住 Shift = 格点吸附反过来，指针不动也立刻换规则
  if (ev.key === "Tab" && ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {   // Shift+Tab = 开 / 关格点吸附（Blender 同键；user 待定，备选 N）
    ev.preventDefault();
    editor.setGrid({ on: !editor.grid.on });
    hintEl.textContent = editor.grid.on ? "格点吸附：开（格点 · 整格长度 · 15°；按住 Shift 临时关）" : "格点吸附：关（按住 Shift 临时开）";
    syncUi(); return;
  }
  // 自由建模的 Blender 键位（user 10-27「然后能不能blender 快捷键无缝接上」；硬表面照旧 SketchUp 键位）：
  // G / R / S / E = 有选区就从光标处起手移动 / 旋转 / 缩放 / 挤出（跟着鼠标走、点一下落定、Esc / 右键取消；没选区 = 切到那把工具），手势中 X / Y / Z 锁轴（Shift = 锁面）；
  // A 全选、X / Delete 删除、J 连线（两个点）、K 切割、Ctrl+R 环切（下一下点边）。移动工具本身 = Blender 的 tweak（按下就拖），G 是键盘起手的另一回事。
  if (editor.modeId === "freeform" && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !locomotion.isWalking()) {
    const k = ev.key.toLowerCase();
    if (editor.isGestureActive() && (k === "x" || k === "y" || k === "z")) { ev.preventDefault(); editor.lockKey(k, ev.shiftKey); syncUi(); return; }
    const modal: Record<string, Tool> = { g: "move", r: "rotate", s: "scale", e: "pp", i: "offset" };   // I = 插入（Blender I）
    if (modal[k] && !ev.shiftKey) { ev.preventDefault(); if (!editor.startModal(modal[k])) editor.setTool(modal[k]); syncUi(); return; }
    if (k === "a" && !ev.shiftKey) { ev.preventDefault(); editor.selectAll(); syncUi(); return; }
    if (k === "x" && !ev.shiftKey) { ev.preventDefault(); if (editor.hasSelection()) editor.deleteSelection(); syncUi(); return; }
    if (k === "j" && !ev.shiftKey) { ev.preventDefault(); editor.runAction("mesh.connect"); syncUi(); return; }
  }
  if (editor.modeId === "freeform" && (ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.code === "KeyR") { ev.preventDefault(); editor.armLoopCut(); syncUi(); return; }   // Blender Ctrl+R（浏览器的刷新被拦下）
  if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    // SU 对齐（user 2026-09-02：默认对齐 SU，确实不爽再挪；WASD 留给未来 fly cam）
    // 步行模式（0.4）：空格=跳、E=上升 归 player；选择/橡皮另有双模式通用键 Tab / X
    const map: Record<string, Tool> = { " ": "select", l: "line", r: "rect", c: "circle", a: "arc", m: "move", q: "rotate", s: "scale", p: "pp", k: "knife", f: "offset", w: "followme", b: "paint", e: "erase", t: "tape", tab: "select", x: "erase" };
    const key = ev.key.toLowerCase();
    const t = map[key];
    const takenByWalk = locomotion.isWalking() && (key === " " || key === "e" || key === "s" || key === "q" || key === "a" || key === "t");
    if (t && !takenByWalk) {
      ev.preventDefault();
      // 同一个键再按一下 = 在这个工具组里换下一把（user 2026-10-25「快捷键在工具组里怎么循环：同一个键再按一下」）：
      // E 橡皮 → 焊边 → 软边；R 矩形 → 旋转矩形；T 卷尺 → 量角器 → 轴；A 弧的四种画法轮换（画法是工具选项）。不在组里 = 照旧切过去。
      const cyc = KEY_CYCLES[key];
      if (cyc && cyc.includes(editor.tool)) { const next = cyc[(cyc.indexOf(editor.tool) + 1) % cyc.length]; if (editor.modeTools().includes(next)) { editor.setTool(next); return; } }
      if (key === "a" && editor.tool === "arc") { const modes: string[] = ARC_MODES.map((m) => m.id), cur = editor.config.get("arc", "mode") as string; const nx = modes[(modes.indexOf(cur) + 1) % modes.length]; editor.config.set("arc", "mode", nx); hintEl.textContent = `弧：${ARC_MODES.find((m) => m.id === nx)?.label ?? nx}（再按 A 换下一种）`; syncUi(); return; }
      editor.setTool(t); return;
    }
    if (key === "g") { ev.preventDefault(); if (editor.hasGeometrySelection() || editor.hasPoolSelection()) editor.makeComponent(`组件 ${editor.sceneRef.defs.size}`); return; }   // SU：G = 建组件（选中的组 / 组件一起装进去）
    if (key === "h" && !locomotion.isWalking()) { ev.preventDefault(); if (editor.hasHideableSelection()) editor.hideSelection(); return; }   // Blender：H = 隐藏选中（DT49）
    if (key === "z" && ev.shiftKey) { ev.preventDefault(); editor.zoomExtents(); return; }   // SU：Shift+Z = 缩放到全部
    if (key === ".") { ev.preventDefault(); editor.zoomTo(); return; }   // Blender 小键盘 .：缩放到选区（再按 = 当前物体 → 全部，同右上放大镜）；数值框没在打数字时才到这（vcb.ts）
  }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "a" || ev.key === "A")) { ev.preventDefault(); editor.selectAll(); return; }   // Ctrl+A 全选（A7）
  if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.code === "KeyI") { ev.preventDefault(); editor.invertSelection(); return; }   // Blender：Ctrl+I 反选（2026-10-26）
  if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.code === "KeyA") { ev.preventDefault(); editor.deselectAll(); return; }   // Blender：Alt+A 全不选（用 code：Mac 上 Alt+A 打出的是别的字）
  if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.code === "KeyH") { ev.preventDefault(); editor.unhideAll(); return; }
  if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.code === "KeyZ") { ev.preventDefault(); editor.setXray(!editor.xray); return; }   // Blender：Alt+Z = X 光（DT17）   // Blender：Alt+H = 全部显示（DT49；用 code：Mac 上 Alt+H 打出的是别的字）
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "g" || ev.key === "G")) { ev.preventDefault(); if (ev.shiftKey) editor.explodeSelection(); else editor.makeGroup(); return; }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "z" || ev.key === "Z")) {
    ev.preventDefault();
    if (ev.shiftKey) editor.redo(); else editor.undo();
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "y" || ev.key === "Y")) { ev.preventDefault(); editor.redo(); return; }
  if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && (ev.key === "ArrowRight" || ev.key === "ArrowLeft" || ev.key === "ArrowUp" || ev.key === "ArrowDown") && !locomotion.isWalking()) {
    // A9（SU 同款）：→ X 红、← Y 绿、↑ Z 蓝、↓ 解锁；同一个键再按 = 解锁。Shift+方向键 = 面锁（Blender Shift+X 语义：Shift+→ YZ / Shift+← XZ / Shift+↑ XY / Shift+↓ 光标下的面）。
    // 先定平面的工具（矩形 / 圆 / 弧 / 旋转 / 量角器）不分 Shift：方向键就是锁平面。分派在 editor.lockKey。
    ev.preventDefault();
    editor.lockKey(ev.key === "ArrowDown" ? null : ev.key === "ArrowRight" ? "x" : ev.key === "ArrowLeft" ? "y" : "z", ev.shiftKey);
    syncUi(); return;
  }
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
buildEl.textContent = `${APP_VERSION.replace(/-\d{4}-\d{2}-\d{2}$/, "")}${pwa.isDevRoute ? " dev" : ""}`;   // 页面左下角一行：v0.14.x（+ dev），完整的（带日期）在 title
buildEl.title = `${APP_VERSION}${pwa.isDevRoute ? " · dev" : ""}`;
if (new URLSearchParams(location.search).has("reset")) notify({ text: `已清缓存重启 · ${APP_VERSION}`, level: "info" });

// ---------- 探针钩子（scripts/probe-boot.mjs 用；不是 API） ----------
// ---------- 转正纪元（2026-09-20）：文档生命周期 + 图库 + 云端 ----------
initSheets();
initDebugLogSheet();
lastStepProvider = () => editor.lastStep();
setLastStepProvider(lastStepProvider);
// smart save 钮（三条杠下面；对齐 WeebPaint save-status + smartSaveAndPush；user 2026-09-20「title 意义不明可以不要，三条杠下面加一个 smart save button」）
const btnSave = $<HTMLButtonElement>("btnSave");
const finalBadge = $<HTMLElement>("finalBadge");
// 编辑模式下拉（几何 / 表面）：下拉标准件，不用原生 <select>（user 2026-10-24「不要用ios自带的。丑」）
// eslint-disable-next-line no-var
var modeField: SelectField | undefined = mountSelectField($("modeSelect"), { items: () => editor.modes().map((m) => ({ value: m.id, label: m.label })), value: () => editor.modeId, onChange: (v) => editor.setMode(v as ModeId), ariaLabel: "编辑模式" });
const btnSaveIcon = document.getElementById("btnSaveIcon") as unknown as SVGUseElement;
const SAVE_ICON: Record<ReturnType<Session["saveState"]>, string> = { none: "floppy-disk", dirty: "floppy-disk", "local-only": "floppy-disk", saving: "cloud-upload", "cloud-off": "floppy-disk", unpushed: "cloud-pending", synced: "cloud-synced" };
function updateSaveStatus(): void {
  { const f = session.finalRecord(); finalBadge.hidden = !f; if (f) finalBadge.textContent = `定稿 ${f.rev}`; document.body.classList.toggle("doc-final", editor.locked); }   // 护栏 ①：定稿着 → 工具区灰掉
  syncAttentionBanner();   // 2026-10-26：和云端没对上 → 横幅在 / 对上了 → 横幅走
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
// 参考窗（@internal/reference-window；接缝 = reference-host.ts）：牌组跟文件走，Session 管存 / 脏
const refHost = createReferenceHost({
  info: (text) => notify({ text, level: "info" }),
  error: (text) => { note("ref", "✗ " + text); notify({ text, level: "error" }); },
  topFloor: () => 8,
  defaultRect: () => {   // 第一次开：右边、gizmo 那一列下面（左边是工具，别压左柱）
    const g = $("viewGizmo").getBoundingClientRect(), w = Math.min(300, window.innerWidth - 32), h = Math.min(340, Math.max(160, window.innerHeight - g.bottom - 80));
    return { left: Math.max(8, window.innerWidth - w - 12), top: Math.max(96, Math.round(g.bottom + 8)), width: w, height: h };
  },
  askImport: async (q) => {
    const mb = (q.bytes / 1024 / 1024).toFixed(1);
    const keep = { label: "存进模型", value: "keep" as const }, ram = { label: "只放内存（不存进模型）", value: "ram" as const };
    const v = await openChoiceSheet(`「${q.name}」有 ${mb} MB`, q.suggestRam ? "存进模型会让文件变大、同步变慢。只放内存 = 这次用，下次打开是个空位，把同一个文件拖回来就补上。" : "存进模型会让文件变大、同步变慢。", q.suggestRam ? [{ ...ram, primary: true }, keep] : [{ ...keep, primary: true }, ram]);
    return v ?? "cancel";
  },
  onCards: () => session.noteChange(),
  focusCanvas: () => { (document.activeElement as HTMLElement | null)?.blur?.(); },
});
const session = new Session({
  editor,
  refs: refHost,
  captureThumbnail: () => captureThumbnail(editor),
  onHomeChanged: updateSaveStatus,
  setStatus: (text, error) => { note("doc", (error ? "✗ " : "") + text); notify({ text, level: error ? "error" : "info" }); },
  online: () => navigator.onLine !== false,
});
configureTabMemory({ get: (k) => session.menuTab(k), set: (k, t) => session.setMenuTab(k, t) });   // 两个 ☰ 停在哪页跟着文件走（WeebPaint desk.menuTab 同款）
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
  offloadDoc: (n) => session.offloadDoc(n),
  flushLocal: () => session.flushLocal(),
  setStatus: (text, error) => { note("gallery", (error ? "✗ " : "") + text); notify({ text, level: error ? "error" : "info" }); },
  onFolderChanged: (dir) => { session.currentDir = dir; },
  onOpened: () => { wireStore(); Session.persistOnGesture(); session.slateGalleryOpened(); },   // 回执条：停在图库（有意状态 → 下次开机回图库）
  onClosed: () => { session.slateGalleryClosed(); (document.activeElement as HTMLElement | null)?.blur?.(); editor.resize(window.devicePixelRatio || 1); },   // 图库按钮别留着焦点吃快捷键
});
$("galleryBack").addEventListener("click", () => galleryHost.close());
$("galleryNew").addEventListener("click", () => { void session.newDoc().then((ok) => { if (ok) galleryHost.close(); }); });
// 搁置区两箱（gallery 0.5.0：回收站 = 删掉的；备份箱 = 冲突面里被换下的那一版）。清空钮在包的视图里（0.8.6），宿主只切视图 + 露「回到图库」条。
const showAside = (view: "trash" | "backup"): void => { galleryHost.setView(view); $("galleryTrashBar").hidden = false; };
$("galleryTrashBtn").addEventListener("click", () => showAside("trash"));
// 图库页 ☰（F-81；WeebPaint 图库菜单同款，回收站从顶栏收进来）。与文件无关的几项；动作借主菜单的 menuPick
type GalleryMenuId = "trash" | "backup" | "help" | "debuglog" | "update";
$("galleryMenuBtn").addEventListener("click", () => togglePopupMenu<GalleryMenuId>({
  anchor: $("galleryMenuBtn"),
  items: () => [
    { id: "trash", label: "回收站", icon: "restore-trash" },
    { id: "backup", label: "备份箱", icon: "restore-trash", hint: "冲突里换下的那版" },
    { id: "help", label: "使用手册", icon: "help", separatorBefore: true },
    { id: "debuglog", label: "调试日志", icon: "wrench", hint: "复制给开发者" },
    { id: "update", label: "强制更新", icon: "refresh", hint: APP_VERSION.replace(/-\d{4}-\d{2}-\d{2}$/, "") },
  ],
  onPick: (id) => { if (id === "trash" || id === "backup") { showAside(id); return; } return menuPick(id); },
}));
$("galleryTrashBack").addEventListener("click", () => { galleryHost.setView("files"); $("galleryTrashBar").hidden = true; });
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
// ---- 云可达之后的一串（登录落地 / 回线）：① 开着的模型干净快进 → ② 补离线上传队列 → ③「问一次」把只在本机的模型推上去 ----
//   ③ = 家族 10-21 标准（JRB 0.2.20 / WeebPaint v0.14.42 / WXHW v2.3.52 / MoonSinger v0.14.6），CatsUp 2026-10-25 user「好，同意……但是必须护栏冲突」。
//   护栏在库里（store files.dirty.pushAll）：每个文件单独推、带 If-Match；撞上云端新版本 / 撞名 / 网络 → **那个文件留在本机、名字进 failed，不弹面、不覆盖**；
//   人去图库点它的「处理…」（file.resolve 三选一）或再保存一次走正常冲突面。这里只做三件：问一次、如实报失败名单、绝不替人选边。
//   ② 以前 CatsUp 从没调过 drainOfflineQueue（offlineUploadReplay:"ask" 的 confirmReplay 永远不会响）——顺手接上，JRB 同序。
//   顺序串行 + 单飞：refreshOpenDoc 拉字节时会上 busy 遮罩，sheet 在遮罩下打开会 throw（sheets.ts 死锁护栏），所以等它先完。
let afterCloudReachableInFlight: Promise<void> | null = null;
let askedPushLocalOnly = false;   // 每次打开 app 最多问一次（不惊扰）；点「传」或「先不」都算问过；被跳过（遮罩 / 别的 sheet 开着）不算
function afterCloudReachable(reason: "signin" | "online"): Promise<void> {
  if (afterCloudReachableInFlight) return afterCloudReachableInFlight;
  afterCloudReachableInFlight = (async () => {
    try {
      await session.refreshOpenDoc();
      if (!hasStore() || !auth.isSignedIn() || navigator.onLine === false) return;
      await requireStore().files.drainOfflineQueue().catch((e) => funnel(e, "log"));
      await offerPushLocalOnly(reason);
    } finally { afterCloudReachableInFlight = null; }
  })();
  return afterCloudReachableInFlight;
}
/** 2026-10-26 改（user「列表面」；家族根 ai-docs/20261026-cloud-conflict-ux-postmortem.md §5 C1）：10-21 的「问一次 → pushAll」是 / 否框撤了——
 *  它说「只在这台设备上」对「传过、后来改了没传」是假话，批量传完失败只剩一条没有按钮的 toast（user「弹了一个需要处理然后就什么交互都没了」）。
 *  现在：有没同步好的 → 一条带「去处理」钮的常驻通知 → 开图库进「要处理的」视图（gallery 0.8.8：顶部横幅 + 每张卡一粒可见的「处理…」，点了当场弹库的三选一面）。
 *  不自动盖住正在画的东西（家族 zen：别把人踢出去）；图库已经开着就直接切过去。每次打开 app 最多提一次。
 *  不再自己批量推：没同步好的每一份都由人在面里选用哪边。force = dev 探针（test/probes/probe-push-ask.mjs）跳过「已登录」前置。 */
async function offerPushLocalOnly(reason: string, force = false): Promise<void> {
  if (!force && (askedPushLocalOnly || !hasStore() || !auth.isSignedIn() || navigator.onLine === false)) return;
  const files = requireStore().files;
  const n = await files.dirty.count().catch((e) => { funnel(e, "log"); return 0; });
  if (n <= 0) return;
  askedPushLocalOnly = true;
  note("sync", `unsynced models after ${reason}: ${n} → notice`);
  if (galleryHost.isOpen()) galleryHost.setAttentionOnly(true);
  notify({
    id: "unsynced", level: "warning", timeoutMs: null,
    text: `有 ${n} 个模型没同步好（只在这台设备上，或改了还没传上去）。到图库里逐个「处理…」，每一个都会问你用云端的还是这台的。`,
    actions: [{ label: "去处理", primary: true, onClick: () => { closeNotice("unsynced"); void galleryHost.openAttention(); } }],
  });
  updateSaveStatus();
}
// ---- 编辑器横幅：正在编辑的这份和云端没对上（自动保存撞上，库想弹面，被 store-ui conflictGate 挡成横幅）→ 一条常驻通知 + 「处理…」钮 = 人主动叫面 ----
//   user 2026-10-26「不弹模态，横幅 + 钮」。冲突照样 surface（MASTER §A），只是不在画画半路打断；显式保存仍会弹面。
const ATTENTION_ID = "sync-attention";
function attentionText(cloudState: string | null): string {
  const n = session.displayName();
  if (cloudState === "absent" || cloudState === "never") return `「${n}」云端那份没了，这台的改动还没传上去——要你选：传回去，还是跟云端把这份收进回收站`;
  if (cloudState === "unchanged") return `「${n}」的改动还没传上去（云端没变）——点「处理…」`;
  return `「${n}」在云端有另一版新改动，这台的改动也没传上去——要你选用哪边（输的那版会留底）`;
}
function syncAttentionBanner(): void {
  const a = session.attention;
  if (!a || session.home.kind !== "gallery") { closeNotice(ATTENTION_ID); return; }
  notify({ id: ATTENTION_ID, level: "warning", timeoutMs: null, text: attentionText(a.cloudState),
    actions: [{ label: "处理…", primary: true, onClick: () => { void session.resolveActive().then(() => syncAttentionBanner()).catch((e) => funnel(e, "warning")); } }] });
}
conflictGate.onDeferred = ({ cloudState }) => { session.markAttention(cloudState); };
auth.onAuthChanged((st) => {
  note("auth", `changed signedIn=${st.signedIn} reason=${st.reason ?? "-"} probing=${!!st.probing} account=${acct(st.account)}`);
  updateCloudChip(); updateSaveStatus();
  if (st.signedIn) void afterCloudReachable("signin");   // 登录落地（boot 静默 / redirect 回程 / 续签）→ 快进 → 补队列 → 问一次
  if (galleryHost.isOpen()) galleryHost.refresh();
});
window.addEventListener("online", () => { updateSaveStatus(); void afterCloudReachable("online"); }); window.addEventListener("offline", updateSaveStatus);
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
    openGallery: async () => { hideCanvasTip(); session.beginLazyBlank(); await galleryHost.open(); },   // 覆盖层底下要有画布：lazyblank 垫底
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
  // 还原出厂收尾（factory-reset.ts；家规 2½）：上一页清不掉的库（被本页开着的连接占住：缩略图 / 崩溃影子）在这里、在任何人开它们之前再删一遍。
  if (hasFactoryResetMarker()) await finishFactoryResetAtBoot((msg, error) => notify({ text: msg, level: error ? "error" : "info" }));
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

(window as unknown as { __catsup: unknown }).__catsup = { perf, editor, locomotion, vr, hud, session, galleryHost, refs: refHost, crash: crashStore, store: () => (hasStore() ? requireStore() : null), version: APP_VERSION, factoryReset: () => { menuPick("factoryReset"); }, devPushAsk: () => offerPushLocalOnly("probe", true), debugLog: { toText: debugLogText, entries: debugLogEntries, open: openDebugLogSheet } };

// ---------- 起 ----------
editor.setTool("line");
hintEl.textContent = hintDefault();
resize();
