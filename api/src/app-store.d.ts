import { requestStoragePersistence, isCached, isDirty } from "@internal/store";
import type { Store, RawFile, DocKind } from "@internal/store";
/** 文档种类表（store 0.16）：同一种文档两种拼法（库：「几行可以是同一个 kind」）——.catsup（2026-10-28 起新文档都写它，账本 UX39）+ 老的 .glb 工程（永远照开、不改名）。
 *  kind 标签沿用 "glb"（缩略图 kinds / 名册都认这个词，换标签没好处）。裸文件不是 zip。图库包据它认文档 / 切主干 / 改名只编辑主干（后缀保留）。 */
export declare const DOC_KINDS: readonly DocKind[];
export declare const auth: import("@internal/store").OneDriveAuth;
export declare function setActiveDocName(name: string | null): void;
export declare function activeDocName(): string | null;
export declare function hasStore(): boolean;
/** 首次挂图库 / 登录时建；之后常驻（无地 = 从不调用）。 */
export declare function ensureStore(): Store;
export declare function requireStore(): Store;
/** 文档句柄工厂（身份 = 全名 `夹/名.catsup`，老的 `夹/名.glb`；都是裸 glb 容器，走 file() 不走 zip()）。 */
export declare function docFile(identifier: string, mode?: "new" | "existing"): RawFile;
export { requestStoragePersistence, isCached, isDirty };
export { wipeAppNamespace, scanAppNamespace } from "@internal/store";
/** 还原出厂前置：释放本 store 实例（否则库 wipe 进 blocked 报告）。之后任何面抛 StoreDisposedError——只能 reload。没挂过图库 = no-op。 */
export declare function disposeStore(): Promise<void>;
export type { Store, RawFile };
export type { Item, SyncState, SaveResult, TryMoveResult, FolderSnapshot } from "@internal/store";
