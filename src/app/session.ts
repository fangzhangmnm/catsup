// session.ts —— 文档生命周期（WeebPaint 无地骑士标准，verdicts §1）：
//   「每个模型任一时刻恰好有一个家：图库、或磁盘上的一个文件、或还没有家（transient）。保存 = 送回家，只有回了家才清 dirty；导出永不清 dirty。」
//   两个模式：Gallery+Editor（挂了 store：新模型 = **lazyblank**——日期名只在内存、首笔有内容才安家进图库、空白永不落盘；退出自动保存）
//   / Editor Only（无 store：transient，Ctrl+S = 安家 = FSA 另存 / 下载兜底）。
//   store 的写路径（.save / .tryMove）只在本文件（守卫测试执法）。T-crash：图库家 = 30 s 空闲自动保存到 store 本地（即崩溃影子）；
//   transient / 文件家 = 同节律**盲快照**进 crash-store（独立 IDB，user 2026-09-20 批；WeebPaint 同形：行李牌每次打开现铸、
//   同牌覆盖单帧、正常关闭即焚、boot 通知恢复；登录 redirect 前留 pending-adoption 帧，回来自动领养）。附加层：承重层仍是
//   dirty 徽章 + 挽留 sheet + beforeunload。created 2026-09-20 by Claude Fable 5.1
//
// v0.5.7（2026-09-22，Claude Fable 5.1；对齐审计 = ai-docs/20260922-lifecycle-alignment-with-weebpaint.md）：
//   · 回执条（@internal/gallery resume-slate）**唯一写点 = setHome**：图库家（非 lazy）→ {doc}；文件家（挂库时）→ {gallery}；transient / lazyblank 不碰。
//   · lazyblank：beginLazyBlank（日期名内存态）→ noteChange（editor.host.changed 同步钩）首笔有边 → adoptLazy（files.occupied 消歧 → 首存 mode:"new"）。
//   · restore(path) = boot 端口（无挽留门、无状态行）；refreshOpenDoc = 登录 / 回线 / 回前台的干净快进（pullIfClean trustHints:false + busy 遮罩 + 同名重开）；
//   · 2026-10-25 收 store 2.2.0（Claude Fable 5.1）：nameOccupied → occupied；pushDoc（图库卡片「推送到云端」）退役——方向动词不在词汇表上（user 2026-10-16「禁止越狱」），
//     没同步好的文件 = 卡片「处理…」→ store file.resolve() 三选一；refreshOpenDoc 传 trustHints:false（0.18.1）。
//   · flushForHide = hidden / blur / pagehide(!persisted) 的崩溃安全 flush（只本地不推）。
import type { Editor } from "../editor/editor.ts";
import { Kernel } from "../kernel/kernel.ts";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup, type CatsupDocument, writeGltfModel } from "../format/index.ts";
import { isForeignGlb } from "../format/gltf-import.ts";
import { NEW_DOC_GRID, gridFromSettings, settingsFromGrid } from "../editor/grid-settings.ts";
import { DEFAULT_SCALE_REFS, scaleRefsFromSettings, scaleRefsToSettings } from "../editor/scale-ref.ts";
import { defaultDesk, emptyReferences, type DeskDoc, type RefFileDoc, type RefPanelDoc, type ReferencesDoc } from "../format/document.ts";
import { fmtStamp } from "../format/migrate/index.ts";
import { unitFromSettings, unitToSettings } from "../editor/units.ts";
import type { Xform } from "../scene/xform.ts";
import { AUTOSAVE_IDLE_MS, DOC_EXT, DOC_EXTS, defaultDocName, downloadName } from "../config.ts";
import { bareName, docSuffixOf, fullName } from "./doc-names.ts";
import { auth, docFile, hasStore, requireStore, requestStoragePersistence, setActiveDocName } from "../app-store.ts";
import { conflictGate } from "../store-ui.ts";   // 2026-10-26：自动保存撞上云端 → 不弹模态、横幅接手
import { setOpened } from "@internal/gallery";
import { openChoiceSheet, openInputSheet, showBusy, hideBusy } from "./ui/sheets.ts";
import { reportError } from "./error-funnel.ts";
import { note } from "./debug-log.ts";
import { crashStore, mintLuggageTag, type LuggageTag } from "./crash-store.ts";

interface FSHandle { readonly name: string; createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }>; getFile(): Promise<File> }
const fsa = window as unknown as {
  showSaveFilePicker?: (o: unknown) => Promise<FSHandle>;
  showOpenFilePicker?: (o: unknown) => Promise<FSHandle[]>;
};
// 选择框：打开认 .catsup + 老 .glb 工程（外来 glb 打开时按内容拒、指去导入）；另存只给 .catsup（账本 UX39）
const OPEN_PICKER_TYPES = [{ description: "CatsUp 工程文件", accept: { "model/gltf-binary": [...DOC_EXTS] } }];
const SAVE_PICKER_TYPES = [{ description: "CatsUp 工程文件", accept: { "model/gltf-binary": [DOC_EXT] } }];
export const supportsSavePicker = (): boolean => typeof fsa.showSaveFilePicker === "function" && window.self === window.top;
export const supportsOpenPicker = (): boolean => typeof fsa.showOpenFilePicker === "function" && window.self === window.top;

export type DocHome =
  | { kind: "gallery"; path: string }
  | { kind: "file"; handle: FSHandle | null; fileName: string }
  | { kind: "transient"; name?: string };   // name：恢复 / 领养出来的模型带原名（另存建议名 + 标题）

/** 参考窗的接缝（src/app/reference-host.ts 满足它）：牌组跟文件走（CATSUP_references + desk.refPanel），加删卡 = rev +1 = 脏；不进撤销。 */
export interface RefsPort {
  files(): RefFileDoc[];
  rev(): number;
  settled(): Promise<void>;
  count(): number;
  panel(): RefPanelDoc | null;
  apply(refs: ReferencesDoc, panel: RefPanelDoc | null, opts?: { tooNew?: boolean }): void;
}

export interface SessionDeps {
  editor: Editor;
  /** 参考窗（缺 = 没有参考窗：文件里的牌组原样带着写回）。 */
  refs?: RefsPort;
  captureThumbnail: () => { mimeType: string; bytes: Uint8Array } | null;
  onHomeChanged: () => void;
  setStatus: (text: string, error?: boolean) => void;
  online: () => boolean;
}

