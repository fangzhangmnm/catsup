// main.ts —— app 壳接线：工具条 / 顶栏 / 菜单 / 状态行 / 调试日志 sheet / OBJ 逃生口 / PWA 更新 toast / 文档生命周期 boot 编排。
// created 2026-09-06 by Claude Fable 5.1（0.3 app 壳纪元开工：user「离开 lab 变成一个 prototypical 但是正经的东西…先做无地骑士，
// 无 store 无导入导出…去掉那些很 lab 的东西，好好做 ui，可以留一个 gltf 或者 obj 的 io 逃生口」）
// 0.5 转正纪元起：文档生命周期 = src/app/session.ts（三态家）+ @internal/store 单一接缝 + @internal/gallery；OBJ 只剩逃生口。
// v0.5.7（2026-09-22，Claude Fable 5.1）：boot 改用包的 restoreLastSession（回执条三态编排）+ **本地恢复先于 initAuth**（零网络秒开）
//   + 登录 / 回线 / 回前台显式快进 + 崩溃安全 flush 三件；审计 = ai-docs/20260922-lifecycle-alignment-with-weebpaint.md。

import { mountSelectField, type SelectField } from "./ui/select-field.ts";
import { ERASERS, BRUSHES, isReadOnlyTool, isPaintTool } from "../editor/tool-ids.ts";
import { mountPaintMeterBadge, type PaintMeterBadge } from "./paint-meter-badge.ts";
import { paintMeter } from "../paint/frame-meter.ts";
import { strokeKindOpts, BRUSH_KIND_IDS, BRUSH_KINDS, BRUSH_PATHS, type BrushKind } from "../paint/brush-kinds.ts";
import { resolvedBrushOf, strokeSmoothOf, brushUnusableWhy, CANVAS_HOST, BRUSHES as BRUSH_RECORDS } from "../paint/brush-records.ts";
import { StrokeClock } from "../controller/stroke-clock.ts";
import { createPaintBrushes } from "./paint-brushes.ts";
import { CHECK_EVERY, displayDiag, DISPLAY_PATHS, DISPLAY_PATH_LABELS, MIPS_OF } from "../paint/display-diag.ts";
import { inputGate, installInputDom } from "./input-dom.ts";
import { planeLockLabel } from "../editor/locks.ts";
import { snapSwitchLook, snapSwitchSay } from "../editor/grid-state.ts";
import { PICK_KINDS, pickAfter, pickSay, type PickKind, type PickSet } from "../controller/pick-kinds.ts";
import { createHandRoster } from "../controller/hand-busy.ts";
import { type Ladder, allReminders, loadLadder } from "../editor/scale-ref.ts";
import { SCALE_TIP_MAX, scaleTipHtml } from "./scale-tip.ts";
import { type ChoiceOption, multiSummary, openMultiSelect } from "./ui/choice-layer.ts";
import { ARC_MODES } from "../editor/arc-build.ts";
import { APP_VERSION } from "../version.ts";
import { DOC_EXT, downloadName, hex4 } from "../config.ts";
import { mountContextBar } from "./context-bar.ts";
import { mountVcb } from "./vcb.ts";
import { perf } from "../editor/perf-stats.ts";
import { openSelectionMenu, openContextMenuAt, openSubmenuAt, submenuItems } from "./context-menu.ts";
import { barItems, selectionRoute } from "./selection-actions.ts";
import { openObjectWindow } from "./object-window.ts";
import { createHierarchyWindow, type HierarchyWindow } from "./hierarchy-window.ts";
import { createShelfActions, type ShelfActions } from "./shelf-actions.ts";
import { resolvePasteConflict } from "./paste-actions.ts";
import { createHideWindows } from "./ui/hide-windows.ts";
import { createFloatWin, createMenuWindow, type FloatWin, type MenuSpec, type MenuWindowHandle } from "./ui/menu-window.ts";
import { mountCanvasWindow, type CanvasWindow, type CanvasPointer, type CanvasStroke } from "./canvas-window.ts";
import { mountWorkBar } from "./ui/work-bar.ts";
import { mountMfd } from "./mfd.ts";
import { stanceShown } from "../controller/chips.ts";
import { selectModeFor } from "../editor/tool-config.ts";
import { railFace } from "../controller/rail-face.ts";
import { keyBorrows } from "../controller/tool-borrow.ts";
import { flippedValue, onSecond, secondModeOf } from "../controller/second-mode.ts";
import { mountSoftSlider, stepRadius, type SoftSlider } from "./soft-slider.ts";
import { mountLeftDial } from "./left-dial.ts";
import { mountSelGrowBar, type SelGrowBar } from "./sel-grow-bar.ts";
import { RAIL_FIXED_FLYOUTS, RAIL_FIXED_FOLD, MENU_ROWS, MENU_TABS, VIEW_UNIT_ROWS, RAIL_FIRST, RAIL_FIXED, RAIL_GROUPS, RAIL_LABELS, SHAPES } from "../controller/placement.ts";
import { MACHINES, openMachineWindow, refreshMachineBoard, type Machine } from "./machine-window.ts";
import { boardAsDrawer, closeBoard } from "./ui/command-board.ts";
import { mountViewGizmo } from "./view-gizmo.ts";
import { deviceKvGet, deviceKvSet, migrateLegacyUiPrefs } from "./device-kv.ts";
import { Session, bareName, supportsOpenPicker, supportsSavePicker } from "./session.ts";
import { createReferenceHost } from "./reference-host.ts";
import { restoreLastSession, readSlate, setRestoreAttempt, snapshotFolderOnce, walkLibrary, setActiveGalleryId, type RestoreOutcome, type GalleryEntry } from "@internal/gallery";
import { planReturn, neverUploadedIds } from "./cloud-return.ts";
import { bootFolderEntry, canPickFolder, ensureFolderPermission, forgetFolderHome, hasHome, homeState, pickFolderEntry, rememberFolderHome, type HomeState } from "./gallery-home.ts";
import { carryVerifier, moveFinished, moveKindOf, moveSay, moveToHome, verifierSay, type ModelToMove } from "./home-move.ts";
import { isCatsupDocumentHead } from "../format/peek.ts";
import { identifierForFile, putBack } from "./put-back.ts";
// 口令（2026-10-29 周账 F-123）：政策 crypto-state / 验证器 / 设备记住；面板注入在下面 setPasswordPrompt；解锁循环 unlock.ts
import { onPasswordVerified, setPasswordPrompt, setPassword, getPassword, lock as lockPasswords, isUnlocked, onLockChange, onLocked, type PromptOpts } from "../crypto-state.ts";
import { appEncryption, passwordKeeper } from "../encryption.ts";
import { hasVerifier, checkVerifier } from "../password-verifier.ts";
import { wireRememberPassword, restoreRemembered, forgetRemembered, rememberedUntil, rememberChoice, setRememberChoice, rememberAvailable, onRememberChange } from "../remember-password.ts";
import { ensureUnlocked, ensureNewPassword, isFreshPasswordSetup, rollbackFreshPassword, unlockImportedContainer } from "./unlock.ts";
import { attachFolderHome, currentFolderDestination, disposeStore, flushAppStateLocal, folderHomeLabel, folderHomeOnline, homeMovePorts, isFolderHome, legacyLibraryExists, legacyStore, openFolderDestination, putBackPorts, setFolderHomeOnline, verifierCarryPorts, cloudReachable, verifierReady } from "../app-store.ts";
import { initGalleryHost } from "./gallery-host.ts";
import { runFactoryReset, finishFactoryResetAtBoot, hasFactoryResetMarker } from "./factory-reset.ts";
import { auth, docFile, ensureStore, hasStore, isCached, requireStore } from "../app-store.ts";
import { captureThumbnail } from "./thumbnail.ts";
import { initSheets, isAnyFaceUp, openChoiceSheet, openConfirmSheet, openFormSheet, openInputSheet, openPasswordSheet, isBusyActive, lockSyncGate, openSyncGate, withBusy } from "./ui/sheets.ts";
import type { GateHandle } from "./ui/gate-stack.ts";
import { CloudGate, GATE_COPY, takeRenewFailureCode, type RenewResult } from "./cloud-gate.ts";   // 掉登录 / 没网闸门（工单 C；设计稿 ai-docs/20261103-cloud-gate-design.md）
import { browserOnline, cloudOnline, isUserOffline, setUserOffline } from "./user-offline.ts";
import { reportError as funnel } from "./error-funnel.ts";
import { DEFAULT_SNAP, Editor, GRID_PLANES, TOOLS, UNIT_SYSTEMS, isUnitSystem, snapLabel, snapLevels, type Tool, type GridPlane } from "../editor/editor.ts";
import type { CommandId } from "../editor/commands/command.ts";
import type { ModeId } from "../editor/mode.ts";
import { Renderer3 } from "../minccino/providers/three/render3.ts";
import { browserPaintBoards, PAINT_UNDO_KIND, type PaintRec } from "../paint/boards.ts";
import { initPaintTileJobs, paintTileStats } from "../paint/tile-jobs.ts";
import { PaintSaver } from "../paint/save.ts";
import { PaintWorkbench } from "./paint-workbench.ts";   // 画画工作台的控制器（1-7）
import { createPaintColor, mountPaintColorSheet, hexOf, parseHexColor, PAINT_COLOR_DEFAULT } from "./paint-color.ts";
import { pickPaintStart } from "./canvas-size-picker.ts";
import { mountPrimaryButton } from "./primary-button.ts";
import { facesToStart, latestPaintOf, unpaintedSelected } from "../editor/mesh-edits/start-paint.ts";
import type { MeshSelection } from "../editor/tools.ts";
import type { PaintDeskDoc } from "../format/document.ts";
import { mountPaintSliders } from "./paint-sliders.ts";
import type { SpacePaintDeps } from "../paint/space-paint.ts";
import { PAINT_STEP_LABELS } from "../editor/step-labels.ts";   // 画板登记处（贴图主线 1-3c）：一张贴图一块画板；这一张只有调试钩子 __catsup.paint 建
import { meshBodyIssues, paintDefsOf, paintPlaceOf } from "../scene/paint.ts";
import { placeFace, uvAt, uvBoxes, uvMesh } from "../scene/uv.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { buildTriGrid, pickSurface } from "../paint/surface-pick.ts";   // 调试钩子 __catsup.paint.cellAt：1-3a 的落点
import { applyDir, applyPt, invert } from "../scene/xform.ts";
// 调试钩子 __catsup.paint.lab（贴图主线 1-4b）：探针在页面里拿三维的空间层那几块（薄层、软件版、名单、找面、真显卡版）对拍；没有界面入口
import { SpaceLayer, SPACE_TIP } from "../paint/space-layer.ts";
import { SoftSpaceGpu } from "../paint/space-gpu-soft.ts";
import { buildTargetGeo } from "../paint/space-target.ts";
import { tipReach, sphereTriDist } from "../paint/tip-reach.ts";
import { strokeTruth8 } from "../paint/tip-truth.ts";
import { paintTargets } from "../paint/paint-targets.ts";
import { SpacePrep } from "../paint/space-prep.ts";
import { layoutFaces } from "../paint/layout.ts";
import { SpacePaintStroke, hookBrush } from "../paint/space-paint.ts";
import { PALETTE, PRESETS, PRESET_IDS, isPresetId, isDarkPaper, SCREENS, SCREEN_IDS, isScreenId, type Preset, type MarkAccent } from "../minccino/index.ts";   // 风格（Tron 纪元：预设 = 数据）
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
import { TOOL_CYCLES, chordLabel, keyDocs, modifierChords, resolveKey, toolKeyText, type KeyContext, type KeyEvt, TOOL_KEY_JUMPS } from "../controller/keymap.ts";
import { stanceOf, penPressOf } from "../controller/stance.ts";
import { pressPulse } from "./ui/press-pulse.ts";
import { RAIL_FLYOUT_PRESS_MS, MOD_PEEK_MS, LIFT_GRACE_MS } from "../controller/feel.ts";
import { type AvatarSpec, AVATAR_DEFAULT, STATURE_MAX, STATURE_MIN, jumpReach, resolveAvatar } from "../player/body.ts";
import { formatQuantity } from "../editor/units.ts";
import { TouchControls } from "./touch-controls.ts";
import type { ParamFieldDef, ParamSession } from "../editor/param-panel.ts";
import { VR } from "./vr.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { initPwaShell } from "./pwa-shell.ts";
import { movedNoticeFor } from "./moved-notice.ts";
import { iconHtml } from "./ui/icon.ts";
import { configureTabMemory, openPopupMenu, togglePopupMenu, closePopupMenu, type PopupMenuItem } from "./ui/popup-menu.ts";
import { installContextMenuGuard } from "./ui/context-menu-guard.ts";
import { showNotice, closeNotice, type NoticeOpts } from "./ui/notice.ts";
import { conflictGate } from "../store-ui.ts";   // 2026-10-26：自动保存撞上云端 → 横幅接手
import { initCrashRecovery } from "./crash-recovery.ts";
import { crashStore } from "./crash-store.ts";
import { initDebugLog, note, record, toText as debugLogText, entries as debugLogEntries } from "./debug-log.ts";
import { initDebugLogSheet, openDebugLogSheet, setLastStepProvider } from "./debug-log-sheet.ts";
import { capture as reproCapture, count as reproCount, toJson as reproJson, exportJson as reproExport, lastStepEntry } from "./repro-box.ts";
import { traceLine } from "./debug-lines.ts";
import { exportAll, exportAllSay } from "./export-all.ts";
import { deliverFile } from "./share-or-download.ts";
import { zipPack } from "../crypto/zip.ts";
import { PRIMITIVES, type PrimitiveKind } from "../mesh/ops/primitives.ts";
import { mintGuid } from "../format/guid.ts";

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
  if (reproCount() > 0) actions.push({ label: `复现包 (${reproCount()})`, onClick: () => { void session.confirmPlainExit("复现包").then((go) => { if (go) void reproExport(reproJson(), "catsup-repro", say); }); } });
  const step = lastStepProvider?.();
  if (step) actions.push({ label: "上一步", onClick: () => { void session.confirmPlainExit("复现包").then((go) => { if (go) void reproExport(reproJson([lastStepEntry(step)]), "catsup-last-step", say); }); } });
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
/** 抬笔宽限的几档（毫秒；设置里点一下换下一档，按设备记）。0 = 不等。笔的设计稿第三节：防屏幕断触一下，要跟手，别拿跳跃游戏的数。 */
const LIFT_GRACE_STEPS = [0, 30, 50, 80, 120, 200] as const;
let liftGraceMs: number = ((g) => (g !== null && (LIFT_GRACE_STEPS as readonly number[]).includes(Number(g)) ? Number(g) : LIFT_GRACE_MS))(PREF.get("liftGraceMs"));
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
// 一键藏起所有窗（user 10-30「以后可以加一个「一键藏起所有窗」，像 Procreate 四指轻点全屏。 现在就可以做」）：四指轻点 / \ 键；ui/hide-windows.ts
const hideWins = createHideWindows();
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
const HINT_LOCKED = "锁着：看、选、量、进去走都行，改不了；☰「解锁」放开";   // 演示锁（周账 F-124）：锁着时的常驻提示；工具指针被挡在手势路由（toolBlocked）时也说这句
const hintDefault = (): string => (vr?.isPresenting() ? HINT_VR : locomotion?.isPlacing() ? HINT_PLACE : locomotion?.isEditInPlace() ? HINT_EDIT : locomotion?.isWalking() ? (TouchControls.available() ? HINT_WALK_TOUCH : `${HINT_WALK} · Tab 原地编辑 · Esc 离开`) : editor?.locked ? HINT_LOCKED : HINT_DEFAULT);

