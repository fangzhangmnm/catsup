// 「开始画」的铺法（施工单十五）：按朝向连成片（自动展开 0.1）+ 留的格数跟着画布走 + 块挨得近时的归属表。created 2026-11-11 by Claude Opus 5.5
// 叠没叠用一个和铺法无关的查法：在画布上撒点（每格 4 × 4），数每个点落在几张面里（严格在里面）。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/corner-columns.ts";
import { addBox } from "../src/mesh/ops/build.ts";
import { layoutFaces, patchesOf, gapForCanvas, PATCH_MAX_DEG, PATCH_MIN_FILL, type Block } from "../src/paint/layout.ts";
import { buildTexelTable, type PaintFace } from "../src/paint/texel-table.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
/** 一块起伏的网格（n × n 个四边形，z = h(x, y)）。 */
function hills(n: number, size: number, h: (x: number, y: number) => number): MeshKernel {
  const m = new MeshKernel(), id: number[][] = [];
  for (let i = 0; i <= n; i++) { id.push([]); for (let j = 0; j <= n; j++) { const x = -size / 2 + (size * i) / n, y = -size / 2 + (size * j) / n; id[i].push(m.addVertex(P(x, y, h(x, y)))); } }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m.addFace([id[i][j], id[i + 1][j], id[i + 1][j + 1], id[i][j + 1]], -1, FRESH);
  return m;
}
/** 螺旋坡道：绕 z 轴两圈、慢慢往上的一条环带（每一格朝向都差不多朝上 → 都想进同一片，压平后第二圈会叠在第一圈上）。 */
function spiral(steps = 48, turns = 2): MeshKernel {
  const m = new MeshKernel(), inner: number[] = [], outer: number[] = [];
  for (let i = 0; i <= steps; i++) { const a = (2 * Math.PI * turns * i) / steps, z = 0.02 * i; inner.push(m.addVertex(P(Math.cos(a), Math.sin(a), z))); outer.push(m.addVertex(P(2 * Math.cos(a), 2 * Math.sin(a), z))); }
  for (let i = 0; i < steps; i++) m.addFace([inner[i], outer[i], outer[i + 1], inner[i + 1]], -1, FRESH);
  return m;
}
/** 点在多边形里面（严格：压在边上不算）。 */
function strictlyIn(r: ArrayLike<number>, x: number, y: number): boolean {
  const n = r.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = r[2 * i], yi = r[2 * i + 1], xj = r[2 * j], yj = r[2 * j + 1];
    const cr = (xj - xi) * (y - yi) - (yj - yi) * (x - xi);
    if (Math.abs(cr) < 1e-9 && x >= Math.min(xi, xj) - 1e-9 && x <= Math.max(xi, xj) + 1e-9 && y >= Math.min(yi, yj) - 1e-9 && y <= Math.max(yi, yj) + 1e-9) return false;
  }
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) { const xi = r[2 * i], yi = r[2 * i + 1], xj = r[2 * j], yj = r[2 * j + 1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; }
  return inside;
}
/** 撒点数叠：返回叠了的点数、每张面都在画布里没有。 */
function audit(values: ReadonlyMap<number, Float64Array>, W: number, H: number): { overlap: number; outside: number } {
  let overlap = 0, outside = 0;
  for (const v of values.values()) for (let i = 0; i < v.length; i += 2) if (v[i] < -1e-9 || v[i + 1] < -1e-9 || v[i] > W + 1e-9 || v[i + 1] > H + 1e-9) outside++;
  const rings = [...values.values()].map((v) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i < v.length; i += 2) { x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1]); } return { v, x0, y0, x1, y1 }; });
  for (let y = 0; y < H; y += 0.25) for (let x = 0; x < W; x += 0.25) {
    const px = x + 0.125, py = y + 0.125;
    let n = 0;
    for (const r of rings) if (px > r.x0 && px < r.x1 && py > r.y0 && py < r.y1 && strictlyIn(r.v, px, py)) n++;
    if (n > 1) overlap++;
  }
  return { overlap, outside };
}
/** 不同的片（块）之间至少隔着 gap 格。 */
function blocksApart(blocks: readonly Block[], gap: number): string {
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) { const a = blocks[i], b = blocks[j]; if (!(a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y)) return `块 ${a.face} 和块 ${b.face} 离得不够 ${gap} 格`; }
  return "";
}
/** 每张面每条边：画布上的长 ÷（空间里的长 × 密度）的最小 / 最大。 */
function stretch(m: MeshKernel, values: ReadonlyMap<number, Float64Array>, d: number): { lo: number; hi: number } {
  let lo = Infinity, hi = -Infinity;
  for (const [f, v] of values) { const p = m.facePts(f), n = p.length; for (let i = 0; i < n; i++) { const j = (i + 1) % n, w = Math.hypot(p[j].x - p[i].x, p[j].y - p[i].y, p[j].z - p[i].z); if (w < 1e-9) continue; const c = Math.hypot(v[2 * j] - v[2 * i], v[2 * j + 1] - v[2 * i + 1]) / (w * d); lo = Math.min(lo, c); hi = Math.max(hi, c); } }
  return { lo, hi };
}
const setsOf = (m: MeshKernel, faces: number[]): string => patchesOf(m, faces).map((u) => [...u.faces].sort((a, b) => a - b).join(",")).sort().join(" | ");

