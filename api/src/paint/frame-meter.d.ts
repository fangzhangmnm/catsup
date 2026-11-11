export declare const METER_SEGS: readonly ["input", "rays", "walk", "reach", "layer", "compose", "copy", "scene"];
export type MeterSeg = (typeof METER_SEGS)[number];
export declare const METER_LABELS: Readonly<Record<MeterSeg, string>>;
export type MeterFrame = Record<MeterSeg, number>;
export declare const paintMeter: {
    /** 开关（画画工作台工具条上的「读数」；只在这一次打开里记）。 */
    on: boolean;
    cur: MeterFrame;
    /** 开着 = 现在的时间；关着 = 0（不调 performance.now）。 */
    now(): number;
    /** 这一段从 t0 到现在的时间记进这一帧（关着什么都不做）。 */
    add(seg: MeterSeg, t0: number): void;
    /** 直接记一个量好的数（别处已经量了的：合成、拷贝、渲染）。 */
    put(seg: MeterSeg, ms: number): void;
    /** 一帧完了：交出这一帧的数，清零开始下一帧。 */
    endFrame(): MeterFrame;
};