const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
export { bareName, docSuffixOf, fullName, isDocName } from "./doc-names.ts";
const dirOf = (path: string): string => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

/** smart save 钮的状态集（WeebPaint save-status 同形）：none = 没东西可存 · dirty = 内存脏 · local-only = 已存本机/文件、云不可达 ·
 *  saving = 在飞 · cloud-off = 未配置云 · unpushed = 已落本机但云腿没成（终态，非在飞）· synced = 上次保存已同步。 */
export type SaveState = "none" | "dirty" | "local-only" | "saving" | "cloud-off" | "unpushed" | "synced";

export class Session {
  home: DocHome = { kind: "transient" };
  saving = false;
  /** 还原出厂（factory-reset.ts）停机旗：之后 dirty() 恒 false、save() / flush 全 no-op、tick 已停——页面随后 reload。 */
  private halted = false;
  /** 图库家：上次保存的云腿没成（离线 / 未登录 / 冲突取消 / 落地未确认）——下次显式保存再推。 */
  pushPending = false;
  /** 2026-10-26：这份和云端没对上、要人选用哪边（自动保存撞上时库想弹面，被 conflictGate 挡成横幅）。cloudState = 库说的云端此刻状态（changed / unchanged / absent / never）。
   *  清的时机：推上去了（save / resolveActive 成功）、换了文档。横幅本身在 main（onAttentionChanged）。 */
  attention: { cloudState: string | null } | null = null;
  markAttention(cloudState: string | null): void { this.attention = { cloudState }; this.d.onHomeChanged(); }
  /** lazyblank（WeebPaint P1.5）：图库家 + 日期名只在内存，文件还没建；首笔有内容 → adoptLazy 翻 false。空白期永不落盘、回执条不写。 */
  lazy = false;
  /** 首存必须 mode:"new"（撞名不静默覆盖）直到第一次真落盘成功；失败后 30 s 自动保存重试仍带 new。 */
  private createPending = false;
  /** lazyblank 安家中（消歧名字）；save / leaveGate 先等它落定，别把字节写到还没定的名字上。 */
  private adopting: Promise<void> | null = null;
  private refreshInFlight = false;
  private savedRevision: number;
  private lastSeenRevision: number;
  /** 参考窗牌组的修订号（加删卡；视图态不算）：存过的 / 看到过的。dirty = 几何改了 ∨ 牌组改了。 */
  private savedRefRev = 0;
  private lastSeenRefRev = 0;
  private lastEditAt = 0;
  private loaded: CatsupDocument | null = null;   // 打开的文档（含 round-trip 携带的未知内容）；保存时以它为底
  private timer: number;
  /** T-crash 行李牌（file / transient 家才有；gallery 家 = null）+ 上次快照的 revision。 */
  private luggage: LuggageTag | null = null;
  private snapRevision = -1;
  private snapRefRev = -1;   // 同上，参考窗牌组那一半（只加了参考卡也要有影子）
  /** 图库当前夹（新建自动安家用；gallery-host 同步）。 */
  currentDir = "";

  /** 桌面态（CATSUP_desk；WeebPaint desk 同款）：☰ 停在哪页等跟文件走的编辑器状态。载入时从文件来、新建 reset、存盘时顺手捞走；改它不标脏
   *  （user 2026-07-14 在 WeebPaint 接受的代价：只切页不画不存就退出 → 下次开 revert 到上次保存的）。 */
  private desk: DeskDoc = defaultDesk();
  menuTab(key: string): string | null { return this.desk.menuTabs[key] ?? null; }
  setMenuTab(key: string, tab: string): void { this.desk.menuTabs[key] = tab; }
  /** 读取侧三级拍子提示（家族纪律：minor 更新提示一次、patch 静默；desk 太新 = 原字节带回 + 默认显示）。每次载入说一次。 */
  private noteFormat(doc: CatsupDocument): void {
    const n = doc.readNotes;
    if (!n) return;
    if (n.newerMinor.length) this.d.setStatus(`这份文件是更新版的 CatsUp 写的（${n.newerMinor.map((x) => `${x.ext.replace("CATSUP_", "")} ${fmtStamp(x.file)}，本版 ${fmtStamp(x.mine)}`).join("；")}）：能开能存，它多出来的内容会原样带回`);
    if (n.deskTooNew) this.d.setStatus(`这份文件的界面记录（desk ${fmtStamp(n.deskTooNew)}）比本版新：按默认显示，保存时原样带回`);
  }
  constructor(private d: SessionDeps) {
    this.savedRevision = this.lastSeenRevision = d.editor.revision;
    this.savedRefRev = this.lastSeenRefRev = this.refRev();
    this.mintLuggage();   // 开机的初始 transient 也要有牌（否则开机就画的模型没影子）
    this.timer = window.setInterval(() => this.tick(), 1000);
  }