// ---------- Editor ----------
let _session: Session | null = null;   // editor.host.changed 要同步喂 session（lazyblank 首笔安家）；session 在 editor 之后才建
installInputDom();   // 输入闸的门口：window 捕获监听按注册先后跑，要排第一（ai-docs/20261105-input-gate-design.md）
// 画的撤销（贴图主线 1-8a）：编辑器比画板登记处先建，宿主钩子经这两个转接（登记处建好之后赋值）
let paintAfterCommit: (() => void) | null = null, paintBeforeHistoryMove: (() => boolean) | null = null;
const editor = new Editor(canvas, {
  afterCommit: () => paintAfterCommit?.(),   // 每条指令提交完：画板跟大小、内核封的那几步挂进这一步
  beforeHistoryMove: () => paintBeforeHistoryMove?.() ?? false,   // 撤销 / 重做之前：开着的那一笔先取消（取消了 = true：这一下只取消它、不翻历史）
  editHold: () => inputGate.held(),   // 编辑器的口问这里；理由在 session 建好之后登记
  optionKv: { get: (k) => deviceKvGet(k), set: (k, v) => deviceKvSet(k, v) },   // 工具选项 device 持久化（surface 组：user「锐角阈值和模式的持久化不同工具共享」）
  hint: (t) => { hintEl.textContent = t ?? hintDefault(); },
  refused: (why) => funnel(why, "info"),   // 一步被拒的原因：状态栏之外再闪一条瞬态提示（漏斗 info 档 = 和写歌 / 画画软件同一套、进日志；不是 error / warning，user 11-13）
  confirm: (title, message, okLabel) => openConfirmSheet(title, message, { warning: true, okLabel, cancelLabel: "不做" }),   // 慢的修复先问（user「宁愿弹警告问yes no」）
  resolvePaste: resolvePasteConflict,   // 粘贴撞上两边内容不一样（设计书 §8）
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
    note("op", traceLine(e));   // 记账面包屑 → 黑匣子（一 op 一行；不带坐标，debug-lines.ts）
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
  placeBody: (phase, x, y) => locomotion.placePointer(phase, x, y),   // 步行放人：输入层 → 步行工具 → 这里（user 10-30「1做」）
  paint: (ev) => paintWb?.pointer(ev),   // 画画工作台：笔 / 橡皮 / 吸管 → 画画控制器（app/paint-workbench.ts，1-7）
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
// 画显示到模型上（贴图主线 1-3c）：内核的显卡接口建在渲染器的画面上（第一次建画板时）；换文件 = editor.docEpoch 变 = 全部销毁。没有画板 = 渲染器每帧不多做事。
const paintTileJobs = initPaintTileJobs({ log: (m) => note("paint", m) });   // 画画内核的图块池：额度、压缩、泄漏上报开机就接；空闲 / 切后台压只在有画板时跑（0-3a；第一块画板之前）
/** 文件锁着吗（画画这一层问的那一处）：输入闸上是锁 = 交出那条锁的理由（和编辑器说同一句），能改 = null。锁的真值只在输入闸（v0.19.48）。 */
function paintEditLocked(): string | null { const h = inputGate.held(); return h?.kind === "lock" ? h.why : null; }
const paintBoards = browserPaintBoards(() => editor.renderer3.paintGl(), () => editor.docEpoch, paintEditLocked, (m) => note("paint", m), () => editor.renderer3.resetPaintState(),
  (texture, why, tell) => {   // 内核说这张画以前的步全作废：三维的栈摘掉它的记录；状态不可信那一种告诉用户（1-8a）
    editor.dropUndoRecords(PAINT_UNDO_KIND, (d) => (d as PaintRec).tex === texture);
    if (tell) notify({ text: `「${editor.sceneRef.textures.get(texture)?.name ?? "画"}」这张画的撤销记录清掉了：${why}`, level: "warning" });
  },
  (on) => { paintTileJobs.driver.setActive(on); if (!on) paintSaver.clear(); },   // 有画板才跑空闲压缩（0-3a）；画板全扔了（换文件）= 画的存盘缓存也清（1-8b）
  (text) => { note("paint", text); notify({ text, level: "warning" }); });   // 这张画只能看不能画：明说为什么（1-8b）
const paintSaver = new PaintSaver({ boards: paintBoards, wroteWith: `catsup ${APP_VERSION}`, log: (m) => note("paint", m) });   // 画存进文件（1-8b）：钉点同步、编码异步
// 画板要睡之前（施工单十九第 3 刀）：趁醒着把这张画钉进存盘缓存（同步合成读回、后台编码），之后存盘碰到这块睡着的画板直接用缓存、不用叫醒
paintBoards.beforeSleep = (g) => { paintSaver.prime(editor.sceneRef, g)?.catch((e) => note("paint", `prime before sleep failed for ${g}: ${e instanceof Error ? e.message : String(e)}`)); };
editor.registerUndoComponent(paintBoards.undoComponent());
paintAfterCommit = () => { paintBoards.follow(editor.sceneRef); for (const r of paintBoards.takePending()) editor.recordUndo(PAINT_UNDO_KIND, r); };
paintBeforeHistoryMove = () => paintBoards.cancelOpen() > 0;
editor.provider.setPaint(paintBoards);
const paintPrep = new SpacePrep(() => editor.renderer3.offscreenGpu(), () => editor.docEpoch);   // 画画的准备（1-4c）：整份几何 + 每格的表，进工作台时建、落笔只取现成的；换文件自己放
editor.beforeRender = () => { paintPrep.checkEpoch(); paintWb?.tick(); paintBoards.prepare(editor.sceneRef); canvasWin?.frame(); };   // 画布小窗：落定的内容变了才读回一次（一笔当中不读）   // 每帧开画之前的「准备」（1-4b 统筹 B）：画画工作台的准备 / 热画、画板跟大小、这一笔的薄层、合成

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
  // 画画工作台（贴图主线 1-7）：笔 / 橡皮 / 吸管
  { tool: "paintPen", icon: "pencil", label: "笔" }, { tool: "paintEraser", icon: "eraser", label: "橡皮" }, { tool: "eyedrop", icon: "eyedropper", label: "吸管" }, { tool: "paintBucket", icon: "paint-bucket", label: "油漆桶" },   // 油漆桶 2026-11-13（user 的叫法）
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
    { id: "delete", layer: "geometry", label: "删除", icon: "trash-can", danger: true, hidden: !editor.hasAnySelection() },   // 网格体的点 / 边 / 面也能删了（v0.15.22）
    { id: "group", layer: "geometry", label: "建组", icon: "collection", hidden: brepOnly || (!editor.hasGeometrySelection() && !editor.hasPoolSelection()) },   // 选了组 / 组件也能建（装进去，2026-10-26 嵌套）
    { id: "component", layer: "geometry", label: "建组件", icon: "object", hidden: !editor.canMakeComponent() },   // 网格体里 = 选中的面做成嵌在这一层的组件（v0.16.37）
    // 物件层动词（炸开 / 合并 / 做成唯一 / 锁 / 解锁 / 藏 / 应用缩放）= 注册表物件族（editor/objects/verbs.ts）放在 objectMenu 面上的动作：一份实现、按单位种类路由、每个工作台自动都有（只能退订）
    ...editor.commandMenu("objectMenu").map((m): HudItem => ({ id: `action:${m.id}`, layer: "child", label: m.label, icon: m.icon })),
    { id: "explodeGroups", layer: "child", label: "炸开组", icon: "explode-folder", hidden: !editor.hasGroupSelection() },   // 组 = 硬表面的分区，不是物件：手写
    { id: "mirror", layer: "geometry", label: "镜像…", icon: "flip-horizontal", hidden: brepOnly || !editor.hasActableSelection() || editor.mirrorActive() },   // DT23（user 2026-10-25「你选中，右键mirror之后……」）
    { id: "weld", layer: "geometry", label: "焊接", icon: "arc", hidden: !editor.canWeldSelection() },   // B19：边链 → 一条曲线（图标 = stopgap，图标库 TODO 已登记 weld）
    { id: "explodeCurve", layer: "geometry", label: "炸开曲线", icon: "explode-folder", hidden: !editor.hasCurveSelection() },
    { id: "cut", layer: "geometry", label: "剪切", icon: "cut", hidden: !editor.hasActableSelection() },   // 剪贴板（设计稿 20261028-object-layer-and-clipboard-design §3）：几何 + 组 + 物件都走它；层级移动 = 剪切 → 走到那层 → 粘贴
    { id: "copy", layer: "geometry", label: "拷贝", icon: "copy", hidden: !editor.hasActableSelection() },
    { id: "paste", layer: "empty", label: "粘贴（原位）", icon: "paste", hidden: !editor.canPaste() },
    { id: "selectAll", layer: "empty", label: "全选", icon: "select" },   // 清空模型 = 这里全选再删（user 10-30「清空模型归右键，而且可能就是全选删除，我们这里不需要清空画布快捷键」）
    { id: "enter", layer: "child", label: "进入编辑", icon: "selection-expand", hidden: !editor.hasPoolSelection() },
    { id: "rename", layer: "child", label: "改名…", icon: "rename", hidden: editor.selectedPoolKeys().filter((k) => k.startsWith("i")).length !== 1 },   // 0.18 I4：层级窗的「…」和画布右键同一张表
    { id: "hideGeometry", layer: "geometry", label: "隐藏", icon: "visibility-hide", hidden: brepOnly || !(editor.hasGeometrySelection() || editor.hasGroupSelection()) },   // 几何 / 组的藏（硬表面）；物件的藏在上面的注册表行
    { id: "componentOrigin", layer: "child", label: "改组件原点…", icon: "axes", hidden: !editor.canEditComponentOrigin() },   // DT86：物体的指令（SU 右键「更改轴」、Blender「设置原点」）；user「专门入口同意，赞。这样小白能找到」
    // 修复指令（DT85）：有选区 = 选中的、没选 = 整个物体；含子物体默认开（数字按现在的范围算）。新指令不进 ☰（user 10-26「以后这些指令不住汉堡，等攒多了我帮他们找家」）
    { id: "repairPanel", layer: "self", label: "修复…", icon: "wrench", hidden: editor.repairPanelOpen() || !editor.repairWorth() },   // T6 / DT6 + DT9：修复面板（几步一起跑 = 一步撤销）+「检查」高亮微折软边
    // 各个修复模块自己的入口（src/editor/repairs/ 清单；user 10-26「做成可以扔的模块化的」）：拉正 / 吸到格点 / 焊断口 / 拍平 / 软边变硬 / 恢复层级…
    // 镜像（网格体的「对称」属性）2026-10-28 搬进物体窗口（object-window.ts）；硬表面的「镜像…」是一次性指令，留在几何层
    ...editor.commandMenu().map((m): HudItem => ({ id: `action:${m.id}`, layer: "geometry", label: m.label, icon: m.icon, ...(m.submenu ? { submenu: m.submenu } : {}) })),   // 注册表 contextBar 面上的动作（修复九条 + 物体族的两条转换）
    { id: "exit", layer: "empty", label: "退出一层", icon: "back", hidden: editor.contextDepth() === 0 },
    // 空处 = 你所在的这一层，它也是一个物件（user 10-30「根节点空白地方长按为什么不弹菜单？那也是一个物体啊」）：这一层的物件设置 + 全部显示（user 同日「全部显示在右键菜单就行了，没必要进视图菜单」）
    ((): HudItem => { const c = editor.hiddenCount(), n = c.instances + c.faces + c.edges; return { id: "unhideAll", layer: "empty", label: `全部显示（${n}）`, icon: "visibility-show", hidden: !n }; })(),
    { id: "objectWindowSelf", layer: "empty", label: "物件设置…", icon: "settings" },
    { id: "soften", layer: "geometry", label: "软化选区", icon: "blur", hidden: brepOnly || !editor.hasGeometrySelection() },
    { id: "harden", layer: "geometry", label: "硬化选区", icon: "sharpen", hidden: brepOnly || !editor.hasGeometrySelection() },
    { id: "connected", layer: "geometry", label: "选择连通体", icon: "select", hidden: !editor.hasGeometrySelection() && !editor.hasPointSelection() },
    { id: "loop", layer: "geometry", label: "选成环 / 洞", icon: "select", hidden: !editor.hasMeshEdgeSelection() },   // 触屏没有 Alt：选中的边扩成环 / 洞（桌面 = Alt 点边；user 10-28「alt 点边可以选择洞还是环」）
    { id: "invert", layer: "geometry", label: "反选", icon: "selection-invert", hidden: !editor.hasAnySelection() },   // Blender Ctrl+I（user 10-26「我们现在选择有shift之类的多选，反选吗」）
    { id: "deselect", layer: "geometry", label: "取消选择", icon: "x", hidden: !editor.hasAnySelection() },
    // 右键新建（FM120）：刚右键过就露（落点 = 右键那一点，吸点 / 面 / 原点 / 地面）；网格体里 = 长进这个网格体，别处 = 新的网格体组件。图标暂用 object（图标库没有基本体的图标）
    ...(Object.keys(PRIMITIVES) as PrimitiveKind[]).map((k): HudItem => { const n = PRIMITIVES[k].label; return { id: `new:${k}`, layer: "empty", label: `新建${n}`, icon: "object", hidden: !editor.contextNewAllowed(), submenu: { label: "新建", item: n } }; }),   // 右键菜单里收进「新建 ›」子菜单（user 10-27「新建能不能收到一个子菜单里面」）   // user 2026-10-24「有东西选择的时候应该永远有取消选择的上下文胶囊」
  ]; },
  vr: (): HudItem[] => [
    { id: "noclip", label: locomotion.noclip ? "飞行中" : "穿墙飞行", active: locomotion.noclip },
    { id: "respawn", label: "回出生点" },
    { id: "exitvr", label: "退出 VR", danger: true },
  ],
  status: () => withSyncStatus(hintEl.textContent ?? ""),   // 只有 VR 手腕面板读（桌面有离线常驻条）
  pick: (id) => {
    if (id === "paint" && editor.tool === "paint") { toggleMatSheet(matSheet.hidden); return; }   // 油漆桶已选中再点 = 材质面板（WeebPaint 画笔再点开面板同款；材质钮撤了）
    if (id === "walk") { pickWalk(); return; }   // 验证工作台的「步行」：放置 → FPS（原地编辑里再点 = 继续走）
    if ((TOOLS as readonly string[]).includes(id)) { if (locomotion.isPlacing()) locomotion.cancelPlace(); editor.setTool(id as Tool); return; }
    if (id === "action:shelve") { void shelfActions.putSelected(); return; }   // 没起名的先问名字（动作层，shelf-actions.ts）
    if (id.startsWith("action:")) { editor.runAction(id.slice("action:".length)); return; }
    if (id.startsWith("new:")) { editor.addPrimitive(id.slice(4) as PrimitiveKind); syncUi(); return; }
    if (id === "objectWindowSelf") { objectBtn.click(); return; }   // 空处菜单的「物件设置…」= 这一层（左上物件钮那一份）
    if (id === "objectWindow") { openObjectWindow(editor, hud, "children", objectBtn, { after: syncUi, openMachine: (m) => openMachineBoard(m, objectBtn) }, "start"); return; }   // 子组件物体菜单 / 浮条的「物体设置…」：窗口的家 = 右边物体钮
    switch (id) {
      case "undo": editor.undo(); break;
      case "redo": editor.redo(); break;
      case "delete": editor.deleteSelection(); break;
      case "cut": editor.cutSelection(); break;
      case "copy": editor.copySelection(); break;
      case "paste": editor.pasteClipboard(); break;
      case "selectAll": editor.selectAll(); break;
      case "rename": void renameSelected(); break;
      case "renameRoot": void renameRoot(); break;
      case "unhideAll": editor.unhideAll(); break;
      case "deselect": editor.cancel(); break;
      case "group": editor.makeGroup(); break;
      case "component": editor.makeComponent(hex4()); break;
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
  (RAIL_FIXED_FOLD[editor.modeId] ?? []).forEach((fold, fi) => {   // 折叠组（一个工作台可以有几组）：按组记用过的
    const head = fold.pool.find((h) => h === t || (RAIL_FIXED_FLYOUTS[editor.modeId]?.[h] ?? []).includes(t));
    if (head) { const k = `${editor.modeId}:${fi}`, l = foldUsed.get(k) ?? []; bumpFront(l, head); foldUsed.set(k, l); }
  });
  for (const g of RAIL_GROUPS) {
    if (g.pool.includes(t)) bumpFront(usedPool.get(g.id)!, t);
    if (g.pinned.includes(t) || g.pool.includes(t)) bumpFront(groupMru.get(g.id)!, t);
  }
}
const LONG_PRESS_MS = RAIL_FLYOUT_PRESS_MS;   // 小三角格长按弹整组（feel.ts；user 10-28 夜「有点长」→ 260 ms）
const flyoutItems = (tools: Tool[]) => tools.map((x) => { const s2 = specOf(x); return { id: x, label: s2.label, icon: s2.icon, hint: s2.key, checked: editor.tool === x, disabled: editor.locked && !isReadOnlyTool(x) }; });
const mkToolBtn = (t: Tool, flyout?: () => Tool[]): HTMLButtonElement => {
  const sp = specOf(t);
  const b = document.createElement("button");
  // 按上下文换脸（controller/rail-face.ts；user 10-28 晚「有选区的时候删除的tool能变成小垃圾桶然后点了直接删吗」）：换了脸 = 图标 / 字 / 提示都换，点了跑键表同一条动作
  const face = railFace(t, { mode: editor.modeId, anySelection: editor.hasAnySelection(), gesture: editor.isGestureActive() });
  if (face) {
    b.type = "button"; b.className = "tool rail-face"; b.dataset.face = face.action; b.title = face.tip;
    b.innerHTML = `${iconHtml(face.icon)}<span class="tool-label"></span>`;
    (b.querySelector(".tool-label") as HTMLElement).textContent = face.label;
    b.addEventListener("click", () => { if (editor.isGestureActive()) editor.abortGesture(); runKeyAction(face.action, new KeyboardEvent("keydown")); syncUi(); });   // 操作做到一半点它 = 先取消那个操作（选区不动）再删
    if (editor.locked) { b.classList.add("held"); b.title = `${face.tip}（${HINT_LOCKED}）`; }   // 第四层（输入闸）：看得见为什么不行；点了编辑器的口说一样的话
    return b;
  }
  b.type = "button"; b.className = "tool"; b.title = sp.key ? `${sp.label}（${sp.key}）` : sp.label;
  // 再点一下拿着的这把 = 换到另一种做法（controller/second-mode.ts；user 10-30「2同意」）；在另一种做法上 = 角上一个字
  const sm = secondModeOf(t, editor.modeId), second = sm?.kind === "option" && onSecond(sm, editor.config.get(t as never, sm.key as never)) ? sm : null;
  b.innerHTML = `${iconHtml(sp.icon)}<span class="tool-label"></span>${flyout ? '<span class="tool-flyout" aria-hidden="true"></span>' : ""}${second ? '<span class="tool-badge" aria-hidden="true"></span>' : ""}`;
  (b.querySelector(".tool-label") as HTMLElement).textContent = sp.label;
  if (second) { (b.querySelector(".tool-badge") as HTMLElement).textContent = second.badge; b.title += ` · 现在：${second.name}（再点一下换回；按住 ${second.mod} 临时换回）`; }
  if (editor.locked && !isReadOnlyTool(t)) { b.classList.add("held"); b.title = `${sp.label}（${HINT_LOCKED}）`; }   // 第四层（输入闸）：只读工具不灰，别的灰、点了说为什么
  const pick = (): void => { if (t === editor.tool && flipSecondMode(t)) return; hud.pick(t); };
  if (!flyout) { b.addEventListener("click", pick); return b; }
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
  b.addEventListener("click", (ev) => { if (inCorner(ev)) openFlyout(); else pick(); });
  b.addEventListener("contextmenu", (ev) => { ev.preventDefault(); openFlyout(); });
  return b;
};
/** 拿着的工具再被点一下：有另一种做法就切过去（选项 / 换工具），提示行说现在是哪种、怎么换回；没有 = false（照常 pick）。 */
function flipSecondMode(t: Tool): boolean {
  const sm = secondModeOf(t, editor.modeId);
  if (!sm) return false;
  if (sm.kind === "swap") { hud.pick(sm.to); hintEl.textContent = `${specOf(sm.to).label}（再点一下换回${specOf(t).label}）`; return true; }
  const entry = editor.config.entries(t).find((e) => e.key === sm.key);
  if (!entry) return false;
  const values = entry.def.kind === "enum" ? entry.def.values : undefined, next = flippedValue(sm, entry.value, values);
  editor.config.set(t as never, sm.key as never, next as never);
  const nowSecond = onSecond(sm, next), firstName = values?.find((v) => v.id !== sm.alt)?.label ?? `不${sm.name}`;
  hintEl.textContent = `${specOf(t).label}：${nowSecond ? sm.name : firstName}（再点一下换回；按住 ${sm.mod} 临时换回）`;
  syncUi();
  return true;
}
/** 改名（0.18 物品栏纪元 I4）：选中的那一份物件——它有自己的名字（导入带来的）就改它自己的，没有就改组件名（摆了几份都跟着变，提示说清几份）；
 *  组件名清空 = 四位码（user 10-30「没有赋予名字的全用四位hash这种」）。一条指令、一步撤销。 */
async function renameSelected(): Promise<void> {
  const keys = editor.selectedPoolKeys().filter((k) => k.startsWith("i"));
  if (keys.length !== 1) return;
  const s = editor.sceneRef, def = s.defOfContext(editor.context), inst = s.instance(def, Number(keys[0].slice(1)));
  const own = inst.name !== undefined, copies = [...s.defs.values()].reduce((n, d) => n + [...d.instances.values()].filter((i) => i.def === inst.def).length, 0);
  const v = await openInputSheet(own ? "改这一份的名字" : "改组件名", { defaultValue: inst.name ?? s.def(inst.def).name, okLabel: "改名",
    message: own ? "这一份有自己的名字（导入时带进来的），只改它；清空 = 回到显示组件名" : copies > 1 ? `这个组件摆了 ${copies} 份，名字一起改；清空 = 四位码` : "清空 = 四位码" });
  if (v === null) return;
  const name = v.trim();
  editor.commitOp(own ? { op: "rename", at: { def, group: inst.parent }, instance: inst.id, name: name || null } : { op: "rename", at: { def, group: inst.parent }, def: inst.def, name: name || hex4() });
  syncUi();
}
/** 改根的名字（0.18 I13：根 = 普通组件，user 10-30「我们要和godot一样根和其他节点一视同仁……可以改名。只是没有父亲没法爆炸罢了」）：根组件的名字 ≠ 文件名；清空 = 四位码。 */
async function renameRoot(): Promise<void> {
  const s = editor.sceneRef, v = await openInputSheet("改组件名", { defaultValue: s.def(s.root).name, okLabel: "改名", message: "模型最外一层（根）也是一个组件，这是它的名字，和文件名是两回事；清空 = 四位码" });
  if (v === null) return;
  editor.commitOp({ op: "rename", at: { def: s.root, group: null }, def: s.root, name: v.trim() || hex4() });
  syncUi();
}
/** 矮的「⌄」展开条：弹整组（user「...和下箭头做矮一点」）。 */
const mkMore = (tools: Tool[]): HTMLButtonElement => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "rail-more"; b.title = "这一组的全部工具"; b.innerHTML = iconHtml("more"); b.dataset.holds = tools.join(",");   // user 10-24「工具栏用...不要用小箭头。也是黑色」
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
/** 借来的那把（快捷键临时拿起，controller/tool-borrow.ts）：蓝色空心框框在它那一格上（小三角格 = 组里有它）；左柱上看不见 = 框在收着它的「…」上。
 *  样式 .once =「只管这一下」，不挂在 .tool 上：以后快捷键按的锁（空心框只管这一下）也用它（统筹 11-13）。 */
function markBorrowed(): void {
  const t = editor.toolHeld.temp;
  if (!t) return;
  const has = (el: HTMLElement): boolean => (el.dataset.holds ?? "").split(",").includes(t);
  const tools = [...toolbarEl.querySelectorAll<HTMLElement>(".tool[data-holds]")], mores = [...toolbarEl.querySelectorAll<HTMLElement>(".rail-more[data-holds]")];
  (tools.find(has) ?? mores.find(has))?.classList.add("once");
}
function renderSlots(): void { layoutSlots(); markBorrowed(); }
function layoutSlots(): void {
  noteToolUse(editor.toolHeld.base);   // 借来的（快捷键临时拿起）不算用过：左柱不跟着长、小三角格不换脸
  toolbarEl.replaceChildren();
  const inMode = (t: Tool): boolean => editor.modeTools().includes(t);   // 左柱只排当前模式的工具（刀 ③：表面模式 = 选择 + 油漆桶）
  const add = (t: Tool, fly?: () => Tool[]): void => { if (!inMode(t)) return; const b = mkToolBtn(t, fly); b.classList.toggle("active", t === editor.toolHeld.base); b.dataset.holds = (fly ? fly() : [t]).join(","); toolbarEl.appendChild(b); };
  const fixed = RAIL_FIXED[editor.modeId];
  if (fixed) {   // 这个工作台有自己定死的一列（自由建模 / 验证）；列里的小三角组（RAIL_FIXED_FLYOUTS）= 格子显示最近用的那把
    const groups = RAIL_FIXED_FLYOUTS[editor.modeId] ?? {};
    const slot = (t: Tool): void => { const g = groups[t]; if (g) { const cur = fixedFlyCurrent.get(t) ?? t; add(cur, () => g.filter(inMode)); } else add(t); };
    const folds = RAIL_FIXED_FOLD[editor.modeId] ?? [];   // 折叠组：用过的长出来（最多 budget 格），其余收在「…」里；挂在 after 那把后面（缺 = 列尾）
    const foldAt = (fi: number): void => {
      const fold = folds[fi], heads = fold.pool.filter((h) => inMode(h) || (groups[h] ?? []).some(inMode)), shown = (foldUsed.get(`${editor.modeId}:${fi}`) ?? []).filter((h) => heads.includes(h)).slice(0, fold.budget);
      if (!heads.length) return;
      if (!fold.after) { const sep = document.createElement("div"); sep.className = "rail-sep"; toolbarEl.appendChild(sep); }   // 列尾那组和上面隔开；挂在某把后面的 = 那把的一家，不隔
      for (const h of shown) slot(h);
      if (heads.length > shown.length) toolbarEl.appendChild(mkMore(heads.flatMap((h) => groups[h] ?? [h]).filter(inMode)));
    };
    for (const t of fixed) { slot(t); folds.forEach((f, fi) => { if (f.after === t) foldAt(fi); }); }
    folds.forEach((f, fi) => { if (!f.after || !fixed.includes(f.after)) foldAt(fi); });
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
installContextMenuGuard();   // 右键兜底：哪个界面没自己的右键菜单，就不弹浏览器那份（输入框放行；ui/context-menu-guard.ts，user 10-30）
// 物品栏底部抽屉 sunset（2026-10-30，user「物品栏和物品栏按钮是不是可以sunset……素材库和层级应该用同一个screen icon。两个太多了」）：组件清单 → 层级窗「资源」页（hierarchy-window.ts）。
// 抽屉高度变量 --drawer-h 留着（styles.css，现在没人写 = 0；以后的底部抽屉——时间轴——还用这一套让 HUD 往上让）。
type MenuId = "newOpen" | "importHub" | "exportHub" | "new" | "gallery" | "save" | "saveas" | "open" | "exportProject" | "exportModel" | "cloud" | "import" | "importGlb" | "finger" | "liftGrace" | "help" | "debuglog" | "update" | "factoryReset" | "vr" | "lefthand" | `unit:${string}` | `style:${string}` | "guidesClear" | "axesReset" | "grid" | "unit:pick" | "lock" | "unlock" | "encrypt" | "decrypt" | "pwLock" | "pwForget" | "noclip" | "persp" | "xray" | "walk" | "refwin" | "unhideAll";
/** ☰ 与右上角「视图」共用一张动作表（id 不重叠）。 */
function menuPick(id: MenuId): void | "keep" {
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
      if (isPresetId(s)) { editor.renderer3.setPreset(s); syncNight(); session.setView({ style: s === "white" ? null : s }); editor.draw(); hintEl.textContent = s === "white" ? "风格：线稿" : `风格：${PRESETS[s].name}——${PRESETS[s].note}。VR 和缩略图里照旧画白模`; }
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
      case "gallery": hideCanvasTip(); void openGalleryFromUi(); break;
      case "save": smartSave(); break;
      case "saveas": void session.settleToFile(); break;
      case "open": openLocal(); break;
      case "exportProject": void session.exportProject(); break;
      case "exportModel": void openExportModel(); break;
      case "cloud": if (auth.isSignedIn()) { void cloudSignOut(); } else { cloudSignIn(); } break;
      case "import": objInput.click(); break;
      case "importGlb": glbImportInput.click(); break;
      case "finger": fingerDraws = !fingerDraws; PREF.set("fingerDraws", fingerDraws ? "1" : "0"); return "keep";
      case "liftGrace": { const i = (LIFT_GRACE_STEPS as readonly number[]).indexOf(liftGraceMs); liftGraceMs = LIFT_GRACE_STEPS[(i + 1) % LIFT_GRACE_STEPS.length]; PREF.set("liftGraceMs", String(liftGraceMs)); return "keep"; }
      case "debuglog": openDebugLogSheet(); break;
      case "persp": editor.toggleProjection(); return "keep";
      case "xray": editor.setXray(!editor.xray); return "keep";
      case "unhideAll": editor.unhideAll(); break;
      case "walk": { const on = !(locomotion.isWalking() || locomotion.isPlacing()); setWalk(on); return on ? undefined : "keep"; }   // 开 = 关菜单去点落点
      case "guidesClear": editor.clearGuides(); return "keep";
      case "grid": editor.setGrid({ on: !editor.grid.on }); return "keep";
      case "axesReset": editor.resetContextFrame(); return "keep";
      case "noclip": locomotion.setNoclip(!locomotion.noclip); return "keep";
      case "refwin": refHost.toggle(); break;   // 参考窗（视图钮旁边那颗钮 / 键表；开 = 给它焦点，开窗 → Ctrl+V 一步到位）
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
// 图库 → 新建 / 打开 → 导入 → 保存 / 导出 → 锁上（演示锁）；CatsUp 没有的改名 / 加密 / 回到打开时版本不出现。版图 = ai-docs/20261024-ui-layout.md
// ☰ 的页签和每页放哪几行 = 放置表 src/controller/placement.ts（MENU_TABS / MENU_ROWS）；这里只管每行长什么样（字 / 图标 / 动态的勾和数字）
type MainMenuId = MenuId | GridMenuId | RefMenuId;
/** 开 / 关 ☰；tab = 直接停在那一页。（吸附钮长按的「单位设置…」11-13 起去右上渲染窗的「单位」页。） */
function openMainMenu(tab?: string): void {
  const opts = {
    anchor: btnMenu, tabs: MENU_TABS, tabKey: "main", ...(tab ? { tab } : {}),
    items: () => MENU_ROWS.flatMap((r) => { const it = menuRow(r.id); return it ? [{ ...it, tab: r.tab, ...(r.section ? { sectionBefore: r.section } : {}), ...(r.separatorBefore ? { separatorBefore: true } : {}) }] : []; }),
    onPick: (id: MainMenuId): void | "keep" => { if (isRefId(id)) return onRefPick(id); if (isGridId(id)) { onGridPick(id); syncUi(); return "keep"; } return menuPick(id as MenuId); },
  };
  mainMenuHandle = tab ? openPopupMenu<MainMenuId>(opts) : togglePopupMenu<MainMenuId>(opts);
}
btnMenu.addEventListener("click", () => openMainMenu());
/** ☰ 一行长什么样（放哪 = 放置表 MENU_ROWS）；null = 这一行现在不露。文件页 = WeebPaint 合租法：保存走顶栏保存钮（Ctrl+S），登录走保存时的问询与图库页云账号钮——都不占菜单行。 */
function menuRow(id: string): Omit<PopupMenuItem<MainMenuId>, "tab"> | null {
  switch (id) {
    case "unitSystem": return unitRow("system");
    case "unitSnap": return unitRow("snap");
    case "unitPlane": return unitRow("plane");
    case "scaleRef": return scaleRefRow();
    case "gallery": return { id: "gallery", label: "图库", icon: "gallery", ...(hasStore() ? {} : { hint: "本机 + OneDrive" }) };
    case "lefthand": return vr.isSupported() ? { id: "lefthand", label: "VR 左手持笔", checked: leftHanded, hint: "面板换到右手" } : null;
    case "newOpen": return { id: "newOpen", label: "新建 / 打开…", icon: "new", hint: "Ctrl+O" };   // 加号（user 10-29「所以新建打开还是用加号。导入用导入符号」，账本 T137）
    case "importHub": return { id: "importHub", label: "导入…", icon: "import", hint: editor.locked ? "锁着，解锁才能导入" : "别的软件的 glb / OBJ", disabled: editor.locked };   // 导入单独一行、在新建打开下面（user 10-29「导入必须单独放……新建打开下面专门放一个导入」）
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
    case "finger": return { id: "finger", label: "手指也能画", checked: fingerDraws, ...(gestures.penEverSeen() ? { hint: "已见过笔，手指=相机" } : {}) };
    case "liftGrace": return { id: "liftGrace", label: `抬笔宽限 ${liftGraceMs} 毫秒`, hint: "点一下换一档；刀这类工具里笔抬起先等这么久，屏幕断触一下不算抬笔" };
    case "factoryReset": return { id: "factoryReset", label: "还原出厂设置…", icon: "trash-can", hint: "两步确认" };
    case "help": return { id: "help", label: "使用手册", icon: "help" };
    case "debuglog": return { id: "debuglog", label: "调试日志", icon: "wrench", hint: "复制给开发者" };
    case "update": return { id: "update", label: "强制更新", icon: "refresh", hint: APP_VERSION.replace(/-\d{4}-\d{2}-\d{2}$/, "") };   // WeebPaint 同款：版本号 = 行尾小字（user 10-24「字超了……weebpaint用的应该是小字」）
  }
  return null;
}

// ---------- 移动（步行相机 / VR 共用的 player）----------
const locomotion = new Locomotion(editor, canvas);
editor.viewExtras = () => ({ near: locomotion.isWalking() ? 0.05 : undefined, teleport: locomotion.teleportArc(), capsule: locomotion.placeGhost(), peekFaces: canvasWin?.peekWorld() ?? null });   // peekFaces = 画布小窗里悬停的面（施工单十六）
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
// 步行设置 = 浮窗（user 10-29「步行相机的马前炮太长了挡住了很多屏幕没法选，特别是屏幕下缘，能不能就一个设置然后弹一个小窗口」）：
// 关着时右下角只有钮（设置… / 在相机这里出生 / 取消）；开着时这一段参数区整个搬进窗里（vcb.setParamsHome，修复板同一个口），八项 + 跳多高多远都在窗里
// eslint-disable-next-line no-var
var walkWin: FloatWin | null = null;
const PLACE_TITLE = "步行：点一下落在哪";
function openWalkSettings(): void {
  const w = (walkWin ??= createFloatWin({ id: "walk", title: "步行设置", store: WIN_POS, onOpenChange: (o) => { vcb.setParamsHome(o ? w.body : null, () => editor.paramPanel()?.title === PLACE_TITLE); syncUi(); } }));
  w.open($("vcb"), "beside");
}
function placeSession(): ParamSession {
  const full = (): boolean => !!walkWin?.isOpen();
  const s: ParamSession = {
    phase: "before", title: PLACE_TITLE,
    get fields() { return full() ? AVATAR_FIELDS : []; },
    get buttons() { return full() ? [{ key: "here", label: "在相机这里出生" }, { key: "reset", label: "恢复默认" }, { key: "cancel", label: "取消" }] : [{ key: "settings", label: "设置…" }, { key: "here", label: "在相机这里出生" }, { key: "cancel", label: "取消" }]; },
    get values() { const a = resolveAvatar(locomotion.avatar); return Object.fromEntries(AVATAR_FIELDS.map((f) => [f.key, a[f.key]])); },
    get note() {
      const why = locomotion.placeWhy();
      if (!full()) return why ?? "绿 = 站得下，红 = 站不下";   // 关着窗：一句话，不占屏幕下缘
      const b = locomotion.body(), j = jumpReach(b);
      const reach = `跳 ${formatQuantity(j.height, LEN)}、空中 ${j.airtime.toFixed(2)} s，走着跳远 ${formatQuantity(j.walk, LEN)}、跑着 ${formatQuantity(j.run, LEN)}（跑 ${formatQuantity(b.dashSpeed, FOOT)}；落回起跳高度时算）`;
      return `${why ?? "绿 = 站得下，红 = 站不下"} ｜ ${reach}`;
    },
    set(key, value) {
      const v = Number(value);
      if (!Number.isFinite(v) || !AVATAR_FIELDS.some((f) => f.key === key)) return;
      locomotion.avatar = { ...locomotion.avatar, [key]: v } as AvatarSpec;
      locomotion.refreshGhost();
    },
    press(key) { if (key === "settings") { openWalkSettings(); return; } if (key === "here") locomotion.placeAtCamera(); else if (key === "cancel") locomotion.cancelPlace(); else if (key === "reset") { locomotion.avatar = AVATAR_DEFAULT; locomotion.refreshGhost(); } },
    dispose() { walkWin?.close(); if (locomotion.isPlacing()) locomotion.cancelPlace(); },   // 放置结束 = 设置窗一起收（参数区搬回右下角）
  };
  return s;
}
// 上方正中那一颗主按钮（施工单十五第三节 = 版图文档 2026-11-11 追记；app/primary-button.ts）：一张表按先后只露一颗——
// 原地编辑里「继续走」（低调）→ 画画工作台里还没画的物件「开始画…」/ 选中的面里有没进画的「把这几张面加进来」（醒目）→ 平时浏览器支持 VR「进入 VR」（低调）。
// user 10-28「只有一个按钮」「这个按钮做的和嵌入的那些汉堡符号一样低调一点就是enter webxr 这种半灰的感觉，不抢眼」（低调的那两行照旧）；
// user 11-11「需要有一个挂在上面居中按钮，点了弹窗」（开始画那一行醒目）。
const walkBar = $("walkBar"), walkBtn = $<HTMLButtonElement>("walkBtn");
/** 画画工作台里这一刻该不该露「开始画…」：start = 这个物件一张画都没有；add = 有画、选中的面里有还没进画的（面板上两种都给）；null = 不露。 */
function paintPrimary(): "start" | "add" | null {
  if (!isPaintTool(editor.tool)) return null;
  const S = editor.sceneRef, def = S.defOfContext(editor.context);
  if (S.def(def).body.kind !== "mesh") return null;
  const picked = editor.selectedMeshFaces(), u = { def, sel: picked.length ? ({ kind: "mesh", faces: new Set(picked), edges: new Set(), verts: new Set() } satisfies MeshSelection) : null };
  if (!latestPaintOf(S, def)) return facesToStart(S, u).length ? "start" : null;
  return unpaintedSelected(S, u).length ? "add" : null;
}
const primary = mountPrimaryButton(walkBar, walkBtn, [
  { id: "walk", loud: false, edits: false, when: () => locomotion.walkPhase() === "edit", label: () => "继续走", press: () => locomotion.resumeWalk() },
  { id: "paint", loud: true, edits: true, when: () => paintPrimary() !== null, label: () => "开始画…", press: () => {
    void pickPaintStart(editor).then((c) => {   // 物件有画、选了没进画的面：面板上「加进已有的画」和「新开一张」两种都给（施工单十五第三节）
      if (!c) return;
      if (c.kind === "add") editor.runAction("mesh.paintAddFaces", { tex: c.tex });
      else if (c.kind === "density") editor.runAction("mesh.startPaint", { density: c.density, arrange: "patches" });   // 按一格多大（施工单十六第四节）：画布接近正方形、以后能长大
      else editor.runAction("mesh.startPaint", { canvas: c.canvas, arrange: "patches" });   // 界面发出去的永远带画布和铺法
      syncUi(); editor.draw();
    });
  } },
  { id: "vr", loud: false, edits: false, when: () => locomotion.walkPhase() === "off" && !locomotion.isXR() && vr.isSupported() && !vr.isPresenting(), label: () => "进入 VR", press: () => vr.enter() },
], () => inputGate.held(), (t) => { hintEl.textContent = t; });
function syncWalkBar(): void { primary.sync(); }
// 触屏摇杆（吃鸡式，FM142）：有触屏的设备、FPS 阶段才露
const touchCtl = new TouchControls(stage, { lookRad: (y, p) => locomotion.lookRad(y, p), editInPlace: () => locomotion.editInPlace(), leave: () => locomotion.exitWalk() });
locomotion.touch = () => touchCtl.read();
/** 验证工作台的「步行」工具：原地编辑里 = 继续走；平时 = 拿起工具 + 进放置。 */
function pickWalk(): void {
  if (locomotion.isEditInPlace()) { locomotion.resumeWalk(); return; }
  takeTool("walk");   // 步行在「验证」工作台：明着换过去（以前靠 setTool 悄悄换）
  if (!locomotion.isPlacing() && !locomotion.isWalking()) setWalk(true);
}
locomotion.onPhase = () => {
  if (locomotion.walkPhase() === "off" && editor.tool === "walk") editor.setTool("select");   // 离开步行 / 取消放置 = 放下步行工具（什么都没发生过）
  touchCtl.setVisible(locomotion.isFps() && TouchControls.available());
  if (!locomotion.isPlacing() && editor.paramPanel()?.title === PLACE_TITLE) editor.openParamSession(null);
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
    if (tool === "paintPen" || tool === "paintEraser" || tool === "eyedrop" || tool === "paintBucket") return [{ id: "paintColor", label: "颜色", swatch: hexOf(paintColor.get()), title: `画笔的颜色 ${hexOf(paintColor.get())}（点开换：色块 / 填颜色代码；吸管从模型上取）`, onClick: () => { paintColorSheet.open(); } }];   // 画画（1-7）：选颜色只有一个入口
    if (tool !== "paint") return [];
    const p = editor.paint;
    const swatch = p === null ? "#d6d6d6" : p.kind === "back" ? BACK_SWATCH : p.kind === "color" ? `rgb(${Math.round(p.color[0] * 255)}, ${Math.round(p.color[1] * 255)}, ${Math.round(p.color[2] * 255)})` : `center / cover url(${textureUrl(p.bytes, p.mimeType)})`;
    const H = editor.toolHandler("paint") as { eyedropper?: boolean } | undefined;
    return [
      { id: "paintPick", label: p === null ? "默认正面" : p.name, swatch, title: "当前材质（点开换）", onClick: () => { toggleMatSheet(true); } },
      { id: "eyedropper", label: "吸色", active: !!H?.eyedropper, title: "吸色：点一张面读它的材质（Ctrl / Alt 按住 = 临时）", onClick: () => { if (H) H.eyedropper = !H.eyedropper; } },
    ];
  },
  actions: (tool) => (editor.locked ? [] : [...toolActions(tool), ...deleteAction()]),   // 第四层（输入闸）：工具动作（清参考几何 / 重置轴 / 删除）都改模型，锁着不露
  // 笔 / 手指：右下只留「删除」+「更多…」（= 右键同一份菜单）；别的可选操作都在菜单里（user 10-28 夜截图「可选操作应该放到右键菜单里而不是全堆在马后炮，好好整理一下」）
  selection: () => {
    if (editor.locked || selectionRoute(lastPointerType) !== "bar" || !editor.hasAnySelection() || editor.isGestureActive()) return [];   // 锁着：和右键菜单一样不出
    const all = barItems(editor, hud).filter((it) => !it.hidden), del = all.filter((it) => it.id === "delete");
    return [...del, ...(all.length > del.length ? [{ id: "selMore", label: "更多…", icon: "more" } as HudItem] : [])];
  },
  pickSelection: (id, el) => { if (id === "selMore") { if (el) openSelectionMenu(editor, hud, el); return; } hud.pick(id as never); },
  afterRender: () => { vcbRef?.render(); },
});
/** 自由建模有选区时右下的「删除」（user 10-28 夜「delete变成按钮可能不大好。吃书吧。变成右下的一个按钮？」：左柱垃圾桶撤回）；笔 / 手指的选区条里本来就有删除，不重复。 */
function deleteAction(): { id: string; label: string; icon?: string; title?: string; onClick(): void }[] {
  if (editor.modeId !== "freeform" || !editor.hasActableSelection() || editor.isGestureActive() || selectionRoute(lastPointerType) === "bar") return [];
  return [{ id: "deleteSel", label: "删除", icon: "trash-can", title: "删除选中的（Delete / X，一步撤销）", onClick: () => { editor.deleteSelection(); syncUi(); } }];
}
function toolActions(tool: string): { id: string; label: string; title?: string; disabled?: boolean; active?: boolean; onClick(el?: HTMLElement): void }[] {
    // 画画工作台的「读数」（贴图主线 1-4d 第 1 条）：每帧各段各花几毫秒的小角标；只在这一次打开里记
    if (isPaintTool(tool)) return [{ id: "paintMeter", label: "读数", active: paintMeter.on, title: "每帧读数：这一帧各段（收点 / 打射线 / 走步 / 找面 / 画薄层 / 合成 / 拷贝 / 缩小图 / 画场景）各花几毫秒、最近一秒掉了几帧（只在这一次打开里记）", onClick: () => { if (meterBadge?.toggle() === false) setDisplayPath("auto", false); meterBadge?.sync(true); syncUi(); editor.draw(); } },
      // 读数开着才露（统筹 11-11；只在这一次打开里）：走法三档、核对。关读数 = 两个都回到正式的样子（不留着一条看不见的慢路）
      ...(paintMeter.on ? [
        { id: "paintPath", label: `走法：${DISPLAY_PATH_LABELS[displayDiag.path]}`, title: "显示那条链走哪条路：自动 = 只做这一帧改到的格（正式）→ 强制整张（同一个着色器每帧全做，量省了多少）→ 测量用（整张 + 驱动做缩小图 = 改之前那条路，量会不会负优化；远看的颜色可能和没画过的画差一点）", onClick: () => { setDisplayPath(DISPLAY_PATHS[(DISPLAY_PATHS.indexOf(displayDiag.path) + 1) % DISPLAY_PATHS.length], displayDiag.check); syncUi(); editor.draw(); } },
        { id: "paintCheck", label: "核对", active: displayDiag.check, title: `每 ${CHECK_EVERY} 帧和每次抬笔之后：正显示着的（内核合成图 + 显示图每一级）和强制整张重来的逐字节比；对不上记进调试日志、角标亮一下。核对的那一帧不算进读数`, onClick: () => { displayDiag.check = !displayDiag.check; displayDiag.penUp = false; syncUi(); editor.draw(); } },
      ] : [])];
    // 压平（W-5 2026-11-10 Opus；白模第一批第 2 条：iPad 上不用键盘、不用进手势就能「S X 0」）：缩放工具、没在做手势、右键「压平 ›」这会儿有东西（= 自由建模 + 选了点；放置表管工作台，这里不判 modeId）= 右下角「压平…」，弹的是那同一份
    if (tool === "scale" && !editor.isGestureActive() && submenuItems(hud, "压平").length) return [{ id: "flattenMenu", label: "压平…", title: "把选中的点沿一个方向压平：X / Y / Z / 这圈的朝向，镜像开着时还能压到镜像面（和右键「压平」同一份；一步撤销）", onClick: (el) => { if (el) openSubmenuAt(hud, el, "压平"); } }];
    // 画画工作台的「开始画…」/「把这几张面加进来」不在这里：上方正中的主按钮（施工单十五第三节；user「马后炮是高级配置，而不是核心工作流步骤」）
    if (tool === "axes") return [{ id: "axesReset", label: "重置坐标架", title: "最外层 = 回到世界；组里 = 回到外面那层的；组件里 = 回到组件原点", onClick: () => { menuPick("axesReset"); } }, ...(editor.hasActableSelection() ? [{ id: "axesToSel", label: "移到选择中心", title: "坐标架原点移到选区的中心（之后右下角可换算法）", onClick: () => { editor.axesToSelectionCenter(); syncUi(); } }] : []), ...(editor.inComponentRoot() ? [{ id: "axesToOrigin", label: "设为组件原点", title: "把组件原点对到现在的坐标架（组件里：几何反挪、每份实例补，世界里不动；最外层：整个模型挪过去，视角跟着平移、屏幕上不动；一步撤销）", onClick: () => { editor.setComponentOriginToFrame(); syncUi(); } }] : [])];   // DT86 user「比起被记住的开关我建议是一个可以随手按一下的按钮」   // user 2026-10-25「轴的context菜单里面没有移动到选择。这个blender里面我天天用」
    if (tool === "tape" || tool === "protractor" || tool === "compass") return [{ id: "guidesClear", label: "删除所有参考几何", disabled: !editor.hasGuides(), onClick: () => { menuPick("guidesClear"); } }];
    if (tool === "transform") {   // 临时变换中心（user 2026-10-26「变换的时候右下角有一个pick pivot选项，然后你可以pick, 用对齐引擎，以及可能的grid」）
      const H = editor.toolHandler("transform") as { picking?: boolean; hasTempPivot?: boolean; startPickPivot?(): void; clearPivot?(): void } | undefined;
      if (!H?.startPickPivot || !editor.hasActableSelection()) return [];   // 只有硬表面的变换工具会拾临时变换中心（自由建模的变换没有这一项）
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
// 「单位」页 + 吸附钮菜单的选项 id（user 10-30「把显示长度单位，grid制式，格距收成一个东西。就是单位」）
type GridMenuId = `sys:${string}` | `snap:${number}` | `plane:${string}` | "off" | "on";
/** 左上编辑模式下拉框（硬表面建模 / 表面；以后 + 有机体建模）。 */
function renderModeSelect(): void {
  modeField?.refresh();
}
/** 吸附长度的几档（下拉 / 吸附钮长按共用）：本单位制的档；这个模型存的长度不在档里（老文件的 1 m ÷ 5 之类）就排最前面、照样勾着。 */
function snapChoices(): { id: GridMenuId; label: string; checked: boolean; hint?: string }[] {
  const g = editor.grid, lv = snapLevels(g.system), on = (m: number): boolean => Math.abs(m - g.snap) < 1e-12;
  const out = lv.map((m) => ({ id: `snap:${m}` as GridMenuId, label: snapLabel(m, g.system), checked: on(m) }));
  return lv.some(on) ? out : [{ id: `snap:${g.snap}` as GridMenuId, label: snapLabel(g.snap, g.system), checked: true, hint: "这个模型原来的" }, ...out];
}
/** ☰「单位」页的三行（user 10-30：单位跟文件走、搬进 ☰；以前住视图窗）：单位制 = 显示 / 输入的长度单位 + 网格怎么进位 + 吸附有哪几档一起换；吸附长度；栅格面（关 = 网格和三色轴都不画）。吸附开关在右上角那颗钮（外面能按的不进这里）。 */
function unitRow(which: "system" | "snap" | "plane"): { id: GridMenuId; label: string; choices: { id: GridMenuId; label: string; hint?: string; checked?: boolean }[] } {
  const g = editor.grid;
  if (which === "system") return { id: `sys:${g.system}` as GridMenuId, label: "单位制", choices: UNIT_SYSTEMS.map((u) => ({ id: `sys:${u.id}` as GridMenuId, label: u.label, hint: u.hint, checked: g.system === u.id })) };
  if (which === "snap") return { id: `snap:${g.snap}` as GridMenuId, label: "吸附", choices: snapChoices() };
  return { id: g.shown ? `plane:${g.plane}` as GridMenuId : "plane:off", label: "栅格面", choices: [
    ...GRID_PLANES.map((p) => ({ id: `plane:${p.id}` as GridMenuId, label: p.label, checked: g.shown && g.plane === p.id, hint: p.id === "xy" ? "画平面" : "画立面：空处落点也在这面上" })),
    { id: "plane:off", label: "关", checked: !g.shown, hint: "网格和三色轴都不画；吸附照旧归右上角那颗钮" },
  ] };
}
/** 吸附钮的菜单（右键 / 长按）：锁 + 跳到视图汉堡的「栅格」页。栅格设置不在这里重复一份。 */
function snapMenuItems(): { id: GridMenuId | "gridSettings"; label: string; checked?: boolean; hint?: string; separatorBefore?: boolean; sectionBefore?: string }[] {
  // 硬表面：最上面直接列吸附长度（点一下就换，不用进设置；user 10-30「长按是弹一个让你选。不然一个一个轮换太慢了」）
  const sub = snapSwitchLook(editor.modeId).length ? snapChoices().map((c, i) => (i === 0 ? { ...c, sectionBefore: "吸附长度" } : c)) : [];
  // 栅格面（user 10-30「栅格面要不要也放到这里」→「do it 以及不显示选项也有对吧」）：画立面时要来回切，和吸附长度一样是手上的；☰ 单位页照留一份
  const g = editor.grid, planes = [...GRID_PLANES.map((p, i) => ({ id: `plane:${p.id}` as GridMenuId, label: p.label, checked: g.shown && g.plane === p.id, ...(i === 0 ? { sectionBefore: "栅格面", ...(sub.length ? { separatorBefore: true } : {}) } : {}) })),
    { id: "plane:off" as GridMenuId, label: "关（不显示网格）", checked: !g.shown, hint: "吸附照旧" }];
  return [...sub, ...planes, { id: "gridSettings", label: "单位设置…", separatorBefore: true, hint: "渲染窗 · 单位" }];   // 锁的几项搬到右上角锁的三行（白模 W-6，2026-11-10）
}
const isGridId = (id: string): id is GridMenuId => /^(sys|snap|plane):/.test(id) || id === "on" || id === "off";
function onGridPick(id: GridMenuId): "keep" | void {
    if (id === "on") { editor.setGrid({ on: true }); syncUi(); return "keep"; }

    if (id === "off") { editor.setGrid({ on: false }); syncUi(); return; }
    if (id.startsWith("sys:")) { const sys = id.slice(4); if (isUnitSystem(sys) && sys !== editor.grid.system) editor.setGrid({ system: sys, snap: DEFAULT_SNAP[sys] }); }   // 换单位制 = 吸附落到那一制的默认档
    else if (id === "plane:off") editor.setGrid({ shown: false });
    else if (id.startsWith("plane:")) editor.setGrid({ plane: id.slice(6) as GridPlane, shown: true });
    else if (id.startsWith("snap:")) { const m = Number(id.slice(5)); if (m > 0 && Number.isFinite(m)) editor.setGrid({ snap: m }); }
    syncUi();   // 吸附钮右上角的长度跟着变
    return "keep";
}
/** 界面日夜两档跟着画风的纸色（preset/colors.ts isDarkPaper；Tron 账本 T147 / T167）：深色纸 = 夜间那套（styles.css .ui-night）。 */
function syncNight(): void { document.body.classList.toggle("ui-night", isDarkPaper(PRESETS[editor.renderer3.getPreset()].colors.paper)); }
function syncUi(): void {
  syncNight();
  primary.sync();   // 上方正中的主按钮跟着工具 / 选区 / 场景换
  meterBadge?.sync(isPaintTool(editor.tool));   // 每帧读数的角标：开着 ∧ 拿着画画的工具才露（1-4d）
  renderSnapWidget();
  renderLockRows();
  refreshMachineBoard();   // 指令板上的数跟着模型变
  viewWin?.refresh(); brushWin?.refresh(); hierWin?.refresh();   // 常驻浮窗（视图 / 雕刻笔刷 / 层级）：内容变了才重画
  syncCanvasBtn(); canvasWin?.sync();   // 画布小窗（施工单十六）：物件 / 画 / 选区跟上，没变不重算
  releaseLatchesOnToolChange(); mfdRef?.render();   // 键名芯片（UX19）；换了工具 = 锁住的修饰键放开
  softSliderRef?.render();   // 软选择半径滑条
  selGrowRef?.sync();   // 扩 / 缩条：换了工具 / 没选区就收
  // 右上角的手 + 放大镜（拖着平移 / 缩放）：键鼠时藏（有滚轮 / 中键 / Shift+Z），检测到触摸 / 笔就露（账本 UX37，user 10-28「键鼠的时候手柄可以自动隐藏。检测到触摸自动出现」）
  { const nav = document.querySelector<HTMLElement>(".gizmo-nav"); if (nav) nav.hidden = lastPointerType === "mouse"; }
  ensureScaleLadder();   // B43：选了参考项就（空闲时）拉数据
  renderModeSelect();
  renderSlots();
  renderCrumbs();
  toolStrip.render();
  vcb.render();
  btnUndo.disabled = !editor.canUndo();
  btnRedo.disabled = !editor.canRedo();

  vr?.invalidatePanel();
  autoBrushWindow();   // 最后：左栏竖滑条这一刻已经画好（笔刷窗要摆在它右边）
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
inputGate.face({ kind: "face", label: "使用手册", rank: 502, root: "#helpSheet", up: () => !helpEl.hidden, esc: () => { toggleHelp(false); return true; } });

// ---------- 材质面板（油漆桶蘸什么）：家族色库 pull 的色板 + 导入图片 + 默认灰 ----------
const matSheet = $("matSheet");
const BACK_SWATCH = `#${PALETTE.faceBack.toString(16).padStart(6, "0")}`;   // 油漆桶上「默认背面」那一格的颜色 = 屏幕上背面的颜色
const matGrid = $("matGrid");
const matImageInput = $<HTMLInputElement>("matImage");
/** 贴图字节 → object URL（按字节对象缓存，免得每次刷新上下文条都漏一个 URL）。 */
const _texUrls = new WeakMap<Uint8Array, string>();
const textureUrl = (bytes: Uint8Array, mime: string): string => { let u = _texUrls.get(bytes); if (!u) { u = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime })); _texUrls.set(bytes, u); } return u; };
const hexToRgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
function toggleMatSheet(on: boolean): void { matSheet.hidden = !on; if (on) renderMatGrid(); }
inputGate.face({ kind: "face", label: "材质", rank: 501, root: "#matSheet", up: () => !matSheet.hidden, esc: () => { toggleMatSheet(false); return true; } });
function renderMatGrid(): void {
  matGrid.replaceChildren();
  const cur = editor.paint;
  const mk = (label: string, bg: string, onPick: () => void, active: boolean, title?: string): void => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "swatch" + (active ? " active" : ""); b.title = title ?? label;
    b.style.background = bg;
    const t = document.createElement("span"); t.className = "swatch-label"; t.textContent = label; b.appendChild(t);
    b.addEventListener("click", () => { onPick(); renderMatGrid(); if (editor.tool !== "paint") takeTool("paint"); });   // 油漆桶在「表面」工作台：明着换过去
    matGrid.appendChild(b);
  };
  mk("默认正面", "#d6d6d6", () => editor.setPaint(null), cur === null, "默认正面（去掉材质）：导出时这一侧照出，没有材质");
  mk("默认背面", BACK_SWATCH, () => editor.setPaint({ kind: "back", name: "默认背面" }), cur?.kind === "back", "默认背面：导出和转网格体时这一侧不出");
  for (const c of PALETTE_ZH) mk(c.name, c.hex, () => editor.setPaint({ kind: "color", name: c.name, color: hexToRgb(c.hex) }), cur?.kind === "color" && cur.name === c.name, `${c.name} ${c.hex}`);
  // 文档里已有的贴图材质（可再蘸）
  editor.materials().forEach((m) => {
    const p = editor.materialPick(m);   // 图在贴图表里：问编辑器（那个口），不读材质的字段
    if (p.kind !== "texture") return;
    const url = URL.createObjectURL(new Blob([p.bytes as BlobPart], { type: p.mimeType }));
    mk(m.name, `center / cover url(${url})`, () => editor.setPaint(p), cur?.kind === "texture" && cur.bytes === p.bytes, `${m.name}（${p.sizeM[0]} × ${p.sizeM[1]} m）`);
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
    takeTool("paint");
    notify({ text: `贴图「${name}」已蘸上（${bmp.width}×${bmp.height} px → ${w} × ${h.toFixed(2)} m）：点面涂上`, level: "info" });
  } catch (err) {
    notify({ text: `图片读不了：${(err as Error).message}`, level: "error" });
  }
});


// ---------- 导出模型（导出设计稿 ai-docs/20261028-export-design.md §4；账本 UX39）：模态 sheet，给别的软件看的烤好的模型，不是工程备份 ----------
// 导出永远有框，是 CatsUp 的规矩；选择跟文件走（desk 1.4；user 11-04「导出的时候永远有个框，以后选项会越来越多。我建议文件workbench而不是workpiece记住」）
async function openExportModel(): Promise<void> {
  const picks = editor.exportPicks(), last = session.exportChoice;
  const glbOnly = (v: Readonly<Record<string, string>>): boolean => v.format !== "glb";
  /** 说明行：要出几侧就几张面，看得见（计划书 §9.2½ ①：不分类、不另弹，想留一侧 = 把另一侧涂成默认背面）。按范围算一次。 */
  const sideNotes = new Map<string, string>();
  const sideNote = (scope: string): string => {
    let t = sideNotes.get(scope);
    if (t === undefined) {
      const c = session.exportSides(scope === "sel" ? picks.map((p) => p.def) : undefined);
      t = `${c.both ? `${c.both} 张面两侧都会出（其中 ${c.differ} 张两侧材质不同）；只想留一侧，把另一侧涂成默认背面。` : ""}${c.neither ? `${c.neither} 张面两侧都是默认背面，不会出。` : ""}`;
      sideNotes.set(scope, t);
    }
    return t;
  };
  const v = await openFormSheet("导出模型", [
    { key: "format", label: "格式", value: last.format === "obj" ? "obj" : "glb", options: [{ value: "glb", label: "glb" }, { value: "obj", label: "obj" }] },
    { key: "scope", label: "范围", value: picks.length && last.scope === "sel" ? "sel" : "all", options: [{ value: "all", label: "整个模型" }, ...(picks.length ? [{ value: "sel", label: `选中的 ${picks.length} 个物件` }] : [])], hidden: glbOnly },
    { key: "textures", label: "贴图", value: last.textures === "none" ? "none" : "embed", options: [{ value: "embed", label: "嵌进文件" }, { value: "none", label: "不带" }], hidden: glbOnly },
    { key: "lines", label: "边线", value: last.lines === "none" ? "none" : "with", options: [{ value: "with", label: "带" }, { value: "none", label: "不带" }], hidden: glbOnly },
  ], {
    okLabel: "导出",
    note: (x) => `${x.format !== "obj" && session.exportPaintNote() ? `${session.exportPaintNote()}。` : ""}给别的软件看的烤好的模型（${x.format === "obj" ? "三角形；OBJ 只导整个模型、不带贴图" : "三角形 + 材质 + 贴图"}）。不是工程备份——备份用「导出工程文件」。${x.format === "obj" ? "" : ` ${sideNote(x.scope ?? "all")}`}`.trimEnd(),   // 有画先说实话（统筹 11-12）
  });
  if (!v) return;
  session.setExportChoice({ format: v.format, scope: v.scope ?? "all", textures: v.textures ?? "embed", lines: v.lines ?? "with" });
  if (!(await session.confirmPlainExit(v.format === "obj" ? "OBJ" : "glb"))) return;   // 给别的软件的格式天然明文：加密作品下载前明说（规则书 §1 第 5 条）
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
  cameraLocked: () => !!paintWb?.stroking,   // 画画的一笔当中相机不动（1-7）
  onUndo: () => editor.undo(),
  onRedo: () => editor.redo(),
  onFourTap: () => { hintEl.textContent = hideWins.toggle(); },   // 四指轻点 = 一键藏起所有窗（Procreate 同款手势）
  look: (dx, dy) => locomotion.look(dx, dy),
  walking: () => locomotion.isWalking(),
  admits: (source) => inputGate.admits(source),   // 第二层（输入闸）
  toolBlocked: () => { if (editor.locked && !isReadOnlyTool(editor.tool)) { hintEl.textContent = HINT_LOCKED; return true; } return locomotion.sim.state.teleport.charging || (locomotion.isPlacing() && editor.tool !== "walk") || locomotion.isFps(); },   // 放人时指针归步行工具（输入层 → 工具 → locomotion），别的工具挡住   // 演示锁 = 工具指针不进编辑器（悬停预告也停）、提示行说为什么；放置 = 点一下落人；FPS = 监工不编辑（原地编辑才动工具）
  // #19 上下文菜单：桌面右键任何工具都行（SU）；触屏长按只在选择工具里
  onContext: (x, y, cx, cy) => { if (locomotion.isFps()) return; if (editor.locked) { hintEl.textContent = HINT_LOCKED; return; } openContextMenuAt(editor, hud, x, y, cx, cy); },   // 演示锁：不出菜单；三层：空处 / 几何 / 子组件的物体菜单（context-menu.ts）
  longPressEnabled: () => editor.tool === "select",
  // #23 user「move反而是点两下」「旋转和move对齐」：移动 = 点两下、旋转 = 点三下，笔 / 手指也开；画线 / 矩形 / 推拉在笔 / 手指上仍只拖（误触连线案）
  latched: () => latchedMods,   // 键名芯片锁住的修饰键（iPad 没键盘：Shift / Ctrl / Alt = 开关）
  armable: (pt) => pt === "mouse" || pt === "pen" || editor.tool === "move" || editor.tool === "rotate",   // 笔也点两下（B23）；手指只在移动 / 旋转（#23）
  // 重按（笔的设计稿第七节第 2 步）：只有用重按的工具（stance.ts PEN_PRESS）笔尖闪一圈 + 黑匣子记一行（调判法的数看它）；别的工具里按重了什么都不发生
  liftGraceMs: () => (penPressOf(editor.modeId, editor.tool) ? liftGraceMs : 0),
  penGrab: () => penPressOf(editor.modeId, editor.tool) === "grab",   // 笔轻 = 选、重 = 抓那一族（第七节第 6 步）   // 抬笔宽限只给用重按的工具（设计稿第三节）
  onHardPress: (hit, cx, cy) => { if (!penPressOf(editor.modeId, editor.tool)) return; pressPulse(cx, cy); note("press", `重按（${hit.how === "down" ? "落笔就重" : "猛升"}，落笔后 ${Math.round(hit.after)} ms 判到）底 ${hit.base.toFixed(2)} → ${hit.p.toFixed(2)}`); },
});
// 视图 = 右上角导航 gizmo（Blender / Unity 式；user 2026-10-21「视图之类的能不能参考unity blender editor」）。视图弹层退役；透视 / 步行 / 穿墙 / 粗线稿进 ☰。
// 放在 locomotion 之后（render 立刻会问 isWalking）。
const viewGizmo = mountViewGizmo($("viewGizmo"), editor, { isWalking: () => locomotion.isWalking(), onProjection: () => syncUi() });
// 右上角「视图」菜单（user 2026-10-24「视图时是归右上角的汉堡管」）：透视 / 线稿 / 网格 / 单位 / 步行 / 飞行 / VR
const viewMenuBtn = document.createElement("button");
viewMenuBtn.type = "button"; viewMenuBtn.dataset.opensWindow = ""; viewMenuBtn.className = "gizmo-btn gizmo-menu"; viewMenuBtn.title = "渲染"; viewMenuBtn.innerHTML = iconHtml("sliders");   // 滑杆 = 调视图（user 10-30「视图按钮换一个icon」：以前和左上 ☰ 同一个图标）
($("viewGizmo").querySelector(".gizmo-top") as HTMLElement).appendChild(viewMenuBtn);
// 参考窗钮（user 10-30「视图设置就是视图设置，然后参考窗按钮放在视图设置旁边」）：点一下开 / 关，开着 = 亮（跟着窗口的 open 走，窗口自己的 × 关了也灭）
const refBtn = document.createElement("button"); refBtn.type = "button"; refBtn.dataset.opensWindow = ""; refBtn.className = "gizmo-btn gizmo-ref"; refBtn.title = "参考窗：参考图 · 文字 · 视频（开着时 Ctrl+V 直接贴进来）"; refBtn.innerHTML = iconHtml("picture-in-picture");
viewMenuBtn.before(refBtn);   // 视图钮左边（user 10-30「参考窗按钮放在视图按钮左边」）
// 画布小窗钮（施工单十六第二节；版图文档 2026-11-11 追记）：这个文件里有画才露（看数据不分工作台）；开着 = 亮。
// 2026-11-13 user「画布小窗应该放在最上面就是菜单 云保存 hierarchy objectproperty workflow那一层……我是想放在右边」：从右上参考窗钮旁边搬到左上那一排、工作台下拉的右边
//   （有画才露，放在末尾 = 出现 / 消失时下拉框不挪），和层级 / 物件那几颗开窗的钮一样的方钮。
const canvasBtn = document.createElement("button"); canvasBtn.type = "button"; canvasBtn.dataset.opensWindow = ""; canvasBtn.className = "tb-btn gizmo-canvas"; canvasBtn.title = "画布小窗：这个物件的画铺在画布上的样子（只看）"; canvasBtn.innerHTML = iconHtml("image");
$("modeSelect").after(canvasBtn);   // 工作台下拉的右边（user 11-13）
// eslint-disable-next-line no-var
var canvasWin: CanvasWindow | null = null;   // var：每帧的准备 / 渲染的 viewExtras 比它先写
canvasBtn.addEventListener("click", () => { mountCanvasWin().toggle(canvasBtn); syncUi(); });
/** 画布小窗只建一个（按钮和「新建平铺的画」共用）。 */
const mountCanvasWin = (): CanvasWindow => (canvasWin ??= mountCanvasWindow({ editor, boards: paintBoards, savedSizes: (t) => paintSaver.lastSizes(t), paint: canvasPaintPort, newTiled: () => { void newTiledPaint(); }, hint: (t) => { hintEl.textContent = t; }, onOpenChange: (o) => { canvasBtn.classList.toggle("is-open", o); canvasBtn.setAttribute("aria-pressed", o ? "true" : "false"); } }));
const syncCanvasBtn = (): void => { const any = [...editor.sceneRef.textures.values()].some((t) => t.content.kind === "layered"); canvasBtn.hidden = !any && !canvasWin?.isOpen() && !editor.modeTools().includes("paintPen"); };   // 有画画的笔的工作台里一直在：一张画都没有时也能「新建平铺的画…」（问工作台带什么工具，不按工作台的名字分叉：T102 棘轮）
/**
 * 新建平铺的画（施工单二十一第 3 刀；小窗「…」里那一项）：问像素大小和在模型上一张多大 → 编空白分层字节（存盘编空白的同一个编码器；画布大小只写在它里面）
 * → 指令 addTiledPaint（一步撤销：贴图行 + 指着它的材质）→ 小窗切过去（先变热，好直接画）。锁着 = 不建、说原因（编辑器的提交口本来也拒）。
 */
