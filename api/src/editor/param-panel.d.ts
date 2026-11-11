import type { BoolOption, EnumOption, NumberOption } from "./tool-config.ts";
export type ParamFieldDef = Pick<EnumOption, "kind" | "label" | "values"> | Pick<NumberOption, "kind" | "label" | "min" | "max" | "step" | "unit" | "quantity"> | Pick<BoolOption, "kind" | "label">;
export type ParamValue = string | number | boolean;
export interface ParamField {
    readonly key: string;
    readonly def: ParamFieldDef;
    /** 按当前的值这一行灰掉吗（W-8：环切圈数 > 1 时「位置」那一行）。不给 = 不灰。 */
    readonly off?: (values: Readonly<Record<string, ParamValue>>) => boolean;
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
    /** 指针悬在 / 焦点在某一行上（null = 离开）：指令可以在模型上标出那一行说的东西（W-8：刀的「第 N 点」）。 */
    focus?(key: string | null): void;
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
    /** redo 返回 false = 按这组值做不成（它自己在提示行说原因、而且一条都没提交）：改的那个数退回原值、按原值重做一遍（W-8，Fable 11-10）。 */
    /** 退回重做那一遍 restoring = true：指令别写「成功」的提示（会盖掉刚说的原因）。 */
    opCount: () => number;
    undoN: (n: number) => void;
    redo: (values: Readonly<Record<string, ParamValue>>, restoring?: boolean) => void | false;
    /** 栈顶的身份（编辑器给「位置 / 深度」）：变了 = 作废。点选一下是 0 条 op 的一步，光看 opCount 看不出来（2026-10-28 设计稿 §7¾）。不给 = 只看 opCount。 */
    stackKey?: () => string;
    /** 说明行（每次画小窗时按当前值现算）。 */
    note?: (values: Readonly<Record<string, ParamValue>>) => string;
    /** 「确定」键（W-8，user 11-10「切割的马后炮应该有commit键」）：给了 = 小窗底下一颗主按钮「确定」，点了调它（编辑器 = 这一步定了、小窗收起）。 */
    done?: () => void;
    /** 悬在 / 焦点在某一行（ParamSession.focus）。 */
    focus?: (key: string | null) => void;
}): ParamSession;
/** 马后炮的「确定」：这一步定了、小窗收起（步子早就提交了，确定只是不再能改）。 */
export declare const OK_BUTTON: ParamButton;
