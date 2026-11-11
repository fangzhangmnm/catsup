export interface OpenMemory {
    readonly display: number;
    readonly kernel: number;
    readonly cells: number;
    /** 打开、画过一笔以后一直占着的（显示图 + 内核四张 + 每格的表）。还没落笔时少两张（opened）。 */
    readonly fixed: number;
    /** 刚开始画、还没落笔时占着的（内核只有合成目标和预借的那两张）。 */
    readonly opened: number;
    /** 一笔正在画的时候另外再多的。 */
    readonly stroke: number;
}
/** n × hgt（缺 = 见方；补面加高过的画布比宽高，施工单十六的画布小窗按实际宽高报）。 */
export declare function openMemory(n: number, hgt?: number): OpenMemory;
/** 字节念成 MB / KB。 */
export declare function bytesSay(n: number): string;