async function newTiledPaint(): Promise<void> {
  { const why = paintEditLocked(); if (why) { hintEl.textContent = why; return; } }
  const v = await openFormSheet("新建平铺的画", [
    { key: "px", label: "像素大小", options: [16, 32, 64, 128, 256].map((n) => ({ value: String(n), label: `${n} × ${n}` })), value: "64" },
    { key: "m", label: "在模型上一张多大", options: [0.25, 0.5, 1, 2, 4].map((m) => ({ value: String(m), label: `${m} 米` })), value: "1" },
  ], { okLabel: "新建", note: (x) => `一张 ${x.m} 米见方、${x.px} × ${x.px} 像素；建好开在画布小窗里画（只在小窗里画）。用油漆桶把这个材质涂到面上，就按这个大小平铺。` });
  if (!v) return;
  await createTiledPaint(Number(v.px), Number(v.m));
}
/** 「建」那一半（表单之后；调试钩子 paint.newTiled 也走它）：编空白分层字节 → 指令 → 小窗切过去。返回新贴图的 GUID；没建成 = null（提示行说了原因）。 */
async function createTiledPaint(px: number, m: number): Promise<string | null> {
  { const why = paintEditLocked(); if (why) { hintEl.textContent = why; return null; } }
  let ora: Uint8Array;
  try { ora = await paintSaver.blankOra(px, px); }
  catch (e) { hintEl.textContent = "这一次编不出画的字节（打包的组件没加载上），没建；刷新一下再试"; funnel(e, "warning"); return null; }
  const S = editor.sceneRef, n = S.materials.filter((x) => S.tiledPaintOf(x)).length + 1, name = `平铺的画 ${n}`, tex = mintGuid();
  try { editor.commitOp({ op: "addTiledPaint", textureGuid: tex, materialGuid: mintGuid(), name, ora, sizeM: [m, m], color: [1, 1, 1] }); }
  catch (e) { hintEl.textContent = String((e as { say?: string }).say ?? (e instanceof Error ? e.message : e)); funnel(e, "warning"); return null; }
  if (!editor.sceneRef.textures.has(tex)) return null;   // 被拒（锁着……）：原因已在状态栏（一步收尾写的），不开小窗、不说「建好了」（统筹 11-13，和 a12b 同一种假话）
  mountCanvasWin().showTiled(tex, canvasBtn); syncUi();
  hintEl.textContent = `建好了「${name}」：在画布小窗里画；用油漆桶选「${name}」这个材质涂到面上`;
  return tex;
}
// ---------- B43 尺度参考：数据懒加载 + 视图 ☰「参考」页 ----------
let ladder: Ladder | null = null;
let ladderTimer = 0;
// eslint-disable-next-line no-var
var viewMenuHandle: { refresh(force?: boolean): void; isOpen(): boolean } | null = null;   // var：加载回来时刷新开着的菜单
// eslint-disable-next-line no-var
var mainMenuHandle: { refresh(): void; isOpen(): boolean } | null = null;   // ☰（单位页的尺度参考那一行：数据加载回来 / 多选勾了要重画）
/** 开着的 ☰ / 视图窗重画一遍。 */
function refreshMenus(): void { if (viewMenuHandle?.isOpen()) viewMenuHandle.refresh(true); if (mainMenuHandle?.isOpen()) mainMenuHandle.refresh(); }
// eslint-disable-next-line no-var
/** 拉梯子数据（279 KB / gzip 58 KB）：选了参考项才拉；开机时等 1.5 s 再拉（启动优先），用户点了参考页 / 选了一项 = 立刻拉。 */
function ensureScaleLadder(now = false): void {
  if (ladder || !editor.scaleRefs.length && !now) return;
  if (!now) { if (!ladderTimer) ladderTimer = window.setTimeout(() => ensureScaleLadder(true), 1500); return; }
  loadLadder().then((L) => { ladder = L; editor.setScaleLadder(L); refreshMenus(); })
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
/** 「适用范围与出处」（user 10-30「名字不应跟叫新手提醒，给一个更有信息量的名字」「所以新手提醒改成全量的，而不是随着你选哪个尺度变得。因为readme window一般是静态的」）：
 *  数据里的全部提醒（人体比例不适用于二次元 / 风格化世界别照抄 / 儿童是大概 / 不收规范 / 常识值是估算 / DnD 按哪版规则……）+ DnD 署名，跟选了哪些无关。 */
function scaleRefNotes(L: Ladder): { id: string; text: string }[] {
  return [...allReminders(L), { id: "srd", text: "DnD 规则数据出自 SRD 5.1（Wizards of the Coast，CC BY 4.0）。" }];   // 署名：仓鼠的 dnd 提醒写了版本没写许可
}
/** ☰「单位」页的尺度参考那一行（选单只有一个、多选取并集——user「要不还是不如多重订阅吧，不然不同的室内室外会组合烦死」）：
 *  看哪些 ▾（下拉多选；user「所以我们需要一个下拉多选的ux模块哦。而不是几百个选项浪费面板空间」）· 最多几条 ▾ · 适用范围与出处——一行、不带标签（user 10-30「试用这里ui谜语人了我建议是放在尺度参考同一行……label也去掉，就是两个下拉框」「新手提醒是尺度参考的，也想办法塞到那个row里面」）。 */
function scaleRefRow(): Omit<PopupMenuItem<RefMenuId>, "tab"> {
  const cur = editor.scaleRefs, L = ladder;
  if (!L) { ensureScaleLadder(true); return { id: "ref:none", label: "参考数据加载中…", note: true }; }
  const opts = refOptions(L), label = (id: string): string => { const o = opts.find((x) => x.id === id); return o ? (o.group && o.group !== "其他" && o.label !== o.group ? `${o.group} · ${o.label}` : o.label) : id; };
  return { id: "ref:row", label: "尺度参考", inline: [
    { id: "ref:pick", label: "看哪些参考", value: multiSummary(cur.map(label)) },
    { id: "refmax:3", label: "跟指针的提示框里最多几条（这台设备记住）", choices: SCALE_TIP_MAX.map((n) => ({ id: `refmax:${n}` as RefMenuId, label: `最多 ${n} 条`, checked: scaleMax === n })) },
    { id: "ref:notes", label: "适用范围与出处…" },
  ] };
}
function onRefPick(id: RefMenuId): "keep" {
  if (id.startsWith("refmax:")) { scaleMax = Number(id.slice(7)); PREF.set("scaleMax", String(scaleMax)); return "keep"; }
  if (id === "ref:notes" && ladder) {
    void openConfirmSheet("尺度参考的适用范围与出处", scaleRefNotes(ladder).map((n) => `· ${n.text}`).join("\n\n"), { okLabel: "知道了", noCancel: true });
    return "keep";
  }
  if (id === "ref:pick" && ladder) {
    const L = ladder, anchor = document.querySelector<HTMLElement>('.float-win[data-win="view"] .menu-item[data-menu-id="ref:pick"], .popup-menu .menu-item[data-menu-id="ref:pick"]');
    if (anchor) openMultiSelect({
      anchor, ariaLabel: "看哪些参考", options: () => refOptions(L), values: () => editor.scaleRefs,
      onToggle: (x) => { editor.toggleScaleRef(x); ensureScaleLadder(true); refreshMenus(); },
      onClear: () => { editor.clearScaleRefs(); refreshMenus(); }, clearLabel: "全部取消（不显示）",
    });
  }
  return "keep";
}
/** 视图汉堡分页（user 2026-10-25「汉堡分页，这个汉堡转管视口，以后渲染方案也它管，专管viewer」）：渲染 / 单位（含 B43 尺度参考）。
 *  参考窗（屏幕上的参考图 / 文字 / 视频）不在这里了：user 10-30「视图设置就是视图设置，然后参考窗按钮放在视图设置旁边」→ 视图钮旁边自己一颗钮。 */
const VIEW_MENU_TABS = [
  { id: "render", label: "渲染" },
  { id: "units", label: "单位" },   // 2026-11-13 从 ☰ 搬回来当第二页（user「单位还是移动到右边的和渲染窗口合租成分页」）；行 = placement.ts VIEW_UNIT_ROWS
] as const;   // 「单位」页 10-30 搬进 ☰（user「单位跟着glb文件走……现在就把单位搬到菜单里面」「文件是文件设置，preference，手感，视图就是eye candy」）   // user 10-30「所以暂时没有显示tab，只有渲染，然后以后渲染tab会很胖很对选项，只管画风」：透视 / X 光撤（「外面能按」）、全部显示去右键菜单、VR 左手持笔去 ☰ 设置、进入 VR 在上方正中那颗钮   // 「相机」页撤了（user 10-30「相机tab也不要了，步行在验证工具栏里面」）：步行 = 验证左柱第一格、穿墙 = 走着双击空格、VR 两行挪到「显示」页最下面
type ViewTab = (typeof VIEW_MENU_TABS)[number]["id"];
/** 视图菜单的内容（常驻浮窗里画；user 10-29「我建议是视图 物体 都做成可以常驻的浮窗吧，只有主菜单是菜单型的」）。 */
function viewMenuSpec(): MenuSpec<MenuId | GridMenuId | RefMenuId> {
  return {
    ...(VIEW_MENU_TABS.length > 1 ? { tabs: VIEW_MENU_TABS, tabKey: "view" } : {}),   // 只剩一页 = 不画页签条
    items: () => [
      // 单选组一组一行下拉（user 2026-10-25「线稿粗细，单位都做成下拉框，整个汉堡目录排查一下，能下拉框的就做」）
      { id: "style:pick" as MenuId, label: "风格", tab: "render", choices: PRESET_IDS.map((s) => ({ id: `style:${s}` as MenuId, label: PRESETS[s].name, checked: editor.renderer3.getPreset() === s, hint: PRESETS[s].brief })) },
      { id: "screen:pick" as MenuId, label: "屏幕", tab: "render", choices: [{ id: "screen:auto" as MenuId, label: "跟画风", checked: editor.renderer3.getScreen() === null, hint: "画风自己的默认" }, ...SCREEN_IDS.map((s) => ({ id: `screen:${s}` as MenuId, label: SCREENS[s].name, checked: editor.renderer3.getScreen() === s, hint: SCREENS[s].brief }))] },   // 屏幕一刀的用户面（T106）   // Tron 纪元：预设 = 数据（minccino/preset/）
      { id: "accent:pick" as MenuId, label: "选中色", tab: "render", choices: ACCENTS.map((a) => ({ id: `accent:${a.id}` as MenuId, label: a.label, checked: editor.renderer3.getAccent() === a.accent, ...(a.hint ? { hint: a.hint } : {}) })) },
      ...VIEW_UNIT_ROWS.flatMap((r) => { const it = menuRow(r.id); return it ? [{ ...it, tab: "units", ...(r.section ? { sectionBefore: r.section } : {}) } as PopupMenuItem<MenuId | GridMenuId | RefMenuId>] : []; }),   // 单位页 = ☰ 那四行原样（11-13 搬家）
    ],
    onPick: (id: MenuId | GridMenuId | RefMenuId): void | "keep" => { if (isRefId(id)) return onRefPick(id); if (isGridId(id)) { onGridPick(id); syncUi(); return "keep"; } const r = menuPick(id as MenuId); syncUi(); return r; },   // 单位页的行和 ☰ 那时一样分给 onRefPick / onGridPick
  };
}
// 雕刻笔刷浮窗（user 10-30「然后雕刻笔刷的浮窗就可以做一下啦」）：四把笔刷 + 力度；半径在左栏那根竖滑条（和软选择共用，不重复放）。
// 拿起任何一把笔刷时自动开；你关掉了这次就不再自动开（钮还在左柱「笔刷 ▾」）。
const BRUSH_STRENGTHS = [0.1, 0.25, 0.5, 0.75, 1] as const;
function brushMenuSpec(): MenuSpec<string> {
  return {
    items: () => {
      const s = Number(editor.config.get("brush", "strength"));
      return [
        ...BRUSHES.map((t) => { const sp = TOOL_SPEC.find((x) => x.tool === t)!, k = toolKeyText(editor.modeId, t, (x) => editor.modeTools().includes(x)); return { id: `brush:${t}`, label: sp.label, icon: sp.icon, checked: editor.tool === t, ...(k ? { hint: k } : {}) }; }),
        { id: "brush:strength", label: "力度", choices: BRUSH_STRENGTHS.map((v) => ({ id: `brushs:${v}`, label: `${Math.round(v * 100)}%`, checked: Math.abs(s - v) < 0.026 })), sectionBefore: "笔刷" },
        { id: "brush:note", label: "半径 = 左栏那根竖滑条（和软选择共用）· Shift = 临时抹平 · 鼓起按住 Ctrl = 压", note: true },
      ];
    },
    onPick: (id) => {
      if (id.startsWith("brushs:")) { editor.config.set("brush", "strength", Number(id.slice(7)) as never); syncUi(); return "keep"; }
      if (id.startsWith("brush:")) { editor.setTool(id.slice(6) as Tool); syncUi(); }
      return "keep";
    },
  };
}
// eslint-disable-next-line no-var
var brushWin: MenuWindowHandle | null = null;
// eslint-disable-next-line no-var
var brushWinDismissed = false;   // var（提升）：加载过程中 syncUi 可能先跑到这里
/** syncUi 里调：拿着笔刷、窗没开、这次没被关过 → 开（摆在左柱右边）。 */
function autoBrushWindow(): void {
  if (!BRUSHES.includes(editor.tool) || brushWinDismissed || brushWin?.isOpen()) return;
  (brushWin ??= createMenuWindow({ id: "brush", title: "雕刻笔刷", menu: brushMenuSpec, store: WIN_POS, onOpenChange: (o) => { if (!o) brushWinDismissed = true; } })).open(document.querySelector<HTMLElement>(".left-dial:not([hidden])") ?? toolbarEl, "after");   // 左栏半径竖滑条露着就摆在它右边（别盖住它）
}
/** 浮窗位置按设备记（PREF win.<id>）。 */
const WIN_POS = {
  get: (id: string): { left: number; top: number } | null => { try { const v = PREF.get(`win.${id}`); return v ? JSON.parse(v) as { left: number; top: number } : null; } catch { return null; } },
  set: (id: string, p: { left: number; top: number }): void => PREF.set(`win.${id}`, JSON.stringify({ left: Math.round(p.left), top: Math.round(p.top) })),
};
// eslint-disable-next-line no-var
var viewWin: MenuWindowHandle | null = null;
// eslint-disable-next-line no-var
var hierWin: HierarchyWindow | null = null;   // 层级浮窗（var：syncUi 可能在它建好之前跑）
/** 开视图浮窗：tab = 直接停在那一页（别处的「XX 设置…」跳进来）；不给 = 开 / 关。 */
function openViewMenu(tab?: ViewTab): void {
  const w = (viewWin ??= createMenuWindow({ id: "view", title: "渲染", menu: viewMenuSpec, store: WIN_POS, onOpenChange: (o) => viewMenuBtn.classList.toggle("is-open", o) }));
  if (tab) w.open($("viewGizmo"), "beside", tab); else w.toggle($("viewGizmo"), "beside");   // 第一次开 = 视图方块那一列的左边（不盖住方块 / 吸附 / X 光）
  viewMenuHandle = w;
}
viewMenuBtn.addEventListener("click", () => openViewMenu());
void viewGizmo;
// 视图侧挂件条（user 2026-10-24「以后视图侧会有很多挂件。snap只是其中第一个」）：gizmo 下面一列；第一个 = 吸附——点一下开 / 关栅格吸附，
// 右键 / 长按 = 菜单（制式、栅格面、格距、细分）。锁不在这里：在下面锁的三行（白模 W-6）。
const widgets = document.createElement("div"); widgets.className = "gizmo-btns gizmo-widgets"; $("viewGizmo").appendChild(widgets);
const snapBtn = document.createElement("button"); snapBtn.type = "button"; snapBtn.className = "gizmo-btn gizmo-snap"; snapBtn.title = "格点吸附 · 长按：更多";   // 提示精简（user 10-30「格点吸附和xray的tooltip精简一下」）；细节在长按菜单 / 状态行
snapBtn.innerHTML = iconHtml("snap-grid") + '<span class="gizmo-subdiv" hidden></span><span class="gizmo-snaplock"></span>';   // 锁 = 这是「吸附」不是「显示栅格」（user「吸附的话得图标加一个锁」）：开着锁上、关着打开
widgets.appendChild(snapBtn);
// X 光快捷钮（2026-10-29 user「xray开关放一个快捷键到视图快捷键区的锁快捷键旁边」；纪元账本 FM51「X 光开关放右上角锁旁边」）：点一下开 / 关，亮着 = 开；Alt+Z 同一个开关，视图菜单里那一行照留
const xrayBtn = document.createElement("button"); xrayBtn.type = "button"; xrayBtn.className = "gizmo-btn gizmo-xray"; xrayBtn.title = "X 光（Alt+Z）";
xrayBtn.innerHTML = iconHtml("xray"); widgets.appendChild(xrayBtn);
xrayBtn.addEventListener("click", () => { editor.setXray(!editor.xray); syncUi(); });
xrayBtnRef = xrayBtn;
// 锁的入口（白模第一批 W-6，2026-11-10；user「all lock entries are organized to the right top」）：吸附 / X 光那一行下面三行，每行两颗带字的钮
// 「X｜YZ」「Y｜XZ」「Z｜XY」= 方向锁那根轴｜法向是它的面锁。只在这把工具吃锁时出现，只吃面锁的工具（矩形 / 圆 / 弧 / 旋转）只出右边那颗。
// 点 = 开 / 关这把工具记着的锁（每个工具各记各的，W-4）；键盘的方向键 / X Y Z 照旧。左下芯片里的锁和吸附钮长按菜单里的锁都撤了。
const lockBox = document.createElement("div"); lockBox.className = "gizmo-btns gizmo-locks"; $("viewGizmo").appendChild(lockBox);
const LOCK_AXES = ["x", "y", "z"] as const;
lockRowsRef = LOCK_AXES.map((a) => {
  const row = document.createElement("div"); row.className = "gizmo-lock-row"; lockBox.appendChild(row);
  const mk = (plane: boolean): HTMLButtonElement => {
    const b = document.createElement("button"); b.type = "button"; b.className = `gizmo-btn gizmo-lock lock-${a}${plane ? " lock-plane" : ""}`;
    b.textContent = plane ? planeLockLabel(a) : a.toUpperCase();
    b.title = plane ? `面锁 ${planeLockLabel(a)}：只在这个面里动（再点一下解开）` : `方向锁 ${a.toUpperCase()}：只沿 ${a.toUpperCase()} 走（再点一下解开）`;
    b.addEventListener("click", () => { if (plane) editor.togglePlaneLock(a); else editor.toggleAxisLock(a); syncUi(); });
    row.appendChild(b); return b;
  };
  return { row, axis: mk(false), plane: mk(true) };
});
lockBoxRef = lockBox;
// 物体窗口的钮（UX 心智模型 §2.1：一个窗口只看一个指针——这一颗 = 你所在的这一层；子组件的物体菜单「物体设置…」也从这里开，当前换成它们）
// 2026-10-28 夜挪到左上、工作台下拉旁边（user「物体属性不在视图那边，可以放在工作流左边」）：右边那一列只管视图
const objectBtn = document.createElement("button"); objectBtn.type = "button"; objectBtn.className = "tb-btn gizmo-object"; objectBtn.title = "物件：这一层的属性与动词（对称 / 默认平滑 / 转换种类 / 细分 / 修复）";
objectBtn.innerHTML = iconHtml("object"); $("modeSelect").before(objectBtn);   // 工作台下拉的左边（user 10-30「物件设置按钮放在tab下拉左边」）
// 层级钮（0.18 物品栏纪元 I1；设计稿 §5：层级 = 浮窗、素材 = 底部抽屉）：物件钮左边。窗口 = hierarchy-window.ts（物件树，组不进）
const hierBtn = document.createElement("button"); hierBtn.type = "button"; hierBtn.dataset.opensWindow = ""; hierBtn.className = "tb-btn gizmo-hier"; hierBtn.title = "层级 · 资源：这个模型里的物件树、组件和材质清点（窗口标题下拉换页；以后的素材也在这里）";
hierBtn.innerHTML = iconHtml("hierarchy-tree"); objectBtn.before(hierBtn);
const shelfActions: ShelfActions = createShelfActions({ editor, notify, isEncrypted: (b) => appEncryption.isEncryptedBlob(b), unlock: unlockImportedContainer, after: syncUi });
hierWin = createHierarchyWindow(editor, hud, { store: WIN_POS, after: syncUi, shelf: shelfActions, confirm: (title, message, okLabel) => openConfirmSheet(title, message, { warning: true, okLabel, cancelLabel: "不清理" }), hint: (t) => { hintEl.textContent = t; }, pref: { get: (k) => PREF.get(k), set: (k, v) => PREF.set(k, v) }, onOpenChange: (o) => hierBtn.classList.toggle("is-open", o) });
hierBtn.addEventListener("click", () => hierWin?.toggle(hierBtn));
// 「这一层」和选中的子组件（物体菜单「物体设置…」）都是一次性的下拉（openObjectWindow）
const objectWinDeps = { after: syncUi, openMachine: (m: Machine) => openMachineBoard(m, objectBtn) };
objectBtn.addEventListener("click", () => openObjectWindow(editor, hud, "self", objectBtn, objectWinDeps, "start"));   // 弹出菜单、再点一下收起（user 10-30「可以恢复成菜单的样式而不是浮窗」）
// 车间里的机器（machine-window.ts MACHINES 表）：板 = 那台机器的低频指令（user 10-28「每个机器一个面板，然后左栏是你的手和常用工具袋」）。
// 入口 = 物件窗口里那台机器的页签（user 10-29「修复菜单不应该挂在视图那边，而是物品选项里面的一个tab」；以前是右边视图那一列的扳手钮）
function openMachineBoard(m: Machine, anchor: HTMLElement): void {
  openMachineWindow(editor, hud, m, anchor, {
    store: { get: (id) => { try { const v = PREF.get(`board.${id}`); return v ? JSON.parse(v) as { x: number; y: number } : null; } catch { return null; } }, set: (id, p) => PREF.set(`board.${id}`, p ? JSON.stringify({ x: Math.round(p.x), y: Math.round(p.y) }) : "") },   // 板的位置记在这台设备（长按标题 = 归位）
    params: { setHome: (el, accepts) => vcb.setParamsHome(el, accepts) },
    after: syncUi,
  });
}
snapBtnRef = snapBtn;
const openSnapMenu = (): void => { togglePopupMenu<GridMenuId | "gridSettings">({ anchor: snapBtn, align: "end", items: snapMenuItems, onPick: (id) => { if (id === "gridSettings") { openViewMenu("units"); return; } return onGridPick(id); } }); };
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
// eslint-disable-next-line no-var
var lockBoxRef: HTMLElement | undefined;
// eslint-disable-next-line no-var
var lockRowsRef: { row: HTMLElement; axis: HTMLButtonElement; plane: HTMLButtonElement }[] | undefined;
/** 锁的三行跟着这把工具：吃什么锁出什么钮、锁着的那颗亮；走路时不出。
 *  不吃锁的工具（选择）上有先按好、等着交给下一把的锁 → 也出（六颗都出、亮着那一颗，点一下能解；v0.19.3，Fable 审：不留看不见的状态）。 */
function renderLockRows(): void {
  if (!lockBoxRef || !lockRowsRef) return;
  const a = editor.axisLock, p = editor.planeLock, walking = !!locomotion?.isWalking();
  const style = walking ? null : editor.lockStyle() ?? (a !== null || (p !== null && p !== "face") ? "axis" : null);
  lockBoxRef.hidden = !style;
  lockRowsRef.forEach((r, i) => {
    const ax = (["x", "y", "z"] as const)[i];
    r.axis.hidden = style !== "axis";
    r.axis.classList.toggle("on", a === ax); r.axis.setAttribute("aria-pressed", a === ax ? "true" : "false");
    r.plane.classList.toggle("on", p === ax); r.plane.setAttribute("aria-pressed", p === ax ? "true" : "false");
  });
}
function renderSnapWidget(): void {
  if (xrayBtnRef) { xrayBtnRef.classList.toggle("on", editor.xray); xrayBtnRef.setAttribute("aria-pressed", editor.xray ? "true" : "false"); }   // X 光钮跟着同一次刷新
  const btn = snapBtnRef;
  if (!btn) return;
  btn.classList.toggle("on", editor.grid.on);
  const look = snapSwitchLook(editor.modeId);   // 硬表面 = 格点钮、自由建模 = 磁铁（grid-state.ts；两边管的不是一回事）
  if (btn.dataset.icon !== look.icon) { btn.dataset.icon = look.icon; btn.firstElementChild?.insertAdjacentHTML("beforebegin", iconHtml(look.icon)); btn.children[1]?.remove(); btn.title = look.title; }
  const sd = btn.querySelector(".gizmo-subdiv") as HTMLElement;   // 右上角的吸附长度（硬表面；关着也显示、淡一点）
  sd.hidden = !look.length; sd.textContent = snapLabel(editor.grid.snap, editor.grid.system);
  const lk = btn.querySelector(".gizmo-snaplock") as HTMLElement, want = editor.grid.on ? "lock" : "unlock";
  if (lk.dataset.icon !== want) { lk.dataset.icon = want; lk.innerHTML = iconHtml(want); }
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
const leftDial = mountLeftDial($("stage"));   // 左栏 dial：软选择半径 + 画画的大小 / 浓度（1-7）
// 每支笔的旋钮 / 换笔（施工单二十 1b，app/paint-brushes.ts）：滑条的上限要问它，所以在挂滑条之前建；写回桌面态的 mirrorPaintDesk 在下面「笔跟文件走」那段。
const paintBrushes = createPaintBrushes(editor.config, () => mirrorPaintDesk());
mountPaintSliders(leftDial, editor, (t) => paintBrushes.sizeMax(t));
var softSliderRef: SoftSlider | null = mountSoftSlider(leftDial, $("stage"), canvas, editor, {
  visible: () => brushInHand() || (editor.modeId === "freeform" && editor.config.get("soft", "on") && SOFT_TOOLS.includes(editor.tool)),
  selectionScreenCenter: () => { const p = editor.selectionCenter("mean"); return p ? editor.cam.angularPx(p, editor.vp()) : null; },
});
// eslint-disable-next-line no-var
var mfdRef: { render(): void } | null = null;
mfdRef = mountMfd($("hintWrap"), {
  ctx: () => keyContext(),
  stance: () => stanceOf(editor.modeId, shownTool()),
  live: () => ({ held: { ...heldMods }, keys: lastPointerType === "mouse", pressing: canvasPresses.size > 0, finish: editor.finishLabel(), latched: { ...latchedMods } }),
  act: (a) => { if (a === "finish") editor.finishChain(); syncUi(); },   // 「收笔」「收刀」（W-7）= 和同一处再点一下同一条路
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
    mode: editor.modeId, tool: shownTool(), gesture: editor.isGestureActive(), anySelection: editor.hasAnySelection(), actableSelection: editor.hasActableSelection(),
    walk: locomotion.walkPhase(), walking: locomotion.isWalking(), mirrorSession: editor.mirrorActive(), lockStyle: editor.lockStyle(),
    typingWants: (e) => editor.typing.wants(e.key, e),   // 打字（手势中打数 / 数值小窗）：主人 typed-input.ts 定去向
    typing: editor.typing.text() !== "",   // 小窗里有字 = 正在打（自由建模的 1 / 2 / 3 让给它）
  };
}
/** 工具键：同一个键再按一下 = 在这个工具组里换下一把（user 2026-10-25「快捷键在工具组里怎么循环：同一个键再按一下」）：E 橡皮 → 焊边 → 软边；R 矩形 → 旋转矩形；T 卷尺 → 量角器 → 轴；A 弧的四种画法轮换（画法是工具选项）。 */
/**
 * 明着换工作台再拿工具（统筹 11-11）：要的工具不在当前工作台 → 先换到 among 里有这把工具、又管得了这种身体的工作台（编辑器 ownerModeOf），提示行说一句，再拿工具。
 * 编辑器的 setTool 自己从不换工作台（拒收、说在哪）。among：工具键 = 键表的跳转表 TOOL_KEY_JUMPS[当前工作台]（画画不在表里 = 出不去也进不来）；步行相机 / 材质面板 = 不限。
 */
function takeTool(t: Tool, among?: readonly ModeId[], how?: "borrow"): void {
  if (!editor.modeTools().includes(t)) {
    const m = editor.ownerModeOf(t, among);
    if (m) { editor.setMode(m); syncUi(); editor.setTool(t); hintEl.textContent = `换到了「${editor.modes().find((x) => x.id === m)?.label ?? m}」工作台`; return; }   // 跨工作台 = 真的换（不借）
  }
  editor.setTool(t, how);
}
function toolKey(key: string, t: Tool): void {
  const cyc = KEY_CYCLES[key];
  const how = (x: Tool): "borrow" | undefined => (keyBorrows(editor.modeId, x) ? "borrow" : undefined);   // 自由建模里快捷键拿起的 = 借（controller/tool-borrow.ts；回「选」的 Space / Tab 除外）
  if (cyc && cyc.includes(editor.tool)) { const next = cyc[(cyc.indexOf(editor.tool) + 1) % cyc.length]; if (editor.modeTools().includes(next)) { editor.setTool(next, how(next)); return; } }
  if (key === "a" && editor.tool === "arc") { const modes: string[] = ARC_MODES.map((m) => m.id), cur = editor.config.get("arc", "mode") as string; const nx = modes[(modes.indexOf(cur) + 1) % modes.length]; editor.config.set("arc", "mode", nx); hintEl.textContent = `弧：${ARC_MODES.find((m) => m.id === nx)?.label ?? nx}（再按 A 换下一种）`; syncUi(); return; }
  takeTool(t, TOOL_KEY_JUMPS[editor.modeId] ?? [], how(t));   // 不在这个工作台：只按跳转表明着跨（画画不在表里）；跳不了 = setTool 拒收、说这把工具在哪
}
function runKeyAction(action: string, ev: KeyboardEvent): void {
  const [verb, p1, p2] = action.split(":");
  switch (verb) {
    case "doc.save": void smartSave(); return;   // Ctrl+S（键表全局层；以前是 main.ts 另挂的文档级 keydown）
    case "doc.open": openLocal(); return;        // Ctrl+O
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
    case "ui.hideWindows": hintEl.textContent = hideWins.toggle(); break;
    case "grid.toggle":   // Shift+Tab = 开 / 关格点吸附（Blender 同键；user 待定，备选 N）
      editor.setGrid({ on: !editor.grid.on });
      hintEl.textContent = snapSwitchSay(editor.modeId, editor.grid.on);
      syncUi(); return;
    case "modal": {   // Blender 的 G / R / S / E / I / Alt+S / Ctrl+B：有选区就从光标处起手；没选区 = 切到那把工具（倒角 / 沿法线 = 提示）
      const t = p1 as Tool;
      if (!editor.startModal(t, p2)) {
        if (t === "shrink") hintEl.textContent = "沿法线移动：先选点 / 边 / 面";
        else if (p2) hintEl.textContent = p2 === "bevelVerts" ? "倒角（点）：先选点" : "倒角：先选边（选面 = 倒它的边）";
        else editor.setTool(t, "borrow");   // 没选区：借着拿起（蓝框），做完一次回原来那把（统筹 11-13 C；以前退回成一直拿着）
      }
      syncUi(); return;
    }
    case "select.all": editor.selectAll(); syncUi(); return;
    case "select.invert": editor.invertSelection(); return;
    case "select.none": editor.deselectAll(); return;
    case "delete.ifAny": if (editor.hasAnySelection()) editor.deleteSelection(); syncUi(); return;
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
    case "component.make": if (editor.hasGeometrySelection() || editor.hasPoolSelection()) editor.makeComponent(hex4()); return;   // SU：G = 建组件
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
      // 键盘 Esc / 芯片「取消」解这把工具记着的锁（W-4：锁不再随手势落定 / 换工具解；手指轻点的取消不解）。
      // 没在做手势、而这把工具锁着 = 这一下只解锁，到此为止（v0.19.3，Fable 审：不然一下 Esc 既解锁又退出组件，只想解锁的人会被带出去）；做手势时 = 取消这一下并且解锁
      if (!editor.isGestureActive() && (editor.axisLock !== null || editor.planeLock !== null)) { editor.clearToolLock(); syncUi(); return; }
      editor.clearToolLock();
      // 菜单 / 帮助 / 材质 / 调试日志开着时 Esc 到不了这里（输入闸的 escape：只关最上面那个面）
      // 自由建模的手势中（拖着 / 键盘起手 / 打数）→ 只取消这次操作、选区留着（Blender：G / S 里 Esc 只退回去；2026-10-28 晚「S Z 0」接线时改，硬表面照旧）
      if (editor.escToFinish()) { syncUi(); return; }   // 刀在等下一点：Esc = 收刀、开「切割」小窗（W-8，Fable 11-10）；再按一次才是取消
      if (editor.modeId === "freeform" && editor.isGestureActive() && !editor.mirrorActive()) { editor.abortGesture(); syncUi(); return; }
      if (editor.dropBorrow()) { syncUi(); return; }   // 借着一把（蓝框）、什么都还没做：Esc = 回原来那把（统筹 11-13 C），这一下不再清选区
      // 手势中 / 有选区 → 取消；否则在 group / 组件里 → 退出一层（SU：Esc 关组）
      if (!editor.isGestureActive() && !editor.hasAnySelection() && editor.contextDepth() > 0) editor.exitContext(); else editor.cancel();
      return;
  }
}
window.addEventListener("keydown", (ev) => {
  if (!inputGate.admits("key")) {   // 第二层（输入闸）：面 / 菜单 / 文本框 / 参考窗开着，键盘不进编辑器。以前 Ctrl+Z 能隔着弹窗撤销，问的时候场景变了（2026-11-05，无头实测）
    if ((ev.ctrlKey || ev.metaKey) && /^[so]$/i.test(ev.key)) ev.preventDefault();   // app 的存 / 开：不进编辑器，也别变成浏览器的「另存网页」框
    return;
  }
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
  // 点「刷新」前：脏的落本地，没推的最多等 5 s 推一次，干净的不碰（session.flushBeforeReload；工单 C3 B）。transient / file 家由 beforeunload 挽留兜
  onBeforeReload: async () => { note("sw", "reload requested → flush"); await _session?.flushBeforeReload(); },
  // 回前台：打开中文档显式快进 + 图库开着就刷列表（WeebPaint onForeground 同形；判据 = 登录态）
  onForeground: () => { retrySilentQuietly("foreground"); if (!cloudGate.isRunning()) void _session?.refreshOpenDoc(); if (galleryHost.isOpen()) galleryHost.refresh(); },
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
  paintOfflineBar();   // 选了「离线继续」时常驻条的份数跟着变（工单 C）
  { lockBadge.hidden = !editor.locked; document.body.classList.toggle("doc-locked", editor.locked); }   // 护栏 ①（演示锁）：锁着 → 左上角「锁着」+ 工具区灰掉
  syncAttentionBanner();   // 2026-10-26：和云端没对上 → 横幅在 / 对上了 → 横幅走
  const st = session.saveState();
  btnSave.dataset.state = st;
  btnSaveIcon.setAttribute("href", `#${st === "local-only" && session.home.kind === "gallery" ? "cloud-unavailable" : st === "synced" && isFolderHome() ? "folder" : SAVE_ICON[st]}`);   // 文件夹家写进去了 = 文件夹，不画云   // 图库家未登录 = 斜杠云（云不可用，登录可修）
  btnSave.title = session.saveTitle();
  // 网页标题永远只是「CatsUp」（index.html 写死）：文档名进标题 = 浏览器历史按文档名记那个地址（user 2026-10-14「就放一个自己的名字，不解释，google也这么干的」，全家族同一标准）
  // 「上次开着什么」= @internal/gallery 回执条，唯一写点在 session.setHome（v0.5.7；旧 last-doc / last-scene 键退役）。
  //   gallery-attached = 「这台设备曾挂过图库」（WeebPaint registry 的单库等价物）：boot 据此在 initAuth 之前接店、本地恢复。
  //   文件夹家不碰这个旗：它说的是以前那个本机库（搬家要认它）；换家那一段（搬完到刷新）也不碰：搬家刚把它记成退役。以前那个库又当家了 = 不再算退役。
  //   只在挂着库时记「1」；清它的只有四处明说的：开机拆空库（settleNoHome）、搬完退役（runMove）、文件夹家数到旧库是空的（moveIntoCurrentFolder）、退出登录（cloudSignOut）。
  if (!isFolderHome() && !homeSwitching && hasStore()) { deviceKvSet("gallery-attached", "1"); deviceKvSet("legacy-retired", null); }
}
/** 换家进行中（选了文件夹 → 搬 → 记名册 → 刷新）：这一段 updateSaveStatus 不写家的旗。 */
let homeSwitching = false;
/** smart save = Ctrl+S = 点钮：非图库家 → 保存/安家；图库家已登录 → 存+推（不脏也推，让时间戳走字）；已配置未登录 → 本地存 + 「现在登录同步？」。 */
let cloudPromptDeclined = false;   // 同一 session 点过「暂不」→ 之后只状态行提示，不再弹
function smartSave(): void {
  if (session.home.kind !== "gallery" || isFolderHome() || !auth.isAuthConfigured() || (auth.isSignedIn() && cloudOnline())) { void session.save(); return; }   // 文件夹家：存 = 写进文件夹，不问登录
  void session.save();   // 已配置未登录：本地保存照做（不 await——sheet 与 IDB 事务并行）
  if (cloudPromptDeclined || !cloudOnline()) return;
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
refBtn.addEventListener("click", () => { refHost.toggle(); syncRefBtn(); });
const syncRefBtn = (): void => { const on = refHost.isOpen(); refBtn.classList.toggle("on", on); refBtn.setAttribute("aria-pressed", on ? "true" : "false"); };
new MutationObserver(syncRefBtn).observe(refHost.el, { attributes: true, attributeFilter: ["open"] });
syncRefBtn();
// 画画工作台的笔跟文件走（desk 1.5 paint；user 11-11「笔的设置记在哪 学weebpaint」：画画软件 v406 起就是这样，设备上不记；1.6 起按笔记，施工单二十 1b）。
// 载入 / 新建时套上（套的时候不回写）；换笔、改了大小 / 浓度 / 硬度 / 颜色 = 写回桌面态（不标脏、不进撤销，下次存盘顺手带走）。每支笔的旋钮和换笔归 app/paint-brushes.ts。
// 先建颜色：会话一载入文件就要套上它（在会话之前建，免得开机那一下还没建好）。
const paintColor = createPaintColor();
let applyingPaintDesk = false, paintDeskReady = false;
function applyPaintDesk(p: PaintDeskDoc | null): void {
  applyingPaintDesk = true;
  try {
    paintBrushes.apply(p);   // 每支笔的旋钮 + 每把工具拿的是哪支（工具表的 set 自己夹到滑条的范围：文件里写了 1e9 / 负数 / 浓度 5 也不炸）
    paintColor.set(parseHexColor(p?.color ?? "") ?? PAINT_COLOR_DEFAULT);
  } finally { applyingPaintDesk = false; }
}
function mirrorPaintDesk(): void {
  if (applyingPaintDesk || !paintDeskReady) return;
  const prev = session.paintDesk;   // 本版没有的笔、别的 tool、paint 里不认识的键原样留着
  session.setPaintDesk({ color: hexOf(paintColor.get()), ...paintBrushes.toDesk(prev), extra: prev?.extra ?? {} });
}
editor.config.subscribe((tool) => paintBrushes.onConfig(tool));
paintColor.subscribe(mirrorPaintDesk);
// 手上还有没有一下没收（controller/hand-busy.ts）：会话的自动保存 / 崩溃快照 / 重推只问这张名册。加一种来源 = HAND_SOURCES 一个名字 + 这里一行（守卫 test/hand-busy.test.ts）
const hand = createHandRoster();
hand.add({ source: "editor.gesture", busy: () => editor.isGestureActive() });   // 编辑器的工具手势（拖到一半、点了第一下等第二下……）
hand.add({ source: "paint.stroke", busy: () => !!paintWb?.stroking || paintBoards.anyStrokeOpen() });   // 画画的一笔：画画工作台按着的那一笔（1-7）+ 哪块画板开着一笔（三维那一笔 / 画布上的二维笔，施工单二十一第 1 刀；同一个来源，「没收时存盘」那条检查照旧管它）
const session = new Session({
  editor,
  hand,
  paintSave: paintSaver,
  pushHeld: (path) => pushHoldAll || heldNeverUploaded.has(path),
  onExplicitSave: (path) => { heldNeverUploaded.delete(path); },
  refs: refHost,
  captureThumbnail: () => captureThumbnail(editor),
  applyPaint: (p) => applyPaintDesk(p),
  applyView: (style, screen) => { editor.renderer3.setPreset(isPresetId(style) ? style : "white"); syncNight(); editor.renderer3.setScreen(isScreenId(screen) ? screen : null); editor.draw(); },   // 风格 / 屏幕跟文件走（desk 1.3，T86）：认不出的 id = 默认
  onHomeChanged: updateSaveStatus,
  setStatus: (text, error) => { note("doc", (error ? "✗ " : "") + text); notify({ text, level: error ? "error" : "info" }); },
  online: cloudOnline,
  goOffline: () => cloudGate.escape(),
  thumbChanged: (path) => galleryHost.invalidateThumb(path),
  crypto: { ensureUnlocked, ensureNewPassword, isFreshPasswordSetup, rollbackFreshPassword, setPassword, getPassword, unlockImportedContainer, isEncryptedBlob: (bytes) => appEncryption.isEncryptedBlob(bytes),
    packShadow: (bytes, name, pw) => appEncryption.packContainer({ dataBytes: bytes, fileName: name, ext: "catsup", password: pw }) },
});
paintDeskReady = true;   // 会话建好了：从这以后改笔才写回桌面态
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
onLocked(() => session.forgetSealPassword());
// CSP（index.html 的 meta）拦下的东西进黑匣子（log 级）：真机上某个功能突然不灵时，先看这里是不是策略挡了它。
document.addEventListener("securitypolicyviolation", (e) => funnel(new Error(`[csp] blocked ${e.effectiveDirective} ${String(e.blockedURI).slice(0, 120)} (${e.sourceFile ? e.sourceFile.split("/").pop() : "?"}:${e.lineNumber})`), "log"));
configureTabMemory({ get: (k) => session.menuTab(k), set: (k, t) => session.setMenuTab(k, t) });   // 两个 ☰ 停在哪页跟着文件走（WeebPaint desk.menuTab 同款）
_session = session;
// 输入闸的理由 + 剩下的名册（rank 对齐 styles.css 的 z 序；别的面在它们自己的模块里登记：sheets.ts / popup-menu.ts / debug-log-sheet.ts）
inputGate.hold({ kind: "lock", why: HINT_LOCKED, on: () => session.locked() });
inputGate.hold({ kind: "asking", why: "先回答弹窗", on: isAnyFaceUp });
inputGate.face({ kind: "refwin", label: "参考窗", rank: 20, up: () => refHost.hasFocus() });   // 参考窗有焦点：空格 / ← → 归它（视频播放、逐帧、翻页），工具快捷键让路
locomotion.flat.admits = () => inputGate.admits("key");
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
inputGate.face({ kind: "face", label: "图库", rank: 250, up: () => galleryHost.isOpen() });   // 全屏盖住场景：键盘 / 滚轮不进编辑器。不写 root：卡片菜单带、通知都在它自己的 DOM 外面，门口不吞，它们照常能点
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
      .then((leave) => { note("auth", `redirect snapshot ${leave ? "ok" : "cancelled at leave gate"} ${(performance.now() - t0).toFixed(0)}ms`); return leave; }, (e) => { note("auth", `redirect snapshot failed: ${String((e as { message?: unknown })?.message ?? e)}`); return true; })
      .then((leave) => { if (leave) go(); });
  } else go();   // 手势同步栈起跳（iOS redirect）
}
/** 退出登录 = 拆库 + 锁 + 忘（Fable 11-04「对齐 MoonSinger = 拆库」；ADR-0001 锁 + 忘）：开着的那份先落本机 → 关图库 → 退出微软账号
 *  （库还活着，听得见「登出」、清掉云端列表的缓存）→ 放掉 store → 开着的模型留在内存里当临时模型（文件模式：存 = 存到磁盘）→ 锁 + 忘口令。
 *  这台设备上的字节一个不删不动，再登录就接上。之后不能往浏览器里新建（没有家 = 文件模式）。
 *  还有没传上去的：下次开机照旧挂上那个库（gallery-attached 留着）= 「只在浏览器里」那条 + 问一次搬 / 导出，不让它们藏起来。 */
async function cloudSignOut(): Promise<void> {
  note("auth", "sign-out click");
  try {
    const left = hasStore() ? await requireStore().files.dirty.count().catch(() => 0) : 0;
    await session.flushLocal();
    if (galleryHost.isOpen()) galleryHost.close();
    await auth.signOut();
    await new Promise((r) => setTimeout(r, 50));   // 让库收完「登出」那一下（清云端列表缓存）再放掉它
    if (hasStore()) { await disposeStore(); storeWired = false; }
    deviceKvSet(KV_ATTACHED, left > 0 ? "1" : null);
    session.detachFromGallery();
    lockPasswords(); void forgetRemembered();
    browserOnlyCount = 0;
    updateSaveStatus(); updateCloudChip();
    note("home", `signed out → library detached (unpushed left in this browser: ${left})`);
    notify({ text: `已退出 OneDrive 登录：图库关了，开着的模型留在这里当临时模型（存 = 存到磁盘）；这台设备上的副本一个没删${left ? `，其中 ${left} 份还没传上去，再登录会接着传` : ""}；口令也忘了`, level: "info", timeoutMs: null });
  } catch (e) { funnel(e); }
}
type CloudId = "in" | "out" | "refresh" | "regrant" | "useCloud" | "leaveFolder";
/** 离开文件夹家：文件一个字节不动，只是下次不挂。还有没写进去的如实说（不硬拦，09-29）。 */
async function leaveFolderHome(thenSignIn: boolean): Promise<void> {
  const n = await requireStore().files.dirty.count().catch(() => 0);
  if (n > 0 && !(await openConfirmSheet("还有没写进文件夹的", `${n} 份改动还没写进文件夹，留在这台设备上，下次选回这个文件夹时接着写。确定断开？`))) return;
  if (!(await session.leaveGate())) return;
  await session.flushLocal();
  await forgetFolderHome();
  note("home", `leave folder "${folderHomeLabel()}" → ${thenSignIn ? "sign in" : "reload"}`);
  if (thenSignIn) cloudSignIn(); else location.reload();
}
cloudBtn.addEventListener("click", () => togglePopupMenu<CloudId>({
  anchor: cloudBtn, align: "end",
  items: () => isFolderHome() ? [
    ...(folderHomeOnline() ? [] : [{ id: "regrant" as CloudId, label: "重新授权文件夹", icon: "folder", hint: `「${folderHomeLabel()}」的权限掉了` }]),
    { id: "useCloud" as CloudId, label: "图库改用网盘", icon: "cloud", hint: `现在在文件夹「${folderHomeLabel()}」`, disabled: !auth.isAuthConfigured() },
    { id: "leaveFolder" as CloudId, label: "断开这个文件夹", icon: "folder", hint: "文件还在夹里，回到文件模式" },
  ] : [
    ...(auth.isSignedIn()
      ? [{ id: "refresh" as CloudId, label: "刷新云端", icon: "refresh" }, { id: "out" as CloudId, label: "退出登录", icon: "cloud", hint: (auth.getActiveAccount() as { username?: string } | null)?.username }]
      : [{ id: "in" as CloudId, label: "登录 OneDrive", icon: "cloud", disabled: !auth.isAuthConfigured(), hint: auth.isAuthConfigured() ? "个人账号" : "未配置 client id" }]),
  ],
  onPick: (id) => { if (id === "in") cloudSignIn(); else if (id === "out") void cloudSignOut(); else if (id === "regrant") regrantFolder(); else if (id === "useCloud") void leaveFolderHome(true); else if (id === "leaveFolder") void leaveFolderHome(false); else galleryHost.refresh(); },
}));
// ---- 图库的家（规则书 §1 第 13 条「库必须有家：网盘或本地文件夹，没有家 = 文件模式」；工单 F-152 / F-153；判定在 gallery-home.ts homeState，组装只在 currentHomeState 一处）----
//   顺序不能反（家族 ai-docs/20261103-library-needs-a-home.md §4）：先保住浏览器里已有的（披露条 + 全部导出 + 搬家），再收入口。
//   换家 = 记到名册后刷新（开机只有一条挂库路）。搬家的不变量在 home-move.ts 头注释；写口在 app-store.ts homeMovePorts（store 的写只准在接缝 / session）。
type StoreFace = ReturnType<typeof requireStore>;
const KV_ATTACHED = "gallery-attached", KV_LEGACY_RETIRED = "legacy-retired", KV_MOVE_ASKED = "home-move-asked", KV_MOVE_NOTE = "home-move-note";
/** 只在浏览器里的模型（以前那个本机库里 move 类 + copy 类的份数；刷新时机 = refreshBrowserOnly）。 */
let browserOnlyCount = 0;
function currentHomeState(): HomeState { return homeState({ folder: isFolderHome(), signedIn: auth.isSignedIn(), accountExpected, browserOnlyModels: browserOnlyCount }); }
const galleryHomeBar = $("galleryHomeBar");
/** 图库顶上那条（一处判定）：文件夹权限掉了 > 还有没搬的 > 没有家的披露。登录探测落地之前不说（有账号的人开局闪一下「没有备份」是假话）；有账号但过期 = 东西在网盘上，归闸门和离线常驻条。 */
function paintGalleryHomeBar(): void {
  const settled = !auth.isAuthConfigured() || authInited, st = currentHomeState(), folder = st === "folder";
  const lost = folder && !folderHomeOnline();
  galleryHomeBar.hidden = !lost && (!settled || browserOnlyCount <= 0 || st === "cloud");
  $("galleryHomeBarText").textContent = lost ? `文件夹「${folderHomeLabel()}」的权限掉了：改动先存在这台设备上，一份没丢`
    : folder ? `这台设备的浏览器里还有 ${browserOnlyCount} 份模型，没搬进「${folderHomeLabel()}」` : "这些模型只在这台设备的浏览器里，没有备份";
  $("galleryRegrant").hidden = !lost;
  $("galleryExportAll").hidden = lost;
  $("galleryConnect").hidden = lost || folder || !auth.isAuthConfigured();
  $("galleryPickFolder").hidden = lost || (!folder && !canPickFolder());
  $("galleryPickFolder").textContent = folder ? "搬进来" : "选一个文件夹，搬进去";
}
async function exportAllModels(from?: StoreFace): Promise<void> {
  const store = from ?? requireStore();
  const now = new Date(), stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const name = `CatsUp-图库-${stamp}.zip`;
  const r = await withBusy("正在打包图库里的模型…", () => exportAll({
    listFolder: (folder) => new Promise((resolve, reject) => {
      let done = false, off: (() => void) | null = null;
      off = store.files.watchFolder(folder, (snap) => {   // 第一帧 = 本地帧（没登录就只有它）；这台没字节的不收（不是「只在浏览器里」的；加密件也搬不了容器，走 open 就成明文了）
        if (done) return; done = true; off?.();
        resolve({ identifiers: snap.items.filter((i) => isCached(i.syncState)).map((i) => i.identifier), folders: snap.folders });
      }, { onError: (e) => { if (!done) { done = true; off?.(); reject(e); } } });
      if (done) off();   // 帧在 watchFolder 返回前就同步来了
    }),
    encryptedBytes: async (id) => (await store.file(id, { mode: "existing" }).getEncryptedBlob()) as Blob | null,
    plainBytes: (id) => store.file(id, { mode: "existing" }).open(),
    pack: (entries) => zipPack(entries),
  }));
  note("doc", `export-all plain=${r.plain} encrypted=${r.encrypted} failed=${r.failed.length}`);
  if (r.zip) await deliverFile(new File([r.zip], name, { type: "application/zip" }), name, (t: string) => note("doc", t));
  const said = exportAllSay(r, name);
  notify({ text: said.text, level: said.bad ? "error" : "info", ...(said.bad ? { timeoutMs: null } : {}) });
}
/** 「全部导出」= 只在浏览器里的那些（家是文件夹时导出的是还留在浏览器里的旧模型，不是夹里的）。 */
async function exportBrowserOnly(): Promise<void> {
  const src = legacyStore();
  try { await exportAllModels(src.store); }
  finally { if (src.owned) await src.store.dispose().catch(() => {}); }
}
/** 一个库里所有该搬的（走遍文件夹，第一帧 = 本地帧）。 */
async function movableIn(store: StoreFace): Promise<{ items: ModelToMove[]; total: number }> {
  const m = await walkLibrary((d) => snapshotFolderOnce((f, cb) => store.files.watchFolder(f, cb), d));
  return { items: m.files.flatMap((f) => { const kind = moveKindOf(f.syncState); return kind ? [{ identifier: f.identifier, kind }] : []; }), total: m.files.length };
}
/** 只在浏览器里的旧模型。网盘是家 = 同一个库，不用搬；文件夹是家 = 另开一个永远离线的旧库实例看（库不存在 / 退役了 = 不开，开了就等于建了）；
 *  没有家但挂着旧库 = 看它自己（登录探测没落地 = 不说，有账号的人会被假话吓到）。 */
async function legacyScan(): Promise<{ items: ModelToMove[]; total: number }> {
  const none = { items: [], total: 0 };
  if (currentHomeState() === "cloud") return none;
  if (isFolderHome()) { if (deviceKvGet(KV_LEGACY_RETIRED) === "1" || !(await legacyLibraryExists(deviceKvGet(KV_ATTACHED) === "1"))) return none; }
  else if (!hasStore() || (auth.isAuthConfigured() && !authInited)) return none;
  const src = legacyStore();
  try { return await movableIn(src.store); }
  finally { if (src.owned) await src.store.dispose().catch(() => {}); }
}
async function refreshBrowserOnly(): Promise<ModelToMove[]> {
  let scan: { items: ModelToMove[]; total: number } = { items: [], total: 0 };
  try { scan = await legacyScan(); } catch (e) { funnel(e, "log"); }
  browserOnlyCount = scan.items.length;
  paintGalleryHomeBar();
  return scan.items;
}
async function waitAuthSettled(ms = 3000): Promise<void> { const t0 = Date.now(); while (auth.isAuthConfigured() && !authInited && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 100)); }
/** 用户点「图库」走这里。有家 / 还有没搬的（「稍后」= 入口不收）→ 开；都没有 → 先选家（库里不建东西）。 */
async function openGalleryFromUi(): Promise<void> {
  await waitAuthSettled();
  await refreshBrowserOnly();
  if (currentHomeState() === "none") { await chooseHome(); return; }
  await galleryHost.open();
}
/** 入口：说明一句 + 两个去处（这里用不了的不露、说为什么）。没选 = 还是文件模式，什么都不建。 */
async function chooseHome(): Promise<void> {
  let picked: Promise<GalleryEntry | null> | null = null;
  const cloud = auth.isAuthConfigured(), folder = canPickFolder();
  const v = await openChoiceSheet<"cloud" | "folder">(
    "图库要有一个家",
    `模型放进网盘或你选的文件夹，才不会只留在这个浏览器里。${folder ? "" : "这个浏览器选不了文件夹（桌面版 Chrome / Edge 可以）。"}不选也能用：保存 = 存到磁盘，打开 = 选文件。`,
    [
      ...(cloud ? [{ label: "连接网盘（OneDrive）", value: "cloud" as const, primary: true, onPick: () => { cloudSignIn(); } }] : []),   // 同步栈里起跳（iOS 红线）
      ...(folder ? [{ label: "选一个文件夹", value: "folder" as const, primary: !cloud, onPick: () => { picked = pickFolderEntry(); } }] : []),   // 选择框要手势
    ],
  );
  if (v === "folder" && picked) await settleIntoFolder(picked, "ask");
}
/** 选了文件夹：有只在浏览器里的 → 先问（move = 人在上一张面已经说了搬）、搬；记到名册，刷新（开机只有一条挂库路）。 */
async function settleIntoFolder(picked: Promise<GalleryEntry | null>, intent: "ask" | "move"): Promise<void> {
  const entry = await picked;
  if (!entry) return;
  if (!(await ensureFolderPermission(entry, { request: true }))) { notify({ text: `没拿到「${entry.label}」的读写权限，图库的家没换`, level: "warning" }); return; }
  if (!(await session.leaveGate())) return;
  await session.flushLocal();
  homeSwitching = true;
  const items = await refreshBrowserOnly();
  note("home", `picked folder "${entry.label}" db=${entry.dbId}; browser-only=${items.length}`);
  if (items.length) {
    const v = intent === "move" ? "move" : await askMove(items.length, entry.label);
    if (v === "export") await exportBrowserOnly();
    else if (v === "move") {
      const dest = openFolderDestination(entry);
      try { await runMove(items, dest); }
      finally { await dest.store.dispose().catch(() => {}); }
    }
  }
  try { await rememberFolderHome(entry); }
  catch (e) { homeSwitching = false; throw e; }
  location.reload();
}
/** 「搬进 X / 全部导出 / 稍后」。问过就记一笔（开机只主动问一次，之后走顶上那条）。 */
async function askMove(n: number, label: string): Promise<"move" | "export" | "later"> {
  deviceKvSet(KV_MOVE_ASKED, "1");
  const v = await openChoiceSheet<"move" | "export" | "later">(
    `有 ${n} 份模型只在这个浏览器里`,
    `清浏览器数据就没了。搬进「${label}」：逐份核对字节，一模一样才从浏览器移走（移进浏览器的回收站）；加密的还是加密的，不用输口令。稍后也行：图库顶上那条还在。`,
    [{ label: `搬进「${label}」`, value: "move", primary: true }, { label: "全部导出", value: "export" }, { label: "稍后", value: "later" }],
  );
  return v ?? "later";
}
/** 搬（铁律在 home-move.ts）。结果写进回执（刷新后开机说），带名单。 */
async function runMove(items: readonly ModelToMove[], dest: { store: StoreFace; label: string; readBack: (identifier: string) => Promise<Blob | null> }): Promise<void> {
  const src = legacyStore();
  try {
    const ports = homeMovePorts(src.store, dest);
    const r = await withBusy(`正在搬进「${dest.label}」…`, () => moveToHome(items, ports));
    // 口令验证器跟着搬（Fable 11-04）：搬进去的有加密件 ∧ 新家还没有 → 原样拷过去；新家已有 → 不动。判定在 home-move.ts carryVerifier。
    const movedEncrypted = [...r.moved, ...r.copied].some((m) => ports.encrypted.has(m.from));
    const carry = await carryVerifier(movedEncrypted, verifierCarryPorts(src.store, dest.store)).catch((e) => { funnel(e, "warning"); return "dest-unknown" as const; });
    const finished = moveFinished(r);
    browserOnlyCount = finished ? 0 : r.failed.length + r.stuck.length;
    note("home", `move → "${dest.label}": moved=${r.moved.length} copied=${r.copied.length} failed=${r.failed.length} stuck=${r.stuck.length} encrypted=${ports.encrypted.size} verifier=${carry}`);
    if (finished) {   // 旧库退役：不再数、不再问；移走的在旧库的回收站里（还原出厂才清），连着网盘的还在原处
      deviceKvSet(KV_LEGACY_RETIRED, "1");
      if (!accountExpected) deviceKvSet(KV_ATTACHED, null);   // 没账号 = 以后断开文件夹回到文件模式，不再接以前那个库（有账号：它是网盘的本机副本，留着）
    }
    const said = moveSay(r, dest.label, bareName), extra = verifierSay(carry, dest.label);
    deviceKvSet(KV_MOVE_NOTE, JSON.stringify(extra ? { ...said, text: `${said.text}；${extra}` } : said));
  } finally { if (src.owned) await src.store.dispose().catch(() => {}); }
}
function sayMoveNote(): void {
  const raw = deviceKvGet(KV_MOVE_NOTE);
  if (!raw) return;
  deviceKvSet(KV_MOVE_NOTE, null);
  try { const said = JSON.parse(raw) as { text: string; bad: boolean }; notify({ id: "home-move", level: said.bad ? "warning" : "info", timeoutMs: null, text: said.text }); }
  catch (e) { funnel(e, "log"); }
}
/** 往现在挂着的文件夹里搬（开机问一次 / 顶上那条「搬进来」）。 */
async function moveIntoCurrentFolder(ask: boolean): Promise<void> {
  if (!isFolderHome() || !folderHomeOnline()) return;
  const items = await refreshBrowserOnly();
  if (!items.length) { if (deviceKvGet(KV_LEGACY_RETIRED) !== "1" && !accountExpected && deviceKvGet(KV_ATTACHED) === "1") { deviceKvSet(KV_LEGACY_RETIRED, "1"); deviceKvSet(KV_ATTACHED, null); } return; }
  const dest = currentFolderDestination();
  if (ask) {
    if (deviceKvGet(KV_MOVE_ASKED) === "1" || isAnyFaceUp()) return;
    const v = await askMove(items.length, dest.label);
    if (v === "export") { await exportBrowserOnly(); return; }
    if (v !== "move") return;
  }
  await runMove(items, dest);
  sayMoveNote();
  paintGalleryHomeBar();
  if (galleryHost.isOpen()) galleryHost.refresh();
}
/** 没有家、挂着以前那个库：开机问一次（一台设备一次；之后走顶上那条）。 */
async function offerMoveWithoutHome(items: readonly ModelToMove[]): Promise<void> {
  if (deviceKvGet(KV_MOVE_ASKED) === "1" || isAnyFaceUp()) return;
  deviceKvSet(KV_MOVE_ASKED, "1");
  let picked: Promise<GalleryEntry | null> | null = null;
  const folder = canPickFolder(), cloud = auth.isAuthConfigured();
  const v = await openChoiceSheet<"folder" | "cloud" | "export" | "later">(
    `这个浏览器里有 ${items.length} 份模型`,
    `它们只在这个浏览器里，清浏览器数据就没了。${folder ? "搬进你选的文件夹：逐份核对字节，一模一样才从浏览器移走。" : ""}${cloud ? "连接网盘：登录后问你传不传。" : ""}或者先全部导出成文件。稍后也行：图库顶上那条还在。`,
    [
      ...(folder ? [{ label: "选一个文件夹，搬进去", value: "folder" as const, primary: true, onPick: () => { picked = pickFolderEntry(); } }] : []),
      ...(cloud ? [{ label: "连接网盘（OneDrive）", value: "cloud" as const, primary: !folder, onPick: () => { cloudSignIn(); } }] : []),
      { label: "全部导出", value: "export" as const }, { label: "稍后", value: "later" as const },
    ],
  );
  if (v === "folder" && picked) await settleIntoFolder(picked, "move");
  else if (v === "export") await exportBrowserOnly();
}
/** 没有家、以前那个库里一份都没有：不留一个没有家的空库（「没有家不建 store」；照 MoonSinger settleNoHome）。手里有东西 = 不动；空图库开着 = 关掉回到文件模式。 */
async function settleNoHome(total: number): Promise<void> {
  if (isFolderHome() || !hasStore() || currentHomeState() !== "none" || total > 0) return;
  if (session.home.kind === "gallery" && !session.isUntouchedLazyBlank()) return;
  if ((await requireStore().files.dirty.count().catch(() => 1)) > 0) return;
  if (galleryHost.isOpen()) galleryHost.close();
  await disposeStore();
  storeWired = false;
  deviceKvSet(KV_ATTACHED, null);
  if (session.home.kind === "gallery") await session.newDoc();
  updateSaveStatus();
  note("home", "no account, no models → no library (file mode)");
}
/** 开机之后：上次搬家的回执；文件夹家还有没搬的 → 问一次；没有家 → 有旧模型问一次、一份都没有就不留空库。 */
async function afterBootHome(): Promise<void> {
  sayMoveNote();
  if (isFolderHome()) { if (folderHomeOnline()) await moveIntoCurrentFolder(true); else await refreshBrowserOnly(); return; }
  let scan: { items: ModelToMove[]; total: number } = { items: [], total: 0 };
  try { scan = await legacyScan(); } catch (e) { funnel(e, "log"); return; }
  browserOnlyCount = scan.items.length;
  paintGalleryHomeBar();
  if (currentHomeState() === "browser-only") await offerMoveWithoutHome(scan.items);
  else if (authInited) await settleNoHome(scan.total);
}
// 文件夹权限：开机只查不弹；掉了 = 离线态（改动攒在本机）+ 一键重新授权（**在点击里**申请）。回前台再查一次（不弹）。
function regrantFolder(): void {
  void requestFolderPermission().then((ok) => {
    if (!ok) { notify({ text: `没拿到「${folderHomeLabel()}」的权限：改动还存在这台设备上，一份没丢`, level: "warning" }); return; }
    closeNotice("folder-perm");
    void onFolderWritable();
  }).catch((e) => funnel(e));
}
/** 开机挂上的那个文件夹（名册条目，带句柄）。 */
let folderEntryNow: GalleryEntry | null = null;
/** 点击的同步栈里起跳：requestPermission 要手势（条目开机就拿在手里，这里不先等 IDB）。 */
function requestFolderPermission(): Promise<boolean> {
  return folderEntryNow ? ensureFolderPermission(folderEntryNow, { request: true }) : Promise.resolve(false);
}
async function onFolderWritable(): Promise<void> {
  setFolderHomeOnline(true);
  note("home", `folder "${folderHomeLabel()}" writable`);
  updateSaveStatus(); paintGalleryHomeBar();
  if (galleryHost.isOpen()) galleryHost.refresh();
  await offerPushLocalOnly("folder").catch((e) => funnel(e, "log"));   // 攒在本机的写进去（文件夹没有「第一次放进某个账号」：都算续传）
}
function showFolderPermissionChip(label: string): void {
  notify({ id: "folder-perm", level: "warning", timeoutMs: null, text: `文件夹「${label}」要重新授权：改动先存在这台设备上，授权后写进去`, actions: [{ label: "授权", primary: true, onClick: () => { regrantFolder(); } }] });
}
async function recheckFolderPermission(): Promise<void> {
  if (!isFolderHome() || !folderEntryNow) return;
  const ok = await ensureFolderPermission(folderEntryNow, { request: false });
  if (ok === folderHomeOnline()) return;
  if (ok) { closeNotice("folder-perm"); await onFolderWritable(); return; }
  setFolderHomeOnline(false);
  note("home", `folder "${folderHomeLabel()}" permission lost`);
  updateSaveStatus(); paintGalleryHomeBar();
  showFolderPermissionChip(folderHomeLabel() ?? "");
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void recheckFolderPermission().catch((e) => funnel(e, "log")); });
$("galleryRegrant").addEventListener("click", () => regrantFolder());
$("galleryPickFolder").addEventListener("click", () => {
  if (isFolderHome()) { void moveIntoCurrentFolder(false).catch((e) => { funnel(e); notify({ text: `搬家没成：${(e as Error)?.message ?? e}。浏览器里的一份没动`, level: "error" }); }); return; }
  void settleIntoFolder(pickFolderEntry(), "move").catch((e) => { funnel(e); notify({ text: `换家没成：${(e as Error)?.message ?? e}。浏览器里的一份没动`, level: "error" }); });   // 选择框要手势：同步栈里起跳
});
// 放回图库（还是加密的；工单 C5）：先核口令，原容器字节原样入库，撞名加编号，解开的内容用完就丢。图库得有家（没有家 = 先选家，不往浏览器里放）。
const putBackInput = document.createElement("input"); putBackInput.type = "file"; putBackInput.accept = ".zip"; putBackInput.hidden = true; document.body.appendChild(putBackInput);
$("galleryPutBack").addEventListener("click", () => {
  if (!hasHome(currentHomeState())) { notify({ text: "图库还没有家：先连接网盘或选一个文件夹，再把加密文件放回来", level: "info" }); return; }
  putBackInput.value = ""; putBackInput.click();
});
putBackInput.addEventListener("change", () => {
  const file = putBackInput.files?.[0];
  if (file) void putBackFile(file).catch((e) => { funnel(e); notify({ text: `放回图库失败：${(e as Error)?.message ?? e}。图库里没有多出东西`, level: "error" }); });
});
async function putBackFile(file: File): Promise<void> {
  const r = await putBack(file, identifierForFile(file.name, galleryHost.currentFolder(), DOC_EXT), {
    isContainer: (b) => appEncryption.isEncryptedBlob(b),
    unlock: (b) => unlockImportedContainer(b),
    isModel: async (plain) => isCatsupDocumentHead(new Uint8Array(await plain.slice(0, 256 * 1024).arrayBuffer())),
    ...putBackPorts(),
  });
  note("doc", `put-back "${file.name}" → ${r.status}${r.status === "placed" ? ` ${r.identifier}` : ""}`);
  if (r.status === "not-container") { notify({ text: "这不是加密文件。普通工程用「打开」就行", level: "info" }); return; }
  if (r.status === "not-a-model") { notify({ text: "口令对，但里面不是 CatsUp 工程，没有放进图库", level: "warning" }); return; }
  if (r.status === "cancelled") return;
  onPasswordVerified(r.identifier, r.password);
  galleryHost.refresh();
  notify({ text: `「${bareName(r.identifier)}」放回图库了，还是加密的`, level: "info" });
}
$("galleryExportAll").addEventListener("click", () => { void exportBrowserOnly().catch((e) => { funnel(e); notify({ text: `导出失败：${(e as Error)?.message ?? e}`, level: "error", timeoutMs: null }); }); });
$("galleryConnect").addEventListener("click", () => { void cloudSignIn(); });
function updateCloudChip(): void {
  paintGalleryHomeBar();
  const st = isFolderHome() ? "folder" : auth.isSignedIn() ? "in" : "out";   // 家是文件夹：这颗钮管文件夹（重新授权 / 改用网盘 / 断开），画文件夹
  cloudBtn.dataset.cloudState = st; cloudBtn.title = isFolderHome() ? `图库在文件夹「${folderHomeLabel()}」` : "云端";
  (document.getElementById("galleryCloudIcon") as unknown as SVGUseElement).setAttribute("href", st === "folder" ? "#folder" : st === "in" ? "#cloud-synced" : "#cloud");
}
// ---- 云可达之后的一串（登录落地 / 回线）：① 开着的模型干净快进 → ② 补离线上传队列 → ③「问一次」把只在本机的模型推上去 ----
//   ③ = 家族 10-21 标准（JRB 0.2.20 / WeebPaint v0.14.42 / WXHW v2.3.52 / MoonSinger v0.14.6），CatsUp 2026-10-25 user「好，同意……但是必须护栏冲突」。
//   护栏在库里（store files.dirty.pushAll）：每个文件单独推、带 If-Match；撞上云端新版本 / 撞名 / 网络 → **那个文件留在本机、名字进 failed，不弹面、不覆盖**；
//   人去图库点它的「处理…」（file.resolve 三选一）或再保存一次走正常冲突面。这里只做三件：问一次、如实报失败名单、绝不替人选边。
//   ② 以前 CatsUp 从没调过 drainOfflineQueue（offlineUploadReplay:"ask" 的 confirmReplay 永远不会响）——顺手接上，JRB 同序。
//   顺序串行 + 单飞：refreshOpenDoc 拉字节时会上 busy 遮罩，sheet 在遮罩下打开会 throw（sheets.ts 死锁护栏），所以等它先完。
let afterCloudReachableInFlight: Promise<void> | null = null;
let askedPushLocalOnly = false;   // 这一页问过了、人说了「稍后」（一页只问一次）
let pushConsented = false;        // 这一页人点过「现在传」：之后回来的从没传过的直接传（同意已给，WXHW 同款）
let pushHoldAll = false;          // 回来这一下还没数清：开着那份先别让心跳推（它可能从没传过）
const heldNeverUploaded = new Set<string>();   // 从没传过、人还没答应传：心跳不推，人按存就放开
function afterCloudReachable(reason: "signin" | "online"): Promise<void> {
  if (isFolderHome()) return Promise.resolve();   // 文件夹家和网盘无关
  if (afterCloudReachableInFlight) return afterCloudReachableInFlight;
  afterCloudReachableInFlight = (async () => {
    try {
      pushHoldAll = !pushConsented;
      await session.refreshOpenDoc();
      if (!hasStore() || !auth.isSignedIn() || !cloudOnline()) return;
      await requireStore().files.drainOfflineQueue().catch((e) => funnel(e, "log"));
      await offerPushLocalOnly(reason);
    } finally { pushHoldAll = false; afterCloudReachableInFlight = null; }
  })();
  return afterCloudReachableInFlight;
}
/** 回来时没传的东西（规则书 §1 第 15 条，2026-11-03 夜改写；分法和理由见 cloud-return.ts）：从没传过的问一次「有 N 份只在这台设备，现在传上去？」，传过的直接续传不问。
 *  dirty.pushAll **全仓只有这一处**（守卫核）：没有从没传过的 = 续传；有 = 人点了才推，点了就是一起传。不点 = 从没传过的压住心跳，这一页不批量推，都进「要处理」列表。
 *  吸取 10-26 的两条（user「弹了一个需要处理然后就什么交互都没了」）：话说真的；传完没传成的带名单、带钮。
 *  force = dev 探针（test/probes/probe-push-ask.mjs）跳过「已登录」「问过了」前置。 */
