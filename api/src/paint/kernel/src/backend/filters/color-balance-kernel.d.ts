import { type FilterKernel, type FilterParams } from "./kernel.ts";
export interface ColorBalanceParams extends FilterParams {
    shR: number;
    shG: number;
    shB: number;
    mR: number;
    mG: number;
    mB: number;
    hiR: number;
    hiG: number;
    hiB: number;
}
export declare const ColorBalanceKernel: FilterKernel;
