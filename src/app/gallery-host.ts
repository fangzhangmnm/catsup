// gallery-host.ts —— @internal/gallery 0.8.7 的 CatsUp 消费面（JRB gallery-host.ts 同形）。包出屏幕 + 动词 + 数据面；本文件只出：
//   Vue 注入（递**整个模块** = 用构建时编好的模板、运行时零 eval，0.8.4；Teleport 也在里面 = 0.6.2 卡片 ⋯ 菜单出卡片进菜单 band）、
//   DocHost（编辑器端口 → session）、policy（无图片；缩略图 = .glb 字节头 peek，种类 "glb"）、记忆（当前夹走 device-kv）、名册库名（0.8.7 起归宿主）。
//   哪些是文档、主干怎么切、显示名去 .glb、改名只编辑主干——全由 store 的种类表说（gallery 0.6.0 起吃 store.identifiers；宿主不再给 naming / isDoc / isZipDoc / hasThumb）。
//   卡片上的「推送到云端」0.8.1 起不存在：没同步好的行只有「处理…」→ store file.resolve()，由人在库弹的面里三选一（user 2026-10-16「禁止越狱」）。
//   回收站 + 备份箱 = 搁置区（0.5.0；`GalleryView = files | trash | backup`），清空钮包自带（0.8.6），宿主只切视图。
//   缩略缓存 = 包的 idbThumbStore（独立 IDB `THUMB_DB_NAME`，key = 文件身份（0.8.7 起全名；0.4.0 是裸名 → 旧条目成孤儿，首开各缺一次、可再生）、token = 时间/大小，
//   全删可再生；user 2026-09-20 批）；封面取字节 = store `getHead` 分步拉（本机 slice / 纯云端 byte-range 不整份下载）。
//   created 2026-09-20 by Claude Fable 5.1 · 2026-10-25 收 gallery 0.8.7 重写（Claude Fable 5.1；逐版差异 = ai-docs/20261025-store-2.2.0-gallery-0.8.7-migration.md §3）
import * as Vue from "../../vendor/vue/vue.esm-browser.prod.js";
import { createGallery, configureGalleryRegistry, type CreateGalleryDeps, type GalleryDocHost, type VueRuntime, type GItem, type VerbStore, type DataFaceStore, type Gallery, type GalleryView } from "@internal/gallery";
import { iconHtml } from "@internal/workbench-elements";
import { ensureStore, auth, docFile } from "../app-store.ts";
import { GALLERY_REGISTRY_DB, HEAD_PEEK_BYTES, THUMB_DB_NAME } from "../config.ts";
import { extractThumbnail, headBytesNeeded } from "../format/peek.ts";
import { openConfirmSheet, openInputSheet, openChoiceSheet, withBusy } from "./ui/sheets.ts";
import { deviceKvGet, deviceKvSet } from "./device-kv.ts";
import { reportError } from "./error-funnel.ts";
import { openDebugLogSheet } from "./debug-log-sheet.ts";

export interface GalleryHostDeps {
  mountEl: HTMLElement;
  fullEl: HTMLElement;
  /** 正在编辑的那个模型（身份 = 全路径 `夹/名.glb`）；没有图库家 = null。 */
  activeName: () => string | null;
  /** 打开一个模型（身份）。true = 编辑器已切过去。 */
  openDoc: (identifier: string) => Promise<boolean>;
  /** 顶栏改名（编辑器自己的改名 UI）；返回新身份。 */
  renameActive: () => Promise<string | null>;
  /** 正在编辑的模型被图库移动 / 改名 → 编辑器换身份。 */
  setActiveName: (identifier: string) => void;
  offloadDoc: (identifier: string) => Promise<void>;
  flushLocal: () => Promise<void>;
  setStatus: (text: string, error?: boolean) => void;
  onFolderChanged: (dir: string) => void;
  onOpened?: () => void;
  onClosed?: () => void;
}
const KV_FOLDER = "gallery-folder";
// （v0.5.7：last-scene 键退役——「上次停在图库」归 @internal/gallery 回执条，写点在 session.slateGalleryOpened/Closed。）
/** 包内 zh 文案是 WeebPaint 口吻（「画一笔」「作品」）；这几条换成模型的说法，其余照包。 */
const GALLERY_TEXT: Record<string, string> = {
  "gal.empty.none": "还没有保存的模型。点右上角「新建」，画第一笔就会自动存进图库。",
};

// gallery 0.8.7：图库包这台设备的记事本（多库登记）库名归宿主——不配会写进包里写死的 WeebPaint GUID 名下（0.4.0 就是那个字面量）。
//   CatsUp 单库、从没开过那个库（只用回执条 + 懒建 store），换成自己前缀的名字零迁移。第一次开库之前配一次（import 期即可，包是懒开库）。
configureGalleryRegistry({ dbName: GALLERY_REGISTRY_DB });

