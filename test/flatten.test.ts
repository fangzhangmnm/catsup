// 压平的纯函数（mesh/ops/flatten.ts；白模第一批 W-5 补丁，created 2026-11-10 by Claude Opus 5.5）：
// 只沿一根轴缩放 scaleAlong、压平 flattenMoves（镜像面上正好是 0）、一圈点的朝向 bestFitNormal（对严格解：测试里用 Jacobi 自己算协方差矩阵最小特征值的方向）。
import { describe, it, eq, assert } from "./runner.mjs";
import { bestFitNormal, flattenMoves, scaleAlong } from "../src/mesh/ops/flatten.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const near = (a: number, b: number, tol = 1e-12): boolean => Math.abs(a - b) <= tol;
const unit = (v: Pt3): Pt3 => { const L = Math.hypot(v.x, v.y, v.z); return P(v.x / L, v.y / L, v.z / L); };

/** 严格解：协方差矩阵（中心化）做循环 Jacobi，取最小特征值的特征向量。 */
function jacobiNormal(pts: readonly Pt3[]): Pt3 {
  const n = pts.length, c = [0, 0, 0];
  for (const p of pts) { c[0] += p.x / n; c[1] += p.y / n; c[2] += p.z / n; }
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pts) { const d = [p.x - c[0], p.y - c[1], p.z - c[2]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) A[i][j] += d[i] * d[j]; }
  const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 100; sweep++) {
    const off = A[0][1] ** 2 + A[0][2] ** 2 + A[1][2] ** 2;
    if (off < 1e-60) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      if (A[p][q] === 0) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
      for (let k = 0; k < 3; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = cs * akp - sn * akq; A[k][q] = sn * akp + cs * akq; }
      for (let k = 0; k < 3; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = cs * apk - sn * aqk; A[q][k] = sn * apk + cs * aqk; }
      for (let k = 0; k < 3; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = cs * vkp - sn * vkq; V[k][q] = sn * vkp + cs * vkq; }
    }
  }
  const i = [0, 1, 2].reduce((m, k) => (A[k][k] < A[m][m] ? k : m), 0);
  return unit(P(V[0][i], V[1][i], V[2][i]));
}
const angleDeg = (a: Pt3, b: Pt3): number => Math.acos(Math.min(1, Math.abs(a.x * b.x + a.y * b.y + a.z * b.z))) * 180 / Math.PI;   // 正负不管
/** 一圈斜着的点：法向 nrm，半径 r1 / r2（椭圆），沿法向起伏 wob（点不在一个平面上），确定性的伪随机抖动。 */
function tiltedRing(nrm: Pt3, k: number, r1: number, r2: number, wob: number, center = P(0.3, -1.2, 2.5)): Pt3[] {
  const n = unit(nrm), t = unit(Math.abs(n.x) < 0.9 ? P(0, -n.z, n.y) : P(-n.z, 0, n.x)), b = P(n.y * t.z - n.z * t.y, n.z * t.x - n.x * t.z, n.x * t.y - n.y * t.x);
  let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 - 0.5; };
  const out: Pt3[] = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2, u = Math.cos(a) * r1, v = Math.sin(a) * r2, w = wob * (Math.sin(3 * a) + rnd());
    out.push(P(center.x + t.x * u + b.x * v + n.x * w, center.y + t.y * u + b.y * v + n.y * w, center.z + t.z * u + b.z * v + n.z * w));
  }
  return out;
}
/** 旧写法（v0.18.51：只取伴随阵行列式最大的那一行、不迭代）——只用来证明下面那个斜圈真能分出新旧。 */
function oldOneRow(pts: readonly Pt3[]): Pt3 {
  const n = pts.length; let cx = 0, cy = 0, cz = 0;
  for (const p of pts) { cx += p.x / n; cy += p.y / n; cz += p.z / n; }
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (const p of pts) { const x = p.x - cx, y = p.y - cy, z = p.z - cz; xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z; }
  const dx = yy * zz - yz * yz, dy = xx * zz - xz * xz, dz = xx * yy - xy * xy, big = Math.max(dx, dy, dz);
  return unit(big === dx ? P(dx, xz * yz - xy * zz, xy * yz - xz * yy) : big === dy ? P(xz * yz - xy * zz, dy, xy * xz - yz * xx) : P(xy * yz - xz * yy, xy * xz - yz * xx, dz));
}