  // ---------- 只读 ----------
  dirty(): boolean { return !this.halted && (this.d.editor.revision !== this.savedRevision || this.refRev() !== this.savedRefRev); }
  private refRev(): number { return this.d.refs?.rev() ?? 0; }
  /** 参考窗跟着文件换：目录 + 窗交给接缝，牌组修订号对齐成「已存」（载入不是改动）。 */
  private applyRefs(doc: CatsupDocument | null): void {
    this.d.refs?.apply(doc?.references ?? emptyReferences(), doc?.desk.refPanel ?? null, { tooNew: !!doc?.readNotes?.referencesTooNew });
    this.savedRefRev = this.lastSeenRefRev = this.refRev();
  }
  displayName(): string {
    switch (this.home.kind) {
      case "gallery": return bareName(this.home.path);
      case "file": return bareName(this.home.fileName);
      case "transient": return this.home.name ?? "新模型";
    }
  }
  /** file / transient 家 且脏（beforeunload 承重层用）。 */
  dirtyLocalHome(): boolean { return this.localHomeKind() !== null && this.dirty(); }
  private localHomeKind(): "file" | "transient" | null { return this.home.kind === "gallery" ? null : this.home.kind; }
  /** lazyblank 且还没动过（boot 登录后重试恢复 / 挂库不塞空白 用）。 */
  isUntouchedLazyBlank(): boolean { return this.lazy && !this.dirty(); }
  private hasContent(): boolean { if ((this.d.refs?.count() ?? 0) > 0) return true; for (const { pool } of this.d.editor.sceneRef.pools()) if (this.d.editor.sceneRef.kernelOf(pool).edges().length > 0) return true; return false; }   // 空白场景里只放了参考卡也算有内容（安家，别让新建 / 开别的时静默丢掉）
  /** smart save 钮的状态（顺序 = WeebPaint computeSaveState：saving → dirty → cloud-off → unpushed/synced → local-only）。 */
  saveState(): SaveState {
    if (this.saving) return "saving";
    const dirty = this.dirty();
    switch (this.home.kind) {
      case "transient": return dirty ? "dirty" : "none";
      case "file": return dirty ? "dirty" : "local-only";
      case "gallery":
        if (this.lazy) return "none";   // 空白 lazyblank：没东西可存（首笔安家后就是普通图库家）
        if (dirty) return "dirty";
        if (!auth.isAuthConfigured()) return "cloud-off";
        if (auth.isSignedIn() && this.d.online()) return this.pushPending ? "unpushed" : "synced";
        return "local-only";
    }
  }
  /** 钮的 tooltip 文案（状态 + 住哪）。 */
  saveTitle(): string {
    const name = this.displayName();
    switch (this.saveState()) {
      case "none": return this.lazy ? `空白场景「${name}」：画第一笔就会自动存进图库` : "还没有内容可保存";
      case "dirty": return this.home.kind === "transient" ? `「${name}」还没有家：保存 = 另存到磁盘` : this.home.kind === "file" ? `「${name}」有改动：保存 = 写回文件` : `「${name}」有改动：保存到本机并同步（30 s 空闲也会自动保存）`;
      case "local-only": return this.home.kind === "file" ? `「${name}」已保存到文件` : `「${name}」已保存到本机；云端不可达（登录 OneDrive 后同步）`;
      case "saving": return `正在保存「${name}」…`;
      case "cloud-off": return `「${name}」已保存到本机（云端未配置）`;
      case "unpushed": return this.attention
        ? `「${name}」已保存到本机，但和云端没对上——点横幅上的「处理…」选用哪边（再点保存也会问你）`
        : `「${name}」已保存到本机，云端那份还没推上去——再点一次保存重推`;
      case "synced": return `「${name}」已同步到 OneDrive；再点 = 重新保存并推送`;
    }
  }

  /** 编辑器每次 checkpoint 变化（commit / undo / redo / load）同步进来（main 的 editor.host.changed）：
   *  刷徽章 + **lazyblank 首笔安家**（WeebPaint session-state onChange 钩子同形：真出现内容才绑身份）。 */
  noteChange(): void {
    const rev = this.d.editor.revision, rr = this.refRev();
    if (rev !== this.lastSeenRevision || rr !== this.lastSeenRefRev) { this.lastSeenRevision = rev; this.lastSeenRefRev = rr; this.lastEditAt = Date.now(); this.d.onHomeChanged(); }
    if (this.lazy && this.home.kind === "gallery" && this.hasContent()) {
      this.lazy = false;   // 同步翻旗：同一 tick 内第二次 changed 不会重复安家
      this.adopting = this.adoptLazy().catch((e) => reportError(e)).finally(() => { this.adopting = null; this.d.onHomeChanged(); });
    }
  }

  private tick(): void {
    const rev = this.d.editor.revision, rr = this.refRev();
    if (rev !== this.lastSeenRevision || rr !== this.lastSeenRefRev) { this.lastSeenRevision = rev; this.lastSeenRefRev = rr; this.lastEditAt = Date.now(); this.d.onHomeChanged(); }
    // T-crash / 自动保存（图库家）：空闲 30 s 且脏且不在手势中 → 落本地（在线且登录则一并推云）
    const idle = !this.saving && !this.d.editor.isGestureActive() && Date.now() - this.lastEditAt >= AUTOSAVE_IDLE_MS;
    if (this.home.kind === "gallery" && !this.lazy && this.dirty() && idle) {
      void this.save({ implicit: true });
    } else if (this.localHomeKind() && this.luggage && this.dirty() && (rev !== this.snapRevision || rr !== this.snapRefRev) && idle) {
      void this.snapshot("crash");   // file / transient 家：盲快照进 crash-store（附加层，best-effort）
    }
  }

