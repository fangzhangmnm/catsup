/** 新元素的来历种类（columns.ts EdgeOrigin / FaceOrigin 的 kind）。 */
export type Birth = "piece" | "copy" | "joined" | "grown" | "fresh";
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
