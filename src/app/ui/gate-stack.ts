// gate-stack.ts —— 同步闸门的纯逻辑（零 DOM，node 能测）：谁在罩着、顶上是哪一张、点了 / 收了之后谁拿到什么。created 2026-11-03 by Claude Opus 5.5（工单 C）
//   形状照 WeebPaint src/sheets.ts 的 lockSyncGate / settleSyncGate，多修一处：WeebPaint 那版只有一个 _pendingResolve，第二张顶上来时第一张的 promise 永远不回。
//   CatsUp 的「核对中」罩子和「正在拉取」罩子会叠（核对的时候发现要拉），所以这里是栈：收掉上面那张，下面那张还在、输入还锁着。
export interface GateAction<T> {
  label: string;
  value: T;
  primary?: boolean;
  /** 在点击的同步栈里调（resolve 之前）。iOS 红线：loginRedirect 从 Promise 续体起跳可能已丢 transient activation，被静默拦（WeebPaint topbar-menu 同款；工单 C4）。 */
  onPick?: () => void;
}
export interface GateView<T = unknown> {
  title: string;
  message?: string;
  note?: string;
  showSpinner?: boolean;
  /** 按 Esc = 这个值（「稍后」这类不用决定的面）；不给 = Esc 不管用。 */
  escValue?: T;
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
interface Entry { view: GateView<unknown>; resolve: (v: unknown) => void; open: boolean }

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
export function createGateStack(render: (top: GateView<unknown> | null) => void): GateStack {
  const stack: Entry[] = [];
  const paint = (): void => render(stack.length ? stack[stack.length - 1].view : null);
  const finish = (e: Entry, v: unknown): void => {
    if (!e.open) return;
    e.open = false;
    const i = stack.indexOf(e);
    if (i >= 0) stack.splice(i, 1);
    paint();
    e.resolve(v);
  };
  return {
    open<T>(view: GateView<T>): GateHandle<T> {
      let entry!: Entry;
      const result = new Promise<T | null>((resolve) => {
        entry = { view: view as GateView<unknown>, resolve: resolve as (v: unknown) => void, open: true };
      });
      stack.push(entry);
      paint();
      return {
        result,
        update: (v) => { entry.view = { ...entry.view, ...(v as Partial<GateView<unknown>>) }; if (stack[stack.length - 1] === entry) paint(); },
        close: (value = null) => finish(entry, value),
        isOpen: () => entry.open,
      };
    },
    settleTop: (value = null) => { const e = stack[stack.length - 1]; if (e) finish(e, value); },
    isUp: () => stack.length > 0,
    top: () => (stack.length ? stack[stack.length - 1].view : null),
    pick: (i) => { const e = stack[stack.length - 1]; const a = e?.view.actions[i]; if (e && a) { a.onPick?.(); finish(e, a.value); } },
    depth: () => stack.length,
  };
}

/** 闸门开着时这个事件该不该吞（DOM 那边在 window 捕获阶段问它）：只放行闸门自己和叠在上面的面（库的冲突面要能点）。 */
export function gateSwallowsEvent(up: boolean, target: { closest?: (sel: string) => unknown } | null): boolean {
  if (!up) return false;
  return !target?.closest?.("#syncGate, #sheet");
}