describe("开始画的铺法：按朝向连成片（施工单十五）", () => {
  it("留的格数跟着画布走：128 / 256 = 1、512 = 2、1024 = 4、2048 = 8", () => {
    eq([128, 256, 512, 1024, 2048].map(gapForCanvas).join(","), "1,1,2,4,8");
  });
  it("盒子：六片、每片零拉伸；每张面都在画布里、不叠、片之间隔够格", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 0.6, 0.8));
    for (const base of [128, 256, 1024]) {
      const gap = gapForCanvas(base), r = layoutFaces(m, m.faces(), { base, gap, style: "patches" });
      assert(r.ok, r.ok ? "" : r.reason); if (!r.ok) continue;
      eq(r.blocks.length, 6, `${base}：六片`);
      const a = audit(r.values, r.width, r.height), s = stretch(m, r.values, r.density);
      eq(a.overlap + a.outside, 0, `${base}：不叠、都在画布里`); eq(blocksApart(r.blocks, gap), "");
      assert(Math.abs(s.lo - 1) < 1e-9 && Math.abs(s.hi - 1) < 1e-9, `${base}：零拉伸 ${s.lo}…${s.hi}`);
    }
  });
  it("起伏的网格：连成少数几片；每条边的拉伸在 [cos 门槛, 1] 以内；不叠；片之间隔够格", () => {
    const m = hills(16, 2, (x, y) => 0.5 * Math.sin(2 * x) * Math.cos(1.5 * y));
    const r = layoutFaces(m, m.faces(), { base: 512, gap: 2, style: "patches" });
    assert(r.ok, r.ok ? "" : r.reason); if (!r.ok) return;
    assert(r.blocks.length < m.faces().length / 4, `${m.faces().length} 张面连成 ${r.blocks.length} 片`);
    const s = stretch(m, r.values, r.density), cos = Math.cos((PATCH_MAX_DEG * Math.PI) / 180);
    assert(s.lo >= cos - 1e-9 && s.hi <= 1 + 1e-9, `拉伸 ${s.lo.toFixed(4)}…${s.hi.toFixed(4)}，只许 [${cos.toFixed(4)}, 1]`);
    const a = audit(r.values, r.width, r.height);
    eq(a.overlap + a.outside, 0, `叠了 ${a.overlap} 个点、出界 ${a.outside} 个角`); eq(blocksApart(r.blocks, 2), "");
  });
  it("不平的四边形（马鞍面：面的平均朝向在门槛里、某个三角形可能不在）：按每个三角形比，拉伸照样在 [cos 门槛, 1] 以内", () => {
    const m = hills(8, 2, (x, y) => 0.9 * x * y), r = layoutFaces(m, m.faces(), { base: 512, gap: 2, style: "patches" });
    assert(r.ok, r.ok ? "" : r.reason); if (!r.ok) return;
    const s = stretch(m, r.values, r.density), cos = Math.cos((PATCH_MAX_DEG * Math.PI) / 180);
    assert(s.lo >= cos - 1e-9 && s.hi <= 1 + 1e-9, `拉伸 ${s.lo.toFixed(4)}…${s.hi.toFixed(4)}，只许 [${cos.toFixed(4)}, 1]`);
    eq(audit(r.values, r.width, r.height).overlap, 0);
  });
  it("螺旋坡道（两圈）：朝向都差不多，但压平后会叠 → 分成几片、谁都不叠", () => {
    const m = spiral(), r = layoutFaces(m, m.faces(), { base: 1024, gap: 4, style: "patches" });
    assert(r.ok, r.ok ? "" : r.reason); if (!r.ok) return;
    assert(r.blocks.length >= 2 && r.blocks.length < m.faces().length, `${m.faces().length} 张面 → ${r.blocks.length} 片（至少两片：一片放不下两圈）`);
    const a = audit(r.values, r.width, r.height);
    eq(a.overlap, 0, `叠了 ${a.overlap} 个点`);
  });
  it("只有一张面的片 = 以前「一张面一块」逐位相同（盒子每片一张面：和 style = faces 的结果一个数都不差）", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 0.6, 0.8));
    const a = layoutFaces(m, m.faces(), { base: 1024, style: "patches" }), b = layoutFaces(m, m.faces(), { base: 1024 });
    assert(a.ok && b.ok, "都铺得下"); if (!a.ok || !b.ok) return;
    eq(a.density, b.density); eq(`${a.width}x${a.height}`, `${b.width}x${b.height}`);
    for (const [f, v] of b.values) eq([...a.values.get(f)!].join(","), [...v].join(","), `面 ${f}`);
  });
  it("同样的输入跑两遍一样；面的列表换个顺序、分出来的片一样；面的编号换个顺序（倒着建同一个形状）、片（按面的集合看）对得上", () => {
    const m = hills(10, 2, (x, y) => 0.4 * Math.sin(3 * x + y) + 0.05 * x * y + 0.01 * x);
    const fs = m.faces(), r1 = layoutFaces(m, fs, { base: 256, gap: 1, style: "patches" }), r2 = layoutFaces(m, [...fs].reverse(), { base: 256, gap: 1, style: "patches" });
    assert(r1.ok && r2.ok, "铺得下"); if (!r1.ok || !r2.ok) return;
    for (const [f, v] of r1.values) eq([...r2.values.get(f)!].join(","), [...v].join(","), `面 ${f}`);
    // 倒着建：第 k 张面 = 原来的第 n−1−k 张
    const n = fs.length, m2 = new MeshKernel(), vmap = new Map<number, number>();
    for (const f of [...fs].reverse()) m2.addFace(m.faceVerts(f).map((v) => { let w = vmap.get(v); if (w === undefined) { w = m2.addVertex(m.pt(v)); vmap.set(v, w); } return w; }), -1, FRESH);
    const back = (g: number): number => fs[n - 1 - m2.faces().indexOf(g)];
    const sets2 = patchesOf(m2, m2.faces()).map((u) => u.faces.map(back).sort((a, b) => a - b).join(",")).sort().join(" | ");
    eq(sets2, setsOf(m, fs), "片一样");
  });
});

