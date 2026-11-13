// 空出来的地方（施工单十八第 2 刀 + 统筹 11-13 深夜补的三处）。created 2026-11-13 by Claude Opus 5.5
// 钉：① 清单的并法（包住的、拼成长方形的随时并，超过 256 才做会多占地方的并，剪掉被占着的；框多先按粗格子归拢；多跑一次结果一样）；精确的「盖住」；
//    ② 画过的面上切一刀 / 环切 / 细分 / 内插：freed 一个框都不多（旧位置被现在的面盖住）；
//    ③ 删面、对称化丢掉的一半（编号被镜过来的新面复用）、换到另一套、合并点塌掉的面、转硬表面、倒角（挨着的面缩掉一条）：旧位置 ⊆ freed ∪ 现在占着的；
//    ④ 整列删掉（removeColumn 不逐张面进改动日志）：按全部面比，原来的位置都进 freed；
//    ⑤ 同一步里先空出来、后补面（统筹预审第 1 条）：补面不落到这一步刚空出来的旧画上；⑥ freed 的两种读法（补面 = 加上占着的；空地 = 减去占着的、数几块）。
//    ⑦ 坏坐标不卡死（统筹预审 B）：角上 Infinity / 1e9 / NaN、文件里出了画布范围的 freed；⑧ 翻之前那份的代号用一步开始时的速查表（统筹预审 C）。
// 每一步都照编辑器的做法：freedBaseline → 每条指令（改写 → 记 → 提交 → 收尾补进同一步，收尾每次补面之前先记一次空位）→ 整步最后 freedOp 进同一步。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { History } from "../src/editor/history.ts";
import type { Op } from "../src/editor/ops.ts";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { mintGuid } from "../src/format/guid.ts";
import { translation } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";
import { freedBaseline, freedOp, type FreedBase } from "../src/editor/paint-freed.ts";
import { upkeepAfter, upkeepRewrite, upkeepSnapshot } from "../src/editor/paint-upkeep.ts";
import { UV_AT_COL, UV_SET_COL, uvAt, uvSetOfFace } from "../src/scene/uv.ts";
import { FREED_MAX, RectIndex, candidatesFor, freedOpenAreas, lostPlaces, mergeFreed, openPieces, placementBlocked, type Rect } from "../src/paint/freed.ts";
import { cornersRect } from "../src/paint/layout.ts";
import { freedReach, readUvSetRows } from "../src/format/uvset-table.ts";
import { uvSetAutoPlaces } from "../src/scene/scene.ts";
import type { FormatReadNotes } from "../src/format/migrate/index.ts";
import type { Guid } from "../src/format/guid.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
/** 一个画过的网格体（x 从 x0 到 x1 的盒子），每一步照编辑器的做法收尾（midStep = false：收尾补面之前不先记空位 = 修之前的样子，只给「这个例子有牙」用）。 */
function setup(x0 = 0, x1 = 1, midStep = true) {
  const s0 = new Scene(sceneBox(2, 1.5)), d = s0.mintDef("画盒", sceneBox(1, 1)), k0 = new MeshKernel();
  addBox(k0, P(x0, 0, 0), P(x1, 1, 1));
  d.body = { kind: "mesh", kernel: k0, materialSlots: [], uvSetSlots: [] };
  s0.mintInstance(s0.root, null, d.id, translation(P(3, 0, 0)));
  const h = new History<string>(s0), cur = (): Scene => (h as unknown as { current: Scene }).current, def = d.id;
  let base: FreedBase | null = null;
  const env = { get scene() { return cur(); }, get mirrors() { return cur().meshMirrors; }, lastSide: new Map<number, -1 | 1>(), merging: false, freedNow: () => (midStep && base ? freedOp(cur(), h, base) : null) };
  let notes = "";
  const step = (...ops: Op[]): void => {
    base = freedBaseline(cur(), h); notes = "";
    ops.forEach((op0, i) => {
      const op = upkeepRewrite(env, op0), snaps = upkeepSnapshot(env, op);
      h.commit(cur(), op, i > 0, "b", { title: op.op });
      if (snaps) notes += upkeepAfter(env, op, snaps, (o) => { h.commit(cur(), o, true, "b", { title: o.op }); });
    });
    const fo = freedOp(cur(), h, base);
    if (fo) h.commit(cur(), fo, true, "b", { title: "freed" });
    base = null;
  };
  const paint = (faces?: number[]): Guid => { const g = mintGuid(); step({ op: "startPaint", def, faces: faces ?? cur().mesh(def).kernel.faces(), uvSet: g, textureGuid: mintGuid(), materialGuid: mintGuid(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [1, 1, 1], density: 16 }); return g; };
  const k = (): MeshKernel => cur().mesh(def).kernel, slots = (): readonly Guid[] => cur().mesh(def).uvSetSlots;
  /** 现在每一套上：哪张面占哪些格。 */
  const places = (): Map<number, { g: Guid; r: Rect; v: string }> => { const m = new Map<number, { g: Guid; r: Rect; v: string }>(); for (const f of k().faces()) { const g = uvSetOfFace(k(), slots(), f); if (!g) continue; const v = uvAt(k(), slots(), f, g)!; m.set(f, { g, r: cornersRect(v), v: Array.from(v).join() }); } return m; };
  const freed = (g: Guid): Rect[] => { const f = cur().uvSets.get(g)?.freed ?? [], out: Rect[] = []; for (let i = 0; i + 3 < f.length; i += 4) out.push([f[i], f[i + 1], f[i + 2], f[i + 3]]); return out; };
  /** 之前那些位置都被 freed ∪ 现在占着的盖住了吗（没盖住的列出来）。 */
  const uncovered = (before: Map<number, { g: Guid; r: Rect }>): string[] => {
    const now = places(), bad: string[] = [];
    for (const [f, p] of before) {
      const idx = new RectIndex([...freed(p.g), ...[...now.values()].filter((q) => q.g === p.g).map((q) => q.r)]);
      if (!idx.covers(p.r)) bad.push(`面 ${f} [${p.r.join(",")}]`);
    }
    return bad;
  };
  return { h, cur, def, step, paint, k, places, freed, uncovered, notes: () => notes };
}
const top = (k: MeshKernel, z = 1): number => k.faces().find((f) => k.facePts(f).every((p) => Math.abs(p.z - z) < 1e-9))!;

describe("空出来的地方：清单和盖住（paint/freed.ts）", () => {
  it("盖住是精确判的：两半拼起来盖住；L 形没盖住外包框；不相交的不算", () => {
    assert(new RectIndex([[0, 0, 5, 10], [5, 0, 10, 10]]).covers([0, 0, 10, 10]));
    assert(!new RectIndex([[0, 0, 10, 5], [0, 5, 5, 10]]).covers([0, 0, 10, 10]), "缺右下一块");
    assert(new RectIndex([[0, 0, 4, 4], [3, 0, 10, 10], [0, 3, 4, 10]]).covers([0, 0, 10, 10]));
    assert(!new RectIndex([[20, 20, 30, 30]]).covers([0, 0, 10, 10]));
  });
  it("并：包住的不加、拼成长方形的并成一个、被现在占着的盖住的剪掉；没变 = null", () => {
    eq(mergeFreed([0, 0, 10, 10], [[2, 2, 5, 5]], []), null, "被包住");
    eq(mergeFreed(undefined, [[0, 0, 5, 10], [5, 0, 10, 10]], [])!.join(), "0,0,10,10", "拼成长方形");
    eq(mergeFreed(undefined, [[0, 0, 5, 10], [5, 0, 10, 8]], [])!.length, 8, "拼不成长方形 = 两个");
    eq(JSON.stringify(mergeFreed([0, 0, 10, 10, 20, 20, 30, 30], [], [[0, 0, 10, 10]])), JSON.stringify([20, 20, 30, 30]), "剪：整个被占着的");
    eq(mergeFreed([0, 0, 10, 10], [], [[0, 0, 5, 10]]), null, "只盖住一半 = 不剪");
  });
  it("超过 256 个框才做会多占地方的并；并完每个原来的框还被盖住（只并大、不漏）", () => {
    const add: Rect[] = []; for (let i = 0; i < 300; i++) add.push([(i % 30) * 10, Math.floor(i / 30) * 10, (i % 30) * 10 + 7, Math.floor(i / 30) * 10 + 7]);
    const out = mergeFreed(undefined, add, [])!, rs: Rect[] = []; for (let i = 0; i < out.length; i += 4) rs.push([out[i], out[i + 1], out[i + 2], out[i + 3]]);
    assert(rs.length <= FREED_MAX, `${rs.length} 个`);
    const idx = new RectIndex(rs); for (const a of add) assert(idx.covers(a), `漏了 [${a.join(",")}]`);
    eq(mergeFreed(undefined, add.slice(0, 200), [])!.length / 4, 200, "不到 256 个：不做会多占地方的并");
  });
  it("框很多（4 万个）：先按粗格子归拢，结果不超过 256 个、一个不漏；拿结果再并同一批 = 不变（多跑一次结果一样）", () => {
    const add: Rect[] = []; let seed = 7; const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40000; i++) { const x = Math.floor(rnd() * 4000), y = Math.floor(rnd() * 4000); add.push([x, y, x + 1 + Math.floor(rnd() * 12), y + 1 + Math.floor(rnd() * 12)]); }
    const t0 = performance.now(), out = mergeFreed(undefined, add, [])!, ms = performance.now() - t0, rs: Rect[] = []; for (let i = 0; i < out.length; i += 4) rs.push([out[i], out[i + 1], out[i + 2], out[i + 3]]);
    assert(rs.length <= FREED_MAX, `${rs.length} 个`);
    const idx = new RectIndex(rs); for (const a of add) assert(idx.covers(a), `漏了 [${a.join(",")}]`);
    eq(mergeFreed(out, add, []), null, "再并同一批：都已经被盖住 = 不变");
    assert(ms < 2000, `4 万个框并了 ${ms.toFixed(0)} ms（不随框数平方涨）`);
  });
  it("多跑一次结果一样：小清单拿结果再并同一批 = 不变", () => {
    const add: Rect[] = [[0, 0, 5, 5], [10, 0, 20, 5], [3, 3, 12, 9]], out = mergeFreed(undefined, add, [])!;
    eq(mergeFreed(out, add, []), null);
  });
  it("两种读法：空地 = freed 减去现在有面占着的格（数「几块」和怎么切无关）；补面当占着的 = freed 加上别的定义占着的", () => {
    eq(openPieces([[0, 0, 5, 10], [5, 0, 10, 10]]), 1, "共一段边 = 一块");
    eq(openPieces([[0, 0, 5, 5], [5, 5, 10, 10]]), 2, "只碰到角 = 两块");
    eq(openPieces([[0, 0, 4, 2], [0, 2, 2, 4], [2, 2, 4, 4]]), 1, "切法不同照样一块");
    const t = setup(), g = t.paint(), f = top(t.k()), mine = t.places().get(f)!.r;
    t.step({ op: "meshDelete", def: t.def, faces: [f] });
    eq(openPieces(freedOpenAreas(t.cur(), g)), 1, "删掉一张面 = 一块空地");
    const blocked = placementBlocked(t.cur(), t.def, g), bs: Rect[] = []; for (let i = 0; i < blocked.length; i += 4) bs.push([blocked[i], blocked[i + 1], blocked[i + 2], blocked[i + 3]]);
    assert(new RectIndex(bs).covers(mine), "补面时删掉那张面的旧框当占着");
  });
});

