// 空间里的笔：落成路（贴图主线 1-4a 第二节 + 第六节测试 1–6、12 的路那一半）。created 2026-11-11 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, addPrimitive } from "../src/mesh/ops/index.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { SpaceStroke, type SpaceCamera } from "../src/paint/space-stroke.ts";
import { sphereTriDist } from "../src/paint/tip-reach.ts";
import type { TargetGeo } from "../src/paint/space-target.ts";
import { P, RAW, brush, gridMesh, laidOut, pinhole, targetOf } from "./paint-space-kit.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const F = { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) };
const nearest = (geos: readonly TargetGeo[], p: Pt3): number => { let b = Infinity; for (const g of geos) for (let t = 0; t < g.grid.face.length; t++) b = Math.min(b, sphereTriDist(p.x, p.y, p.z, g.wpos, 9 * t)); return b; };
/** 屏幕上一条线：按下 + 一串移动（时间 16 ms 一步）。 */
function line(s: SpaceStroke, a: { x: number; y: number }, b: { x: number; y: number }, n = 30, p = 0.8): void {
  s.down(a.x, a.y, p, 0);
  for (let i = 1; i <= n; i++) s.move(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, p, i * 16);
}
const pts = (s: SpaceStroke) => { const p = s.path()!; return Array.from({ length: p.count }, (_, i) => ({ x: p.coord(i, 0), y: p.coord(i, 1), z: p.coord(i, 2), brk: p.breakBefore(i) })); };

describe("落成路（1-4a 测试 1：路贴着表面）", () => {
  // 弦和弧的差：表面是一片片平的三角形，路过三角形之间的折缝会拐弯；两颗笔尖夹着一道折缝时，直线距离比路上走的短一点。
  //   球 / 圆柱的折缝很浅（< 1%）；波浪形的面是不平的四边形切成两个三角形，对角线上折得深（量出来 1.3%），给 3%。
  const cases: [string, () => MeshKernel, number][] = [
    ["球", () => { const m = new MeshKernel(); addPrimitive(m, "sphere", F, [1, 1, 1], 32); return m; }, 0.01],
    ["圆柱", () => { const m = new MeshKernel(); addPrimitive(m, "cylinder", F, [1, 1, 2], 32); return m; }, 0.01],
    ["波浪形的面", () => gridMesh(40, 4, (x, y) => 0.15 * Math.sin(3 * x) * Math.cos(3 * y)), 0.03],
  ];
  for (const [name, mk, tol] of cases) it(`${name}：路上每个点都在表面上；相邻两点不超过步长上限；相邻两颗笔尖在世界里的距离 = 那一步的间距（差不过弦和弧）`, () => {
    const m = mk(), uv = laidOut(m), cam = pinhole(P(0.3, -5, 2), P(0, 0, name === "圆柱" ? 1 : 0.2), 45), s = new SpaceStroke([targetOf(m, uv)], cam, brush(), { smooth: RAW });
    line(s, { x: 430, y: 380 }, { x: 570, y: 420 });
    assert(s.started, "开始了");
    const ps = pts(s), stepMax = Math.max(s.worldSize / 4, s.geos[0].target.pxPerM ? 1 / s.geos[0].target.pxPerM : 0);
    assert(ps.length > 5, `路上有点（${ps.length}）`);
    let far = 0, off = 0;
    ps.forEach((p, i) => { off = Math.max(off, nearest(s.geos, p)); if (i && !p.brk) far = Math.max(far, Math.hypot(p.x - ps[i - 1].x, p.y - ps[i - 1].y, p.z - ps[i - 1].z)); });
    assert(off < 1e-9, `离表面最远 ${off}`);
    assert(far <= stepMax + 1e-12, `相邻两点最远 ${far}，上限 ${stepMax}`);
    eq(ps.filter((p) => p.brk).length, 0, "没有断开");
    const tips = s.tips();
    let worst = 0;
    for (let i = 1; i < tips.length; i++) { const a = tips[i - 1], b = tips[i], dsd = b.strokeDist - a.strokeDist, d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); assert(d <= dsd + 1e-9, "直线距离不超过路上走的"); worst = Math.max(worst, (dsd - d) / dsd); }
    assert(worst < tol, `弦和弧差得最多 ${worst}`);
    const dsds = tips.slice(1).map((b, i) => b.strokeDist - tips[i].strokeDist), step = s.worldSize * 0.1;
    for (const d of dsds) assert(Math.abs(d - step) < 1e-9 * Math.max(1, step), `相邻笔尖路上走的 = 一步的间距（${d} vs ${step}）`);
  });
});

