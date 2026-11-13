// mesh/corner-columns.ts —— 角上的一列数 + 面的旧样子 + 面的来历（五种）。created 2026-11-10 by Claude Opus 5.5
// 贴图主线 1-2（施工单 ai-docs/20261110-paint-workorders-3.md；Fable 11-10 夜的三条裁定记在那一页施工记录里）。
//
// · 一列 = 一个 GUID + 每个角几个数（arity；贴图坐标 = 2）+ 一个和 loopVert 平行的 Float32Array（data[角的槽 × arity + 分量]）。
//   「这个角在这一列上没有值」= NaN。规矩（MeshKernel.check）：一张面在一列上，要么每个角都有值，要么每个角都没有。
// · 面的旧样子（FaceShape）：改一张面之前先记下它现在的样子（环、环上各点当时的位置、每一列在各角上的值、材质）。内核一列都没有时只记材质。
// · 五种来历（FaceOrigin）：新面 / 新环的角上的数从哪来。**给角上的数做插值的代码全仓只有这里一份**（守卫 test/corner-columns.test.ts）：
//     piece  是它的一块：新角正好是原来的角 → 原值；不是 → 在原来那张面「显示时用的那套三角形」（format/triangulate.ts triangulateFace，用旧位置算）上
//            找离这个点最近的点、按三角形里的位置插值。可以带一张取样处的表 from（Fable 裁定）：第 i 个角写「原来第 j 个角」= 照抄（逐位相同），
//            写一个位置 = 在那套三角形上取那个位置；空着 = 上面的默认规矩（点现在的位置）。
//     copy   是它的一份：新环第 i 个角 = 原来第 corners[i] 个角，照抄。
//     grown  新长出来的（材质照旁边那张面，调用方传）：每一列都没有值。
//     joined 几张面并成的：每个角去找原来哪几张面有这个点；只有一张有 → 用它的；几张都有 → 值都一样才算数；这一列上只要有一个角对不上或没有值，
//            整张面在这一列上都没有值。原来有值、并完没了 = 「丢了」，内核记数（MeshKernel.takeDroppedFaces），不许悄悄丢。
//     不管哪种来历，写完一列之后半张有值、半张没有 → 整张清成没值、也算「丢了」：内核里永远没有半张有值的面（Fable 审 1-2 时加的）。
//     piece 的取样处表里写的角号不在旧环里 = 调用的地方写错了 → 抛，不悄悄退回默认规矩。
//     fresh  凭空来的：每一列都没有值；或者调用方直接给值（装载、整张面原样搬到另一个内核）——只许出现在白名单里的文件（守卫）。
import type { Pt3 } from "../kernel/geom.ts";
import { triangulateFace } from "../format/triangulate.ts";

/** 一列（内核里的）：data 和 loopVert 平行，长度 ≥ 角的槽数 × arity。 */
export interface CornerColumn { readonly guid: string; readonly arity: number; readonly kind: string; readonly extra?: unknown; data: Float32Array }
/** 一列的样子（搬到别的内核时按它补列）。 */
/** kind = 这一列是什么：「uv」= 贴图坐标（arity 2；GUID = 场景排法表里那一行的号；单位 = 格，值一律是 1/UV_Q 格的整数倍）；别的种类原样带着走（施工单十八 3.2）。 */
export interface ColumnDef { readonly guid: string; readonly arity: number; readonly kind: string; /** 文件里这一列不认识的键（不透明，内核不看；读写文件的门口原样带回）。 */ readonly extra?: unknown }
/** 贴图坐标的量化：1/UV_Q 格（施工单十八第四节：凡是产出贴图坐标的地方，最后一步量化到它；存成整数再读回来逐位相同）。
 *  和归属表取样点的量化（texel-table.ts SAMPLE_Q）是同一个数：两边都从这里来。 */
export const UV_Q = 1024;
/** 一个贴图坐标量化到 1/UV_Q 格（四舍五入；不往整格上凑）。 */
export const quantizeUv = (x: number): number => Math.round(x * UV_Q) / UV_Q;

