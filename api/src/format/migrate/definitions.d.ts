import { type Guid } from "../guid.ts";
export interface MigrationCtx {
    /** 这份文件的材质表：下标 → GUID（材质先于定义读，见 read.ts）。 */
    readonly materialGuids: readonly Guid[];
    /** 指着的东西不在（材质槽的序号越界 / 父组的序号找不到）：按以前的修法照旧当没有，但要记一笔（read.ts 记进 readNotes，打开时说；统筹 11-12 存盘忠实度清点 R1、R2）。 */
    readonly dangling?: (what: "materialSlot" | "parent") => void;
}
export declare function definitionsV6toV7(j: Record<string, unknown>, ctx?: MigrationCtx): Record<string, unknown>;
