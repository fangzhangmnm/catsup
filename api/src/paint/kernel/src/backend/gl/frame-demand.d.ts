/** 需求侧只读得到的叶像素面（= LayerPixels 的子集；测试喂 fake）。 */
export interface DemandLeaf {
    forEachTileHandle(cb: (tx: number, ty: number, h: {
        id: number;
    }) => void): void;
}
/** 这些叶的 CPU tile 里，GPU 侧还没有活副本的数量（= sync 将要 uploadBatch 的格数上界）。
 *  跨叶去重按 cpuId（clip 基底被多个段共列时不重复计）。 */
export declare function residentMissTiles(ids: Iterable<number>, leafOf: (id: number) => DemandLeaf | undefined, hasLive: (cpuId: number) => boolean): number;
/** 一个段入池要拷多少目标格：withBg（不透明底）= 全 doc 格；否则 = 成员 tile 键并集
 *  （多层叠同格只拷一次——与 render-tree._buildSeg 的 cover 集合同口径）。 */
export declare function segCopyTiles(b: {
    members: number[];
    withBg: boolean;
}, leafOf: (id: number) => DemandLeaf | undefined, allTiles: number, across: number): number;
/** live ∪ 全部缺段成员（帧内需要驻留的叶 id 全集）。 */
export declare function residentIds(liveLeaves: Iterable<number>, missing: readonly {
    members: number[];
}[]): Set<number>;
/** 两段式准入（病史②的结构性修复）：
 *  scan 必须幂等且每次**重新**判定段存活（recreate 后死段要能重新进 missing）；
 *  demandOf 返回该 missing 集的新占 slot 数。返回最终的 missing 与 reserve 结果。 */
export declare function admitWithRegrow<T>(pool: {
    readonly allocatedCount: number;
    readonly generation: number;
    reserve(n: number): boolean;
}, scan: () => T[], demandOf: (missing: T[]) => number): {
    ok: boolean;
    missing: T[];
};