describe("画过的面上切开 / 细分 / 内插：freed 一个框都不多（旧位置被现在的面盖住）", () => {
  const cases: [string, (t: ReturnType<typeof setup>) => Op][] = [
    ["刀", (t) => { const f = top(t.k()), r = t.k().faceVerts(f); return { op: "meshKnife", def: t.def, face: f, path: [{ v: r[0] }, { v: r[2] }] }; }],
    ["环切", (t) => ({ op: "meshLoopCut", def: t.def, edge: t.k().fEdges(top(t.k()))[0], t: 0.5 })],
    ["细分", (t) => ({ op: "meshSubdivide", def: t.def, levels: 1 })],
    ["内插", (t) => ({ op: "meshInset", def: t.def, faces: [top(t.k())], dist: 0.1 })],
  ];
  for (const [name, mk] of cases) {
    const t = setup(), g = t.paint(), before = t.places();
    t.step(mk(t));
    const extra = t.freed(g).map((r) => r.join(",")).join(" | ");
    it(`${name}：旧位置都被盖住（freed ∪ 现在占着的）`, () => eq(t.uncovered(before).join("；"), ""));
    it(`${name}：freed 一个框都不多`, () => eq(extra, ""));
  }
});

describe("丢了位置的旧框都被 freed 盖住", () => {
  it("删面", () => {
    const t = setup(), g = t.paint(), before = t.places(), f = top(t.k());
    t.step({ op: "meshDelete", def: t.def, faces: [f] });
    eq(t.uncovered(before).join("；"), ""); assert(t.freed(g).length > 0, "删掉的面的位置进了 freed");
  });
  it("对称化丢掉的一半（专门造一个编号被镜过来的新面复用的例子）", () => {
    const t = setup(-0.5, 0.5), g = t.paint(), before = t.places();
    t.step({ op: "meshSymmetrize", def: t.def, axis: 0, side: 1 });
    const after = t.places(), reused = [...before.keys()].filter((f) => after.has(f) && after.get(f)!.v !== before.get(f)!.v && after.get(f)!.g === g);
    assert(reused.length > 0, "有编号被复用、还在同一套上有位置（只看「还有没有位置」会漏的那种）");
    eq(t.uncovered(before).join("；"), ""); assert(t.freed(g).length > 0);
  });
  it("换到另一套（几张面开始画另一张）", () => {
    const t = setup(), g = t.paint(), before = t.places(), f = top(t.k());
    t.paint([f]);
    eq(t.uncovered(new Map([...before].filter(([x]) => x === f))).join("；"), ""); assert(t.freed(g).length > 0, "换走的那张在原来那套上的位置进了 freed");
  });
  it("倒角（挨着的两张面各缩掉一条，那一条里的旧画没有面占着 = 必须记；统筹 11-13 改正验收）：记的每个框都落在某张面的旧框里", () => {
    const t = setup(), g = t.paint(), before = t.places();
    t.step({ op: "meshBevel", def: t.def, edges: [t.k().fEdges(top(t.k()))[0]], width: 0.1, segments: 1 });
    eq(t.uncovered(before).join("；"), ""); assert(t.freed(g).length > 0, "缩掉的那一条记了");
    for (const r of t.freed(g)) assert([...before.values()].some((p) => p.g === g && p.r[0] <= r[0] && p.r[1] <= r[1] && p.r[2] >= r[2] && p.r[3] >= r[3]), `框 [${r.join(",")}] 不在任何一张面的旧框里`);
  });
  it("合并点塌掉的面", () => {
    const t = setup(), g = t.paint(), before = t.places(), f = top(t.k()), r = t.k().faceVerts(f);
    t.step({ op: "meshMerge", def: t.def, verts: [r[0], r[1], r[2]] });
    eq(t.uncovered(before).join("；"), ""); assert(t.freed(g).length > 0);
  });
  it("整个定义没了（删掉那份摆放、再清理没人用的组件：按它的全部面比；转硬表面这一刀照旧拒绝带画的，第 3 刀放开时走同一条路）", () => {
    const t = setup(), g = t.paint(), before = t.places(), inst = [...t.cur().def(t.cur().root).instances.values()].find((i) => i.def === t.def)!;
    t.step({ op: "eraseInstance", def: t.cur().root, instance: inst.id }, { op: "purgeDefs", defs: [t.def] });
    assert(!t.cur().defs.has(t.def), "定义没了");
    const idx = new RectIndex(t.freed(g)); for (const [f, p] of before) assert(idx.covers(p.r), `面 ${f} 的位置进了 freed`);
  });
});

