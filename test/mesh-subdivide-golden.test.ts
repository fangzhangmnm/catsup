// 细分的结果冻成样本（W-10：细分随面数平方涨那处改掉，结果必须和改之前逐位相同）。created 2026-11-10 by Claude Opus 5.5
// 样本 = 改之前（main bbb3f6f）的代码算出来的：每个活着的点 / 边 / 面按**原始编号**记（位置按位、环、材质、面标记、边标记、角上的数按位），
// 再加三个点一张面看接下来分到的编号（空闲编号表的状态）——取 sha256。细分的规矩以后真要改，重冻：FREEZE_SUBDIV=1 跑这一个文件，把打出来的表贴回 GOLDEN。
// 另一条：细分一次只重建几次邻接表（「没多做事」的直接证明；改之前 256 面要上千次）。
import { faceHidden, faceMaterial, givenFaceValues } from "../src/mesh/reserved-columns.ts";
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { SHARP_EDGE, packEdgeByte, setEdgeMark } from "../src/mesh/reserved-columns.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { addBox, addPolygon, catmullClark, deleteFaces, extrudeFaces } from "../src/mesh/ops/index.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
const { createHash } = (await import("node:crypto" as string)) as { createHash(a: string): { update(s: string): { digest(e: string): string } } };
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
function torus(N: number): MeshKernel {
  const k = new MeshKernel(), id = (i: number, j: number): number => ((i + N) % N) * N + ((j + N) % N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const u = (2 * Math.PI * i) / N, v = (2 * Math.PI * j) / N; k.addVertex(P((3 + Math.cos(v)) * Math.cos(u), (3 + Math.cos(v)) * Math.sin(u), Math.sin(v))); }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) k.addFace([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)], { kind: "fresh", face: givenFaceValues(k, { material: (i + j) % 3 - 1 }) });
  return k;
}
const CASES: Record<string, () => MeshKernel> = {
  box: () => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); return k; },
  torus12: () => torus(12),
  openGrid: () => {
    const k = new MeshKernel(), n = 4, v = (i: number, j: number): number => i * (n + 1) + j;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) k.addVertex(P(i, j, 0.1 * Math.sin(i + 2 * j)));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) k.addFace([v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)], FRESH);
    return k;
  },
  sharpMatNgons: () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1), 2);
    for (const e of k.edges().slice(0, 3)) setEdgeMark(k, e, SHARP_EDGE, true);
    const pent = addPolygon(k, [0, 1, 2, 3, 4].map((i) => P(3 + Math.cos((2 * Math.PI * i) / 5), Math.sin((2 * Math.PI * i) / 5), 0)), 1);
    extrudeFaces(k, [pent.face]);
    const tri = addPolygon(k, [P(6, 0, 0), P(7, 0, 0), P(6.5, 1, 0)], 0);
    extrudeFaces(k, [tri.face]);
    return k;
  },
  nonManifoldFin: () => {
    const k = new MeshKernel(), a = k.addVertex(P(0, 0, 0)), b = k.addVertex(P(0, 0, 1));
    for (const [x, y] of [[1, 0], [-1, 0.2], [0.1, 1]]) { const c = k.addVertex(P(x, y, 1)), d = k.addVertex(P(x, y, 0)); k.addFace([a, b, c, d], FRESH); }
    return k;
  },
  withColumn: () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 2, 3)); k.addColumn({ id: "uv", on: "corner", type: { floats: 2 }, continuous: true, fill: 0, merge: "first", kind: "test" });
    for (const f of k.faces()) k.setCornerValues(f, "uv", k.facePts(f).flatMap((p) => [p.x * 0.3 + p.z * 0.7 + f, p.y * 0.5 - p.x]));
    return k;
  },
  twice: () => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); catmullClark(k); return k; },
  idGaps: () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); const b = addBox(k, P(3, 0, 0), P(4, 1, 1));
    deleteFaces(k, b.faces); addBox(k, P(0, 3, 0), P(1, 4, 2));
    return k;
  },
};

