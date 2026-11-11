export interface PressureRec {
    lastP?: number | null;
    smP?: number;
}
export declare function effectivePressure(rec: PressureRec, pointerType: string | undefined, pressure: number | undefined, fallback: number | undefined, alpha: number): number;
