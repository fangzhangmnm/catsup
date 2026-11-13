/** 一下按键算不算实体键盘（纯判，不改状态）。 */
export declare function isPhysicalKey(ev: {
    isTrusted: boolean;
    key: string;
    keyCode?: number;
    isComposing?: boolean;
    target: unknown;
}): boolean;
/** 这次打开之后按过实体键盘吗。 */
export declare function keyboardSeen(): boolean;
/** keydown 进来先问这里（app 的键盘入口，捕获阶段）。第一次算数时通知一次。 */
export declare function noteKeyEvent(ev: Parameters<typeof isPhysicalKey>[0]): void;
/** 按过的那一刻通知（已经按过 = 马上通知）。 */
export declare function onKeyboardSeen(f: () => void): () => void;
