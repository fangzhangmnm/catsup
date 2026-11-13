// 网格体邻接表增量维护（W-11）的样本 + 主门。created 2026-11-10 by Claude Opus 5.5
// 样本 = 改之前（main 74c71f1）的代码算出来的：7 种底子 × 3 个种子 × 25 步随机操作（劈边 / 劈面 / 刀 / 环切 / 内插 / 挤出面 / 挤出边 / 倒角 / 并点 /
// 删面 / 细分 / 强行对称 / 并面 / 消点 / 翻面），每步在副本上做，做不了或 check() 报错就丢掉这一步。做完按**原始编号**记：点（位置按位）/ 边 / 面，
// **每个点连着的边、每条边挨着的面（含先后）**，再加三个点一张面看之后分到的编号——取 sha256。重冻：FREEZE_ADJ=1 跑这一个文件，把打出来的表贴回 GOLDEN。
// 主门（Fable 11-10）：check() 里「增量维护的表 = 当场从头重建的表（逐项、含先后）」，随机链每一步都要过——某一步 check() 报的若是这一条，直接算失败（不当成「这一步做不了」悄悄丢掉）。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, F_WIRE } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/corner-columns.ts";
import { addBox, bevelEdges, catmullClark, deleteFaces, dissolveVertex, extrudeEdges, extrudeFaces, flipFaces, insetFaces, joinFaces, knife, loopCut, mergeVerts, splitEdge, splitFace } from "../src/mesh/ops/index.ts";
import { symmetrize } from "../src/mesh/mirror.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
const { createHash } = (await import("node:crypto" as string)) as { createHash(a: string): { update(s: string): { digest(e: string): string } } };
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
function torus(N: number): MeshKernel {
  const k = new MeshKernel(), id = (i: number, j: number): number => ((i + N) % N) * N + ((j + N) % N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const u = (2 * Math.PI * i) / N, v = (2 * Math.PI * j) / N; k.addVertex(P((3 + Math.cos(v)) * Math.cos(u), (3 + Math.cos(v)) * Math.sin(u), Math.sin(v))); }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) k.addFace([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)], -1, FRESH);
  return k;
}
const BASES: Record<string, () => MeshKernel> = {
  box: () => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); return k; },
  torus8: () => torus(8),
  openGrid: () => { const k = new MeshKernel(), n = 3, v = (i: number, j: number): number => i * (n + 1) + j; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) k.addVertex(P(i, j, 0)); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) k.addFace([v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)], -1, FRESH); return k; },
  fin: () => { const k = new MeshKernel(), a = k.addVertex(P(0, 0, 0)), b = k.addVertex(P(0, 0, 1)); for (const [x, y] of [[1, 0], [-1, 0.2], [0.1, 1]]) { const c = k.addVertex(P(x, y, 1)), d = k.addVertex(P(x, y, 0)); k.addFace([a, b, c, d], -1, FRESH); } return k; },
  loose: () => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); const a = k.addVertex(P(3, 0, 0)), b = k.addVertex(P(4, 0, 0)); k.setEdgeFlags(k.ensureEdge(a, b), F_WIRE); k.addVertex(P(5, 5, 5)); return k; },
  mirrorBox: () => { const k = new MeshKernel(); addBox(k, P(-1, 0, 0), P(1, 1, 1)); return k; },
  columns: () => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(2, 1, 1)); k.addColumn({ guid: "uv", arity: 2, kind: "test" }); for (const f of k.faces()) k.setFaceValues(f, "uv", k.facePts(f).flatMap((p) => [p.x + p.z, p.y - p.x])); return k; },
};
const OPS = ["splitEdge", "splitFace", "knife", "loopCut", "inset", "extrudeFaces", "extrudeEdges", "bevel", "mergeVerts", "deleteFaces", "subdivide", "symmetrize", "joinFaces", "dissolveVertex", "flipFaces"] as const;

