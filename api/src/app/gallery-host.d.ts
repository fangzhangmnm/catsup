export interface GalleryHostDeps {
    mountEl: HTMLElement;
    fullEl: HTMLElement;
    activeName: () => string | null;
    openDoc: (fullName: string) => Promise<boolean>;
    renameActive: () => Promise<string | null>;
    setActiveName: (fullName: string) => void;
    pushDoc: (fullName: string) => Promise<void>;
    offloadDoc: (fullName: string) => Promise<void>;
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
    refresh: () => void | undefined;
    setView: (v: "files" | "trash") => void;
    getView: () => "files" | "trash";
    emptyTrash: (scope: "local" | "cloud" | "both") => void;
    currentFolder: () => string;
    invalidateThumb: (full: string) => void;
    /** dev 诊断（冒烟用）：缩略缓存统计。 */
    thumbStats: () => {
        hits: number;
        misses: number;
        errors: number;
    } | null;
};
export type GalleryHost = ReturnType<typeof initGalleryHost>;
