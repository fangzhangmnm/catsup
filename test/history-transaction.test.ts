// 撤销栈的整步事务 + 摘记录（贴图主线 1-8a，统筹 11-11 裁定；施工单 ai-docs/20261111-paint-workorders-12.md）。created 2026-11-11 by Claude Opus 5.5
// 用一个假成分 probe：它改一张小表（键 → 值），记录 = { id, key, value }，swap = 把值放回去、返回放回之前的（自反）。按 id 注入三种毛病：问的时候说不能 / 翻的时候抛 / 翻回去也抛。
// ① 先后：撤销 = 指令倒着、每条指令的记录倒着；重做 = 正着。
// ② 一步里每个位置注入「说不能」「抛」（撤销、重做各一遍）：表和场景逐项和之前一样、游标没动、抛 StepFlipError。③ 「翻回去也抛」：那一条走 untrusted，别的照常翻回去。
// ④ 摘记录：摘掉的在游标前 / 游标后 / 正好是游标那一步；「只有记录」的步摘空了整步删，游标和驱逐线重算；forget 调了、dispose 没调。⑤ 截断重做段 = dispose；「只有记录」的步之后不许 join。
import { describe, it, eq, assert } from "./runner.mjs";
import { History, StepFlipError, type UndoComponent } from "../src/editor/history.ts";
import { Scene } from "../src/scene/scene.ts";
import type { Op } from "../src/editor/ops.ts";

interface Rec { readonly id: string; readonly key: string; readonly value: number }
function rig() {
  const world = new Map<string, number>(), log: string[] = [], refuse = new Set<string>(), boom = new Map<string, number>(), forgot: string[] = [], disposed: string[] = [], untrusted: string[] = [];
  let reswapBoom = false;
  const comp: UndoComponent<Rec> = {
    kind: "probe",
    swap: (r) => {
      const n = boom.get(r.id);
      if (n !== undefined) { if (n === 0) { boom.delete(r.id); throw new Error(`boom ${r.id}`); } boom.set(r.id, n - 1); }
      if (reswapBoom && log.length && log[log.length - 1] === `swap ${r.id}`) throw new Error(`reswap boom ${r.id}`);   // 刚翻过它、马上又翻它 = 翻回去那一下
      log.push(`swap ${r.id}`);
      const old = world.get(r.key) ?? 0; world.set(r.key, r.value); return { id: r.id, key: r.key, value: old };
    },
    bytes: () => 10,
    check: (recs, dir) => { for (const r of recs) if (refuse.has(r.id)) return `不能翻 ${r.id}（${dir}）`; return null; },
    untrusted: (r, cause) => { untrusted.push(r.id); return `${r.id} 作废了：${cause instanceof Error ? cause.message : String(cause)}`; },
    forget: (r) => { forgot.push(r.id); },
    dispose: (r) => { disposed.push(r.id); },
  };
  const s = new Scene(), h = new History<string>(s);
  h.registerComponent(comp as UndoComponent);
  /** 做一步：一条「加材质」指令（骨架记录）+ 挂几条 probe 记录（先改表再记：记录 = 之前的值）。 */
  const opStep = (name: string, recs: [string, string, number][]): void => {
    h.commit(h["current"] as Scene, { op: "addMaterial", name, color: [0.5, 0.5, 0.5] } as Op, false, `before ${name}`, { title: name });
    for (const [id, key, v] of recs) { const old = world.get(key) ?? 0; world.set(key, v); h.record("probe", { id, key, value: old }); }
  };
  /** 一步只有记录（画一笔那种）。 */
  const recStep = (name: string, recs: [string, string, number][]): void => {
    const out: Rec[] = [];
    for (const [id, key, v] of recs) { const old = world.get(key) ?? 0; world.set(key, v); out.push({ id, key, value: old }); }
    h.commitRecords(`before ${name}`, { title: name }, out.map((data) => ({ kind: "probe", data })));
  };
  const snap = (): string => JSON.stringify({ w: [...world].sort(), mats: (h["current"] as Scene).materials.map((m) => m.name), pos: h.position() });
  return { h, world, log, refuse, boom, forgot, disposed, untrusted, opStep, recStep, snap, setReswapBoom: (v: boolean) => { reswapBoom = v; } };
}
const flipErr = (fn: () => unknown): StepFlipError | null => { try { fn(); } catch (e) { if (e instanceof StepFlipError) return e; throw e; } return null; };

