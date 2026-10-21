export type ErrorLevel = "error" | "warning" | "info" | "log";
export declare function errToText(err: unknown): string;
export declare function reportError(err: unknown, level?: ErrorLevel): void;
