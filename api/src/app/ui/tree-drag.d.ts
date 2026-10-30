export interface TreeRow {
    readonly depth: number;
}
export type TreeDrop = 
/** 放进 parent 那一行（当它的孩子）。 */
{
    readonly kind: "into";
    readonly parent: number;
}
/** 插进 parent（−1 = 最外层）的孩子里、before 那一行前面（null = 排最后）；插入线画在 lineAfter 那一行下面、缩进到 depth。 */
 | {
    readonly kind: "insert";
    readonly parent: number;
    readonly before: number | null;
    readonly depth: number;
    readonly lineAfter: number;
};
/** i 那一行的子孙到哪为止（不含）。 */
export declare function subtreeEnd(rows: readonly TreeRow[], i: number): number;
/** 落点（纯函数）：at.row = 指针在哪一行（越界按最近的那行）、fy = 在那一行里的竖向位置 0..1、depth = 想要的深度（宿主按横向挪了几格缩进算）。 */
export declare function dropAt(rows: readonly TreeRow[], dragged: number, at: {
    row: number;
    fy: number;
    depth: number;
}, opts?: {
    minDepth?: number;
    edge?: number;
}): TreeDrop | null;
export interface TreeDragOpts {
    /** 一行的选择器（列表里按出现顺序 = rows() 的顺序）。 */
    readonly rowSelector: string;
    rows(): readonly TreeRow[];
    /** 一格缩进多少像素（判深度 + 插入线缩进）。 */
    readonly indent: number;
    /** 第 0 层插入线的左缘（像素，相对列表）。 */
    readonly lineLeft: number;
    readonly minDepth?: number;
    /** 自动滚的那个元素（缺 = 列表自己）。 */
    readonly scroller?: HTMLElement;
    canDrag?(row: number): boolean;
    onDrop(dragged: number, drop: TreeDrop): void;
    /** 手指长按起拖、没挪就松手。 */
    onHold?(row: number, el: HTMLElement): void;
}
/** 把拖拽挂到列表上（事件委托：列表内容重画不掉）。返回拆掉的函数。列表要 position: relative（插入线按它定位）。 */
export declare function attachTreeDrag(list: HTMLElement, opts: TreeDragOpts): () => void;
