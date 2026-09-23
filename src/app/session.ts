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
//   · lazyblank：beginLazyBlank（日期名内存态）→ noteChange（editor.host.changed 同步钩）首笔有边 → adoptLazy（nameOccupied 消歧 → 首存 mode:"new"）。
//   · restore(path) = boot 端口（无挽留门、无状态行）；refreshOpenDoc = 登录 / 回线 / 回前台的干净快进（pullIfClean + busy 遮罩 + 同名重开）；
//   · flushForHide = hidden / blur / pagehide(!persisted) 的崩溃安全 flush（只本地不推）。
import type { Editor } from "../editor/editor.ts";
import { Kernel } from "../kernel/kernel.ts";
import { newDocument, readCatsup, writeCatsup, type CatsupDocument } from "../format/index.ts";
import { AUTOSAVE_IDLE_MS, DOC_EXT, defaultDocName } from "../config.ts";
import { auth, docFile, hasStore, requireStore, requestStoragePersistence, setActiveDocName } from "../app-store.ts";
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
const GLB_PICKER_TYPES = [{ description: "CatsUp 模型（glTF 二进制）", accept: { "model/gltf-binary": [".glb"] } }];
export const supportsSavePicker = (): boolean => typeof fsa.showSaveFilePicker === "function" && window.self === window.top;
export const supportsOpenPicker = (): boolean => typeof fsa.showOpenFilePicker === "function" && window.self === window.top;

export type DocHome =
  | { kind: "gallery"; path: string }
  | { kind: "file"; handle: FSHandle | null; fileName: string }
  | { kind: "transient"; name?: string };   // name：恢复 / 领养出来的模型带原名（另存建议名 + 标题）

export interface SessionDeps {
  editor: Editor;
  captureThumbnail: () => { mimeType: string; bytes: Uint8Array } | null;
  onHomeChanged: () => void;
  setStatus: (text: string, error?: boolean) => void;
  online: () => boolean;
}