  // ---------- T-crash（附加层）----------
  private mintLuggage(): void { this.luggage = mintLuggageTag(); this.snapRevision = this.d.editor.revision; this.snapRefRev = this.refRev(); }
  /** 释放行李牌（离开 file / transient 家的每条路都要过这）：正常关闭即删（pending-adoption 由库内拒删）。 */
  private dropLuggage(): void {
    const t = this.luggage; this.luggage = null;
    if (t) crashStore.dropOnCleanClose(t).catch(() => {});   // best-effort：清扫失败顶多多一条陈旧通知
  }
  /** 盲快照：与保存同一 encode 字节，同一张牌覆盖写单帧。state="pending-adoption" = 登录 redirect 前留声（pagehide 不焚）。 */
  async snapshot(state: "crash" | "pending-adoption" = "crash"): Promise<boolean> {
    const kind = this.localHomeKind(); const tag = this.luggage;
    if (!kind || !tag) return false;
    const rev = this.d.editor.revision, rr = this.refRev();
    try {
      const bytes = this.encode();
      if (this.luggage !== tag) return false;   // encode 间隙换了家——别把别的模型写进这张牌
      await crashStore.put(tag, new Blob([bytes], { type: "model/gltf-binary" }), { state, name: this.displayName(), at: Date.now(), homeKind: kind });
      this.snapRevision = rev; this.snapRefRev = rr;
      return true;
    } catch (e) { reportError(new Error("[t-crash] snapshot failed (best-effort, load-bearing layers unaffected): " + String(e)), "log"); return false; }
  }
  /** 登录 redirect 前：脏的 file / transient 模型留 pending-adoption 帧（页面将死但不是关闭；回来 crash-recovery 自动领养）。 */
  needsRedirectSnapshot(): boolean { return this.dirtyLocalHome(); }
  async prepareForRedirect(): Promise<void> { if (this.needsRedirectSnapshot()) await this.snapshot("pending-adoption"); }
  /** pagehide（非 bfcache）= 用户过完挽留门选择离开 → 快照焚；真 crash 不触发 pagehide → 快照幸存。 */
  onPageHide(persisted: boolean): void { if (persisted) return; if (this.luggage) crashStore.dropOnCleanClose(this.luggage).catch(() => {}); }
  /** 崩溃安全 flush（WeebPaint es.start 三件：visibilitychange:hidden / blur / pagehide(!persisted)）：图库家脏 → 只落本地不推
   *  （页面要走，push 未必完成；push-pending 留着下次显式保存推）；file / transient 家脏 → 盲快照。不等空闲、不看手势（encode 读的是
   *  checkpoint = 上次 commit 的世界，手势中途也一致）。fire-and-forget：卸载期没有时间预算。 */
  flushForHide(): void {
    if (this.home.kind === "gallery") { if (!this.lazy && this.dirty() && !this.saving) void this.save({ implicit: true, localOnly: true }); }
    else if (this.luggage && this.dirty() && (this.d.editor.revision !== this.snapRevision || this.refRev() !== this.snapRefRev)) void this.snapshot("crash");
  }
  /** 领养崩溃影子 / redirect 流产者：挂了图库 → 新身份进图库（`<名>-恢复`，撞名追加序号）并保存；否则 transient（带名、脏）。
   *  领养出的模型视为 dirty 直到首次真保存（Blockbench #2684/#2003）。gate=false 用于 boot 自动领养（当前是刚开机的空场景）。 */
  async adoptRecovered(bytes: Uint8Array, name: string, opts: { gate: boolean }): Promise<"gallery" | "transient" | null> {
    if (opts.gate && !(await this.leaveGate())) return null;
    const doc = readCatsup(bytes);
    const sc = sceneFromDocument(doc);
    this.dropLuggage();
    this.loaded = doc;
    this.lazy = false;
    this.d.editor.loadScene(sc, "恢复");
    this.d.editor.setGrid(gridFromSettings(doc.settings));
    this.d.editor.vcbUnit = unitFromSettings(doc.settings);   // 单位跟着模型走（settings.displayUnit；units.ts）
    this.d.editor.loadScaleRefs(scaleRefsFromSettings(doc.settings));   // B43 尺度参考跟着文件走（settings.scaleRefs；旧单选键 scaleRef 照读）
    this.desk = doc.desk;   // 桌面态（☰ 停在哪页等）跟文件走
    this.applyRefs(doc);    // 参考窗跟文件走
    this.noteFormat(doc);
    this.d.editor.setLocked(this.locked());   // 演示锁跟文件走（desk.locked）
    this.d.editor.zoomExtents();
    this.lastSeenRevision = this.d.editor.revision; this.savedRevision = -1;
    if (hasStore()) {
      const path = await this.freeName(this.currentDir, `${name}-恢复`);
      this.createPending = true;
      this.setHome({ kind: "gallery", path });
      await this.save({ implicit: true });   // 没成也留在图库家 + dirty，30 s 自动保存补（createPending 保证仍 mode:"new"）
      return "gallery";
    }
    this.setHome({ kind: "transient", name });
    return "transient";
  }

