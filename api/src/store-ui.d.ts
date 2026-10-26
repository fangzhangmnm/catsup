import type { StoreUI } from "@internal/store";
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
};
export declare const storeUI: StoreUI;
