// gallery-home.ts —— 图库的家（家族规则书 §1 第 13 条；ai-docs/20261103-library-needs-a-home.md；工单 F-152 / F-153）。created 2026-11-04 by Claude Opus 5.5
//   家只有两种：网盘、用户选的本地文件夹。这台浏览器不是家。没有家 = 文件模式（存 = 下载 / 写回，开 = 选文件）。
//   **「有没有家」只在 homeState 判一处**（main.ts currentHomeState 是唯一组装点），别处不许各自看登录状态（守卫 test/gallery-home.test.ts）。
//   browser-only = 历史遗留：以前没登录也能建库，那些模型还在浏览器里。先保住再收入口：搬完之前入口不收、披露条照挂。
//   名册（@internal/gallery registry，device-local，永不同步）记文件夹句柄；开机只查权限不弹窗（再授权必须在点击里）。
//   没选过文件夹的设备不开名册的库（device-kv `folder-home-used`；照 MoonSinger src/library-home.ts：用户有意图才碰存储）。
import { galleryRegistry, type DirHandleLike, type GalleryEntry } from "@internal/gallery";
import { deviceKvGet, deviceKvSet } from "./device-kv.ts";

export type HomeState = "folder" | "cloud" | "browser-only" | "none";

export function homeState(f: { folder: boolean; signedIn: boolean; accountExpected: boolean; browserOnlyModels: number }): HomeState {
  if (f.folder) return "folder";
  if (f.signedIn || f.accountExpected) return "cloud";
  return f.browserOnlyModels > 0 ? "browser-only" : "none";
}
export const hasHome = (s: HomeState): boolean => s === "folder" || s === "cloud";

type PermHandle = { queryPermission?: (o: { mode: string }) => Promise<string>; requestPermission?: (o: { mode: string }) => Promise<string> };
/** granted → true；prompt 且 request（手势里）→ 申请；否则 false（= 离线态：改动攒在本机，开机不弹）。没有权限 API 的平台 = 视为可用。 */
export async function ensureFolderPermission(entry: GalleryEntry, opts: { request: boolean }): Promise<boolean> {
  const h = entry.handle as unknown as PermHandle | undefined;
  try {
    if (!h?.queryPermission) return true;
    if ((await h.queryPermission({ mode: "readwrite" })) === "granted") return true;
    if (opts.request && h.requestPermission) return (await h.requestPermission({ mode: "readwrite" })) === "granted";
    return false;
  } catch { return false; }
}

const KV_FOLDER_USED = "folder-home-used";
const picker = (): ((o?: unknown) => Promise<unknown>) | undefined => (globalThis as { showDirectoryPicker?: (o?: unknown) => Promise<unknown> }).showDirectoryPicker;
/** 这个浏览器能选文件夹吗（iPad / 手机 / 被跨源套着都不能）。 */
export function canPickFolder(): boolean {
  let embedded = false;
  try { embedded = window.top !== window; } catch { embedded = true; }
  return !embedded && typeof picker() === "function";
}
/** 文件夹选择框（**必须在点击的同步栈里调**：FSA 要手势）。同一个夹再选复用名册条目。取消 = null。 */
export function pickFolderEntry(): Promise<GalleryEntry | null> {
  const p = picker();
  if (!p) return Promise.resolve(null);
  const asked = p({ mode: "readwrite" });   // 同步起跳，别放到 await 后面
  return (async () => {
    let handle: unknown;
    try { handle = await asked; } catch { return null; }   // AbortError = 取消，不是错误
    const entry = await galleryRegistry.mintFolder(handle as DirHandleLike);
    deviceKvSet(KV_FOLDER_USED, "1");
    return entry;
  })();
}
/** 开机：上次用的是文件夹吗。没选过文件夹 = 不开名册；读不出 = 当没有（不挡开机，文件模式能用）。 */
export async function bootFolderEntry(onError: (e: unknown) => void): Promise<GalleryEntry | null> {
  if (deviceKvGet(KV_FOLDER_USED) !== "1") return null;
  try { const e = await galleryRegistry.lastActive(); return e?.kind === "folder" && e.handle ? e : null; }
  catch (e) { onError(e); return null; }
}
/** 下次开机用这个文件夹。 */
export const rememberFolderHome = (entry: GalleryEntry): Promise<void> => galleryRegistry.touch(entry.id);
/** 下次开机不再挂文件夹（名册条目留着，再选同一个夹复用；夹里的文件一个字节不动）。 */
export const forgetFolderHome = (): Promise<void> => galleryRegistry.clearLastActive();
