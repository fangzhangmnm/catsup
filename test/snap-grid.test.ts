// 吸到格点（纪元排期 T8 / 账本 DT4）。created 2026-10-26 by Claude Opus 5.5
// 纪元验收 ③（「故意挪一个点 1 mm，用镜像或格子吸回，邻居不跟着振」）；圆 / 弧整条平移保持是圆；坐标架转过也照它吸；零破面（随机三角网吸完不 BURST）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { kernelFromTriangles } from "../src/kernel/from-triangles.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { planGridSnap } from "../src/editor/repairs/grid-snap/plan.ts";
import "../src/editor/repairs/grid-snap/index.ts";   // 登记插件指令 "gridSnap"
import { IDENTITY, type Xform, applyPt, frameToXform, invert } from "../src/scene/xform.ts";
import { circleCurveSpec, circleSegmentsOnPlane } from "../src/editor/tools.ts";
import { GROUND } from "../src/editor/pick.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const loop = (k: Kernel, pts: Pt3[], curve = false): void => { k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3]), curve ? { curve: true } : undefined); };
const rootAt = (s: Scene) => ({ def: s.root, group: null });
/** 用老指令名 snapToGrid（搬成插件之前的）：顺带验老复现包照旧能重放。 */
const snapOp = (s: Scene, step: number, extra: Record<string, unknown> = {}): Op => ({ op: "snapToGrid", at: rootAt(s), verts: [], step, lattice: [...IDENTITY], curves: "rigid", crease: "soft", ...extra } as unknown as Op);
/** 在格点上：格子坐标离最近的格点 < 2 µm（内核坐标按 1 µm 取整，斜格子上的格点会被挪最多半微米）。 */
const onLattice = (p: Pt3, step: number, L: Xform = IDENTITY): boolean => { const q = applyPt(L, p); return [q.x, q.y, q.z].every((c) => Math.abs(c - Math.round(c / step) * step) < 2e-6); };
/** 真正的圆（带圆心 / 半径，和画圆工具一样）。 */
const realCircle = (k: Kernel, c: Pt3, r: number, n: number): void => { const rim = P(c.x + r, c.y, c.z); k.addEdges(circleSegmentsOnPlane(GROUND.plane, GROUND.basis, c, rim, n), { curve: circleCurveSpec((p) => p, c, rim, GROUND, n) }); };
const box = (): Kernel => { const k = new Kernel(); loop(k, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]); k.pushPull(k.faces()[0].id, 1); return k; };
const circle = (c: Pt3, r: number, n: number): Pt3[] => Array.from({ length: n }, (_, i) => P(c.x + r * Math.cos((i / n) * 2 * Math.PI), c.y + r * Math.sin((i / n) * 2 * Math.PI), c.z));

