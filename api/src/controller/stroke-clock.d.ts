export declare class StrokeClock {
    /** 这一笔按事件时间（false = 按处理时刻）。 */
    readonly event: boolean;
    private readonly t0;
    private readonly h0;
    private last;
    private lastPressure;
    /** 落笔：at = 落笔那一下的事件时间（没有 = 程序造的），handled = 它被处理的时刻（performance.now()）。 */
    constructor(at: number | undefined, handled: number);
    /** 这个样本在这一笔里是第几毫秒（落笔 = 0，不往回走）。 */
    time(at: number | undefined, handled: number): number;
    /** 这个样本的压感（0..1）。 */
    pressure(pointerType: string | undefined, pressure: number | undefined): number;
}
