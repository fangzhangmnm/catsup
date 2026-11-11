import type { BlendMode } from "./blend-glsl.ts";
import type { LayerPixels } from "../tiles/tile-layer.ts";
export interface DocLeaf {
    isGroup: false;
    id: number;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    visible: boolean;
    pixels: LayerPixels;
}
export interface DocGroup {
    isGroup: true;
    id: number;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    visible: boolean;
    children: DocNode[];
}
export type DocNode = DocLeaf | DocGroup;
export declare function safeMode(mode: string): BlendMode;