/** 面的旧样子。没有列的内核：ring / pts / vals 都是 null（只记材质，几乎不花时间）。 */
export interface FaceShape {
  readonly mat: number;
  readonly ring: readonly number[] | null;
  /** 环上各点当时的位置（x y z × 角）。 */
  readonly pts: Float64Array | null;
  /** 每一列在各角上的值（GUID → 角数 × arity）；这张面在这一列上没有值 = 不在表里。 */
  readonly vals: ReadonlyMap<string, Float32Array> | null;
  /** 显示时用的那套三角形（懒算、记在这里，一张旧面只算一次）。 */
  tris?: [number, number, number][];
}

/** 取样处：原来第几个角（照抄）/ 一个位置（在旧样子的三角形上插值）/ 空着（默认规矩）。 */
export type SampleAt = number | Pt3 | undefined;
export type FaceOrigin =
  | { readonly kind: "piece"; readonly of: FaceShape; readonly from?: readonly SampleAt[] }
  | { readonly kind: "copy"; readonly of: FaceShape; readonly corners: readonly number[] }
  | { readonly kind: "grown" }
  | { readonly kind: "joined"; readonly of: readonly FaceShape[] }
  | { readonly kind: "fresh"; readonly values?: ReadonlyMap<string, Float32Array> };
export const GROWN: FaceOrigin = Object.freeze({ kind: "grown" });
export const FRESH: FaceOrigin = Object.freeze({ kind: "fresh" });

/** 内核那边给这一段代码看的窄接口（不让这里认识整个内核）。 */
export interface CornerHost {
  readonly columns: readonly CornerColumn[];
  pt(v: number): Pt3;
}

/**
 * 算一个新环的角上的数，写进每一列的 data[slot × arity …]（slot = 这个环在 loopVert 里的起点）。返回「这一步里丢了值」吗（joined 才可能）。
 * 调用方（MeshKernel.addFace / setFaceRing）保证列的数组已经长到能装下这个环。
 */
export function writeCorners(h: CornerHost, origin: FaceOrigin, ring: readonly number[], slot: number): boolean {
  let dropped = false;
  if (origin.kind === "piece" && origin.from && origin.of.ring) {
    const m = origin.of.ring.length;
    origin.from.forEach((at, i) => { if (typeof at === "number" && !(Number.isInteger(at) && at >= 0 && at < m)) throw new Error(`writeCorners: piece.from[${i}] = ${at} is not a corner of the old ring (length ${m})`); });
  }
  for (const col of h.columns) {
    const A = col.arity, out = col.data, base = slot * A, n = ring.length;
    const none = (): void => { out.fill(NaN, base, base + n * A); };
    switch (origin.kind) {
      case "grown": none(); break;
      case "fresh": {
        const v = origin.values?.get(col.guid);
        if (v && v.length >= n * A) out.set(v.subarray(0, n * A), base); else none();
        break;
      }
      case "copy": {
        const v = origin.of.vals?.get(col.guid);
        if (!v) { none(); break; }
        for (let i = 0; i < n; i++) { const j = origin.corners[i]; for (let c = 0; c < A; c++) out[base + i * A + c] = j >= 0 && j * A + c < v.length ? v[j * A + c] : NaN; }
        break;
      }
      case "piece": {
        const of = origin.of, v = of.vals?.get(col.guid);
        if (!v || !of.ring || !of.pts) { none(); break; }
        for (let i = 0; i < n; i++) {
          const at = origin.from?.[i];
          const j = typeof at === "number" ? at : at === undefined ? of.ring.indexOf(ring[i]) : -1;
          if (j >= 0) { for (let c = 0; c < A; c++) out[base + i * A + c] = v[j * A + c]; continue; }
          sampleAt(of, v, A, typeof at === "object" ? at : h.pt(ring[i]), out, base + i * A, col.kind === "uv");
        }
        break;
      }
      case "joined": {
        const parts = origin.of, had = parts.some((p) => p.vals?.has(col.guid));
        let ok = had;
        for (let i = 0; ok && i < n; i++) {
          let got: Float32Array | null = null, at = -1;
          for (const p of parts) {
            const j = p.ring ? p.ring.indexOf(ring[i]) : -1;
            if (j < 0) continue;
            const pv = p.vals?.get(col.guid);
            if (!pv) { ok = false; break; }   // 有这个点的那张面在这一列上没有值 → 整张没有
            if (got === null) { got = pv; at = j; continue; }
            for (let c = 0; c < A; c++) if (!Object.is(pv[j * A + c], got[at * A + c])) { ok = false; break; }   // 两张都有：值一样才算数（逐位比）
            if (!ok) break;
          }
          if (!ok) break;
          if (got === null) { ok = false; break; }   // 哪张旧面都没有这个点
          for (let c = 0; c < A; c++) out[base + i * A + c] = got[at * A + c];
        }
        if (!ok) { none(); if (had) dropped = true; }
        break;
      }
    }
    // 规矩按构造成立：这一列上有的角有值、有的没有（copy 的对应表里有 −1 / 越界的角号；piece 取样时旧面切不出三角形）→ 整张清成没值，算「丢了」。
    let nan = 0;
    for (let i = base, e = base + n * A; i < e; i++) if (Number.isNaN(out[i])) nan++;
    if (nan !== 0 && nan !== n * A) { none(); dropped = true; }
  }
  return dropped;
}