  // ---------- 演示锁（周账 F-124，2026-10-29；吃掉 v0.12.8 的定稿 / 改稿版本章，设计 = ai-docs/20261024-finalize.md §0）----------
  // user 10-28 晚「定稿的语义不对，这个是锁屏，不是 commit……锁屏是防止误触」「锁操作还是给你演示看的，还可以进去玩。或者 rts 模式。反正类似 wxhw 的锁」。
  // 一个开关、一点就开关、没有口令。锁着 = 改模型的一切都拒（编辑器 commit / undo / redo / VCB / 指针按下 / 键盘起手 / 右键菜单），看的一切照旧、进去玩（验证工作台）照旧。
  // 住桌面态 desk.locked（跟文件走、不是内容、不标脏、不进撤销）——给人看的文件打开就是锁着的；有家就顺手存一次（不是标脏：几何的 savedRevision 不动）。
  /** 这份文件现在锁着没有。 */
  locked(): boolean { return !!this.desk.locked; }
  /** 锁上 / 解锁。有家（图库 / 本地文件）就顺手存一次，让锁跟着文件走；无地 = 住内存、导出时带走。 */
  async setLocked(on: boolean): Promise<void> {
    if (this.locked() === on) return;
    if (on) this.desk.locked = true; else delete this.desk.locked;
    this.d.editor.setLocked(on);
    this.d.onHomeChanged();
    this.d.setStatus(on ? "锁上了：看、转、进去玩都行，改不了；☰「解锁」放开" : "解锁了");
    if (this.home.kind !== "transient" && !(this.home.kind === "gallery" && this.lazy)) await this.save({ implicit: true });
  }
  private encode(): Uint8Array {
    const name = this.displayName();
    const doc: CatsupDocument = documentFromScene(this.d.editor.sceneRef, name, this.loaded);
    doc.settings = scaleRefsToSettings({ ...settingsFromGrid(doc.settings, this.d.editor.grid), displayUnit: unitToSettings(this.d.editor.vcbUnit) }, this.d.editor.scaleRefs);   // 绝对网格（0.11 ⑤）住编辑器、存进文档 settings（不进 undo）
    doc.desk = this.deskForSave();   // 桌面态存盘时顺手捞走（不标脏，WeebPaint desk 同款）；含参考窗的窗
    if (this.d.refs) doc.references = { files: this.d.refs.files(), extra: this.loaded?.references.extra ?? {} };   // 参考窗目录（接缝编好的字节；太新时 = 原样那份，写入器另走 carry）
    const thumb = this.d.captureThumbnail();
    if (thumb) doc.thumbnail = thumb; else delete doc.thumbnail;
    this.loaded = doc;
    return writeCatsup(doc);
  }
  /** desk 存盘形状：参考窗的窗以接缝为准（开过窗才有；这个文件里没开过 = 文件里原来那份）。 */
  private deskForSave(): DeskDoc {
    const p = this.d.refs?.panel() ?? null;
    return p ? { ...this.desk, refPanel: p } : this.desk;
  }
  /** 2026-10-26：编辑器横幅 / 保存钮上的「处理…」= 对正在编辑的这份主动叫库的面（store `file.resolve()` 三选一；app 不传答案）。
   *  took-cloud → 本地已换成云端那份 → 整份重载（否则下次保存又把旧画布盖回去）；pushed → 对上了；cancelled → 横幅留着。 */
  async resolveActive(): Promise<"pushed" | "took-cloud" | "cancelled" | "other"> {
    if (this.home.kind !== "gallery" || this.lazy || this.saving) return "other";
    const path = this.home.path;
    const r = await docFile(path).resolve();
    const why = "reason" in r && r.reason ? String(r.reason) : "";
    note("doc", `resolveActive ${bareName(path)}: ${r.status}${why ? " " + why : ""}`);
    if (r.status === "took-cloud") {
      const blob = await docFile(path).open();
      if (blob && this.home.kind === "gallery" && this.home.path === path) { this.adopt(new Uint8Array(await blob.arrayBuffer())); this.attention = null; this.d.setStatus(`已改用云端版本「${bareName(path)}」（这台的那份进了备份箱）`); }
      this.d.onHomeChanged();
      return "took-cloud";
    }
    if (r.status === "pushed") { this.pushPending = false; this.attention = null; this.d.setStatus(`本地覆盖了云端「${bareName(path)}」`); this.d.onHomeChanged(); return "pushed"; }
    if (r.status === "cancelled") { this.d.setStatus("这次没动"); return "cancelled"; }
    if (r.status === "clean") { this.attention = null; this.pushPending = false; this.d.onHomeChanged(); return "other"; }
    this.d.setStatus(`没处理成：${r.status}${why ? "（" + why + "）" : ""}`, true);
    return "other";
  }
  private adopt(bytes: Uint8Array): void {
    const doc = readCatsup(bytes);
    const sc = sceneFromDocument(doc);
    this.pushPending = false; this.attention = null;
    this.lazy = false; this.createPending = false;
    this.loaded = doc;
    this.d.editor.loadScene(sc);
    this.d.editor.setGrid(gridFromSettings(doc.settings));
    this.d.editor.vcbUnit = unitFromSettings(doc.settings);   // 单位跟着模型走（settings.displayUnit；units.ts）
    this.d.editor.loadScaleRefs(scaleRefsFromSettings(doc.settings));   // B43 尺度参考跟着文件走（settings.scaleRefs；旧单选键 scaleRef 照读）
    this.desk = doc.desk;   // 桌面态（☰ 停在哪页等）跟文件走
    this.applyRefs(doc);    // 参考窗跟文件走
    this.noteFormat(doc);
    this.d.editor.setLocked(this.locked());   // 演示锁跟文件走（desk.locked）
    this.d.editor.zoomExtents();
    this.savedRevision = this.lastSeenRevision = this.d.editor.revision;
  }
  /** 家的唯一写点（= WeebPaint _setActive）：行李牌 / store activeIdentifier / **回执条**（@internal/gallery resume-slate）都从这收口。
   *  回执条语义（WeebPaint 同）：图库家（非 lazy）→ {doc}；文件家 → {gallery}（句柄跨刷新不可恢复，下次落图库）；transient / lazyblank 不碰
   *  （空白不算「上次开着的画」）；未挂库时回执条无意义，一律不碰。 */
  private setHome(h: DocHome): void {
    this.home = h;
    if (h.kind === "gallery") this.dropLuggage(); else if (!this.luggage) this.mintLuggage();   // 图库家的影子 = store 本地副本；本地家要牌
    setActiveDocName(h.kind === "gallery" && !this.lazy ? h.path : null);
    if (hasStore()) {
      try {
        if (h.kind === "gallery") { if (!this.lazy) setOpened({ kind: "doc", path: h.path }); }
        else if (h.kind === "file") setOpened({ kind: "gallery" });
      } catch (e) { reportError(new Error("[session] resume slate write failed: " + String(e)), "log"); }
    }
    this.d.onHomeChanged();
  }
  /** 图库覆盖层开 / 关时的回执条（WeebPaint：退到图库 = {gallery}；回到图库家文档 = {doc}；lazyblank / 本地家底下 → 停在 {gallery}）。 */
  slateGalleryOpened(): void { if (hasStore()) try { setOpened({ kind: "gallery" }); } catch { /* device-kv 不抛 */ } }
  slateGalleryClosed(): void { if (hasStore() && this.home.kind === "gallery" && !this.lazy) try { setOpened({ kind: "doc", path: this.home.path }); } catch { /* 同上 */ } }
  /** 撞名消歧：`base`、`base-1`、`base-2`…（store files.occupied 本机 ∪ 云端）。 */
  private async freeName(dir: string, base: string): Promise<string> {
    const files = requireStore().files;
    const taken = async (stem: string): Promise<boolean> => { for (const e of DOC_EXTS) if (await files.occupied(fullName(dir, stem, e))) return true; return false; };   // 同主干的老 .glb 也算占用：不造「房子.catsup + 房子.glb」双胞胎
    let stem = base;
    for (let n = 1; n < 100 && (await taken(stem)); n++) stem = `${base}-${n}`;
    return fullName(dir, stem);
  }

