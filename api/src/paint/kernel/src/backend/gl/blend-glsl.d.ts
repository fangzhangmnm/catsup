import type { BlendMode } from "../../common/blend-modes.ts";
export { BLEND_MODES } from "../../common/blend-modes.ts";
export type { BlendMode } from "../../common/blend-modes.ts";
export declare const COMPOSITE_VERT = "#version 300 es\nlayout(location=0) in vec2 a_pos;\nout vec2 v_uv;\nvoid main(){ v_uv = a_pos; gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0); }";
export type SourceKind = "tiled" | "group" | "overlay";
export declare function compositeFragSource(mode: BlendMode, src?: SourceKind, overlayMode?: BlendMode): string;
export declare function compositeProgramKey(mode: BlendMode, src?: SourceKind, overlayMode?: BlendMode): string;
