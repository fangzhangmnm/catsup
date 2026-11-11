export interface PaintMeterBadge {
    /** 编辑器画完一帧（afterRender）：关着 = 什么都不做。 */
    frame(): void;
    /** 露不露：开着 ∧ 在画画工作台（宿主按工具判）。 */
    sync(visible: boolean): void;
    /** 开关（工具条「读数」）。打开时清掉攒着的半帧。 */
    toggle(): boolean;
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