/** 一条斜着的平行四边形带：沿 x 排 n 个，每个底边 1、斜边从 (s, H) 起（斜边最长 → 种子的方向是斜的，片的包围盒按种子摆就松）。 */
function slantStrip(n: number, s: number, H: number): MeshKernel {
  const m = new MeshKernel(), lo: number[] = [], hi: number[] = [];
  for (let i = 0; i <= n; i++) { lo.push(m.addVertex(P(i, 0, 0))); hi.push(m.addVertex(P(i + s, H, 0))); }
  for (let i = 0; i < n; i++) m.addFace([lo[i], lo[i + 1], hi[i + 1], hi[i]], -1, FRESH);
  return m;
}
/** 一片（铺好以后）：面压平后的面积 ÷ 坐标的包围盒面积。 */
function fillOf(values: ReadonlyMap<number, Float64Array>, faces: readonly number[]): number {
  let a = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of faces) { const v = values.get(f)!, n = v.length / 2; let s = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; s += v[2 * i] * v[2 * j + 1] - v[2 * j] * v[2 * i + 1]; x0 = Math.min(x0, v[2 * i]); x1 = Math.max(x1, v[2 * i]); y0 = Math.min(y0, v[2 * i + 1]); y1 = Math.max(y1, v[2 * i + 1]); } a += Math.abs(s) / 2; }
  return a / ((x1 - x0) * (y1 - y0));
}
/** 一张面在画布上的绕向（有向面积的正负）。 */
const windOf = (v: Float64Array): number => { const n = v.length / 2; let s = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; s += v[2 * i] * v[2 * j + 1] - v[2 * j] * v[2 * i + 1]; } return Math.sign(s); };