async function offerPushLocalOnly(reason: string, force = false): Promise<void> {
  const folder = isFolderHome();   // 文件夹家：东西本来就是往自己的文件夹写，没有「第一次放进某个账号」这回事，都算续传
  if (!force && (!hasStore() || (folder ? !folderHomeOnline() : !auth.isSignedIn() || !cloudOnline() || cloudGate.isRunning()))) return;
  const files = requireStore().files;
  const dirty = await files.dirty.count().catch((e) => { funnel(e, "log"); return 0; });
  if (dirty <= 0) return;
  let never: Set<string>;
  try {
    never = folder ? new Set() : neverUploadedIds((await walkLibrary((d) => snapshotFolderOnce((f, cb) => files.watchFolder(f, cb), d))).files);
  } catch (e) { funnel(e, "log"); return; }
  if (!pushConsented) for (const id of never) heldNeverUploaded.add(id);
  pushHoldAll = false;
  // 开着的这份（传过的）归心跳：先推它，再数还剩多少。不然面说「有 1 份」，心跳一下就推完了（probe-update-conflict c3 抓到过）。撞上真分叉 = 横幅接手，不算进来。
  const openPushFailed = await session.pushOpenDocIfPending().catch((e) => { funnel(e, "log"); return false; });
  const count = async (): Promise<number> => (await files.dirty.count().catch((e) => { funnel(e, "log"); return dirty; })) - (session.openDocNeedsAttention() ? 1 : 0);
  const openList = (): void => { closeNotice("unsynced"); void galleryHost.openAttention(); };
  const inList = (n: number): void => {
    if (galleryHost.isOpen()) galleryHost.setAttentionOnly(true);
    notify({ id: "unsynced", level: "info", timeoutMs: null, text: `${n} 份没传上去，在「要处理」列表里`, actions: [{ label: "去处理", onClick: openList }] });
    updateSaveStatus();
  };
  const plan = planReturn({ dirty: await count(), neverUploaded: never.size, consented: pushConsented, saidLater: askedPushLocalOnly && !force });
  note("sync", `back after ${reason}: ${JSON.stringify(plan)}`);
  if (plan.kind === "none") return;
  if (plan.kind === "list") { inList(plan.total); return; }
  if (plan.kind === "ask") {
    askedPushLocalOnly = true;
    const v = await lockSyncGate<"now" | "later">({
      title: `有 ${plan.neverUploaded} 份只在这台设备，现在传上去？`,
      message: "别的设备改过的不会被盖掉，会留给你选。",
      actions: [{ label: "现在传", value: "now", primary: true }, { label: "稍后", value: "later" }],
      escValue: "later",
    });
    note("sync", `push ask → ${v ?? "closed"}`);
    if (v !== "now") { inList(await count()); return; }   // 稍后 = 不推，进列表；这一页不再问
    pushConsented = true;
    heldNeverUploaded.clear();
  }
  if (plan.kind === "resume" && openPushFailed) { note("sync", "open doc push just failed → skip bulk push this round (heartbeat retries)"); updateSaveStatus(); return; }   // 网不通时别把同一份立刻再推一轮（probe-update-conflict D′）
  const r = await files.dirty.pushAll().catch((e) => { funnel(e, "warning"); return null; });
  const left = await count();
  note("sync", `pushAll: pushed=${r?.pushed ?? "-"} failed=${r?.failed.length ?? "-"} left=${left}`);
  session.noteCaughtUp(left === 0 && !session.openDocNeedsAttention());
  if (left <= 0) { if (plan.kind === "ask") notify({ text: `${r?.pushed ?? plan.neverUploaded} 份都传上去了`, level: "info" }); }
  else {
    const names = (r?.failed ?? []).slice(0, 3).map(bareName).join("、");
    if (galleryHost.isOpen()) galleryHost.setAttentionOnly(true);
    notify({
      id: "unsynced", level: "warning", timeoutMs: null,
      text: `传上去 ${r?.pushed ?? 0} 份，还有 ${left} 份没传成${names ? `（${names}${left > 3 ? " 等" : ""}）` : ""}：别的设备改过的要你选，网络问题的之后再试。`,
      actions: [{ label: "去处理", primary: true, onClick: openList }],
    });
  }
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
// ---- 掉登录 / 没网闸门（工单 C；设计稿 ai-docs/20261103-cloud-gate-design.md；状态机在 cloud-gate.ts，这里只接线）----
//   排查结论（报告「闸门」节）：两件事。(a) 真 bug——CatsUp 全仓从没调过 retrySilentSignIn：开机那一次静默探测没成（网还没醒 / iframe 超时）或中途 expired，之后回线 / 回前台都不补，
//   只能手动点登录 → 下面 retrySilentQuietly 修。(b) 微软给 SPA 的刷新令牌固定 24 小时不滑动（WeebPaint 09-09 案卷实证）：过一天必须交互一次，客户端无解 → 这才是闸门的正解。
let authInited = false;        // initAuth 问过了没有
let accountExpected = false;   // 这台设备上有账号可续（initAuth 说的 / 登录落地 / 退出登录清）。没有 = 不是「掉了」，不闸（§9：闸门不是登录墙）。只在内存。
function noteInit(st: { signedIn: boolean; probing?: boolean; account?: unknown }): void { authInited = true; accountExpected = st.signedIn || !!st.probing; note("auth", `init signedIn=${st.signedIn} probing=${!!st.probing} account=${acct(st.account)}`); }
async function renewSilently(): Promise<RenewResult> {
  if (auth.isSignedIn()) return { kind: "ok" };
  if (!authInited) { const st = await auth.initAuth(); noteInit(st); if (st.signedIn) return { kind: "ok" }; }
  if (!accountExpected) return { kind: "no-account" };
  takeRenewFailureCode();   // 清掉上一次的
  const ok = await auth.retrySilentSignIn();
  const code = ok ? null : takeRenewFailureCode();
  note("auth", `silent renew → ${ok ? "ok" : "failed"}${code ? " code=" + code : ""}`);   // 设计稿 §7 ⑧：每次续签的结果和原因码进黑匣子
  return ok ? { kind: "ok" } : { kind: "failed", code };
}
/** 回线 / 回前台：没登录但这台设备有账号 → 静默补一次（bug (a) 的修法；WeebPaint / WXHW / JRB / MoonSinger 早就这么做）。最多一分钟一次：刷新令牌真过期时每次都是一个隐藏 iframe。 */
let lastQuietRetryAt = 0;
function retrySilentQuietly(why: string): void {
  if (cloudGate.isRunning() || isUserOffline() || auth.isSignedIn() || !authInited || !accountExpected || !browserOnline()) return;
  const t = Date.now(); if (t - lastQuietRetryAt < 60_000) return; lastQuietRetryAt = t;
  note("auth", `quiet silent retry (${why})`);
  void renewSilently().catch((e) => funnel(e, "log"));
}
let gateCover: GateHandle<string> | null = null;
function showGateCover(view: Parameters<typeof openSyncGate<string>>[0], onPick: (v: string) => void): void {
  gateCover?.close();
  const h = openSyncGate<string>(view);
  gateCover = h;
  void h.result.then((v) => { if (gateCover === h) gateCover = null; if (v != null) onPick(v); });
}
const OFFLINE_BAR_ID = "offline-bar";
let barPainting = false;
// VR 里不闸（戴着头显弹全屏罩更糟），但状态要看得到：手腕面板状态行带「离线 · N 份没传」（工单 C2）。份数是异步的，存一份，状态变了面板自己重画。
let lastPending = 0;
function withSyncStatus(hint: string): string {
  if (!hasStore() || !auth.isSignedIn() || cloudOnline()) return hint;
  const s = GATE_COPY.bar(lastPending);
  return hint ? `${s}｜${hint}` : s;
}
function paintOfflineBar(): void {
  if (cloudOnline() || barPainting) return;   // 有网且没选离线：没有要显示的；断网（VR 不闸，没选过离线）也要刷份数给手腕面板
  barPainting = true;
  void (hasStore() ? requireStore().files.dirty.count().catch(() => 0) : Promise.resolve(0)).then((n) => {
    barPainting = false;
    lastPending = n;
    if (!isUserOffline()) return;
    notify({ id: OFFLINE_BAR_ID, level: "info", timeoutMs: null, text: GATE_COPY.bar(n), actions: hasStore() ? [{ label: GATE_COPY.barOpenList, onClick: () => { void galleryHost.openAttention(); } }] : [] });
  });
}
const gateTune = { recheckMs: 30_000 };   // 探针调（__catsup.gate）；不是偏好
const cloudGate = new CloudGate({
  attached: () => hasStore() && !isFolderHome() && auth.isAuthConfigured(),   // 文件夹家和网盘无关：不闸
  browserOnline,
  renew: renewSilently,
  check: (g) => session.checkCloudOnce(g),
  signInInteractive: () => cloudSignIn(),
  ui: {
    showChecking: (onEscape) => showGateCover({ title: GATE_COPY.checkingTitle, showSpinner: true, actions: [{ label: GATE_COPY.escape, value: "escape" }] }, () => onEscape()),
    showBlocked: (reason, h) => showGateCover({ title: GATE_COPY.blockedTitle, message: GATE_COPY.reason[reason], actions: [{ label: GATE_COPY.signIn, value: "signin", primary: true, onPick: () => h.signIn() }, { label: GATE_COPY.offline, value: "offline" }] }, (v) => {
      if (v === "offline") { h.offline(); return; }
      // 重新登录：在点击的同步栈里起跳（onPick；iOS 红线，这里是 Promise 续体，来不及了）。闸门留着（离页前不放输入）；跳走失败 / 没网 = 回到这张
      cloudGate.reshowBlocked();
    }),
    hide: () => { gateCover?.close(); gateCover = null; },
  },
  bar: {
    show: paintOfflineBar,
    reconnecting: () => notify({ id: OFFLINE_BAR_ID, level: "info", timeoutMs: null, text: GATE_COPY.barReconnecting }),
    hide: () => closeNotice(OFFLINE_BAR_ID),
  },
  setUserOffline,
  userOffline: isUserOffline,
  reachable: cloudReachable,
  pageVisible: () => document.visibilityState !== "hidden",
  catchUp: async () => {   // 从「离线继续」回来：先把没落本机的落了，然后问一次（规则书 §1 第 15 条；不许不问就推）。真分叉留给人
    await session.flushLocal().catch((e) => funnel(e, "log"));
    if (!hasStore()) return;
    await afterCloudReachable("online");
  },
  afterPass: () => { void afterCloudReachable("signin"); },
  note: (m) => note("auth", m),
  get recheckMs() { return gateTune.recheckMs; },
});
conflictGate.escapeProbe = () => cloudGate.escapeProbe();
conflictGate.onFace = () => cloudGate.pauseHardTimer();
/** 醒来（设计稿 §2：visibilitychange + pageshow，不用时钟）。VR 里 DOM 罩子看不见、点不到：不闸，摘头显回到页面时再走。 */
function wakeGate(why: string): void {
  if (signInNav || vr.isPresenting()) return;
  void cloudGate.run("wake").then((o) => { if (o !== "no-gate" && o !== "recent") note("auth", `wake (${why}) → ${o}`); }).catch((e) => funnel(e, "warning"));
}
window.addEventListener("pageshow", (e) => { if (e.persisted) wakeGate("pageshow"); });
auth.onAuthChanged((st) => {
  note("auth", `changed signedIn=${st.signedIn} reason=${st.reason ?? "-"} probing=${!!st.probing} account=${acct(st.account)}`);
  if (st.signedIn) { authInited = true; accountExpected = true; } else if (st.reason === "signOut") accountExpected = false;
  updateCloudChip(); updateSaveStatus();
  if (st.signedIn) {
    cloudGate.onCloudMaybeBack();
    if (!cloudGate.isRunning() && !isUserOffline()) void afterCloudReachable("signin");   // 登录落地（boot 静默 / redirect 回程 / 续签）→ 快进 → 补队列 → 问一次（闸门开着 = 放行时再跑）
  }
  if (galleryHost.isOpen()) galleryHost.refresh();
});
window.addEventListener("online", () => { updateSaveStatus(); cloudGate.onCloudMaybeBack(); retrySilentQuietly("online"); if (!cloudGate.isRunning() && !isUserOffline()) void afterCloudReachable("online"); }); window.addEventListener("offline", updateSaveStatus);
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
// 崩溃安全 flush 三件：hidden（切后台被系统回收的唯一可靠钩子）/ blur = 页面没走，落本地 + 在线就推；pagehide = 页面要走了，只落本地（工单 C3 A）。
//   #60-C：pagehide persisted=true（要进 bfcache）**不写**——冻结页里起的 IDB 写在 WebKit 永远 commit 不了、只会持锁（案卷 20260909-bfcache-idb-lock）。
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") session.flushForHide();
  else { if (galleryHost.isOpen()) galleryHost.refresh(); wakeGate("visible"); }   // 回前台的文档快进走 pwa-shell onForeground（无条件挂）；挂了库 = 闸门走一遍（工单 C）
});
window.addEventListener("blur", () => session.flushForHide());
// 同一组事件：app-state（口令验证器住这里）立刻落本机，不等 collection 的 400 ms 防抖（2026-11-04 Fable 定修）。bfcache 冻结那一下同样不写（#60-C）。
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushAppStateLocal(); });
window.addEventListener("pagehide", (e) => { if (!e.persisted) flushAppStateLocal(); });
window.addEventListener("pagehide", (e) => {
  if (!e.persisted) session.flushForPageHide();
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
    openBlankCanvas: async () => { session.nameBlankRoot(); },      // 无库：开机就是 transient（Session 初始态）；只给根起四位码（user 10-30），别的零变更
    onNoGallery: () => {},
    onOpened: (name) => note("boot", `restored "${name}"`),
    onNotFound: (name) => { note("boot", `restore failed "${name}" → fresh canvas (slate kept)`); notify({ text: isFolderHome() ? `上次的模型「${bareName(name)}」不在文件夹「${folderHomeLabel()}」里了（改过名 / 移走了？）；从图库打开别的` : `上次的模型「${bareName(name)}」本机没有副本；登录后会再试`, level: "warning" }); },
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
  // 上次的家是文件夹 → 挂上（权限只查不弹，掉了 = 离线态 + 一键 chip）。否则照旧。
  const folderEntry = await bootFolderEntry((e) => funnel(e, "warning"));
  if (folderEntry) {
    try {
      const granted = await ensureFolderPermission(folderEntry, { request: false });
      attachFolderHome(folderEntry, granted);
      folderEntryNow = folderEntry;
      setActiveGalleryId(folderEntry.id);
      wireStore();
      if (granted) void offerPushLocalOnly("folder").catch((e) => funnel(e, "log")); else showFolderPermissionChip(folderEntry.label);
      note("boot", `folder home "${folderEntry.label}" db=${folderEntry.dbId} online=${granted}`);
    } catch (e) { funnel(new Error("[boot] folder home failed: " + String(e)), "warning"); }
  } else if (deviceKvGet("gallery-attached") === "1" || oauthReturn) { try { wireStore(); } catch (e) { funnel(e, "warning"); } }
  // 本地这一段（口令 → 恢复上次的模型）：挂了库就跑在闸门的罩子底下（工单 C：摆出本机那份 + 罩住）；顺序契约照旧 = 本地恢复在 initAuth 之前。
  let outcome: RestoreOutcome | null = null;
  const localBoot = async (): Promise<void> => {
  // 记着的口令（≤ 30 天）：验证器接上后、开上次模型**之前**试——对了就静默解锁（上次开着的是加密件也秒开）；对不上 = 忘掉、说一句（ADR-0001）
  if (hasStore()) { try { await verifierReady(); const rr = await restoreRemembered(); note("boot", `remembered password: ${rr}`); if (rr === "stale") notify({ text: "这台设备记着的口令对不上（别的设备改过？），已经忘掉；要用时再输一次", level: "warning" }); } catch (e) { funnel(e, "warning"); } }
  // ① 先从本地恢复上次的模型，**再** initAuth（v0.5.7；WeebPaint 顺序）：此刻 store 视为未登录（0.14 起在线 = 有网 ∧ 已登录）→ open()
  //   直接读本地副本、零网络，模型秒开；登录落地后 onAuthChanged → refreshOpenDoc 后台干净快进。反过来先等 MSAL（脚本 + 静默续签 iframe）
  //   再开 = 开机多等一次 Graph 往返才见模型（v0.5.6 的样子）。app-store.ts 头注释钉了这条顺序契约。
  const t0 = performance.now();
  if (hasStore()) { try { outcome = await bootRestore(); } catch (e) { funnel(new Error("[boot] restore failed: " + String(e)), "warning"); } }
  else session.nameBlankRoot();   // 无地开机（没挂过图库）：只给空白场景的根起四位码（user 10-30），别的零变更
  note("boot", `restore store=${hasStore()} outcome=${outcome ?? "landless"} home=${session.home.kind}${session.home.kind === "gallery" ? ":" + session.home.path + (session.lazy ? " (lazy)" : "") : ""} ${(performance.now() - t0).toFixed(0)}ms`);
  updateSaveStatus();
  };
  if (hasStore() && !isFolderHome() && auth.isAuthConfigured()) {
    // 挂了库：闸门（开机 = 罩住 → 本地恢复 → 静默续签 + 问云端一次 → 放行 / 库的面 / 「网盘没连上」；initAuth 在 renew 里）
    try { note("boot", `gate → ${await cloudGate.run("boot", { before: localBoot })}`); } catch (e) { funnel(e, "warning"); }
  } else {
    await localBoot();
    if (auth.isAuthConfigured()) {
      try { noteInit(await auth.initAuth()); }
      catch (e) { note("auth", "init failed (MSAL not loaded — sign-in click will retry)"); funnel(e, "log"); }
    } else note("auth", "not configured (client id empty)");
  }
  updateCloudChip();
  // 旧地址的搬家一行（家族根 ai-docs/20261103-catsup-domain-move.md §0.2）：开新标签，旧页留着，没传完可以回来接着传。
  const moved = movedNoticeFor(location);
  if (moved) notify({ id: "moved", level: "info", text: moved.text, timeoutMs: null, actions: [{ label: "打开新地址", primary: true, onClick: () => { window.open(moved.url, "_blank", "noopener"); } }] });
  void afterBootHome();
  if (auth.isSignedIn() && !hasStore()) {   // 登录了但这台设备还没挂过图库（清过 device-kv / 新装）：接店 + 走一遍三态（回执条多半空 → lazyblank）
    try { wireStore(); outcome = await bootRestore(); note("boot", `restore after auth outcome=${outcome}`); } catch (e) { funnel(e, "warning"); }
  } else if (outcome === "blank-failed" && auth.isSignedIn() && session.isUntouchedLazyBlank()) {
    // ② 本地没副本（iOS 7 天驱逐 / 卸载过 / 别台设备的回执条不会到这）→ ① 时未登录拉不到；现在登录了、用户还没动笔 → 再试一次（回执条没清，纪律②）
    try { outcome = await bootRestore(); note("boot", `restore retry after auth outcome=${outcome}`); } catch (e) { funnel(e, "warning"); }
  }
  updateSaveStatus();
  await initCrashRecovery({ session, notify, closeGallery: () => { if (galleryHost.isOpen()) galleryHost.close(); } });   // T-crash：redirect 流产者自动领养 + crash 帧通知
})();

