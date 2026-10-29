import type { TransferPayload } from "./transfer.ts";
export declare const clipboard: {
    set(p: TransferPayload, doc: number): void;
    get(): TransferPayload | null;
    /** 拷的时候是第几个模型（Editor.docEpoch）。 */
    doc(): number | null;
    has(): boolean;
    /** 探针 / 测试用。 */
    clear(): void;
};
