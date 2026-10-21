export type LuggageTag = string;
export type CrashRecordState = "crash" | "pending-adoption";
export interface CrashRecordMeta {
    tag: LuggageTag;
    state: CrashRecordState;
    name: string;
    at: number;
    homeKind: "file" | "transient";
}
export interface CrashRecord extends CrashRecordMeta {
    bytes: Blob;
}
/** 存储 port。原子性责任在 port：take = 取 + 删同一事务（防双领养）。 */
export interface CrashKV {
    put(rec: CrashRecord): Promise<void>;
    get(tag: LuggageTag): Promise<CrashRecord | null>;
    take(tag: LuggageTag): Promise<CrashRecord | null>;
    delete(tag: LuggageTag): Promise<void>;
    list(): Promise<CrashRecord[]>;
}
export declare function mintLuggageTag(): LuggageTag;
export interface CrashStore {
    /** 盲快照：同 tag 覆盖写单帧（与保存同一 writeCatsup 字节）。 */
    put(tag: LuggageTag, bytes: Blob, meta: Omit<CrashRecordMeta, "tag">): Promise<void>;
    /** 正常关闭即删（含显式写回成功后清旧帧）。⚠ pending-adoption 必须拒绝（unload ≠ 关闭，契约钉）。 */
    dropOnCleanClose(tag: LuggageTag): Promise<void>;
    /** 显式丢弃（恢复通知的「丢弃」按钮）：用户明确决定 → pending 也删。 */
    discard(tag: LuggageTag): Promise<void>;
    /** boot 扫描：只出 meta（不搬字节），新→旧。crash → 恢复通知；pending-adoption → 自动领养。 */
    listAtBoot(): Promise<CrashRecordMeta[]>;
    /** 领养：事务化取 + 删（防双领养）。已被领 / 不存在 → null；领养出的 doc 视为 dirty 直到首次真保存（Blockbench #2684/#2003 两坑，由 session.adoptRecovered 保证）。 */
    adopt(tag: LuggageTag): Promise<Blob | null>;
}
export declare function createCrashStore(kv: CrashKV): CrashStore;
export declare function idbCrashKV(): CrashKV;
/** 浏览器单例（懒开库：import 本身零 IDB 访问，node 测试 import 安全）。 */
export declare const crashStore: CrashStore;