describe("整列删掉：按这个定义的全部面比（removeColumn 不逐张面进改动日志）", () => {
  it("删掉画布代号那一列：原来在上面的面的位置都进 freed", () => {
    const t = setup(), g = t.paint(), k = t.k(), before = k.clone(), slots = [...t.cur().mesh(t.def).uvSetSlots], seq = k.changes.seq;
    k.removeColumn(UV_SET_COL.id);
    const cands = candidatesFor({ k: before, slots }, { k, slots }, seq);
    eq(cands, null, "那两列这一步加了 / 删了 = 按全部面比");
    const lost = lostPlaces({ k: before, slots }, { k, slots }, cands).get(g)!;
    eq(lost.lost.length, before.faces().length, "每张原来有位置的面都丢了位置"); eq(lost.held.length, 0);
    const out = mergeFreed(undefined, lost.lost, lost.held)!, rs: Rect[] = []; for (let i = 0; i < out.length; i += 4) rs.push([out[i], out[i + 1], out[i + 2], out[i + 3]]);
    const idx = new RectIndex(rs); for (const r of lost.lost) assert(idx.covers(r), "进了 freed");
  });
});

describe("同一步里先空出来、后补面：补面不落到这一步刚空出来的旧画上（统筹预审第 1 条）", () => {
  const meets = (a: Rect, b: Rect): boolean => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  /** 溶解两张画过的面之间的边：并出来的那张两边的位置对不上 → 拿掉位置 → 同一步重新找地方。返回它新找到的框碰不碰两张原面的旧框。 */
  const dissolve = (midStep: boolean) => {
    const t = setup(0, 1, midStep), g = t.paint(), k = t.k(), e = k.edges().find((x) => k.eFaces(x).length === 2)!, [a, b] = k.eFaces(e), before = t.places(), olds = [before.get(a)!.r, before.get(b)!.r];
    t.step({ op: "meshDelete", def: t.def, edges: [e], dissolve: true });
    const now = t.places(), grown = [...now].filter(([f, p]) => p.g === g && (!before.has(f) || before.get(f)!.v !== p.v)).map(([, p]) => p.r);
    return { t, g, before, grown, hits: grown.filter((r) => olds.some((o) => meets(r, o))).length };
  };
  it("溶解一条边：并出来的那张重新找到的地方不碰两张原面的旧框；旧位置都被盖住", () => {
    const r = dissolve(true);
    assert(r.grown.length > 0, "并出来的那张重新补了一块"); eq(r.hits, 0, "不碰两张原面的旧框");
    eq(r.t.uncovered(r.before).join("；"), "");
  });
  it("（这个例子有牙：收尾补面之前不先记空位 = 修之前，就会落到旧框上）", () => eq(dissolve(false).hits > 0, true));
  /** 同一步：删掉一张画过的面，再把另一张画过的面挤出去（侧面是新长的、走画、要补位置）。 */
  const deleteThenGrow = (midStep: boolean) => {
    const t = setup(0, 1, midStep), g = t.paint(), k = t.k(), [f, other] = k.faces(), before = t.places(), old = before.get(f)!.r;
    t.step({ op: "meshDelete", def: t.def, faces: [f] }, { op: "meshExtrude", def: t.def, faces: [other], along: 0.3 });
    const now = t.places(), grown = [...now].filter(([x, p]) => p.g === g && !before.has(x)).map(([, p]) => p.r);
    return { t, before, grown, hits: grown.filter((r) => meets(r, old)).length };
  };
  it("删掉一张画过的面、同一步再挤出另一张：新长的面不落在删掉那张的旧框上；旧位置都被盖住", () => {
    const r = deleteThenGrow(true);
    assert(r.grown.length > 0, "挤出长了新面、补了位置"); eq(r.hits, 0);
    eq(r.t.uncovered(r.before).join("；"), "");
  });
  it("（这个例子有牙：修之前，新长的面有一张落在删掉那张的旧框上）", () => eq(deleteThenGrow(false).hits > 0, true));
  it("整步最后那次记空位 = 收尾里已经记过的就不再改（多跑一次结果一样）", () => {
    const t = setup(), g = t.paint(), f = top(t.k()), h = t.h, base = freedBaseline(t.cur(), h);
    h.commit(t.cur(), { op: "meshDelete", def: t.def, faces: [f] }, false, "b", { title: "del" });
    const fo = freedOp(t.cur(), h, base)!; h.commit(t.cur(), fo, true, "b", { title: "freed" });
    eq(freedOp(t.cur(), h, base), null, "再跑一次 = 没有要改的"); assert(t.freed(g).length > 0);
  });
});

