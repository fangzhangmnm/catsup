// main.ts —— app 壳接线：工具条 / 顶栏 / 菜单 / 状态行 / 调试日志 sheet / OBJ 逃生口 / PWA 更新 toast / 文档生命周期 boot 编排。
// created 2026-09-06 by Claude Fable 5.1（0.3 app 壳纪元开工：user「离开 lab 变成一个 prototypical 但是正经的东西…先做无地骑士，
// 无 store 无导入导出…去掉那些很 lab 的东西，好好做 ui，可以留一个 gltf 或者 obj 的 io 逃生口」）
// 0.5 转正纪元起：文档生命周期 = src/app/session.ts（三态家）+ @internal/store 单一接缝 + @internal/gallery；OBJ 只剩逃生口。
// v0.5.7（2026-09-22，Claude Fable 5.1）：boot 改用包的 restoreLastSession（回执条三态编排）+ **本地恢复先于 initAuth**（零网络秒开）
//   + 登录 / 回线 / 回前台显式快进 + 崩溃安全 flush 三件；审计 = ai-docs/20260922-lifecycle-alignment-with-weebpaint.md。

import { mountSelectField, type SelectField } from "./ui/select-field.ts";
import { ERASERS, BRUSHES } from "../editor/tool-ids.ts";
import { planeLockLabel } from "../editor/locks.ts";
import { snapSwitchName } from "../editor/grid-state.ts";
import { PICK_KINDS, pickAfter, pickSay, type PickKind, type PickSet } from "../controller/pick-kinds.ts";
import { type Ladder, loadLadder, remindersFor } from "../editor/scale-ref.ts";
import { SCALE_TIP_MAX, scaleTipHtml } from "./scale-tip.ts";
import { type ChoiceOption, multiSummary, openMultiSelect } from "./ui/choice-layer.ts";
import { ARC_MODES } from "../editor/arc-build.ts";
import { APP_VERSION } from "../version.ts";
import { downloadName } from "../config.ts";
import { mountContextBar } from "./context-bar.ts";
import { mountVcb } from "./vcb.ts";
import { perf } from "../editor/perf-stats.ts";
import { LENGTH_UNITS, fmtVcbLength, type LengthUnit } from "../editor/units.ts";
import { openSelectionMenu, openContextMenuAt } from "./context-menu.ts";
import { barItems, selectionRoute } from "./selection-actions.ts";
import { openObjectWindow } from "./object-window.ts";
import { mountWorkBar } from "./ui/work-bar.ts";
import { mountMfd } from "./mfd.ts";
import { stanceShown } from "../controller/chips.ts";
import { selectModeFor } from "../editor/tool-config.ts";
import { railFace } from "../controller/rail-face.ts";
import { mountSoftSlider, stepRadius, type SoftSlider } from "./soft-slider.ts";
import { mountLeftDial } from "./left-dial.ts";
import { mountSelGrowBar, type SelGrowBar } from "./sel-grow-bar.ts";
import { RAIL_FIXED_FLYOUTS, RAIL_FIXED_FOLD, MENU_ROWS, MENU_TABS, RAIL_FIRST, RAIL_FIXED, RAIL_GROUPS, RAIL_LABELS, SHAPES } from "../controller/placement.ts";
import { MACHINES, openMachineWindow, refreshMachineBoard, type Machine } from "./machine-window.ts";
import { boardAsDrawer, closeBoard } from "./ui/command-board.ts";
import { mountViewGizmo } from "./view-gizmo.ts";
import { deviceKvGet, deviceKvSet, migrateLegacyUiPrefs } from "./device-kv.ts";
import { Session, bareName, supportsOpenPicker, supportsSavePicker } from "./session.ts";
import { createReferenceHost } from "./reference-host.ts";
import { restoreLastSession, readSlate, setRestoreAttempt, type RestoreOutcome } from "@internal/gallery";
// 口令（2026-10-29 周账 F-123）：政策 crypto-state / 验证器 / 设备记住；面板注入在下面 setPasswordPrompt；解锁循环 unlock.ts
import { setPasswordPrompt, setPassword, getPassword, lock as lockPasswords, isUnlocked, onLockChange, type PromptOpts } from "../crypto-state.ts";
import { appEncryption, passwordKeeper } from "../encryption.ts";
import { hasVerifier, checkVerifier } from "../password-verifier.ts";
import { wireRememberPassword, restoreRemembered, forgetRemembered, rememberedUntil, rememberChoice, setRememberChoice, rememberAvailable, onRememberChange } from "../remember-password.ts";
import { ensureUnlocked, ensureNewPassword, isFreshPasswordSetup, rollbackFreshPassword, unlockImportedContainer } from "./unlock.ts";
import { verifierReady } from "../app-store.ts";
import { initGalleryHost } from "./gallery-host.ts";
import { runFactoryReset, finishFactoryResetAtBoot, hasFactoryResetMarker } from "./factory-reset.ts";
import { auth, ensureStore, hasStore, requireStore } from "../app-store.ts";
import { captureThumbnail } from "./thumbnail.ts";
import { initSheets, openChoiceSheet, openConfirmSheet, openFormSheet, openPasswordSheet, isBusyActive } from "./ui/sheets.ts";
import { reportError as funnel } from "./error-funnel.ts";
import { Editor, GRID_PLANES, GRID_PRESETS, GRID_SUBDIVS, TOOLS, gridPreset, gridStepsFor, isGridSubdiv, nearestGridStep, type Tool, type GridPlane, type GridPreset } from "../editor/editor.ts";
import type { CommandId } from "../editor/commands/command.ts";
import type { ModeId } from "../editor/mode.ts";
import { Renderer3 } from "../minccino/providers/three/render3.ts";   // 画的供货商：app 层挑、编辑器只持契约（刀 f）
import { PRESETS, PRESET_IDS, isPresetId, SCREENS, SCREEN_IDS, isScreenId, type Preset, type MarkAccent } from "../minccino/index.ts";   // 风格（Tron 纪元：预设 = 数据）
import { makeBudgetWatch } from "./budget-notice.ts";
import { KEYS_TABLE, README_SECTIONS } from "./readme-docs.ts";
import { escapeHtml, renderMdLite } from "./ui/md-lite.ts";
import { PALETTE_ZH } from "./palette.ts";
import { faceTriangles } from "../editor/face-triangles.ts";
import { exportObj } from "../editor/obj-io.ts";
import { readForeignObj } from "../format/obj-import.ts";
import { type ImportScene, isForeignGlb, readForeignGlb } from "../format/gltf-import.ts";
import { attachGestures } from "./gestures.ts";
import { Locomotion } from "./locomotion.ts";
import { TOOL_CYCLES, chordLabel, keyDocs, modifierChords, resolveKey, toolKeyText, type KeyContext, type KeyEvt } from "../controller/keymap.ts";
import { stanceOf } from "../controller/stance.ts";
import { RAIL_FLYOUT_PRESS_MS, MOD_PEEK_MS } from "../controller/feel.ts";
import { type AvatarSpec, AVATAR_DEFAULT, STATURE_MAX, STATURE_MIN, jumpReach, resolveAvatar } from "../player/body.ts";
import { formatQuantity } from "../editor/units.ts";
import { TouchControls } from "./touch-controls.ts";
import type { ParamFieldDef, ParamSession } from "../editor/param-panel.ts";
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
import { PRIMITIVES, type PrimitiveKind } from "../mesh/ops/primitives.ts";

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
/** 选中色（视口设置，按设备记）：跟画风 = 线稿 / 剪纸蓝、写实 / 铸铜 / 像素描边红（user 10-29「纸 线稿是蓝 写实和铜和像素是红」）；
 *  1-bit / Tron 的标记色是画风本身的一部分，不被它覆盖。和将删 / 检查撞色的选项自己带让开的颜色（将删在蓝的画风里是红、在红的画风里是橙）。 */
const ACCENTS: readonly { id: string; label: string; accent: MarkAccent | null; hint?: string }[] = [
  { id: "auto", label: "跟画风", accent: null, hint: "线稿 / 剪纸蓝，写实 / 铸铜 / 像素红；1-bit / Tron 用自己的" },
  { id: "blue", label: "蓝", accent: { selected: 0x2b6cb0, scrub: 0xcc3333, warn: 0xd97706 } },
  { id: "red", label: "红", accent: { selected: 0xd8323a, scrub: 0xf08a00, warn: 0x8b5cf6 }, hint: "将删换成橙、检查换成紫" },
  { id: "orange", label: "橙", accent: { selected: 0xe8760a, warn: 0x8b5cf6 }, hint: "检查换成紫" },
  { id: "green", label: "绿", accent: { selected: 0x2e8b57 } },
];
// B43 尺度参考：最多几条（这台设备记住；user「有一个最多条目数」）。样式只剩字的深浅（user「要不不要图像，就字的深淡」）
let lastTipHtml = "";
let tipSize = { w: 0, h: 0 };
let scaleMax: number = (SCALE_TIP_MAX as readonly number[]).includes(Number(PREF.get("scaleMax"))) ? Number(PREF.get("scaleMax")) : 3;
let leftHanded = PREF.get("leftHanded") === "1";   // VR：左手持笔（工具手/面板手对调）
/** 线稿粗细（设备像素）：存过就用存的；没存过 → 高 DPI（iPad / Retina）默认 1.5，否则 1（原生）。user 10-24「ipad上面细线稿是不舒服…有1.5这种选项吗」 */
/** 线稿粗细（设备像素）：视图 ☰ 那行 sunset 了（T88 user「线稿粗细sunset，先按我们调好的当默认，以后跟着风格设定走」）= 调好的默认：高 DPI 1.5、其余 1；像素化的风格自己锁 1 px（T103）。 */
const lineWeightInit = (): number => (window.devicePixelRatio >= 2 ? 1.5 : 1);

// ---------- DOM ----------
const canvas = $<HTMLCanvasElement>("board");
// 键名芯片（MFD）的实时状态：放在最前面——syncUi 在开机过程里随时可能重画芯片（const / let 在声明行之前读 = 抛错）。
/** 现在按着的修饰键（键名芯片亮哪枚；下面 keydown / keyup 写）。 */
const heldMods = { shift: false, ctrl: false, alt: false };
/** 正按在画布上的指针（拖着没松 = 芯片不出「取消」：松手本身就是决定）。 */
const canvasPresses = new Set<number>();
/** 键名芯片锁住的修饰键（没键盘时 Shift / Ctrl / Alt = 开关；user 10-28 晚「ipad上面shift反而变成toggle」）。换工具 / 换工作台就放开（不许有看不见的状态改行为）。 */
const latchedMods = { shift: false, ctrl: false, alt: false };
let latchFor = "";
const stage = $("stage");
const hintEl = $("hint");
const tipEl = $("tip");
/** 盖上图库（或别的整屏覆盖层）前收掉画布上的光标提示 / 悬停（user 10-26：回图库之后读数框还挂在左上角——从菜单进图库指针没「离开画布」，画线中途离开也不清）。 */
function hideCanvasTip(): void { tipEl.hidden = true; lastTipHtml = ""; editor.pointerLeave(); }
const workBar = mountWorkBar();
const marqueeEl = $("marquee"), lassoEl = document.getElementById("lasso") as unknown as SVGSVGElement & { hidden: boolean };
const toolbarEl = $("toolbar");
const readoutEl = $("readout");
/** 右下读数（面积 / 长 / 手势尺寸）先关（user 2026-10-25「面积和长可以先不显示……右边把小窗位置都让出来」）；尺寸仍在光标旁的小提示和参数小窗的数值里。 */
const READOUT_ON = false;
const buildEl = $("build");

