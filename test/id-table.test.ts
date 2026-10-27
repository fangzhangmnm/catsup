// 内核表的数组制度（O3，2026-10-27 Claude Fable 5.1）：IdMap / IdSet 和 Map / Set 的语义逐步对拍（随机增删查）；遍历永远按 id 升序、和增删历史无关（倒带 (R2) 的前提）；记账回调只在真改了时响。
import { describe, it, eq, assert } from "./runner.mjs";
import { IdMap, IdSet } from "../src/kernel/id-table.ts";

const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

describe("数组制度：IdMap / IdSet", () => {
  it("IdMap：随机增删查 20 种子 × 400 步 = Map 同语义；遍历 = 按 id 升序；size / has / get / delete 返回值一致", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = rng(seed), m = new IdMap<string>(), ref = new Map<number, string>();
      for (let step = 0; step < 400; step++) {
        const k = Math.floor(r() * 64), op = r();
        if (op < 0.5) { const v = `v${step}`; m.set(k, v); ref.set(k, v); }
        else if (op < 0.85) eq(m.delete(k), ref.delete(k), `delete ${k}`);
        else eq(m.get(k), ref.get(k));
        eq(m.size, ref.size); eq(m.has(k), ref.has(k));
      }
      eq([...m.keys()].join(","), [...ref.keys()].sort((a, b) => a - b).join(","), "遍历按 id 升序");
      eq([...m.values()].join(","), [...ref.keys()].sort((a, b) => a - b).map((k) => ref.get(k)).join(","));
      eq([...m].length, ref.size); let n = 0; m.forEach((v, k) => { eq(ref.get(k), v); n++; }); eq(n, ref.size);
    }
  });
  it("IdMap：删了再插回同一个 id，遍历顺序不变（Map 会挪到表尾）", () => {
    const m = new IdMap<number>(), ref = new Map<number, number>();
    for (const k of [3, 1, 2]) { m.set(k, k); ref.set(k, k); }
    const before = [...m.keys()].join(",");
    m.delete(1); m.set(1, 1); ref.delete(1); ref.set(1, 1);
    eq([...m.keys()].join(","), before, "IdMap 顺序不变");
    assert([...ref.keys()].join(",") !== before, "Map 的顺序变了（这正是要摆脱的）");
  });
  it("IdMap：记账只在 set / 真删时响；clear 逐个响；undefined 值拒", () => {
    const touched: number[] = [], m = new IdMap<number>((id) => touched.push(id));
    m.set(5, 1); m.set(5, 2); m.delete(7); m.delete(5); m.set(9, 1); m.clear();
    eq(touched.join(","), "5,5,5,9,9");
    let threw = false; try { m.set(1, undefined as unknown as number); } catch { threw = true; } assert(threw);
    eq(m.capacity >= 0, true);
  });
  it("IdSet：随机增删 20 种子 × 400 步 = Set 同语义；遍历升序；删着遍历不跳元素；末尾追加快路径", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = rng(seed), s = new IdSet(), ref = new Set<number>();
      for (let step = 0; step < 400; step++) {
        const x = Math.floor(r() * 64);
        if (r() < 0.6) { s.add(x); ref.add(x); } else eq(s.delete(x), ref.delete(x));
        eq(s.size, ref.size); eq(s.has(x), ref.has(x));
      }
      eq([...s].join(","), [...ref].sort((a, b) => a - b).join(","));
      eq([...s.entries()].every(([a, b]) => a === b), true);
    }
    const s = new IdSet([5, 1, 3]);
    const seen: number[] = []; for (const x of s) { seen.push(x); s.delete(1); s.delete(3); }
    eq(seen.join(","), "1,3,5", "快照遍历");
    const big = new IdSet(); for (let i = 0; i < 20000; i++) big.add(i); eq(big.size, 20000); eq(big.sorted[19999], 19999);
    const touched: number[] = [], t = new IdSet([2], (id) => touched.push(id)); t.add(2); t.add(1); t.delete(9); t.delete(1); eq(touched.join(","), "1,1");
  });
});
