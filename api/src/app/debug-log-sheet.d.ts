import { lastStepEntry } from "./repro-box.ts";
/** 别处（图库卡住态钮 / 快捷键）也能开。 */
export declare function openDebugLogSheet(): void;
export declare function closeDebugLogSheet(): void;
export declare function isDebugLogOpen(): boolean;
/** 宿主递「上一步」提供者（Editor.lastStep）；没递 = 没那个钮。 */
export declare function setLastStepProvider(fn: () => Parameters<typeof lastStepEntry>[0] | null): void;
export declare function initDebugLogSheet(): void;
