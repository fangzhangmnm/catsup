import { type FilterKernel, type FilterParams } from "./kernel.ts";
export interface HsbParams extends FilterParams {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    satMode: string;
}
export declare const HsbKernel: FilterKernel;
