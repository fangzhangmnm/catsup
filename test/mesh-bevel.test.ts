// 网格体倒角（2026-10-28 Claude Opus 5.5；纪元账本 FM152 user「bevel为什么不做？这个没什么歧义吧。」）。
// 标准答案：封闭的盒子倒完还是封闭、每条边恰两张面且两张面走的方向相反（朝向一致）；面数 / 点数按 Blender 同款结果数；宽度落在离原边 w 的地方。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, F_SMOOTH } from "../src/mesh/mesh-kernel.ts";
import { addBox, addPrimitive } from "../src/mesh/ops/index.ts";
import { bevelEdges, bevelVerts } from "../src/mesh/ops/bevel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const cube = (): MeshKernel => { const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1)); return m; };
/** 封闭 + 朝向一致：每条边恰两张面，两张面在这条边上走的方向相反。 */
function closedConsistent(m: MeshKernel): string[] {
  const bad: string[] = [];
  for (const e of m.edges()) {
    const fs = [...m.eFaces(e)];
    if (fs.length !== 2) { bad.push(`edge ${e}: ${fs.length} faces`); continue; }
    const a = m.edgeA[e], b = m.edgeB[e];
    const dirIn = (f: number): number => { const r = m.faceVerts(f), i = r.indexOf(a); return r[(i + 1) % r.length] === b ? 1 : -1; };
    if (dirIn(fs[0]) === dirIn(fs[1])) bad.push(`edge ${e}: both faces run the same way`);
  }
  return bad;
}
/** 所有面朝外（盒心在 c）：面法向 · (面心 − c) > 0。 */
function allOutward(m: MeshKernel, c: Pt3): number {
  let bad = 0;
  for (const f of m.faces()) { const n = m.faceNormal(f), ps = m.facePts(f), g = ps.reduce((s, p) => P(s.x + p.x / ps.length, s.y + p.y / ps.length, s.z + p.z / ps.length), P(0, 0, 0)); if (n.x * (g.x - c.x) + n.y * (g.y - c.y) + n.z * (g.z - c.z) <= 0) bad++; }
  return bad;
}
const edgeAt = (m: MeshKernel, a: Pt3, b: Pt3): number => m.edges().find((e) => { const p = m.pt(m.edgeA[e]), q = m.pt(m.edgeB[e]); const same = (x: Pt3, y: Pt3): boolean => Math.hypot(x.x - y.x, x.y - y.y, x.z - y.z) < 1e-9; return (same(p, a) && same(q, b)) || (same(p, b) && same(q, a)); })!;
const C = P(0.5, 0.5, 0.5);