const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const bits = (x: number): string => { f64[0] = x; return `${u32[0].toString(16)}.${u32[1].toString(16)}`; };
function dump(k: MeshKernel): string {
  const o: string[] = [];
  for (const v of k.verts()) { const p = k.pt(v); o.push(`v${v}:${bits(p.x)},${bits(p.y)},${bits(p.z)}`); }
  for (const e of k.edges()) o.push(`e${e}:${k.edgeA[e]}-${k.edgeB[e]}/${packEdgeByte(k, e)}`);   // 3c 起标记是列：打包回那个字节（哈希和以前一样比）
  for (const f of k.faces()) o.push(`f${f}:${k.faceVerts(f).join(",")}/m${faceMaterial(k, f)}/x${faceHidden(k, f) ? 1 : 0}`);
  // 3b：材质 / 隐藏是面上的列了，上面 /m /x 已经记着；这里照旧只记角上的数
  for (const c of k.columnDefs().filter((d) => d.on === "corner")) for (const f of k.faces()) { const vals = k.cornerValues(f, c.id); o.push(`c${c.id}.${f}:${vals ? [...vals].map(bits).join(",") : "-"}`); }
  // 接下来分到的编号（空闲编号表的状态）
  const nv = [P(9, 9, 9), P(10, 9, 9), P(9, 10, 9)].map((p) => k.addVertex(p)), nf = k.addFace(nv, FRESH);
  o.push(`next v ${nv.join(",")} f ${nf} e ${k.fEdges(nf).join(",")}`);
  return o.join("\n");
}
const run = (name: string): { hash: string; faces: number } => { const k = CASES[name](); catmullClark(k); const faces = k.faceCount(); return { hash: createHash("sha256").update(dump(k)).digest("hex").slice(0, 32), faces }; };

/** 改之前（main bbb3f6f，2026-11-10）算出来的。 */
const GOLDEN: Record<string, string> = {
  box: "d2efad6e2dd080b84e9572138b795634",
  torus12: "7f2eba22ba0dee1f0ee76f67cbfb02a5",
  openGrid: "aaa2b22339b64c2d52f1e52e1a9fb7e1",
  sharpMatNgons: "3bb22528b9a7c160538e80777844c728",
  nonManifoldFin: "ac208e5104aad0608772ea91b740f6f3",
  withColumn: "821f095e73369427461b4f18382407f0",
  twice: "0d36b6d15d2d2351715ff4626da9bc23",
  idGaps: "812cd19202fc81eb665fd3a7cb663d1a",
};

describe("细分：结果和改之前逐位相同（W-10 的样本）", () => {
  if (env.FREEZE_SUBDIV) { const out: Record<string, string> = {}; for (const n of Object.keys(CASES)) out[n] = run(n).hash; console.log(JSON.stringify(out, null, 1)); }
  for (const name of Object.keys(CASES)) it(`${name}：点 / 边 / 面 / 列按原始编号逐位相同，接下来分到的编号也一样`, () => {
    const r = run(name);
    assert(r.faces > 0, "细分出了面");
    eq(r.hash, GOLDEN[name], `${name}（${r.faces} 面）`);
  });
});

describe("细分：不随面数平方涨", () => {
  it("细分一次（环面 256 面）只重建几次邻接表，不是每删一张面重建一次", () => {
    const k = torus(16), before = k.adjacencyBuilds;
    catmullClark(k);
    const n = k.adjacencyBuilds - before;
    assert(n <= 4, `重建了 ${n} 次`);
    eq(k.check().length, 0);
  });
});

describe("一批删（removeFaces / removeVertices）和逐个删结果一样", () => {
  it("6 种网格体 × 随机挑一批面：一批删 vs 逐张 removeFace，点 / 边 / 面 / 列和之后分到的编号逐位相同；再删孤点也一样", () => {
    let s = 7;
    const r = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (const name of ["box", "torus12", "openGrid", "sharpMatNgons", "nonManifoldFin", "withColumn"]) for (let trial = 0; trial < 4; trial++) {
      const a = CASES[name](), b = a.clone(), pick = a.faces().filter(() => r() < 0.4);
      a.removeFaces(pick); for (const f of pick) b.removeFace(f);
      const va = a.verts().filter((v) => !a.vEdges(v).length);
      a.removeVertices(va); for (const v of b.verts()) if (!b.vEdges(v).length) b.removeVertex(v);
      eq(dump(a), dump(b), `${name} 第 ${trial} 次（删 ${pick.length} 张）`);
      eq(a.check().length, 0);
    }
  });
  it("一批删点里有还连着边的点 → 抛（和 removeVertex 一样）", () => {
    const k = CASES.box();
    let threw = false;
    try { k.removeVertices([k.verts()[0]]); } catch (e) { threw = /still has edges/.test(String(e)); }
    assert(threw, "应该抛");
  });
});
