import type { StoreUI, ResolveChoice } from "@internal/store";
/** 2026-10-26（user「不弹模态，横幅 + 钮」；家族根 ai-docs/20261026-cloud-conflict-ux-postmortem.md §5 C2）：
 *  **自动保存（implicit）撞上云端时不弹模态面**——返回库自己的默认值 `cancel`（= 留脏、两边一个字节不动；库 JSDoc「默认 cancel=留 dirty」允许的唯一默认），
 *  同时把这次「要你处理」交给 app 点亮编辑器横幅（session.markAttention → 横幅上的「处理…」= 人主动叫面）。
 *  显式保存 / 图库「处理…」/ 打开时的面照旧弹。这不是替人回答方向（10-16「禁止越狱」）：cancel 不换任何字节、不传任何字节。 */
export declare const conflictGate: {
    implicit: boolean;
    onDeferred: ((ctx: {
        name: string;
        cloudState: string | null;
    }) => void) | null;
    /** 冲突面选了「云端覆盖本地」：库接下来要换字节（safePull 没有 busy 键）→ session 在这一刻上罩子。只在 session 自己的保存 / 处理路径上挂。 */
    onTakeCloud: ((name: string) => void) | null;
    /** 面弹出来了：人在看着，闸门的硬超时别打断。 */
    onFace: (() => void) | null;
    /** 打开时那张面最后选了什么（库的 open() 只回字节；session 据此决定要不要整份重载）。 */
    lastOpenChoice: ResolveChoice | null;
    /** 闸门这一轮的逃生信号（罩子上的「先离线用」）；不在闸门里 = null，走下面 offlineEscape 那条通知。 */
    escapeProbe: (() => Promise<void> | null) | null;
};
export declare const storeUI: StoreUI;
