/** 两段字节一样吗（先比大小，再逐块比；不把整份留在内存里比字符串）。 */
export declare function sameBytes(a: Blob, b: Blob): Promise<boolean>;
/** 写口说「落了本机、没落进新家」（store save 返 pushed:false）。只有这种才把新家这份收走：它确实是我们刚写的。 */
export declare class NotLandedError extends Error {
    constructor(identifier: string, reason?: string);
}
export interface VerifiedWritePorts {
    /** 只新建（store mode:"new"）；撞名抛 name = "CloudNameCollisionError"；落了本机没落进新家抛 NotLandedError。 */
    writeNew(identifier: string, bytes: Blob): Promise<void>;
    /** 从新家真正的落点读 at-rest 字节（文件夹 = 夹里那个文件，不是缓存）；没有 = null。 */
    readBack(identifier: string): Promise<Blob | null>;
    /** 写坏了 / 没落地：把新家这份收走（进新家的回收站）。 */
    discard(identifier: string): Promise<void>;
    /** 第 n 次撞名换的名字（主干后面加 (n)，后缀不动）。 */
    renamed(identifier: string, n: number): string;
}
/** 写进新家并读回比过。返回最后用的身份（wrote = false：同名那份本来就一模一样，没重写）。不成就抛；新家只留比过的。 */
export declare function writeNewVerified(identifier: string, bytes: Blob, p: VerifiedWritePorts): Promise<{
    identifier: string;
    wrote: boolean;
}>;
export type MoveKind = "move" | "copy";
export interface ModelToMove {
    identifier: string;
    kind: MoveKind;
}
/** 这份该怎么搬（syncState = 库的列举状态）。null = 不归搬家管。 */
export declare function moveKindOf(syncState: string | null | undefined): MoveKind | null;
export interface HomeMovePorts extends VerifiedWritePorts {
    /** 源里的 at-rest 字节：加密件 = 容器，明文 = 原文。读不到 = null。 */
    read(identifier: string): Promise<Blob | null>;
    /** 比过字节之后从旧库移走（进旧库回收站）。只会对 kind = move 调。没进回收站要抛。 */
    removeFromSource(identifier: string): Promise<void>;
    onProgress?(done: number, total: number): void;
}
export interface HomeMoveResult {
    /** 字节核过、旧库已移走。 */
    moved: {
        from: string;
        to: string;
    }[];
    /** 字节核过、旧的留着（连着网盘的）。 */
    copied: {
        from: string;
        to: string;
    }[];
    /** 没搬成：旧库里那份一个字节没动。 */
    failed: {
        identifier: string;
        reason: string;
    }[];
    /** 新家里有了（字节核过），但旧库那份没移走：不丢，只是旧库还没空。 */
    stuck: {
        identifier: string;
        reason: string;
    }[];
}
export declare function moveToHome(items: readonly ModelToMove[], p: HomeMovePorts): Promise<HomeMoveResult>;
export type VerifierCarry = "copied" | "dest-has-own" | "source-has-none" | "dest-unknown" | "not-needed";
export interface VerifierCarryPorts {
    /** 源库的验证器（没有 = null）。 */
    source(): Promise<unknown | null>;
    /** 新家的验证器；known = 和新家真的对过一次（没对上 = 不知道）。 */
    dest(): Promise<{
        known: boolean;
        record: unknown | null;
    }>;
    /** 原样写进新家。 */
    write(record: unknown): Promise<void>;
}
export declare function carryVerifier(movedEncrypted: boolean, p: VerifierCarryPorts): Promise<VerifierCarry>;
/** 结果那句话后面接的一句（没事可说 = 空）。 */
export declare function verifierSay(c: VerifierCarry, home: string): string;
/** 这趟搬完，旧库算不算空了（全部搬成 / 拷成才算；拷过去的旧的留着不影响：它们的正本谱系在网盘）。 */
export declare const moveFinished: (r: HomeMoveResult) => boolean;
/** 结果说一句人话（带名单：UX 误导 = 数据安全缺陷，家族 10-26）。 */
export declare function moveSay(r: HomeMoveResult, home: string, nameOf: (identifier: string) => string): {
    text: string;
    bad: boolean;
};
