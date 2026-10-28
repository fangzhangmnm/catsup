export interface WorkBar {
    /** 露出来（label = 读屏 / 悬停字）；返回的 Promise 在条真的画上屏以后才 resolve（两帧），调用方等它再开跑。 */
    show(label: string): Promise<void>;
    hide(): void;
}
export declare function mountWorkBar(parent?: HTMLElement): WorkBar;
