import { type VSlider, type VSliderOpts } from "./ui/vslider.ts";
export interface DialSliderSpec extends VSliderOpts {
    readonly id: string;
    /** 下面那个图标（WeebPaint：笔粗 = brush-width、不透明度 = opacity）。 */
    readonly icon: string;
    title(): string;
    visible(): boolean;
}
export interface LeftDial {
    addSlider(spec: DialSliderSpec): VSlider;
    render(): void;
    flash(id: string): void;
}
export declare function mountLeftDial(stage: HTMLElement): LeftDial;
