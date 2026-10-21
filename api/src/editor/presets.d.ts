import type { FaceEvent, Kernel, Pt } from "../kernel/kernel.ts";
export interface LabPreset {
    name: string;
    note: string;
    batches: [Pt, Pt][][];
    expectFaces: number;
}
export declare const PRESETS: LabPreset[];
/** 把预置摆进内核；返回每个 batch 的事件（供 lab 逐 batch 打日志）。 */
export declare function applyPreset(k: Kernel, preset: LabPreset): FaceEvent[][];