describe("落成路（1-4a 测试 2：斜面不断）", () => {
  const counts: string[] = [];
  for (const deg of [0, 60, 85, 89]) it(`平面从法向偏 ${deg}° 看，同一条屏幕上的线（笔 4 像素）：路不断；越斜路越长、笔尖越多；相邻笔尖的距离不变`, () => {
    const m = gridMesh(1, 400), uv = laidOut(m), th = (deg * Math.PI) / 180, cam = pinhole(P(0, -10 * Math.sin(th), 10 * Math.cos(th) + 1e-9), P(0, 0, 0), 50);
    const s = new SpaceStroke([targetOf(m, uv, { pxPerM: 1000 })], cam, brush({ size: 4 }), { smooth: RAW });
    line(s, { x: 500, y: 400 }, { x: 500, y: 480 }, 20);
    const ps = pts(s), tips = s.tips();
    eq(ps.filter((p) => p.brk).length, 0, "没有断开");
    eq(s.stats.capped, 0, "没到射线上限");
    const steps = tips.slice(1).map((b, i) => Math.hypot(b.x - tips[i].x, b.y - tips[i].y, b.z - tips[i].z));
    const lo = Math.min(...steps), hi = Math.max(...steps);
    assert(hi - lo < 1e-9 * Math.max(1, hi), `相邻笔尖的距离不变（${lo} … ${hi}）`);
    counts.push(`${deg}°：射线 ${s.stats.rays}、路上点 ${ps.length}、笔尖 ${tips.length}`);
    if (deg === 89) console.log("    [1-4a 测试 2] " + counts.join("；"));
  });
});

describe("落成路（1-4a 测试 3：跳了会断）", () => {
  it("前面一个小盒子、后面一块大板：线从盒子横着画到板上——路断开一次，断口两头之间没有笔尖，「走了多远」不含那一段", () => {
    const m = new MeshKernel(); addBox(m, P(-1, -1.5, 0), P(0, -0.5, 1)); addBox(m, P(-4, 3, -2), P(4, 4, 4));
    const uv = laidOut(m), cam = pinhole(P(0, -8, 0.5), P(0, 0, 0.5), 50), s = new SpaceStroke([targetOf(m, uv, { pxPerM: 200 })], cam, brush(), { smooth: RAW });
    const a = cam.project(P(-0.6, -1.5, 0.5)), b = cam.project(P(1.5, 3, 0.5));
    line(s, a, { x: b.x, y: a.y }, 30);
    const ps = pts(s), brks = ps.map((p, i) => (p.brk ? i : -1)).filter((i) => i >= 0);
    eq(brks.length, 1, "断开一次");
    const k = brks[0], before = ps[k - 1], after = ps[k];
    assert(before.y < 0 && after.y > 2.9, "断口一头在盒子上、一头在板上");
    const tips = s.tips();
    for (const t of tips) assert(t.y < -0.49 || t.y > 2.99, `笔尖不在断口中间（y = ${t.y}）`);
    const i0 = tips.findIndex((t) => t.y > 2.9), last = tips[i0 - 1], first = tips[i0];
    assert(first.strokeDist - last.strokeDist <= s.worldSize * 0.1 + 1e-9, `断口两边「走了多远」只差不到一步（${first.strokeDist - last.strokeDist}）`);
  });
});

describe("落成路（1-4a 测试 4：画到轮廓边上；落笔没打中）", () => {
  const sphere = () => { const m = new MeshKernel(); addPrimitive(m, "sphere", F, [1, 1, 1], 48); return m; };
  it("线从球里面画到外面：路的最后一个点离轮廓不超过 1/256 个屏幕像素", () => {
    const m = sphere(), uv = laidOut(m), cam = pinhole(P(0, -5, 0), P(0, 0, 0), 45), s = new SpaceStroke([targetOf(m, uv)], cam, brush(), { smooth: RAW });
    line(s, { x: 500, y: 400 }, { x: 800, y: 400 }, 30);
    const ps = pts(s), last = ps[ps.length - 1], q = cam.project(last);
    eq(s.hitAt(q.x - 0.5 / 256, q.y)?.kind, "target", "最后一个点那里打得中");
    assert(s.hitAt(q.x + 2 / 256, q.y)?.kind !== "target", "再往外 2/256 个像素就打不中了");
  });
  it("线从外面画进来、落笔时没打中：进来之后正常画，大小是第一次打中时定的", () => {
    const m = sphere(), uv = laidOut(m), cam = pinhole(P(0, -5, 0), P(0, 0, 0), 45), s = new SpaceStroke([targetOf(m, uv)], cam, brush({ size: 10 }), { smooth: RAW });
    const raw = Array.from({ length: 31 }, (_, i) => ({ x: 900 - i * 13, y: 400 }));
    s.down(raw[0].x, raw[0].y, 0.8, 0);
    assert(!s.started, "落笔没打中：还没开始");
    let firstHit: Pt3 | null = null;
    for (let i = 1; i < raw.length; i++) { s.move(raw[i].x, raw[i].y, 0.8, i * 16); const h = s.hitAt(raw[i].x, raw[i].y); if (!firstHit && h?.kind === "target") firstHit = h.pos; }
    assert(s.started && firstHit, "进来之后开始了");
    assert(Math.abs(s.worldSize - 10 * cam.pixelSize(firstHit!)) < 1e-12, "大小 = 第一次打中那里的像素大小 × 10");
    assert(s.tips().length > 3, "正常画");
  });
});

