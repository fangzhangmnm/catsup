export declare const BLEND_MODES: readonly ["source-over", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"];
export type BlendMode = (typeof BLEND_MODES)[number];
export declare function blendChannel(mode: BlendMode, Cb: number, Cs: number): number;
