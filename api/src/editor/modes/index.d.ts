import type { Mode } from "../mode.ts";
/** 每个编辑器一份（工具模块有手势状态，不共用）。 */
export declare function workbenches(): readonly Mode[];
