export interface BloomParams {
    readonly amount: number;
    readonly radius: number;
    readonly cap: number;
    readonly vignette: number;
}
export declare class Bloom {
    /** 辉光图（render3 往里画）：小图尺寸、半精度、自己的深度（被挡住的线不发光）。 */
    glow: any;
    private levels;
    private w;
    private h;
    private readonly scene;
    private readonly cam;
    private readonly quad;
    private readonly down;
    private readonly blur;
    private readonly comp;
    constructor();
    prepare(w: number, h: number): void;
    private pass;
    /** 辉光图 → 四级模糊 → 和颜色合成进 target（小图尺寸）。 */
    run(renderer: any, color: any, target: any, p: BloomParams): void;
    /** 显存（血槽位）：辉光图 8 字节 / 像素（半精度 RGBA）+ 深度 4 + 四级 × 2 张。 */
    bytes(): number;
    private disposeTargets;
    /** 只放显存（辉光整串）；材质留着，下次 prepare 重建（常驻表 residency.ts 调）。 */
    release(): void;
    dispose(): void;
}