const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
export const bareName = (full: string): string => full.replace(/^.*\//, "").replace(new RegExp(`\\${DOC_EXT}$`, "i"), "");
export const fullName = (dir: string, bare: string): string => `${dir ? dir + "/" : ""}${bare}${DOC_EXT}`;
export const isDocName = (p: string): boolean => p.toLowerCase().endsWith(DOC_EXT);
const dirOf = (path: string): string => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

/** smart save 钮的状态集（WeebPaint save-status 同形）：none = 没东西可存 · dirty = 内存脏 · local-only = 已存本机/文件、云不可达 ·
 *  saving = 在飞 · cloud-off = 未配置云 · unpushed = 已落本机但云腿没成（终态，非在飞）· synced = 上次保存已同步。 */
export type SaveState = "none" | "dirty" | "local-only" | "saving" | "cloud-off" | "unpushed" | "synced";

export class Session {
  home: DocHome = { kind: "transient" };
  saving = false;
  /** 图库家：上次保存的云腿没成（离线 / 未登录 / 冲突取消 / 落地未确认）——下次显式保存再推。 */
  pushPending = false;
  /** lazyblank（WeebPaint P1.5）：图库家 + 日期名只在内存，文件还没建；首笔有内容 → adoptLazy 翻 false。空白期永不落盘、回执条不写。 */
  lazy = false;
  /** 首存必须 mode:"new"（撞名不静默覆盖）直到第一次真落盘成功；失败后 30 s 自动保存重试仍带 new。 */
  private createPending = false;
  /** lazyblank 安家中（消歧名字）；save / leaveGate 先等它落定，别把字节写到还没定的名字上。 */
  private adopting: Promise<void> | null = null;
  private refreshInFlight = false;
  private savedRevision: number;
  private lastSeenRevision: number;
  private lastEditAt = 0;
  private loaded: CatsupDocument | null = null;   // 打开的文档（含 round-trip 携带的未知内容）；保存时以它为底
  private timer: number;
  /** T-crash 行李牌（file / transient 家才有；gallery 家 = null）+ 上次快照的 revision。 */
  private luggage: LuggageTag | null = null;
  private snapRevision = -1;
  /** 图库当前夹（新建自动安家用；gallery-host 同步）。 */
  currentDir = "";

  constructor(private d: SessionDeps) {
    this.savedRevision = this.lastSeenRevision = d.editor.revision;
    this.mintLuggage();   // 开机的初始 transient 也要有牌（否则开机就画的模型没影子）
    this.timer = window.setInterval(() => this.tick(), 1000);
  }

  // ---------- 只读 ----------
  dirty(): boolean { return this.d.editor.revision !== this.savedRevision; }
  displayName(): string {
    switch (this.home.kind) {
      case "gallery": return bareName(this.home.path);
      case "file": return this.home.fileName.replace(new RegExp(`\\${DOC_EXT}$`, "i"), "");
      case "transient": return this.home.name ?? "新模型";
    }
  }
  /** file / transient 家 且脏（beforeunload 承重层用）。 */
  dirtyLocalHome(): boolean { return this.localHomeKind() !== null && this.dirty(); }
  private localHomeKind(): "file" | "transient" | null { return this.home.kind === "gallery" ? null : this.home.kind; }
  /** lazyblank 且还没动过（boot 登录后重试恢复 / 挂库不塞空白 用）。 */
  isUntouchedLazyBlank(): boolean { return this.lazy && !this.dirty(); }
  private hasContent(): boolean { return this.d.editor.kernel.edges().length > 0; }
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
      case "unpushed": return `「${name}」已保存到本机，云端那份还没推上去——再点一次保存重推`;
      case "synced": return `「${name}」已同步到 OneDrive；再点 = 重新保存并推送`;
    }
  }

  /** 编辑器每次 checkpoint 变化（commit / undo / redo / load）同步进来（main 的 editor.host.changed）：
   *  刷徽章 + **lazyblank 首笔安家**（WeebPaint session-state onChange 钩子同形：真出现内容才绑身份）。 */
  noteChange(): void {
    const rev = this.d.editor.revision;
    if (rev !== this.lastSeenRevision) { this.lastSeenRevision = rev; this.lastEditAt = Date.now(); this.d.onHomeChanged(); }
    if (this.lazy && this.home.kind === "gallery" && this.hasContent()) {
      this.lazy = false;   // 同步翻旗：同一 tick 内第二次 changed 不会重复安家
      this.adopting = this.adoptLazy().catch((e) => reportError(e)).finally(() => { this.adopting = null; this.d.onHomeChanged(); });
    }
  }

  private tick(): void {
    const rev = this.d.editor.revision;
    if (rev !== this.lastSeenRevision) { this.lastSeenRevision = rev; this.lastEditAt = Date.now(); this.d.onHomeChanged(); }
    // T-crash / 自动保存（图库家）：空闲 30 s 且脏且不在手势中 → 落本地（在线且登录则一并推云）
    const idle = !this.saving && !this.d.editor.isGestureActive() && Date.now() - this.lastEditAt >= AUTOSAVE_IDLE_MS;
    if (this.home.kind === "gallery" && !this.lazy && this.dirty() && idle) {
      void this.save({ implicit: true });
    } else if (this.localHomeKind() && this.luggage && this.dirty() && rev !== this.snapRevision && idle) {
      void this.snapshot("crash");   // file / transient 家：盲快照进 crash-store（附加层，best-effort）
    }
  }

  // ---------- T-crash（附加层）----------
  private mintLuggage(): void { this.luggage = mintLuggageTag(); this.snapRevision = this.d.editor.revision; }
  /** 释放行李牌（离开 file / transient 家的每条路都要过这）：正常关闭即删（pending-adoption 由库内拒删）。 */
  private dropLuggage(): void {
    const t = this.luggage; this.luggage = null;
    if (t) crashStore.dropOnCleanClose(t).catch(() => {});   // best-effort：清扫失败顶多多一条陈旧通知
  }
  /** 盲快照：与保存同一 encode 字节，同一张牌覆盖写单帧。state="pending-adoption" = 登录 redirect 前留声（pagehide 不焚）。 */
  async snapshot(state: "crash" | "pending-adoption" = "crash"): Promise<boolean> {
    const kind = this.localHomeKind(); const tag = this.luggage;
    if (!kind || !tag) return false;
    const rev = this.d.editor.revision;
    try {
      const bytes = this.encode();
      if (this.luggage !== tag) return false;   // encode 间隙换了家——别把别的模型写进这张牌
      await crashStore.put(tag, new Blob([bytes], { type: "model/gltf-binary" }), { state, name: this.displayName(), at: Date.now(), homeKind: kind });
      this.snapRevision = rev;
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
    else if (this.luggage && this.dirty() && this.d.editor.revision !== this.snapRevision) void this.snapshot("crash");
  }
  /** 领养崩溃影子 / redirect 流产者：挂了图库 → 新身份进图库（`<名>-恢复`，撞名追加序号）并保存；否则 transient（带名、脏）。
   *  领养出的模型视为 dirty 直到首次真保存（Blockbench #2684/#2003）。gate=false 用于 boot 自动领养（当前是刚开机的空场景）。 */
  async adoptRecovered(bytes: Uint8Array, name: string, opts: { gate: boolean }): Promise<"gallery" | "transient" | null> {
    if (opts.gate && !(await this.leaveGate())) return null;
    const doc = readCatsup(bytes);
    const k = Kernel.fromBrep(doc.root.brep);
    this.dropLuggage();
    this.loaded = doc;
    this.lazy = false;
    this.d.editor.loadKernel(k, "恢复");
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

  private encode(): Uint8Array {
    const brep = this.d.editor.kernel.toBrep();
    const name = this.displayName();
    const doc: CatsupDocument = this.loaded
      ? { ...this.loaded, root: { ...this.loaded.root, name, brep } }
      : newDocument(brep, name);
    const thumb = this.d.captureThumbnail();
    if (thumb) doc.thumbnail = thumb; else delete doc.thumbnail;
    this.loaded = doc;
    return writeCatsup(doc);
  }
  private adopt(bytes: Uint8Array): void {
    const doc = readCatsup(bytes);
    const k = Kernel.fromBrep(doc.root.brep);
    this.pushPending = false;
    this.lazy = false; this.createPending = false;
    this.loaded = doc;
    this.d.editor.loadKernel(k);
    this.d.editor.zoomExtents();
    this.savedRevision = this.lastSeenRevision = this.d.editor.revision;
  }
  /** 家的唯一写点（= WeebPaint _setActive）：行李牌 / store activeFileName / **回执条**（@internal/gallery resume-slate）都从这收口。
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
  /** 撞名消歧：`base`、`base-1`、`base-2`…（store nameOccupied 本机 ∪ 云端）。 */
  private async freeName(dir: string, base: string): Promise<string> {
    const files = requireStore().files;
    let path = fullName(dir, base);
    for (let n = 1; n < 100 && (await files.nameOccupied(path)); n++) path = fullName(dir, `${base}-${n}`);
    return path;
  }

  // ---------- 生命周期 ----------
  /** lazyblank 新场景（WeebPaint beginLazyBlank）：空内核 + 图库家日期名只在内存；不建文件、不写回执条；首笔有内容 → noteChange 安家。
   *  boot 的「可画新场景」落点（首次 / 恢复失败 / 崩溃断路）+ 挂库时的「新建」。 */
  beginLazyBlank(): void {
    this.loaded = null;
    this.pushPending = false; this.createPending = false;
    this.lazy = false;   // loadKernel 会同步 changed → noteChange；此刻别当首笔
    this.d.editor.loadKernel(new Kernel(), "新建");
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
    try { handles = await fsa.showOpenFilePicker!({ types: GLB_PICKER_TYPES, multiple: false }); } catch { return false; }   // 用户取消
    const h = handles[0]; if (!h) return false;
    const file = await h.getFile();
    return this.openLocalBytes(new Uint8Array(await file.arrayBuffer()), file.name, h);
  }

  /** 保存 = 送回家。transient 显式保存 = 安家仪式（FSA 另存 / 下载兜底）；implicit（自动 / 离开）在 transient 上是 noop。
   *  localOnly：崩溃安全 flush 用，只落本地不推（push-pending 留着）。 */
  async save(opts: { implicit?: boolean; localOnly?: boolean } = {}): Promise<boolean> {
    if (this.adopting) await this.adopting;   // lazyblank 名字还没落定：等它（不含字节落盘，不会自等）
    if (this.saving) return false;
    const home = this.home;
    if (home.kind === "transient") return opts.implicit ? false : this.settleToFile();
    if (home.kind === "gallery" && this.lazy) { if (!opts.implicit) this.d.setStatus("空白场景，还没有需要保存的内容"); return false; }   // WeebPaint blankNothingToSave
    this.saving = true; this.d.onHomeChanged();
    try {
      const revAtStart = this.d.editor.revision;
      const bytes = this.encode();
      if (home.kind === "file") {
        if (home.handle) {
          const w = await home.handle.createWritable();
          await w.write(new Blob([bytes], { type: "model/gltf-binary" })); await w.close();
          this.savedRevision = revAtStart;
          if (this.luggage) { crashStore.dropOnCleanClose(this.luggage).catch(() => {}); this.snapRevision = revAtStart; }   // 旧快照作废：磁盘已是最新（牌留着）
          if (!opts.implicit) this.d.setStatus(`已保存 ${home.fileName}`);
          return true;
        }
        if (opts.implicit) return false;
        this.download(bytes, home.fileName);   // 下载开始 = 责任移交；没回家，dirty 如实留着
        this.d.setStatus(`已下载 ${home.fileName}（浏览器不支持原地写回，dirty 保留）`);
        return false;
      }
      // 图库家
      const r = await docFile(home.path, this.createPending ? "new" : "existing").save(bytes, { tryPush: !opts.localOnly && auth.isSignedIn() && online() });
      if (r.resolution === "takeCloud") {   // 用户选了云端版本：整份重载（否则下次保存又覆盖云端）
        this.d.setStatus("已改用云端版本");
        const blob = await docFile(home.path).open();
        if (blob) { this.adopt(new Uint8Array(await blob.arrayBuffer())); }
        return true;
      }
      this.createPending = false;
      this.savedRevision = revAtStart;
      this.pushPending = !r.pushed;
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
      try { h = await fsa.showSaveFilePicker!({ suggestedName: suggested, types: GLB_PICKER_TYPES }); } catch { return false; }
      this.lazy = false;
      this.setHome({ kind: "file", handle: h, fileName: h.name });
      return this.save();
    }
    const bytes = this.encode();
    this.download(bytes, suggested);
    this.d.setStatus(`已下载 ${suggested}（本浏览器无法原地写回；模型仍未安家）`);
    return false;
  }
  /** 导出一份（永不清 dirty）。 */
  exportDownload(): void {
    const bytes = this.encode();
    this.download(bytes, `${this.displayName()}${DOC_EXT}`);
    this.d.setStatus(`已导出 ${this.displayName()}${DOC_EXT}`);
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
    const target = fullName(dirOf(cur), bare.trim());
    if (target === cur) return cur;
    if (this.lazy) { this.setHome({ kind: "gallery", path: target }); return target; }   // 文件还没建：只换内存里的计划名
    const r = await docFile(cur).tryMove(target);
    if (!r.ok) { this.d.setStatus(`改名失败：${(r as { where?: string }).where === "cloud" ? "云端" : "本机"}已有同名`, true); return null; }
    this.setHome({ kind: "gallery", path: target });
    return target;
  }
  /** 图库把活动文档改名/移动了（onRenamed / 图库动词）→ 换身份。 */
  setActivePath(path: string): void { if (this.home.kind === "gallery") this.setHome({ kind: "gallery", path }); }
  async pushDoc(path: string): Promise<void> {
    const f = docFile(path); const blob = await f.open(); if (!blob) return;
    await f.save(blob, { tryPush: true });
  }
  async offloadDoc(path: string): Promise<void> { await docFile(path).offload(); }
  /** 去图库前：图库家的脏文档落本地（WeebPaint：退出自动 ctrl+s）。 */
  async flushLocal(): Promise<void> { if (this.adopting) await this.adopting; if (this.home.kind === "gallery" && !this.lazy && this.dirty()) await this.save({ implicit: true }); }

  /** 挂图库的用户手势时刻（首次开图库 / 登录 / 首存）：persist 表态落点。 */
  static persistOnGesture(): void { void requestStoragePersistence(); }
}
