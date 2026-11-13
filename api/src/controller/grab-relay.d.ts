import type { PressHit } from "./hard-press.ts";
/** 这一点下面是什么（编辑器的只读查询 Editor.pressKindAt；null = 这把工具不说）。 */
export type PressKind = "handle" | "thing" | "empty";
/** 递给编辑器的动作：按下（带意思）/ 移动（悬停或拖，编辑器自己看手势在不在）/ 松手 / 作废这一下手势（框到一半来了重按）。 */
export type RelayAction = {
    readonly a: "down";
    readonly x: number;
    readonly y: number;
    readonly intent: "select" | "grab" | null;
} | {
    readonly a: "move";
    readonly x: number;
    readonly y: number;
} | {
    readonly a: "up";
    readonly x: number;
    readonly y: number;
} | {
    readonly a: "abort";
};
export interface RelayEnv {
    kindAt(x: number, y: number): PressKind | null;
    /** 编辑器正在一下手势里（键盘起手跟着走、上一下没收）。 */
    busy(): boolean;
    hasActableSelection(): boolean;
    /** 点按容差（画布像素）：轻点走出这么远就不算点。 */
    readonly slop: number;
}
type Mode = "seek" | "handle" | "box" | "grab";
/** 笔轻按落在空处再拖：seek = 只找位置（现在，user 11-13）；box = 框选（之前统筹定过、又改了）。只此一处。 */
export declare const LIGHT_EMPTY_DRAG: "seek" | "box";
export declare class GrabRelay {
    private mode;
    private readonly emptyDrag;
    constructor(emptyDrag?: "seek" | "box");
    private land;
    private travel;
    private pressed;
    /** 现在在做什么（探针 / 调试看）。 */
    get state(): Mode;
    down(at: {
        x: number;
        y: number;
    }, hit: PressHit | null, env: RelayEnv): RelayAction[];
    move(at: {
        x: number;
        y: number;
    }): RelayAction[];
    hard(hit: PressHit, env: RelayEnv): RelayAction[];
    up(at: {
        x: number;
        y: number;
    }, env: RelayEnv): RelayAction[];
}
export {};
