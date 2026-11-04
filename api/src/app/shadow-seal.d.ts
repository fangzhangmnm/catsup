/** 这个模型是从加密件解开来的。pw = null：口令已被忘掉（锁定 / 登出），还是封口的，只是写不了了。 */
export interface ShadowSeal {
    readonly pw: string | null;
}
export interface SealPorts {
    pack(bytes: Uint8Array, pw: string): Promise<Blob>;
    isContainer(b: Blob): Promise<boolean>;
}
export declare function shadowFrame(bytes: Uint8Array, seal: ShadowSeal | null, p: SealPorts): Promise<Blob | null>;
