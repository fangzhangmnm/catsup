export type DisplayPath = "auto" | "full" | "measure";
export declare const DISPLAY_PATHS: readonly DisplayPath[];
export declare const DISPLAY_PATH_LABELS: Readonly<Record<DisplayPath, string>>;
/** 显示图的缩小图怎么做（渲染器那边的名字）：每种走法对应一种。 */
export declare const MIPS_OF: Readonly<Record<DisplayPath, "region" | "full" | "driver">>;
/** 核对多少帧一次（另外每次抬笔之后一次）。 */
export declare const CHECK_EVERY = 30;
export declare const displayDiag: {
    path: DisplayPath;
    check: boolean;
    /** 刚抬过笔（落层了）：下一次画完一帧核对一次。 */
    penUp: boolean;
};