export function initGalleryHost(d: GalleryHostDeps) {
  const vue = Vue as unknown as VueRuntime;
  const storeFace = (): (VerbStore & DataFaceStore) | null => {
    try { return ensureStore() as unknown as VerbStore & DataFaceStore; } catch { return null; }
  };
  const doc: GalleryDocHost = {
    open: async (item: GItem) => { const ok = await d.openDoc(item.identifier); if (ok) close(); },
    renameActive: () => d.renameActive(),
    setIdentifier: (identifier) => d.setActiveName(identifier),
    // gallery >= 0.8.1 不再调 push（「推送到云端」退出词汇表；没同步好的行走 verbs.resolve → store file.resolve()）。VerbDoc 仍要这个成员；真被调到就响亮抛，不静默。
    push: async (item: GItem) => { throw new Error(`[gallery] push(${item.identifier}) is not a sync verb (vocabulary = resolve / three-way sheet); gallery >= 0.8.1 must not call it`); },
    unload: async (item: GItem) => { await d.offloadDoc(item.identifier); },
    exit: async () => { await d.flushLocal(); },
    dropCheckpoint: () => {},
  };
  const deps: CreateGalleryDeps = {
    vue,
    store: storeFace,
    doc,
    host: {
      signedIn: () => auth.isSignedIn(),
      online: () => (typeof navigator === "undefined" || navigator.onLine !== false),
      activeIdentifier: () => d.activeName(),
      confirm: (title, msg) => openConfirmSheet(title, msg),
      input: (title, def, opts) => openInputSheet(title, { defaultValue: def, placeholder: opts?.placeholder }),
      chooseFolder: (title, msg, options) => openChoiceSheet<string>(title, msg, options.map((o) => ({ label: o.label, value: o.value }))),
      status: (msg, isError) => d.setStatus(msg, !!isError),
      busy: (label, fn) => withBusy(label, fn),
    },
    ui: { iconHtml: (name, opts) => iconHtml(name, opts), tilePlaceholderHtml: () => iconHtml("object" as never) },
    policy: {
      isImage: () => false,
      // 缩略图 = .glb 字节头里的 asset.thumbnail（契约 §3：BIN 首段）。store getHead：本机 slice / 纯云端 byte-range，
      //   先 64 KB，头片不够（JSON 大 / 缩略图靠后）按 headBytesNeeded 补拉，最多三步。契约：null = 确定没有（缓存）；抛 = 未知（不缓存）。
      thumbs: {
        kinds: ["glb"],
        fetch: async (identifier, source) => {
          const f = docFile(identifier);
          let want = HEAD_PEEK_BYTES;
          for (let step = 0; step < 3; step++) {
            const blob = await f.getHead({ bytesLength: want, source });   // 云端不可达 → 库抛 → 未知
            if (!blob) throw new Error("head peek unavailable (no local copy and cloud unreachable / encrypted)");
            const head = new Uint8Array(await blob.arrayBuffer());
            const need = headBytesNeeded(head);
            if (need === null || need <= head.length) { const t = extractThumbnail(head); return t ? new Blob([t.bytes], { type: t.mimeType }) : null; }
            if (head.length < want) return null;   // 文件比要的还短却还不够 = 截断 / 损坏 → 确定没有
            want = need;
          }
          return null;
        },
        dbName: THUMB_DB_NAME,
        galleryId: () => "default",
      },
    },
    tile: { aspect: 1, layout: "cards" },
    folderMemory: { get: () => deviceKvGet(KV_FOLDER) ?? "", set: (p) => { deviceKvSet(KV_FOLDER, p || null); d.onFolderChanged(p || ""); } },
    isGalleryVisible: () => document.body.dataset.mode === "gallery",
    reportError: (e, level) => reportError(e, level ?? "error"),
    reloadApp: () => location.reload(),
    openDiag: () => openDebugLogSheet(),   // 图库卡住态的「打开诊断」钮 → 同一个黑匣子 sheet（WeebPaint 09-06 同款入口）
    text: { lang: "zh" as never, t: (key) => GALLERY_TEXT[key] },
    deviceKv: { get: deviceKvGet, set: deviceKvSet },
  };
  let gallery: Gallery | null = null;
  function ensureMounted(): Gallery { if (!gallery) gallery = createGallery(d.mountEl, deps); return gallery; }
  async function open(): Promise<void> {
    ensureStore();
    await d.flushLocal();
    const g = ensureMounted();
    document.body.dataset.mode = "gallery";
    d.fullEl.hidden = false; d.fullEl.setAttribute("aria-hidden", "false");
    const dir = deviceKvGet(KV_FOLDER) ?? "";
    if (dir !== g.handle.getFolder()) g.handle.setFolder(dir);
    g.handle.setView("files");
    d.onFolderChanged(g.handle.getFolder());
    d.onOpened?.();
  }
  function close(): void {
    if (d.fullEl.hidden) return;   // 幂等：boot 落点 / 恢复路径可能重复关
    d.fullEl.hidden = true; d.fullEl.setAttribute("aria-hidden", "true");
    delete document.body.dataset.mode;
    d.onClosed?.();
  }
  const isOpen = () => !d.fullEl.hidden;
  return {
    open, close, isOpen,
    refresh: () => gallery?.handle.refresh(),
    /** files / trash / backup（搁置区两箱；清空钮在包的视图里）。 */
    setView: (v: GalleryView) => ensureMounted().handle.setView(v),
    getView: (): GalleryView => gallery?.handle.getView() ?? "files",
    currentFolder: () => gallery?.handle.getFolder() ?? (deviceKvGet(KV_FOLDER) ?? ""),
    invalidateThumb: (identifier: string) => { void gallery?.thumbs?.invalidate(identifier); },
    /** dev 诊断（冒烟用）：缩略缓存统计。 */
    thumbStats: () => gallery?.thumbs?.stats ?? null,
  };
}
export type GalleryHost = ReturnType<typeof initGalleryHost>;
