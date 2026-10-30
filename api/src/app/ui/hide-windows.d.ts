export interface HideWindows {
    /** 藏 / 叫回；返回给提示行的一句话。 */
    toggle(): string;
    isHidden(): boolean;
}
export declare function createHideWindows(onChange?: (hidden: boolean) => void): HideWindows;
