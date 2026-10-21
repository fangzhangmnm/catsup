export interface PwaShellOptions {
    onUpdateAvailable: () => void;
    onForeground?: () => void;
    onBeforeReload?: () => void | Promise<void>;
    /** 黑匣子面包屑（SW 注册失败等；不给 = 只 console）。 */
    onLog?: (msg: string) => void;
}
export interface PwaShell {
    readonly isDevRoute: boolean;
    /** 应用等待中的新 SW 并 reload（toast「刷新」按钮调）。 */
    reload: () => Promise<void>;
    /** 清缓存重启（PWA 卡旧版的逃生舱）：注销管着当前页面的那个 SW + 清自己前缀（`catsup-`）的缓存 + reload。IDB（文档缓存）不碰；
     *  同域名的兄弟 app 的离线壳、家族共享的模型缓存 `pwa-models` 不碰。 */
    forceReset: () => Promise<void>;
}
export declare function initPwaShell(opts: PwaShellOptions): PwaShell;
