// app-store.ts —— @internal/store 的**唯一** value-level import（单一接缝；守卫 test/redline-guard.test.mjs + build.sh lint）。
// 只做 config 注入（provider / ui bundle / encryption / validateAdopt / 文档种类表）+ auth 转发 + 文件句柄工厂。created 2026-09-20 by Claude Fable 5.1
// 2026-10-25 迁库 store 0.15.2 → 2.2.0（Claude Fable 5.1；家族周账 F-76 / 总账票 1）：逐版行为差异与开关决定 = ai-docs/20261025-store-2.2.0-gallery-0.8.7-migration.md。
//
// 表态（pwa-cloud-store skill §2，每条都是决定不是占位）：
//   provider   OneDrive personal only（authority /consumers，硬规则 #7）+ AppFolder（硬规则 #6）；CLIENT_ID 空 = 未配置纯无地。
//              transport 三个显式开关（store 0.17.1 / 0.17.2，库默认全关）这里开——理由见 GRAPH_TRANSPORT 注释。
//   docKinds   两行同一个 kind：`.catsup`（2026-10-28 起新文档）+ 老的 `.glb`（store 0.16 文档种类表，必填）。身份从 0.5.0 起就是全名 `夹/名.glb`（session.fullName），
//              云端名 = 身份、不加密 → 和 0.15.2 一个字节不变，存量零迁移。切身份的唯一库入口 = store.identifiers；app 内部的裸名 ↔ 全名仍在 session 边界转（bareName / fullName）。
//   persistence "app-managed"：挂上图库 / 首次保存的用户手势里调 requestStoragePersistence()。
//   encryption  真 codec（2026-10-29 周账 F-123：zip.js 外壳 + 7z-wasm payload，WeebPaint 同款）；口令经 crypt.getPassword 非交互取（crypto-state.ts）。
//              图库口令验证器住 collection "app-state" 的 galleryPasswordVerifier（跟账号走；password-verifier.ts）。 reconcilePolicy "app-driven"：focus / online / 前台 60 s 轮询由 app 驱动。
//   validateAdopt 只看字节头：GLB magic + extensionsUsed 含 CATSUP_document（挡 captive-portal HTML / 外来 glb）。
//   autoCacheOpenedFile true（编辑器：开即留本地）。readOnlyFiles false。offlineUploadReplay "manual"（理由见下）。
//   signedIn = auth（0.14.0：云腿闸 = isOnline ∧ signedIn）。isOnline = cloudOnline（2026-11-03 工单 C：浏览器有网 ∧ 用户没选「离线继续」）。activeIdentifier = 当前打开的文档（cloud-gone 收敛不碰它；0.16 起叫这个名）。
//   hidden = 写入方半成品（夹里有什么是 store 的事，不是图库的；0.16 起叫这个名）。
//   openLineageFromDurable 库默认开（0.18.0）：open 时云端核对没跑成（未登录 / 离线）∧ 本地干净 ∧ 磁盘有上次同步的 etag → 记为本 tab 基准。
//              这正是 10-21 道 2 核出的根因「先开上次模型、后登录 → 第一次保存没 If-Match → 409 → 假『保存撞上云端新版本』面」的修法（配 0.16.2 refresh 重捕基准）。别关。
//   uploads.resumable 开（store 2.1.4 F-54；user 10-25「weebpaint开了。那么我们也开吧。以后有了贴图我们也会变得很胖的」）：> 4 MB 的分块上传会话落 kv，刷新 / iOS 杀页后再推同一份字节接着传——见 createStore 里的注释。
//   不传（= 库默认）：streaming（没有流式读）、docKinds[].tier（只有一等作品）、pushRetry（4 次 × 200·n ms）。
// 无地模式（WeebPaint 标准）：**不挂图库时 createStore 完全不被调用**（零 IDB/localStorage 副作用，file:// 也能跑）；
//   store 在首次开图库 / 登录时懒建（ensureStore），之后常驻。
// 开机顺序契约（v0.5.7，ai-docs/20260922-lifecycle-alignment-with-weebpaint.md §1.3 / §3.3）：**boot 的本地恢复必须在 initAuth 之前发起并等完**。
//   库 0.14 起「在线 = 有网 ∧ signedIn()」，`open()` 在线时先等一次云端 etag 往返；未登录 → 直接读本地零网络。谁把 initAuth 排到恢复前面，
//   谁就把「开机秒开」变回「开机等一次 Graph」。登录落地后的新鲜度由 session.refreshOpenDoc（pullIfClean，trustHints:false）后台补。
import { createStore, createOneDriveProvider, createFolderProvider, requestStoragePersistence, isCached, isDirty, scanAppNamespace, DEFAULT_GRAPH_TIMEOUTS } from "@internal/store";
import type { Store, RawFile, DocKind, GraphTransportOptions, Collection } from "@internal/store";
import { APP_ID, AUTHORITY, CLIENT_ID, DOC_EXT, HIDDEN_NAME_RE, LEGACY_DOC_EXT, MSAL_URL, SCOPES } from "./config.ts";
import { storeUI } from "./store-ui.ts";
import { appEncryption } from "./encryption.ts";
import { getPassword } from "./crypto-state.ts";   // 口令接缝：store 非交互取（解锁循环在 app/unlock.ts，busy 外）
import { isVerifierRecord, wireVerifierStore } from "./password-verifier.ts";
import { isCatsupDocumentHead } from "./format/peek.ts";
import { cloudOnline } from "./app/user-offline.ts";   // 工单 C：「离线继续」= 库在离线态一条网都不打（设计稿 §3）
import { NotLandedError, type HomeMovePorts, type VerifiedWritePorts, type VerifierCarryPorts } from "./app/home-move.ts";   // 搬家 / 放回图库的写口住接缝（纯逻辑在 home-move.ts）

