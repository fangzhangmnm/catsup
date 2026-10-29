export interface VerifierRecord {
    v: 1;
    salt: string;
    iv: string;
    ct: string;
}
export interface VerifierStore {
    get(): VerifierRecord | null;
    set(rec: VerifierRecord | null): void;
}
export declare function createVerifierRecord(pw: string): Promise<VerifierRecord>;
export declare function verifyRecord(rec: VerifierRecord, pw: string): Promise<boolean>;
export declare const isVerifierRecord: (x: unknown) => x is VerifierRecord;
export declare function wireVerifierStore(s: VerifierStore | null): void;
export declare function hasVerifier(): boolean;
/** 记住「图库口令 = pw」（覆盖旧验证器；创建 / 首次验证成功时调）。没接库（无地）= 不记（无地没有图库口令这回事）。 */
export declare function createVerifier(pw: string): Promise<void>;
export declare function clearVerifier(): void;
/** 校验：ok = 口令对；bad = 口令错；none = 没有验证器（老账号未迁 / 已重置 / 无地）。 */
export declare function checkVerifier(pw: string): Promise<"ok" | "bad" | "none">;