describe("给统筹确认的两件事（写进施工记录）", () => {
  it("改动日志给的「这一步动过的面」包括新加的、删掉的、只改了角上贴图坐标的", () => {
    const t = setup(); t.paint();
    const k = t.k(), [a, b] = k.faces(), seq = k.changes.seq;
    k.setCornerValues(a, UV_AT_COL.id, k.cornerValues(a, UV_AT_COL.id)!.map((x) => x + 1));   // 只改角上那一列
    k.removeFaces([b]);
    const vs = [P(5, 5, 5), P(6, 5, 5), P(6, 6, 5)].map((p) => k.addVertex(p)), nf = k.addFace(vs, { kind: "fresh", corner: new Map(), face: new Map() });
    const got = new Set(k.changes.since(seq)!.faces);
    assert(got.has(a), "只改了角上的"); assert(got.has(b), "删掉的"); assert(got.has(nf), "新加的");
  });
  it("整步中途 History.meshBefore(def, 这一步开始的位置) 拿到的是这一步开始之前的那一份", () => {
    const t = setup(); t.paint();
    const h = t.h, at = h.position(), [a, b] = t.k().faces();
    h.commit(t.cur(), { op: "meshDelete", def: t.def, faces: [a] }, false, "b", { title: "1" });
    const m1 = h.meshBefore(t.def, at); assert(m1.kind === "mesh" && m1.kernel.hasF(a) && m1.kernel.hasF(b), "第一条之后：两张都在");
    h.commit(t.cur(), { op: "meshDelete", def: t.def, faces: [b] }, true, "b", { title: "2" });
    const m2 = h.meshBefore(t.def, at); assert(m2.kind === "mesh" && m2.kernel.hasF(a) && m2.kernel.hasF(b), "第二条之后：还是这一步之前那份（两张都在）");
    assert(!t.k().hasF(a) && !t.k().hasF(b), "现在两张都没了");
  });
});