describe("落成路（1-4a 测试 5 + 12：被挡住的不画；藏起来的面不挡，不走画的面挡）", () => {
  it("目标前面一块不是目标的板：板挡住的那一段，路是断开的", () => {
    const m = gridMesh(10, 4), uv = laidOut(m);
    const occluded: SpaceCamera["occluded"] = (o, d, t) => { if (Math.abs(d.z) < 1e-12) return false; const tb = (0.5 - o.z) / d.z; if (!(tb > 0 && tb < t)) return false; const x = o.x + d.x * tb, y = o.y + d.y * tb; return Math.abs(x) < 0.2 && Math.abs(y) < 2; };
    const cam = pinhole(P(0, -0.01, 6), P(0, 0, 0), 45, 1000, 800, occluded), s = new SpaceStroke([targetOf(m, uv)], cam, brush(), { smooth: RAW });
    const a = cam.project(P(-1.5, 0, 0)), b = cam.project(P(1.5, 0, 0));
    line(s, a, b, 30);
    const ps = pts(s);
    assert(ps.some((p) => p.brk), "断开了");
    for (const p of ps) assert(!(Math.abs(p.x) < 0.2 * (1 - 0.5 / 6) - 1e-6), `板挡住的地方没有路（x = ${p.x}）`);
  });
  it("藏起来的面不挡（照常画过去）；不走这张画的面挡住（路断开）", () => {
    const build = () => { const m = gridMesh(10, 4), top = [P(-0.3, -2, 0.5), P(0.3, -2, 0.5), P(0.3, 2, 0.5), P(-0.3, 2, 0.5)].map((p) => m.addVertex(p)); const f = m.addFace(top, -1, FRESH); return { m, f }; };
    const cam = pinhole(P(0, -0.01, 6), P(0, 0, 0), 45);
    { const { m, f } = build(); m.setFaceFlags(f, 1, true); const uv = laidOut(m, "uv", m.faces().filter((x) => x !== f)), s = new SpaceStroke([targetOf(m, uv)], cam, brush(), { smooth: RAW });
      line(s, cam.project(P(-1.5, 0, 0)), cam.project(P(1.5, 0, 0)), 30);
      eq(pts(s).filter((p) => p.brk).length, 0, "藏起来的面不挡"); }
    { const { m, f } = build(); const uv = laidOut(m), s = new SpaceStroke([targetOf(m, uv, { walks: (x) => x !== f })], cam, brush(), { smooth: RAW });
      line(s, cam.project(P(-1.5, 0, 0)), cam.project(P(1.5, 0, 0)), 30);
      const ps = pts(s);
      assert(ps.some((p) => p.brk), "不走画的面挡住了");
      for (const p of ps) assert(p.z < 1e-9, "路上没有那张面上的点"); }
  });
});

describe("落成路（1-4a 测试 6：定型）", () => {
  it("一笔边画边取：前 frozenCount 个点和下一次取的逐位相同；frozenCount 只增不减；定型的那一段没有重新打射线", () => {
    const m = gridMesh(20, 4, (x, y) => 0.1 * Math.sin(2 * x + y)), uv = laidOut(m), cam = pinhole(P(0, -5, 3), P(0, 0, 0), 45), s = new SpaceStroke([targetOf(m, uv)], cam, brush(), { smooth: { tau: 30, deadzone: 1 } });
    s.down(350, 420, 0.7, 0);
    let prev: { x: number; y: number; z: number }[] = [], prevFrozen = 0;
    for (let i = 1; i <= 60; i++) {
      s.move(350 + i * 5, 420 + 20 * Math.sin(i / 6), 0.7, i * 16);
      const p = s.path()!, cur = Array.from({ length: p.count }, (_, k) => ({ x: p.coord(k, 0), y: p.coord(k, 1), z: p.coord(k, 2) }));
      assert(p.frozenCount >= prevFrozen, `frozenCount 只增不减（${prevFrozen} → ${p.frozenCount}）`);
      for (let k = 0; k < prevFrozen; k++) assert(cur[k].x === prev[k].x && cur[k].y === prev[k].y && cur[k].z === prev[k].z, `第 ${k} 个定型的点逐位不变`);
      prev = cur; prevFrozen = p.frozenCount;
    }
    assert(prevFrozen > 20, `定型了不少（${prevFrozen}）`);
    const r0 = s.stats.rays; s.path(); const once = s.stats.rays - r0;
    assert(once < r0 / 4, `再取一次只打尾巴的射线（${once}，一共 ${r0}）`);
  });
});