/** 文档种类表（store 0.16）：同一种文档两种拼法（库：「几行可以是同一个 kind」）——.catsup（2026-10-28 起新文档都写它，账本 UX39）+ 老的 .glb 工程（永远照开、不改名）。
 *  kind 标签沿用 "glb"（缩略图 kinds / 名册都认这个词，换标签没好处）。裸文件不是 zip。图库包据它认文档 / 切主干 / 改名只编辑主干（后缀保留）。 */
export const DOC_KINDS: readonly DocKind[] = [{ kind: "glb", suffix: DOC_EXT, container: "raw" }, { kind: "glb", suffix: LEGACY_DOC_EXT, container: "raw" }];

// Graph 传输层三个显式开关（store 0.17.2 默认全关 = 行为变更默认关、消费方显式开；WeebPaint v0.14.39 user 10-21「没问题」开了同三个；CatsUp 的取舍 = 迁库 doc §4）：
//   timeouts：每个 Graph 请求带超时（meta 30 s / 一块 120 s / byte-range 60 s / 整文件 15 min）。iPad 锁屏后在途 fetch 常常永远挂着；
//     session.save() 把 `saving = true` 然后 await store.save()（推云内联在里面）→ 推挂死 = saving 永远 true → tick() 的 30 s 自动保存全部跳过、
//     编辑只在内存里直到 reload。这碰的是数据安全模型第 2 条（没传上去的改动不能丢），§3 A3。到点 → CloudNetworkError = 和断网同一类：
//     save 返 pushed:false、文件留脏（pushPending）、下次保存补推。
//   chunkResume：> 4 MB 的 .glb（贴图多的模型）走分块上传；单块失败不再整份从头来。只影响成功率，不影响安全。
//   verifyChunkedCommit：分块上传只在开会话时核 If-Match，最后一块落地无条件 → 两台设备同时覆盖同一文件有「传那几十秒」的窗口；
//     开了 = 提交最后一块前再比一次 eTag，变了就撤会话抛 412 → 冲突面（第 1 条：云端已有的不被盖）。代价 = 每次分块覆盖多一个 GET。
const GRAPH_TRANSPORT: GraphTransportOptions = { timeouts: DEFAULT_GRAPH_TIMEOUTS, chunkResume: true, verifyChunkedCommit: true };

