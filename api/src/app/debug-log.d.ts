import { diagLog } from "@internal/gallery";
export declare const entries: typeof diagLog.entries, clear: typeof diagLog.clear, toText: typeof diagLog.toText, flush: typeof diagLog.flush;
/** 写入总闸：错误文案 / 面包屑一律过 noCoords（规则书 §1 第 5 条；解开的加密件也在这条路上）。 */
export declare const record: typeof diagLog.record;
export declare const note: typeof diagLog.note;
/** main 最早调（任何 initAuth / store 之前）：接 device-kv 器官 + 页面生命周期面包屑 + 开机 URL 行。 */
export declare function initDebugLog(): void;