describe("少打射线（1-4d 第 7 条）：两头打中同一个三角形、屏幕上 ≤ 2 像素 = 中点只和平面求交", () => {
  /** 同一笔跑两遍：照常（少打射线）/ 每次都打整条射线（实例上把 hitTri 换成永远交 null）。 */
  const twice = (mk: () => { s: () => SpaceStroke; draw: (s: SpaceStroke) => void }) => {
    const { s: make, draw } = mk(), a = make(), b = make();
    (b as unknown as { hitTri: () => null }).hitTri = () => null;
    draw(a); draw(b);
    return { a, b, pa: pts(a), pb: pts(b), ta: a.tips(), tb: b.tips() };
  };
  const counts: string[] = [];
  for (const deg of [60, 85, 89]) it(`平面从法向偏 ${deg}° 看：路上的点和笔尖和每次打整条射线时在浮点误差以内相同；整条射线少打了`, () => {
    const r = twice(() => {
      const m = gridMesh(1, 400), uv = laidOut(m), th = (deg * Math.PI) / 180, cam = pinhole(P(0, -10 * Math.sin(th), 10 * Math.cos(th) + 1e-9), P(0, 0, 0), 50);
      return { s: () => new SpaceStroke([targetOf(m, uv, { pxPerM: 1000 })], cam, brush({ size: 4 }), { smooth: RAW }), draw: (s) => line(s, { x: 500, y: 400 }, { x: 500, y: 480 }, 20) };
    });
    eq(r.pa.length, r.pb.length, "路上的点一样多");
    let worst = 0; r.pa.forEach((p, i) => { const q = r.pb[i]; eq(p.brk, q.brk, `第 ${i} 个点断不断一样`); worst = Math.max(worst, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)); });
    eq(r.ta.length, r.tb.length, "笔尖一样多");
    r.ta.forEach((t, i) => { worst = Math.max(worst, Math.hypot(t.x - r.tb[i].x, t.y - r.tb[i].y, t.z - r.tb[i].z)); });
    assert(worst < 1e-9, `离得最远 ${worst}`);
    assert(r.a.stats.rays + r.a.stats.planes === r.b.stats.rays, `打的次数对得上（${r.a.stats.rays} 条射线 + ${r.a.stats.planes} 次平面 = ${r.b.stats.rays}）`);
    if (deg >= 85) assert(r.a.stats.rays < r.b.stats.rays, `陡的面上射线少了（${r.a.stats.rays} < ${r.b.stats.rays}）`);
    counts.push(`${deg}°：整条射线 ${r.b.stats.rays} → ${r.a.stats.rays}（平面 ${r.a.stats.planes}）`);
    if (deg === 89) console.log("    [1-4d 第 7 条] " + counts.join("；"));
  });
  it("球：同样逐点相同", () => {
    const r = twice(() => {
      const m = new MeshKernel(); addPrimitive(m, "sphere", F, [1, 1, 1], 32);
      const uv = laidOut(m), cam = pinhole(P(0.3, -5, 2), P(0, 0, 0.2), 45);
      return { s: () => new SpaceStroke([targetOf(m, uv)], cam, brush(), { smooth: RAW }), draw: (s) => line(s, { x: 430, y: 380 }, { x: 570, y: 420 }) };
    });
    eq(r.pa.length, r.pb.length, "路上的点一样多");
    let worst = 0; r.pa.forEach((p, i) => { worst = Math.max(worst, Math.hypot(p.x - r.pb[i].x, p.y - r.pb[i].y, p.z - r.pb[i].z)); });
    assert(worst < 1e-9, `离得最远 ${worst}`);
  });
  it("细杆挡在一块板前面（屏幕上比 2 像素宽）、线一下子从杆左边跳到右边：照旧断开（屏幕上离得远的两点不走捷径）", () => {
    const r = twice(() => {
      const m = new MeshKernel(); addBox(m, P(-4, 3, -2), P(4, 3.2, 4)); addBox(m, P(-0.05, -1, -2), P(0.05, -0.9, 4));
      const uv = laidOut(m), cam = pinhole(P(0, -8, 0.5), P(0, 0, 0.5), 50);
      return { s: () => new SpaceStroke([targetOf(m, uv, { pxPerM: 200 })], cam, brush(), { smooth: RAW }), draw: (s) => { const a = cam.project(P(-1.5, 3, 0.5)), b = cam.project(P(1.5, 3, 0.5)); line(s, a, { x: b.x, y: a.y }, 3); } };
    });
    assert(r.pa.some((p) => p.brk), "少打射线那一遍：断开了");
    eq(r.pa.filter((p) => p.brk).length, r.pb.filter((p) => p.brk).length, "和每次打整条射线断的次数一样");
  });
});