const od = createOneDriveProvider({ clientId: CLIENT_ID, scopes: SCOPES, authority: AUTHORITY, msalUrl: MSAL_URL, transport: GRAPH_TRANSPORT });
export const auth = od.auth;
/** 问云端一次（闸门的「离线继续」期间静默再试用）：真走一趟网，名字不存在 = 云端答了 null，也算通；不通 = 抛。不经 store：选了离线时 store 不出网。 */
export async function cloudReachable(): Promise<void> { await od.provider.getItemByPath(".reachable-probe"); }

let _activeDoc: string | null = null;
export function setActiveDocName(name: string | null): void { _activeDoc = name; }
export function activeDocName(): string | null { return _activeDoc; }

let _store: Store | null = null;
export function hasStore(): boolean { return _store !== null; }

// ---- 文件夹当家（工单 F-152；folder provider = 另一朵云，引擎零特判）。切换家 = 记到名册后刷新，开机只有这一条挂库路（WeebPaint 是热切换，CatsUp 不需要）。 ----
//   文件夹 store：signedIn 恒真（本地即在线），isOnline = 权限在不在（掉了 = 离线态：本机缓存照看、改动攒着，等人点一下再授权；MoonSinger app-store.ts 同形）。
let _folder: { label: string; dbId: string; online: boolean; entry: FolderEntryLike } | null = null;
export function isFolderHome(): boolean { return _folder !== null; }
export function folderHomeLabel(): string | null { return _folder?.label ?? null; }
export function folderHomeOnline(): boolean { return _folder?.online ?? false; }
export function setFolderHomeOnline(v: boolean): void { if (_folder) _folder.online = v; }
/** 这个家现在写得进去吗：文件夹 = 有权限；网盘 = 登录了且在线。session 的「这次要不要推」只问这一处。 */
export function canPushNow(): boolean { return _folder ? _folder.online : od.auth.isSignedIn() && cloudOnline(); }
/** 缩略图缓存按家分（同名模型在两个家是两份东西）。 */
export function homeGalleryId(): string { return _folder?.dbId ?? "default"; }

