// 最笨的铺法（贴图主线 1-3a 第二节，施工单 ai-docs/20261110-paint-workorders-7.md）的性质。created 2026-11-10 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { layoutFaces, layoutAppend, type Block } from "../src/paint/layout.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
import { placeOn, uvAtOf, uvOf, slotsOf } from "./uv-kit.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
/** 随便转一下（绕任意轴的旋转 + 平移）。 */
function rotor(r: () => number): (p: Pt3) => Pt3 {
  const ax = { x: r() - 0.5, y: r() - 0.5, z: r() - 0.5 }, l = Math.hypot(ax.x, ax.y, ax.z), k = { x: ax.x / l, y: ax.y / l, z: ax.z / l }, th = r() * 6.28, c = Math.cos(th), s = Math.sin(th), o = { x: r() * 5, y: r() * 5, z: r() * 5 };
  return (p) => { const d = k.x * p.x + k.y * p.y + k.z * p.z, cr = { x: k.y * p.z - k.z * p.y, y: k.z * p.x - k.x * p.z, z: k.x * p.y - k.y * p.x }; return { x: p.x * c + cr.x * s + k.x * d * (1 - c) + o.x, y: p.y * c + cr.y * s + k.y * d * (1 - c) + o.y, z: p.z * c + cr.z * s + k.z * d * (1 - c) + o.z }; };
}
/** 一批平的面：盒子 + 随便转过的长方形（边长 × 40 是整数）、凸 / 凹多边形、三角形，以及一张退化的面（三点共线）。 */
function planarMesh(seed: number): { k: MeshKernel; rects: number[]; degenerate: number } {
  const k = new MeshKernel(), r = rng(seed);
  addBox(k, P(0, 0, 0), P(0.5, 0.25, 0.75));
  const rects: number[] = [];
  for (let i = 0; i < 4; i++) { const R = rotor(r), w = (5 + Math.floor(r() * 20)) / 40, h = (3 + Math.floor(r() * 10)) / 40; rects.push(k.addFace([P(0, 0, 0), P(w, 0, 0), P(w, h, 0), P(0, h, 0)].map((p) => k.addVertex(R(p))), FRESH)); }
  for (let i = 0; i < 4; i++) { const R = rotor(r), n = 3 + Math.floor(r() * 5); k.addFace(Array.from({ length: n }, (_, j) => { const a = (2 * Math.PI * j) / n, rr = 0.2 + 0.1 * r() * (j % 2 ? 0.3 : 1); return k.addVertex(R(P(rr * Math.cos(a), rr * Math.sin(a), 0))); }), FRESH); }
  const degenerate = k.addFace([P(9, 9, 9), P(9.5, 9, 9), P(10, 9, 9)].map((p) => k.addVertex(p)), FRESH);
  return { k, rects, degenerate };
}
const isPlanar = (k: MeshKernel, f: number): boolean => { const n = k.faceNormal(f), ps = k.facePts(f), d = n.x * ps[0].x + n.y * ps[0].y + n.z * ps[0].z; return ps.every((p) => Math.abs(n.x * p.x + n.y * p.y + n.z * p.z - d) < 1e-9); };
const area2 = (k: MeshKernel, f: number): number => { const ps = k.facePts(f); let a = 0; for (let i = 1; i + 1 < ps.length; i++) { const u = { x: ps[i].x - ps[0].x, y: ps[i].y - ps[0].y, z: ps[i].z - ps[0].z }, v = { x: ps[i + 1].x - ps[0].x, y: ps[i + 1].y - ps[0].y, z: ps[i + 1].z - ps[0].z }; a += Math.hypot(u.y * v.z - u.z * v.y, u.z * v.x - u.x * v.z, u.x * v.y - u.y * v.x); } return a; };
function blocksOk(blocks: readonly Block[], W: number, H: number, gap: number): string {
  for (const b of blocks) if (b.x < gap || b.y < gap || b.x + b.w + gap > W || b.y + b.h + gap > H) return `块 ${b.face} 离画布边不够 ${gap} 格`;
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) { const a = blocks[i], b = blocks[j]; if (!(a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y)) return `块 ${a.face} 和 ${b.face} 挨得太近 / 重叠`; }
  return "";
}

