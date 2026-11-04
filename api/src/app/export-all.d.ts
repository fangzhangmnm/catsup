export interface ExportEntry {
    identifier: string;
    encrypted: boolean;
}
export interface ExportAllPorts {
    /** 一个文件夹的一帧本地列举（直属文件 + 子夹全路径）。 */
    listFolder(folder: string): Promise<{
        identifiers: string[];
        folders: string[];
    }>;
    /** 加密件 = 容器字节；不是加密件 = null。 */
    encryptedBytes(identifier: string): Promise<Blob | null>;
    /** 明文件的字节；拿不到 = null。 */
    plainBytes(identifier: string): Promise<Blob | null>;
    pack(entries: {
        path: string;
        data: Uint8Array;
    }[]): Promise<Blob>;
}
export interface ExportAllResult {
    zip: Blob | null;
    plain: number;
    encrypted: number;
    failed: string[];
}
export declare function exportAll(p: ExportAllPorts): Promise<ExportAllResult>;
/** 导出结果说一句人话。 */
export declare function exportAllSay(r: ExportAllResult, fileName: string): {
    text: string;
    bad: boolean;
};