describe("撤销栈的整步事务（1-8a）", () => {
  it("① 先后：撤销 = 指令倒着、记录倒着；重做 = 正着", () => {
    const r = rig();
    r.opStep("A", [["a1", "x", 1], ["a2", "y", 2]]);
    r.log.length = 0; r.h.undo(); eq(r.log.join(","), "swap a2,swap a1", "撤销倒着");
    r.log.length = 0; r.h.redo(r.h["current"] as Scene); eq(r.log.join(","), "swap a1,swap a2", "重做正着");
  });
  it("② 一步里每个位置注入「说不能」：什么都没碰、游标没动（撤销、重做各一遍）", () => {
    for (const dir of ["undo", "redo"] as const) for (const at of ["b1", "b2", "b3"]) {
      const r = rig();
      r.opStep("A", [["a1", "x", 1]]); r.opStep("B", [["b1", "x", 5], ["b2", "y", 6], ["b3", "z", 7]]);
      if (dir === "redo") r.h.undo();
      const s0 = r.snap(); r.log.length = 0; r.refuse.add(at);
      const e = flipErr(() => (dir === "undo" ? r.h.undo() : r.h.redo(r.h["current"] as Scene)));
      assert(e?.reason === "refused" && e.message.includes(at), `${dir} ${at}：${e?.message}`);
      eq(r.log.length, 0, `${dir} ${at}：一条都没翻`);
      eq(r.snap(), s0, `${dir} ${at}：状态和游标没动`);
      r.refuse.clear();
      assert(dir === "undo" ? !!r.h.undo() : !!r.h.redo(r.h["current"] as Scene), "放开之后照常能翻");
    }
  });
  it("② 一步里每个位置注入「翻的时候抛」：翻过的翻回去，表、场景、游标和之前一样（撤销、重做各一遍；记录挂在指令那一步、和「只有记录」的步各一遍）", () => {
    for (const shape of ["op", "rec"] as const) for (const dir of ["undo", "redo"] as const) for (const at of ["b1", "b2", "b3"]) {
      const r = rig();
      r.opStep("A", [["a1", "x", 1]]);
      (shape === "op" ? r.opStep : r.recStep)("B", [["b1", "x", 5], ["b2", "y", 6], ["b3", "z", 7]]);
      if (dir === "redo") r.h.undo();
      const s0 = r.snap(); r.boom.set(at, 0);
      const e = flipErr(() => (dir === "undo" ? r.h.undo() : r.h.redo(r.h["current"] as Scene)));
      assert(e?.reason === "rolled-back" && e.untrusted.length === 0, `${shape} ${dir} ${at}：${e?.message}`);
      eq(r.snap(), s0, `${shape} ${dir} ${at}：逐项和之前一样`);
      assert(dir === "undo" ? !!r.h.undo() : !!r.h.redo(r.h["current"] as Scene), "毛病没了之后照常能翻");
    }
  });
  it("③ 翻回去也抛：那一条走 untrusted（说的话带在错里），别的照常翻回去、游标没动", () => {
    const r = rig();
    r.opStep("A", [["a1", "x", 1]]); r.recStep("B", [["b1", "x", 5], ["b2", "y", 6], ["b3", "z", 7]]);
    const pos = r.h.position(); r.boom.set("b1", 0); r.setReswapBoom(true);   // 撤销：先翻 b3、b2，b1 抛 → 翻回 b2（又抛）、b3
    const e = flipErr(() => r.h.undo());
    assert(e?.reason === "rolled-back", String(e));
    eq(r.untrusted.join(","), "b2", "翻回去抛的那一条");
    assert(e!.untrusted.some((t) => t.includes("b2 作废了")), "说的话带在错里");
    eq(r.h.position(), pos, "游标没动");
    eq(r.world.get("z"), 7, "别的（b3）照常翻回去了");
  });
});

