export interface GateAction<T> {
    label: string;
    value: T;
    primary?: boolean;
}
export interface GateView<T = unknown> {
    title: string;
    message?: string;
    note?: string;
    showSpinner?: boolean;
    /** 不可点外面关掉（决策只能按钮选）；空数组 = 没有按钮的纯罩子——调用方必须自己保证有出口。 */
    actions: readonly GateAction<T>[];
}
export interface GateHandle<T> {
    /** 点了按钮 = 那个值；close() / 外面收掉 = 传进来的值（缺省 null）。 */
    readonly result: Promise<T | null>;
    update(v: Partial<GateView<T>>): void;
    close(value?: T | null): void;
    isOpen(): boolean;
}
export interface GateStack {
    open<T>(view: GateView<T>): GateHandle<T>;
    /** 收掉最上面那张（WeebPaint settleSyncGate 同义）；没有就什么都不做。 */
    settleTop(value?: unknown): void;
    /** 有罩子 = 输入锁着。 */
    isUp(): boolean;
    top(): GateView<unknown> | null;
    /** 顶上那张的第 i 个按钮被点了。 */
    pick(i: number): void;
    depth(): number;
}
/** render 在每次顶上那张变了的时候调（null = 全收了）；DOM 那边（sheets.ts）只管照着画。 */
export declare function createGateStack(render: (top: GateView<unknown> | null) => void): GateStack;
/** 闸门开着时这个事件该不该吞（DOM 那边在 window 捕获阶段问它）：只放行闸门自己和叠在上面的面（库的冲突面要能点）。 */
export declare function gateSwallowsEvent(up: boolean, target: {
    closest?: (sel: string) => unknown;
} | null): boolean;