const HINT_DEFAULT = "";   // 左下角默认不再列快捷键（user 2026-10-25「左下角的那行快捷键早应该删掉了」）；只在真有提示时显示，快捷键在使用手册里
const HINT_WALK = "步行：WASD 走 · Shift 冲刺 · 空格 跳（双击=飞行开关）· Ctrl 蹲下 / 起来 · Tab 停下来修 · Q/E 下/上 · ←→ 转身 · 右键拖=看 · T 按住瞄准瞬移（↑↓ 力度 ←→ 落地朝向）· G 回上一点 ｜ 工具 L R M P · 选择 Tab · 橡皮 X";
const HINT_VR = "VR：左摇杆走（按下冲刺）· 右摇杆 ←→ 转身 · 前推瞄准瞬移（左摇杆 ↑↓ 力度 ←→ 落地朝向）· 后拉回上一点 · A 跳（双击=飞行开关）B 蹲 · 扳机画 · 手腕面板选工具 · X/Y 撤销重做";
const HINT_PLACE = "步行：点一下落在哪（绿 = 站得下、红 = 站不下）· 身材在右下改 · Esc 取消";
const HINT_EDIT = "原地编辑：镜头钉在这里，工具照常用（右键拖 = 原地转头）· 上方「继续走」回去 · Esc 离开步行";
const HINT_WALK_TOUCH = "步行：左边按住拖 = 走（推出圈外 = 跑）· 右边拖 = 看 · 跳 / 蹲 · 上面「原地编辑」「离开」";
const HINT_LOCKED = "锁着：只能看、转、进去走；☰「解锁」才能改";   // 演示锁（周账 F-124）：锁着时的常驻提示；工具指针被挡在手势路由（toolBlocked）时也说这句
const hintDefault = (): string => (vr?.isPresenting() ? HINT_VR : locomotion?.isPlacing() ? HINT_PLACE : locomotion?.isEditInPlace() ? HINT_EDIT : locomotion?.isWalking() ? (TouchControls.available() ? HINT_WALK_TOUCH : `${HINT_WALK} · Tab 原地编辑 · Esc 离开`) : editor?.locked ? HINT_LOCKED : HINT_DEFAULT);

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
  softRing: (c) => softSliderRef?.ring(c),   // 软选择的半径圈（app/soft-slider.ts）
  selGrowBar: (at) => selGrowRef?.show(at),   // 扩 / 缩选区的拖动条（app/sel-grow-bar.ts）
  lasso: (pts) => {   // 套索轨迹：SVG 盖在画布上（坐标 = 画布本地 CSS px）
    if (!pts) { lassoEl.hidden = true; return; }
    const b = canvas.getBoundingClientRect();
    lassoEl.hidden = false;
    Object.assign(lassoEl.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    lassoEl.querySelector("polygon")!.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
  },
  working: (label) => { if (label === null) { workBar.hide(); return; } return workBar.show(label); },   // 要等的大活：顶边细进度条（UX7）
  changed: () => { syncUi(); _session?.noteChange(); },   // 同步：首笔安家在 commit 的同一调用栈里翻旗（WeebPaint wp:histchange 同形）
  error: (err, where) => reportError(where === "commit" ? "提交" : "预演", err),
  readout: (text) => { readoutEl.textContent = text; readoutEl.hidden = !READOUT_ON || !text; },   // 右下血槽位（A28）；10-25 先不显示（READOUT_ON）
}, new Renderer3(canvas, perf));

