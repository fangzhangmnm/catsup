import type { HudModel } from "./hud-model.ts";
export declare const WRIST_PX: {
    readonly w: 512;
    readonly h: 520;
};
export declare const WRIST_M: {
    readonly w: 0.16;
    readonly h: 0.1625;
};
export declare class WristPanel {
    readonly canvas: HTMLCanvasElement;
    private ctx;
    private cells;
    private hover;
    private pressed;
    dirty: boolean;
    private model;
    constructor(model: HudModel);
    setHover(id: string | null): void;
    setPressed(id: string | null): void;
    hovered(): string | null;
    /** 面板 uv（0..1，v 从上往下）→ 格子 id。 */
    hit(u: number, v: number): string | null;
    /** 重画（dirty 时）；返回是否画了。 */
    redraw(force?: boolean): boolean;
    private cell;
}
