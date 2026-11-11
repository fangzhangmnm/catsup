import type { FilterKernel, FilterParams } from "./kernel.ts";
import { type ColorRamp } from "../../common/color-ramp.ts";
export interface GradientMapParams extends FilterParams {
    ramp: ColorRamp;
}
export declare const GradientMapKernel: FilterKernel;