/**
 * 落笔之前问一句（贴图主线 1-8b）：这张画能不能现在就画。冷的（存在文件里、还没解开）= 这一笔不开始、提示行「这张画还在打开」、同时解开（解开后留着画板）；
 * 只能看不能画 = 说为什么。能画 = null。不卡住、不悄悄丢笔。以后真的笔（1-7）落笔前也问它。
 */
/** 一笔要的那些口（调试钩子和画画工作台同一份；chain = 落点只认这一份摆放，缺 = 全部摆放）。 */
function paintStrokeDeps(chain?: readonly number[]): SpacePaintDeps {
  const cam = editor.cam, gpu = editor.renderer3.offscreenGpu() as unknown as { glTexture(img: unknown): WebGLTexture } | null;
  return {
    boards: paintBoards, scene: () => editor.sceneRef, gpu: () => editor.renderer3.offscreenGpu(), prep: paintPrep,
    targets: (t) => { const b = paintBoards.get(t)!; return paintTargets(editor.worldGeom(), editor.sceneRef, t, { width: b.width, height: b.height }, chain); },
    external: (img) => ({ gl: gpu!.glTexture(img) }),
    camera: () => ({
      ray: (sx, sy) => cam.ray(sx, sy, editor.vp()),
      pixelSize: (p) => { const vp = editor.vp(); if (cam.projection !== "persp") return (2 * cam.halfH) / vp.h; const e = cam.eye(), f = cam.forward(), d = (p.x - e.x) * f.x + (p.y - e.y) * f.y + (p.z - e.z) * f.z; return (2 * Math.tan(cam.fovY / 2) * d) / vp.h; },
    }),
    commitStep: (kind) => editor.commitRecordsStep(PAINT_STEP_LABELS[kind], paintBoards.takePending().map((data) => ({ kind: PAINT_UNDO_KIND, data }))),   // 一笔 = 三维的一步（1-8a）
  };
}
// 画画工作台（贴图主线 1-7）：颜色只有一个入口（paint-color.ts）；控制器接编辑器那边三把工具交过来的每一下
const paintColorSheet = mountPaintColorSheet({ root: $("paintColorSheet"), grid: $("paintColorGrid"), hex: $("paintColorHex") as HTMLInputElement, ok: $("paintColorHexOk"), close: $("paintColorClose"), note: $("paintColorNote") }, paintColor);
inputGate.face({ kind: "face", label: "画笔颜色", rank: 502, root: "#paintColorSheet", up: () => paintColorSheet.isOpen(), esc: () => { paintColorSheet.close(); return true; } });
paintColor.subscribe(() => syncUi());
// eslint-disable-next-line no-var
// 每帧读数的小角标（1-4d 第 1 条）：编辑器画完一帧交给它；关着什么都不做
// eslint-disable-next-line no-var
var meterBadge: PaintMeterBadge | null = mountPaintMeterBadge({ sceneMs: () => editor.renderer3.lastMeasurement?.frameMs ?? 0, copyMs: () => editor.renderer3.liveFrameMs().copy, mipsMs: () => editor.renderer3.liveFrameMs().mips,
  pathLabel: () => DISPLAY_PATH_LABELS[displayDiag.path], check: () => runPaintCheck() });