/** 在旧样子显示时用的那套三角形上找离 p 最近的点，按那个三角形里的位置插值，写进 out[o …]。全仓唯一一处插值（守卫）。uv = 贴图坐标那一种列：插出来的值量化到 1/UV_Q 格（施工单十八第四节）。 */
function sampleAt(of: FaceShape, v: Float32Array, A: number, p: Pt3, out: Float32Array, o: number, uv: boolean): void {
  const P = of.pts!, n = P.length / 3;
  const tris = (of.tris ??= triangulateFace(Array.from({ length: n }, (_, i) => ({ x: P[3 * i], y: P[3 * i + 1], z: P[3 * i + 2] }))));
  let best = Infinity, bt = -1, bu = 0, bv = 0, bw = 0;
  for (let t = 0; t < tris.length; t++) {
    const [a, b, c] = tris[t];
    const r = closestOnTriangle(p, P, a, b, c);
    if (r.d2 < best) { best = r.d2; bt = t; bu = r.u; bv = r.v; bw = r.w; }
  }
  if (bt < 0) { for (let c = 0; c < A; c++) out[o + c] = NaN; return; }
  const [a, b, c] = tris[bt];
  for (let k = 0; k < A; k++) { const x = bu * v[a * A + k] + bv * v[b * A + k] + bw * v[c * A + k]; out[o + k] = uv ? quantizeUv(x) : x; }
}

/** 点到三角形 (a, b, c) 的最近点：重心坐标 (u, v, w)（和 = 1、都 ≥ 0）+ 距离平方。Ericson《Real-Time Collision Detection》5.1.5。 */
function closestOnTriangle(p: Pt3, P: Float64Array, ia: number, ib: number, ic: number): { u: number; v: number; w: number; d2: number } {
  const ax = P[3 * ia], ay = P[3 * ia + 1], az = P[3 * ia + 2], bx = P[3 * ib], by = P[3 * ib + 1], bz = P[3 * ib + 2], cx = P[3 * ic], cy = P[3 * ic + 1], cz = P[3 * ic + 2];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = p.x - ax, apy = p.y - ay, apz = p.z - az;
  const at = (u: number, v: number, w: number): { u: number; v: number; w: number; d2: number } => {
    const qx = u * ax + v * bx + w * cx - p.x, qy = u * ay + v * by + w * cy - p.y, qz = u * az + v * bz + w * cz - p.z;
    return { u, v, w, d2: qx * qx + qy * qy + qz * qz };
  };
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return at(1, 0, 0);
  const bpx = p.x - bx, bpy = p.y - by, bpz = p.z - bz, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return at(0, 1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return at(1 - t, t, 0); }
  const cpx = p.x - cx, cpy = p.y - cy, cpz = p.z - cz, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return at(0, 0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return at(1 - t, 0, t); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return at(0, 1 - t, t); }
  const den = 1 / (va + vb + vc), sv = vb * den, sw = vc * den;
  return at(1 - sv - sw, sv, sw);
}
