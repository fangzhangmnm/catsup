export interface VSliderOpts {
    readonly ariaLabel: string;
    value(): number;
    toPos(v: number): number;
    fromPos(p: number): number;
    onInput(v: number): void;
    /** 读数气泡里的字。 */
    readout(v: number): string;
    /** 键盘一下走一档（dir = +1 / −1）。 */
    step(v: number, dir: 1 | -1): number;
    onStart?(): void;
    onEnd?(): void;
}
export interface VSlider {
    readonly el: HTMLElement;
    render(): void;
    dragging(): boolean;
    flash(): void;
}
export declare function mountVSlider(parent: HTMLElement, o: VSliderOpts): VSlider;