describe("压平（mesh/ops/flatten.ts）", () => {
  it("scaleAlong：只动沿那根轴的分量——缩到 0 = 落在过 pivot 的面上、2 = 拉远一倍、−1 = 翻过来；垂直分量一点不动", () => {
    const p = P(1, 2, 3), o = P(0.5, 0, 0), X = P(1, 0, 0);
    const z0 = scaleAlong(p, o, X, 0), z2 = scaleAlong(p, o, X, 2), zm = scaleAlong(p, o, X, -1);
    assert(z0.x === 0.5 && z0.y === 2 && z0.z === 3, `f=0 → ${JSON.stringify(z0)}`);
    assert(z2.x === 1.5 && z2.y === 2 && z2.z === 3, `f=2 → ${JSON.stringify(z2)}`);
    assert(z0.x === 0.5 && zm.x === 0 && zm.y === 2 && zm.z === 3, `f=-1 → ${JSON.stringify(zm)}`);
    // 斜的轴：沿轴分量 × f、垂直分量不变
    const ax = unit(P(1, -2, 0.5)), q = P(-0.7, 1.9, 4.2), piv = P(0.1, 0.2, -0.3);
    for (const f of [0, 2, -1, 0.37]) {
      const r = scaleAlong(q, piv, ax, f), d0 = (q.x - piv.x) * ax.x + (q.y - piv.y) * ax.y + (q.z - piv.z) * ax.z, d1 = (r.x - piv.x) * ax.x + (r.y - piv.y) * ax.y + (r.z - piv.z) * ax.z;
      assert(near(d1, d0 * f, 1e-12), `f=${f}：沿轴 ${d1} ≠ ${d0 * f}`);
      const perp = (v: Pt3): Pt3 => { const d = (v.x - piv.x) * ax.x + (v.y - piv.y) * ax.y + (v.z - piv.z) * ax.z; return P(v.x - ax.x * d, v.y - ax.y * d, v.z - ax.z * d); };
      const a = perp(q), b = perp(r); assert(near(a.x, b.x, 1e-12) && near(a.y, b.y, 1e-12) && near(a.z, b.z, 1e-12), `f=${f}：垂直分量变了`);
    }
  });
  it("压到镜像面（过原点、法向 X）后 x 正好是 0，不是差一点点；本来就在面上的点不回", () => {
    const pts = new Map<number, Pt3>([[0, P(0.1, 1, 2)], [1, P(-1e-17, 3, 4)], [2, P(3.3000000000000003, -2, 0.7)], [3, P(0, 5, 5)], [4, P(-0.30000000000000004, 0.2, 0.1)]]);
    const mv = flattenMoves(pts, P(0, 0, 0), P(1, 0, 0));
    eq(mv.map((m) => m.v).join(","), "0,1,2,4");
    for (const m of mv) { assert(m.to.x === 0, `点 ${m.v}：x = ${m.to.x}`); eq(m.to.y, pts.get(m.v)!.y); eq(m.to.z, pts.get(m.v)!.z); }
    // 镜像面不过原点（pivot.x = 0.25）：压完也正好是 0.25
    for (const m of flattenMoves(pts, P(0.25, 9, 9), P(1, 0, 0))) assert(m.to.x === 0.25, `pivot 0.25：x = ${m.to.x}`);
  });
  it("定不出朝向的 = null：少于三个点、共线、全叠在一起", () => {
    eq(bestFitNormal([]), null); eq(bestFitNormal([P(0, 0, 0), P(1, 2, 3)]), null);
    eq(bestFitNormal([P(0, 0, 0), P(1, 1, 1), P(2, 2, 2)]), null);
    eq(bestFitNormal([P(1, 0, 0), P(2, 0, 0), P(3, 0, 0), P(-4, 0, 0), P(0.5, 0, 0)]), null);
    eq(bestFitNormal([P(1, 2, 3), P(1, 2, 3), P(1, 2, 3), P(1, 2, 3)]), null);
  });
  it("斜圈的朝向和严格解（Jacobi）相差 ≤ 0.01°——平的、椭圆的、起伏很大的都算", () => {
    const cases: [string, Pt3[]][] = [
      ["平的圆", tiltedRing(P(0.3, -0.5, 0.8), 24, 1, 1, 0)],
      ["平的椭圆", tiltedRing(P(-0.9, 0.2, 0.1), 16, 2, 0.6, 0)],
      ["轻微起伏", tiltedRing(P(0.1, 0.7, -0.4), 32, 1, 0.8, 0.02)],
      ["起伏很大（点明显不在一个平面上）", tiltedRing(P(0.6, 0.6, 0.5), 12, 1, 0.9, 0.35)],
      ["胳膊上那一圈（法向沿胳膊 = 斜的 X）", tiltedRing(P(1, 0.15, -0.1), 20, 0.4, 0.35, 0.05)],
    ];
    for (const [name, pts] of cases) {
      const got = bestFitNormal(pts); assert(got !== null, `${name}：定不出`);
      const d = angleDeg(got!, jacobiNormal(pts));
      assert(d <= 0.01, `${name}：差 ${d.toFixed(5)}°`);
    }
    // 起伏很大那一圈：旧写法（只取一行）确实偏出 0.01° 以外——这条测试分得出新旧
    const hard = cases[3][1];
    assert(angleDeg(oldOneRow(hard), jacobiNormal(hard)) > 0.01, `旧写法在这一圈上也对了（${angleDeg(oldOneRow(hard), jacobiNormal(hard)).toFixed(5)}°），换一个更难的例子`);
  });
});
