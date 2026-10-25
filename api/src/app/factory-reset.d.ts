export interface FactoryResetDeps {
    setStatus: (msg: string, error?: boolean) => void;
    /** wipe 前收口：停自动保存 / 盲快照、家置空（之后 store 就 dispose 了，谁再写谁吃 StoreDisposedError）。 */
    beforeWipe: () => Promise<void> | void;
    /** 只注销管着当前页面的 SW + 只删 `catsup-` 前缀的缓存（pwa-shell 的那一步，不 reload）。 */
    clearOwnShell: () => Promise<void>;
}
/** 还原出厂主流程（☰ → 设置 →「开发者」→「还原出厂设置…」）。全程 in-app sheet；成功 = 带标记 reload，不在本页报成功。 */
export declare function runFactoryReset(d: FactoryResetDeps): Promise<void>;
/** 开机：URL 带 `?factory=<ts>` 且 2 分钟内 = 上一页刚还原出厂。 */
export declare function hasFactoryResetMarker(): boolean;
/** 开机收尾（在任何人开这些库之前调）：再删一遍自家三个库 + 扫 store 命名空间，报一行结果，把标记从地址栏拿掉。 */
export declare function finishFactoryResetAtBoot(setStatus: (msg: string, error?: boolean) => void): Promise<void>;
