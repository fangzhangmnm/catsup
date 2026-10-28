import type { BoolOption, EnumOption, NumberOption } from "./tool-config.ts";
export type ParamFieldDef = Pick<EnumOption, "kind" | "label" | "values"> | Pick<NumberOption, "kind" | "label" | "min" | "max" | "step" | "unit"> | Pick<BoolOption, "kind" | "label">;
export type ParamValue = string | number | boolean;
export interface ParamField {
    readonly key: string;
    readonly def: ParamFieldDef;
}
export interface ParamButton {
    readonly key: string;
    readonly label: string;
    readonly primary?: boolean;
    readonly on?: boolean;
}
export interface ParamPanelState {
    readonly phase: "before" | "after";
    readonly title: string;
    readonly fields: readonly ParamField[];
    readonly buttons: readonly ParamButton[];
    readonly values: Readonly<Record<string, ParamValue>>;
    /** 说明行（按当前值现算；段数的公差 / 适用对象，DT95）。 */
    readonly note?: string;
}
export interface ParamSession extends ParamPanelState {
    set(key: string, value: ParamValue): void;
    press(key: string): void;
    /** 这个会话还算不算数（马后炮：这一步之后又提交过别的 / 撤销过 = 作废）。不给 = 一直算。 */
    stale?(): boolean;
    /** 会话被别的会话顶掉 / 关掉时的收尾（马前炮：退出 gizmo、清预演）。 */
    dispose?(): void;
}
/**
 * 马后炮会话：刚提交的那一步占了 nOps 个操作；改值 = undoN(n) → redo(新值) → 重新数这一步占几个操作。
 * opCount 是编辑器的操作计数（撤销 / 重做 / 别的提交都会让它和记下的不一样 → 作废）。
 */
export declare function afterthought(o: {
    title: string;
    fields: readonly ParamField[];
    values: Record<string, ParamValue>;
    nOps: number;
    opCount: () => number;
    undoN: (n: number) => void;
    redo: (values: Readonly<Record<string, ParamValue>>) => void;
    /** 栈顶的身份（编辑器给「位置 / 深度」）：变了 = 作废。点选一下是 0 条 op 的一步，光看 opCount 看不出来（2026-10-28 设计稿 §7¾）。不给 = 只看 opCount。 */
    stackKey?: () => string;
    /** 说明行（每次画小窗时按当前值现算）。 */
    note?: (values: Readonly<Record<string, ParamValue>>) => string;
}): ParamSession;
