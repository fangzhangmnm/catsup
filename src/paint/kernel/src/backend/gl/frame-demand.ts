// frame-demand —— 帧驻留需求精算 + 池准入协议（纯逻辑零 GL；render-tree / raster-service 共用）。
//
// 病史（v0.10.8「夏音冷开」案，ai-docs/20260820-gpu-pool-cold-open-postmortem.md）：
//   ① 旧预检对 withBg 段只数 allTiles（= 拷贝目标格数），漏数了合成该段时必须**同时驻留**的
//      全部成员叶 tile（Procreate 导入的满画布多层画 688 格 vs 初始池 64 slot）——
//      reserve(56) 直接通过不扩容 → 成员上传连环驱逐 → 段合成采到被复写的 slice
//      → 整层缺失，且残缺段被段缓存 + display 签名冻结，静置永不自愈。
//   ② 旧时序先扫段命中、后 reserve；reserve grow = recreate 会使**全部现存 gpu id 作废**，
//      刚被记成「命中」的段缓存已死却照用 → 整段错画（用户复现：「点几下眼睛自愈」
//      实为每次 markDirty 都让 reserve 再翻倍一次，翻到装得下为止）。
//
// 本模块把两件事各自做成显式契约：
//   - 需求精算：这一帧要**新占**多少 slot = miss 上传（问 bridge 存活，命中不重复计）
//     + 段拷贝目标（withBg = 全 doc 格；其余 = 成员 tile 键并集）。
//   - 两段式准入 admitWithRegrow：reserve 后 generation 变了（发生了 recreate）→
//     重扫（死段全部进 missing）重估再 reserve 一次。第二次扫描后 missing 已是全量，
//     再 recreate 也不改变需求，无需继续循环。

/** 需求侧只读得到的叶像素面（= LayerPixels 的子集；测试喂 fake）。 */
export interface DemandLeaf {
  forEachTileHandle(cb: (tx: number, ty: number, h: { id: number }) => void): void;
}

/** 这些叶的 CPU tile 里，GPU 侧还没有活副本的数量（= sync 将要 uploadBatch 的格数上界）。
 *  跨叶去重按 cpuId（clip 基底被多个段共列时不重复计）。 */
export function residentMissTiles(
  ids: Iterable<number>,
  leafOf: (id: number) => DemandLeaf | undefined,
  hasLive: (cpuId: number) => boolean,
): number {
  const seen = new Set<number>();
  let misses = 0;
  for (const id of ids) {
    const px = leafOf(id);
    if (!px) continue;
    px.forEachTileHandle((_tx, _ty, h) => {
      if (seen.has(h.id)) return;
      seen.add(h.id);
      if (!hasLive(h.id)) misses++;
    });
  }
  return misses;
}

/** 一个段入池要拷多少目标格：withBg（不透明底）= 全 doc 格；否则 = 成员 tile 键并集
 *  （多层叠同格只拷一次——与 render-tree._buildSeg 的 cover 集合同口径）。 */
export function segCopyTiles(
  b: { members: number[]; withBg: boolean },
  leafOf: (id: number) => DemandLeaf | undefined,
  allTiles: number,
  across: number,
): number {
  if (b.withBg) return allTiles;
  const cover = new Set<number>();
  for (const id of b.members) {
    const px = leafOf(id);
    if (!px) continue;
    px.forEachTileHandle((tx, ty) => cover.add(ty * across + tx));
  }
  return cover.size;
}

/** live ∪ 全部缺段成员（帧内需要驻留的叶 id 全集）。 */
export function residentIds(
  liveLeaves: Iterable<number>,
  missing: readonly { members: number[] }[],
): Set<number> {
  const out = new Set<number>(liveLeaves);
  for (const b of missing) for (const id of b.members) out.add(id);
  return out;
}

/** 两段式准入（病史②的结构性修复）：
 *  scan 必须幂等且每次**重新**判定段存活（recreate 后死段要能重新进 missing）；
 *  demandOf 返回该 missing 集的新占 slot 数。返回最终的 missing 与 reserve 结果。 */
export function admitWithRegrow<T>(
  pool: { readonly allocatedCount: number; readonly generation: number; reserve(n: number): boolean },
  scan: () => T[],
  demandOf: (missing: T[]) => number,
): { ok: boolean; missing: T[] } {
  let missing = scan();
  const genBefore = pool.generation;
  let ok = pool.reserve(pool.allocatedCount + demandOf(missing));
  if (pool.generation !== genBefore) {
    missing = scan();
    ok = pool.reserve(pool.allocatedCount + demandOf(missing));
  }
  return { ok, missing };
}