  // ---------- 生命周期 ----------
  /** lazyblank 新场景（WeebPaint beginLazyBlank）：空内核 + 图库家日期名只在内存；不建文件、不写回执条；首笔有内容 → noteChange 安家。
   *  boot 的「可画新场景」落点（首次 / 恢复失败 / 崩溃断路）+ 挂库时的「新建」。 */
  beginLazyBlank(): void {
    this.loaded = null;
    this.pushPending = false; this.createPending = false;
    this.lazy = false;   // loadKernel 会同步 changed → noteChange；此刻别当首笔
    this.d.editor.loadKernel(new Kernel(), "新建");
    this.d.editor.setGrid({ ...NEW_DOC_GRID });
    this.d.editor.loadScaleRefs(DEFAULT_SCALE_REFS);
    this.desk = defaultDesk();
    this.applyRefs(null);   // 新文件 = 空牌组、窗收着
    this.d.editor.setLocked(false);
    this.savedRevision = this.lastSeenRevision = this.d.editor.revision;
    this.dropLuggage();
    this.lazy = true;
    this.setHome({ kind: "gallery", path: fullName(this.currentDir, defaultDocName()) });
  }
  /** lazyblank 首笔安家：消歧名字 → 身份落定（回执条从此指它）→ 首存 mode:"new"。名字落定与字节落盘分两步：
   *  `adopting` 只覆盖前者，后者是普通 save（失败留 dirty + createPending，30 s 自动保存重试）。 */
  private async adoptLazy(): Promise<void> {
    if (this.home.kind !== "gallery") return;
    const planned = this.home.path;
    let path = planned;
    try { path = await this.freeName(dirOf(planned), bareName(planned)); }
    catch (e) { reportError(new Error("[session] name check failed, keeping planned name: " + String(e)), "log"); }
    if (this.home.kind !== "gallery" || this.home.path !== planned) return;   // 消歧期间换了家（开了别的 / 领养了）——作废
    this.createPending = true;
    this.setHome({ kind: "gallery", path });   // lazy 已翻 false → 写回执条 {doc}
    note("doc", `lazyblank adopted → ${path}`);
    void this.save({ implicit: true });
  }
  /** 新建：脏则挽留；挂了图库 → lazyblank（不建文件，首笔安家），否则 transient。 */
  async newDoc(): Promise<boolean> {
    if (!(await this.leaveGate())) return false;
    if (hasStore()) { this.beginLazyBlank(); return true; }
    this.loaded = null;
    this.lazy = false; this.createPending = false;
    this.d.editor.loadKernel(new Kernel(), "新建");
    this.d.editor.setGrid({ ...NEW_DOC_GRID });
    this.d.editor.loadScaleRefs(DEFAULT_SCALE_REFS);
    this.desk = defaultDesk();
    this.applyRefs(null);   // 新文件 = 空牌组、窗收着
    this.d.editor.setLocked(false);
    this.savedRevision = this.lastSeenRevision = this.d.editor.revision;
    this.dropLuggage();   // 旧模型的影子随旧牌焚；新家（下面 setHome）现铸新牌
    this.setHome({ kind: "transient" });
    return true;
  }
  /** boot 恢复端口（restoreLastSession.restore）：无挽留门、无状态行（端口自己报）；本地优先——boot 在 initAuth 之前调，
   *  store 此刻视为未登录 → 直接读本地副本零网络（ai-docs/20260922 §1.3）。返回是否装入了字节。 */
  async restore(path: string): Promise<boolean> {
    try {
      const blob = await docFile(path).open();
      if (!blob) return false;
      this.adopt(new Uint8Array(await blob.arrayBuffer()));
      this.dropLuggage();
      this.setHome({ kind: "gallery", path });
      return true;
    } catch (e) { reportError(new Error("[session] restore failed: " + String(e)), "log"); return false; }
  }
  /** 从图库打开（本地优先；没本地且离线 → 诚实报）。 */
  async openFromGallery(path: string): Promise<boolean> {
    if (!(await this.leaveGate())) return false;
    try {
      const blob = await docFile(path).open();
      if (!blob) { this.d.setStatus(`「${bareName(path)}」本机没有副本，云端也连不上`, true); return false; }
      this.adopt(new Uint8Array(await blob.arrayBuffer()));
      this.dropLuggage();
      this.setHome({ kind: "gallery", path });
      this.d.setStatus(`已打开 ${bareName(path)}`);
      return true;
    } catch (e) { reportError(e); return false; }
  }
  /** 登录落地 / 回线 / 回前台的**显式快进**（WeebPaint refreshOpenDoc，P1 2026-08-25）：图库家 ∧ 干净 ∧ 云可达 → pullIfClean；
   *  云端更新且本地干净 → 库拉字节（期间 busy 遮罩：别让用户在换字节的半路落笔）→ 同名重开。脏 / push-pending / lazyblank 一律不快进
   *  （分歧留给保存的 412 冲突面）。库侧 localDirty 二次核对 fetchMeta 期间有没有落笔。 */
  async refreshOpenDoc(): Promise<void> {
    if (this.home.kind !== "gallery" || this.lazy || this.refreshInFlight || this.saving || this.adopting) return;
    if (this.dirty() || this.pushPending || !auth.isSignedIn() || !this.d.online()) return;
    const path = this.home.path;
    this.refreshInFlight = true;
    let gate = false;
    try {
      const r = await docFile(path).pullIfClean({
        localDirty: () => this.dirty(),
        onReplaceStart: () => { gate = true; showBusy("正在从云端更新…", bareName(path)); },
        // store 0.18.1：登录落地 / 回线 / 回前台正是「怀疑自己过期」的时刻——不采信 30 s 内图库刚列过的旧清单（0.17.0 fresh-hints），一定问一趟云端，
        //   别的设备这 30 s 里刚存的也能快进（家族根数据安全模型 §3 A4；库发版说明写明的消费方义务）。
        trustHints: false,
      });
      if (r.status !== "fast-forwarded") { if (r.status && r.status !== "in-sync") note("doc", `refresh ${bareName(path)}: ${r.status}${r.reason ? " " + r.reason : ""}`); return; }
      if (this.home.kind !== "gallery" || this.home.path !== path || this.dirty()) return;   // 换了家 / 期间落笔（遮罩前的窗口）：本地字节已新，画布留用户的
      const blob = await docFile(path).open();
      if (!blob) { this.d.setStatus(`「${bareName(path)}」云端已更新，但重开失败`, true); return; }
      this.adopt(new Uint8Array(await blob.arrayBuffer()));
      note("doc", `refreshed from cloud: ${path}`);
      this.d.setStatus(`已从云端更新「${bareName(path)}」`);
      this.d.onHomeChanged();
    } catch (e) { reportError(new Error("[session] refreshOpenDoc failed: " + String(e)), "log"); }
    finally { if (gate) hideBusy(); this.refreshInFlight = false; }
  }
  /** 打开本地文件字节（拖入 / 文件输入 / FSA 句柄）。 */
  async openLocalBytes(bytes: Uint8Array, fileName: string, handle: FSHandle | null): Promise<boolean> {
    // 别的软件导出的 glb：打开照旧拒（T11 / DT2 user「拒开glb，但是可以导入」），说清去哪导入；先于「要不要先保存」那一问
    if (isForeignGlb(bytes)) { this.d.setStatus(`「${fileName}」是别的软件做的 glb，不能当 CatsUp 模型打开；要放进当前模型请用 ☰ → 导入 glb…`, true); return false; }
    if (!(await this.leaveGate())) return false;
    try {
      this.adopt(bytes);
      this.dropLuggage();
      this.setHome({ kind: "file", handle, fileName });
      this.d.setStatus(`已打开 ${fileName}`);
      return true;
    } catch (e) { reportError(e); return false; }
  }
  async openLocalPicker(): Promise<boolean> {
    if (!supportsOpenPicker()) return false;
    let handles: FSHandle[];
    try { handles = await fsa.showOpenFilePicker!({ types: OPEN_PICKER_TYPES, multiple: false }); } catch { return false; }   // 用户取消
    const h = handles[0]; if (!h) return false;
    const file = await h.getFile();
    return this.openLocalBytes(new Uint8Array(await file.arrayBuffer()), file.name, h);
  }

