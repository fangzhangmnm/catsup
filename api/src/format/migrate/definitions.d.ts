import { type Guid } from "../guid.ts";
export interface MigrationCtx {
    /** 这份文件的材质表：下标 → GUID（材质先于定义读，见 read.ts）。 */
    readonly materialGuids: readonly Guid[];
}
export declare function definitionsV6toV7(j: Record<string, unknown>, ctx: MigrationCtx): Record<string, unknown>;
