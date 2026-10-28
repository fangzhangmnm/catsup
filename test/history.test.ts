// history / ops（A1 正规 undo，2026-09-20 → A3 2026-10-27 差量栈）：八个动词 do→undo→redo 逐字往返；差量栈 = 全量重放对照；op JSON 往返；
//   按坐标寻址跨 id 历史；提交失败回滚不记账；新提交清 redo 与其后快照。created 2026-09-20 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { History, OpApplyError } from "../src/editor/history.ts";
import { applyOp, edgeKey, faceKey, moveOp, resolveFace, resolveEdge, type Op } from "../src/editor/ops.ts";
import { fingerprint } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const rect = (x0: number, y0: number, x1: number, y1: number): Op => ({ op: "addEdges", segs: [[P(x0, y0), P(x1, y0)], [P(x1, y0), P(x1, y1)], [P(x1, y1), P(x0, y1)], [P(x0, y1), P(x0, y0)]] });
const chord = (y: number): Op => ({ op: "addEdges", segs: [[P(0, y), P(10, y)]] });
/** 独立重建：从空场景顺序应用（不经快照环）；返回根池内核。 */
const replayFresh = (ops: readonly Op[], n = ops.length): Kernel => { let s = new Scene(); for (const op of ops.slice(0, n)) s = applyOp(s, op).scene; return rootK(s); };
const rootK = (s: Scene): Kernel => s.kernelOf({ def: s.root, group: null });