describe("吸到格点（DT4）", () => {
  it("纪元验收 ③：盒子一个角挪 1 mm（面被折开）→ 吸回格点，别的点一个都不动，零破面", () => {
    const k = box();
    const corner = k.vertices().find((v) => v.x === 1 && v.y === 1 && v.z === 1)!;
    k.moveVertices([{ id: corner.id, to: P(1.001, 1, 1.001) }]);
    const before = new Map(k.vertices().filter((v) => v.id !== corner.id).map((v) => [v.id, `${v.x},${v.y},${v.z}`]));
    let s = new Scene(k);
    const r = applyOp(s, snapOp(s, 0.1)); s = r.scene;
    const k2 = s.kernelOf(rootAt(s));
    assert(k2.vertices().every((v) => onLattice(v, 0.1)), "全部点在格点上");
    const c2 = k2.graph.pt(corner.id);
    assert(Math.abs(c2.x - 1) < 1e-9 && Math.abs(c2.z - 1) < 1e-9, `角点回到 (1,1,1)：${JSON.stringify(c2)}`);
    for (const [id, was] of before) { const p = k2.graph.pt(id); eq(`${p.x},${p.y},${p.z}`, was, `邻居 ${id} 没动`); }
    assert(!r.events.some((e) => e.type === "BURST"), "零破面");
  });
  it("圆 / 弧整条平移（默认）：圆心吸上格点，每个点到新圆心的距离还是半径", () => {
    const k = new Kernel();
    realCircle(k, P(1.013, 0.987, 0), 0.3, 24);
    k.pushPull(k.faces()[0].id, 0.5);
    const plan = planGridSnap(k, null, IDENTITY, { step: 0.1, curves: "rigid" });
    eq(plan.curves, 2, "上下两个圆各整条平移");
    let s = new Scene(k);
    s = applyOp(s, snapOp(s, 0.1)).scene;
    const k2 = s.kernelOf(rootAt(s));
    for (const v of k2.vertices()) assert(Math.abs(Math.hypot(v.x - 1, v.y - 1) - 0.3) < 1e-5, `点 ${v.id} 到 (1,1) 的距离 ${Math.hypot(v.x - 1, v.y - 1)}`);
    assert(k2.curves().filter((c) => c.kind === "circle").length === 2, "还是两个圆");
  });
  it("别处有点合并（两个点吸到同一格点）时，整条平移的圆照样是圆（内核挪点：一批里有合并 = 这批的曲线都不算圆了 → 曲线单独一批先挪）", () => {
    const k = new Kernel();
    realCircle(k, P(1.013, 0.987, 0), 0.3, 24);
    loop(k, [P(3.01, 0.01), P(3.03, 0.02), P(3.52, 0.49), P(3.02, 0.51)]);   // 一条短边：两头都吸到 (3, 0) = 合并
    const nv0 = k.vertices().length;
    let s = new Scene(k);
    s = applyOp(s, snapOp(s, 0.1)).scene;
    const k2 = s.kernelOf(rootAt(s));
    eq(k2.vertices().length, nv0 - 1, "真的合并了一个点");
    const circles = k2.curves().filter((c) => c.kind === "circle" && c.params);
    eq(circles.length, 1, "圆还在（带圆心半径）");
    assert(Math.abs(circles[0].params!.center.x - 1) < 1e-6 && Math.abs(circles[0].params!.center.y - 1) < 1e-6, "圆心吸到 (1,1)");
  });
  it("逐点吸：圆上每个点各自落到格点", () => {
    const k = new Kernel();
    loop(k, circle(P(1.013, 0.987, 0), 0.3, 12), true);
    let s = new Scene(k);
    s = applyOp(s, snapOp(s, 0.05, { curves: "points" })).scene;
    assert(s.kernelOf(rootAt(s)).vertices().every((v) => onLattice(v, 0.05)));
  });
  it("圆只有一部分在范围里：那些点不动（整条平移会动到范围外的点，逐点吸会吸歪），报出来", () => {
    const k = new Kernel();
    realCircle(k, P(1.013, 0.987, 0), 0.3, 12);
    const some = k.vertices().slice(0, 4).map((v) => v.id);
    const plan = planGridSnap(k, some, IDENTITY, { step: 0.1, curves: "rigid" });
    eq(plan.moves.length, 0); eq(plan.skipped, 4);
  });
  it("按物件自己的坐标架：坐标架绕 z 转 30°、原点挪开，吸完每个点在那张斜格子上", () => {
    const a = Math.PI / 6, F = { origin: P(0.3, 0.2, 0), x: P(Math.cos(a), Math.sin(a), 0), y: P(-Math.sin(a), Math.cos(a), 0), z: P(0, 0, 1) };
    const L = invert(frameToXform(F));
    const k = new Kernel();
    loop(k, [P(0.02, 0.03), P(1.04, 0.01), P(0.97, 1.03), P(0.01, 0.98)]);
    let s = new Scene(k);
    s = applyOp(s, snapOp(s, 0.25, { lattice: [...L] })).scene;
    assert(s.kernelOf(rootAt(s)).vertices().every((v) => onLattice(v, 0.25, L)), "都在斜格子上");
  });
  it("零破面：随机抖过的三角网（球）吸到格点，不 BURST、全部点在格点上", () => {
    for (let seed = 1; seed <= 8; seed++) {
      let st = seed * 7919; const rnd = (): number => { st = (st * 1103515245 + 12345) & 0x7fffffff; return st / 0x7fffffff; };
      const nu = 10, nv = 7, pos: Pt3[] = [], tris: number[] = [];
      for (let j = 0; j <= nv; j++) for (let i = 0; i < nu; i++) { const th = (j / nv) * Math.PI, ph = (i / nu) * 2 * Math.PI, jit = (): number => (rnd() - 0.5) * 0.004; pos.push(P(Math.sin(th) * Math.cos(ph) + jit(), Math.sin(th) * Math.sin(ph) + jit(), Math.cos(th) + jit())); }
      const id = (i: number, j: number): number => j * nu + (i % nu);
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1); if (j > 0) tris.push(a, c, b); if (j < nv - 1) tris.push(b, c, d); }
      const { kernel } = kernelFromTriangles(pos, tris, { softDeg: 20 });
      let s = new Scene(kernel);
      const r = applyOp(s, snapOp(s, 0.05)); s = r.scene;
      const k2 = s.kernelOf(rootAt(s));
      assert(!r.events.some((e) => e.type === "BURST"), `seed ${seed}：零破面`);
      assert(k2.faces().length > 0 && k2.vertices().every((v) => onLattice(v, 0.05)), `seed ${seed}：全部点在格点上`);
    }
  });
  it("不破面的退路：斜面上的多边形吸歪了、自动折面折不平（不退路就破）→ 先三角化再吸，零破面", () => {
    let wouldBurst = 0;
    for (let seed = 1; seed <= 20; seed++) {
      let st = seed * 104729; const rnd = (): number => { st = (st * 1103515245 + 12345) & 0x7fffffff; return st / 0x7fffffff; };
      const n = 5 + Math.floor(rnd() * 6), a = rnd() * 0.6, b = rnd() * 0.6, cx = rnd(), cy = rnd(), r = 0.5 + rnd();
      const k = new Kernel();
      loop(k, Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI, x = cx + r * Math.cos(t), y = cy + r * Math.sin(t); return P(x, y, a * x + b * y); }));
      if (!k.faces().length) continue;
      const plan = planGridSnap(k, null, IDENTITY, { step: 0.1, curves: "rigid" });
      if (k.clone().moveVertices(plan.moves, { creaseLayers: ["soft", "smooth"] }).some((e) => e.type === "BURST")) wouldBurst++;
      let s = new Scene(k);
      const res = applyOp(s, snapOp(s, 0.1)); s = res.scene;
      const k2 = s.kernelOf(rootAt(s));
      assert(!res.events.some((e) => e.type === "BURST") && k2.faces().length >= 1, `seed ${seed}：零破面、面还在`);
      assert(k2.vertices().every((v) => onLattice(v, 0.1)), `seed ${seed}：全部点在格点上`);
      assert(k2.edges().filter((e) => e.faceLinks.length === 2).every((e) => k2.isSoft(e.id)), `seed ${seed}：折缝 / 对角线都是软边`);
    }
    // 2026-10-27 自动折面 rev2（Fable 账单 K3）之后内核自己兜住：这 20 个一个都不破了，退路成了最后一道（蝴蝶结那种投影不简单的才会走到）。
    // 以前这里断言「至少 10 个不退路就会破」= 退路被走到；现在反过来钉住内核的新行为。edited by Claude Fable 5.1
    eq(wouldBurst, 0, `内核自己兜住：不退路也零破面（${wouldBurst} / 20 会破）`);
  });
});

