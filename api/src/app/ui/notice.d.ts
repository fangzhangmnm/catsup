export type NoticeLevel = "neutral" | "info" | "warning" | "error";
export interface NoticeAction {
    label: string;
    onClick: () => void;
    primary?: boolean;
}
export interface NoticeOpts {
    id?: string;
    text: string;
    level?: NoticeLevel;
    actions?: NoticeAction[];
    /** 自动消失毫秒；null = 常驻（默认：有 actions 或 error/warning 常驻，否则 3500）。 */
    timeoutMs?: number | null;
}
export interface NoticeHandle {
    readonly id: string;
    close(): void;
    isOpen(): boolean;
}
export declare function showNotice(opts: NoticeOpts): NoticeHandle;
export declare function closeNotice(id: string): void;
