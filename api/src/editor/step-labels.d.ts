import type { Op } from "./ops.ts";
import type { StepLabel } from "./history.ts";
/** op → 一步的默认标签（中文动词；显式给了 step() 标签的用那个）。开放集：没登记的用 op 名。 */
export declare const OP_TITLES: Readonly<Record<string, string>>;
/** 画的一步（贴图主线 1-8a：一笔 = 三维的一步，没有指令、只有成分记录）。 */
export declare const PAINT_STEP_LABELS: {
    readonly stroke: {
        readonly title: "画一笔";
    };
    readonly erase: {
        readonly title: "擦一笔";
    };
};
export declare function opLabel(op: Op): StepLabel;
export declare function labelText(l: StepLabel | undefined): string;
