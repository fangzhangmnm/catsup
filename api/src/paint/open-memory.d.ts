/** 图块池起步几片（内核 gl-room.ts 构造函数里的 min(64, maxSlices)；三维给的 maxSlices 按额度算、总是 ≥ 64）。内核改了这个数，probe-paint-open-memory 逐字节对不上会红。 */
export declare const TILE_ARENA_START_SLICES = 64;
/** 画哪些面（面表 / 三角形表跟着它）：面数、三角形数（网格体的面 = 一圈 v 个点 → v − 2 个三角形）。不给 = 一张面一个三角形（表的最小那一份）。 */
export interface PaintTargetSize {
    readonly faces: number;
    readonly tris: number;
}
export interface OpenMemory {
    readonly display: number;
    readonly kernel: number;
    readonly cells: number;
    /** 内核的显卡图块池：起步那一份 / 第一笔之后（上沿）。 */
    readonly arena: number;
    readonly arenaAfterStroke: number;
    /** 每张图层一张索引小图（新开的画两张）+ 内核的 1 × 1 填色图。 */
    readonly index: number;
    /** 面表 + 三角形表（跟物件走）。 */
    readonly tables: number;
    /** 打开、画过一笔以后一直占着的（显示图 + 内核四张 + 图块池 + 每格的表 + 面表三角形表 + 索引小图）。还没落笔时少两张、图块池是起步那份（opened）。 */
    readonly fixed: number;
    /** 刚开始画、还没落笔时占着的。 */
    readonly opened: number;
    /** 一笔正在画的时候另外再多的（两张薄层）。 */
    readonly stroke: number;
}
/** n × hgt（缺 = 见方；补面加高过的画布比宽高，施工单十六的画布小窗按实际宽高报）；target = 画哪些面（缺 = 最小那一份）。 */
export declare function openMemory(n: number, hgt?: number, target?: PaintTargetSize): OpenMemory;
/** 网格体上这几张面的大小（面表 / 三角形表跟着它）。 */
export declare function paintTargetSize(k: {
    faceVerts(f: number): readonly number[];
}, faces: Iterable<number>): PaintTargetSize;
export declare function bytesSay(n: number): string;