interface FolderEntryLike { label?: string; dbId: string; handle?: unknown }
const folderProviderOf = (entry: FolderEntryLike) => {
  if (!entry.handle) throw new Error("folder gallery entry has no handle");
  return createFolderProvider(entry.handle as Parameters<typeof createFolderProvider>[0]);
};
const labelOf = (entry: FolderEntryLike): string => entry.label || (entry.handle as { name?: string } | undefined)?.name || "文件夹";
/** createStore 的唯一调用点（守卫 test/gallery-home.test.ts：provider 必填，没有家不建库）。 */
function buildStore(o: { provider: Parameters<typeof createStore>[0]["provider"]; signedIn: () => boolean; isOnline: () => boolean; databaseId?: string }): Store {
  return createStore({
    provider: o.provider,
    ...(o.databaseId ? { databaseId: o.databaseId } : {}),   // 文件夹 = 名册条目的 dbId（`catsup.<dbId>`，一源一库，MASTER §A 修订 5）；网盘 / 以前的本机库 = 默认库
    ui: storeUI,
    appId: APP_ID,
    persistence: "app-managed",
    encryption: appEncryption,
    crypt: { getPassword },   // 口令只活内存（crypto-state）；加密 / 解密 / 换钥 / 打开加密件时库从这取，没有 = status locked，绝不弹窗
    reconcilePolicy: "app-driven",
    docKinds: DOC_KINDS,
    // store 2.1.4（F-54）上传会话落盘：> 4 MB 的推（贴图多的模型）开分块上传会话时把会话 URL / 大小 / If-Match / 这份字节的 sha256 / 时间记进本 store 的 kv
    //   （键 `internal.upload-session:<名>`，没有内容；sha256 只认「是不是同一份字节」，不当身份）；刷新 / iOS 杀页之后再推同一份字节（30 s 自动保存 / 退出推 / 回线补推）
    //   先问 Graph 传到哪、从那里接着传；续上的会话提交前一律核 eTag（不看 verifyChunkedCommit）。库默认关 = 新持久化键要 app 表态：user 10-25「weebpaint开了。那么我们也开吧。以后有了贴图我们也会变得很胖的」。
    uploads: { resumable: true },
    validateAdopt: async (plain) => isCatsupDocumentHead(new Uint8Array(await plain.slice(0, 256 * 1024).arrayBuffer())),
    autoCacheOpenedFile: true,
    offlineUploadReplay: "manual",   // 2026-11-04：回来只问一次（规则书第 15 条，main.ts offerPushLocalOnly）；"ask" 时库会先弹一张自己的面，同一件事问两遍
    readOnlyFiles: false,
    signedIn: o.signedIn,
    isOnline: o.isOnline,
    activeIdentifier: () => _activeDoc,
    hidden: (id) => HIDDEN_NAME_RE.test(id),
  });
}
/** 网盘这条路（登录 / 以前的本机库）：首次挂图库 / 登录时建；之后常驻（无地 = 从不调用）。挂着文件夹时直接给文件夹那个。 */
export function ensureStore(): Store {
  if (_store) return _store;
  _store = buildStore({ provider: od.provider, signedIn: () => od.auth.isSignedIn(), isOnline: cloudOnline });
  wireVerifierOf(_store);
  return _store;
}
/** 开机挂文件夹（boot 单路；online = 权限在不在）。 */
export function attachFolderHome(entry: FolderEntryLike, online: boolean): Store {
  if (_store) throw new Error("attachFolderHome after a store exists (home switches go through reload)");
  _folder = { label: labelOf(entry), dbId: entry.dbId, online, entry };
  _store = buildStore({ provider: folderProviderOf(entry), signedIn: () => true, isOnline: () => _folder?.online ?? false, databaseId: entry.dbId });
  wireVerifierOf(_store);
  return _store;
}
/** 从文件夹**真的读**一个身份的 at-rest 字节（不经 store 的本机缓存；加密件在夹里多一个 .zip）。没有 = null。 */
async function readFromFolder(provider: ReturnType<typeof folderProviderOf>, identifier: string): Promise<Blob | null> {
  const it = (await provider.getItemByPath(`${identifier}.zip`)) ?? (await provider.getItemByPath(identifier));
  return it ? provider.download(it.ref) : null;
}
/** 搬家的目的地（还没换过去：刚选的夹，搬完记名册、刷新）。用完调用方 dispose。 */
export function openFolderDestination(entry: FolderEntryLike): { store: Store; label: string; readBack: (identifier: string) => Promise<Blob | null> } {
  const provider = folderProviderOf(entry);
  return { store: buildStore({ provider, signedIn: () => true, isOnline: () => true, databaseId: entry.dbId }), label: labelOf(entry), readBack: (id) => readFromFolder(provider, id) };
}
/** 搬家的目的地 = 现在挂着的文件夹（同一个句柄另起一个 provider 读夹里真的文件）。 */
export function currentFolderDestination(): { store: Store; label: string; readBack: (identifier: string) => Promise<Blob | null> } {
  if (!_folder || !_store) throw new Error("no folder home attached");
  const provider = folderProviderOf(_folder.entry);
  return { store: _store, label: _folder.label, readBack: (id) => readFromFolder(provider, id) };
}
/** 以前那个本机库（默认库 `catsup.defaultStore`：以前没登录也能建的就是它；有账号时它也是网盘的本机副本）。 */
const LEGACY_DB = `${APP_ID}.defaultStore`;
/** 这台设备上有没有以前那个库（只看名字，不开库——开了就等于建了）。浏览器不给列举 = 信 hint（device-kv gallery-attached）。 */
export async function legacyLibraryExists(hint: boolean): Promise<boolean> {
  try { const r = await scanAppNamespace(APP_ID); return r.databasesSupported ? r.databases.includes(LEGACY_DB) : hint; }
  catch { return hint; }
}
/** 搬家 / 导出的来源。现在挂着的就是它（没有家 / 还没搬完）= 直接给（同一个库不开两份）；现在是文件夹 = 另开一个**永远离线**的实例
 *  （一条网都不打，不会把删除排上云），owned = 用完调用方 dispose。 */
