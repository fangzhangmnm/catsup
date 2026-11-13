export interface ImageViewHooks {
    /** 图上这一点（格）落在哪个编号上；没有 = null。 */
    pick(x: number, y: number): number | null;
    /** 鼠标悬停的编号变了（离开 = null）。 */
    hover?(id: number | null): void;
    /** 点了一下（没拖）：点中的编号，点空处 = null。 */
    click?(id: number | null): void;
    /**
     * 落笔（可选；施工单二十一第 2 刀）：按下那一下要不要当成画——宿主看手上的工具定（笔 / 鼠标左键）；手指永远是看（挪、缩），不来问。
     * 要 = 这一下之后的移动 / 抬起都交给 down / move / up（格坐标，可以带小数），不平移、不点选；画着时别的指针不理（一笔当中不挪不缩）。
     */
    stroke?: {
        wants(e: {
            readonly pointerType: string;
            readonly button: number;
        }): boolean;
        down(x: number, y: number, e: PointerEvent): void;
        move(x: number, y: number, e: PointerEvent): void;
        /** cancelled = pointercancel（系统收走了这个指针）。 */
        up(x: number, y: number, e: PointerEvent, cancelled: boolean): void;
    };
    /** 悬停时亮出来的笔印：这一点上手上的笔有多大（直径，格）；不画 = null。放大到看得见格子时，格心落在这个圆里的格也亮出来。 */
    brushAt?(x: number, y: number): number | null;
}
export interface ImageView {
    /** 换图（宽高 = 格数；图的像素和格一一对应）。null = 没有图（画底色）。 */
    setImage(src: CanvasImageSource | null, width: number, height: number): void;
    /** 线段（每条 4 个数 x0, y0, x1, y1，格）：thin = 细线、thick = 粗线；accent = 另一组粗线换个颜色画（三维那边用来画接缝；颜色是 CSS 颜色，这里不认识它是什么）。 */
    setLines(thin: Float32Array, thick: Float32Array, accent?: {
        readonly lines: Float32Array;
        readonly color: string;
    }): void;
    /** 按编号取多边形（选中 / 悬停时涂一层用）。 */
    setRings(ring: (id: number) => ArrayLike<number> | undefined): void;
    /** 垫在线下面的一层：faint = 淡淡盖一层的多边形（角上的 x, y…，格）；areas = 标出来的长方形（每个 4 个数 x0, y0, x1, y1，格）。这里不认识它们是什么（画布小窗：别的物件的面、空出来的地方）。 */
    setBackdrop(faint: readonly ArrayLike<number>[], areas: ArrayLike<number>): void;
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
