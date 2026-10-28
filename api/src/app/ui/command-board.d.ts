export interface BoardPosStore {
    get(id: string): {
        x: number;
        y: number;
    } | null;
    set(id: string, p: {
        x: number;
        y: number;
    } | null): void;
}
export interface BoardOpts {
    id: string;
    title: string;
    body: HTMLElement;
    /** 没记过位置时放哪（左上角坐标，CSS px）。 */
    defaultPos: () => {
        x: number;
        y: number;
    };
    store: BoardPosStore;
    /** 关了（任何原因：关钮 / 被别的板顶掉 / 调用方关）——调一次。 */
    onClose?: () => void;
    /** 抽屉模式开了（手机竖屏）：调用方把占同一个底部位置的东西（物品栏）收起来。 */
    onDrawer?: () => void;
}
export interface BoardHandle {
    readonly id: string;
    readonly el: HTMLElement;
    close(): void;
    setTitle(t: string): void;
    place(): void;
}
export declare function currentBoard(): BoardHandle | null;
export declare function closeBoard(): void;
/** 手机竖屏 = 底部抽屉（短边窄、竖着拿）。 */
export declare const boardAsDrawer: () => boolean;
export declare function openBoard(o: BoardOpts): BoardHandle;