  /** 保存 = 送回家。transient 显式保存 = 安家仪式（FSA 另存 / 下载兜底）；implicit（自动 / 离开）在 transient 上是 noop。
   *  localOnly：崩溃安全 flush 用，只落本地不推（push-pending 留着）。 */
  async save(opts: { implicit?: boolean; localOnly?: boolean } = {}): Promise<boolean> {
    if (this.halted) return false;
    if (this.adopting) await this.adopting;   // lazyblank 名字还没落定：等它（不含字节落盘，不会自等）
    if (this.saving) return false;
    const home = this.home;
    if (home.kind === "transient") return opts.implicit ? false : this.settleToFile();
    if (home.kind === "gallery" && this.lazy) { if (!opts.implicit) this.d.setStatus("空白场景，还没有需要保存的内容"); return false; }   // WeebPaint blankNothingToSave
    this.saving = true; this.d.onHomeChanged();
    try {
      if (this.d.refs) await this.d.refs.settled();   // 刚加的参考卡字节还在编：等它，别存一份缺卡的
      const revAtStart = this.d.editor.revision, refRevAtStart = this.refRev();
      const bytes = this.encode();
      if (home.kind === "file") {
        if (home.handle) {
          const w = await home.handle.createWritable();
          await w.write(new Blob([bytes], { type: "model/gltf-binary" })); await w.close();
          this.savedRevision = revAtStart; this.savedRefRev = refRevAtStart;
          if (this.luggage) { crashStore.dropOnCleanClose(this.luggage).catch(() => {}); this.snapRevision = revAtStart; this.snapRefRev = refRevAtStart; }   // 旧快照作废：磁盘已是最新（牌留着）
          if (!opts.implicit) this.d.setStatus(`已保存 ${home.fileName}`);
          return true;
        }
        if (opts.implicit) return false;
        this.download(bytes, home.fileName);   // 下载开始 = 责任移交；没回家，dirty 如实留着
        this.d.setStatus(`已下载 ${home.fileName}（浏览器不支持原地写回，dirty 保留）`);
        return false;
      }
      // 图库家。implicit（自动保存 / 离开）撞上云端 → 不弹模态面，横幅接手（store-ui conflictGate；user 2026-10-26「不弹模态，横幅 + 钮」）
      conflictGate.implicit = !!opts.implicit;
      let r;
      try { r = await docFile(home.path, this.createPending ? "new" : "existing").save(bytes, { tryPush: !opts.localOnly && auth.isSignedIn() && online() }); }
      finally { conflictGate.implicit = false; }
      if (r.resolution === "takeCloud") {   // 用户选了云端版本：整份重载（否则下次保存又覆盖云端）
        this.d.setStatus("已改用云端版本");
        const blob = await docFile(home.path).open();
        if (blob) { this.adopt(new Uint8Array(await blob.arrayBuffer())); }
        return true;
      }
      this.createPending = false;
      this.savedRevision = revAtStart; this.savedRefRev = refRevAtStart;
      this.pushPending = !r.pushed;
      if (r.pushed) this.attention = null;   // 推上去了 = 和云端对上了（2.2.1 起谱系丢了也会先问云端再推，没人动过就直接成）
      if (!opts.implicit) this.d.setStatus(r.pushed ? `已保存并同步 ${bareName(home.path)}` : `已保存到本机 ${bareName(home.path)}${auth.isSignedIn() ? "（稍后同步）" : ""}`);
      return true;
    } catch (e) { reportError(e); return false; }
    finally { this.saving = false; this.d.onHomeChanged(); }
  }
  /** 另存到磁盘（安家仪式）：FSA → 文件家；无 FSA → 下载（不安家、不清 dirty）。 */
  async settleToFile(): Promise<boolean> {
    const suggested = `${this.displayName()}${DOC_EXT}`;
    if (supportsSavePicker()) {
      let h: FSHandle;
      try { h = await fsa.showSaveFilePicker!({ suggestedName: suggested, types: SAVE_PICKER_TYPES }); } catch { return false; }
      this.lazy = false;
      this.setHome({ kind: "file", handle: h, fileName: h.name });
      return this.save();
    }
    const bytes = this.encode();
    this.download(bytes, suggested);
    this.d.setStatus(`已下载 ${suggested}（本浏览器无法原地写回；模型仍未安家）`);
    return false;
  }
  /** 导出工程文件（导出设计稿 §3；账本 UX39）：.catsup = 和保存写的同一份 encode()，工程原样一个字节不改（参考图 / 尺规 / 硬表面数据都在）。永不清 dirty；下载开始 = 责任移交。 */
  exportProject(): string {
    const bytes = this.encode(), name = `${downloadName(this.displayName())}${DOC_EXT}`;   // 导出名带导出时间（WeebPaint 同款；user 10-28）
    this.download(bytes, name);
    this.d.setStatus(`${name} 已下载（工程原样，可以开回 CatsUp）`);
    return name;
  }
  /** 导出模型 .glb（导出设计稿 §4 / §5）：给别的软件看的烤好的模型——只写 glTF core，不是工程备份。only = 只导这几份物体（定义 id + 世界变换）。永不清 dirty。 */
  exportModelGlb(opts: { textures: boolean; lines: boolean; only?: readonly { def: number; xform: Xform; name?: string }[] }): { name: string; bytes: number } {
    const scene = this.d.editor.sceneRef, doc = documentFromScene(scene, this.displayName(), this.loaded), ids = [...scene.defs.keys()];
    const only = opts.only?.map((o) => ({ definition: ids.indexOf(o.def), xform: o.xform, ...(o.name !== undefined ? { name: o.name } : {}) })).filter((o) => o.definition >= 0);
    const bytes = writeGltfModel(doc, { textures: opts.textures, lines: opts.lines, ...(only ? { only } : {}) }), name = `${downloadName(this.displayName())}.glb`;
    this.download(bytes, name);
    this.d.setStatus(`${name} 已下载（给别的软件看的模型，不是工程备份）`);
    return { name, bytes: bytes.byteLength };
  }
  private download(bytes: Uint8Array, name: string): void {
    const url = URL.createObjectURL(new Blob([bytes], { type: "model/gltf-binary" }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  /** 离开当前文档前的挽留：图库家 = 自动保存（WeebPaint 图库模式 UX）；文件家 / transient 且脏 = 三键。 */
  async leaveGate(): Promise<boolean> {
    if (this.adopting) await this.adopting;
    if (!this.dirty()) return true;
    if (this.home.kind === "gallery") return this.lazy ? true : this.save({ implicit: true });   // lazy ∧ dirty 不可能（有内容即安家）；防御：空白可弃
    const isFile = this.home.kind === "file";
    const v = await openChoiceSheet<"save" | "discard">(isFile ? "保存到文件再离开？" : "这个模型还没有家", isFile ? "改动还没写回文件。" : "现在离开会丢掉这个模型。",
      [{ label: isFile ? "保存" : "另存到磁盘…", value: "save", primary: true }, { label: "丢弃", value: "discard", danger: true }]);
    if (v === null) return false;
    if (v === "discard") return true;
    const ok = await this.save();
    return ok;
  }

  // ---------- 图库动词（gallery-host 委托）----------
  async renameActive(): Promise<string | null> {
    if (this.home.kind !== "gallery") return null;
    const cur = this.home.path;
    const bare = await openInputSheet("重命名", { defaultValue: bareName(cur), validate: (v) => (v.trim() ? (/[\\/:*?"<>|]/.test(v) ? "名字不能含 \\ / : * ? \" < > |" : null) : "名字不能为空") });
    if (bare === null) return null;
    const target = fullName(dirOf(cur), bare.trim(), docSuffixOf(cur) || DOC_EXT);   // 改名只改主干：老 .glb 工程改名还是 .glb（图库包同款）
    if (target === cur) return cur;
    if (this.lazy) { this.setHome({ kind: "gallery", path: target }); return target; }   // 文件还没建：只换内存里的计划名
    const r = await docFile(cur).tryMove(target);
    if (!r.ok) {
      if ((r as { reason?: string }).reason === "cancelled") { this.d.setStatus("这次没动"); return null; }   // store 2.2.2：「搬不搬旧的」面里选了取消 = 一个字节没动
      this.d.setStatus(`改名失败：${(r as { where?: string }).where === "cloud" ? "云端" : "本机"}已有同名`, true); return null;
    }
    this.setHome({ kind: "gallery", path: target });
    // 2026-10-26（周账 F-92「重命名会多出一份」已复现）：库在谱系不明 / 云端被别的设备改过时把改名**降级成另存**——新名推上去、云端旧名原地不动（07-18 逃生通道语义，
    //   怕把用户没见过的工作挪进回收站）。库把 oldKept / oldCloudOrphan / oldUnknown / cloudDeferred 旗都给了，以前这里只看 ok → 报「已重命名」= 谎报。现在如实说。
    const f = r as { oldKept?: boolean; oldKeptByUser?: boolean; oldCloudOrphan?: boolean; oldUnknown?: boolean; cloudDeferred?: boolean };
    const oldBare = bareName(cur), newBare = bareName(target);
    if (f.oldKept && f.oldKeptByUser) this.d.setStatus(`已另存为「${newBare}」；照你的意思，云端那份「${oldBare}」留着没动`);   // store 2.2.2：人选的
    else if (f.oldKept) this.d.setStatus(`已另存为「${newBare}」；云端那份「${oldBare}」没动（它和这台的改动对不上，或不知道这台派生自哪一版）——图库里还看得见，不要了自己送回收站`, true);
    else if (f.oldCloudOrphan) this.d.setStatus(`已改名为「${newBare}」，但云端旧名「${oldBare}」没能进回收站——图库里还看得见，自己处理`, true);
    else if (f.oldUnknown) this.d.setStatus(`已改名为「${newBare}」；云端状态没问到，旧名「${oldBare}」可能还在云端`, true);
    else if (f.cloudDeferred) this.d.setStatus(`已改名为「${newBare}」（本机）；云端那份还没推上去，下次保存补推`);
    return target;
  }
  /** 图库把活动文档改名/移动了（onRenamed / 图库动词）→ 换身份。 */
  setActivePath(path: string): void { if (this.home.kind === "gallery") this.setHome({ kind: "gallery", path }); }
  // （pushDoc 已删 2026-10-25：那是「open 再 save 刷新基准 + 传上去」的越狱形（store 0.18.3 滥用警示点名）；gallery ≥ 0.8.1 不再有这个动词。）
  async offloadDoc(path: string): Promise<void> { await docFile(path).offload(); }
  /** 去图库前：图库家的脏文档落本地（WeebPaint：退出自动 ctrl+s）。 */
  async flushLocal(): Promise<void> { if (this.adopting) await this.adopting; if (this.home.kind === "gallery" && !this.lazy && this.dirty()) await this.save({ implicit: true }); }

  /** 挂图库的用户手势时刻（首次开图库 / 登录 / 首存）：persist 表态落点。 */
  static persistOnGesture(): void { void requestStoragePersistence(); }
  /** 还原出厂 wipe 前收口（factory-reset.ts beforeWipe）：停 1 s tick（自动保存 / 盲快照）、放掉行李牌、家置成干净 transient——之后谁都别再写 store / crash-store / device-kv，
   *  它们马上要被清；beforeunload 看 dirty() 也不再挽留。不走 setHome（它会写回执条，而回执条正要被清）。 */
  haltForReset(): void {
    window.clearInterval(this.timer);
    this.halted = true; this.lazy = false; this.luggage = null;
    this.home = { kind: "transient" };
    this.savedRevision = this.lastSeenRevision = this.d.editor.revision;
  }
}