describe("连成片收紧（施工单十六第三节）", () => {
  it("片太空就不收：两张面以上的片，铺好以后（面积 ÷ 包围盒）都不低于门槛；门槛是 0 时片更少（收得更多）", () => {
    for (const [name, m] of [["起伏", hills(16, 2, (x, y) => 0.5 * Math.sin(2 * x) * Math.cos(1.5 * y))], ["马鞍", hills(8, 2, (x, y) => 0.9 * x * y)], ["螺旋", spiral()]] as const) {
      const units = patchesOf(m, m.faces()), r = layoutFaces(m, m.faces(), { base: 256, gap: 1, style: "patches" });
      assert(r.ok, r.ok ? "" : r.reason); if (!r.ok) continue;
      for (const u of units) if (u.faces.length > 1) { const f = fillOf(r.values, u.faces); assert(f >= PATCH_MIN_FILL - 1e-9, `${name}：种子 ${u.seed} 那片 ${u.faces.length} 张面，满 ${f.toFixed(3)} < ${PATCH_MIN_FILL}`); }
      const loose = patchesOf(m, m.faces(), { minFill: 0 });
      assert(loose.length <= units.length, `${name}：不限 ${loose.length} 片 ≤ 限了 ${units.length} 片`);
      eq(audit(r.values, r.width, r.height).overlap, 0, `${name}：不叠`);
    }
  });
  it("片的朝向取包围盒最小的：斜的平行四边形带（种子最长的边是斜的）转成顺着带子摆；不镜像（每张面的绕向和按种子摆的一样）；比按种子摆的满", () => {
    const m = slantStrip(10, 1.5, 3), fs = m.faces();
    const units = patchesOf(m, fs, { minFill: 0 });
    eq(units.length, 1, "一片"); const fr = units[0].frame!;
    assert(Math.abs(Math.abs(fr.e.x) - 1) < 1e-9 && Math.abs(fr.e.y) < 1e-9, `横轴顺着带子：e = (${fr.e.x}, ${fr.e.y}, ${fr.e.z})`);
    const tight = layoutFaces(m, fs, { base: 1024, gap: 4, style: "patches", minFill: 0 }), seed = layoutFaces(m, fs, { base: 1024, gap: 4, style: "patches", minFill: 0, orient: "seed" });
    assert(tight.ok && seed.ok, "都铺得下"); if (!tight.ok || !seed.ok) return;
    for (const f of fs) eq(windOf(tight.values.get(f)!), windOf(seed.values.get(f)!), `面 ${f} 绕向不变`);
    const a = fillOf(tight.values, fs), b = fillOf(seed.values, fs);
    assert(a > b + 0.05, `转了以后满 ${a.toFixed(3)}，按种子摆 ${b.toFixed(3)}`);
    const s = stretch(m, tight.values, tight.density);
    assert(Math.abs(s.lo - 1) < 1e-9 && Math.abs(s.hi - 1) < 1e-9, `平的带子零拉伸 ${s.lo}…${s.hi}`);
  });
  it("转了朝向只会更紧：起伏网格每一片，按包围盒最小摆的满 ≥ 按种子摆的满", () => {
    const m = hills(12, 2, (x, y) => 0.3 * Math.sin(2 * x + y)), fs = m.faces();
    const units = patchesOf(m, fs);
    const a = layoutFaces(m, fs, { base: 1024, gap: 4, style: "patches" }), b = layoutFaces(m, fs, { base: 1024, gap: 4, style: "patches", orient: "seed" });
    assert(a.ok && b.ok, "都铺得下"); if (!a.ok || !b.ok) return;
    for (const u of units) if (u.faces.length > 1) assert(fillOf(a.values, u.faces) >= fillOf(b.values, u.faces) - 1e-9, `种子 ${u.seed} 那片`);
  });
});

