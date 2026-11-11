export type Component = "ora" | "desk" | "timelapse" | "brush" | "rackMeta";
export type JsonComponent = Exclude<Component, "ora">;
export interface Stamp {
    major: number;
    minor: number;
    patch: number;
}
/** 本版写出的拍子（SSoT）。
 *  ora 3 = 2026-09-29 持久化立宪（参考清单独立成目录、desk 带 version）；minor / patch 键 2026-10-21 起写（之前 = 3.0.0）。
 *  desk 1 = 2026-09-29 起的形状；timelapse 1 = 2026-08-19 起的形状；brush 1 = v99 schema（brushes.ts 头）；rackMeta 1 = 2026-07 rack v2 起的形状。 */
export declare const FORMAT: Readonly<Record<Component, Readonly<Stamp>>>;
/** 缺 major 键时当几：ora 无 `weebpaint:format` = 0（改名前的存量，照样能读）；其余从前没写过 = 1。 */
export declare const MISSING_MAJOR: Readonly<Record<Component, number>>;
/** JSON 子结构的 major 键名。 */
export declare const MAJOR_KEY: Readonly<Record<JsonComponent, string>>;
/** 拍子三键（写入器专属：直通的 extra 袋永远不含它们——拍子只写自己的）。 */
export declare const STAMP_KEYS: Readonly<Record<JsonComponent, readonly string[]>>;
export type MigrationStep = (json: Record<string, unknown>) => Record<string, unknown>;
/** STEPS[子结构][major] = 把 major 升到 major+1 的纯函数（必须把 major 键写成 major+1）。今天空表：四样 JSON 都只有 1。
 *  （笔的 v82–v98 → v99 归一化 brushes.ts migrateBrush 早于拍子、只管「导入单支笔 JSON」那一条路，无拍可依——留在原处，不进链。） */
export declare const STEPS: Readonly<Partial<Record<JsonComponent, Readonly<Record<number, MigrationStep>>>>>;
export declare const fmt: (s: Stamp) => string;
export declare class FormatTooNewError extends Error {
    readonly component: Component;
    readonly fileStamp: Stamp;
    readonly appStamp: Stamp;
    constructor(component: Component, fileStamp: Stamp, appStamp: Stamp);
}
/** JSON 子结构的拍子：major 键缺 → MISSING_MAJOR；minor / patch 缺或非法 = 0。major 键在但不是非负整数（如老 timelapse 的浮点 / 字符串）→ 截断 / 当 1。 */
export declare function readStamp(c: JsonComponent, json: unknown): Stamp;
/** stack.xml 的拍子（parseStackXml 读出的三个属性原文）。 */
export declare function readOraStamp(attrs: {
    format?: string | null;
    minor?: string | null;
    patch?: string | null;
}): Stamp;
/** 判决：too-new = major 比本版大（拒读、永不写回）；其余 = 同 major（或已升到本版 major）下的 minor / patch 比较。 */
export type Verdict = "too-new" | "same" | "older" | "newer-minor" | "newer-patch";
export declare function judge(c: Component, file: Stamp): Verdict;
/** JSON 子结构读进来：升到本版 major（STEPS 链），给出文件的拍子与判决。major 比本版大 → FormatTooNewError（调用方原字节带着、永不写回）。
 *  不是对象 → 原样返回、判 same（调用方当缺失 / 损坏处理）。缺 major 键 = MISSING_MAJOR（把键补上，下游形状检查不用开例外）。steps 可注入（测试）。 */
export declare function migrate(c: JsonComponent, json: unknown, steps?: typeof STEPS): {
    json: unknown;
    stamp: Stamp;
    verdict: Verdict;
};
/** 写入器用：本版的拍子落成三个键（desk = version / minor / patch；timelapse = v / minor / patch）。 */
export declare function stampFields(c: JsonComponent): Record<string, number>;
/** 直通：JSON 顶层里本版不认识的键（不含拍子三键）装进 extra 袋，写入器先铺 extra 再铺已知键（已知键永远赢）。 */
export declare function splitExtra(c: JsonComponent, json: unknown, known: readonly string[]): Record<string, unknown>;
