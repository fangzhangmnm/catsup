// gallery-host.ts —— @internal/gallery 0.4.0 的 CatsUp 消费面（JRB gallery-host.ts 同形）。包出屏幕 + 动词 + 数据面；
//   本文件只出：Vue 注入、DocHost（编辑器端口 → session）、policy（只认 .glb、身份 = 全名、显示去扩展名、缩略图 = 字节头 peek）、
//   记忆（当前夹 / 上次场景走 device-kv）。缩略缓存 = 内存（IDB 缓存开建等 user 批）。created 2026-09-20 by Claude Fable 5.1
import { createApp, defineComponent, reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } from "../../vendor/vue/vue.esm-browser.prod.js";
import { createGallery, memoryThumbStore, type CreateGalleryDeps, type GalleryDocHost, type VueRuntime, type GItem, type VerbStore, type DataFaceStore, type Gallery } from "@internal/gallery";
import { iconHtml } from "@internal/workbench-elements";
import { ensureStore, auth, docFile } from "../app-store.ts";
import { HIDDEN_NAME_RE } from "../config.ts";
import { bareName, fullName, isDocName } from "./session.ts";
import { extractThumbnail } from "../format/peek.ts";
import { openConfirmSheet, openInputSheet, openChoiceSheet, withBusy } from "./ui/sheets.ts";
import { deviceKvGet, deviceKvSet } from "./device-kv.ts";
import { reportError } from "./error-funnel.ts";

export interface GalleryHostDeps {
  mountEl: HTMLElement;
  fullEl: HTMLElement;
  activeName: () => string | null;
  openDoc: (fullName: string) => Promise<boolean>;
  renameActive: () => Promise<string | null>;
  setActiveName: (fullName: string) => void;
  pushDoc: (fullName: string) => Promise<void>;
  offloadDoc: (fullName: string) => Promise<void>;
  flushLocal: () => Promise<void>;
  setStatus: (text: string, error?: boolean) => void;
  onFolderChanged: (dir: string) => void;
  onOpened?: () => void;
  onClosed?: () => void;
}
const KV_FOLDER = "gallery-folder";
const KV_SCENE = "last-scene";
const NAMING = { bare: (full: string) => full.replace(/\.glb$/i, ""), full: (bare: string) => `${bare}.glb`, display: (n: string) => bareName(n) };
const isDoc = (p: string): boolean => isDocName(p) && !HIDDEN_NAME_RE.test(p);

export function initGalleryHost(d: GalleryHostDeps) {
  const vue = { createApp, defineComponent, reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } as unknown as VueRuntime;
  const storeFace = (): (VerbStore & DataFaceStore) | null => {
    try { return ensureStore() as unknown as VerbStore & DataFaceStore; } catch { return null; }
  };
  const doc: GalleryDocHost = {
    open: async (item: GItem) => { const ok = await d.openDoc(NAMING.full(item.name)); if (ok) close(); },
    renameActive: async () => { const n = await d.renameActive(); return n ? NAMING.bare(n) : null; },
    setName: (name) => d.setActiveName(NAMING.full(name)),
    push: async (item) => { await d.pushDoc(NAMING.full(item.name)); },
    unload: async (item) => { await d.offloadDoc(NAMING.full(item.name)); },
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
      activeName: () => { const n = d.activeName(); return n ? NAMING.bare(n) : null; },
      confirm: (title, msg) => openConfirmSheet(title, msg),
      input: (title, def, opts) => openInputSheet(title, { defaultValue: def, placeholder: opts?.placeholder }),
      chooseFolder: (title, msg, options) => openChoiceSheet<string>(title, msg, options.map((o) => ({ label: o.label, value: o.value }))),
      status: (msg, isError) => d.setStatus(msg, !!isError),
      busy: (label, fn) => withBusy(label, fn),
    },
    ui: { iconHtml: (name, opts) => iconHtml(name, opts), tilePlaceholderHtml: () => iconHtml("object" as never) },
    naming: NAMING,
    isZipDoc: () => false,
    hasThumb: (n) => isDoc(n) || isDoc(NAMING.full(n)),   // 包在 tile 里传的是裸名（GItem.name），policy 处传全名——两边都认
    policy: {
      isDoc, isImage: () => false, naming: NAMING,
      // 缩略图 = .glb 字节头里的 asset.thumbnail（契约 §3：BIN 首段）。本机有副本才取；纯云端的等 store 头片 peek（escalate 中）。
      thumbs: {
        fetch: async (name, source) => {
          if (source !== "local") return null;
          const blob = await docFile(NAMING.full(name)).open();
          if (!blob) return null;
          const t = extractThumbnail(new Uint8Array(await blob.arrayBuffer()));
          return t ? new Blob([t.bytes], { type: t.mimeType }) : null;
        },
        store: memoryThumbStore(),
        galleryId: () => "default",
        has: (n) => isDoc(n) || isDoc(NAMING.full(n)),
      },
    },
    tile: { aspect: "1/1", layout: "cards" },
    folderMemory: { get: () => deviceKvGet(KV_FOLDER) ?? "", set: (p) => { deviceKvSet(KV_FOLDER, p || null); d.onFolderChanged(p || ""); } },
    isGalleryVisible: () => document.body.dataset.mode === "gallery",
    reportError: (e, level) => reportError(e, level ?? "error"),
    reloadApp: () => location.reload(),
    text: { lang: "zh" as never },
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
    deviceKvSet(KV_SCENE, "gallery");
    d.onFolderChanged(g.handle.getFolder());
    d.onOpened?.();
  }
  function close(): void {
    d.fullEl.hidden = true; d.fullEl.setAttribute("aria-hidden", "true");
    delete document.body.dataset.mode;
    deviceKvSet(KV_SCENE, null);
    d.onClosed?.();
  }
  const isOpen = () => !d.fullEl.hidden;
  return {
    open, close, isOpen,
    wasInGallery: () => deviceKvGet(KV_SCENE) === "gallery",
    refresh: () => gallery?.handle.refresh(),
    setView: (v: "files" | "trash") => ensureMounted().handle.setView(v),
    getView: () => gallery?.handle.getView() ?? "files",
    emptyTrash: (scope: "local" | "cloud" | "both") => ensureMounted().handle.emptyTrash(scope),
    currentFolder: () => gallery?.handle.getFolder() ?? (deviceKvGet(KV_FOLDER) ?? ""),
    invalidateThumb: (full: string) => { void gallery?.thumbs?.invalidate(NAMING.bare(full)); },
    /** dev 诊断（冒烟用）：缩略缓存统计。 */
    thumbStats: () => gallery?.thumbs?.stats ?? null,
  };
}
export type GalleryHost = ReturnType<typeof initGalleryHost>;