// ---------- 工具条 ----------
// 工具表只有 id / 图标 / 名字：键名不手抄——提示 / 小三角 / 手腕面板读 controller/keymap.ts toolKeyText（按工作台、按真按键现算；user 10-28 晚「tooltip你没有更新，这背后有什么架构问题」）。守卫 test/tool-tips.test.ts。
const TOOL_SPEC: { tool: Tool; icon: string; label: string }[] = [
  { tool: "select", icon: "select", label: "选择" },
  { tool: "line", icon: "line", label: "画线" },
  { tool: "rect", icon: "rectangle", label: "矩形" },
  { tool: "crect", icon: "rectangle", label: "中心矩形" },   // user 10-27「中心矩形能单独做一个工具吗」；图标 = stopgap（图标库 TODO 已登记 rectangle-center）
  { tool: "rrect", icon: "rotated-rectangle", label: "旋转矩形" },   // SU Rotated Rectangle（user 10-24）；图标 = 图标库 PENDING 层自画未过目
  { tool: "circle", icon: "circle", label: "圆" },
  { tool: "arc", icon: "arc", label: "弧" },
  { tool: "move", icon: "move", label: "移动" },
  { tool: "rotate", icon: "rotate", label: "旋转" },
  { tool: "scale", icon: "scale-uniform", label: "缩放" },   // 2026-10-26 恢复（user「box也需要……先留着move rotate scale，transform做单独的，就是恢复之前的scale」）
  { tool: "transform", icon: "free-transform", label: "变换" },   // 箭头 + 环 + 缩放块 + 变换中心（2026-10-26；专用图标在图标库待办，先用 free-transform；快捷键暂不占）
  { tool: "pp", icon: "push-pull", label: "推拉" },
  { tool: "offset", icon: "selection-expand", label: "偏移" },   // 图标 = stopgap（图标库 TODO 已登记 offset）
  { tool: "followme", icon: "move-to-folder", label: "跟随" },   // 图标 = stopgap（图标库 TODO 已登记 follow-me）
  { tool: "paint", icon: "paint-bucket", label: "油漆桶" },
  { tool: "erase", icon: "eraser", label: "橡皮" },
  { tool: "weldErase", icon: "eraser-weld", label: "焊边橡皮" },   // 橡皮家族（user 10-24）；图标 = 图标库 PENDING 层自画未过目
  { tool: "softErase", icon: "eraser-soft", label: "软边橡皮" },   // 同上
  { tool: "tape", icon: "dimensions", label: "卷尺" },   // 0.11 尺规；图标 = stopgap（图标库 TODO 已登记 tape-measure）
  { tool: "axes", icon: "axes", label: "坐标架" },           // 0.11 尺规：三下定帧（原点 / X / Y）；SU 无默认键
  { tool: "protractor", icon: "protractor", label: "量角器" },
  { tool: "compass", icon: "compass", label: "圆规" },
  { tool: "knife", icon: "knife", label: "切割" },
  { tool: "walk", icon: "walk", label: "步行" },
  { tool: "create", icon: "new", label: "拉出" },   // 自由建模的新建（FM182；2026-10-28 Opus 5.5）：图标 = stopgap 加号（图标库 TODO 已登记 primitive-add）；快捷键 Shift+A（键表自由建模层；user 10-28 晚「Shift+A 同意」）   // 「验证」工作台第一格（2026-10-28；图标 = 图标库 PENDING 自画未过目）；平时没有键进步行（user「按什么都不会去步行，得开」）
  { tool: "shrink", icon: "push-pull", label: "沿法线" },
  // 软编辑笔刷（2026-10-29 Opus 5.5，账本 UX53）：抓 / 抹平借 WeebPaint 的 liquify / blur，鼓起 / 压平 = 图标库待过目层自画
  { tool: "brushGrab", icon: "liquify", label: "抓" }, { tool: "brushDraw", icon: "brush-inflate", label: "鼓起" }, { tool: "brushSmooth", icon: "blur", label: "抹平" }, { tool: "brushFlatten", icon: "brush-flatten", label: "压平" },   // 自由建模：Blender Shrink / Fatten（Alt+S；user 习惯 Alt+W 也认）；不进左柱   // 自由建模的切割 + 环切（2026-10-27 Opus 5.5；user「刀应该叫切割」「小刀图标」）；图标 = 图标库 PENDING 层自画、未过目   // DT50 圆规 / 球规（工具条「画：圆 / 球」）；没有快捷键、不进 T 的轮换（尺规 2.0 §0 user「收到...里面当玩具」）；图标 = 图标库 PENDING 层自画未过目
];
// HUD 数据模型：桌面 DOM 工具栏与 VR 手腕面板消费同一份（A13 第 6 条）
const hud: HudModel = {
  version: APP_VERSION,
  tools: (): HudItem[] => TOOL_SPEC.map((t0) => { const t = specOf(t0.tool); return { id: t.tool, label: t.label, icon: t.icon, key: t.key, active: editor.tool === t.tool }; }),
  edits: (): HudItem[] => { const brepOnly = editor.activeKind() !== "brep";   // 网格体的池：SU 体的动词先不露（自由建模工作台的同名动词 = M4），露了点不动 = 误导
    return [
    { id: "undo", label: "撤销", icon: "arrow-undo", disabled: !editor.canUndo() },
    { id: "redo", label: "重做", icon: "arrow-redo", disabled: !editor.canRedo() },
    { id: "delete", layer: "geometry", label: "删除", icon: "trash-can", danger: true, hidden: !editor.hasSelection() },   // 网格体的点 / 边 / 面也能删了（v0.15.22）
    { id: "group", layer: "geometry", label: "建组", icon: "collection", hidden: brepOnly || (!editor.hasGeometrySelection() && !editor.hasPoolSelection()) },   // 选了组 / 组件也能建（装进去，2026-10-26 嵌套）
    { id: "component", layer: "geometry", label: "建组件", icon: "object", hidden: !editor.canMakeComponent() },   // 网格体里 = 选中的面做成嵌在这一层的组件（v0.16.37）
    // 物件层动词（炸开 / 合并 / 做成唯一 / 锁 / 解锁 / 藏 / 应用缩放）= 注册表物件族（editor/objects/verbs.ts）放在 objectMenu 面上的动作：一份实现、按单位种类路由、每个工作台自动都有（只能退订）
    ...editor.commandMenu("objectMenu").map((m): HudItem => ({ id: `action:${m.id}`, layer: "child", label: m.label, icon: m.icon })),
    { id: "explodeGroups", layer: "child", label: "炸开组", icon: "explode-folder", hidden: !editor.hasGroupSelection() },   // 组 = 硬表面的分区，不是物件：手写
    { id: "mirror", layer: "geometry", label: "镜像…", icon: "flip-horizontal", hidden: brepOnly || !editor.hasSelection() || editor.mirrorActive() },   // DT23（user 2026-10-25「你选中，右键mirror之后……」）
    { id: "weld", layer: "geometry", label: "焊接", icon: "arc", hidden: !editor.canWeldSelection() },   // B19：边链 → 一条曲线（图标 = stopgap，图标库 TODO 已登记 weld）
    { id: "explodeCurve", layer: "geometry", label: "炸开曲线", icon: "explode-folder", hidden: !editor.hasCurveSelection() },
    { id: "cut", layer: "geometry", label: "剪切", icon: "cut", hidden: !editor.hasSelection() },   // 剪贴板（设计稿 20261028-object-layer-and-clipboard-design §3）：几何 + 组 + 物件都走它；层级移动 = 剪切 → 走到那层 → 粘贴
    { id: "copy", layer: "geometry", label: "拷贝", icon: "copy", hidden: !editor.hasSelection() },
    { id: "paste", layer: "empty", label: "粘贴（原位）", icon: "paste", hidden: !editor.canPaste() },
    { id: "enter", layer: "child", label: "进入编辑", icon: "selection-expand", hidden: !editor.hasPoolSelection() },
    { id: "hideGeometry", layer: "geometry", label: "隐藏", icon: "visibility-hide", hidden: brepOnly || !(editor.hasGeometrySelection() || editor.hasGroupSelection()) },   // 几何 / 组的藏（硬表面）；物件的藏在上面的注册表行
    { id: "componentOrigin", layer: "child", label: "改组件原点…", icon: "axes", hidden: !editor.canEditComponentOrigin() },   // DT86：物体的指令（SU 右键「更改轴」、Blender「设置原点」）；user「专门入口同意，赞。这样小白能找到」
    // 修复指令（DT85）：有选区 = 选中的、没选 = 整个物体；含子物体默认开（数字按现在的范围算）。新指令不进 ☰（user 10-26「以后这些指令不住汉堡，等攒多了我帮他们找家」）
    { id: "repairPanel", layer: "self", label: "修复…", icon: "wrench", hidden: editor.repairPanelOpen() || !editor.repairWorth() },   // T6 / DT6 + DT9：修复面板（几步一起跑 = 一步撤销）+「检查」高亮微折软边
    // 各个修复模块自己的入口（src/editor/repairs/ 清单；user 10-26「做成可以扔的模块化的」）：拉正 / 吸到格点 / 焊断口 / 拍平 / 软边变硬 / 恢复层级…
    // 镜像（网格体的「对称」属性）2026-10-28 搬进物体窗口（object-window.ts）；硬表面的「镜像…」是一次性指令，留在几何层
    ...editor.commandMenu().map((m): HudItem => ({ id: `action:${m.id}`, layer: "geometry", label: m.label, icon: m.icon, ...(m.submenu ? { submenu: m.submenu } : {}) })),   // 注册表 contextBar 面上的动作（修复九条 + 物体族的两条转换）
    { id: "exit", layer: "empty", label: "退出一层", icon: "back", hidden: editor.contextDepth() === 0 },
    { id: "soften", layer: "geometry", label: "软化选区", icon: "blur", hidden: brepOnly || !editor.hasGeometrySelection() },
    { id: "harden", layer: "geometry", label: "硬化选区", icon: "sharpen", hidden: brepOnly || !editor.hasGeometrySelection() },
    { id: "connected", layer: "geometry", label: "选择连通体", icon: "select", hidden: !editor.hasGeometrySelection() && !editor.hasPointSelection() },
    { id: "loop", layer: "geometry", label: "选成环 / 洞", icon: "select", hidden: !editor.hasMeshEdgeSelection() },   // 触屏没有 Alt：选中的边扩成环 / 洞（桌面 = Alt 点边；user 10-28「alt 点边可以选择洞还是环」）
    { id: "invert", layer: "geometry", label: "反选", icon: "selection-invert", hidden: !editor.hasSelection() },   // Blender Ctrl+I（user 10-26「我们现在选择有shift之类的多选，反选吗」）
    { id: "deselect", layer: "geometry", label: "取消选择", icon: "x", hidden: !editor.hasSelection() },
    // 右键新建（FM120）：刚右键过就露（落点 = 右键那一点，吸点 / 面 / 原点 / 地面）；网格体里 = 长进这个网格体，别处 = 新的网格体组件。图标暂用 object（图标库没有基本体的图标）
    ...(Object.keys(PRIMITIVES) as PrimitiveKind[]).map((k): HudItem => { const n = PRIMITIVES[k].label; return { id: `new:${k}`, layer: "empty", label: `新建${n}`, icon: "object", hidden: !editor.contextNewAllowed(), submenu: { label: "新建", item: n } }; }),   // 右键菜单里收进「新建 ›」子菜单（user 10-27「新建能不能收到一个子菜单里面」）   // user 2026-10-24「有东西选择的时候应该永远有取消选择的上下文胶囊」
  ]; },
  vr: (): HudItem[] => [
    { id: "noclip", label: locomotion.noclip ? "飞行中" : "穿墙飞行", active: locomotion.noclip },
    { id: "respawn", label: "回出生点" },
    { id: "exitvr", label: "退出 VR", danger: true },
  ],
  status: () => hintEl.textContent ?? "",
  pick: (id) => {
    if (id === "paint" && editor.tool === "paint") { toggleMatSheet(matSheet.hidden); return; }   // 油漆桶已选中再点 = 材质面板（WeebPaint 画笔再点开面板同款；材质钮撤了）
    if (id === "walk") { pickWalk(); return; }   // 验证工作台的「步行」：放置 → FPS（原地编辑里再点 = 继续走）
    if ((TOOLS as readonly string[]).includes(id)) { if (locomotion.isPlacing()) locomotion.cancelPlace(); editor.setTool(id as Tool); return; }
    if (id.startsWith("action:")) { editor.runAction(id.slice("action:".length)); return; }
    if (id.startsWith("new:")) { editor.addPrimitive(id.slice(4) as PrimitiveKind); syncUi(); return; }
    if (id === "objectWindow") { openObjectWindow(editor, hud, "children", objectBtn, { after: syncUi, openMachine: (m) => openMachineBoard(m, objectBtn) }, "start"); return; }   // 子组件物体菜单 / 浮条的「物体设置…」：窗口的家 = 右边物体钮
    switch (id) {
      case "undo": editor.undo(); break;
      case "redo": editor.redo(); break;
      case "delete": editor.deleteSelection(); break;
      case "cut": editor.cutSelection(); break;
      case "copy": editor.copySelection(); break;
      case "paste": editor.pasteClipboard(); break;
      case "deselect": editor.cancel(); break;
      case "group": editor.makeGroup(); break;
      case "component": editor.makeComponent(`组件 ${editor.sceneRef.defs.size}`); break;
      case "explodeGroups": editor.explodeGroups(); break;
      case "mirror": editor.beginMirror(); break;
      case "weld": editor.weldSelection(); break;
      case "explodeCurve": editor.explodeCurveSelection(); break;
      case "enter": editor.enterSelected(); break;
      case "hideGeometry": editor.hideSelection(); break;
      case "componentOrigin": editor.beginComponentOrigin(); syncUi(); break;
      case "repairPanel": editor.beginRepairPanel(); break;
      case "exit": editor.exitContext(); break;
      case "soften": { const n = editor.softenSelection(true); notify({ text: n ? `软化了 ${n} 条边（soft + smooth）` : "选区里没有两膜之间的边", level: "info" }); break; }
      case "harden": { const n = editor.softenSelection(false); notify({ text: n ? `硬化了 ${n} 条边` : "选区里没有两膜之间的边", level: "info" }); break; }
      case "connected": editor.selectConnected(); break;
      case "loop": editor.selectLoopsOfSelection(); break;
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
/** 橡皮格：橡皮 / 焊边橡皮 / 软边橡皮，显示当前那把，小三角换（ERASERS 的 SSoT 在 tool-ids.ts）。 */
let eraserCurrent: Tool = "erase";
/** 定死一列里小三角组各自最近用的那把（组的第一把 → 当前）。 */
const fixedFlyCurrent = new Map<Tool, Tool>();
/** 定死一列下面折叠组里这次会话用过的（按最近使用；存组头 = 小三角组的第一把）；开局空 = 只有「…」。 */
const foldUsed = new Map<string, Tool[]>();
// 哪把工具进哪一组 / 预算 / 工作台定死的一列 / 改名 = 放置表 src/controller/placement.ts（接线清单第 1 条）；这里只按表画
const specOf = (t: Tool) => { const sp = TOOL_SPEC.find((x) => x.tool === t)!, l = RAIL_LABELS[editor.modeId]?.[t], key = toolKeyText(editor.modeId, t, (x) => editor.modeTools().includes(x)); return { ...sp, label: l ?? sp.label, key }; };   // key = 键表现算（这个工作台里按什么拿起它 / 键盘起手）
/** 同一个键再按一下的轮换组（user 10-25）：键 → 组（组内第一个 = 那个键原本切到的工具）。 */
const KEY_CYCLES = TOOL_CYCLES;   // 数据住键表（提示也读它）
let shapeCurrent: Tool = "rect";
/** 本次会话里用过的池工具（按最近使用）；开局为空 = 只显示常驻。 */
const usedPool = new Map<string, Tool[]>(RAIL_GROUPS.map((g) => [g.id, []]));
/** 组内全部工具按最近使用（吃常驻时按它填）。 */
const groupMru = new Map<string, Tool[]>(RAIL_GROUPS.map((g) => [g.id, [...g.pinned, ...g.pool]]));
const bumpFront = (list: Tool[], t: Tool): void => { const i = list.indexOf(t); if (i > 0) list.splice(i, 1); if (i !== 0) list.unshift(t); };
function noteToolUse(t: Tool): void {
  if (SHAPES.includes(t)) shapeCurrent = t;
  if (ERASERS.includes(t)) eraserCurrent = t;
  for (const g of Object.values(RAIL_FIXED_FLYOUTS[editor.modeId] ?? {})) if (g.includes(t)) fixedFlyCurrent.set(g[0], t);
  const fold = RAIL_FIXED_FOLD[editor.modeId];
  if (fold) {
    const head = fold.pool.find((h) => h === t || (RAIL_FIXED_FLYOUTS[editor.modeId]?.[h] ?? []).includes(t));
    if (head) { const l = foldUsed.get(editor.modeId) ?? []; bumpFront(l, head); foldUsed.set(editor.modeId, l); }
  }
  for (const g of RAIL_GROUPS) {
    if (g.pool.includes(t)) bumpFront(usedPool.get(g.id)!, t);
    if (g.pinned.includes(t) || g.pool.includes(t)) bumpFront(groupMru.get(g.id)!, t);
  }
}
const LONG_PRESS_MS = RAIL_FLYOUT_PRESS_MS;   // 小三角格长按弹整组（feel.ts；user 10-28 夜「有点长」→ 260 ms）
const flyoutItems = (tools: Tool[]) => tools.map((x) => { const s2 = specOf(x); return { id: x, label: s2.label, icon: s2.icon, hint: s2.key, checked: editor.tool === x }; });
const mkToolBtn = (t: Tool, flyout?: () => Tool[]): HTMLButtonElement => {
  const sp = specOf(t);
  const b = document.createElement("button");
  // 按上下文换脸（controller/rail-face.ts；user 10-28 晚「有选区的时候删除的tool能变成小垃圾桶然后点了直接删吗」）：换了脸 = 图标 / 字 / 提示都换，点了跑键表同一条动作
  const face = railFace(t, { mode: editor.modeId, hasSelection: editor.hasSelection(), gesture: editor.isGestureActive() });
  if (face) {
    b.type = "button"; b.className = "tool rail-face"; b.dataset.face = face.action; b.title = face.tip;
    b.innerHTML = `${iconHtml(face.icon)}<span class="tool-label"></span>`;
    (b.querySelector(".tool-label") as HTMLElement).textContent = face.label;
    b.addEventListener("click", () => { if (editor.isGestureActive()) editor.abortGesture(); runKeyAction(face.action, new KeyboardEvent("keydown")); syncUi(); });   // 操作做到一半点它 = 先取消那个操作（选区不动）再删
    return b;
  }
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
  const fixed = RAIL_FIXED[editor.modeId];
  if (fixed) {   // 这个工作台有自己定死的一列（自由建模 / 验证）；列里的小三角组（RAIL_FIXED_FLYOUTS）= 格子显示最近用的那把
    const groups = RAIL_FIXED_FLYOUTS[editor.modeId] ?? {};
    const slot = (t: Tool): void => { const g = groups[t]; if (g) { const cur = fixedFlyCurrent.get(t) ?? t; add(cur, () => g.filter(inMode)); } else add(t); };
    for (const t of fixed) slot(t);
    const fold = RAIL_FIXED_FOLD[editor.modeId];   // 折叠组：用过的长出来（最多 budget 格），其余收在「…」里
    if (fold) {
      const heads = fold.pool.filter((h) => inMode(h) || (groups[h] ?? []).some(inMode)), shown = (foldUsed.get(editor.modeId) ?? []).filter((h) => heads.includes(h)).slice(0, fold.budget);
      if (heads.length) { const sep = document.createElement("div"); sep.className = "rail-sep"; toolbarEl.appendChild(sep); }
      for (const h of shown) slot(h);
      if (heads.length > shown.length) toolbarEl.appendChild(mkMore(heads.flatMap((h) => groups[h] ?? [h]).filter(inMode)));
    }
    return;
  }
  for (const slot of RAIL_FIRST) {   // 第一组常驻（形状格 / 橡皮格 = 一格一组、显示当前那把、小三角换）
    if ("tool" in slot) { add(slot.tool); continue; }
    const set = slot.flyout === "shapes" ? SHAPES : ERASERS;
    if (set.some(inMode)) add(slot.flyout === "shapes" ? shapeCurrent : eraserCurrent, () => set.filter(inMode));
  }
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
btnShop.addEventListener("click", () => { if (!shopEl.hidden) { shopEl.hidden = true; return; } if (boardAsDrawer()) closeBoard(); renderShop(); shopEl.hidden = false; });   // 手机竖屏：开物品栏 = 指令板收起（同一个底部位置，UX41）
$("shopClose").addEventListener("click", () => { shopEl.hidden = true; });
{
  const sheet = shopEl.querySelector<HTMLElement>(".sheet")!;
  const sync = (): void => { document.documentElement.style.setProperty("--drawer-h", shopEl.hidden ? "0px" : `${Math.ceil(sheet.getBoundingClientRect().height)}px`); };
  new ResizeObserver(sync).observe(sheet);   // 开 / 关（0 ↔ 高）和内容变高都会触发
}
type MenuId = "newOpen" | "importHub" | "exportHub" | "new" | "gallery" | "save" | "saveas" | "open" | "exportProject" | "exportModel" | "cloud" | "import" | "importGlb" | "finger" | "clear" | "help" | "debuglog" | "update" | "factoryReset" | "vr" | "lefthand" | "softenAll" | "weldAllBreaks" | "makePlanarAll" | `unit:${string}` | `style:${string}` | "material" | "guidesClear" | "axesReset" | "grid" | "unit:pick" | "lock" | "unlock" | "encrypt" | "decrypt" | "pwLock" | "pwForget" | "noclip" | "persp" | "xray" | "walk" | "refwin" | "unhideAll";
/** ☰ 与右上角「视图」共用一张动作表（id 不重叠）。 */
function menuPick(id: MenuId): void | "keep" {
    if (id.startsWith("unit:")) { editor.vcbUnit = id.slice(5) as LengthUnit; syncUi(); return "keep"; }   // 单位（B40：一排可勾选项）
    if (id.startsWith("screen:")) {   // 屏幕（T106：和画风分开选；像素下采样 / 行数 / 外观；写实也能套屏）。跟文件走（desk 1.3，T86）
      const sc = id.slice(7);
      const v = sc === "auto" ? null : isScreenId(sc) ? sc : undefined;
      if (v !== undefined) { editor.renderer3.setScreen(v); session.setView({ screen: v }); editor.draw(); hintEl.textContent = v === null ? "屏幕：跟画风的默认" : `屏幕：${SCREENS[v].name}——${SCREENS[v].brief}`; }
      return "keep";
    }
    if (id.startsWith("accent:")) {   // 选中色（视口设置，按设备记；user 10-29「写实线稿的时候是不是也红色统一一下比较好，然后开放一个设置？」）
      const a = ACCENTS.find((x) => x.id === id.slice(7));
      if (a) { editor.renderer3.setAccent(a.accent); PREF.set("accent", a.id); editor.draw(); hintEl.textContent = `选中色：${a.label}`; }
      return "keep";
    }
    if (id.startsWith("style:")) {   // 风格（Tron 纪元第 1 步）：跟文件走（desk 1.3，T86 user「风格跟着文件走」；不标脏、下次存盘带走）。选了就在提示行披露画面会怎样
      const s = id.slice(6);
      if (isPresetId(s)) { editor.renderer3.setPreset(s); session.setView({ style: s === "white" ? null : s }); editor.draw(); hintEl.textContent = s === "white" ? "风格：线稿" : `风格：${PRESETS[s].name}——${PRESETS[s].note}。VR 和缩略图里照旧画白模`; }
      return "keep";
    }
    switch (id) {
      case "newOpen": openPopupMenu<MenuId>({ anchor: btnMenu, items: () => [
        { id: "new", label: "新建模型", icon: "new" },
        { id: "open", label: "打开本地工程文件…", icon: "folder-open", hint: "Ctrl+O · .catsup（老的 .glb 也行）" },
      ], onPick: menuPick }); break;
      case "importHub": openPopupMenu<MenuId>({ anchor: btnMenu, items: () => [
        { id: "importGlb", label: "导入 glb…", icon: "import", hint: "别的软件导出的；层级变成组件、网格变成网格体，放进当前位置" },
        { id: "import", label: "导入 OBJ…", icon: "import", hint: "同上；多边形原样" },
      ], onPick: menuPick }); break;
      case "exportHub": openPopupMenu<MenuId>({ anchor: btnMenu, items: () => [
        ...(session.home.kind !== "gallery" ? [{ id: "saveas" as MenuId, label: supportsSavePicker() ? "另存到磁盘…" : "另存（下载 .catsup）", icon: "save-as" }] : []),
        // 账本 UX39 / 导出设计稿 §3：后缀说话——.catsup = 工程（原样），.glb / .obj = 给别的软件的模型（不是备份）
        { id: "exportProject", label: "导出工程文件（.catsup）", icon: "download", hint: "原样一份，可以开回 CatsUp" },
        { id: "exportModel", label: "导出模型…", icon: "export", hint: "给别的软件：glb / obj（不是工程备份）" },
      ], onPick: menuPick }); break;
      case "new": void session.newDoc(); break;
      case "lock": void session.setLocked(true); break;     // 演示锁（周账 F-124）：一点就锁、没有确认框、没有口令
      case "unlock": void session.setLocked(false); break;
      case "encrypt": void session.encryptCurrent().then(() => { syncUi(); galleryHost.refresh(); }); break;   // 口令（周账 F-123）
      case "decrypt": void (async () => { if (await openConfirmSheet("解除加密？", "这份模型会变回明文存在本机和云端（OneDrive 版本历史里也是明文）。")) { await session.decryptCurrent(); syncUi(); galleryHost.refresh(); } })(); break;
      case "pwLock": lockPasswords(); void forgetRemembered(); notify({ text: "已锁定：口令忘掉了，再开加密的模型要重新输", level: "info" }); break;
      case "pwForget": void forgetRemembered().then(() => notify({ text: "这台设备不再记着口令", level: "info" })); break;
      case "gallery": hideCanvasTip(); void galleryHost.open(); break;
      case "save": smartSave(); break;
      case "saveas": void session.settleToFile(); break;
      case "open": openLocal(); break;
      case "exportProject": session.exportProject(); break;
      case "exportModel": void openExportModel(); break;
      case "cloud": if (auth.isSignedIn()) { void cloudSignOut(); } else { cloudSignIn(); } break;
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
      case "walk": { const on = !(locomotion.isWalking() || locomotion.isPlacing()); setWalk(on); return on ? undefined : "keep"; }   // 开 = 关菜单去点落点
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
// 图库 → 新建 / 打开 → 导入 → 保存 / 导出 → 定稿；CatsUp 没有的改名 / 加密 / 回到打开时版本不出现。版图 = ai-docs/20261024-ui-layout.md
// ☰ 的页签和每页放哪几行 = 放置表 src/controller/placement.ts（MENU_TABS / MENU_ROWS）；这里只管每行长什么样（字 / 图标 / 动态的勾和数字）
btnMenu.addEventListener("click", () => togglePopupMenu<MenuId>({
  anchor: btnMenu, tabs: MENU_TABS, tabKey: "main",
  items: () => MENU_ROWS.flatMap((r) => { const it = menuRow(r.id); return it ? [{ ...it, tab: r.tab, ...(r.section ? { sectionBefore: r.section } : {}), ...(r.separatorBefore ? { separatorBefore: true } : {}) }] : []; }),
  onPick: menuPick,
}));
/** ☰ 一行长什么样（放哪 = 放置表 MENU_ROWS）；null = 这一行现在不露。文件页 = WeebPaint 合租法：保存走顶栏保存钮（Ctrl+S），登录走保存时的问询与图库页云账号钮——都不占菜单行。 */
function menuRow(id: string): Omit<PopupMenuItem<MenuId>, "tab"> | null {
  switch (id) {
    case "gallery": return { id: "gallery", label: "图库", icon: "gallery", ...(hasStore() ? {} : { hint: "本机 + OneDrive" }) };
    case "newOpen": return { id: "newOpen", label: "新建 / 打开…", icon: "new", hint: "Ctrl+O" };   // 加号（user 10-29「所以新建打开还是用加号。导入用导入符号」，账本 T137）
    case "importHub": return { id: "importHub", label: "导入…", icon: "import", hint: "别的软件的 glb / OBJ" };   // 导入单独一行、在新建打开下面（user 10-29「导入必须单独放……新建打开下面专门放一个导入」）
    case "exportHub": return { id: "exportHub", label: "导出与另存…", icon: "export" };
    case "lock": return session.locked()
      ? { id: "unlock", label: "解锁", icon: "unlock", hint: "放开：又能改了" }
      : { id: "lock", label: "锁上", icon: "lock", hint: "防误触：只能看、能进去玩；改不了" };
    case "encrypt": if (session.home.kind !== "gallery" || session.lazy) return null;   // 图库家才有（本地文件 / 空白 = 先安家）
      return session.encrypted
        ? { id: "decrypt", label: "解除加密…", icon: "unlock", hint: "变回明文" }
        : { id: "encrypt", label: "加密保护…", icon: "lock", hint: "整个图库一个口令；7-Zip 也能开" };
    case "pwLock": return isUnlocked() ? { id: "pwLock", label: "锁定（忘掉口令）", icon: "lock", hint: "之后再开加密的模型要重新输" } : null;
    case "pwForget": { const u = rememberedUntil(); return u != null ? { id: "pwForget", label: "忘记这台设备记着的口令", icon: "unlock", hint: `记到 ${rememberDayText(u)}` } : null; }
    case "softenAll": return { id: "softenAll", label: "软化所有 ≤ 20° 的边", icon: "blur", hint: "平滑组" };
    case "weldAllBreaks": {   // T7 / DT5；修复模块扔掉了 = 这一项不出
      if (!editor.repairLoaded("brep.weld")) return null;
      const n = editor.repairCount("brep.weld", "context");
      return { id: "weldAllBreaks", label: n ? `焊接全部断口（${n}）` : "焊接全部断口", icon: "arc", hint: "当前在编辑的整个物件（含子物件）", disabled: !n };
    }
    case "makePlanarAll": {   // T9 / DT7；修复模块扔掉了 = 这一项不出
      if (!editor.repairLoaded("brep.planar")) return null;
      const n = editor.repairCount("brep.planar", "context");
      return { id: "makePlanarAll", label: n ? `拍平几乎共面的面（${n} 组）` : "拍平几乎共面的面", icon: "sharpen", hint: "弯折小于锐角阈值的硬边分开的面", disabled: !n };
    }
    case "material": return { id: "material", label: "材质…", icon: "color", hint: "油漆桶蘸什么" };
    case "clear": return { id: "clear", label: "清空模型", icon: "trash-can" };
    case "finger": return { id: "finger", label: "手指也能画", checked: fingerDraws, ...(gestures.penEverSeen() ? { hint: "已见过笔，手指=相机" } : {}) };
    case "factoryReset": return { id: "factoryReset", label: "还原出厂设置…", icon: "trash-can", hint: "两步确认" };
    case "help": return { id: "help", label: "使用手册", icon: "help" };
    case "debuglog": return { id: "debuglog", label: "调试日志", icon: "wrench", hint: "复制给开发者" };
    case "update": return { id: "update", label: "强制更新", icon: "refresh", hint: APP_VERSION.replace(/-\d{4}-\d{2}-\d{2}$/, "") };   // WeebPaint 同款：版本号 = 行尾小字（user 10-24「字超了……weebpaint用的应该是小字」）
  }
  return null;
}

// ---------- 移动（步行相机 / VR 共用的 player）----------
const locomotion = new Locomotion(editor, canvas);
editor.viewExtras = () => ({ near: locomotion.isWalking() ? 0.05 : undefined, teleport: locomotion.teleportArc(), capsule: locomotion.placeGhost() });
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
  onChange: () => { syncLoop(); syncUi(); syncWalkBar(); hintEl.textContent = hintDefault(); },
  log: (m) => console.warn(m),
});
/** 视图菜单「步行相机」：开 = 进放置（先点一下落在哪）；关 = 离开步行（回到进来之前的视角）。 */
function setWalk(on: boolean): void {
  if (on) { locomotion.beginPlace(); editor.openParamSession(placeSession()); } else locomotion.exitWalk();
  syncLoop();
  hintEl.textContent = hintDefault();
  syncUi();
}
/** 放置的马前炮：这个人的身材 + 走跑跳（纪元账本 FM140 ③「马前炮还可以设置身高」→ 10-28 扩成八项）；说明行 = 这一点站不站得下 + 跳多高多远。 */
// 这个人的参数（马前炮；user 10-28「身高 宽度眼高，以及后来的射击 都可以调整，现在还没想好放在哪里，就先算马前炮」「眼睛top，身高，宽度，蹲高，爬高」
// 「然后移动速度，跑步倍速，跳高」「然后应该能估算跳远距离」「都单位和用户选择单位对齐」）：长度 / 速度按用户的单位显示、点数值能带单位打字；
// 改了身高、别的没碰过 = 按新身高同比例跟着变（resolveAvatar 的自动）；碰过的那几项钉住。还没存（session 内记住；以后和射击参数一起理）。
const LEN = { q: "length" } as const, FOOT = { q: "speed", mover: "foot" } as const;
const AVATAR_FIELDS = [
  { key: "stature", def: { kind: "number", label: "身高", min: STATURE_MIN, max: STATURE_MAX, step: 0.05, quantity: LEN } },
  { key: "width", def: { kind: "number", label: "宽度", min: 0.05, max: 2.5, step: 0.05, quantity: LEN } },
  { key: "eyeToTop", def: { kind: "number", label: "眼到头顶", min: 0.04, max: 1, step: 0.01, quantity: LEN } },
  { key: "crouchHeight", def: { kind: "number", label: "蹲高", min: 0.1, max: STATURE_MAX, step: 0.05, quantity: LEN } },
  { key: "crawlHeight", def: { kind: "number", label: "爬高", min: 0.1, max: STATURE_MAX, step: 0.05, quantity: LEN } },
  { key: "walkSpeed", def: { kind: "number", label: "走速", min: 0.1, max: 50, step: 0.1, quantity: FOOT } },
  { key: "runFactor", def: { kind: "number", label: "跑步倍速", min: 1, max: 10, step: 0.1, unit: "×" } },
  { key: "jumpHeight", def: { kind: "number", label: "跳高", min: 0, max: 20, step: 0.05, quantity: LEN } },
] as const satisfies readonly { key: keyof AvatarSpec; def: ParamFieldDef }[];
function placeSession(): ParamSession {
  const s: ParamSession = {
    phase: "before", title: "步行：点一下落在哪",
    fields: AVATAR_FIELDS,
    buttons: [{ key: "here", label: "在相机这里出生" }, { key: "reset", label: "恢复默认" }, { key: "cancel", label: "取消" }],
    get values() { const a = resolveAvatar(locomotion.avatar); return Object.fromEntries(AVATAR_FIELDS.map((f) => [f.key, a[f.key]])); },
    get note() {
      const why = locomotion.placeWhy(), b = locomotion.body(), j = jumpReach(b);
      const reach = `跳 ${formatQuantity(j.height, LEN)}、空中 ${j.airtime.toFixed(2)} s，走着跳远 ${formatQuantity(j.walk, LEN)}、跑着 ${formatQuantity(j.run, LEN)}（跑 ${formatQuantity(b.dashSpeed, FOOT)}；落回起跳高度时算）`;
      return `${why ?? "绿 = 站得下，红 = 站不下"} ｜ ${reach}`;
    },
    set(key, value) {
      const v = Number(value);
      if (!Number.isFinite(v) || !AVATAR_FIELDS.some((f) => f.key === key)) return;
      locomotion.avatar = { ...locomotion.avatar, [key]: v } as AvatarSpec;
      locomotion.refreshGhost();
    },
    press(key) { if (key === "here") locomotion.placeAtCamera(); else if (key === "cancel") locomotion.cancelPlace(); else if (key === "reset") { locomotion.avatar = AVATAR_DEFAULT; locomotion.refreshGhost(); } },
    dispose() { if (locomotion.isPlacing()) locomotion.cancelPlace(); },
  };
  return s;
}
// 上方正中那一颗低调的按钮（user 10-28「只有一个按钮」「这个按钮做的和嵌入的那些汉堡符号一样低调一点就是enter webxr 这种半灰的感觉，不抢眼」）：
// 原地编辑里 =「继续走」；平时、浏览器支持 VR（Quest）=「进入 VR」；别的时候不露。
const walkBar = $("walkBar"), walkBtn = $<HTMLButtonElement>("walkBtn");
function syncWalkBar(): void {
  const ph = locomotion.walkPhase();
  const label = ph === "edit" ? "继续走" : ph === "off" && !locomotion.isXR() && vr.isSupported() && !vr.isPresenting() ? "进入 VR" : null;
  walkBar.hidden = !label;
  if (label) walkBtn.textContent = label;
}
walkBtn.addEventListener("click", () => {
  if (locomotion.isEditInPlace()) locomotion.resumeWalk();
  else if (vr.isSupported()) vr.enter();
});
// 触屏摇杆（吃鸡式，FM142）：有触屏的设备、FPS 阶段才露
const touchCtl = new TouchControls(stage, { lookRad: (y, p) => locomotion.lookRad(y, p), editInPlace: () => locomotion.editInPlace(), leave: () => locomotion.exitWalk() });
locomotion.touch = () => touchCtl.read();
/** 验证工作台的「步行」工具：原地编辑里 = 继续走；平时 = 拿起工具 + 进放置。 */
function pickWalk(): void {
  if (locomotion.isEditInPlace()) { locomotion.resumeWalk(); return; }
  editor.setTool("walk");
  if (!locomotion.isPlacing() && !locomotion.isWalking()) setWalk(true);
}
locomotion.onPhase = () => {
  if (locomotion.walkPhase() === "off" && editor.tool === "walk") editor.setTool("select");   // 离开步行 / 取消放置 = 放下步行工具（什么都没发生过）
  touchCtl.setVisible(locomotion.isFps() && TouchControls.available());
  if (!locomotion.isPlacing() && editor.paramPanel()?.title === "步行：点一下落在哪") editor.openParamSession(null);
  syncWalkBar(); syncLoop();
  hintEl.textContent = hintDefault();
  syncUi();
};

// ---------- 状态同步 ----------
editor.renderer3.setLineWeight(lineWeightInit());   // 线稿粗细：调好的默认（高 DPI 1.5）；不再读存的值（T88）（直接打渲染器：此时 HUD 元素还没挂，不能走 host.changed）
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
  actions: (tool) => [...toolActions(tool), ...deleteAction()],
  // 笔 / 手指：右下只留「删除」+「更多…」（= 右键同一份菜单）；别的可选操作都在菜单里（user 10-28 夜截图「可选操作应该放到右键菜单里而不是全堆在马后炮，好好整理一下」）
  selection: () => {
    if (selectionRoute(lastPointerType) !== "bar" || !editor.hasSelection() || editor.isGestureActive()) return [];
    const all = barItems(editor, hud).filter((it) => !it.hidden), del = all.filter((it) => it.id === "delete");
    return [...del, ...(all.length > del.length ? [{ id: "selMore", label: "更多…", icon: "more" } as HudItem] : [])];
  },
  pickSelection: (id, el) => { if (id === "selMore") { if (el) openSelectionMenu(editor, hud, el); return; } hud.pick(id as never); },
  afterRender: () => { vcbRef?.render(); },
});
/** 自由建模有选区时右下的「删除」（user 10-28 夜「delete变成按钮可能不大好。吃书吧。变成右下的一个按钮？」：左柱垃圾桶撤回）；笔 / 手指的选区条里本来就有删除，不重复。 */
function deleteAction(): { id: string; label: string; title?: string; onClick(): void }[] {
  if (editor.modeId !== "freeform" || !editor.hasSelection() || editor.isGestureActive() || selectionRoute(lastPointerType) === "bar") return [];
  return [{ id: "deleteSel", label: "删除", title: "删掉选中的（= Delete / X，一步撤销）", onClick: () => { editor.deleteSelection(); syncUi(); } }];
}
function toolActions(tool: string): { id: string; label: string; title?: string; disabled?: boolean; active?: boolean; onClick(): void }[] {
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
}   // 选区动作（selection）：笔 / 手指路由才进条（鼠标走右键菜单，#19 的路由不变）；上下文选项住在参数小窗里（afterRender，user 2026-10-25）
const vcb = mountVcb(document.getElementById("vcb") as HTMLElement, editor);
vcbRef = vcb;
// eslint-disable-next-line no-var
var lastPointerType = typeof matchMedia === "function" && matchMedia("(hover: none), (pointer: coarse)").matches ? "touch" : "mouse";   // 开机先按设备猜（触屏为主的设备 = 手指），之后跟最近一次按下
// eslint-disable-next-line no-var
var vcbRef: { render(): void } | null = null;   // var：上下文条 mount 时就回调 afterRender（参数小窗那时还没挂）   // var：上下文条的 selection provider 在 mount 时就读它（加载期）
canvas.addEventListener("pointerdown", (ev) => { if (ev.pointerType !== lastPointerType) { lastPointerType = ev.pointerType; selectModeFollow(ev.pointerType); syncUi(); } }, { capture: true });
// 选区两档跟着手上的指针走（user 10-28 晚「鼠标模式点应该是替换选择」）：换成鼠标 = 替换、换成笔 / 手指 = 多选（stance.ts BOOLEAN_DEFAULT）；
// 人在工具条上自己选过一档 = 这次打开不再自动换（尊重手选）。capture 阶段先于工具收到这一下，所以这一下就按新设备算。
let selectModeChosen = false, selectModeAuto = false;
editor.config.subscribe((tool, key) => { if (tool === "select" && key === "mode" && !selectModeAuto) selectModeChosen = true; });
function selectModeFollow(pt: string): void {
  if (selectModeChosen) return;
  selectModeAuto = true;
  try { editor.config.set("select", "mode", selectModeFor(pt === "mouse" ? "mouse" : pt === "pen" ? "pen" : "finger")); } finally { selectModeAuto = false; }
}
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
type GridMenuId = `preset:${GridPreset}` | `step:${number}` | `plane:${string}` | `sub:${number}` | "off" | "on" | `lock:${"x" | "y" | "z" | "none"}` | `plock:${"x" | "y" | "z"}`;
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
    { id: "preset:si" as GridMenuId, label: "制式", tab: "grid", choices: GRID_PRESETS.map((p) => ({ id: `preset:${p.id}` as GridMenuId, label: p.label, checked: g.preset === p.id, ...(p.id === "dnd" ? { hint: "5 ft 一格 · 1/5 = 1 ft" } : p.id === "architectural" ? { hint: "英尺英寸，建筑图纸那套" } : {}) })) },   // 制式 ≠ 长度单位（user 10-24「这两个分开来」）
    { id: `step:${steps[0]}` as GridMenuId, label: "格距", tab: "grid", choices: steps.map((st) => ({ id: `step:${st}` as GridMenuId, label: fmtGridStep(st, g.preset), checked: Math.abs(g.step - st) < 1e-9 })) },
    { id: "plane:xy" as GridMenuId, label: "栅格面", tab: "grid", choices: GRID_PLANES.map((p) => ({ id: `plane:${p.id}` as GridMenuId, label: p.label, checked: g.plane === p.id, hint: p.id === "xy" ? "画平面" : "画立面：空处落点也在这面上" })) },
    { id: "sub:5" as GridMenuId, label: "吸附细分", tab: "grid", choices: GRID_SUBDIVS.map((n) => ({ id: `sub:${n}` as GridMenuId, label: `1/${n}`, checked: g.subdiv === n, ...(n === 5 ? { hint: "仪表盘式" } : n === 10 ? { hint: "尺子式" } : {}) })) },
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
    else if (id.startsWith("sub:")) { const n = Number(id.slice(4)); if (isGridSubdiv(n)) editor.setGrid({ subdiv: n }); }
    else editor.setGrid({ step: Number(id.slice(5)) });
    return "keep";
}
function syncUi(): void {
  renderSnapWidget();
  refreshMachineBoard();   // 指令板上的数跟着模型变
  releaseLatchesOnToolChange(); mfdRef?.render();   // 键名芯片（UX19）；换了工具 = 锁住的修饰键放开
  softSliderRef?.render();   // 软选择半径滑条
  selGrowRef?.sync();   // 扩 / 缩条：换了工具 / 没选区就收
  // 右上角的手 + 放大镜（拖着平移 / 缩放）：键鼠时藏（有滚轮 / 中键 / Shift+Z），检测到触摸 / 笔就露（账本 UX37，user 10-28「键鼠的时候手柄可以自动隐藏。检测到触摸自动出现」）
  { const nav = document.querySelector<HTMLElement>(".gizmo-nav"); if (nav) nav.hidden = lastPointerType === "mouse"; }
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
/** 快捷键表（md-lite）= 键表数据生成（controller/keymap.ts keyDocs；工具名用左柱那张表的中文）。 */
function keysTableMd(): string {
  const toolName = (t: Tool): string => { const sp = TOOL_SPEC.find((x) => x.tool === t); return sp ? `工具：${sp.label}` : `工具：${t}`; };
  return keyDocs(toolName).filter((g) => g.rows.length).map((g) => `**${g.title}**${g.when ? `（${g.when}）` : ""}\n\n${g.rows.map((r) => `- **${r.keys}** ${r.does}`).join("\n")}`).join("\n\n");
}
const helpEl = $("helpSheet");   // 不能叫 help：图标 sprite 里有 <symbol id="help">（守卫 test/page-ids.test.ts）
let helpRendered = false;
function toggleHelp(on: boolean): void {
  if (on && !helpRendered) {   // 使用手册 = readme-docs.ts 各节（md-lite 渲染，抄 WeebPaint readme-panel）
    helpRendered = true;
    $("helpBody").innerHTML = README_SECTIONS.map((sec) => `<section id="help-${sec.id}"><h3>${escapeHtml(sec.title)}</h3>${renderMdLite(sec.body === KEYS_TABLE ? keysTableMd() : sec.body)}</section>`).join("");
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


// ---------- 导出模型（导出设计稿 ai-docs/20261028-export-design.md §4；账本 UX39）：模态 sheet，给别的软件看的烤好的模型，不是工程备份 ----------
// 选择记在这台设备上（PREF；设计稿说桌面态，那要 CATSUP_desk 加键 + 冻样本——导出习惯跟设备走也说得通，先这样）
async function openExportModel(): Promise<void> {
  const picks = editor.exportPicks(), last = (PREF.get("exportModel") ?? "").split("|");
  const glbOnly = (v: Readonly<Record<string, string>>): boolean => v.format !== "glb";
  const v = await openFormSheet("导出模型", [
    { key: "format", label: "格式", value: last[0] === "obj" ? "obj" : "glb", options: [{ value: "glb", label: "glb" }, { value: "obj", label: "obj" }] },
    { key: "scope", label: "范围", value: picks.length && last[1] === "sel" ? "sel" : "all", options: [{ value: "all", label: "整个模型" }, ...(picks.length ? [{ value: "sel", label: `选中的 ${picks.length} 个物件` }] : [])], hidden: glbOnly },
    { key: "textures", label: "贴图", value: last[2] === "none" ? "none" : "embed", options: [{ value: "embed", label: "嵌进文件" }, { value: "none", label: "不带" }], hidden: glbOnly },
    { key: "lines", label: "边线", value: last[3] === "none" ? "none" : "with", options: [{ value: "with", label: "带" }, { value: "none", label: "不带" }], hidden: glbOnly },
  ], {
    okLabel: "导出",
    note: (x) => `给别的软件看的烤好的模型（${x.format === "obj" ? "三角形；OBJ 只导整个模型、不带贴图" : "三角形 + 材质 + 贴图"}）。不是工程备份——备份用「导出工程文件」。`,
  });
  if (!v) return;
  PREF.set("exportModel", [v.format, v.scope ?? "all", v.textures ?? "embed", v.lines ?? "with"].join("|"));
  if (v.format === "obj") { doExport(); return; }
  session.exportModelGlb({ textures: v.textures !== "none", lines: v.lines !== "none", ...(v.scope === "sel" && picks.length ? { only: picks } : {}) });
}

// ---------- OBJ 逃生口 ----------
const objInput = $<HTMLInputElement>("objFile");
function doExport(): void {
  const world = editor.worldGeom();
  const text = exportObj(world, { triangulateHoled: faceTriangles, version: APP_VERSION });
  const blob = new Blob([text], { type: "model/obj" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${downloadName(session.displayName())}.obj`;   // 模型名-YYYYMMDD-HHMM（WeebPaint 导出命名同款；user 10-28「导出的时候应该加一个导出时间」）
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
    // 和外来 glb 同一条导入：层级 → 组件、网格 → 网格体、导入参数小窗（user 10-29「导入的glb obj当然应该是mesh」，账本 T121）
    const data = readForeignObj(await file.text(), file.name.replace(/\.obj$/i, ""));
    const t0 = performance.now(), r = editor.importForeign(data);
    note("import", `${file.name}: ${data.nodes.length} nodes, ${data.meshes.length} meshes, ${Math.round(performance.now() - t0)} ms`);
    reportImport(file.name, data, r);
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
    reportImport(file.name, data, r);
  } catch (err) {
    notify({ text: `导入失败：${(err as Error).message}`, level: "error" });
  }
});
/** 导入（glb / OBJ 同一条）落定后的通知：几个组件、几张面（拼回了几个四边形）、修了 / 丢了什么、没带进来什么。 */
function reportImport(fileName: string, data: ImportScene, r: ReturnType<typeof editor.importForeign>): void {
    if (!r.ok) { notify({ text: `导入失败：${r.reason}`, level: "error" }); return; }
    editor.zoomExtents();
    const c = r.cast, parts = [`${r.instances} 个组件`, c.faces !== undefined ? `${c.faces} 个面${c.quads ? `（${c.quads} 个三角对拼回了四边形）` : ""}` : `${c.triangles - c.degenerate - c.duplicate - c.rejected} 个三角面`];
    if (c.repaired) parts.push(`${c.repaired} 个有毛病的三角面已切好`);
    if (c.rejected) parts.push(`${c.rejected} 个坏三角面没导进来`);
    if (c.degenerate || c.duplicate) parts.push(`丢掉 ${c.degenerate + c.duplicate} 个退化 / 重复的`);
    if (r.empties) parts.push(`${r.empties} 个空节点（画成小三轴）`);
    notify({ text: `导入 ${fileName}：${parts.join("，")}${data.losses.length ? `。没带进来：${data.losses.join("、")}` : ""}`, level: c.rejected ? "warning" : "info" });
}

// ---------- 手势 & 键盘 ----------
const gestures = attachGestures(canvas, editor, {
  fingerDraws: () => fingerDraws,
  onUndo: () => editor.undo(),
  onRedo: () => editor.redo(),
  look: (dx, dy) => locomotion.look(dx, dy),
  walking: () => locomotion.isWalking(),
  toolBlocked: () => { if (editor.locked) { hintEl.textContent = HINT_LOCKED; return true; } return locomotion.sim.state.teleport.charging || locomotion.isPlacing() || locomotion.isFps(); },   // 演示锁 = 工具指针不进编辑器（悬停预告也停）、提示行说为什么；放置 = 点一下落人；FPS = 监工不编辑（原地编辑才动工具）
  // #19 上下文菜单：桌面右键任何工具都行（SU）；触屏长按只在选择工具里
  onContext: (x, y, cx, cy) => { if (editor.locked) { hintEl.textContent = HINT_LOCKED; return; } openContextMenuAt(editor, hud, x, y, cx, cy); },   // 演示锁：不出菜单；三层：空处 / 几何 / 子组件的物体菜单（context-menu.ts）
  longPressEnabled: () => editor.tool === "select",
  // #23 user「move反而是点两下」「旋转和move对齐」：移动 = 点两下、旋转 = 点三下，笔 / 手指也开；画线 / 矩形 / 推拉在笔 / 手指上仍只拖（误触连线案）
  latched: () => latchedMods,   // 键名芯片锁住的修饰键（iPad 没键盘：Shift / Ctrl / Alt = 开关）
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
      { id: "xray" as MenuId, label: "X 光", checked: editor.xray, hint: "Alt+Z：选择工具点得到被挡住的点 / 边 / 面（面中心的小方点），边透过面画出来", tab: "display" },   // DT17 拾取 + 叠加层（半透明留 Tron 纪元）
      ((): { id: MenuId; label: string; icon: string; hint: string; disabled: boolean; tab: string } => { const c = editor.hiddenCount(), n = c.instances + c.faces + c.edges; return { id: "unhideAll", label: n ? `全部显示（${n}）` : "全部显示", icon: "visibility-show", hint: "Alt+H", disabled: !n, tab: "display" }; })(),   // DT49
      // 单选组一组一行下拉（user 2026-10-25「线稿粗细，单位都做成下拉框，整个汉堡目录排查一下，能下拉框的就做」）
      { id: "style:pick" as MenuId, label: "风格", tab: "display", choices: PRESET_IDS.map((s) => ({ id: `style:${s}` as MenuId, label: PRESETS[s].name, checked: editor.renderer3.getPreset() === s, hint: PRESETS[s].brief })) },
      { id: "screen:pick" as MenuId, label: "屏幕", tab: "display", choices: [{ id: "screen:auto" as MenuId, label: "跟画风", checked: editor.renderer3.getScreen() === null, hint: "画风自己的默认" }, ...SCREEN_IDS.map((s) => ({ id: `screen:${s}` as MenuId, label: SCREENS[s].name, checked: editor.renderer3.getScreen() === s, hint: SCREENS[s].brief }))] },   // 屏幕一刀的用户面（T106）   // Tron 纪元：预设 = 数据（minccino/preset/）
      { id: "accent:pick" as MenuId, label: "选中色", tab: "display", choices: ACCENTS.map((a) => ({ id: `accent:${a.id}` as MenuId, label: a.label, checked: editor.renderer3.getAccent() === a.accent, ...(a.hint ? { hint: a.hint } : {}) })) },
      { id: "unit:pick" as MenuId, label: "单位", tab: "display", choices: LENGTH_UNITS.map((u) => ({ id: `unit:${u.id}` as MenuId, label: u.label, checked: editor.vcbUnit === u.id })) },
      ...gridTabItems(),
      { id: "refwin" as MenuId, label: "参考窗", checked: refHost.isOpen(), hint: refHost.count() ? `${refHost.count()} 张` : "图片 · 文字 · 视频", tab: "ref" },
      ...refTabItems(),
      { id: "walk" as MenuId, label: "步行相机", hint: "WASD · 空格跳", checked: locomotion.isWalking() || locomotion.isPlacing(), tab: "camera" },
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
// X 光快捷钮（2026-10-29 user「xray开关放一个快捷键到视图快捷键区的锁快捷键旁边」；纪元账本 FM51「X 光开关放右上角锁旁边」）：点一下开 / 关，亮着 = 开；Alt+Z 同一个开关，视图菜单里那一行照留
const xrayBtn = document.createElement("button"); xrayBtn.type = "button"; xrayBtn.className = "gizmo-btn gizmo-xray"; xrayBtn.title = "X 光（Alt+Z）：边透过面画出来，选择工具点得到被挡住的点 / 边 / 面（面中心的小方点）";
xrayBtn.innerHTML = iconHtml("xray"); widgets.appendChild(xrayBtn);
xrayBtn.addEventListener("click", () => { editor.setXray(!editor.xray); syncUi(); });
xrayBtnRef = xrayBtn;
// 物体窗口的钮（UX 心智模型 §2.1：一个窗口只看一个指针——这一颗 = 你所在的这一层；子组件的物体菜单「物体设置…」也从这里开，当前换成它们）
// 2026-10-28 夜挪到左上、工作台下拉旁边（user「物体属性不在视图那边，可以放在工作流左边」）：右边那一列只管视图
const objectBtn = document.createElement("button"); objectBtn.type = "button"; objectBtn.className = "tb-btn gizmo-object"; objectBtn.title = "物件：这一层的属性与动词（对称 / 默认平滑 / 转换种类 / 细分 / 修复）";
objectBtn.innerHTML = iconHtml("object"); $("modeSelect").after(objectBtn);
objectBtn.addEventListener("click", () => openObjectWindow(editor, hud, "self", objectBtn, { after: syncUi, openMachine: (m) => openMachineBoard(m, objectBtn) }, "start"));
// 车间里的机器（machine-window.ts MACHINES 表）：板 = 那台机器的低频指令（user 10-28「每个机器一个面板，然后左栏是你的手和常用工具袋」）。
// 入口 = 物件窗口里那台机器的页签（user 10-29「修复菜单不应该挂在视图那边，而是物品选项里面的一个tab」；以前是右边视图那一列的扳手钮）
function openMachineBoard(m: Machine, anchor: HTMLElement): void {
  openMachineWindow(editor, hud, m, anchor, {
    store: { get: (id) => { try { const v = PREF.get(`board.${id}`); return v ? JSON.parse(v) as { x: number; y: number } : null; } catch { return null; } }, set: (id, p) => PREF.set(`board.${id}`, p ? JSON.stringify({ x: Math.round(p.x), y: Math.round(p.y) }) : "") },   // 板的位置记在这台设备（长按标题 = 归位）
    params: { setHome: (el, accepts) => vcb.setParamsHome(el, accepts) },
    onDrawer: () => { shopEl.hidden = true; },   // 手机竖屏：板和物品栏抢同一个底部位置（UX41）
    after: syncUi,
  });
}
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
// eslint-disable-next-line no-var
var xrayBtnRef: HTMLButtonElement | undefined;
function renderSnapWidget(): void {
  if (xrayBtnRef) { xrayBtnRef.classList.toggle("on", editor.xray); xrayBtnRef.setAttribute("aria-pressed", editor.xray ? "true" : "false"); }   // X 光钮跟着同一次刷新
  const btn = snapBtnRef;
  if (!btn) return;
  btn.classList.toggle("on", editor.grid.on);
  const lk = btn.querySelector(".gizmo-snaplock") as HTMLElement, want = editor.grid.on ? "lock" : "unlock";
  if (lk.dataset.icon !== want) { lk.dataset.icon = want; lk.innerHTML = iconHtml(want); }
  const badge = btn.querySelector(".gizmo-badge") as HTMLElement;
  const a = editor.axisLock, p = editor.planeLock, axis = a ?? (p === "face" ? null : p);
  badge.hidden = !a && !p; badge.textContent = a ? a.toUpperCase() : p ? planeLockLabel(p) : ""; badge.dataset.axis = axis ?? "";
}
window.addEventListener("keyup", (ev) => { if (ev.key === "Shift") editor.setShiftHeld(latchedMods.shift); if (modPeek && ev.key === modPeek.key) endModPeek(); });   // DT51：松开 Shift = 格点吸附回到右上锁钮的状态
window.addEventListener("blur", () => { editor.setShiftHeld(latchedMods.shift); endModPeek(); });
// 状态行披露（接线清单第 5 条；UX 心智模型 §2.7「键 = 分层键表 + 披露」）：按住 Shift / Ctrl / Alt 一小会儿（MOD_PEEK_MS）不按别的键 = 提示行露出
// 「这把工具按住它是什么」（立场表那一格）+ 现在压着的层里带它的和弦（keymap.ts modifierChords，和真按下去生效的是同一条）；松开 / 按别的键 / 点画布 = 收回原来的提示。手势中不打扰。
let modPeek: { key: string; timer: number; prev: string | null } | null = null;
const modOfKey = (k: string): "shift" | "ctrl" | "alt" | null => (k === "Shift" ? "shift" : k === "Control" || k === "Meta" ? "ctrl" : k === "Alt" ? "alt" : null);
function modPeekText(mod: "shift" | "ctrl" | "alt"): string {
  const name = mod === "shift" ? "Shift" : mod === "ctrl" ? "Ctrl" : "Alt", own = stanceOf(editor.modeId, shownTool())?.[mod];
  const chords = modifierChords(keyContext(), mod).slice(0, 6).map((x) => `${chordLabel(x.chord)} ${x.label}`);
  const shown = own ? stanceShown(own) : "";   // 去掉账本代号 / 施工附注（界面不出代号）
  return [shown && shown !== "—" ? `按住 ${name}：${shown}` : `按住 ${name}`, ...chords].join(" · ");
}
function startModPeek(ev: KeyboardEvent): void {
  endModPeek();
  const mod = modOfKey(ev.key);
  if (!mod || ev.repeat || editor.isGestureActive()) return;
  const key = ev.key;
  modPeek = { key, prev: null, timer: window.setTimeout(() => { if (!modPeek || modPeek.key !== key || editor.isGestureActive()) return; modPeek.prev = hintEl.textContent; hintEl.textContent = modPeekText(mod); }, MOD_PEEK_MS) };
}
function endModPeek(): void {
  if (!modPeek) return;
  clearTimeout(modPeek.timer);
  if (modPeek.prev !== null) hintEl.textContent = modPeek.prev;
  modPeek = null;
}
canvas.addEventListener("pointerdown", () => endModPeek(), { capture: true });
// 键名芯片（MFD，账本 UX19；controller/chips.ts + app/mfd.ts）：提示行上面一排固定槽位；手势开始 / 结束、换工具都要重画（syncUi 管大部分，指针按下 / 抬起补一下）
function setLatch(m: "shift" | "ctrl" | "alt", on: boolean): void {
  latchedMods[m] = on;
  if (m === "shift") editor.setShiftHeld(on || heldMods.shift);   // DT51：Shift = 格点吸附反过来，悬停 / 预览立刻按新规则重算
}
/** syncUi 里调：工具 / 工作台换了 = 锁住的修饰键全放开。 */
function releaseLatchesOnToolChange(): void {
  const k = `${editor.modeId}/${editor.tool}`;
  if (k === latchFor) return;
  latchFor = k;
  for (const m of ["shift", "ctrl", "alt"] as const) if (latchedMods[m]) setLatch(m, false);
}
// 扩 / 缩选区的拖动条（选择工具再点一下选区；gizmo-design §7）
// eslint-disable-next-line no-var
var selGrowRef: SelGrowBar | null = mountSelGrowBar(canvas, editor, () => syncUi());
// 软选择的半径竖滑条（WeebPaint 左栏那根的同款；user 10-28 夜「weebpaint的slider放哪里」）：左柱右边，开着软选择 + 拿着会用它的工具才露
const SOFT_TOOLS: readonly Tool[] = ["move", "rotate", "scale", "shrink"];
const brushInHand = (): boolean => editor.modeId === "freeform" && (BRUSHES as readonly string[]).includes(editor.tool);   // 笔刷拿在手上 = 半径格露（和软选择共用一根）
// eslint-disable-next-line no-var
var softSliderRef: SoftSlider | null = mountSoftSlider(mountLeftDial($("stage")), $("stage"), canvas, editor, {
  visible: () => brushInHand() || (editor.modeId === "freeform" && editor.config.get("soft", "on") && SOFT_TOOLS.includes(editor.tool)),
  selectionScreenCenter: () => { const p = editor.selectionCenter("mean"); return p ? editor.cam.angularPx(p, editor.vp()) : null; },
});
// eslint-disable-next-line no-var
var mfdRef: { render(): void } | null = null;
mfdRef = mountMfd($("hintWrap"), {
  ctx: () => keyContext(),
  stance: () => stanceOf(editor.modeId, shownTool()),
  live: () => ({ held: { ...heldMods }, axisLock: editor.axisLock, planeLock: editor.planeLock, keys: lastPointerType === "mouse", pressing: canvasPresses.size > 0, latched: { ...latchedMods } }),
  latch: (m) => { setLatch(m, !latchedMods[m]); syncUi(); },   // 键鼠才印键名（user「ipad的时候能不能不显示键位」）
  press: (chord) => {   // 点芯片 = 按了这个键：和真按键走同一条（resolveKey → runKeyAction）
    const p = chord.split("+"), n = p[p.length - 1], code = /^[a-z]$/.test(n) ? `Key${n.toUpperCase()}` : n === "escape" ? "Escape" : n === "enter" ? "Enter" : n === "arrowright" ? "ArrowRight" : n === "arrowleft" ? "ArrowLeft" : n === "arrowup" ? "ArrowUp" : n;
    const key = /^[a-z]$/.test(n) ? n : code;
    const r = resolveKey(keyContext(), { key, code, shift: p.includes("shift"), ctrl: p.includes("ctrl"), alt: p.includes("alt") });
    if (r && r !== "swallow") runKeyAction(r.action, new KeyboardEvent("keydown", { key, code }));
    syncUi();
  },
  collapsed: () => PREF.get("mfd") === "0",
  setCollapsed: (on) => PREF.set("mfd", on ? "0" : "1"),
  touchy: () => lastPointerType !== "mouse",
});
canvas.addEventListener("pointerdown", (ev) => { canvasPresses.add(ev.pointerId); }, { capture: true });
for (const t of ["pointerup", "pointercancel"] as const) window.addEventListener(t, (ev) => { canvasPresses.delete(ev.pointerId); queueMicrotask(() => mfdRef?.render()); }, { capture: true });
for (const t of ["pointerdown", "pointerup"] as const) canvas.addEventListener(t, () => queueMicrotask(() => mfdRef?.render()));
// 实时响应按键（user 10-28 晚）：按下 / 松开都重画；按着哪几个修饰键自己记（键盘事件的 shiftKey 等是「这一下」的，松开那一下才知道没了）；切走窗口 = 全松
const noteMods = (ev: KeyboardEvent): void => { heldMods.shift = ev.shiftKey; heldMods.ctrl = ev.ctrlKey || ev.metaKey; heldMods.alt = ev.altKey; queueMicrotask(() => mfdRef?.render()); };
window.addEventListener("keydown", noteMods, { capture: true });
window.addEventListener("keyup", noteMods, { capture: true });
window.addEventListener("blur", () => { heldMods.shift = heldMods.ctrl = heldMods.alt = false; mfdRef?.render(); });
// 键盘 = 分层键表（controller/keymap.ts；UX 心智模型 §2.7，账本 UX17 / UX18）：每次按键从现状算出压着哪几层，从顶往下找第一个绑了的，这里只按动作 id 做事。
// 以前这里是一长串 if（v0.15.46），2026-10-28 抄成层，行为照旧，只改了 user 拍的 X（操作工具里 X / Y / Z 永远 = 轴，选择工具里 X = 删除）。
const keyEvt = (ev: KeyboardEvent): KeyEvt => ({ key: ev.key, code: ev.code, shift: ev.shiftKey, ctrl: ev.ctrlKey || ev.metaKey, alt: ev.altKey });
/** 键表 / 左下芯片 / 按住修饰键的提示看的工具：走路（FPS）时一律当「步行」——它的修饰键都空着，按 Ctrl / Shift 不跳别的工具的芯片
 *  （user 10-29「fps的时候工具应该是fps，一个隐藏的工具，这样按ctrl shift的时候左下角不会跳奇怪的chip」）；编辑器手里的工具不换，原地编辑时还是原来那把。 */
function shownTool(): Tool { return locomotion.isFps() ? "walk" : editor.tool; }   // 函数声明（提升）：左下芯片挂载得比这行早
function keyContext(): KeyContext {
  return {
    mode: editor.modeId, tool: shownTool(), gesture: editor.isGestureActive(), hasSelection: editor.hasSelection(),
    walk: locomotion.walkPhase(), walking: locomotion.isWalking(), mirrorSession: editor.mirrorActive(), lockStyle: editor.lockStyle(),
    typingWants: (e) => editor.typing.wants(e.key, e),   // 打字（手势中打数 / 数值小窗）：主人 typed-input.ts 定去向
    typing: editor.typing.text() !== "",   // 小窗里有字 = 正在打（自由建模的 1 / 2 / 3 让给它）
  };
}
/** 工具键：同一个键再按一下 = 在这个工具组里换下一把（user 2026-10-25「快捷键在工具组里怎么循环：同一个键再按一下」）：E 橡皮 → 焊边 → 软边；R 矩形 → 旋转矩形；T 卷尺 → 量角器 → 轴；A 弧的四种画法轮换（画法是工具选项）。 */
function toolKey(key: string, t: Tool): void {
  const cyc = KEY_CYCLES[key];
  if (cyc && cyc.includes(editor.tool)) { const next = cyc[(cyc.indexOf(editor.tool) + 1) % cyc.length]; if (editor.modeTools().includes(next)) { editor.setTool(next); return; } }
  if (key === "a" && editor.tool === "arc") { const modes: string[] = ARC_MODES.map((m) => m.id), cur = editor.config.get("arc", "mode") as string; const nx = modes[(modes.indexOf(cur) + 1) % modes.length]; editor.config.set("arc", "mode", nx); hintEl.textContent = `弧：${ARC_MODES.find((m) => m.id === nx)?.label ?? nx}（再按 A 换下一种）`; syncUi(); return; }
  editor.setTool(t);
}
function runKeyAction(action: string, ev: KeyboardEvent): void {
  const [verb, p1, p2] = action.split(":");
  switch (verb) {
    case "walk.editInPlace": locomotion.editInPlace(); return;
    case "walk.resume": locomotion.resumeWalk(); return;
    case "walk.exit": closePopupMenu(); locomotion.exitWalk(); return;
    case "walk.cancelPlace": locomotion.cancelPlace(); return;
    case "typing.key": editor.typing.feed(ev.key); vcb.render(); syncUi(); return;   // 打字（手势中 / 刚做完一步）
    case "mirror.apply": editor.pressParam("apply"); syncUi(); return;
    case "pick.solo": case "pick.toggle": {   // 自由建模拾取范围（1 / 2 / 3、Shift+数字；按法 = pick-kinds.ts，和右下角三颗开关共用）
      const cur = Object.fromEntries(editor.config.entries("pick").map((x) => [x.key, !!x.value])) as PickSet, next = pickAfter(cur, p1 as PickKind, verb === "pick.solo" ? "solo" : "toggle");
      for (const k of PICK_KINDS) editor.config.set("pick", k, next[k]);
      hintEl.textContent = pickSay(next); syncUi(); return;
    }
    case "grid.toggle":   // Shift+Tab = 开 / 关格点吸附（Blender 同键；user 待定，备选 N）
      editor.setGrid({ on: !editor.grid.on });
      hintEl.textContent = `${snapSwitchName(editor.modeId)}：` + (editor.grid.on ? "开（格点 · 整格长度 · 15°；按住 Shift 临时关）" : "关（按住 Shift 临时开）");
      syncUi(); return;
    case "modal": {   // Blender 的 G / R / S / E / I / Alt+S / Ctrl+B：有选区就从光标处起手；没选区 = 切到那把工具（倒角 / 沿法线 = 提示）
      const t = p1 as Tool;
      if (!editor.startModal(t, p2)) {
        if (t === "shrink") hintEl.textContent = "沿法线移动：先选点 / 边 / 面";
        else if (p2) hintEl.textContent = p2 === "bevelVerts" ? "倒角（点）：先选点" : "倒角：先选边（选面 = 倒它的边）";
        else editor.setTool(t);
      }
      syncUi(); return;
    }
    case "select.all": editor.selectAll(); syncUi(); return;
    case "select.invert": editor.invertSelection(); return;
    case "select.none": editor.deselectAll(); return;
    case "delete.ifAny": if (editor.hasSelection()) editor.deleteSelection(); syncUi(); return;
    case "delete": editor.deleteSelection(); return;
    case "edit.cut": editor.cutSelection(); syncUi(); return;
    case "edit.copy": editor.copySelection(); syncUi(); return;
    case "edit.paste": editor.pasteClipboard(); syncUi(); return;
    case "objects.join": editor.mergeUnderCursor(); syncUi(); return;
    case "mesh.duplicateMove": if (editor.runAction("mesh.duplicate") > 0) editor.startModal("move"); syncUi(); return;   // Blender Shift+D：复制叠在原处 → 接着 G
    case "soft.toggle": editor.config.set("soft", "on", !editor.config.get("soft", "on")); editor.refreshGesture(); syncUi(); return;
    case "soft.smaller": case "soft.bigger": { editor.config.set("soft", "radius", stepRadius(editor.config.get("soft", "radius"), verb === "soft.bigger" ? 1 : -1)); editor.refreshGesture(); syncUi(); softSliderRef?.flash(); return; }   // 按档位走（同滑条）；读数 + 圈闪一下   // 手势中打数（Blender「S Z 0」）
    case "mesh.connect": editor.runAction("mesh.connect"); syncUi(); return;
    case "mesh.loopCutArm": editor.armLoopCut(); syncUi(); return;
    case "move.slideToggle": editor.toggleSlideOnce(); syncUi(); return;   // 移动中再按 G = 这一次沿边滑（Blender G G；工具条「沿边滑」= 常驻模式）
    case "lock.key": editor.lockKey(p1 === "none" ? null : (p1 as "x" | "y" | "z"), p2 === "plane"); syncUi(); return;   // 方向键（A9）
    case "lock.arm": editor.armLock(p1 as "x" | "y" | "z", p2 === "plane"); syncUi(); return;   // 先锁好、下一下生效
    case "lock.axis": if (editor.isGestureActive()) editor.lockKey(p1 as "x" | "y" | "z", p2 === "plane"); else editor.armLock(p1 as "x" | "y" | "z", p2 === "plane"); syncUi(); return;   // 操作工具 = 自动按了 G（UX17）
    case "tool.key": toolKey(p1, p2 as Tool); return;
    case "component.make": if (editor.hasGeometrySelection() || editor.hasPoolSelection()) editor.makeComponent(`组件 ${editor.sceneRef.defs.size}`); return;   // SU：G = 建组件
    case "hide": if (editor.hasHideableSelection()) editor.hideSelection(); return;   // Blender：H（DT49）
    case "show.all": editor.unhideAll(); return;
    case "view.zoomExtents": editor.zoomExtents(); return;
    case "view.zoomTo": editor.zoomTo(); return;   // Blender 小键盘 .
    case "view.xray": editor.setXray(!editor.xray); return;
    case "group.make": editor.makeGroup(); return;
    case "group.explode": editor.explodeSelection(); return;
    case "undo": editor.undo(); return;
    case "redo": editor.redo(); return;
    case "escape":
      closePopupMenu(); toggleHelp(false); closeDebugLogSheet(); toggleMatSheet(false);
      // 自由建模的手势中（拖着 / 键盘起手 / 打数）→ 只取消这次操作、选区留着（Blender：G / S 里 Esc 只退回去；2026-10-28 晚「S Z 0」接线时改，硬表面照旧）
      if (editor.modeId === "freeform" && editor.isGestureActive() && !editor.mirrorActive()) { editor.abortGesture(); syncUi(); return; }
      // 手势中 / 有选区 → 取消；否则在 group / 组件里 → 退出一层（SU：Esc 关组）
      if (!editor.isGestureActive() && !editor.hasSelection() && editor.contextDepth() > 0) editor.exitContext(); else editor.cancel();
      return;
  }
}
window.addEventListener("keydown", (ev) => {
  const target = ev.target as HTMLElement | null;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
  if (refHost.hasFocus()) return;   // 参考窗有焦点：空格 / ← → 归它（视频播放、逐帧、翻页），工具快捷键让路
  if (ev.key === "Shift") editor.setShiftHeld(true);   // DT51：按住 Shift = 格点吸附反过来，指针不动也立刻换规则
  if (modOfKey(ev.key)) { if (!modPeek || modPeek.key !== ev.key) startModPeek(ev); } else endModPeek();   // 状态行披露：按住修饰键一小会儿
  const r = resolveKey(keyContext(), keyEvt(ev));
  if (r === "swallow" || r === null) return;   // FPS 里键盘归走路（吞掉）/ 没人要（交给浏览器）
  if (r.action !== "escape") ev.preventDefault();
  runKeyAction(r.action, ev);
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
const lockBadge = $<HTMLElement>("lockBadge");
// 编辑模式下拉（几何 / 表面）：下拉标准件，不用原生 <select>（user 2026-10-24「不要用ios自带的。丑」）
// eslint-disable-next-line no-var
// 工作台下拉 = 纯视图操作（user 10-28 夜「我说了不要用tab切换mesh brep，tab是纯视图操作」）：只列这一层的身体管得了的工作台，不转种类；转换在物体窗口（左上物体钮）。
// v0.16.29 让它顺手转种类，v0.16.37 撤了。
async function pickWorkbench(v: string): Promise<void> { editor.setMode(v as ModeId); syncUi(); }
var modeField: SelectField | undefined = mountSelectField($("modeSelect"), { items: () => editor.modes().map((m) => ({ value: m.id as string, label: m.label })), value: () => editor.modeId, onChange: (v) => { void pickWorkbench(v); }, ariaLabel: "编辑模式" });
const btnSaveIcon = document.getElementById("btnSaveIcon") as unknown as SVGUseElement;
const SAVE_ICON: Record<ReturnType<Session["saveState"]>, string> = { none: "floppy-disk", dirty: "floppy-disk", "local-only": "floppy-disk", saving: "cloud-upload", "cloud-off": "floppy-disk", unpushed: "cloud-pending", synced: "cloud-synced" };
function updateSaveStatus(): void {
  { lockBadge.hidden = !editor.locked; document.body.classList.toggle("doc-locked", editor.locked); }   // 护栏 ①（演示锁）：锁着 → 左上角「锁着」+ 工具区灰掉
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
  applyView: (style, screen) => { editor.renderer3.setPreset(isPresetId(style) ? style : "white"); editor.renderer3.setScreen(isScreenId(screen) ? screen : null); editor.draw(); },   // 风格 / 屏幕跟文件走（desk 1.3，T86）：认不出的 id = 默认
  onHomeChanged: updateSaveStatus,
  setStatus: (text, error) => { note("doc", (error ? "✗ " : "") + text); notify({ text, level: error ? "error" : "info" }); },
  online: () => navigator.onLine !== false,
  crypto: { ensureUnlocked, ensureNewPassword, isFreshPasswordSetup, rollbackFreshPassword, setPassword, getPassword, unlockImportedContainer, isEncryptedBlob: (bytes) => appEncryption.isEncryptedBlob(bytes) },
});
// 口令面板注入（crypto-state 零 DOM；守「无系统对话框」红线）。探针可换成脚本答题（__catsup.crypto.answer）。
let probePasswordAnswer: ((o: PromptOpts) => Promise<string | null>) | null = null;
setPasswordPrompt(async (o) => {
  if (probePasswordAnswer) { setRememberChoice(false); return probePasswordAnswer(o); }
  const r = await openPasswordSheet(o.title ?? "输入口令", { message: o.message, purpose: o.purpose, account: "catsup",
    checkbox: o.offerRemember && rememberAvailable() ? { label: "在这台设备上记住 30 天（能解锁这台设备的人就能打开你的加密模型）", checked: rememberChoice() } : undefined });
  setRememberChoice(!!o.offerRemember && rememberAvailable() ? !!r?.checked : false);   // 不给勾的面板一律清掉勾态（流程里只有最后一个面板给勾）
  return r ? r.value : null;
});
// 「在这台设备上记住口令」（remember-password.ts；≤ 30 天，库钉的上限）。keeper 只在这里递进去。
const rememberDayText = (t: number): string => new Date(t).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
wireRememberPassword({
  enabled: true,   // CatsUp 没有单文件 html / itch 形态（同源只有自己）
  keeper: passwordKeeper, hasVerifier, checkVerifier, setPassword: (pw) => setPassword(pw),
  onError: (e) => funnel(e instanceof Error ? e : new Error(String(e)), "warning"),
  onRemembered: (until) => notify({ text: `这台设备会记住口令到 ${rememberDayText(until)}（☰ → 设置 → 口令 里能忘记）`, level: "info" }),
});
onLockChange(() => updateSaveStatus()); onRememberChange(() => updateSaveStatus());
// CSP（index.html 的 meta）拦下的东西进黑匣子（log 级）：真机上某个功能突然不灵时，先看这里是不是策略挡了它。
document.addEventListener("securitypolicyviolation", (e) => funnel(new Error(`[csp] blocked ${e.effectiveDirective} ${String(e.blockedURI).slice(0, 120)} (${e.sourceFile ? e.sourceFile.split("/").pop() : "?"}:${e.lineNumber})`), "log"));
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
async function cloudSignOut(): Promise<void> { note("auth", "sign-out click"); try { await auth.signOut(); lockPasswords(); void forgetRemembered(); notify({ text: "已退出 OneDrive 登录（本机副本仍在；口令也忘了）", level: "info" }); } catch (e) { funnel(e); } }   // 退出登录 = 锁 + 忘（ADR-0001）
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
// 打开本地工程文件（.catsup / 老 .glb）：FSA 有就用（文件家可原地写回），没有走 <input type=file>（只读进来，保存 = 下载）
const glbInput = $<HTMLInputElement>("glbFile");
function openLocal(): void { if (supportsOpenPicker()) void session.openLocalPicker(); else glbInput.click(); }
glbInput.addEventListener("change", async () => {
  const file = glbInput.files?.[0]; glbInput.value = "";
  if (file) await session.openLocalBytes(new Uint8Array(await file.arrayBuffer()), file.name, null);
});
stage.addEventListener("dragover", (e) => { if (e.dataTransfer?.types.includes("Files")) { e.preventDefault(); } });
stage.addEventListener("drop", async (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (!file || !/\.(catsup|glb)$/i.test(file.name)) return;   // 工程（.catsup / 老 .glb）；外来 glb 由 openLocalBytes 按内容拒、指去导入
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
    onNotFound: (name) => { note("boot", `restore failed "${name}" → fresh canvas (slate kept)`); notify({ text: `上次的模型「${bareName(name)}」本机没有副本；登录后会再试`, level: "warning" }); },
    getRestoreAttempt: () => readSlate().restoreAttempt,
    setRestoreAttempt: (name) => setRestoreAttempt(name),
    onCrashLoopSkipped: (name) => notify({ text: `上次打开「${bareName(name)}」时崩溃了，这次没有自动打开——可从图库手动打开`, level: "warning" }),
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
  // 记着的口令（≤ 30 天）：验证器接上后、开上次模型**之前**试——对了就静默解锁（上次开着的是加密件也秒开）；对不上 = 忘掉、说一句（ADR-0001）
  if (hasStore()) { try { await verifierReady(); const rr = await restoreRemembered(); note("boot", `remembered password: ${rr}`); if (rr === "stale") notify({ text: "这台设备记着的口令对不上（别的设备改过？），已经忘掉；要用时再输一次", level: "warning" }); } catch (e) { funnel(e, "warning"); } }
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

(window as unknown as { __catsup: unknown }).__catsup = { pickWorkbench, perf, editor, locomotion, vr, hud, session, galleryHost, refs: refHost, crash: crashStore,
  encryption: appEncryption,
  crypto: { setPassword, getPassword, lock: lockPasswords, isUnlocked, rememberedUntil, restoreRemembered, forgetRemembered, answer: (fn: ((o: PromptOpts) => Promise<string | null>) | null) => { probePasswordAnswer = fn; }, keeper: passwordKeeper }, store: () => (hasStore() ? requireStore() : null), version: APP_VERSION, factoryReset: () => { menuPick("factoryReset"); }, devPushAsk: () => offerPushLocalOnly("probe", true), debugLog: { toText: debugLogText, entries: debugLogEntries, open: openDebugLogSheet } };

// ---------- 起 ----------
editor.renderer3.onRedrawWanted = () => editor.draw();
{   // 血槽位披露（Tron 清单第 9 步，2026-10-29 Opus）：连续超预算才说一次，提示行 + 黑匣子；开着风格时指路换回白模
  const watch = makeBudgetWatch(() => { const s = editor.renderer3.getPreset(); return s === "white" ? null : PRESETS[s].name; });
  editor.renderer3.onMeasured = (b) => { const said = watch.feed(b); if (said) { hintEl.textContent = said; note("budget", said); } };
}   // 风格的遮蔽停手后重烘好了 → 重画一帧（Tron 第 1 步，2026-10-29 Opus）
editor.renderer3.onTextureReady = () => editor.draw();
// 标记闪（1-bit 线稿：选中靠闪，T140）：画风写了闪、而且有选区时，每半拍补画一帧；没选区 / 不闪的画风 = 不跑（不耗电）。拍子按钟点算（引擎和画风表各自读同一个钟）
setInterval(() => {
  const bl = (PRESETS[editor.renderer3.getPreset()] as Preset).material.blink;
  if (bl && editor.hasSelection() && !document.hidden) editor.draw();
}, 175);   // 贴图异步解好 → 重画一帧（以前没人接：贴图要等下一次交互才出现；2026-10-29 Claude Fable 5.1）
{ const a = ACCENTS.find((x) => x.id === PREF.get("accent")); if (a) editor.renderer3.setAccent(a.accent); }   // 选中色（按设备记）
editor.setTool("select");   // 开机 = 鼠标（选择）工具（user 10-29「brep模式进去默认是鼠标而不是线。本轮改」；以前这里硬写画线、盖掉了编辑器自己的默认）
hintEl.textContent = hintDefault();
resize();
