export type ReturnPlan = {
    kind: "none";
} | {
    kind: "resume";
} | {
    kind: "ask";
    neverUploaded: number;
} | {
    kind: "list";
    total: number;
};
export declare function planReturn(f: {
    dirty: number;
    neverUploaded: number;
    consented: boolean;
    saidLater: boolean;
}): ReturnPlan;
/** 列举里「从没传过且有字节要传」的身份。local-only 是干净的（pushAll 不推它），不算。 */
export declare function neverUploadedIds(files: readonly {
    identifier: string;
    syncState?: string | null;
}[]): Set<string>;
