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
//   encryption  零 codec 实例（不加密）。 reconcilePolicy "app-driven"：focus / online / 前台 60 s 轮询由 app 驱动。
//   validateAdopt 只看字节头：GLB magic + extensionsUsed 含 CATSUP_document（挡 captive-portal HTML / 外来 glb）。
//   autoCacheOpenedFile true（编辑器：开即留本地）。readOnlyFiles false。offlineUploadReplay "ask"。
//   signedIn = auth（0.14.0：云腿闸 = isOnline ∧ signedIn）。activeIdentifier = 当前打开的文档（cloud-gone 收敛不碰它；0.16 起叫这个名）。
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
import { createStore, createOneDriveProvider, requestStoragePersistence, isCached, isDirty, DEFAULT_GRAPH_TIMEOUTS } from "@internal/store";
import type { Store, RawFile, DocKind, GraphTransportOptions } from "@internal/store";
import { APP_ID, AUTHORITY, CLIENT_ID, DOC_EXT, HIDDEN_NAME_RE, LEGACY_DOC_EXT, MSAL_URL, SCOPES } from "./config.ts";
import { storeUI } from "./store-ui.ts";
import { appEncryption } from "./encryption.ts";
import { isCatsupDocumentHead } from "./format/peek.ts";

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

let _activeDoc: string | null = null;
export function setActiveDocName(name: string | null): void { _activeDoc = name; }
export function activeDocName(): string | null { return _activeDoc; }

let _store: Store | null = null;
export function hasStore(): boolean { return _store !== null; }
/** 首次挂图库 / 登录时建；之后常驻（无地 = 从不调用）。 */
export function ensureStore(): Store {
  if (_store) return _store;
  _store = createStore({
    provider: od.provider,
    ui: storeUI,
    appId: APP_ID,
    persistence: "app-managed",
    encryption: appEncryption,
    reconcilePolicy: "app-driven",
    docKinds: DOC_KINDS,
    // store 2.1.4（F-54）上传会话落盘：> 4 MB 的推（贴图多的模型）开分块上传会话时把会话 URL / 大小 / If-Match / 这份字节的 sha256 / 时间记进本 store 的 kv
    //   （键 `internal.upload-session:<名>`，没有内容；sha256 只认「是不是同一份字节」，不当身份）；刷新 / iOS 杀页之后再推同一份字节（30 s 自动保存 / 退出推 / 回线补推）
    //   先问 Graph 传到哪、从那里接着传；续上的会话提交前一律核 eTag（不看 verifyChunkedCommit）。库默认关 = 新持久化键要 app 表态：user 10-25「weebpaint开了。那么我们也开吧。以后有了贴图我们也会变得很胖的」。
    uploads: { resumable: true },
    validateAdopt: async (plain) => isCatsupDocumentHead(new Uint8Array(await plain.slice(0, 256 * 1024).arrayBuffer())),
    autoCacheOpenedFile: true,
    offlineUploadReplay: "ask",
    readOnlyFiles: false,
    signedIn: () => od.auth.isSignedIn(),
    activeIdentifier: () => _activeDoc,
    hidden: (id) => HIDDEN_NAME_RE.test(id),
  });
  return _store;
}
export function requireStore(): Store {
  if (!_store) throw new Error("store not attached (landless mode)");
  return _store;
}
/** 文档句柄工厂（身份 = 全名 `夹/名.catsup`，老的 `夹/名.glb`；都是裸 glb 容器，走 file() 不走 zip()）。 */
export function docFile(identifier: string, mode: "new" | "existing" = "existing"): RawFile {
  return requireStore().file(identifier, { mode });
}

export { requestStoragePersistence, isCached, isDirty };
export { wipeAppNamespace, scanAppNamespace } from "@internal/store";   // maintenance 面经接缝转口（factory-reset.ts 消费；库内 typed consent）
/** 还原出厂前置：释放本 store 实例（否则库 wipe 进 blocked 报告）。之后任何面抛 StoreDisposedError——只能 reload。没挂过图库 = no-op。 */
export async function disposeStore(): Promise<void> { const s = _store; if (!s) return; _store = null; await s.dispose(); }
export type { Store, RawFile };
export type { Item, SyncState, SaveResult, TryMoveResult, FolderSnapshot } from "@internal/store";
