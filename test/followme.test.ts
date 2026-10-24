// follow-me（0.8，2026-10-21，Claude Fable 5.1）：扫掠几何（斜切站）+ 内核 followMe 的像表规则——
// 管子（= 推拉）、L 形路径的硬关节、旋转体（闭圆路径 → 侧面平滑、横截面不留）、沿盒子棱倒角（XOR 湮灭顶条 / 侧条，结果是闭合实体）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { sweepStations, dedupeRing, simplifyPath } from "../src/kernel/sweep.ts";
import { circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const manifold = (k: Kernel): boolean => k.edges().every((e) => e.faceLinks.length === 2);
const faceWhere = (k: Kernel, pred: (p: Pt3) => boolean) => k.faces().filter((f) => k.faceRings3(f.id)!.outer.every(pred));
const bounds = (pts: Pt3[]) => ({ min: pts.reduce((a, p) => ({ x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), z: Math.min(a.z, p.z) }), { x: Infinity, y: Infinity, z: Infinity }), max: pts.reduce((a, p) => ({ x: Math.max(a.x, p.x), y: Math.max(a.y, p.y), z: Math.max(a.z, p.z) }), { x: -Infinity, y: -Infinity, z: -Infinity }) });
const box10 = (): Kernel => {
  const k = new Kernel();
  k.addEdges([[P(0, 0), P(10, 0)], [P(10, 0), P(10, 10)], [P(10, 10), P(0, 10)], [P(0, 10), P(0, 0)]]);
  k.pushPull(k.faces()[0].id, 10);
  return k;
};

describe("sweep: 斜切站", () => {
  it("直线路径两站 = 平移；L 形路径关节站在角平分面上（45° 斜切）", () => {
    const sq = [[P(0, 0), P(1, 0), P(1, 1), P(0, 1)]];
    const st = sweepStations(sq, [P(0.5, 0.5, 0), P(0.5, 0.5, 2)], false);
    assert(typeof st !== "string", "ok");
    const s = st as Pt3[][][];
    eq(s.length, 2); assert(s[1][0].every((p) => near(p.z, 2)), "末站在 z=2");
    const L = sweepStations(sq, [P(0.5, 0.5, 0), P(0.5, 0.5, 2), P(3, 0.5, 2)], false) as Pt3[][][];
    eq(L.length, 3);
    // 关节切面：过 (0.5,0.5,2)，法向 (1,0,1)/√2 → 点满足 x + z = 2.5
    assert(L[1][0].every((p) => near(p.x + p.z, 2.5)), "关节站在 x+z=2.5 上");
    assert(L[2][0].every((p) => near(p.x, 3)), "末站 x=3");
    const back = sweepStations(sq, [P(0.5, 0.5, 0), P(0.5, 0.5, 2), P(0.5, 0.5, 0)], false);
    eq(typeof back, "string", "折回 180° → 失败");
    eq(dedupeRing([P(0, 0), P(0, 0), P(1, 0), P(1, 1), P(0, 0)]).length, 3, "去重 → 三角");
    const sp = simplifyPath([P(0, 0, 10), P(10, 0, 10), P(10, 1, 10), P(10, 10, 10), P(0, 10, 10)], true, [false, false, true, false, false]);
    eq(sp.path.length, 4, "共线关节 (10,1,10) 并掉"); eq(sp.smoothJoints!.length, 4);
    eq(simplifyPath([P(0, 0, 0), P(1, 0, 0), P(2, 0, 0)], false).path.length, 2, "开路径中间共线点并掉");
  });
});