describe("摘记录（1-8a）", () => {
  const build = () => {
    const r = rig();
    r.opStep("A", [["a1", "k", 1]]);          // 指令步，带一条要摘的
    r.recStep("B", [["b1", "k", 2]]);         // 只有记录，要摘 → 整步删
    r.recStep("C", [["c1", "k", 3], ["c2", "m", 1]]);   // 只有记录，摘一条剩一条 → 留着
    r.opStep("D", [["d1", "k", 4]]);
    r.recStep("E", [["e1", "k", 5]]);         // 只有记录，要摘 → 整步删
    return r;
  };
  const pick = (d: unknown): boolean => (d as Rec).key === "k";
  it("摘的在游标前、游标后、正好是游标那一步：只有记录的步摘空了删掉，游标跟着重算", () => {
    for (const [name, undos, want] of [["都在游标前", 0, 3], ["游标停在 D 之后（E 在游标后）", 1, 3], ["游标停在 C 之后（D、E 在游标后）", 2, 2], ["游标正好在 B（B 那一步刚撤）", 4, 1]] as const) {
      const r = build();
      for (let i = 0; i < undos; i++) r.h.undo();
      const n = r.h.dropRecords("probe", pick);
      eq(n, 5, `${name}：摘了 5 条`);
      eq(r.h.depth(), 3, `${name}：B、E 整步删了，A、C、D 留着`);
      eq(r.h.position(), want, `${name}：游标`);
      eq(r.forgot.sort().join(","), "a1,b1,c1,d1,e1", `${name}：forget`);
      eq(r.disposed.length, 0, `${name}：不 dispose`);
    }
  });
  it("摘完之后撤销、重做照常走（剩下的记录还能翻）", () => {
    const r = build();
    r.h.dropRecords("probe", pick);
    r.log.length = 0;
    while (r.h.undo());
    assert(r.log.includes("swap c2"), "C 那一步剩下的 c2 照常撤");
    eq(r.h.position(), 0);
    while (r.h.redo(r.h["current"] as Scene));
    eq(r.h.position(), 3);
  });
  it("删掉的步后面有 join 进来的指令（规矩以外的形状，手搭）：下一条接班当开头，不粘到前一步上", () => {
    const r = rig();
    r.opStep("A", [["a1", "x", 1]]);
    r.recStep("B", [["b1", "k", 2]]);
    r.opStep("C", [["c1", "y", 3]]);
    const h = r.h as unknown as { joins: boolean[]; sessions: unknown[]; labels: unknown[] };
    h.joins[2] = true; h.sessions[2] = null; h.labels[2] = undefined;   // C 硬塞成 B 那一步里 join 进来的
    eq(r.h.dropRecords("probe", (d) => (d as Rec).key === "k"), 1, "摘了 b1");
    eq(r.h.depth(), 2, "B 那条记号删了"); eq(r.h.position(), 2, "游标");
    eq(h.joins[1], false, "C 接班当开头");
    eq(r.h.topLabel()?.title, "B", "这一步的标签交给它");
    r.log.length = 0;
    const u = r.h.undo();
    assert(!!u && u.label?.title === "B", "撤的是这一整步");
    eq(r.log.join(","), "swap c1", "只撤 C，没连带 A");
    eq(r.h.position(), 1); eq(r.world.get("y"), 0); eq(r.world.get("x"), 1, "A 没动");
    r.h.undo(); eq(r.h.position(), 0, "再撤一下才到 A");
  });
  it("驱逐线跟着重算：被配额挤掉的「只有记录」的步摘空了也删，能撤的步数不变", () => {
    const r = rig();
    const s = new Scene(), h = new History<string>(s, { quotaBytes: 25 });   // 每条记录 10 字节：最多留两条
    h.registerComponent({ kind: "probe", swap: (x: unknown) => x, bytes: () => 10, forget: () => {}, dispose: () => {} } as UndoComponent);
    for (let i = 0; i < 5; i++) h.commitRecords(`b${i}`, { title: `R${i}` }, [{ kind: "probe", data: { id: `r${i}`, key: i === 3 ? "keep" : "k", value: 0 } }]);
    const canUndo0 = (() => { let n = 0; const c = h.position(); while (h.canUndo() && h.undo()) n++; while (h.position() < c) h.redo(s); return n; })();
    h.dropRecords("probe", (d) => (d as Rec).key === "k" && (d as Rec).id !== "r4");
    let n = 0; while (h.canUndo() && h.undo()) n++;
    assert(n >= 1 && n <= canUndo0, `摘之后还能撤 ${n} 步（之前 ${canUndo0}）`);
    void r;
  });
});

describe("截断和 join（1-8a）", () => {
  it("撤销之后做新的一步：重做段里的记录 dispose；「只有记录」的步之后的指令不 join 进来", () => {
    const r = rig();
    r.recStep("A", [["a1", "x", 1]]); r.recStep("B", [["b1", "x", 2]]);
    r.h.undo();
    r.recStep("C", [["c1", "x", 3]]);
    eq(r.disposed.join(","), "b1", "截断 = dispose");
    r.h.commit(r.h["current"] as Scene, { op: "addMaterial", name: "M", color: [1, 1, 1] } as Op, true, "x", { title: "M" });   // 叫它 join
    r.h.undo();
    eq(r.world.get("x"), 3, "M 自己是一步：撤它不连带 C");
  });
});
