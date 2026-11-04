import { type GalleryEntry } from "@internal/gallery";
export type HomeState = "folder" | "cloud" | "browser-only" | "none";
export declare function homeState(f: {
    folder: boolean;
    signedIn: boolean;
    accountExpected: boolean;
    browserOnlyModels: number;
}): HomeState;
export declare const hasHome: (s: HomeState) => boolean;
/** granted → true；prompt 且 request（手势里）→ 申请；否则 false（= 离线态：改动攒在本机，开机不弹）。没有权限 API 的平台 = 视为可用。 */
export declare function ensureFolderPermission(entry: GalleryEntry, opts: {
    request: boolean;
}): Promise<boolean>;
/** 这个浏览器能选文件夹吗（iPad / 手机 / 被跨源套着都不能）。 */
export declare function canPickFolder(): boolean;
/** 文件夹选择框（**必须在点击的同步栈里调**：FSA 要手势）。同一个夹再选复用名册条目。取消 = null。 */
export declare function pickFolderEntry(): Promise<GalleryEntry | null>;
/** 开机：上次用的是文件夹吗。没选过文件夹 = 不开名册；读不出 = 当没有（不挡开机，文件模式能用）。 */
export declare function bootFolderEntry(onError: (e: unknown) => void): Promise<GalleryEntry | null>;
/** 下次开机用这个文件夹。 */
export declare const rememberFolderHome: (entry: GalleryEntry) => Promise<void>;
/** 下次开机不再挂文件夹（名册条目留着，再选同一个夹复用；夹里的文件一个字节不动）。 */
export declare const forgetFolderHome: () => Promise<void>;
