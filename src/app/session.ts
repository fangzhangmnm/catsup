// session.ts —— 文档生命周期（WeebPaint 无地骑士标准，verdicts §1）：
//   「每个模型任一时刻恰好有一个家：图库、或磁盘上的一个文件、或还没有家（transient）。保存 = 送回家，只有回了家才清 dirty；导出永不清 dirty。」
//   两个模式：Gallery+Editor（挂了 store：新模型自动安家进图库、退出自动保存）/ Editor Only（无 store：transient，Ctrl+S = 安家 = FSA 另存 / 下载兜底）。
//   store 的写路径（.save / .tryMove）只在本文件（守卫测试执法）。T-crash：图库家 = 30 s 空闲自动保存到 store 本地（即崩溃影子）；
//   transient / 文件家的崩溃影子需要自己的 IDB —— 等 user 批准后再加（总账 A18 ②）。created 2026-09-20 by Claude Fable 5.1
import type { Editor } from "../editor/editor.ts";
import { Kernel } from "../kernel/kernel.ts";
import { newDocument, readCatsup, writeCatsup, type CatsupDocument } from "../format/index.ts";
import { AUTOSAVE_IDLE_MS, DOC_EXT, defaultDocName } from "../config.ts";
import { auth, docFile, hasStore, requireStore, requestStoragePersistence, setActiveDocName } from "../app-store.ts";
import { openChoiceSheet, openInputSheet } from "./ui/sheets.ts";
import { reportError } from "./error-funnel.ts";

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
  | { kind: "transient" };

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

export class Session {
  home: DocHome = { kind: "transient" };
  saving = false;
  private savedRevision: number;
  private lastSeenRevision: number;
  private lastEditAt = 0;
  private loaded: CatsupDocument | null = null;   // 打开的文档（含 round-trip 携带的未知内容）；保存时以它为底
  private timer: number;
  /** 图库当前夹（新建自动安家用；gallery-host 同步）。 */
  currentDir = "";

  constructor(private d: SessionDeps) {
    this.savedRevision = this.lastSeenRevision = d.editor.revision;
    this.timer = window.setInterval(() => this.tick(), 1000);
  }

  // ---------- 只读 ----------
  dirty(): boolean { return this.d.editor.revision !== this.savedRevision; }
  displayName(): string {
    switch (this.home.kind) {
      case "gallery": return bareName(this.home.path);
      case "file": return this.home.fileName.replace(new RegExp(`\\${DOC_EXT}$`, "i"), "");
      case "transient": return "新模型";
    }
  }
  /** 「这模型住哪」徽章的状态词。 */
  homeState(): "transient" | "transient-dirty" | "file" | "file-dirty" | "gallery" | "gallery-dirty" | "saving" {
    if (this.saving) return "saving";
    const dirty = this.dirty();
    if (this.home.kind === "transient") return dirty ? "transient-dirty" : "transient";
    if (this.home.kind === "file") return dirty ? "file-dirty" : "file";
    return dirty ? "gallery-dirty" : "gallery";
  }

  private tick(): void {
    const rev = this.d.editor.revision;
    if (rev !== this.lastSeenRevision) { this.lastSeenRevision = rev; this.lastEditAt = Date.now(); this.d.onHomeChanged(); }
    // T-crash / 自动保存（图库家）：空闲 30 s 且脏且不在手势中 → 落本地（在线且登录则一并推云）
    if (this.home.kind === "gallery" && this.dirty() && !this.saving && !this.d.editor.isGestureActive() && Date.now() - this.lastEditAt >= AUTOSAVE_IDLE_MS) {
      void this.save({ implicit: true });
    }
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
    this.loaded = doc;
    this.d.editor.loadKernel(k);
    this.d.editor.zoomExtents();
    this.savedRevision = this.lastSeenRevision = this.d.editor.revision;
  }
  private setHome(h: DocHome): void {
    this.home = h;
    setActiveDocName(h.kind === "gallery" ? h.path : null);
    this.d.onHomeChanged();
  }

