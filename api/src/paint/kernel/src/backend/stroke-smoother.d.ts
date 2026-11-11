interface StrokeSmootherOpts {
    tau?: number;
    deadzone?: number;
    tailBow?: number;
}
export declare class StrokeSmoother {
    tau: number;
    r: number;
    bow: number;
    cx: number[];
    cy: number[];
    cp: number[];
    _committed: number;
    _tailLen: number;
    seq: number;
    _ox: number;
    _oy: number;
    _vx: number;
    _vy: number;
    _sx: number;
    _moved: boolean;
    _sy: number;
    _lastT: number | null;
    _lastP: number;
    _started: boolean;
    constructor(opts?: StrokeSmootherOpts);
    get count(): number;
    /** 这个 raw 点会不会让死区锚离开落笔点（或已经离开过）——起笔静止期 = 还没有。 */
    wouldMove(x: number, y: number): boolean;
    push(x: number, y: number, p: number, t: number | null | undefined): void;
    _buildTail(tp: number): number;
    finish(): void;
    frozenIndex(): number;
    update(): void;
}
export declare class PressureLPF {
    private tau;
    private p;
    private lastT;
    constructor(tau: number, p0: number, t0?: number | null);
    step(pressure: number, t?: number | null): number;
    /** 只对钟不积压感：值不动、时间原点挪到 t（起笔静止期用——顿多久都等于没顿）。 */
    rebase(t?: number | null): number;
}
export {};