describe("坏坐标不卡死（统筹预审 B：进索引 / 进清单之前先和画布能到的范围取交集）", () => {
  for (const bad of [Infinity, -Infinity, 1e9, NaN]) {
    it(`一张面角上的坐标是 ${bad}：删掉它不卡、清单里没有非有限数、没有画布外的框；另一张坏面还在时两种读法不卡、都是有限数`, () => {
      const t = setup(), g = t.paint(), k = t.k(), [f, live] = k.faces();
      for (const x of [f, live]) { const v = Array.from(k.cornerValues(x, UV_AT_COL.id)!); v[0] = bad; v[3] = bad; k.setCornerValues(x, UV_AT_COL.id, v); }
      const row = t.cur().uvSets.get(g)!, [W, H] = freedReach(row.width, row.height);
      t.step({ op: "meshDelete", def: t.def, faces: [f] });
      for (const r of t.freed(g)) { assert(r.every(Number.isFinite), `非有限数 [${r.join(",")}]`); assert(r[0] >= 0 && r[1] >= 0 && r[2] <= W && r[3] <= H, `画布外 [${r.join(",")}]（范围 ${W} × ${H}）`); }
      assert(freedOpenAreas(t.cur(), g).every((r) => r.every(Number.isFinite)), "空地都是有限数");
      assert(placementBlocked(t.cur(), -1, g).every(Number.isFinite), "补面当占着的都是有限数（-1 = 所有定义都算）");
    });
  }
  it("文件里的 freed：正好到画布能到的边 = 认；出了范围（宽多 1 / 1e9）= 形状不对，当不认识的键带回、这套排法不自动找地方（不悄悄截短）", () => {
    const base = { guid: mintGuid(), name: "UV", width: 256, height: 256, pxPerM: 100, fit: "density" }, read = (freed: number[]) => readUvSetRows([{ ...base, freed }], () => new Uint8Array(0), {} as FormatReadNotes)[0];
    const H = freedReach(256, 256)[1], ok = read([0, 0, 256, H]);
    eq(ok.freed?.join(), `0,0,256,${H}`, "正好到边"); assert(uvSetAutoPlaces(ok));
    for (const freed of [[0, 0, 257, 10], [0, 0, 10, H + 1], [0, 0, 1e9, 1e9]]) {
      const r = read(freed);
      eq(r.freed, undefined, `[${freed.join(",")}] 不当 freed 用`); assert(!uvSetAutoPlaces(r), `[${freed.join(",")}] 带回、不自动找地方`);
    }
  });
  it("RectIndex 不收非有限数的框（坏坐标必须先取交集；格子循环的上界从框算）", () => {
    let threw = false; try { new RectIndex([[0, 0, Infinity, 1]]); } catch { threw = true; }
    assert(threw);
  });
});