describe("倒边（bevelEdges）", () => {
  it("盒子一条边、1 段：面 6 → 7、点 8 → 10；两张端面变五边形；倒角面在离原边 0.1 处；封闭、朝外", () => {
    const m = cube(), e = edgeAt(m, P(1, 0, 1), P(1, 1, 1));
    const r = bevelEdges(m, [e], 0.1, 1);
    eq(m.faceCount(), 7); eq(m.vertexCount(), 10); eq(r.faces.length, 1); eq(r.clamped, false);
    eq(m.check().join("\n"), ""); eq(closedConsistent(m).join("\n"), ""); eq(allOutward(m, C), 0);
    const ch = m.facePts(r.faces[0]);
    assert(ch.every((p) => Math.abs((1 - p.x) + (1 - p.z) - 0.1) < 1e-9), `倒角面的四个角都在 x + z = 1.9 上（离棱 0.1）：${JSON.stringify(ch)}`);
    eq(m.faces().filter((f) => m.faceVerts(f).length === 5).length, 2, "两张端面 = 五边形");
  });
  it("盒子一条边、3 段：圆角三条带、中间两条纵向边标平滑；端面上有截面点；封闭", () => {
    const m = cube(), e = edgeAt(m, P(1, 0, 1), P(1, 1, 1));
    const r = bevelEdges(m, [e], 0.2, 3);
    eq(r.faces.length, 3); eq(m.check().join("\n"), ""); eq(closedConsistent(m).join("\n"), ""); eq(allOutward(m, C), 0);
    eq(m.faces().filter((f) => m.faceVerts(f).length === 7).length, 2, "端面 = 4 + 圆角上 3 个点 = 7 边形");
    eq(m.edges().filter((x) => m.edgeFlags[x] & F_SMOOTH).length, 2, "圆角中间两条纵向边平滑");
    // 圆角上的点离棱心 (0.8, *, 0.8) 都是 0.2（90° 时有理贝塞尔 = 正圆弧）
    const mids = m.verts().map((v) => m.pt(v)).filter((p) => p.x > 0.8 + 1e-9 && p.z > 0.8 + 1e-9);
    eq(mids.length, 4, "端面各 2 个中间截面点");
    for (const p of mids) assert(Math.abs(Math.hypot(p.x - 0.8, p.z - 0.8) - 0.2) < 1e-9, `正圆弧：${JSON.stringify(p)}`);
  });
  it("盒子一个角的两条边（顶面上相邻）：两条倒角带在角上斜着接，不补片", () => {
    const m = cube(), e1 = edgeAt(m, P(1, 0, 1), P(1, 1, 1)), e2 = edgeAt(m, P(0, 1, 1), P(1, 1, 1));
    const r = bevelEdges(m, [e1, e2], 0.1, 1);
    eq(r.faces.length, 2); eq(m.check().join("\n"), ""); eq(closedConsistent(m).join("\n"), ""); eq(allOutward(m, C), 0);
  });
  it("盒子一个角的三条边：角上补一张三角形；三段 = 补片带截面点；封闭", () => {
    for (const seg of [1, 3]) {
      const m = cube(), c = P(1, 1, 1), es = [edgeAt(m, P(0, 1, 1), c), edgeAt(m, P(1, 0, 1), c), edgeAt(m, P(1, 1, 0), c)];
      const r = bevelEdges(m, es, 0.1, seg);
      eq(r.faces.length, 3 * seg + 1, `${seg} 段`); eq(m.check().join("\n"), ""); eq(closedConsistent(m).join("\n"), ""); eq(allOutward(m, C), 0);
      eq(m.faceVerts(r.faces[r.faces.length - 1]).length, 3 * seg, "角上补片");
    }
  });
  it("整个盒子 12 条边：6 + 12 + 8 = 26 张面，封闭、朝外", () => {
    for (const seg of [1, 2]) {
      const m = cube(), r = bevelEdges(m, m.edges(), 0.1, seg);
      eq(m.faceCount(), 6 + 12 * seg + 8, `${seg} 段`); eq(r.clamped, false);
      eq(m.check().join("\n"), ""); eq(closedConsistent(m).join("\n"), ""); eq(allOutward(m, C), 0);
    }
  });
  it("太宽被夹住、并报出来：盒子整圈倒 0.8 → 夹到 0.49", () => {
    const m = cube(), r = bevelEdges(m, m.edges(), 0.8, 1);
    eq(r.clamped, true); assert(Math.abs(r.width - 0.49) < 1e-9, `${r.width}`);
    eq(m.check().join("\n"), ""); eq(closedConsistent(m).join("\n"), "");
  });
  it("圆柱顶圈（一整圈边）：封闭、朝外；跳过 0 条", () => {
    const m = new MeshKernel(); addPrimitive(m, "cylinder", { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) }, [0.5, 0.5, 1], 12);
    const rim = m.edges().filter((e) => m.pt(m.edgeA[e]).z === 1 && m.pt(m.edgeB[e]).z === 1);
    eq(rim.length, 12);
    const r = bevelEdges(m, rim, 0.05, 2);
    eq(r.skipped, 0); eq(r.faces.length, 24); eq(m.check().join("\n"), ""); eq(closedConsistent(m).join("\n"), ""); eq(allOutward(m, P(0, 0, 0.5)), 0, "圆柱心在 (0, 0, 0.5)");
  });
  it("开口的面（边界上的边 / 端点在边界上）跳过、如实报", () => {
    const m = new MeshKernel(); addPrimitive(m, "plane", { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) }, [1, 1, 0], 4);
    const r = bevelEdges(m, m.edges(), 0.1, 1);
    eq(r.faces.length, 0); assert(r.skipped > 0); eq(m.check().join("\n"), "");
  });
  it("确定性：同一份内核两次倒同样的边 → 同样的 id 和位置", () => {
    const run = (): string => { const m = cube(); bevelEdges(m, [m.edges()[0], m.edges()[3]], 0.13, 2); return JSON.stringify({ v: m.verts().map((v) => [v, m.pt(v)]), f: m.faces().map((f) => m.faceVerts(f)) }); };
    eq(run(), run());
  });
});

describe("倒点（bevelVerts）", () => {
  it("盒子一个角：切掉一个三角形；面 6 → 7、点 8 → 10；封闭、朝外；切点离角 0.2", () => {
    const m = cube(), v = m.verts().find((x) => { const p = m.pt(x); return p.x === 1 && p.y === 1 && p.z === 1; })!;
    const r = bevelVerts(m, [v], 0.2);
    eq(r.faces.length, 1); eq(m.faceCount(), 7); eq(m.vertexCount(), 10);
    eq(m.check().join("\n"), ""); eq(closedConsistent(m).join("\n"), ""); eq(allOutward(m, C), 0);
    for (const p of m.facePts(r.faces[0])) assert(Math.abs((1 - p.x) + (1 - p.y) + (1 - p.z) - 0.2) < 1e-9, JSON.stringify(p));
  });
  it("盒子全部 8 个角：14 张面，封闭；相邻两角共用的边夹在 49%", () => {
    const m = cube(), r = bevelVerts(m, m.verts(), 0.7);
    eq(r.clamped, true); eq(m.faceCount(), 14); eq(m.check().join("\n"), ""); eq(closedConsistent(m).join("\n"), ""); eq(allOutward(m, C), 0);
  });
});
