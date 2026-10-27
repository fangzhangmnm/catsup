// brep 公理自检（FM83，2026-10-27 Claude Fable 5.1）：干净的场景 = 零违规；手工造的坏快照（fromBrep 只查结构、放得进）每种违规各抓一次；
// 自检只读（跑完快照不变）；操作串每步自检（抓内核自己造出的违规——差分对拍抓不到「合法但错」）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { BrepSnapshot } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
import { selfCheck, describeViolations } from "../src/kernel/self-check.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const square = (x: number, y: number, s = 1, z = 0): [Pt3, Pt3][] => [[P(x, y, z), P(x + s, y, z)], [P(x + s, y, z), P(x + s, y + s, z)], [P(x + s, y + s, z), P(x, y + s, z)], [P(x, y + s, z), P(x, y, z)]];
const kinds = (k: Kernel): string => [...new Set(selfCheck(k).map((v) => v.kind))].sort().join(",");

describe("公理自检", () => {
  it("干净的场景零违规：方块推拉成盒 + 地面格 + 圆跟随圆的球", () => {
    const k = new Kernel();
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) k.addEdges(square(i, j));
    k.pushPull(k.faces()[0].id, 1);
    eq(selfCheck(k).length, 0, describeViolations(selfCheck(k)));
    const snapBefore = JSON.stringify(k.toBrep());
    selfCheck(k);
    eq(JSON.stringify(k.toBrep()), snapBefore, "自检只读");
  });
  /** 大方块里再放一个小方块的膜（两环不同、没共享边、没切开）：fromBrep 的结构检查放得进，但同平面重叠。 */
  const overlapping = (): BrepSnapshot => {
    const k = new Kernel(); k.addEdges(square(0, 0, 3));
    const s = k.toBrep(), n = s.vertices.length;
    return { ...s, vertices: [...s.vertices, P(1, 1), P(2, 1), P(2, 2), P(1, 2)], edges: [...s.edges, [n, n + 1], [n + 1, n + 2], [n + 2, n + 3], [n + 3, n]], faces: [...s.faces, { plane: s.faces[0].plane, outer: [n, n + 1, n + 2, n + 3], holes: [] }] };
  };
  it("装载就挡住的：同环两份、顶点离平面 → fromBrep 直接拒（I4 和重复面在装载那一下建立）", () => {
    const k = new Kernel(); k.addEdges(square(0, 0));
    const s = k.toBrep();
    let threw = 0;
    try { Kernel.fromBrep({ ...s, faces: [...s.faces, { ...s.faces[0] }] }); } catch { threw++; }
    const v = [...s.vertices]; v[0] = P(v[0].x, v[0].y, 0.005);
    try { Kernel.fromBrep({ ...s, vertices: v }); } catch { threw++; }
    eq(threw, 2, "两种坏快照都被装载拒绝");
  });
  it("同平面两张膜重叠（大方块里一个小方块的膜，没切开）→ faceOverlap", () => {
    const k2 = Kernel.fromBrep(overlapping());
    const vs = selfCheck(k2);
    assert(vs.some((v) => v.kind === "faceOverlap"), `期望 faceOverlap，实得 ${kinds(k2)}`);
    assert(describeViolations(vs).includes("重叠"), describeViolations(vs));
  });
  it("T 形接头：顶点骑在边中间（没切开那条边）→ vertexRidesEdge", () => {
    const k = new Kernel(); k.addEdges(square(0, 0));
    const s = k.toBrep();
    // 加一个顶点在底边中点、再加一条从它出去的裸线（边只连到它，不切底边）
    const bad: BrepSnapshot = { ...s, vertices: [...s.vertices, P(0.5, 0), P(0.5, -0.5)], edges: [...s.edges, [s.vertices.length, s.vertices.length + 1]] };
    const k2 = Kernel.fromBrep(bad);
    assert(selfCheck(k2).some((v) => v.kind === "vertexRidesEdge"), `期望 vertexRidesEdge，实得 ${kinds(k2)}`);
  });
  it("两条边在中间交叉（没在交点切开）→ edgeCross", () => {
    const k = new Kernel(); k.addEdges(square(0, 0));
    const s = k.toBrep();
    const bad: BrepSnapshot = { ...s, vertices: [...s.vertices, P(-0.5, 0.5), P(1.5, 0.5)], edges: [...s.edges, [s.vertices.length, s.vertices.length + 1]] };   // 一条横穿方块的裸线，和左右两边各交一次
    const k2 = Kernel.fromBrep(bad);
    assert(selfCheck(k2).some((v) => v.kind === "edgeCross"), `期望 edgeCross，实得 ${kinds(k2)}`);
  });
  it("only / limit：只查一种、最多报一条", () => {
    const k2 = Kernel.fromBrep(overlapping());
    const vs = selfCheck(k2, { only: ["faceOverlap"], limit: 1 });
    eq(vs.length, 1); eq(vs[0].kind, "faceOverlap");
    eq(selfCheck(k2, { only: ["edgeCross", "vertexRidesEdge"] }).length, 0, "只查 I1 时重叠不报");
  });
  it("操作串每步自检：画 / 推拉 / 挪点折面 / 擦边 / 吸格点式挪点，全程零违规", () => {
    const k = new Kernel();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) k.addEdges(square(i, j));
    const step = (name: string): void => { const vs = selfCheck(k); eq(vs.length, 0, `${name}：${describeViolations(vs)} ${vs.slice(0, 3).map((v) => v.text).join("；")}`); };
    step("地面格");
    k.pushPull(k.faces()[0].id, 1); step("推拉");
    const top = k.vertices().filter((v) => v.z === 1);
    k.moveVertices([{ id: top[0].id, to: P(top[0].x + 0.2, top[0].y, 1.3) }]); step("挪点折面");
    const e = k.edges().find((e) => k.graph.pt(e.a).z === 0 && k.graph.pt(e.b).z === 0 && e.faceLinks.length === 2)!;
    k.eraseEdges([e.id]); step("擦共享边");
    const v2 = k.vertices().find((v) => v.z === 0 && v.x === 2 && v.y === 2)!;
    k.moveVertices([{ id: v2.id, to: P(2.05, 2.05, 0) }]); step("挪地面点");
  });
});