describe("翻之前那份的代号用一步开始时的速查表（统筹预审 C：不假设速查表只往后加）", () => {
  it("同一步里速查表重排、面的代号跟着重编（以后「拿掉、清理」会这样）：只有删掉那张面的旧框进 freed，另一套一个框都不多", () => {
    const t = setup(), g1 = t.paint(), f2 = top(t.k()), g2 = t.paint([f2]);
    eq(t.cur().mesh(t.def).uvSetSlots.join(), [g1, g2].join(), "两套");
    const g2Before = t.freed(g2).map((r) => r.join()).join("|"), before = t.places(), victim = t.k().faces().find((f) => f !== f2)!, h = t.h, base = freedBaseline(t.cur(), h);
    h.commit(t.cur(), { op: "meshDelete", def: t.def, faces: [victim] }, false, "b", { title: "del" });
    const k = t.k(); t.cur().mesh(t.def).uvSetSlots.reverse();   // 只在内存里模拟：速查表重排 + 每张面的代号跟着改
    for (const f of k.faces()) { const c = k.faceValue(f, UV_SET_COL.id) ?? -1; if (c >= 0) k.setFaceValue(f, UV_SET_COL.id, 1 - c); }
    eq(t.places().get(f2)!.g, g2, "重编之后面还在原来那套上");
    const fo = freedOp(t.cur(), h, base); if (fo) h.commit(t.cur(), fo, true, "b", { title: "freed" });
    eq(t.freed(g2).map((r) => r.join()).join("|"), g2Before, "另一套一个框都不多");
    assert(new RectIndex(t.freed(g1)).covers(before.get(victim)!.r), "删掉那张的旧框进了它那一套");
  });
});

