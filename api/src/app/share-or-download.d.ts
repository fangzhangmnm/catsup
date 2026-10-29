export declare function preferShare(): boolean;
export declare function downloadFile(f: File): void;
/** 交文件：触屏 = 分享（取消 = 什么都不做；被拒 = 改下载），电脑 = 下载。say = 状态行回执。 */
export declare function deliverFile(f: File, title: string, say: (text: string) => void): Promise<void>;
