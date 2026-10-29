import type { PasswordKeeper } from "@internal/encryption";
export interface RememberDeps {
    /** false = 这个形态不提供（同源的不只我们时；CatsUp 现在没有那种形态 = true）。 */
    enabled: boolean;
    keeper: () => PasswordKeeper;
    hasVerifier: () => boolean;
    checkVerifier: (pw: string) => Promise<"ok" | "bad" | "none">;
    setPassword: (pw: string) => void;
    onError: (e: unknown) => void;
    onRemembered?: (expiresAt: number) => void;
    now?: () => number;
}
/** 组装点调一次；测试再调一次换成内存版（会清掉状态）。 */
export declare function wireRememberPassword(deps: RememberDeps): void;
export declare function rememberedUntil(): number | null;
export declare function rememberAvailable(): boolean;
export declare function onRememberChange(cb: () => void): () => void;
/** 口令面板交回勾态（取消 = false）；重开面板时按它预勾。 */
export declare function setRememberChoice(v: boolean): void;
export declare function rememberChoice(): boolean;
/** 开页：试记着的口令。"unlocked" | "none"（没记 / 没验证器可比）| "stale"（对不上，已忘）。 */
export declare function restoreRemembered(): Promise<"unlocked" | "none" | "stale">;
/** 忘掉（幂等；在飞的那次直接复用）。 */
export declare function forgetRemembered(): Promise<void>;
