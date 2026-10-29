/** 口令输入面板的注入形状（由组装点提供，无 DOM 依赖）。 */
export interface PromptOpts {
    title?: string;
    message?: string;
    /** 验得了的统一口令面板 = true：给「在这台设备上记住」的勾（别的口令的文件不给）。 */
    offerRemember?: boolean;
    /** 真表单（user 10-21「口令面板改成真表单让 Edge 密码管理器记住」）：设口令的面板 = "new"（autocomplete=new-password）；缺省 = 输入已有口令（current-password）。 */
    purpose?: "current" | "new";
}
type PasswordPrompt = (opts: PromptOpts) => Promise<string | null>;
type LockChangeSub = (unlocked: boolean) => void;
export declare function setPasswordPrompt(fn: PasswordPrompt): void;
export declare function isUnlocked(): boolean;
export declare function setPassword(pw: string | null): void;
/** 锁定 = 忘掉一切口令（内存清除）。加密文件回到锁样式；保存路径会明确说「锁着」而不是静默。 */
export declare function lock(): void;
/** 锁态变化订阅（图库刷新用）。返回退订函数。 */
export declare function onLockChange(cb: LockChangeSub): () => void;
/** 统一口令变了（设 / 锁定 = null）。只给 remember-password.ts 用。 */
export declare function onCurrentPasswordChange(cb: (pw: string | null) => void): () => void;
/** 弹一次口令输入（不入库、不验证）。app 没注入面板 → throw（组装错误，早炸）。 */
export declare function promptPassword(opts?: PromptOpts): Promise<string | null>;
export declare function getPassword(name: string | null): string | null;
export declare function setFilePassword(name: string, pw: string): void;
export declare function forgetFilePassword(name: string): void;
export declare function onPasswordVerified(name: string, pw: string): void;
export {};
