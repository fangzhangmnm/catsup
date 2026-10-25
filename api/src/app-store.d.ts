import { requestStoragePersistence, isCached, isDirty } from "@internal/store";
import type { Store, RawFile, DocKind } from "@internal/store";
/** 文档种类表（store 0.16）：只有 .glb 一行；裸文件不是 zip。图库包据它认文档 / 切主干 / 改名只编辑主干。 */
export declare const DOC_KINDS: readonly DocKind[];
export declare const auth: import("@internal/store").OneDriveAuth;
export declare function setActiveDocName(name: string | null): void;
export declare function activeDocName(): string | null;
export declare function hasStore(): boolean;
/** 首次挂图库 / 登录时建；之后常驻（无地 = 从不调用）。 */
export declare function ensureStore(): Store;
export declare function requireStore(): Store;
/** 文档句柄工厂（身份 = 全名 `夹/名.glb`；.glb 是裸文件，走 file() 不走 zip()）。 */
export declare function docFile(identifier: string, mode?: "new" | "existing"): RawFile;
export { requestStoragePersistence, isCached, isDirty };
export type { Store, RawFile };
export type { Item, SyncState, SaveResult, TryMoveResult, FolderSnapshot } from "@internal/store";