/** 读数那一组的「走法」（统筹 11-11）：画那一侧报整张还是只报改到的格（space-paint 读 displayDiag.path）+ 渲染器的缩小图做法，一起换。 */
function setDisplayPath(path: typeof displayDiag.path, check: boolean): void {
  displayDiag.path = path; displayDiag.check = check; displayDiag.penUp = false;
  editor.renderer3.liveMips(MIPS_OF[path]);
}
/**
 * 读数那一组的「核对」（统筹 11-11）：每块热的画板——内核那张合成图 = 强制整张重合？显示图每一级 = 整张重拷？逐字节比。
 * 对不上记进调试日志（哪张画、内核还是显示图、哪一级、哪一块、差了多少像素、走的哪条路），返回 false（角标亮一下）。都对上 = true，不记日志。
 */
function runPaintCheck(): boolean {
  const d = paintCheckDetail();
  for (const k of d.kernel) if (k.diff) note("paint", `核对：画 ${k.guid.slice(0, 8)} 内核合成图 ≠ 强制整张重合：差 ${k.diff} 像素，范围 (${k.box!.join(", ")})，走法 ${displayDiag.path}`);
  for (const L of d.display) if (L.diff) note("paint", `核对：显示图 ${L.w}×${L.h} 第 ${L.level} 级 ≠ 整张重拷：差 ${L.diff} 像素，范围 (${L.box!.join(", ")})，走法 ${displayDiag.path}`);
  return d.ok;
}
/** 核对的数（runPaintCheck 记日志用；探针直接读）：先比内核（verifyFull 留下整张那张），再比显示图（从整张那张重拷）。 */
function paintCheckDetail(): { ok: boolean; kernel: { guid: string; diff: number; box: readonly number[] | null }[]; display: { w: number; h: number; level: number; diff: number; box: readonly number[] | null }[] } {
  const kernel: ReturnType<typeof paintCheckDetail>["kernel"] = [], display: ReturnType<typeof paintCheckDetail>["display"] = [];
  for (const g of paintBoards.guids()) { const k = paintBoards.verifyFull(g); if (k) kernel.push({ guid: g, ...k }); }   // 经登记处：核完把「准备好的」换成整张那张
  editor.renderer3.resetPaintState();
  for (const im of editor.renderer3.liveVerify()) for (const L of im.levels) display.push({ w: im.w, h: im.h, ...L });
  return { ok: kernel.every((k) => !k.diff) && display.every((L) => !L.diff), kernel, display };
}
editor.afterRender = () => meterBadge?.frame();
var paintWb: PaintWorkbench | null = new PaintWorkbench({ editor, boards: paintBoards, strokeDeps: (chain) => paintStrokeDeps(chain), gate: (t) => paintStrokeGate(t), color: paintColor, brushOf: (t) => paintBrushes.current(t)!, prep: paintPrep, flashStart: () => { primary.sync(); primary.flash("paint"); }, hint: (t) => { hintEl.textContent = t; } });
/**
 * 画布小窗里落笔（施工单二十一第 2 刀）：手上的工具就是左边工具柱里那一把（一只手，两块画面）。笔 = 这把工具现在拿的那支 + 旋钮（大小 = 画布像素）+ 现在的颜色；
 * 一笔的时钟和压感照 1a（StrokeClock：事件时间像样就整笔按它、压感只信笔的）；落笔先过同一道门（锁 / 冷的 / 只能看不能画）；这支笔在画布上用不了 = 说原因不画；
 * 抬笔 = 一步（和模型上的笔同一个 commitRecordsStep）。一笔当中被撤销 / 重做先取消（登记处 cancelOpen）= 之后的点不理、抬笔不封步。
 */