describe("history: op 日志 + 检查点环（A1 正规 undo）", () => {
  it("八个动词 do → undo → redo：状态逐字回到 before / after", () => {
    const cases: { name: string; setup: Op[]; verb: (k: Kernel) => Op }[] = [
      { name: "addEdges", setup: [rect(0, 0, 10, 10)], verb: () => chord(5) },
      { name: "eraseEdges", setup: [rect(0, 0, 10, 10), chord(5)], verb: (k) => ({ op: "eraseEdges", edges: [edgeKey(k, k.edges().find((e) => e.faceLinks.length === 2)!.id)] }) },
      { name: "eraseFaces", setup: [rect(0, 0, 10, 10), chord(5)], verb: (k) => ({ op: "eraseFaces", faces: [faceKey(k, k.faces()[0].id)] }) },
      { name: "move", setup: [rect(0, 0, 10, 10)], verb: (k) => moveOp(k, [{ id: k.vertices().find((v) => v.x === 10 && v.y === 10)!.id, to: P(12, 13) }]) },
      { name: "pushpull", setup: [rect(0, 0, 10, 10)], verb: (k) => ({ op: "pushpull", face: faceKey(k, k.faces()[0].id), dist: 3 }) },
      { name: "eraseSelection", setup: [rect(0, 0, 10, 10), chord(5)], verb: (k) => ({ op: "eraseSelection", faces: [faceKey(k, k.faces()[0].id)], edges: [edgeKey(k, k.edges().find((e) => e.faceLinks.length === 1)!.id)] }) },
      { name: "clear", setup: [rect(0, 0, 10, 10)], verb: () => ({ op: "clear" }) },
      { name: "preset", setup: [rect(0, 0, 10, 10)], verb: () => ({ op: "preset", name: "回字" }) },
    ];
    for (const c of cases) {
      const h = new History(); let s = new Scene();
      for (const op of c.setup) s = h.commit(s, op).scene;
      const before = fingerprint(rootK(s));
      s = h.commit(s, c.verb(rootK(s))).scene;
      const after = fingerprint(rootK(s));
      assert(before !== after, `${c.name}: 动词改变了状态`);
      s = h.undo()!.scene;
      eq(fingerprint(rootK(s)), before, `${c.name}: undo 回 before`);
      const r = h.redo(s)!; s = r.scene;
      eq(fingerprint(rootK(s)), after, `${c.name}: redo 回 after`);
      assert(!h.canRedo(), `${c.name}: redo 栈空`);
      eq(fingerprint(rootK(h.replay())), after, `${c.name}: replay = 实时`);
    }
  });

  it("差量栈（A3）：九步每一步 undo = 全量重放对照；撤到底 = 空；一路重做回来", () => {
    const h = new History(); let s = new Scene();
    const ops: Op[] = [rect(0, 0, 10, 10), ...[1, 2, 3, 4, 5, 6, 7, 8].map(chord)];
    for (const op of ops) s = h.commit(s, op).scene;
    assert(h.usageBytes() > 0 && h.usageBytes() < 200_000, `撤销记录是差量不是整场景：${h.usageBytes()} B`);
    eq(rootK(s).faces().length, 9, "九格");
    for (let i = ops.length - 1; i >= 0; i--) {
      s = h.undo()!.scene;
      eq(fingerprint(rootK(s)), fingerprint(replayFresh(ops, i)), `undo 到 ${i} = 全量重放`);
    }
    assert(!h.canUndo(), "撤到底");
    eq(rootK(s).edges().length, 0, "回到空 base");
    for (let i = 1; i <= ops.length; i++) { s = h.redo(s)!.scene; eq(fingerprint(rootK(s)), fingerprint(replayFresh(ops, i)), `redo 到 ${i}`); }
  });

  it("op 可序列化：JSON 往返后的日志重放 = 实时（联机线协议形状）", () => {
    const h = new History(); let s = new Scene();
    s = h.commit(s, rect(0, 0, 10, 10)).scene;
    s = h.commit(s, chord(5)).scene;
    s = h.commit(s, { op: "pushpull", face: faceKey(rootK(s), rootK(s).faces()[0].id), dist: 2 }).scene;
    s = h.commit(s, moveOp(rootK(s), [{ id: rootK(s).vertices().find((v) => v.x === 0 && v.y === 0 && v.z === 0)!.id, to: P(-1, -1, 0) }])).scene;
    const wire = JSON.parse(JSON.stringify(h.log())) as Op[];
    eq(fingerprint(replayFresh(wire)), fingerprint(rootK(s)), "JSON 往返重放逐字一致");
    assert(!JSON.stringify(wire).includes('"id"'), "op 里没有运行时 id");
  });

  it("按坐标寻址：不同 id 历史的同几何内核，同一 op 结果一致", () => {
    const a = replayFresh([rect(0, 0, 10, 10), chord(5)]);
    const b = replayFresh([chord(5), rect(0, 0, 10, 10)]);   // 先画中缝再画框：id 分配全然不同
    eq(fingerprint(a), fingerprint(b), "同几何");
    const chordEdge = a.edges().find((e) => e.faceLinks.length === 2)!.id;
    const opErase: Op = { op: "eraseEdges", edges: [edgeKey(a, chordEdge)] };
    const opPP: Op = { op: "pushpull", face: faceKey(a, a.faces().find((f) => a.faceRings3(f.id)!.outer.some((p) => p.y === 10))!.id), dist: 4 };
    assert(resolveEdge(b, opErase.op === "eraseEdges" ? opErase.edges[0] : [P(0, 0), P(0, 0)]) !== undefined, "b 上能解析到边");
    assert(resolveFace(b, opPP.op === "pushpull" ? opPP.face : []) !== undefined, "b 上能解析到面");
    const a1 = rootK(applyOp(new Scene(a.clone()), opPP).scene), b1 = rootK(applyOp(new Scene(b.clone()), opPP).scene);
    eq(fingerprint(a1), fingerprint(b1), "pushpull 在两种 id 历史上结果一致");
    const a2 = rootK(applyOp(new Scene(a.clone()), opErase).scene), b2 = rootK(applyOp(new Scene(b.clone()), opErase).scene);
    eq(fingerprint(a2), fingerprint(b2), "eraseEdges 在两种 id 历史上结果一致");
  });

  it("提交失败回滚：目标已不在 → OpApplyError 带提交前内核，日志不记", () => {
    const h = new History(); let s = new Scene();
    s = h.commit(s, rect(0, 0, 10, 10)).scene;
    const k = rootK(s);
    const before = fingerprint(k);
    let err: unknown = null;
    try { h.commit(s, { op: "eraseEdges", edges: [[P(50, 50), P(60, 60)]] }); } catch (e) { err = e; }
    assert(err instanceof OpApplyError, "抛 OpApplyError");
    eq(fingerprint(rootK((err as OpApplyError).restored)), before, "restored = 提交前");
    eq(h.depth(), 1, "失败不记账");
    assert(!h.canRedo(), "无 redo 尾巴");
    // eraseSelection 里一个面缺席 → 整批不落地（解析先于改动）
    try { h.commit(s, { op: "eraseSelection", faces: [[P(1, 1), P(2, 2), P(3, 3)]], edges: [edgeKey(k, k.edges()[0].id)] }); } catch (e) { err = e; }
    eq(fingerprint(k), before, "整批不落地：现有边没被删");
    eq(h.depth(), 1);
  });

  it("新提交清 redo 尾巴；undo 仍回到正确的中间态", () => {
    const h = new History(); let s = new Scene();
    const ops: Op[] = [rect(0, 0, 10, 10), chord(2), chord(4), chord(6)];
    for (const op of ops) s = h.commit(s, op).scene;
    s = h.undo()!.scene; s = h.undo()!.scene; s = h.undo()!.scene;
    eq(h.position(), 1);
    s = h.commit(s, chord(9)).scene;
    eq(h.depth(), 2, "尾巴清掉");
    assert(!h.canRedo());
    eq(fingerprint(rootK(h.undo()!.scene)), fingerprint(replayFresh(ops, 1)), "undo 回到 rect 态");
  });
  it("只改选区的一步（commitSession）：0 条 op、能撤能重做、带回之前 / 之后的会话；新提交截掉它的重做尾巴", () => {
    const h = new History<string>(); let s = new Scene();
    s = h.commit(s, rect(0, 0, 10, 10), false, "A").scene;
    h.commitSession("sel-before", "sel-after");
    assert(h.canUndo()); eq(h.depth(), 2);
    const u = h.undo()!; eq(u.before, "sel-before"); eq(u.label?.title, "选择"); eq(fingerprint(rootK(u.scene)), fingerprint(rootK(s)), "几何没变");
    const r = h.redo(s)!; eq(r.after, "sel-after"); eq(r.events.length, 0);
    h.undo(); s = h.commit(s, chord(5), false, "B").scene; eq(h.depth(), 2, "重做尾巴截掉"); assert(!h.canRedo());
  });
  it("一步 = 好几条 op（join）：撤销 / 重做一次走完整步；undoOp 只退一条（user 2026-10-25「*6 /6的时候undo不对」）", () => {
    const h = new History(); let s = new Scene();
    s = h.commit(s, rect(0, 0, 10, 10)).scene;
    const one = fingerprint(rootK(s));
    for (let i = 1; i <= 6; i++) s = h.commit(s, chord(i), i > 1).scene;   // 阵列 ×6 = 一步六条
    const all = fingerprint(rootK(s));
    s = h.undo()!.scene;
    eq(h.position(), 1, "一次撤完六条");
    eq(fingerprint(rootK(s)), one);
    s = h.redo(s)!.scene;
    eq(h.position(), 7, "一次重做六条");
    eq(fingerprint(rootK(s)), all);
    s = h.undoOp()!.scene;
    eq(h.position(), 6, "undoOp 只退一条");
    s = h.commit(s, chord(8)).scene;   // 不 join = 新的一步
    s = h.undo()!.scene;
    eq(h.position(), 6, "新的一步单独撤");
    s = h.undo()!.scene;
    eq(h.position(), 1, "剩下五条仍是一步");
    eq(h.undo() !== null, true); eq(h.position(), 0);
    eq(h.commit(new Scene(), rect(0, 0, 1, 1), true).scene !== null, true, "第一条 join 无效（前面没有）");
    eq(h.undo() !== null, true); eq(h.position(), 0);
  });
  it("会话记录（2026-10-28 改：之后在步结束时封）：撤销带回「之前」，重做带回 sealStep 封的「之后」；同一步中间不另记；新分支截掉旧记录", () => {
    const h = new History<string>(); let s = new Scene();
    s = h.commit(s, rect(0, 0, 10, 10), false, "A前", { title: "画矩形" }).scene; h.sealStep("A后");
    s = h.commit(s, chord(2), false, "B前").scene;
    s = h.commit(s, chord(4), true, "不该记").scene;   // 和 B 同一步
    h.sealStep("B后", { title: "两条弦" });
    let u = h.undo()!;
    eq(u.before, "B前", "撤一步带回这一步之前的会话"); eq(u.label?.title, "两条弦", "sealStep 补的标签"); eq(h.position(), 1);
    s = u.scene;
    const r = h.redo(s)!;
    eq(r.after, "B后", "重做带回步结束时封的会话"); eq(r.label?.title, "两条弦"); eq(h.position(), 3);
    s = r.scene;
    u = h.undo()!; s = u.scene;
    u = h.undo()!; s = u.scene;
    eq(u.before, "A前"); eq(u.label?.title, "画矩形"); eq(h.position(), 0);
    s = h.redo(s)!.scene;   // 回到 A 之后
    s = h.commit(s, chord(6), false, "C前").scene; h.sealStep("C后");   // 新分支：B 那一步的记录作废
    u = h.undo()!;
    eq(u.before, "C前"); eq(h.position(), 1);
    s = u.scene;
    const r2 = h.redo(s)!;
    eq(r2.after, "C后", "重做的是新分支 C，不是旧的 B");
    const op = h.undoOp()!;
    eq(op.before, "C前", "undoOp 退到一步的开头 = 带回那一步之前的会话");
    h.sealStep("没有步也不炸");   // 游标不在栈顶：规章定义的结果 = 不做
  });
  it("部件注册表（2026-10-28 设计稿 §5 Phase B）：外部部件 register + 在当前步 record → 撤销 / 重做按自反 swap 走，和场景记录同一步；重名 / 没登记 = 登记处响亮失败", () => {
    const h = new History<string>(); let s = new Scene();
    const box = { v: 0 };   // 一个自带 substrate 的外部部件：记录 = 旧值
    h.registerComponent({ kind: "box", swap: (r: number) => { const old = box.v; box.v = r; return old; }, bytes: () => 8 });
    let threw = false; try { h.registerComponent({ kind: "box", swap: (r: number) => r, bytes: () => 0 }); } catch { threw = true; } assert(threw, "重名响亮失败");
    threw = false; try { h.record("nope", 1); } catch { threw = true; } assert(threw, "没登记响亮失败");
    threw = false; try { h.record("box", 1); } catch { threw = true; } assert(threw, "游标 0 没有步可挂");
    s = h.commit(s, rect(0, 0, 10, 10), false, "前").scene;
    const old = box.v; box.v = 5; h.record("box", old);   // 这一步里部件自己写了 substrate，记旧值
    h.sealStep("后");
    const g0 = fingerprint(rootK(s));
    s = h.undo()!.scene; eq(box.v, 0, "撤销把部件放回去"); eq(rootK(s).edges().length, 0, "场景记录同一步撤掉");
    s = h.redo(s)!.scene; eq(box.v, 5, "重做再放回来"); eq(fingerprint(rootK(s)), g0);
  });
  it("beforeLastOp：上一条 op 之前的池内核按记录倒推 = stateAt(pos − 1)（kernel 差量 / pool 整表 / 整份场景三种记录）；没碰的池 = null", () => {
    const h = new History(); let s = new Scene(); const at = { def: s.root, group: null };
    s = h.commit(s, rect(0, 0, 10, 10)).scene;
    s = h.commit(s, chord(3)).scene;
    eq(fingerprint(h.beforeLastOp(at)!), fingerprint(rootK(h.stateAt(h.position() - 1))), "kernel 差量记录：倒推 = 重放");
    eq(fingerprint(rootK(s)), fingerprint(rootK(h.replay())), "真身没被倒推碰到");
    s = h.commit(s, { op: "clear" }).scene;   // 整份场景记录
    const b = h.beforeLastOp(at); assert(b !== null, "整份场景记录也能倒推"); eq(fingerprint(b!), fingerprint(rootK(h.stateAt(h.position() - 1))));
    eq(h.beforeLastOp({ def: 999, group: null }), null, "没这个池 = null");
  });
  it("evictedSteps：被配额驱逐的是步数不是 op 数", () => {
    const h = new History(undefined, { quotaBytes: 1 }); let s = new Scene();
    s = h.commit(s, rect(0, 0, 10, 10)).scene;
    s = h.commit(s, chord(2)).scene; s = h.commit(s, chord(4), true).scene;   // 一步两条
    s = h.commit(s, chord(6)).scene;
    assert(h.evictedCount() >= 2, `驱逐了 ${h.evictedCount()} 条 op`);
    eq(h.evictedSteps(), h.evictedCount() === 3 ? 2 : 1);
  });
});