/** 一条随机链：每一步在副本上做；做不了 / check() 报错 = 丢掉这一步（onBad 先看报错：主门那条 → 调用方算失败）。 */
function chain(base: string, seed: number, steps: number, onBad?: (bad: string[], op: string, step: number) => void): { k: MeshKernel; done: number[] } {
  let k = BASES[base]();
  const r = rng(seed * 7919 + base.length), pick = <T>(xs: readonly T[]): T | undefined => xs.length ? xs[Math.floor(r() * xs.length)] : undefined, done = OPS.map(() => 0);
  for (let step = 0; step < steps; step++) {
    const c = k.clone(), oi = Math.floor(r() * OPS.length), op = OPS[oi], f = pick(c.faces()), e = pick(c.edges()), v = pick(c.verts());
    try {
      if (op === "splitEdge" && e !== undefined) splitEdge(c, e, 0.2 + 0.6 * r());
      else if (op === "splitFace" && f !== undefined && c.faceLen[f] >= 4) { const ring = c.faceVerts(f), i = Math.floor(r() * ring.length); splitFace(c, f, ring[i], ring[(i + 2) % ring.length]); }
      else if (op === "knife" && f !== undefined) { const es = c.fEdges(f); if (es.length < 4) continue; const i = Math.floor(r() * es.length); knife(c, f, [{ e: es[i], t: 0.3 + 0.4 * r() }, { e: es[(i + 2) % es.length], t: 0.3 + 0.4 * r() }]); }
      else if (op === "loopCut" && e !== undefined) loopCut(c, e, 0.3 + 0.4 * r());
      else if (op === "inset" && f !== undefined) insetFaces(c, [f], 0.03);
      else if (op === "extrudeFaces" && f !== undefined) extrudeFaces(c, [f]);
      else if (op === "extrudeEdges" && e !== undefined) extrudeEdges(c, [e]);
      else if (op === "bevel" && e !== undefined) bevelEdges(c, [e], 0.05, 1 + Math.floor(r() * 2));
      else if (op === "mergeVerts" && e !== undefined) mergeVerts(c, [c.edgeA[e], c.edgeB[e]], "first");
      else if (op === "deleteFaces" && f !== undefined) deleteFaces(c, [f]);
      else if (op === "subdivide") { if (c.faceCount() > 120) continue; catmullClark(c); }
      else if (op === "symmetrize") symmetrize(c, 0, 1);
      else if (op === "joinFaces" && e !== undefined) joinFaces(c, e);
      else if (op === "dissolveVertex" && v !== undefined) dissolveVertex(c, v);
      else if (op === "flipFaces" && f !== undefined) flipFaces(c, [f]);
      else continue;
    } catch { continue; }
    const bad = c.check();
    if (bad.length) { onBad?.(bad, op, step); continue; }
    k = c; done[oi]++;
  }
  return { k, done };
}

const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const bits = (x: number): string => { f64[0] = x; return `${u32[0].toString(16)}.${u32[1].toString(16)}`; };
function dump(k: MeshKernel): string {
  const o: string[] = [];
  for (const v of k.verts()) { const p = k.pt(v); o.push(`v${v}:${bits(p.x)},${bits(p.y)},${bits(p.z)}|${[...k.vEdges(v)].join(",")}`); }
  for (const e of k.edges()) o.push(`e${e}:${k.edgeA[e]}-${k.edgeB[e]}/${k.edgeFlags[e]}|${[...k.eFaces(e)].join(",")}`);
  for (const f of k.faces()) o.push(`f${f}:${k.faceVerts(f).join(",")}/m${k.faceMat[f]}/x${k.faceFlags[f]}`);
  for (const c of k.columnDefs()) for (const f of k.faces()) { const vals = k.cornerValues(f, c.guid); o.push(`c${f}:${vals ? [...vals].map(bits).join(",") : "-"}`); }
  const nv = [P(9, 9, 9), P(10, 9, 9), P(9, 10, 9)].map((p) => k.addVertex(p)), nf = k.addFace(nv, -1, FRESH);
  o.push(`next v ${nv.join(",")} f ${nf} e ${k.fEdges(nf).join(",")}`);
  return o.join("\n");
}
const CASES: [string, number][] = Object.keys(BASES).flatMap((b) => [1, 2, 3].map((s): [string, number] => [b, s]));
const hashOf = (b: string, s: number): string => createHash("sha256").update(dump(chain(b, s, 25).k)).digest("hex").slice(0, 32);