export function legacyStore(): { store: Store; owned: boolean } {
  if (_store && !_folder) return { store: _store, owned: false };
  return { store: buildStore({ provider: od.provider, signedIn: () => false, isOnline: () => false }), owned: true };
}
/** 搬家的写口（红线守卫：store 的写只准在接缝和 session）。读源 = at-rest 字节（加密件 = 容器，不解开）；写 = 只新建、必须落进新家；移走 = 进旧库回收站。
 *  encrypted = 这趟读到的加密件（口令验证器要不要跟着搬，看它）。 */
export function homeMovePorts(src: Store, dest: { store: Store; readBack: (identifier: string) => Promise<Blob | null> }): HomeMovePorts & { encrypted: Set<string> } {
  const encrypted = new Set<string>();
  return {
    encrypted,
    read: async (id) => { const f = src.file(id, { mode: "existing" }); const c = (await f.getEncryptedBlob()) as Blob | null; if (c) encrypted.add(id); return c ?? f.open(); },
    writeNew: async (id, bytes) => { const w = await dest.store.file(id, { mode: "new" }).save(bytes, { tryPush: true }); if (!w.pushed) throw new NotLandedError(id, w.reason); },
    readBack: (id) => dest.readBack(id),
    discard: async (id) => { await dest.store.file(id, { mode: "existing" }).trash(); },
    renamed: (id, n) => renamedIdentifier(dest.store, id, n),
    removeFromSource: async (id) => { const t = await src.file(id, { mode: "existing" }).trash(); if (t.status !== "trashed") throw new Error(`not moved to the browser's trash (${t.status})`); },
  };
}
/** 「放回图库」的写口：写进现在的家（推不推 = 现在写不写得进去；没推上 = 和离线保存一样留着待推）；读回 = 本机落下的 at-rest 字节（容器原样）。 */
export function putBackPorts(): VerifiedWritePorts {
  const store = requireStore();
  return {
    writeNew: async (id, bytes) => { await store.file(id, { mode: "new" }).save(bytes, { tryPush: canPushNow() }); },
    readBack: async (id) => ((await store.file(id, { mode: "existing" }).getEncryptedBlob()) as Blob | null),
    discard: async (id) => { await store.file(id, { mode: "existing" }).trash(); },
    renamed: (id, n) => renamedIdentifier(store, id, n),
  };
}
/** 撞名换的名字：主干后面加「 (n)」，夹和后缀不动（身份只经 store.identifiers 切）。 */
function renamedIdentifier(store: Store, id: string, n: number): string {
  const d = store.identifiers.parse(id);
  return d ? store.identifiers.join({ folder: d.folder, stem: `${d.stem} (${n})`, suffix: d.suffix }) : `${id} (${n})`;
}
const VERIFIER_KEY = "galleryPasswordVerifier";
/** collection "app-state" 每个 store 实例 init 一次（库里 collection 是单例；init 再调会重读本地）。 */
const _appState = new WeakMap<Store, Promise<Collection>>();
function appStateOf(store: Store): Promise<Collection> {
  let p = _appState.get(store);
  if (!p) { const col = store.collection("app-state"); p = col.init().then(() => col); _appState.set(store, p); }
  return p;
}
function wireVerifierOf(store: Store): void {
  // 图库口令验证器（password-verifier.ts）：synced collection "app-state" 的一项，跟账号走。init 完才接——没接之前 hasVerifier() = false，
  //   解锁循环 / 首次加密都先 await verifierReady()，免得把真验证器当「没设过」覆盖掉。
  //   set 之后立刻刷进本机（collection 本地写有 400 ms 防抖：设完口令马上关页 / 刷新，验证器会丢 = 下次开机走「设置图库口令」→ 两套口令；2026-11-04 Fable 定修）。
  _verifierReady = appStateOf(store).then((col) => { wireVerifierStore({ get: () => { const v = col.getItem(VERIFIER_KEY); return isVerifierRecord(v) ? v : null; }, set: (rec) => { col.setItem(VERIFIER_KEY, rec); return flushCollection(col); } }); }).catch(() => { /* 接不上 = 当没有验证器；库已 reportError */ });
}
/** collection 立刻落本机（库的 flushLocal = 卸载兜底面）；落不进去如实上报，不抛（ok=false = 本地都没写进去，别忽略）。 */
async function flushCollection(col: Collection): Promise<void> {
  const r = await col.flushLocal().catch((e: unknown) => ({ ok: false, error: e }));
  if (!r.ok) storeUI.reportError(r.error instanceof Error ? r.error : new Error(`[app-state] not written locally: ${String(r.error)}`), "warning");
}
/** 页面藏起来 / 要走了（main.ts 崩溃安全 flush 那一组事件）：app-state 立刻落本机。没挂库 / 这一页没开过 app-state = 什么都不做（不为刷盘去开库）。 */
export function flushAppStateLocal(): void {
  const p = _store ? _appState.get(_store) : undefined;
  if (p) void p.then(flushCollection, () => {});
}
/** 口令验证器跟着搬的端口（判定在 home-move.ts carryVerifier）：新家「有没有」= 和夹里对过一次（reconcile 回 synced / unchanged）才算知道；
 *  写 = 原样 setItem + 再对一次把它推进夹里 + 落本机（搬家的目的地实例马上要 dispose，刷新后同一个库接着推）。 */
