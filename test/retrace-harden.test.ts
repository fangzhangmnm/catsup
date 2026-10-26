// 画线描过软边 = 变硬（user 2026-10-26「画线描过一条软边，就把它变硬。这个行为我一直以为你默认做了，这个确实是应该有的行为」）。created 2026-10-26 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { History } from "../src/editor/history.ts";
import { edgeKey } from "../src/editor/ops.ts";

describe("画线描过软边 = 变硬", () => {
  it("盒子竖棱软化后，画线（harden）描过它 = 变硬；只描一半 = 只那一半变硬；不带 harden 的 addEdges 不动；撤销回软", () => {
    const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
    const s = new Scene(), h = new History<null>(), at = { def: s.root, group: null };
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs: [Pt3, Pt3][] = [];
    for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(b[0], b[1], 0)], [P(a[0], a[1], 1), P(b[0], b[1], 1)], [P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    h.commit(s, { op: "addEdges", at, segs });
    const k = s.kernelOf(at);
    const rib = (): number => k.edges().find((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return a.x === 1 && a.y === 0 && b.x === 1 && b.y === 0 && Math.abs(a.z - b.z) === 1; })!.id;
    h.commit(s, { op: "setEdgeLayers", at, edges: [edgeKey(k, rib())], layers: ["soft", "smooth"], on: true });
    assert(k.isSoft(rib()) && k.isSmooth(rib()), "先软化");
    h.commit(s, { op: "addEdges", at, segs: [[P(1, 0, 0), P(1, 0, 1)]] });
    assert(k.isSoft(rib()), "不带 harden（导入 / 内部）= 不动");
    h.commit(s, { op: "addEdges", at, segs: [[P(1, 0, 0), P(1, 0, 1)]], harden: true });
    assert(!k.isSoft(rib()) && !k.isSmooth(rib()), "描过 = 变硬");
    const u = h.undo()!;
    const k2 = u.scene.kernelOf(at);
    const rib2 = k2.edges().find((e) => { const a = k2.graph.pt(e.a), b = k2.graph.pt(e.b); return a.x === 1 && a.y === 0 && b.x === 1 && b.y === 0 && Math.abs(a.z - b.z) === 1; })!.id;
    assert(k2.isSoft(rib2), "撤销 = 回软");
    eq(k2.edges().length, 12);
  });
});
