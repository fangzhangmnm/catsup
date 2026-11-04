import { type GalleryView } from "@internal/gallery";
export interface GalleryHostDeps {
    mountEl: HTMLElement;
    fullEl: HTMLElement;
    /** 正在编辑的那个模型（身份 = 全路径 `夹/名.catsup`，老的 `夹/名.glb`）；没有图库家 = null。 */
    activeName: () => string | null;
    /** 打开一个模型（身份）。true = 编辑器已切过去。 */
    openDoc: (identifier: string) => Promise<boolean>;
    /** 顶栏改名（编辑器自己的改名 UI）；返回新身份。 */
    renameActive: () => Promise<string | null>;
    /** 正在编辑的模型被图库移动 / 改名 → 编辑器换身份。 */
    setActiveName: (identifier: string) => void;
    offloadDoc: (identifier: string) => Promise<void>;
    flushLocal: () => Promise<void>;
    setStatus: (text: string, error?: boolean) => void;
    onFolderChanged: (dir: string) => void;
    onOpened?: () => void;
    onClosed?: () => void;
}
export declare function initGalleryHost(d: GalleryHostDeps): {
    open: () => Promise<void>;
    close: () => void;
    isOpen: () => boolean;
    openAttention: () => Promise<void>;
    setAttentionOnly: (on: boolean) => void | undefined;
    refresh: () => void | undefined;
    /** files / trash / backup（搁置区两箱；清空钮在包的视图里）。 */
    setView: (v: GalleryView) => void;
    getView: () => GalleryView;
    currentFolder: () => string;
    /** 这份的封面作废（session 加密 / 解除时调；工单 C2 ③：明文封面不许留在缩略库）。库也许还没挂（开机直接回到模型）：先挂上，别变成空操作。 */
    invalidateThumb: (identifier: string) => Promise<void>;
    /** dev 诊断（冒烟用）：缩略缓存统计。 */
    thumbStats: () => {
        hits: number;
        misses: number;
        errors: number;
    } | null;
};
export type GalleryHost = ReturnType<typeof initGalleryHost>;
