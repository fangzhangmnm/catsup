// 池网格（纪元账本 DT96 渲染那半，2026-10-26 Claude Opus 5.5）：增量同步 = 全量重建。
// 比的是「画出来的东西」：每组面的非退化三角（位置 / 法线 / 颜色 / uv）、每条线，排成多重集逐字比——区间仓库里的摆法（洞、块）不同没关系。
// 三种族谱：同一个内核一路改（原件）；每步拷一份副本改了再回原件（拖动预演）；改一串之后回到早先拍的快照（撤销）。
import { describe, it, assert, eq } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import type { Material } from "../src/scene/scene.ts";
import { PoolMesh, RegionStore, type PoolMeshEnv } from "../src/editor/pool-mesh.ts";
type Store = { readonly specs: readonly { name: string; size: number }[]; readonly arrays: Record<string, ArrayLike<number>>; readonly end: number };

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const MATS: Material[] = [
  { name: "红", color: [0.9, 0.1, 0.1] },
  { name: "蓝", color: [0.1, 0.2, 0.9] },
  { name: "砖", color: [1, 1, 1], texture: { mimeType: "image/png", bytes: new Uint8Array([1]), sizeM: [0.5, 0.25] } },
];
const env = (thick: boolean, slots = MATS.length): PoolMeshEnv => ({
  matOf: (slot) => (slot === undefined || slot >= slots ? null : MATS[slot] ?? null), slotsSig: MATS.slice(0, slots).map((_, i) => i + 1).join(","),
  faceColor: (m, dim) => (m ? [m.color[0] * (dim ? 0.5 : 1), m.color[1], m.color[2]] : dim ? [0.2, 0.2, 0.2] : [0.7, 0.7, 0.7]),
  edgeColor: (loose, dim) => (dim ? [0.5, 0.5, 0.5] : loose ? [0.1, 0.3, 0.1] : [0.05, 0.05, 0.05]), thick, singleSided: false,
});
const r4 = (x: number): string => (Math.round(x * 1e4) / 1e4).toFixed(4);
/** 一个仓库里画得出来的单元（三角 = 3 个顶点；线 = 1 个实例或 2 个顶点），按属性拼字符串、排序。 */
function picture(store: Store, unitsPer: number, posAttr: string, posSize: number): string[] {
  const out: string[] = [];
  for (let u = 0; u + unitsPer <= store.end; u += unitsPer) {
    const pa = store.arrays[posAttr];
    let blank = true;
    for (let q = u * posSize; q < (u + unitsPer) * posSize; q++) if (pa[q] !== 0) { blank = false; break; }
    if (blank) continue;
    const parts: string[] = [];
    for (const s of store.specs) { const a = store.arrays[s.name]; for (let q = u * s.size; q < (u + unitsPer) * s.size; q++) parts.push(r4(a[q])); }
    out.push(parts.join(","));
  }
  return out.sort();
}
function pictureOf(m: PoolMesh, thick: boolean): string {
  // 空组（面都搬走了，仓库里只剩洞）画不出东西 = 没有这组
  const groups = [...m.groups.values()].map((g) => [g.key, picture(g.store, 3, "position", 3)] as const).filter(([, p]) => p.length).map(([k, p]) => `${k}:${p.join("|")}`).sort();
  const lines = thick ? picture(m.lines, 1, "seg", 6) : picture(m.lines, 2, "position", 3);
  return [...groups, `lines:${lines.join("|")}`].join("\n");
}
function sameAsFull(m: PoolMesh, T: Kernel, thick: boolean, ctx: string): void {
  const ref = new PoolMesh(); ref.sync(T, env(thick));
  // 线永远挤紧：绘制范围 = 条数 × 每条几个单位（没有洞）
  eq(m.lines.end, m.lines.count * (thick ? 1 : 2), `${ctx}：线仓库有洞`);
  const a = pictureOf(m, thick), b = pictureOf(ref, thick);
  if (a !== b) {
    const al = a.split("\n"), bl = b.split("\n");
    if ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.PM_DEBUG) for (let g = 0; g < Math.max(al.length, bl.length); g++) if (al[g] !== bl[g]) {
      const x = new Set((al[g] ?? "").split("|")), y = new Set((bl[g] ?? "").split("|"));
      console.log(ctx, "group", g, "\n 只在增量:", [...x].filter((q) => !y.has(q)).join("\n   "), "\n 只在全量:", [...y].filter((q) => !x.has(q)).join("\n   "));
    }
    assert(false, `${ctx}：增量 ≠ 全量\n  增量组 ${al.map((x) => x.slice(0, 40) + "… " + x.split("|").length).join(" ; ")}\n  全量组 ${bl.map((x) => x.slice(0, 40) + "… " + x.split("|").length).join(" ; ")}`);
  }
}
/** 随机一步（画矩形 / 推拉 / 擦边 / 挪点 / 软化 + 平滑 / 上色 / 贴图 / 隐藏）。 */
function randomStep(k: Kernel, rnd: () => number): void {
  const q = (x: number): number => Math.round(x * 1000) / 1000, r = rnd(), es = k.edges(), fs = k.faces(), vs = k.vertices();
  try {
    if (r < 0.25 || !es.length) {
      const o = P(q(rnd() * 3), q(rnd() * 3), rnd() < 0.3 ? q(rnd()) : 0), W = q(0.3 + rnd() * 1.5), H = q(0.3 + rnd() * 1.5);
      k.addEdges([[o, P(o.x + W, o.y, o.z)], [P(o.x + W, o.y, o.z), P(o.x + W, o.y + H, o.z)], [P(o.x + W, o.y + H, o.z), P(o.x, o.y + H, o.z)], [P(o.x, o.y + H, o.z), o]]);
    } else if (r < 0.42 && fs.length) k.pushPull(fs[Math.floor(rnd() * fs.length)].id, q((rnd() - 0.3) * 1.2));
    else if (r < 0.52) k.eraseEdges([es[Math.floor(rnd() * es.length)].id]);
    else if (r < 0.64 && vs.length) { const v = vs[Math.floor(rnd() * vs.length)]; k.moveVertices([{ id: v.id, to: P(v.x + q((rnd() - 0.5) * 0.3), v.y + q((rnd() - 0.5) * 0.3), v.z + q((rnd() - 0.5) * 0.3)) }]); }
    else if (r < 0.78) { const ids = es.filter(() => rnd() < 0.3).map((e) => e.id); const on = rnd() < 0.6; k.setEdgeLayer("soft", ids, on); k.setEdgeLayer("smooth", ids, on); }
    else if (r < 0.9 && fs.length) k.setFaceMaterial([fs[Math.floor(rnd() * fs.length)].id], Math.floor(rnd() * 3), rnd() < 0.5 ? [rnd() < 0.5 ? 0 : 1] : undefined);
    else if (fs.length) k.setFaceHidden?.([fs[Math.floor(rnd() * fs.length)].id], rnd() < 0.5);
  } catch { /* 被拒绝的操作照样核 */ }
}
const rng = (seed: number): (() => number) => { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; };