// 拉正（DT101，2026-10-26 Claude Opus 5.5；user「拉正 好想要，比snap更好……这个可以和snap合租。就是可以拉正不snap之类的？」）
describe("拉正（DT101）", () => {
  /** 盒子放在不在格点上的地方（拉正不该把它吸上格点）。 */
  const offBox = (x0: number): Kernel => { const k = new Kernel(); loop(k, [P(x0, 0), P(x0 + 1, 0), P(x0 + 1, 1), P(x0, 1)]); k.pushPull(k.faces()[0].id, 1); return k; };
  /** 每条边都和轴平行（平面里的内线不算：先挪歪那一下内核把面折开留下的对角线，拉正后两边又在同一张平面上）。 */
  const axisAligned = (k: Kernel): boolean => k.edges().every((e) => { const fl = e.faceLinks; if (fl.length === 2 && k.face(fl[0])?.planeId === k.face(fl[1])?.planeId) return true; const a = k.graph.pt(e.a), b = k.graph.pt(e.b); const same = [a.x - b.x, a.y - b.y, a.z - b.z].filter((d) => Math.abs(d) < 1e-9).length; return same >= 2; });
  it("盒子一个角歪了 0.2° → 只拉正：角回到原位，盒子不吸格点（x0 = 0.0337 照旧），别的点不动", () => {
    const x0 = 0.0337, k = offBox(x0);
    const corner = k.vertices().find((v) => Math.abs(v.x - (x0 + 1)) < 1e-9 && v.y === 1 && v.z === 1)!;
    k.moveVertices([{ id: corner.id, to: P(x0 + 1.003, 1, 1.002) }]);
    const plan = planGridSnap(k, null, IDENTITY, { step: 0.1, curves: "rigid", straighten: 1, grid: false });
    eq(plan.moves.length, 1, "只挪那个角"); eq(plan.moves[0].id, corner.id);
    const to = plan.moves[0].to;
    assert(Math.abs(to.x - (x0 + 1)) < 1e-9 && Math.abs(to.y - 1) < 1e-9 && Math.abs(to.z - 1) < 1e-9, `角回到原位：${JSON.stringify(to)}`);
    let s = new Scene(k);
    const r = applyOp(s, snapOp(s, 0.1, { straighten: 1, grid: false })); s = r.scene;
    const k2 = s.kernelOf(rootAt(s));
    assert(axisAligned(k2), "边全部和轴平行"); assert(k2.vertices().some((v) => Math.abs(v.x - x0) < 1e-9), "没吸格点");
    assert(!r.events.some((e) => e.type === "BURST"), "零破面");
  });
  it("整个盒子转了 0.5° → 拉正后每条边都和轴平行；转 5° 的不动（超过阈值）", () => {
    for (const [deg, expect] of [[0.5, true], [5, false]] as const) {
      const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), R = (x: number, y: number) => P(x * c - y * sn, x * sn + y * c);
      const k = new Kernel(); loop(k, [R(0, 0), R(1, 0), R(1, 2), R(0, 2)]); k.pushPull(k.faces()[0].id, 1);
      let s = new Scene(k);
      s = applyOp(s, snapOp(s, 0.1, { straighten: 1, grid: false })).scene;
      eq(axisAligned(s.kernelOf(rootAt(s))), expect, `转 ${deg}°`);
    }
  });
  it("范围外连着的点当锚：只选歪的那个角 → 它对齐到邻居，邻居不动", () => {
    const k = offBox(0);
    const corner = k.vertices().find((v) => v.x === 1 && v.y === 1 && v.z === 1)!;
    k.moveVertices([{ id: corner.id, to: P(1.004, 1.003, 1) }]);
    const plan = planGridSnap(k, [corner.id], IDENTITY, { step: 0.1, curves: "rigid", straighten: 1, grid: false });
    eq(plan.moves.length, 1);
    assert(Math.abs(plan.moves[0].to.x - 1) < 1e-9 && Math.abs(plan.moves[0].to.y - 1) < 1e-9, "对齐到邻居的 x = 1、y = 1");
  });
  it("圆斜了 0.3°：只沿法向那根轴拉平（所有点同一个 z），圆周上的点不被拉歪", () => {
    const k = new Kernel(), n = 24, tilt = (0.3 * Math.PI) / 180;
    const pts = Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI, x = Math.cos(t), y = Math.sin(t); return P(x, y * Math.cos(tilt), 0.5 + y * Math.sin(tilt)); });
    loop(k, pts, true);
    const plan = planGridSnap(k, null, IDENTITY, { step: 0.1, curves: "rigid", straighten: 1, grid: false });
    const zs = new Set(plan.moves.map((m) => Math.round(m.to.z * 1e6)));
    eq(zs.size, 1, "拉平到同一个 z");
    assert(plan.moves.every((m) => { const p = k.graph.pt(m.id); return Math.abs(m.to.x - p.x) < 1e-9 && Math.abs(m.to.y - p.y) < 1e-9; }), "x、y 不动");
  });
  it("拉正 + 吸格点：歪角 + 不在格点上的盒子 → 全部在格点上、边和轴平行", () => {
    const k = offBox(0.0337);
    const corner = k.vertices().find((v) => Math.abs(v.x - 1.0337) < 1e-9 && v.y === 1 && v.z === 1)!;
    k.moveVertices([{ id: corner.id, to: P(1.0367, 1, 1.002) }]);
    let s = new Scene(k);
    s = applyOp(s, snapOp(s, 0.1, { straighten: 1, grid: true })).scene;
    const k2 = s.kernelOf(rootAt(s));
    assert(k2.vertices().every((v) => onLattice(v, 0.1)), "全在格点上"); assert(axisAligned(k2), "边和轴平行");
  });
});
