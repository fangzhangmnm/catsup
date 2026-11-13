/** 新元素的来历种类（columns.ts EdgeOrigin / FaceOrigin 的 kind）；given = 凭空来的、但带着调用的人给的值（并物件把整张面 / 整条边连同每一列搬过来）——算带值的那一类。 */
export type Birth = "piece" | "copy" | "joined" | "grown" | "fresh" | "given";
/** 一个操作在典型例子里造出来的新边、新面各是哪几种来历。 */
export interface OpBirths {
    readonly edges: readonly Birth[];
    readonly faces: readonly Birth[];
}
/** 一个文件：一句话说清楚 + 改元素的函数各自的来历 + 不造元素的函数（纯算、查询、只挪点不算——只挪点的照样进 ops，来历写空，测试看它不改值）。 */
export interface OpsRow {
    readonly say: string;
    readonly ops: Readonly<Record<string, OpBirths>>;
    readonly helpers?: readonly string[];
}
export declare const OPS: Readonly<Record<string, OpsRow>>;
/**
 * ops 文件夹以外造元素的地方（统筹 11-13 深夜：探针列和守卫的名单扩到这几处）。allExports = 这个文件每个导出的函数都要在 ops 或 helpers 里；
 * 否则只核列出来的函数还在、还导出着。走剪贴板 / 文件的（editor/transfer.ts、mesh/mesh-doc.ts）现在不盖：等用户自己加的列进文件时一起。
 */
export declare const ELSEWHERE: Readonly<Record<string, OpsRow & {
    readonly allExports: boolean;
}>>;
