export type PressureLevel = "none" | "weak" | "mid" | "strong";
export declare const PRESSURE_LEVELS: readonly PressureLevel[];
export declare const DEFAULT_PRESSURE_LEVEL: PressureLevel;
export declare function isPressureLevel(v: unknown): v is PressureLevel;
/** 纯函数：按档位整形一个 0..1 的压感值。 */
export declare function applyPressureLevel(p: number, level: PressureLevel): number;
export declare function setPressureLevel(l: unknown): void;
export declare function getPressureLevel(): PressureLevel;
/** 输入层出口用：按当前档整形。 */
export declare function shapePressure(p: number): number;
