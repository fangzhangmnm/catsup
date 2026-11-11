import type { Op } from "./ops.ts";
import type { StepLabel } from "./history.ts";
/** op → 一步的默认标签（中文动词；显式给了 step() 标签的用那个）。开放集：没登记的用 op 名。 */
export declare const OP_TITLES: Readonly<Record<string, string>>;
export declare function opLabel(op: Op): StepLabel;
export declare function labelText(l: StepLabel | undefined): string;
