import type { ParamField, ParamValue } from "../param-panel.ts";
export declare const LOOP_CUT_FIELDS: readonly ParamField[];
export declare const LOOP_CUT_DEFAULTS: Readonly<Record<string, ParamValue>>;
/** 小窗里的值 → 记录里的 t / cuts（夹到范围里；圈数取整）。 */
export declare function loopCutArgs(v: Readonly<Record<string, ParamValue>>): {
    t: number;
    cuts: number;
};
