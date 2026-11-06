// repairs/merge-reversed/plan.ts —— 修复「合并重合反向面」的规划：纯函数（零 DOM，node 直测，不改内核）。created 2026-11-06 by Claude Opus 5.5
// 硬表面转网格体 / 外部文件读进来，两面都出 = 两张共用同一圈点、绕向相反的面（计划书 §2.9）。这时中间的边挂 4 张面，环切切不动、平滑跨不过去。
// user 11-04：「修复可以合并，导入导出的时候机械透明，原则就这么简单」——只有用户点了才跑；导入、导出、转换永远不合。
// 判据（全部是精确条件，不猜）：同一圈点、绕向相反、同材质、隐藏状态一样。材质不同的不并，报数（计划书 §2.9「不同材质的并不了、跳过报数」）。
// 留哪张 = 这里唯一要猜的（「猜测归修复工具」，user 11-04）。一对两张方向相反，所以定了方向就定了留哪张，只删不翻，一条 meshDelete 够了：
//   ① 连着单层的面 = 跟它（那是用户的朝向，不动）；② 整块封闭 = 朝外（有向体积为正，同 mesh/ops/orient.ts）；③ 开口的片 = 照第一张（先写的，同计划书的读回判据），报数，反了用翻转法线。
// 传播只过「恰好连着两块」的边：T 字边、开口边不过（和 orient.ts 同一个局限，T 字隔开的块各算各的）。
import { FF_HIDDEN, type MeshKernel } from "../../../mesh/mesh-kernel.ts";
import type { Pt3 } from "../../../kernel/geom.ts";

export interface MergeReversedPlan {
  /** 要删的面（每对一张，升序）。 */
  remove: number[];
  /** 并了几对。 */
  pairs: number;
  /** 没并的几处：两张材质不同 / 一张隐藏一张没隐藏 / 同一圈点叠了不止两张。 */
  skipped: number;
  /** 几块封闭的（朝外）。 */
  shells: number;
  /** 几块开口的、没有单层的面可跟（朝向照第一张）。 */
  sheets: number;
}

/** b 是 a 反着走的同一圈点（环的起点可以不同）。 */
const isReversed = (a: readonly number[], b: readonly number[]): boolean => {
  const n = a.length, s = b.indexOf(a[0]);
  if (s < 0 || b.length !== n) return false;
  for (let i = 0; i < n; i++) if (a[i] !== b[(s - i + n) % n]) return false;
  return true;
};
const triple = (a: Pt3, b: Pt3, c: Pt3): number => a.x * (b.y * c.z - b.z * c.y) + a.y * (b.z * c.x - b.x * c.z) + a.z * (b.x * c.y - b.y * c.x);

/** materialOf = 槽号 → 这个槽指的材质（按材质比，不按槽号比；和导出看到的一样）。 */
export function planMergeReversed(k: MeshKernel, materialOf: (slot: number) => number): MergeReversedPlan {
  const byRing = new Map<string, number[]>();
  for (const f of k.faces()) { const key = k.faceVerts(f).sort((a, b) => a - b).join(","), l = byRing.get(key); if (l) l.push(f); else byRing.set(key, [f]); }
  const pairs: [number, number][] = [], pairOf = new Map<number, number>();
  let skipped = 0;
  for (const fs of byRing.values()) {
    if (fs.length < 2) continue;
    if (fs.length > 2) { skipped++; continue; }
    const [a, b] = fs;   // k.faces() 按 id 升序：a = 先写的
    if (!isReversed(k.faceVerts(a), k.faceVerts(b))) continue;   // 同向的重复面不是这条修复管的，一个字节不碰
    if (materialOf(k.faceMat[a]) !== materialOf(k.faceMat[b]) || (k.faceFlags[a] & FF_HIDDEN) !== (k.faceFlags[b] & FF_HIDDEN)) { skipped++; continue; }
    pairOf.set(a, pairs.length); pairOf.set(b, pairs.length); pairs.push([a, b]);
  }
  const out: MergeReversedPlan = { remove: [], pairs: pairs.length, skipped, shells: 0, sheets: 0 };
  if (!pairs.length) return out;

  // 块 = 一对（方向待定）或一张单层面（方向是用户的）。过一条边：这条边上恰好两块才算邻居。
  const nodeOf = (f: number): number => { const p = pairOf.get(f); return p === undefined ? -1 - f : p; };   // 单层面编码成负数
  const neighbourOver = (a: number, b: number, self: number): number | null => {
    const nodes = new Set<number>(); for (const f of k.eFaces(k.edgeOf(a, b))) nodes.add(nodeOf(f));
    if (nodes.size !== 2 || !nodes.has(self)) return null;
    for (const n of nodes) if (n !== self) return n;
    return null;
  };
  /** 这张面的环里有没有 x → y 这一步。 */
  const walks = (f: number, x: number, y: number): boolean => { const r = k.faceVerts(f); for (let i = 0; i < r.length; i++) if (r[i] === x && r[(i + 1) % r.length] === y) return true; return false; };
  const keep = new Int32Array(pairs.length).fill(-1);
  /** 从已定方向的面 f（属于块 self）往外灌：邻居过共享边必须反着走。 */
  const flood = (seeds: readonly { f: number; self: number }[], onReach?: (pair: number) => void): void => {
    const stack = [...seeds];
    while (stack.length) {
      const { f, self } = stack.pop()!, r = k.faceVerts(f);
      for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length], n = neighbourOver(a, b, self);
        if (n === null || n < 0 || keep[n] >= 0) continue;
        const [p, q] = pairs[n];
        keep[n] = walks(p, b, a) ? p : q;
        onReach?.(n);
        stack.push({ f: keep[n], self: n });
      }
    }
  };
  // ① 单层的面先灌：它们的朝向是用户的，只有一对对去跟它们
  const singles: { f: number; self: number }[] = [];
  for (const f of k.faces()) if (!pairOf.has(f)) singles.push({ f, self: nodeOf(f) });
  flood(singles);
  // ②③ 剩下的一块块：从 id 最小的那对起（留先写的），灌完看封闭不封闭
  for (let seed = 0; seed < pairs.length; seed++) {
    if (keep[seed] >= 0) continue;
    const block = [seed];
    keep[seed] = pairs[seed][0];
    flood([{ f: keep[seed], self: seed }], (n) => block.push(n));
    let closed = true, vol = 0;
    for (const n of block) {
      const r = k.faceVerts(keep[n]), p = k.facePts(keep[n]);
      for (let i = 0; closed && i < r.length; i++) if (neighbourOver(r[i], r[(i + 1) % r.length], n) === null) closed = false;
      for (let i = 1; i + 1 < p.length; i++) vol += triple(p[0], p[i], p[i + 1]);
    }
    if (closed) { out.shells++; if (vol < 0) for (const n of block) keep[n] = keep[n] === pairs[n][0] ? pairs[n][1] : pairs[n][0]; }
    else out.sheets++;
  }
  for (let n = 0; n < pairs.length; n++) out.remove.push(keep[n] === pairs[n][0] ? pairs[n][1] : pairs[n][0]);
  out.remove.sort((a, b) => a - b);
  return out;
}