export function verifierCarryPorts(src: Store, dest: Store): VerifierCarryPorts {
  return {
    source: async () => { const v = (await appStateOf(src)).getItem(VERIFIER_KEY); return isVerifierRecord(v) ? v : null; },
    dest: async () => {
      const col = await appStateOf(dest);
      const r = await col.reconcileWithRemote();
      const v = col.getItem(VERIFIER_KEY);
      return { known: r.status === "synced" || r.status === "unchanged", record: isVerifierRecord(v) ? v : null };
    },
    write: async (rec) => {
      const col = await appStateOf(dest);
      col.setItem(VERIFIER_KEY, rec);
      await col.reconcileWithRemote();
      const f = await col.flushLocal();
      if (!f.ok) throw new Error("password verifier not written locally");
    },
  };
}
let _verifierReady: Promise<void> = Promise.resolve();
/** 口令验证器接上了没有（无地 = 立刻）。解锁 / 首次加密前先等它。 */
export function verifierReady(): Promise<void> { return _verifierReady; }
export function requireStore(): Store {
  if (!_store) throw new Error("store not attached (landless mode)");
  return _store;
}
/** 文档句柄工厂（身份 = 全名 `夹/名.catsup`，老的 `夹/名.glb`；都是裸 glb 容器，走 file() 不走 zip()）。 */
export function docFile(identifier: string, mode: "new" | "existing" = "existing"): RawFile {
  return requireStore().file(identifier, { mode });
}

export { requestStoragePersistence, isCached, isDirty };
export { wipeAppNamespace } from "@internal/store";
export { scanAppNamespace };   // maintenance 面经接缝转口（factory-reset.ts 消费；库内 typed consent）
/** 还原出厂前置：释放本 store 实例（否则库 wipe 进 blocked 报告）。之后任何面抛 StoreDisposedError——只能 reload。没挂过图库 = no-op。 */
export async function disposeStore(): Promise<void> {
  const s = _store; if (!s) return;
  const appState = _appState.get(s);
  _store = null; _folder = null; wireVerifierStore(null); _verifierReady = Promise.resolve();
  // 先把 app-state 落本机（第二层）：库 2.2.7 起 dispose 自己也做（排着的本地写先落盘再关，家族周账 F-199）；这里留着 = 两层奶酪，init 还没完也等它完。
  //   起因：2.2.5 的 dispose 不清那个 400 ms 定时器，开机拆空库（settleNoHome）离 init 只差几十毫秒，到点撞上已关的 IDB → 琥珀色英文警告盖在通知栈上（probe-c2「恢复」钮点不到的真因）。
  if (appState) await appState.then(flushCollection, () => {});
  await s.dispose();
}
export type { Store, RawFile };
export type { Item, SyncState, SaveResult, TryMoveResult, FolderSnapshot } from "@internal/store";
