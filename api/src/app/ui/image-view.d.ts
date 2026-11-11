export interface ImageViewHooks {
    /** 图上这一点（格）落在哪个编号上；没有 = null。 */
    pick(x: number, y: number): number | null;
    /** 鼠标悬停的编号变了（离开 = null）。 */
    hover?(id: number | null): void;
    /** 点了一下（没拖）：点中的编号，点空处 = null。 */
    click?(id: number | null): void;
}
export interface ImageView {
    /** 换图（宽高 = 格数；图的像素和格一一对应）。null = 没有图（画底色）。 */
    setImage(src: CanvasImageSource | null, width: number, height: number): void;
    /** 线段（每条 4 个数 x0, y0, x1, y1，格）：thin = 细线、thick = 粗线。 */
    setLines(thin: Float32Array, thick: Float32Array): void;
    /** 按编号取多边形（选中 / 悬停时涂一层用）。 */
    setRings(ring: (id: number) => ArrayLike<number> | undefined): void;
    /** 选中的编号 + 悬停的编号。 */
    setMarks(selected: Iterable<number>, hover: number | null): void;
    /** 整张图放进窗口。 */
    fit(): void;
    /** 现在一格几个屏幕像素。 */
    scale(): number;
    /** 图上一点（格）在窗口里的位置（CSS 像素，相对画布左上角；探针用）。 */
    toScreen(x: number, y: number): {
        x: number;
        y: number;
    };
    dispose(): void;
}
export declare function mountImageView(host: HTMLElement, hooks: ImageViewHooks): ImageView;