const canvasPaintPort = {
  tool: (): "paintPen" | "paintEraser" | "eyedrop" | null => { const t = editor.tool; return t === "paintPen" || t === "paintEraser" || t === "eyedrop" ? t : null; },
  brushSize: (): number | null => { const t = editor.tool; return t === "paintPen" || t === "paintEraser" ? editor.config.get(t, "size") : null; },
  open: (tex: string, p: CanvasPointer): CanvasStroke | null => {
    const tool = editor.tool;
    if (tool !== "paintPen" && tool !== "paintEraser") return null;
    if (paintStrokeGate(tex)) return null;   // 门自己说了
    paintBoards.ensure(editor.sceneRef, tex);
    const kind = paintBrushes.current(tool)!, why = brushUnusableWhy(BRUSH_RECORDS[kind], CANVAS_HOST);
    if (why) { hintEl.textContent = why; return null; }
    const cfg = editor.config, brush = { ...resolvedBrushOf(kind, { size: cfg.get(tool, "size"), opacity: cfg.get(tool, "opacity"), hardness: cfg.get(tool, "hardness") }), color: hexOf(paintColor.get()) };
    const erase = strokeKindOpts(kind).erase, smooth = strokeSmoothOf(brush), clock = new StrokeClock(p.at, performance.now());
    let st: ReturnType<typeof paintBoards.openBrushStroke>;
    try { st = paintBoards.openBrushStroke(tex, brush, { x: p.x, y: p.y, pressure: clock.pressure(p.pointerType, p.pressure), t: 0 }, { erase, ...(smooth ? { smooth } : {}) }); }
    catch (err) { hintEl.textContent = String((err as { say?: string }).say ?? "这一笔没能开始"); funnel(err, "warning"); return null; }
    editor.draw();
    return {
      move: (q) => { if (!st.open) return; st.move(q.x, q.y, clock.pressure(q.pointerType, q.pressure), clock.time(q.at, performance.now())); editor.draw(); },
      cancel: () => { st.cancel(); editor.draw(); },
      up: () => {
        try { if (st.end()) editor.commitRecordsStep(erase ? PAINT_STEP_LABELS.erase : PAINT_STEP_LABELS.stroke, paintBoards.takePending().map((data) => ({ kind: PAINT_UNDO_KIND, data }))); }   // 一笔 = 三维的一步
        catch (err) { hintEl.textContent = String((err as { say?: string }).say ?? "这一笔没能落进画里，已经整笔撤掉（画和落笔之前一样）"); }
        editor.draw();
      },
    };
  },
  eyedrop: (tex: string, x: number, y: number): void => {
    const take = (): void => {
      const b = paintBoards.get(tex), px = b?.pixelAt(Math.floor(x), Math.floor(y));
      if (!px) { hintEl.textContent = "这里取不到颜色"; return; }
      const c: [number, number, number] = [px[0] / 255, px[1] / 255, px[2] / 255];
      paintColor.set(c); hintEl.textContent = `取到颜色 ${hexOf(c)}`;
      editor.setTool(paintWb?.pen ?? "paintPen");   // 取完回到上一把笔（和模型上的吸管一样）
    };
    if (paintBoards.stateOf(editor.sceneRef, tex) === "hot") { take(); return; }
    hintEl.textContent = "这张画还在打开，取到颜色就换回笔";
    void paintBoards.warm(editor.sceneRef, tex).then((r) => { if (r === "hot") take(); }).catch((e) => funnel(e, "warning"));
  },
};
/** 画布上的二维笔开一笔（施工单二十一第 1 刀；调试钩子 paint.stroke2dOpen / stroke2d 用，第 2 刀小窗接上手时走同一个口）。 */
type Stroke2dHandle = { readonly guid: string; readonly open: boolean; move(x: number, y: number, p?: number): void; cancel(): void; up(): { guid: string; landed?: boolean; threw?: string } };
function paintStroke2dOpen(o: { guid?: string; x: number; y: number; p?: number; kind?: BrushKind; size?: number; opacity?: number; hardness?: number; color?: readonly number[] }): { readonly guid: string; readonly refused: string } | Stroke2dHandle {
  const S = editor.sceneRef, g = o.guid ?? [...S.textures.keys()].find((t) => paintPlaceOf(S, t));
  if (!g) throw new Error("no placed paint in this scene");
  const gate = paintStrokeGate(g);
  if (gate) return { guid: g, refused: gate };
  paintBoards.ensure(S, g);
  const k = o.kind ?? "pen", brush = { ...resolvedBrushOf(k, { size: o.size ?? 12, opacity: o.opacity ?? 1, hardness: o.hardness ?? 0.8 }), color: "#" + [0, 1, 2].map((i) => Math.round(Math.min(1, Math.max(0, o.color?.[i] ?? 0.1)) * 255).toString(16).padStart(2, "0")).join("") };
  const erase = strokeKindOpts(k).erase, smooth = strokeSmoothOf(brush);
  let st: ReturnType<typeof paintBoards.openBrushStroke>;
  try { st = paintBoards.openBrushStroke(g, brush, { x: o.x, y: o.y, pressure: o.p ?? 1, t: 0 }, { erase, ...(smooth ? { smooth } : {}) }); }
  catch (err) { return { guid: g, refused: String((err as { say?: string }).say ?? err) }; }
  editor.draw();
  let n = 0;
  return {
    guid: g,
    get open() { return st.open; },
    move: (x: number, y: number, p?: number) => { st.move(x, y, p ?? 1, ++n * 16); editor.draw(); },
    cancel: () => { st.cancel(); editor.draw(); },
    up: () => {
      let landed = false;
      try { landed = st.end(); }
      catch (err) { editor.draw(); return { guid: g, threw: String((err as { say?: string }).say ?? err) }; }
      editor.commitRecordsStep(erase ? PAINT_STEP_LABELS.erase : PAINT_STEP_LABELS.stroke, paintBoards.takePending().map((data) => ({ kind: PAINT_UNDO_KIND, data })));   // 一笔 = 三维的一步（同画画工作台）
      editor.draw();
      return { guid: g, landed };
    },
  };
}
function paintStrokeGate(texture: string): "locked" | "warming" | "view-only" | null {
  { const why = paintEditLocked(); if (why) { hintEl.textContent = why; return "locked"; } }   // 第二层：落笔的门（画画控制器和调试钩子都过这里；v0.19.48）
  const st = paintBoards.stateOf(editor.sceneRef, texture);
  if (st === "cold" || st === "warming") {
    hintEl.textContent = "这张画还在打开，等一下再画";
    void paintBoards.warm(editor.sceneRef, texture).then((r) => { if (r === "hot") { hintEl.textContent = "这张画打开了，可以画了"; editor.draw(); } }).catch((e) => funnel(e, "warning"));
    return "warming";
  }
  if (st === "view-only") { hintEl.textContent = paintBoards.viewOnlyWhy(texture) ?? "这张画只能看不能画"; return "view-only"; }
  return null;
}
let cellAtGrid: { k: object; rev: number; grid: ReturnType<typeof buildTriGrid> } | null = null;
(window as unknown as { __catsup: unknown }).__catsup = { pwa, pickWorkbench, perf, editor, canvasWin: () => canvasWin, meter: () => meterBadge,
  // 画板（贴图主线 1-3c；没有界面入口）：ensure = 给一张走画的贴图建画板（不给 GUID = 场景里第一张画）；fill = 灌一层像素（RGBA、画板大小）；探针 test/probes/probe-paint-display.mjs
  paint: {
    /** 笔的种类表（paint/brush-kinds.ts）；paths = 表里的每一条路 → 走它的第一支笔（probe-live-region 按路跑，施工单二十 1b）。 */
    brushKinds: BRUSH_KIND_IDS, brushPaths: BRUSH_PATHS, brushPathOf: (k: BrushKind) => BRUSH_KINDS[k].path,
    /** 新建平铺的画（施工单二十一第 3 刀；不经表单，和「…」里那一项建的那一半同一段）：返回贴图 GUID，没建成 = null。 */
    newTiled: (px = 64, m = 1): Promise<string | null> => createTiledPaint(px, m),
    /** 存盘器编分层字节时内核说「有一层没有可用的 id」的次数（正常路径上永远 0）。 */
    saverIdWarnings: (): number => paintSaver.idWarnings,
    /** 每支笔的旋钮 / 现在拿的哪支（app/paint-brushes.ts；探针 probe-paint-brushes 用）。 */
    brushes: paintBrushes,
    /** 网格体的全部自检（内核不变量 + 画的规矩；scene/paint.ts meshBodyIssues）：空 = 过（规模探针 K 坏面那一段用）。 */
    issues: (def: number) => meshBodyIssues(editor.sceneRef, def as never),
    /** 读数那一组的两个开关（统筹 11-11）：探针用——setPath = 角标「走法」那一下、check = 跑一次核对（true = 都对上）、state = 现在的开关。 */
    diag: { setPath: (p: typeof displayDiag.path) => setDisplayPath(p, displayDiag.check), setCheck: (on: boolean) => { displayDiag.check = on; displayDiag.penUp = false; }, check: () => runPaintCheck(), detail: () => paintCheckDetail(), state: () => ({ ...displayDiag }), log: () => debugLogText() },
    boards: paintBoards,
    /** 贴图坐标（施工单十八第 1½ 刀：网格体的速查表 + 面上的代号 + 角上的坐标，只经 scene/uv.ts）：探针在页面里问 / 搭。 */
    uv: {
      sets: (def: number): string[] => [...editor.sceneRef.mesh(def as never).uvSetSlots],
      at: (def: number, f: number, g: string): number[] | null => { const b = editor.sceneRef.mesh(def as never), v = uvAt(b.kernel, b.uvSetSlots, f, g); return v ? Array.from(v) : null; },
      boxes: (def: number, g: string): number[] => { const b = editor.sceneRef.mesh(def as never); return Array.from(uvBoxes(b.kernel, b.uvSetSlots, g)); },
      /** 不在场景里的内核（探针自己建的）：放位置 / 看成读坐标的那几块要的样子。slots = 探针自己留着的速查表。 */
      place: (k: MeshKernel, slots: string[], f: number, g: string, at: ArrayLike<number>): void => { placeFace(k, slots, f, g, at); },
      view: (k: MeshKernel, slots: string[]) => uvMesh(k, slots),
    },
    ensure: (guid?: string) => { const g = guid ?? [...editor.sceneRef.textures.keys()].find((t) => paintPlaceOf(editor.sceneRef, t)); if (!g) throw new Error("no placed paint in this scene"); const b = paintBoards.ensure(editor.sceneRef, g); editor.draw(); return { guid: g, width: b.width, height: b.height }; },
    fill: (guid: string, rgba: ArrayLike<number>) => { const b = paintBoards.get(guid); if (!b) throw new Error(`no board for ${guid}`); paintBoards.load(guid, { width: b.width, height: b.height, nodes: [{ name: "Layer 1", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: { rect: { x: 0, y: 0, w: b.width, h: b.height }, bytes: new Uint8ClampedArray(rgba) } }] }); editor.draw(); },
    list: () => paintBoards.guids().map((g) => ({ guid: g, width: paintBoards.get(g)!.width, height: paintBoards.get(g)!.height })),
    /** 把一张冷的画热起来（解开分层字节、建画板；1-8b）。返回 "hot" / "view-only"。 */
    warm: (guid: string) => paintBoards.warm(editor.sceneRef, guid),
    state: (guid: string) => paintBoards.stateOf(editor.sceneRef, guid),
    saver: paintSaver,
    stats: () => (editor.renderer3 as unknown as { liveStats(): { images: number; copyMs: number } }).liveStats(),
    tiles: () => paintTileStats(),   // 图块池占多少（连开十份文件那项测量，统筹 11-11）
    /** 画画工作台（1-7）：现在的颜色（一个入口）、控制器。 */
    color: paintColor, workbench: paintWb,
    /** 一整笔（贴图主线 1-4b；探针用）：屏幕点（CSS 像素）→ 1-4a 控制器 → 薄层（真显卡）→ 档口；每一点画一帧（准备在 draw 里）；cancel = 取消。第一笔时建画板。 */
    stroke: (o: { guid?: string; points: readonly { x: number; y: number; p?: number }[]; size?: number; hardness?: number; color?: readonly number[]; accum?: "max" | "over"; erase?: boolean; kind?: BrushKind; cancel?: boolean; taperOut?: number; measure?: boolean; pace?: boolean; beforeUp?: () => void; midway?: () => void }) => {
      const S = editor.sceneRef, g = o.guid ?? [...S.textures.keys()].find((t) => paintPlaceOf(S, t));
      if (!g) throw new Error("no placed paint in this scene");
      const gate = paintStrokeGate(g);   // 落笔撞上冷的画：这一笔不开始、说一句、同时解开（1-8b）；以后真的笔（1-7）走同一个口
      if (gate) return { guid: g, refused: gate };
      const cam = editor.cam, gpu = editor.renderer3.offscreenGpu() as unknown as { glTexture(img: unknown): WebGLTexture } | null;
      const brush = o.kind ? resolvedBrushOf(o.kind, { size: o.size ?? 20, opacity: 1, hardness: o.hardness ?? 0.5 }) : hookBrush(o);   // kind = 笔的表那一行（和画画工作台同一个解析；普通笔 / 橡皮解出来 = 以前的 hookBrush，test/brush-kinds.test.ts 钉着）；不给 = 老的散参数
      // 调试钩子没有工作台：这里先替它把准备做了（量出来单独报 prepMs，不算进落笔）；真的笔（1-7）在进工作台时做
      const pb = paintBoards.ensure(editor.sceneRef, g), pt = paintTargets(editor.worldGeom(), editor.sceneRef, g, { width: pb.width, height: pb.height }), prepMs = paintPrep.ensure(pt);
      const prob = paintPrep.problem(pt);
      if (prob !== null) return { guid: g, refused: prob === "pending" ? "pending" : String((prob as { say?: string }).say ?? prob), prepMs };   // 撞到容量上限：这一笔不开始，交出那句人话
      void cam; void gpu;
      const kindOpts = o.kind ? strokeKindOpts(o.kind) : { accum: o.accum ?? "over", erase: o.erase };   // kind = 按笔的种类表起笔（探针按表跑）；不给 = 老的散参数
      const st = new SpacePaintStroke(paintStrokeDeps(), g, { brush, color: [o.color?.[0] ?? 0.1, o.color?.[1] ?? 0.1, o.color?.[2] ?? 0.1], ...(o.kind ? { smooth: strokeSmoothOf(brush) } : {}), ...kindOpts });
      // measure：每一帧各段（射线 + 走步 = move；准备里的取新笔尖 / 画薄层 / 交给档口；内核合成；拷到显示图；整帧）
      const frames: Record<string, number>[] = [], R3 = editor.renderer3 as unknown as { liveStats(): { copyMs: number } };
      const ctx = (document.getElementById("board") as HTMLCanvasElement).getContext("webgl2")!, px1 = new Uint8Array(4);
      const sync = (): void => { const fb = ctx.getParameter(ctx.READ_FRAMEBUFFER_BINDING); ctx.bindFramebuffer(ctx.READ_FRAMEBUFFER, null); ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px1); ctx.bindFramebuffer(ctx.READ_FRAMEBUFFER, fb); };   // 等显卡做完（量的时候才用）
      if (o.measure) { paintBoards.measureSync = sync; sync(); }
      o.points.forEach((p, i) => {
        const a = performance.now();
        if (i === 0) st.down(p.x, p.y, p.p ?? 1, i * 16); else st.move(p.x, p.y, p.p ?? 1, i * 16);
        const b = performance.now();
        editor.draw();
        if (o.measure || o.pace) sync();   // pace（1-4d 第 10 条）：每帧画完等显卡做完再画下一帧 = 真页面在交换画面那一下等的那样；等的时间不进读数的任何一段（不等 = 软件显卡上活越攒越多，某一帧被卡住几秒，记到碰巧在跑的那段上）
        if (i === o.points.length >> 1) o.midway?.();   // 探针：画到一半（笔还按着）那一帧之后（核对 / 比字节）
        if (o.measure) frames.push({ moveMs: b - a, drawMs: performance.now() - b, tips: st.tipCount(), ...st.lastFrame, gpuLayerMs: paintBoards.lastPrepare.jobsMs - st.lastFrame.tipsMs - st.lastFrame.hostMs, composeMs: paintBoards.lastPrepare.composeMs, copyMs: R3.liveStats().copyMs });
      });
      const range = st.range(), tips = st.tipCount(), buildMs = st.buildMs;
      o.beforeUp?.();   // 探针：抬笔前最后一帧的样子（预览 = 结果）
      const u0 = performance.now();
      if (o.cancel) st.cancel(); else st.up();
      editor.draw();
      if (o.measure) { sync(); paintBoards.measureSync = null; }
      return { guid: g, tips, range, prepMs, peak: st.peak, ...(o.measure ? { frames, buildMs, upMs: performance.now() - u0, up: st.lastUp } : {}) };
    },
    /**
     * 画布上的二维笔（施工单二十一第 1 刀；探针用，界面在第 2 刀）。stroke2dOpen = 开一笔、交回把手（move 一个点 / up 抬笔 / cancel 取消），能跨好几次异步调用按着不放；
     * stroke2d = 用它一口气画完一整笔。点 = 画布像素；笔 = 笔的表那一行 + 旋钮（和画画工作台同一个解析 + 平滑）；落笔的门同 paint.stroke（锁 / 冷的 / 只能看不能画）；
     * 一笔 = 编辑器撤销里的一步（同画画工作台的 commitStep）；点和点之间时间 16 毫秒（钉死）。落层抛了（一笔当中锁上了等）= up 返回 threw、不封步。
     */
    stroke2dOpen: (o: Parameters<typeof paintStroke2dOpen>[0]) => paintStroke2dOpen(o),
    stroke2d: (o: { guid?: string; points: readonly { x: number; y: number; p?: number }[]; kind?: BrushKind; size?: number; opacity?: number; hardness?: number; color?: readonly number[]; cancel?: boolean; midway?: () => void; beforeUp?: () => void }) => {
      const [p0, ...rest] = o.points, h = paintStroke2dOpen({ ...o, x: p0.x, y: p0.y, ...(p0.p !== undefined ? { p: p0.p } : {}) });
      if ("refused" in h) return h;
      rest.forEach((p, i) => { h.move(p.x, p.y, p.p); if (i === rest.length >> 1) o.midway?.(); });
      o.beforeUp?.();
      if (o.cancel) { h.cancel(); return { guid: h.guid, cancelled: true }; }
      return h.up();
    },
    /** 画画的准备（1-4c）：ensure = 给这张画的每份摆放建好（返回毫秒）；problem = null / "pending" / 错；stats = 几项、显卡字节、各项建了多久。 */
    prep: {
      ensure: (guid: string) => { const b = paintBoards.ensure(editor.sceneRef, guid); return paintPrep.ensure(paintTargets(editor.worldGeom(), editor.sceneRef, guid, { width: b.width, height: b.height })); },
      problem: (guid: string) => { const b = paintBoards.get(guid); if (!b) return "no-board"; const p = paintPrep.problem(paintTargets(editor.worldGeom(), editor.sceneRef, guid, { width: b.width, height: b.height })); return p === null || p === "pending" ? p : String((p as { say?: string }).say ?? p); },
      stats: () => paintPrep.stats(),
      release: () => paintPrep.release(),
      /** 现成的那一份（第一份摆放）：探针拿缓存里的每格的表在真显卡上画、和软件版对拍。 */
      take: (guid: string) => { const b = paintBoards.get(guid)!; return paintPrep.take(paintTargets(editor.worldGeom(), editor.sceneRef, guid, { width: b.width, height: b.height })[0]); },
    },
    lab: { layoutFaces, SpaceLayer, SPACE_TIP, SoftSpaceGpu, buildTargetGeo, tipReach, sphereTriDist, strokeTruth8, gpu: () => editor.renderer3.offscreenGpu(), targets: (guid: string) => { const b = paintBoards.get(guid); return b ? paintTargets(editor.worldGeom(), editor.sceneRef, guid, { width: b.width, height: b.height }) : []; } },
    /** 屏幕上一点（CSS 像素）按 1-3a 的落点落在这张画的哪一格（探针拿它和屏幕上读到的颜色对）；只看摆在最外层的那一份。 */
    cellAt: (guid: string, sx: number, sy: number) => {
      const S = editor.sceneRef, place = paintPlaceOf(S, guid), defs = place ? paintDefsOf(S, guid) : [];   // 画在哪几个物件上（施工单十八第 2 刀 b）
      const slot = place ? editor.worldGeom().slots.find((s) => defs.includes(s.pool.def) && s.pool.group === null) : undefined;   // 按世界里的槽找（嵌在组件里的也找得到，1-4c）
      const body = slot ? S.def(slot.pool.def).body : null;
      if (!place || !body || body.kind !== "mesh" || !slot) return null;
      const k = body.kernel, m = uvMesh(k, body.uvSetSlots), r = editor.cam.ray(sx, sy, editor.vp()), X = invert(slot.xform);
      if (!cellAtGrid || cellAtGrid.k !== k || cellAtGrid.rev !== k.rev) cellAtGrid = { k, rev: k.rev, grid: buildTriGrid(m) };   // 探针一格一格问：格子按网格体 + 修改号留着
      const hit = pickSurface(m, cellAtGrid.grid, place.uvSet.guid, applyPt(X, r.origin), applyDir(X, r.dir));
      return hit && hit.inPaint ? { face: hit.face, cell: hit.cell, uv: hit.uv } : hit ? { face: hit.face } : null;
    },
  }, locomotion, vr, hud, session, hand, galleryHost, refs: refHost, crash: crashStore, test: { openConfirmSheet, openInputSheet, toggleHelp, toggleMatSheet, openDebugLogSheet, openSyncGate, withBusy, inputGate },
  gate: { cloudGate, tune: gateTune, isUserOffline },
  // 图库的家（探针 test/probes/probe-folder-home.mjs 用）：openGallery = 用户点「图库」那条路；legacyFiles = 另开一个离线实例数以前那个库（不看退役旗）
  home: { openGallery: () => openGalleryFromUi(), state: () => currentHomeState(), folder: () => folderHomeLabel(), online: () => folderHomeOnline(), browserOnly: () => browserOnlyCount,
    legacyFiles: async () => { const src = legacyStore(); try { return await movableIn(src.store); } finally { if (src.owned) await src.store.dispose().catch(() => {}); } } },
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
  if (bl && editor.hasAnySelection() && !document.hidden) editor.draw();
}, 175);   // 贴图异步解好 → 重画一帧（以前没人接：贴图要等下一次交互才出现；2026-10-29 Claude Fable 5.1）
{ const a = ACCENTS.find((x) => x.id === PREF.get("accent")); if (a) editor.renderer3.setAccent(a.accent); }   // 选中色（按设备记）
editor.setTool("select");   // 开机 = 鼠标（选择）工具（user 10-29「brep模式进去默认是鼠标而不是线。本轮改」；以前这里硬写画线、盖掉了编辑器自己的默认）
hintEl.textContent = hintDefault();
resize();
