export declare function showBusy(label: string, hint?: string): void;
export declare function hideBusy(): void;
export declare function isBusyActive(): boolean;
export declare function withBusy<T>(label: string, fn: () => Promise<T> | T, hint?: string): Promise<T>;
/**
 * 同步闸门（WeebPaint lockSyncGate 同款思路；2026-10-25 Opus）：库在忙碌中途要问人（「处理…」= store file.resolve() 的三选一，图库库把它包在 busy 里）
 * → 这一个面板允许开在忙碌遮罩之上：开的时候先把遮罩收起、选完还在忙就放回去。别的面板仍守「busy 中不许开」的护栏。
 * user 2026-10-25 真机截图「没处理成：…sheet "choice" opened while busy overlay is active (would deadlock)…」。冲突必须摆出来问人（MASTER §A），这里只管让它摆得出来。
 */
export declare function openGateChoiceSheet<T>(title: string, message: string, choices: Choice<T>[]): Promise<T | null>;
export declare function initSheets(): void;
export interface ConfirmOpts {
    danger?: boolean;
    okLabel?: string;
    cancelLabel?: string;
    warning?: boolean;
}
export declare function openConfirmSheet(title: string, message: string, opts?: ConfirmOpts): Promise<boolean>;
export interface InputOpts {
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    okLabel?: string;
    validate?: (value: string) => string | null;
}
/** 输入 sheet → string | null（取消）。 */
export declare function openInputSheet(title: string, opts?: InputOpts): Promise<string | null>;
export interface PasswordOpts {
    message?: string; /** "new" = 设口令（autocomplete=new-password，密码管理器问「保存？」）；缺省 = 输入已有口令（current-password）。 */
    purpose?: "current" | "new"; /** 账号字段（密码管理器按它记 / 填）：图库 id。 */
    account?: string; /** 面板底下一个勾（「在这台设备上记住」）。 */
    checkbox?: {
        label: string;
        checked?: boolean;
    };
}
/** 口令 sheet（2026-10-29 周账 F-123）：真表单 = type=password + autocomplete + 隐藏的账号字段 + 确定 = 提交（user 10-21「口令面板改成真表单让 Edge 密码管理器记住，全家做」）。
 *  绝不 autocomplete="off"、不禁粘贴。返回 { value, checked } | null（取消）。 */
export declare function openPasswordSheet(title: string, opts?: PasswordOpts): Promise<{
    value: string;
    checked: boolean;
} | null>;
/** onPick：在按钮 click 监听器里**同步**调——iOS 的 redirect 登录必须在手势同步栈起跳。 */
export interface Choice<T> {
    label: string;
    value: T;
    primary?: boolean;
    danger?: boolean;
    onPick?: () => void;
}
export declare function openChoiceSheet<T>(title: string, message: string, choices: Choice<T>[]): Promise<T | null>;
/** 表单 sheet 的一行：几个选项选一个（分段钮）；hidden(当前值) = true 时这一行不露（如 OBJ 没有贴图 / 边线可选）。 */
export interface FormField {
    key: string;
    label: string;
    options: readonly {
        value: string;
        label: string;
    }[];
    value: string;
    hidden?: (v: Readonly<Record<string, string>>) => boolean;
}
export interface FormOpts {
    okLabel?: string;
    note?: (v: Readonly<Record<string, string>>) => string;
}
/**
 * 表单 sheet → 各行的值 | null（取消 / Esc / 点背板）。模态：锁屏、认真答、答完消失（UX 心智模型 §8 补 4「模态 sheet」；导出模型就是它）。
 * 每改一个值：重画（隐藏行跟着变）+ 说明行按 note(值) 重算。created 2026-10-28 by Claude Opus 5.5
 */
export declare function openFormSheet(title: string, fields: readonly FormField[], opts?: FormOpts): Promise<Record<string, string> | null>;
