import { requestStoragePersistence, isCached, isDirty, scanAppNamespace } from "@internal/store";
import type { Store, RawFile, DocKind } from "@internal/store";
import { type HomeMovePorts, type VerifiedWritePorts } from "./app/home-move.ts";
/** 文档种类表（store 0.16）：同一种文档两种拼法（库：「几行可以是同一个 kind」）——.catsup（2026-10-28 起新文档都写它，账本 UX39）+ 老的 .glb 工程（永远照开、不改名）。
 *  kind 标签沿用 "glb"（缩略图 kinds / 名册都认这个词，换标签没好处）。裸文件不是 zip。图库包据它认文档 / 切主干 / 改名只编辑主干（后缀保留）。 */
export declare const DOC_KINDS: readonly DocKind[];
export declare const auth: import("@internal/store").OneDriveAuth;
/** 问云端一次（闸门的「离线继续」期间静默再试用）：真走一趟网，名字不存在 = 云端答了 null，也算通；不通 = 抛。不经 store：选了离线时 store 不出网。 */
export declare function cloudReachable(): Promise<void>;
export declare function setActiveDocName(name: string | null): void;
export declare function activeDocName(): string | null;
export declare function hasStore(): boolean;
export declare function isFolderHome(): boolean;
export declare function folderHomeLabel(): string | null;
export declare function folderHomeOnline(): boolean;
export declare function setFolderHomeOnline(v: boolean): void;
/** 这个家现在写得进去吗：文件夹 = 有权限；网盘 = 登录了且在线。session 的「这次要不要推」只问这一处。 */
export declare function canPushNow(): boolean;
/** 缩略图缓存按家分（同名模型在两个家是两份东西）。 */
export declare function homeGalleryId(): string;
interface FolderEntryLike {
    label?: string;
    dbId: string;
    handle?: unknown;
}
/** 网盘这条路（登录 / 以前的本机库）：首次挂图库 / 登录时建；之后常驻（无地 = 从不调用）。挂着文件夹时直接给文件夹那个。 */
export declare function ensureStore(): Store;
/** 开机挂文件夹（boot 单路；online = 权限在不在）。 */
export declare function attachFolderHome(entry: FolderEntryLike, online: boolean): Store;
/** 搬家的目的地（还没换过去：刚选的夹，搬完记名册、刷新）。用完调用方 dispose。 */
export declare function openFolderDestination(entry: FolderEntryLike): {
    store: Store;
    label: string;
    readBack: (identifier: string) => Promise<Blob | null>;
};
/** 搬家的目的地 = 现在挂着的文件夹（同一个句柄另起一个 provider 读夹里真的文件）。 */
export declare function currentFolderDestination(): {
    store: Store;
    label: string;
    readBack: (identifier: string) => Promise<Blob | null>;
};
/** 这台设备上有没有以前那个库（只看名字，不开库——开了就等于建了）。浏览器不给列举 = 信 hint（device-kv gallery-attached）。 */
export declare function legacyLibraryExists(hint: boolean): Promise<boolean>;
/** 搬家 / 导出的来源。现在挂着的就是它（没有家 / 还没搬完）= 直接给（同一个库不开两份）；现在是文件夹 = 另开一个**永远离线**的实例
 *  （一条网都不打，不会把删除排上云），owned = 用完调用方 dispose。 */
export declare function legacyStore(): {
    store: Store;
    owned: boolean;
};
/** 搬家的写口（红线守卫：store 的写只准在接缝和 session）。读源 = at-rest 字节（加密件 = 容器，不解开）；写 = 只新建、必须落进新家；移走 = 进旧库回收站。 */
export declare function homeMovePorts(src: Store, dest: {
    store: Store;
    readBack: (identifier: string) => Promise<Blob | null>;
}): HomeMovePorts;
/** 「放回图库」的写口：写进现在的家（推不推 = 现在写不写得进去；没推上 = 和离线保存一样留着待推）；读回 = 本机落下的 at-rest 字节（容器原样）。 */
export declare function putBackPorts(): VerifiedWritePorts;
/** 口令验证器接上了没有（无地 = 立刻）。解锁 / 首次加密前先等它。 */
export declare function verifierReady(): Promise<void>;
export declare function requireStore(): Store;
/** 文档句柄工厂（身份 = 全名 `夹/名.catsup`，老的 `夹/名.glb`；都是裸 glb 容器，走 file() 不走 zip()）。 */
export declare function docFile(identifier: string, mode?: "new" | "existing"): RawFile;
export { requestStoragePersistence, isCached, isDirty };
export { wipeAppNamespace } from "@internal/store";
export { scanAppNamespace };
/** 还原出厂前置：释放本 store 实例（否则库 wipe 进 blocked 报告）。之后任何面抛 StoreDisposedError——只能 reload。没挂过图库 = no-op。 */
export declare function disposeStore(): Promise<void>;
export type { Store, RawFile };
export type { Item, SyncState, SaveResult, TryMoveResult, FolderSnapshot } from "@internal/store";
