import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";
interface PendingBox {
    color: string;
}
export declare class PendingFill implements CollectorComponent {
    readonly kind = "pendingFill";
    private _wp;
    private _cur;
    private _origin;
    constructor(wp: Workpiece);
    view(): Readonly<PendingBox> | null;
    /** 进 fill 工具（导航态，不记账）：以当前笔刷色起步。 */
    begin(initColor: string): void;
    /** 出 fill 工具（导航态，不记账）。 */
    clear(): void;
    /** 预览直写（拖拽中间值 / 无预览期换 seed，不记账；记账由防抖 flush 走 commitPreApplied）。 */
    setColorLive(hex: string): void;
    /** 记账写（pre-applied）：当前值已上台，before = 防抖窗口起点的旧色。 */
    commitPreApplied(before: string): void;
    /** 记账清：fill commit 整点内清 seed（undo fill → seed 随 step 还原）。 */
    clearRecorded(): void;
    sealRecord(): RecordData | null;
    swapRecord(data: RecordData): RecordData;
    recordBytes(): number;
    disposeRecord(): void;
}
export {};
