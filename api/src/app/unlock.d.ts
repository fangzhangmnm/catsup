export declare function ensureUnlocked(name: string): Promise<boolean>;
/** 解锁一段外来的加密容器字节（本地文件）。返回 { pw, plain }：验过的口令 + 解出来的明文；取消 → null。一次尝试 = 一次解密。 */
export declare function unlockImportedContainer(blob: Blob): Promise<{
    pw: string;
    plain: Blob;
} | null>;
export declare function ensureNewPassword(): Promise<string | null>;
/** 这次 ensureNewPassword 会不会走「创建」：既没解锁也没验证器。在 ensureNewPassword **之前**取值。 */
export declare function isFreshPasswordSetup(): boolean;
/** 首次创建的口令没能加密成任何一件 → 验证器 + 内存口令一起撤销，图库回到「未设口令」。只在 isFreshPasswordSetup() 为真时调。 */
export declare function rollbackFreshPassword(): void;
