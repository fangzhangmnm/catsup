export interface LiftSample {
    /** 屏幕位置（CSS px）。 */
    readonly sx: number;
    readonly sy: number;
    /** 被处理的时刻（ms，performance.now()）。 */
    readonly t: number;
    /** 事件自己发生的时间（ms，PointerEvent.timeStamp）；键盘起手 / 程序造的没有。 */
    readonly at?: number;
}
export type LiftClock = "event" | "handled";
/** 一个样本的事件时间像不像样（和它被处理的时刻同一个起点）。抬笔结算和画画的一笔（app/paint-workbench.ts）共用这一个判据。 */
export declare function eventTimeUsable(at: number | undefined, handled: number): at is number;
/** 这一笔用哪种时钟：每个样本的事件时间都像样 = event；有一个不像样 = 整笔 handled（不混着减）。 */
export declare function liftClock(samples: readonly LiftSample[]): LiftClock;
/**
 * 落点 = 第几个样本（没有样本 = null）。holdScale = 画面高 / 800（HOLD_PX、DWELL_SLIP_PX 按 800 高的画面定的）。
 * clock 只给检查用（缺 = liftClock 按样本自己判）。
 */
export declare function settleLift(samples: readonly LiftSample[], holdScale: number, clock?: LiftClock): number | null;