/** 改之前（main 74c71f1，2026-11-10）算出来的。 */
const GOLDEN: Record<string, string> = {
  "box#1": "17cf2d4fce83bc7f7e559c223cf947e3",
  "box#2": "f8f1d7911b0f14fc7bf519c6310d3d2f",
  "box#3": "417b78d10444c6b419d34836d3df300b",
  "torus8#1": "f315883211a77615e931c20523324bee",
  "torus8#2": "64c93e744e06fa1c3a0ccf97560500e8",
  "torus8#3": "b72bac6d9c17f7149ab6d8959003a735",
  "openGrid#1": "57d7b6b8469adec4be20d71877769d76",
  "openGrid#2": "2d1248d5b09d8af316b3730dc15beb4f",
  "openGrid#3": "a7aaf05b7031e1e2de63e74547fe7d30",
  "fin#1": "a54e44b10039c84772025eb5ff12bf86",
  "fin#2": "ad3048ed9c1c75e9b953d778d8fe7123",
  "fin#3": "bd4aedc99c672816f829af955bdbbc72",
  "loose#1": "95e38bc804befcf6cb2208c53a6ad1b8",
  "loose#2": "272910f02bb4d2cd8fe1c841e20339b3",
  "loose#3": "70da37094bb50f932a50cf27eece9db5",
  "mirrorBox#1": "0747dfbd094203cc737629cde5b523f6",
  "mirrorBox#2": "19a10e145974bbf5c404feaffed1147d",
  "mirrorBox#3": "f37342740cd496e64d753ab0378c801f",
  "columns#1": "10491e8969a5c9821601fe4a0591b335",
  "columns#2": "45e947cb4a479fc8e85573541b6ef0cc",
  "columns#3": "c067f758eccc4c8556777509bc84fba7",
};

describe("网格体邻接：随机操作链的结果和改之前逐位相同（W-11 的样本）", () => {
  if (env.FREEZE_ADJ) { const out: Record<string, string> = {}; for (const [b, s] of CASES) out[`${b}#${s}`] = hashOf(b, s); console.log(JSON.stringify(out, null, 1)); }
  for (const [b, s] of CASES) it(`${b} 种子 ${s}：点 / 边 / 面、每个点连着的边、每条边挨着的面（含先后）、之后分到的编号逐位相同`, () => eq(hashOf(b, s), GOLDEN[`${b}#${s}`]));
  it("随机链真的做了各种操作（每种至少 3 步）", () => {
    const total = OPS.map(() => 0);
    for (const [b, s] of CASES) chain(b, s, 25).done.forEach((n, i) => { total[i] += n; });
    const thin = OPS.filter((_, i) => total[i] < 3);
    eq(thin.join("、"), "", `做成的步数：${OPS.map((o, i) => `${o} ${total[i]}`).join("，")}`);
  });
});

describe("网格体邻接：主门（check() 里增量表 = 当场重建的表）", () => {
  it("随机链每一步做完 check() 都不报邻接那一条", () => {
    const hits: string[] = [];
    for (const [b, s] of CASES) chain(b, s, 25, (bad, op, step) => { for (const x of bad) if (/adjacency/.test(x)) hits.push(`${b}#${s} 第 ${step} 步 ${op}：${x}`); });
    eq(hits.slice(0, 3).join("；"), "");
  });
  it("clone、swapWith（撤销）、fromSnapshot 之后邻接对", () => {
    const { k } = chain("torus8", 4, 15), c = k.clone();
    eq(c.check().length, 0, "clone");
    const other = BASES.box();
    k.swapWith(other);
    eq(k.check().length, 0, "swapWith 换来的"); eq(other.check().length, 0, "swapWith 换走的");
    const s = MeshKernel.fromSnapshot(c.toSnapshot());
    eq(s.check().length, 0, "fromSnapshot");
    assert(dump(c.clone()) === dump(c.clone()), "clone 确定");
  });
});
