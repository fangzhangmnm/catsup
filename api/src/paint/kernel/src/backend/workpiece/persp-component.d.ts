import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";
export interface PerspPt {
    x: number;
    y: number;
}
export interface PerspHost {
    /** 深拷贝 JSON 快照（workbench-state.snapshotShapePersp）。 */
    snapshot(): unknown;
    /** 整包还原（workbench-state.restoreShapePersp）。 */
    restore(snap: unknown): void;
    /** VP/box 坐标重映射（workbench-state.remapShapePersp）。 */
    remap(f: (p: PerspPt) => PerspPt, opts?: {
        unlockHorizon?: boolean;
    }): void;
}
export declare class PerspComponent implements CollectorComponent {
    readonly kind = "persp";
    private _wp;
    private _host;
    private _origin;
    constructor(wp: Workpiece, host: PerspHost);
    view(): unknown;
    /** doc 几何变换的 VP 重映射（token 写；doc-ops runDocTransform 的 compound 内调）。 */
    remapForDocTransform(f: (p: PerspPt) => PerspPt, opts?: {
        unlockHorizon?: boolean;
    }): void;
    /** 整包换配置（token 写；载入/程序化换配置用——persp-edit 交互走 commitPreApplied）。 */
    set(cfg: unknown): void;
    /** 记账写（pre-applied）：VP 编辑器一次拖动收口——desk 已被 transient 直写到位，
     *  before = 拖动起点快照（persp-edit pointerdown 拍）。净变化为零由 sealRecord 兜（不占步）。 */
    commitPreApplied(before: unknown): void;
    sealRecord(): RecordData | null;
    swapRecord(data: RecordData): RecordData;
    recordBytes(data: RecordData): number;
    disposeRecord(): void;
}
