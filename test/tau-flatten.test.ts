// tau-flatten.test.ts —— EGC 期 3b：τ 带里的投影一致性。created by Claude Fable 5.1, 2026-10-24
// 三条原语各一例（直接喂 PlanarGraph），再用内核场景对照：推拉帽离平行膜 0.5 mm（τ 带内）必须和精确落地逐字同形
// （XOR 湮灭重叠区、7 张膜），而不是被守恒断言拒绝 / 出垃圾。
import { describe, it, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { PlanarGraph } from "../src/kernel/topology.ts";
import { flattenPlanes } from "../src/kernel/tau-flatten.ts";
import { STICKY } from "../src/kernel/subdivide.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
import { checkInvariants } from "./kernel-fuzz.test.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const XY = { u: P(1, 0, 0), v: P(0, 1, 0) };
const key = (p: Pt3): string => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;

describe("tau-flatten：平面组内投影 ≤ r 的东西并成一个（EGC 期 3b）", () => {
  it("③ 两边 3D 相距 0.5 mm、投影真交 → 在旧边自己的点上切开，新边穿过它", () => {
    const g = new PlanarGraph();
    const a = g.ensureVertex(P(0, 0, 0)), b = g.ensureVertex(P(2, 0, 0));
    const e1 = g.addEdge(a, b);
    const c = g.ensureVertex(P(1, -1, 0.0005)), d = g.ensureVertex(P(1, 1, 0.0005));
    const e2 = g.addEdge(c, d);
    const splits: [number, number[]][] = [];
    const changed = flattenPlanes(g, [{ basis: XY, edges: new Set([e1, e2]) }], {
      r: STICKY.r, dirty: new Set([e2]), isOldEdge: (e) => e === e1, isOldVertex: (v) => v <= b,
      onSplit: (p, ch) => splits.push([p, [...ch]]),
    });
    assert(changed, "应当改图");
    assert(g.edges().length === 4, `4 条边，实得 ${g.edges().length}`);
    const x = g.vertices().find((v) => key(v) === key(P(1, 0, 0)));
    assert(!!x, "交点在旧边 e1 自己的 3D 点 (1,0,0) 上（不是 e2 的 (1,0,0.0005)）");
    assert(x!.edges.size === 4, `交点度 4，实得 ${x!.edges.size}`);
    assert(splits.length === 2 && splits.every(([, ch]) => ch.length === 2), "两条边各报一次切割血缘（各 2 子边）");
  });
  it("② 新边端点骑在旧边投影内部（3D 差 0.5 mm）→ 旧边穿过那个顶点，顶点不动", () => {
    const g = new PlanarGraph();
    const a = g.ensureVertex(P(0, 0, 0)), b = g.ensureVertex(P(2, 0, 0));
    const e1 = g.addEdge(a, b);
    const c = g.ensureVertex(P(1, 0, 0.0005)), d = g.ensureVertex(P(1, 1, 0.0005));
    const e2 = g.addEdge(c, d);
    const changed = flattenPlanes(g, [{ basis: XY, edges: new Set([e1, e2]) }], { r: STICKY.r, dirty: new Set([e2]), isOldEdge: (e) => e === e1, isOldVertex: (v) => v <= b });
    assert(changed && g.edges().length === 3, `3 条边，实得 ${g.edges().length}`);
    assert(g.vertex(c).edges.size === 3 && key(g.pt(c)) === key(P(1, 0, 0.0005)), "顶点 c 不动、度 3（旧边弯过来）");
    assert(g.vertices().length === 4, "没有新顶点");
  });
  it("① 两顶点投影重合、3D 差 0.5 mm → 新顶点并进旧顶点", () => {
    const g = new PlanarGraph();
    const a = g.ensureVertex(P(0, 0, 0)), b = g.ensureVertex(P(1, 0, 0));
    const e1 = g.addEdge(a, b);
    const c = g.ensureVertex(P(1, 0, 0.0005)), d = g.ensureVertex(P(1, 1, 0.0005));
    const e2 = g.addEdge(c, d);
    const merges: [number, number][] = [];
    const changed = flattenPlanes(g, [{ basis: XY, edges: new Set([e1, e2]) }], { r: STICKY.r, dirty: new Set([e2]), isOldEdge: (e) => e === e1, isOldVertex: (v) => v <= b, onMerge: (f, t) => merges.push([f, t]) });
    assert(changed, "应当改图");
    assert(merges.length === 1 && merges[0][0] === c && merges[0][1] === b, `新 c 并进旧 b，实得 ${JSON.stringify(merges)}`);
    assert(!g.hasVertex(c) && g.hasEdge(e2) && (g.edge(e2).a === b || g.edge(e2).b === b), "e2 保 id、改接到 b");
    assert(g.vertices().length === 3, "3 个顶点");
  });
  it("没有 τ 带问题的图：不改、返回 false", () => {
    const g = new PlanarGraph();
    const a = g.ensureVertex(P(0, 0, 0)), b = g.ensureVertex(P(2, 0, 0)), c = g.ensureVertex(P(1, 1, 0));
    const e1 = g.addEdge(a, b), e2 = g.addEdge(b, c), e3 = g.addEdge(c, a);
    const changed = flattenPlanes(g, [{ basis: XY, edges: new Set([e1, e2, e3]) }], { r: STICKY.r, dirty: new Set([e2, e3]), isOldEdge: () => false, isOldVertex: () => false });
    assert(!changed && g.edges().length === 3, "三角形原样");
  });

  // 内核场景：地板 2×2 @ z=0；小矩形 1×2 伸出地板一截，从 z=∓0.5 推到离地板 τ/2（τ 带内；τ 出厂 10 µm → 5 µm）
  const TAU = new Kernel().coplanarTol, HALF = Math.round((TAU / 2) / 1e-6) * 1e-6;
  const rect = (k: Kernel, x0: number, y0: number, x1: number, y1: number, z: number): void => { k.addEdges([[P(x0, y0, z), P(x1, y0, z)], [P(x1, y0, z), P(x1, y1, z)], [P(x1, y1, z), P(x0, y1, z)], [P(x0, y1, z), P(x0, y0, z)]]); };
  const scenario = (dz: number, dist: number): { faces: number; horiz: number[] } => {
    const k = new Kernel();
    rect(k, 0, 0, 2, 2, 0);
    const before = new Set(k.faces().map((f) => f.id));
    rect(k, 0.5, 0.5, 1.5, 2.5, dz);
    const B = k.faces().find((f) => !before.has(f.id))!;
    k.pushPull(B.id, dist);
    checkInvariants(k, `pp dz=${dz} dist=${dist}`);
    const horiz = k.faces().filter((f) => Math.abs(k.planeOf(f.id)!.plane.n.z) > 0.99 && Math.abs(k.planeOf(f.id)!.plane.d) < 0.01).map((f) => f.outer.vids.length).sort((a, b) => a - b);
    return { faces: k.faces().length, horiz };
  };
  it("推拉帽离平行地板 τ/2（差一点 / 过一点 / 从上往下）= 精确落地同形：7 张膜、地板平面 [4v, 8v]（XOR 湮灭重叠区）", () => {
    const exact = scenario(-0.5, 0.5);
    assert(exact.faces === 7 && exact.horiz.join() === "4,8", `精确落地基线 ${JSON.stringify(exact)}`);
    for (const [dz, dist] of [[-0.5, 0.5 - HALF], [-0.5, 0.5 + HALF], [0.5, -(0.5 - HALF)], [0.5, -(0.5 + HALF)]] as const) {
      const r = scenario(dz, dist);
      assert(r.faces === exact.faces && r.horiz.join() === exact.horiz.join(), `dz=${dz} dist=${dist}: ${JSON.stringify(r)} ≠ ${JSON.stringify(exact)}`);
    }
  });
});
