/** 名册上该有的来源。宿主（app/main.ts）每个都要登记一行。 */
export declare const HAND_SOURCES: readonly ["editor.gesture", "paint.stroke"];
export type HandSource = (typeof HAND_SOURCES)[number];
export interface HandEntry {
    readonly source: HandSource;
    /** 现在有没有一下没收。每次都现问，所以不会过期。 */
    busy(): boolean;
}
export interface HandRoster {
    /** 进名册，返回退名册。同一个来源登记两次 = 抛（宿主接线写重了）。 */
    add(e: HandEntry): () => void;
    /** 手上还有没有一下没收：任何一个来源说有 = 有。 */
    busy(): boolean;
    /** 现在是哪个来源没收（排在前面的那个；给黑匣子 / 探针）；都收了 = null。 */
    which(): HandSource | null;
    /** 登记了的来源（守卫 / 探针用）。 */
    sources(): readonly HandSource[];
}
export declare function createHandRoster(): HandRoster;