describe("池网格的面仓库（RegionStore）", () => {
  it("跨块 / 删 / 整理 / 收紧之后，按显卡的读法每 3 个一读：要么整组是洞，要么整组是同一条记录（块边界对齐 3）", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rnd = rng(seed * 7717), st = new RegionStore([{ name: "position", size: 3 }, { name: "tag", size: 1 }], 10, 3);
      const live = new Map<number, number>();   // id → 长度
      const put = (id: number): void => { const len = 3 * (1 + Math.floor(rnd() * 4)); live.set(id, len); st.put(id, len, (a, off) => { for (let i = 0; i < len; i++) { a.tag[off + i] = id; a.position[(off + i) * 3] = id; } }); };
      for (let step = 0; step < 120; step++) {
        const r = rnd(), ids = [...live.keys()];
        if (r < 0.55 || !ids.length) put(Math.floor(rnd() * 60) + 1);
        else if (r < 0.9) { const id = ids[Math.floor(rnd() * ids.length)]; st.remove(id); live.delete(id); }
        else st.trim();
      }
      const seen = new Map<number, number>();
      for (let u = 0; u + 3 <= st.end; u += 3) {
        const t = [st.arrays.tag[u], st.arrays.tag[u + 1], st.arrays.tag[u + 2]];
        assert(t[0] === t[1] && t[1] === t[2], `seed ${seed}：第 ${u} 个顶点起的三角混了两条记录 ${t}`);
        if (t[0] !== 0) seen.set(t[0], (seen.get(t[0]) ?? 0) + 3);
      }
      for (const [id, len] of live) eq(seen.get(id), len, `seed ${seed}：记录 ${id} 画出来 ${seen.get(id)} 个顶点（该 ${len}）`);
      eq(seen.size, live.size, `seed ${seed}：画出来的记录条数`);
    }
  });
});