  // ---------- 生命周期 ----------
  /** 新建：脏则挽留；挂了图库 → 自动安家（默认名 yyyymmdd-hex4，撞名追加序号），否则 transient。 */
  async newDoc(): Promise<boolean> {
    if (!(await this.leaveGate())) return false;
    this.loaded = null;
    this.d.editor.loadKernel(new Kernel(), "新建");
    this.savedRevision = this.lastSeenRevision = this.d.editor.revision;
    if (hasStore()) {
      const files = requireStore().files;
      let path = fullName(this.currentDir, defaultDocName());
      for (let n = 1; n < 100 && (await files.nameOccupied(path)); n++) path = fullName(this.currentDir, `${defaultDocName()}-${n}`);
      this.setHome({ kind: "gallery", path });
      await this.save({ implicit: true, createNew: true });
    } else {
      this.setHome({ kind: "transient" });
    }
    return true;
  }
  /** 从图库打开（本地优先；没本地且离线 → 诚实报）。 */
  async openFromGallery(path: string): Promise<boolean> {
    if (!(await this.leaveGate())) return false;
    try {
      const blob = await docFile(path).open();
      if (!blob) { this.d.setStatus(`「${bareName(path)}」本机没有副本，云端也连不上`, true); return false; }
      this.adopt(new Uint8Array(await blob.arrayBuffer()));
      this.setHome({ kind: "gallery", path });
      this.d.setStatus(`已打开 ${bareName(path)}`);
      return true;
    } catch (e) { reportError(e); return false; }
  }
  /** 打开本地文件字节（拖入 / 文件输入 / FSA 句柄）。 */
  async openLocalBytes(bytes: Uint8Array, fileName: string, handle: FSHandle | null): Promise<boolean> {
    if (!(await this.leaveGate())) return false;
    try {
      this.adopt(bytes);
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

  /** 保存 = 送回家。transient 显式保存 = 安家仪式（FSA 另存 / 下载兜底）；implicit（自动 / 离开）在 transient 上是 noop。 */
  async save(opts: { implicit?: boolean; createNew?: boolean } = {}): Promise<boolean> {
    if (this.saving) return false;
    const home = this.home;
    if (home.kind === "transient") return opts.implicit ? false : this.settleToFile();
    this.saving = true; this.d.onHomeChanged();
    try {
      const revAtStart = this.d.editor.revision;
      const bytes = this.encode();
      if (home.kind === "file") {
        if (home.handle) {
          const w = await home.handle.createWritable();
          await w.write(new Blob([bytes], { type: "model/gltf-binary" })); await w.close();
          this.savedRevision = revAtStart;
          if (!opts.implicit) this.d.setStatus(`已保存 ${home.fileName}`);
          return true;
        }
        if (opts.implicit) return false;
        this.download(bytes, home.fileName);   // 下载开始 = 责任移交；没回家，dirty 如实留着
        this.d.setStatus(`已下载 ${home.fileName}（浏览器不支持原地写回，dirty 保留）`);
        return false;
      }
      // 图库家
      const r = await docFile(home.path, opts.createNew ? "new" : "existing").save(bytes, { tryPush: auth.isSignedIn() && online() });
      if (r.resolution === "takeCloud") {   // 用户选了云端版本：整份重载（否则下次保存又覆盖云端）
        this.d.setStatus("已改用云端版本");
        const blob = await docFile(home.path).open();
        if (blob) { this.adopt(new Uint8Array(await blob.arrayBuffer())); }
        return true;
      }
      this.savedRevision = revAtStart;
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
    if (!this.dirty()) return true;
    if (this.home.kind === "gallery") return this.save({ implicit: true });
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
    const dir = cur.includes("/") ? cur.slice(0, cur.lastIndexOf("/")) : "";
    const target = fullName(dir, bare.trim());
    if (target === cur) return cur;
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
  async flushLocal(): Promise<void> { if (this.home.kind === "gallery" && this.dirty()) await this.save({ implicit: true }); }

  /** 挂图库的用户手势时刻（首次开图库 / 登录 / 首存）：persist 表态落点。 */
  static persistOnGesture(): void { void requestStoragePersistence(); }
}