describe("followMe: 内核像表", () => {
  it("管子：圆轮廓沿竖线 = 圆柱（26 面；侧棱 soft+smooth 24；两端圈 curve）", () => {
    const k = new Kernel();
    k.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(0, 0, 0), P(1, 0, 0), 24), { curve: true });
    const fid = k.faces()[0].id;
    k.followMe(fid, [P(0, 0, 0), P(0, 0, 3)], { closed: false });
    eq(k.faces().length, 26, "24 侧 + 2 帽");
    assert(manifold(k), "闭合实体");
    const risers = k.edges().filter((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return !near(a.z, b.z); });
    eq(risers.length, 24); assert(risers.every((e) => k.isSoft(e.id) && k.isSmooth(e.id)), "侧棱软 + 平滑");
    const rims = k.edges().filter((e) => near(k.graph.pt(e.a).z, k.graph.pt(e.b).z));
    eq(rims.length, 48); assert(rims.every((e) => k.isCurve(e.id) && !k.isSoft(e.id)), "两端圈 = 曲线成员、画黑边");
  });
  it("L 形路径：方轮廓 → 10 面闭合实体；关节圈 4 条硬边", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]]);
    k.followMe(k.faces()[0].id, [P(0.5, 0.5, 0), P(0.5, 0.5, 2), P(3, 0.5, 2)], { closed: false, smoothJoints: [false, false, false] });
    eq(k.faces().length, 10, "4 + 4 侧 + 2 帽");
    assert(manifold(k), "闭合实体");
    const joint = k.edges().filter((e) => near(k.graph.pt(e.a).x + k.graph.pt(e.a).z, 2.5) && near(k.graph.pt(e.b).x + k.graph.pt(e.b).z, 2.5));
    eq(joint.length, 4, "关节圈四边"); assert(joint.every((e) => !k.isSoft(e.id)), "硬关节");
    eq(k.edges().length, 20);
  });
  it("旋转体：方轮廓沿 12 段圆（曲线成员）闭合 = 48 面环；站圈全软、经线硬；横截面不留", () => {
    const k = new Kernel();
    // 轮廓在 y=0 平面：x∈[2,3]，z∈[0,1]
    k.addEdges([[P(2, 0, 0), P(3, 0, 0)], [P(3, 0, 0), P(3, 0, 1)], [P(3, 0, 1), P(2, 0, 1)], [P(2, 0, 1), P(2, 0, 0)]]);
    eq(k.faces().length, 1);
    const path: Pt3[] = []; for (let i = 0; i < 12; i++) { const a = (2 * Math.PI * i) / 12; path.push(P(2.5 * Math.cos(a), 2.5 * Math.sin(a), 0)); }
    k.followMe(k.faces()[0].id, path, { closed: true, smoothJoints: path.map(() => true) });
    eq(k.faces().length, 48, "12 段 × 4 面，无帽无横截面");
    assert(manifold(k), "闭合实体");
    const soft = k.edges().filter((e) => k.isSoft(e.id) && k.isSmooth(e.id)), hard = k.edges().filter((e) => !k.isSoft(e.id));
    eq(soft.length, 48, "站圈全软"); eq(hard.length, 48, "经线（方的四角拉出的棱）硬");
    // 站圈上的点到 z 轴的距离 = 2 或 3（斜切面含轴 → 轮廓按原样绕）
    for (const v of k.vertices()) { const r = Math.hypot(v.x, v.y); assert(near(r, 2) || near(r, 3), `半径 ${r}`); }
  });
  it("沿盒子四条顶棱倒角：轮廓三角在端面上、路径 = 顶面外环 → 顶条 / 侧条 XOR 湮灭，10 面闭合实体，顶面缩成 8×8", () => {
    const k = box10();
    eq(k.faces().length, 6);
    k.addEdges([[P(10, 0, 9), P(10, 1, 10)]]);   // 端面 x=10 上的弦 → 角上一个三角
    eq(k.faces().length, 7);
    const tri = faceWhere(k, (p) => near(p.x, 10)).find((f) => k.faceRings3(f.id)!.outer.length === 3)!;
    assert(tri, "三角轮廓");
    const top = faceWhere(k, (p) => near(p.z, 10))[0];
    const path = k.faceRings3(top.id)!.outer;
    k.followMe(tri.id, path, { closed: true, smoothJoints: path.map(() => false) });
    eq(k.faces().length, 10, "6 + 4 倒角面");
    assert(manifold(k), "闭合实体（没有洞、没有内面）");
    const top2 = faceWhere(k, (p) => near(p.z, 10));
    eq(top2.length, 1);
    const b = bounds(k.faceRings3(top2[0].id)!.outer);
    assert(near(b.min.x, 1) && near(b.max.x, 9) && near(b.min.y, 1) && near(b.max.y, 9), "顶面 1..9");
    eq(faceWhere(k, (p) => near(p.x, 10)).length, 1, "端面只剩一张（三角轮廓没了）");
    assert(k.faces().every((f) => k.faceRings3(f.id)!.outer.length >= 3), "没有退化面");
  });
  it("沿一条棱倒角（开路径、依附轮廓）：起始帽与轮廓湮灭、末帽与对面端面的角湮灭 → 7 面闭合实体", () => {
    const k = box10();
    k.addEdges([[P(10, 0, 9), P(10, 1, 10)]]);
    const tri = faceWhere(k, (p) => near(p.x, 10)).find((f) => k.faceRings3(f.id)!.outer.length === 3)!;
    k.followMe(tri.id, [P(10, 0, 10), P(0, 0, 10)], { closed: false });
    eq(k.faces().length, 7, "6 + 1 倒角面");
    assert(manifold(k), "闭合实体");
    eq(faceWhere(k, (p) => near(p.x, 0)).length, 1, "对面端面一张（角被切）");
    eq(faceWhere(k, (p) => near(p.x, 0))[0] && k.faceRings3(faceWhere(k, (p) => near(p.x, 0))[0].id)!.outer.length, 5, "对面端面五边");
  });
  it("SU 不用插件画球 = 圆跟随圆（user 2026-10-24「答案是让 circle followme 一个 circle」「不要有重叠面」）：轮廓穿过转轴、两半各扫一遍精确重合 → 288 面无重叠、极点 48 三角", () => {
    const k = new Kernel();
    const path = circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(0, 0, 0), P(2, 0, 0), 24);                 // 路径：地上 r=2（SU 教程：路径比轮廓大，事后好删）
    k.addEdges(path, { curve: true });
    const Y = { x: 0, y: 1, z: 0 };
    k.addEdges(circleSegmentsOnPlane({ n: Y, d: 0 }, { u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 0, z: 1 } }, P(0, 0, 0), P(1, 0, 0), 24), { curve: true });   // 轮廓：x-z 面 r=1，面穿过 z 轴
    const prof = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => near(p.y, 0)))!;
    assert(prof, "轮廓盘");
    k.followMe(prof.id, path.map(([a]) => a), { closed: true, smoothJoints: path.map(() => true) });
    const onSphere = (p: Pt3): boolean => Math.abs(Math.hypot(p.x, p.y, p.z) - 1) < 1e-5;   // 顶点格点 1 µm，半径误差 ~1e-6
    const sphere = k.faces().filter((f) => f.outer.edges.length <= 4 && k.faceRings3(f.id)!.outer.every(onSphere));
    eq(sphere.length, 288, "24 经 × 12 纬 = 240 四边形 + 48 极点三角");
    eq(sphere.filter((f) => f.outer.edges.length === 3).length, 48, "极点三角");
    const keys = new Set(sphere.map((f) => f.outer.edges.map((d) => d.edge).sort((a, b) => a - b).join(",")));
    eq(keys.size, 288, "无重叠面（同环只一张）");
    for (const e of k.edges()) {
      if (!onSphere(k.graph.pt(e.a)) || !onSphere(k.graph.pt(e.b))) continue;
      eq(e.faceLinks.filter((f) => sphere.some((s) => s.id === f)).length, 2, "球面每条边恰两张球面膜");
    }
    assert(k.curveProblems().length === 0, k.curveProblems().join("; "));
  });
});
