import { diagLog } from "@internal/gallery";
export declare const record: typeof diagLog.record, note: typeof diagLog.note, entries: typeof diagLog.entries, clear: typeof diagLog.clear, toText: typeof diagLog.toText, flush: typeof diagLog.flush;
/** main 最早调（任何 initAuth / store 之前）：接 device-kv 器官 + 页面生命周期面包屑 + 开机 URL 行。 */
export declare function initDebugLog(): void;