describe("池网格（DT96）：增量同步 = 全量重建", () => {
  it("同一个内核一路改（像素线 / 粗线各一遍）：每步增量同步后和全量一样", () => {
    for (const thick of [false, true]) for (let seed = 1; seed <= 25; seed++) {
      const rnd = rng(seed * 7919 + (thick ? 1 : 0)), k = new Kernel(), m = new PoolMesh();
      m.sync(k, env(thick));
      for (let i = 0; i < 12; i++) { randomStep(k, rnd); m.sync(k, env(thick)); sameAsFull(m, k, thick, `seed ${seed} step ${i} ${thick ? "粗" : "细"}`); }
      assert(!m.last.full, "一路增量（没退回全量）");
    }
  });
  it("拖动预演：每步拷一份副本改了同步、再回原件同步；偶尔把操作提交到原件", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rnd = rng(seed * 104729), base = new Kernel(), m = new PoolMesh(), E = env(true);
      for (let i = 0; i < 4; i++) randomStep(base, rnd);
      m.sync(base, E);
      for (let i = 0; i < 10; i++) {
        const c = base.clone(); randomStep(c, rnd);
        m.sync(c, E); sameAsFull(m, c, true, `seed ${seed} step ${i} 副本`);
        assert(!m.last.full, `seed ${seed} step ${i}：副本走增量`);
        if (rnd() < 0.4) randomStep(base, rnd);
        m.sync(base, E); sameAsFull(m, base, true, `seed ${seed} step ${i} 回原件`);
      }
    }
  });
  it("撤销：拍快照、改一串、回到快照的副本——增量回到快照的样子", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rnd = rng(seed * 31337), k = new Kernel(), m = new PoolMesh(), E = env(false);
      for (let i = 0; i < 5; i++) randomStep(k, rnd);
      m.sync(k, E);
      const snap = k.clone();
      for (let i = 0; i < 6; i++) { randomStep(k, rnd); m.sync(k, E); }
      const restored = snap.clone();
      m.sync(restored, E); sameAsFull(m, restored, false, `seed ${seed} 撤销回快照`);
      eq(m.last.full, false, "撤销走增量");
    }
  });
  it("材质槽表加槽 / 撤销加槽（一边是另一边的前缀）走增量；槽号换了材质 = 全量", () => {
    const k = new Kernel(), m = new PoolMesh();
    k.addEdges([[P(0, 0, 0), P(1, 0, 0)], [P(1, 0, 0), P(1, 1, 0)], [P(1, 1, 0), P(0, 1, 0)], [P(0, 1, 0), P(0, 0, 0)]]);
    k.pushPull(k.faces()[0].id, 1);
    m.sync(k, env(false, 0));
    const snap = k.clone();
    k.setFaceMaterial([k.faces()[0].id], 1);   // 第一次用材质：槽表 [] → [红, 蓝]
    m.sync(k, env(false, 2)); assert(!m.last.full, "加槽 = 增量"); sameAsFull(m, k, false, "加槽");
    const back = snap.clone();
    m.sync(back, env(false, 0)); assert(!m.last.full, "撤销加槽 = 增量"); sameAsFull(m, back, false, "撤销加槽");
    m.sync(k, env(false, 2)); assert(!m.last.full, "再回到加了槽的 = 增量");
    m.sync(k, { ...env(false, 2), slotsSig: "9,2" }); assert(m.last.full, "同一个槽号指向的材质换了 = 全量");
  });
  it("增量只碰改过的：20 个互不相干的盒子挪一个点 → 重建的只有那一个盒子（改过的面 + 它们顶点周围一圈）", () => {
    const k = new Kernel(), m = new PoolMesh(), E = env(true);
    for (let i = 0; i < 20; i++) { const x = i * 2; k.addEdges([[P(x, 0, 0), P(x + 1, 0, 0)], [P(x + 1, 0, 0), P(x + 1, 1, 0)], [P(x + 1, 1, 0), P(x, 1, 0)], [P(x, 1, 0), P(x, 0, 0)]]); k.pushPull(k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.x >= x - 1e-9 && p.x <= x + 1 + 1e-9 && p.z === 0))!.id, 1); }
    m.sync(k, E);
    const v = k.vertices()[0];
    k.moveVertices([{ id: v.id, to: P(v.x, v.y, v.z + 0.1) }]);
    const r = m.sync(k, E);
    // 一个盒子 6 张面，挪角点可能把三张弯了的面折开（多出几张三角）；全模型 120 张
    assert(!r.full && r.faces > 0 && r.faces <= 16 && r.edges <= 30, `只重建那一个盒子：${JSON.stringify(r)}（全模型 ${k.faces().length} 面）`);
    sameAsFull(m, k, true, "挪一个点");
  });
});
