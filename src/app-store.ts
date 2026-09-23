// app-store.ts —— @internal/store 的**唯一** value-level import（单一接缝；守卫 test/redline-guard.test.mjs + build.sh lint）。
// 只做 config 注入（provider / ui bundle / encryption / validateAdopt）+ auth 转发 + 文件句柄工厂。created 2026-09-20 by Claude Fable 5.1
//
// 表态（pwa-cloud-store skill §2，每条都是决定不是占位）：
//   provider   OneDrive personal only（authority /consumers，硬规则 #7）+ AppFolder（硬规则 #6）；CLIENT_ID 空 = 未配置纯无地。
//   persistence "app-managed"：挂上图库 / 首次保存的用户手势里调 requestStoragePersistence()。
//   encryption  零 codec 实例（0.5 不加密）。 reconcilePolicy "app-driven"：focus / online / 前台 60 s 轮询由 app 驱动。
//   validateAdopt 只看字节头：GLB magic + extensionsUsed 含 CATSUP_document（挡 captive-portal HTML / 外来 glb）。
//   autoCacheOpenedFile true（编辑器：开即留本地）。readOnlyFiles false。offlineUploadReplay "ask"。
//   signedIn = auth（0.14.0：云腿闸 = isOnline ∧ signedIn）。activeFileName = 当前打开的文档（cloud-gone 收敛不碰它）。
//   hiddenName = 写入方半成品（夹里有什么是 store 的事，不是图库的）。
// 无地模式（WeebPaint 标准）：**不挂图库时 createStore 完全不被调用**（零 IDB/localStorage 副作用，file:// 也能跑）；
//   store 在首次开图库 / 登录时懒建（ensureStore），之后常驻。
// 开机顺序契约（v0.5.7，ai-docs/20260922-lifecycle-alignment-with-weebpaint.md §1.3 / §3.3）：**boot 的本地恢复必须在 initAuth 之前发起并等完**。
//   库 0.14 起「在线 = 有网 ∧ signedIn()」，`open()` 在线时先等一次云端 etag 往返；未登录 → 直接读本地零网络。谁把 initAuth 排到恢复前面，
//   谁就把「开机秒开」变回「开机等一次 Graph」。登录落地后的新鲜度由 session.refreshOpenDoc（pullIfClean）后台补。
import { createStore, createOneDriveProvider, requestStoragePersistence, isCached, isDirty } from "@internal/store";
import type { Store, RawFile } from "@internal/store";
import { APP_ID, AUTHORITY, CLIENT_ID, HIDDEN_NAME_RE, MSAL_URL, SCOPES } from "./config.ts";
import { storeUI } from "./store-ui.ts";
import { appEncryption } from "./encryption.ts";
import { isCatsupDocumentHead } from "./format/peek.ts";

const od = createOneDriveProvider({ clientId: CLIENT_ID, scopes: SCOPES, authority: AUTHORITY, msalUrl: MSAL_URL });
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
    validateAdopt: async (plain) => isCatsupDocumentHead(new Uint8Array(await plain.slice(0, 256 * 1024).arrayBuffer())),
    autoCacheOpenedFile: true,
    offlineUploadReplay: "ask",
    readOnlyFiles: false,
    signedIn: () => od.auth.isSignedIn(),
    activeFileName: () => _activeDoc,
    hiddenName: (p) => HIDDEN_NAME_RE.test(p),
  });
  return _store;
}
export function requireStore(): Store {
  if (!_store) throw new Error("store not attached (landless mode)");
  return _store;
}
/** 文档句柄工厂（.glb = 裸文件不是 zip）。 */
export function docFile(name: string, mode: "new" | "existing" = "existing"): RawFile {
  return requireStore().file(name, { isZip: false, mode });
}

export { requestStoragePersistence, isCached, isDirty };
export type { Store, RawFile };
export type { Item, SyncState, SaveResult, TryMoveResult, FolderSnapshot } from "@internal/store";
