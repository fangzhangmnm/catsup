import { requestStoragePersistence, isCached, isDirty } from "@internal/store";
import type { Store, RawFile } from "@internal/store";
export declare const auth: import("@internal/store").OneDriveAuth;
export declare function setActiveDocName(name: string | null): void;
export declare function activeDocName(): string | null;
export declare function hasStore(): boolean;
/** 首次挂图库 / 登录时建；之后常驻（无地 = 从不调用）。 */
export declare function ensureStore(): Store;
export declare function requireStore(): Store;
/** 文档句柄工厂（.glb = 裸文件不是 zip）。 */
export declare function docFile(name: string, mode?: "new" | "existing"): RawFile;
export { requestStoragePersistence, isCached, isDirty };
export type { Store, RawFile };
export type { Item, SyncState, SaveResult, TryMoveResult, FolderSnapshot } from "@internal/store";
