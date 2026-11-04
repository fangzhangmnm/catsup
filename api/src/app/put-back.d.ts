import { type VerifiedWritePorts } from "./home-move.ts";
export type PutBackResult = {
    status: "placed";
    identifier: string;
    password: string;
} | {
    status: "not-container";
} | {
    status: "cancelled";
} | {
    status: "not-a-model";
};
export interface PutBackPorts extends VerifiedWritePorts {
    isContainer(b: Blob): Promise<boolean>;
    /** 循环问口令直到对或取消；对了给解开的明文（只用来验证）。 */
    unlock(b: Blob): Promise<{
        pw: string;
        plain: Blob;
    } | null>;
    isModel(plain: Blob): Promise<boolean>;
}
export declare function putBack(file: Blob, identifier: string, p: PutBackPorts): Promise<PutBackResult>;
/** 文件名 → 图库身份：`模型.catsup.zip` / `模型.glb.zip` / `模型.zip` → `夹/模型<docExt>`。 */
export declare function identifierForFile(fileName: string, folder: string, docExt: string): string;
