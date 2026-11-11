import type { FilterKernel } from "./kernel.ts";
export declare const FILTER_KERNELS: Readonly<Record<string, FilterKernel>>;
export declare function getFilterKernel(id: string): FilterKernel;
export type { FilterKernel, FilterParams } from "./kernel.ts";
export { clamp8 } from "./kernel.ts";
