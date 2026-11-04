export type Guid = string;
export declare const isGuid: (s: unknown) => s is Guid;
/** 铸一个。`randomUUID` 只在安全上下文有（局域网 http 预览没有），退回 `getRandomValues`，同样是 v4。 */
export declare function mintGuid(): Guid;
/** 文件里读到的身份：合法且没人用过就留着，否则现铸（手改过的文件 / 老文件）。 */
export declare function ownGuid(raw: unknown, seen: Set<Guid>): Guid;
/**
 * 默认层的身份：全家一个常量（不是序号，是这一条的永久身份）。每份文件都有默认层，它们本来就是「同一条」，跨文件粘贴按 GUID 合并时才能合回默认层，而不是长出一堆叫「默认」的层。
 * 取值满足 v4 的形状，所以 `isGuid` 认它。
 */
export declare const DEFAULT_LAYER_GUID: Guid;