describe("块挨得近时的归属表（施工单十五第四节：铺的空隙变小、归属表照旧往外延 2 格）", () => {
  const square = (face: number, x0: number, y0: number, x1: number, y1: number): PaintFace => ({
    face, ring: Float64Array.from([x0, y0, x1, y0, x1, y1, x0, y1]),
    tris: [{ face, tri: 0, uv: [x0, y0, x1, y0, x1, y1], pos: [P(x0, y0, 0), P(x1, y0, 0), P(x1, y1, 0)] }, { face, tri: 1, uv: [x0, y0, x1, y1, x0, y1], pos: [P(x0, y0, 0), P(x1, y1, 0), P(x0, y1, 0)] }],
  });
  /** 每格：中心严格在某块里的归那块；不然归离得最近的（一样近归编号小的）；超过 2 格没人要。 */
  function check(a: PaintFace, b: PaintFace, W: number, H: number): void {
    const t = buildTexelTable(W, H, [a, b], 4), polys = [a.ring, b.ring];
    const dist = (r: Float64Array, x: number, y: number): number => { const x0 = r[0], y0 = r[1], x1 = r[4], y1 = r[5], dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1); return Math.hypot(dx, dy); };
    let near = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const cx = x + 0.5, cy = y + 0.5, own = t.owner[y * W + x];
      const inside = polys.findIndex((r) => strictlyIn(r, cx, cy));
      if (inside >= 0) { eq(own, inside, `格 (${x}, ${y}) 中心在块 ${inside} 里`); continue; }
      const d = polys.map((r) => dist(r, cx, cy)), m = Math.min(...d);
      const want = m > 2 + 1e-9 ? -1 : d[0] <= d[1] ? 0 : 1;
      eq(own, want, `格 (${x}, ${y})：离两块 ${d[0].toFixed(3)} / ${d[1].toFixed(3)}`);
      if (want >= 0 && Math.abs(d[0] - d[1]) < 1.5) near++;
    }
    assert(near > 0, "确实有两块都够得着的格子");
  }
  it("隔 1 格的两块", () => check(square(0, 2, 2, 10, 10), square(1, 11, 2, 19, 10), 24, 14));
  it("共一条边的两块（连成片之后一片里相邻的两张面）", () => check(square(0, 2, 2, 10, 10), square(1, 10, 2, 18, 10), 24, 14));
  it("共一个角的两块", () => check(square(0, 2, 2, 10, 10), square(1, 10, 10, 18, 18), 22, 22));
});
