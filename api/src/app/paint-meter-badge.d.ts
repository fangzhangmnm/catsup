import { type MeterFrame } from "../paint/frame-meter.ts";
export interface PaintMeterBadge {
    /** 编辑器画完一帧（afterRender）：关着 = 什么都不做。 */
    frame(): void;
    /** 露不露：开着 ∧ 在画画工作台（宿主按工具判）。 */
    sync(visible: boolean): void;
    /** 开关（工具条「读数」）。打开时清掉攒着的半帧。 */
    toggle(): boolean;
    /** 探针（1-4d 第 10 条，连续画 300 帧）：record(true) 开始逐帧记（每一帧各段 + 合计 + 是不是核对那一帧 + 这一帧画完的时刻 t），record(false) 停、交回记下的。读数要开着才有数。 */
    record(on: boolean): (MeterFrame & {
        total: number;
        checked: boolean;
        t: number;
    })[] | null;
    /** 探针：最近一秒的读数。 */
    snapshot(): {
        frames: number;
        avg: Record<string, number>;
        max: Record<string, number>;
        gapMs: number;
        dropped: number;
        checks: number;
        mismatches: number;
        skipped: number;
    };
}
export declare function mountPaintMeterBadge(o: {
    sceneMs(): number;
    copyMs(): number;
    mipsMs(): number;
    pathLabel(): string;
    check(): boolean;
}): PaintMeterBadge;