describe("铺法（1-3a 第二节）", () => {
  it("平的面：画布上任意两个角的距离 = 空间里的距离 × 密度（≤ 千分之一格）；每张面在自己的块里，块不重叠、间隔够", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const { k } = planarMesh(seed), d = 37, r = layoutFaces(k, k.faces(), { density: d });
      assert(r.ok, "铺得下"); if (!r.ok) return;
      eq(blocksOk(r.blocks, r.width, r.height, 4), "", `种子 ${seed}`);
      for (const b of r.blocks) {
        const v = r.values.get(b.face)!, ps = k.facePts(b.face);
        for (let i = 0; i < v.length; i += 2) assert(v[i] >= b.x - 1e-6 && v[i] <= b.x + b.w + 1e-6 && v[i + 1] >= b.y - 1e-6 && v[i + 1] <= b.y + b.h + 1e-6, `面 ${b.face} 的角出了自己的块`);
        if (!isPlanar(k, b.face) || area2(k, b.face) < 1e-12) continue;
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
          const sp = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y, ps[i].z - ps[j].z) * d, cv = Math.hypot(v[2 * i] - v[2 * j], v[2 * i + 1] - v[2 * j + 1]);
          assert(Math.abs(sp - cv) <= 1e-3, `种子 ${seed} 面 ${b.face} 角 ${i}-${j}：画布 ${cv} vs 空间 × 密度 ${sp}`);
        }
      }
    }
  });
  it("从正面看不镜像：画布上（纵轴朝下）按环走的方向和从正面看这张面时一致；最长的边是横着的", () => {
    const { k } = planarMesh(7), r = layoutFaces(k, k.faces(), { density: 50 });
    assert(r.ok, "铺得下"); if (!r.ok) return;
    for (const [f, v] of r.values) {
      if (area2(k, f) < 1e-12) continue;
      let s = 0; for (let i = 0; i < v.length; i += 2) { const j = (i + 2) % v.length; s += v[i] * v[j + 1] - v[j] * v[i + 1]; }
      assert(s < 0, `面 ${f}：画布上的绕向是镜像的（纵轴朝下的画布上，从正面看逆时针 = 这个和是负的）`);
      const ps = k.facePts(f); let best = 0, bl = -1;
      for (let i = 0; i < ps.length; i++) { const a = ps[i], b = ps[(i + 1) % ps.length], l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); if (l > bl + 1e-9) { bl = l; best = i; } }
      const j = (best + 1) % ps.length;
      assert(Math.abs(v[2 * best + 1] - v[2 * j + 1]) < 1e-6, `面 ${f} 最长的边不是横着的`);
    }
  });
  it("长方形（边长 × 密度是整数）：四个角正好落在格点上（≤ 百万分之一格）", () => {
    const { k, rects } = planarMesh(3), r = layoutFaces(k, rects, { density: 40 });
    assert(r.ok, "铺得下"); if (!r.ok) return;
    for (const f of rects) for (const x of r.values.get(f)!) assert(Math.abs(x - Math.round(x)) < 1e-6, `面 ${f} 的角 ${x} 不在格点上`);
  });
  it("确定性：同一个网格体铺两遍逐位相同；退化的面占一格、不报错", () => {
    const a = planarMesh(11), b = planarMesh(11), ra = layoutFaces(a.k, a.k.faces()), rb = layoutFaces(b.k, b.k.faces());
    assert(ra.ok && rb.ok, "铺得下"); if (!ra.ok || !rb.ok) return;
    eq(JSON.stringify([ra.width, ra.height, ra.density, ra.blocks, [...ra.values].map(([f, v]) => [f, [...v]])]), JSON.stringify([rb.width, rb.height, rb.density, rb.blocks, [...rb.values].map(([f, v]) => [f, [...v]])]));
    const deg = ra.blocks.find((x) => x.face === a.degenerate)!;
    eq(`${deg.w}x${deg.h}`, "1x1", "退化的面占一格");
  });
  it("没给密度：画布 1024 见方，密度是放得下的最大整数（再加一就放不下）", () => {
    const { k } = planarMesh(5), r = layoutFaces(k, k.faces());
    assert(r.ok, "铺得下"); if (!r.ok) return;
    eq(`${r.width}x${r.height}`, "1024x1024"); assert(Number.isInteger(r.density) && r.density >= 1, "整数密度");
    eq(blocksOk(r.blocks, 1024, 1024, 4), "");
    const more = layoutFaces(k, k.faces(), { density: r.density + 1 });
    assert(!more.ok || more.width > 1024 || more.height > 1024, `密度 ${r.density + 1} 也放得进 1024 见方：二分没找到最大的`);
  });
  it("给了密度：宽 1024（有一块更宽就取够宽的最小的 256 的倍数），高取放得下的最小的 256 的倍数；超过上限不铺、说原因，不偷偷降密度", () => {
    const { k } = planarMesh(2), r = layoutFaces(k, k.faces(), { density: 30 });
    assert(r.ok, "铺得下"); if (!r.ok) return;
    eq(r.width, 1024); eq(r.height % 256, 0); assert(r.blocks.every((b) => b.y + b.h + 4 <= r.height) && r.height - 256 < Math.max(...r.blocks.map((b) => b.y + b.h + 4)), "高是最小的 256 的倍数");
    const wide = new MeshKernel(); wide.addFace([P(0, 0, 0), P(30, 0, 0), P(30, 1, 0), P(0, 1, 0)].map((p) => wide.addVertex(p)), FRESH);
    const w = layoutFaces(wide, wide.faces(), { density: 50 });
    assert(w.ok, "宽的也铺得下"); if (!w.ok) return;
    eq(w.width, 1536, "1500 格宽 + 两边间隔 → 1536");
    const tooBig = layoutFaces(wide, wide.faces(), { density: 200 });
    assert(!tooBig.ok && /超过上限/.test(tooBig.reason) && tooBig.face === wide.faces()[0], "超过上限：不铺，说是哪张面、要多大");
  });
  it("给新面补一块：已经铺好的角一个数都不变；新块放在空着的地方、不和谁挨太近；放不下就往下加高（256 的倍数）", () => {
    const { k } = planarMesh(9), all = k.faces(), first = all.slice(0, 6), later = all.slice(6);
    const r0 = layoutFaces(k, first, { density: 60 });
    assert(r0.ok, "铺得下"); if (!r0.ok) return;
    for (const [f, v] of r0.values) placeOn(k, f, "uv", [...v]);
    const before = first.map((f) => [...uvAtOf(k, f, "uv")!].join());
    const r1 = layoutAppend(uvOf(k), "uv", first, later, { width: r0.width, height: r0.height }, 60);
    assert(r1.ok, "补得上"); if (!r1.ok) return;
    eq(first.map((f) => [...uvAtOf(k, f, "uv")!].join()).join("|"), before.join("|"), "已有的不变");
    eq(r1.height % 256, 0); assert(r1.height >= r0.height, "只会加高");
    eq(blocksOk([...r0.blocks, ...r1.blocks], r1.width, r1.height, 4), "");
    // 放不下：补一张 6 米见方的面（每米 60 格 = 360 格，比哪儿空着的都大）→ 在最下面接着放、画布往下加高
    const big = k.addFace([P(20, 0, 0), P(26, 0, 0), P(26, 6, 0), P(20, 6, 0)].map((p) => k.addVertex(p)), FRESH);
    const H0 = 256 * Math.ceil((Math.max(...r0.blocks.map((b) => b.y + b.h)) + 4) / 256);
    const tight = layoutAppend(uvOf(k), "uv", first, [big], { width: r0.width, height: H0 }, 60);
    assert(tight.ok, "加高后补得上"); if (!tight.ok) return;
    const nb = tight.blocks[0];
    assert(tight.height % 256 === 0 && tight.height > H0 && nb.y + nb.h + 4 <= tight.height, `加高了（${H0} → ${tight.height}）`);
    eq(blocksOk([...r0.blocks, ...tight.blocks], tight.width, tight.height, 4), "");
  });
  it("画布比 256 小（开始画时选 128，2026-11-11）：不给密度 = 128 见方；给了密度 = 宽 128、高按 128 的倍数；补面加高也按 128 的倍数", () => {
    const { k } = planarMesh(3), faces = k.faces();
    const a = layoutFaces(k, faces, { base: 128 });
    assert(a.ok, a.ok ? "" : a.reason); if (!a.ok) return;
    eq(`${a.width}x${a.height}`, "128x128", "128 见方");
    assert(blocksOk(a.blocks, a.width, a.height, 4) === "", blocksOk(a.blocks, a.width, a.height, 4));
    const b = layoutFaces(k, faces, { density: a.density * 2, base: 128 });
    assert(b.ok, b.ok ? "" : b.reason); if (!b.ok) return;
    eq(b.width, 128); eq(b.height % 128, 0, `高 ${b.height} 是 128 的倍数`); assert(b.height >= 128 && b.height < 1024, `高 ${b.height}`);
    // 补面：先铺一半，再补另一半，加高按 128 的倍数
    const half = faces.slice(0, Math.floor(faces.length / 2)), rest = faces.slice(half.length);
    const c = layoutFaces(k, half, { base: 128 }); if (!c.ok) throw new Error(c.reason);
    for (const [f, v] of c.values) placeOn(k, f, "uvs", [...v]);
    const d = layoutAppend(uvOf(k), "uvs", half, rest, { width: 128, height: 128 }, c.density * 3);
    assert(d.ok, d.ok ? "" : d.reason); if (!d.ok) return;
    eq(d.height % 128, 0, `补面后高 ${d.height} 是 128 的倍数`); assert(d.height > 128, "放不下就加高");
  });
  it("画布 ≥ 256 时和以前一样（步长 256）：base 1024 / 512 / 2048 不给密度 = 正方形", () => {
    const { k } = planarMesh(4);
    for (const base of [256, 512, 1024, 2048]) { const r = layoutFaces(k, k.faces(), { base }); assert(r.ok, `base ${base}`); if (r.ok) eq(`${r.width}x${r.height}`, `${base}x${base}`); }
  });
});
