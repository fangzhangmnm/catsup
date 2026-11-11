export declare function holdUntilSettled(p: Promise<unknown>, maxMs: number, timers?: {
    setTimeout: (fn: () => void, ms: number) => unknown;
    clearTimeout: (h: unknown) => void;
}): Promise<"settled" | "timeout">;
