// lab journal（undo/redo 日志重放）——确定性由内核公理 5 + preview 测试背书，这里钉集成面。
// created by Claude Fable 5, 2026-09-01
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt } from "../src/kernel/kernel.ts";
import { Journal } from "../src/lab/journal.ts";

const P = (x: number, y: number): Pt => ({ x, y });
const rectSegs = (x0: number, y0: number, x1: number, y1: number): [Pt, Pt][] => [
  [P(x0, y0), P(x1, y0)], [P(x1, y0), P(x1, y1)], [P(x1, y1), P(x0, y1)], [P(x0, y1), P(x0, y0)],
];
const canon = (k: Kernel): string =>
  k.edges().map((e) => {
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    const s1 = `${a.x},${a.y}`, s2 = `${b.x},${b.y}`;
    return s1 < s2 ? `${s1}|${s2}` : `${s2}|${s1}`;
  }).sort().join(" ") + ` F=${k.faces().map((f) => f.id).sort().join(",")}`;

describe("lab journal: undo/redo 日志重放", () => {
  it("undo 弹批重放、redo 原路返回、状态逐字一致", () => {
    const j = new Journal();
    let k = new Kernel();
    k = j.commit(k, { op: "addEdges", segs: rectSegs(0, 0, 10, 10) }).kernel;
    const afterRect = canon(k);
    k = j.commit(k, { op: "addEdges", segs: [[P(0, 5), P(10, 5)]] }).kernel;
    const afterChord = canon(k);
    eq(k.faces().length, 2, "日字两膜");
    k = j.undo()!;
    eq(canon(k), afterRect, "undo 回到矩形态（含 face id）");
    eq(k.faces().length, 1, "一膜");
    const r = j.redo(k)!;
    k = r.kernel;
    eq(canon(k), afterChord, "redo 逐字回到日字态");
    assert(!j.canRedo(), "redo 栈清空");
  });

  it("move 批可撤销；新提交清空 redo 分支", () => {
    const j = new Journal();
    let k = new Kernel();
    k = j.commit(k, { op: "preset", name: "日字" }).kernel;
    const before = canon(k);
    const vid = k.vertices().find((v) => v.x === -100 && v.y === -60)!.id;
    k = j.commit(k, { op: "move", moves: [{ id: vid, to: { x: -120, y: -80, z: 0 } }] }).kernel;
    assert(canon(k) !== before, "move 改变了状态");
    k = j.undo()!;
    eq(canon(k), before, "undo 撤回 move");
    k = j.commit(k, { op: "clear" }).kernel;
    assert(!j.canRedo(), "新提交清 redo");
    eq(k.edges().length, 0, "clear 生效");
  });

  it("重放确定性：两次 replay 状态逐字一致（id 含）", () => {
    const j = new Journal();
    let k = new Kernel();
    k = j.commit(k, { op: "preset", name: "回字" }).kernel;
    const inner = k.faces().find((f) => f.holes.length === 0)!;
    k = j.commit(k, { op: "eraseFaces", ids: [inner.id] }).kernel;
    eq(canon(j.replay()), canon(j.replay()), "重放×2 一致");
    eq(canon(j.replay()), canon(k), "重放 = 实时");
  });
});
