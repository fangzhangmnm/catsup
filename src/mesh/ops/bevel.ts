// mesh/ops/bevel.ts —— 倒角：倒边（Blender Ctrl+B）/ 倒点（Ctrl+Shift+B）。created 2026-10-28 by Claude Opus 5.5
// user 10-28「bevel为什么不做？这个没什么歧义吧。」（纪元账本 FM152）。不挪别的点：只在被倒的边 / 点周围长新几何，重放确定（同一份内核 + 同一组参数 → 同一批 id）。
//
// 倒边的做法（每个被倒的边的端点 v 各自算，只用原来的位置）：
//   · 绕 v 一圈排好「角」（面 f 在 v 处，环里 x→v→y：ea = (x,v)、eb = (v,y)；下一张面 = 跨过 eb 的那张）。不是封闭扇（边界 / 非流形 / 绕向不一致）的点 = 它上面的边不倒、报出来。
//   · 每个角换成新点：两边都倒 = 面里离两条边都是 w 的那一点（角平分线上）；一边倒 = 沿另一条（不倒的）边滑到离倒的那条 w 的地方；
//     两边都不倒 = 两条边各自的滑点（没被要求滑的边 = v 自己，v 留着）。同一条不倒的边两侧都要滑 = 取平均，两侧共用一个点。
//   · 每条倒的边长一条倒角带（段数 s = s 条，横截面 = 以 v 为控制点的有理二次贝塞尔，90° 时是正圆弧）；端点处的截面点按 (v, 两个端点) 共用。
//   · v 周围剩下的洞：两条以上的倒边 = 补一张面（三条倒边的角 = 三角补片）；只有一条倒边 = 洞是空的（度 3：截面点进那张端面）或并进倒角带（度 ≥ 4、1 段）。
//   · 宽度太宽会穿过别的边：按每个滑点 / 交点最多走到所在边的 49% 夹住，夹了就报（clamped）。
// 手标：不倒的边被换成新边时带上原来的标记；段数 > 1 时倒角带中间那几条纵向边标平滑（圆角看起来是圆的）。
import { MeshKernel, F_SHARP, F_SMOOTH, F_SOFT, F_WIRE } from "../mesh-kernel.ts";
import type { Pt3 } from "../../kernel/kernel.ts";
import { add3, cross3, dot3, len3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";

export interface BevelResult {
  /** 新长出来的面（倒角带 + 角上的补片），按创建顺序。 */
  faces: number[];
  /** 实际用的宽度（被夹过 = 比要的小）。 */
  width: number;
  clamped: boolean;
  /** 没倒的边 / 点（不是恰好两张面、端点不是封闭扇……）。 */
  skipped: number;
}

const MARKS = F_SHARP | F_SMOOTH | F_SOFT;
/** 一个点在一张面里的角：环里 x→v→y，ea = (x, v)、eb = (v, y)。 */
interface Corner { f: number; ea: number; eb: number; }

/** v 周围按环绕顺序排好的角（下一张面 = 跨过 eb 的那张）；边界 / 非流形 / 绕向不一致 / 蝴蝶结点 = null。 */
function fanOf(k: MeshKernel, v: number): Corner[] | null {
  const es = [...k.vEdges(v)];
  if (!es.length) return null;
  for (const e of es) { const fs = k.eFaces(e); if (fs.length !== 2 || fs[0] === fs[1]) return null; }
  const cornerIn = (f: number): Corner | null => {
    const r = k.faceVerts(f), i = r.indexOf(v);
    if (i < 0) return null;
    return { f, ea: k.edgeOf(r[(i - 1 + r.length) % r.length], v), eb: k.edgeOf(v, r[(i + 1) % r.length]) };
  };
  const f0 = Math.min(...k.eFaces(es[0]));
  const out: Corner[] = [], seen = new Set<number>();
  let c = cornerIn(f0);
  while (c && !seen.has(c.f)) {
    seen.add(c.f); out.push(c);
    const fs = k.eFaces(c.eb), nf = fs[0] === c.f ? fs[1] : fs[0], n = cornerIn(nf);
    if (!n || n.ea !== c.eb) return null;   // 两张面在这条边上走同一个方向 = 绕向不一致
    c = n;
  }
  return c && c.f === f0 && out.length === es.length ? out : null;
}

/** 有理二次贝塞尔：A → B，控制点 C；权重 = sin(∠ACB / 2)（直角 → 正圆弧；A、C、B 共线 → 直线）。 */
function profilePoint(A: Pt3, C: Pt3, B: Pt3, t: number): Pt3 {
  const ca = sub3(A, C), cb = sub3(B, C), la = len3(ca), lb = len3(cb);
  let w = 0;
  if (la > 1e-12 && lb > 1e-12) { const cos = Math.max(-1, Math.min(1, dot3(ca, cb) / (la * lb))); w = Math.sin(Math.acos(cos) / 2); }
  const a = (1 - t) * (1 - t), b = 2 * w * t * (1 - t), c = t * t, d = a + b + c;
  return scale3(add3(add3(scale3(A, a), scale3(C, b)), scale3(B, c)), 1 / d);
}

/** 把环里首尾相接的重复点去掉（环）。 */
function dedupeRing(r: number[]): number[] {
  const out: number[] = [];
  for (const x of r) if (out[out.length - 1] !== x) out.push(x);
  while (out.length > 1 && out[0] === out[out.length - 1]) out.pop();
  return out;
}
/** 洞的边界：去掉连续重复和「来回」的尖刺（a b a → a），剩下不到 3 个 = 没有洞。 */
function reduceCycle(c0: number[]): number[] {
  let c = dedupeRing(c0);
  for (let changed = true; changed && c.length >= 3;) {
    changed = false;
    for (let i = 0; i < c.length; i++) {
      const n = c.length;
      if (c[(i - 1 + n) % n] === c[(i + 1) % n]) {
        const a = i, b = (i + 1) % n;
        if (a > b) { c.splice(a, 1); c.splice(b, 1); } else { c.splice(b, 1); c.splice(a, 1); }
        c = dedupeRing(c); changed = true; break;
      }
    }
  }
  return c.length >= 3 ? c : [];
}

/** 某张面的环里有没有 p → q 这一步。 */
function hasDirected(k: MeshKernel, p: number, q: number): boolean {
  const e = k.edgeOf(p, q);
  if (e < 0) return false;
  for (const f of k.eFaces(e)) { const r = k.faceVerts(f), i = r.indexOf(p); if (i >= 0 && r[(i + 1) % r.length] === q) return true; }
  return false;
}
/** 补片的环要和周围的面反着走：第一条已经有面同向走过的边 → 整个反过来。 */
function orientPatch(k: MeshKernel, ring: number[]): number[] {
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length];
    if (hasDirected(k, p, q)) return [...ring].reverse();
    if (hasDirected(k, q, p)) return ring;
  }
  return ring;
}

/**
 * 倒边。edges 里不是恰好两张面的、端点不是封闭扇的跳过（skipped）。width = 本地长度；segments = 倒角带分几条（1 = 一刀切平，≥ 2 = 圆角）。
 */
export function bevelEdges(k: MeshKernel, edges: readonly number[], width: number, segments = 1): BevelResult {
  const s = Math.max(1, Math.min(64, Math.round(segments)));
  const asked = [...new Set(edges)];
  const B = new Set(asked.filter((e) => { if (!k.hasE(e)) return false; const fs = k.eFaces(e); return fs.length === 2 && fs[0] !== fs[1]; }));
  // 端点的扇；不是封闭扇的点上的倒边全部不倒
  const fans = new Map<number, Corner[]>(), bad = new Set<number>();
  for (let again = true; again;) {
    again = false;
    for (const e of [...B].sort((a, b) => a - b)) for (const v of [k.edgeA[e], k.edgeB[e]]) {
      if (fans.has(v) || bad.has(v)) continue;
      const fan = fanOf(k, v);
      if (fan) fans.set(v, fan); else { bad.add(v); for (const e2 of k.vEdges(v)) if (B.delete(e2)) again = true; }
    }
  }
  for (const v of [...fans.keys()]) if (![...k.vEdges(v)].some((e) => B.has(e))) fans.delete(v);
  const skipped = asked.length - B.size;
  if (!B.size || !(width > 0)) return { faces: [], width: 0, clamped: false, skipped };

  const P = (v: number): Pt3 => k.pt(v);
  const other = (e: number, v: number): number => (k.edgeA[e] === v ? k.edgeB[e] : k.edgeA[e]);
  const dirOf = (v: number, e: number): Pt3 => normalize3(sub3(P(other(e, v)), P(v)));
  const lenOf = (e: number): number => len3(sub3(P(k.edgeA[e]), P(k.edgeB[e])));
  const isB = (e: number): boolean => B.has(e);

  // ---- 每个滑点要走多远（× 宽度）、每个交点的方向和距离（× 宽度）；同时收「最宽能到多少」 ----
  let limit = width;
  const cap = (allowed: number, factor: number): void => { if (factor > 1e-9) limit = Math.min(limit, allowed / factor); };
  const slideF = new Map<string, number[]>();                 // "v|E"（E 不倒）→ 各侧要求的 1/sin
  const meet = new Map<string, { dir: Pt3; f: number }>();     // "v|face"（两边都倒）→ 方向 + 距离系数
  for (const [v, fan] of fans) for (const c of fan) {
    const ua = dirOf(v, c.ea), ub = dirOf(v, c.eb), ba = isB(c.ea), bb = isB(c.eb);
    if (ba && bb) {
      const n = k.faceNormal(c.f), inward = normalize3(cross3(n, scale3(ua, -1)));
      let bis = add3(ua, ub);
      bis = len3(bis) < 1e-9 ? inward : normalize3(bis);
      if (dot3(bis, inward) < 0) bis = scale3(bis, -1);       // 凹角：往面里那一侧
      const half = Math.acos(Math.max(-1, Math.min(1, dot3(ua, ub)))) / 2, sh = Math.max(Math.sin(half), 1e-6);
      meet.set(`${v}|${c.f}`, { dir: bis, f: 1 / sh });
      cap(0.49 * Math.min(lenOf(c.ea), lenOf(c.eb)), Math.abs(Math.cos(half)) / sh);
    } else if (ba !== bb) {
      const eB = ba ? c.ea : c.eb, eN = ba ? c.eb : c.ea, uB = ba ? ua : ub, uN = ba ? ub : ua;
      const sn = len3(cross3(uB, uN));
      if (sn < 0.05) continue;                                 // 不倒的边几乎和倒的那条共线：滑不出 w，这一侧不要求滑（倒角带在这里收成一点）
      const key = `${v}|${eN}`;
      (slideF.get(key) ?? slideF.set(key, []).get(key)!).push(1 / sn);
      cap(0.49 * lenOf(eB), dot3(uB, uN) / sn);                // 滑点沿倒边方向的投影也不能过半
    }
  }
  const slideFactor = new Map<string, number>();
  for (const [key, fs] of slideF) {
    const f = fs.reduce((a, b) => a + b, 0) / fs.length, e = Number(key.split("|")[1]);
    slideFactor.set(key, f); cap(0.49 * lenOf(e), f);
  }
  const w = Math.max(0, limit), clamped = w < width - 1e-12;
  if (!(w > 1e-12)) return { faces: [], width: 0, clamped: true, skipped };

  // ---- 建新点（按 v 升序 → 角的顺序，确定性）----
  const slideV = new Map<string, number>(), meetV = new Map<string, number>();
  const vs = [...fans.keys()].sort((a, b) => a - b);
  for (const v of vs) for (const c of fans.get(v)!) {
    for (const e of [c.ea, c.eb]) {
      const key = `${v}|${e}`, f = slideFactor.get(key);
      if (f !== undefined && !slideV.has(key)) slideV.set(key, k.addVertex(add3(P(v), scale3(dirOf(v, e), w * f))));
    }
    const m = meet.get(`${v}|${c.f}`);
    if (m && !meetV.has(`${v}|${c.f}`)) meetV.set(`${v}|${c.f}`, k.addVertex(add3(P(v), scale3(m.dir, w * m.f))));
  }
  const sv = (v: number, e: number): number => slideV.get(`${v}|${e}`) ?? v;
  const C0 = new Map<number, Pt3>(); for (const v of vs) C0.set(v, P(v));
  const profiles = new Map<string, number[]>();
  /** v 处从 a 到 b 的截面点（含两端）；中间点按 (v, 两端) 共用。 */
  const profile = (v: number, a: number, b: number): number[] => {
    if (s === 1 || a === b) return a === b ? [a] : [a, b];
    const lo = Math.min(a, b), hi = Math.max(a, b), key = `${v}|${lo}|${hi}`;
    let mids = profiles.get(key);
    if (!mids) {
      mids = [];
      const A = k.pt(lo), Bp = k.pt(hi), C = C0.get(v)!;
      for (let j = 1; j < s; j++) mids.push(k.addVertex(profilePoint(A, C, Bp, j / s)));
      profiles.set(key, mids);
    }
    return [a, ...(a === lo ? mids : [...mids].reverse()), b];
  };
  const kAt = new Map<number, number>(); for (const v of vs) kAt.set(v, [...k.vEdges(v)].filter(isB).length);

  // ---- 每个角换成什么 ----
  const R = new Map<string, number[]>();
  for (const v of vs) {
    const fan = fans.get(v)!;
    for (const c of fan) {
      const ba = isB(c.ea), bb = isB(c.eb);
      let r: number[];
      if (ba && bb) r = [meetV.get(`${v}|${c.f}`)!];
      else if (ba) r = [sv(v, c.eb)];
      else if (bb) r = [sv(v, c.ea)];
      else if (kAt.get(v) === 1 && fan.length === 3) r = profile(v, sv(v, c.ea), sv(v, c.eb));   // 度 3 的倒边末端：圆角截面落在这张端面上
      else r = [sv(v, c.ea), sv(v, c.eb)];
      R.set(`${v}|${c.f}`, r.filter((x, i) => i === 0 || r[i - 1] !== x));
    }
  }
  const cornerR = (v: number, f: number): number[] => R.get(`${v}|${f}`)!;

  // ---- 记下不倒的边的标记（换成新边后搬过去），然后改面的环 ----
  const carry = new Map<number, { a: number; b: number; fl: number }>();
  const touchedFaces = new Set<number>(); for (const v of vs) for (const c of fans.get(v)!) touchedFaces.add(c.f);
  for (const v of vs) for (const e of k.vEdges(v)) if (!isB(e) && !carry.has(e)) carry.set(e, { a: k.edgeA[e], b: k.edgeB[e], fl: k.edgeFlags[e] });
  const newRings = new Map<number, number[]>();
  for (const f of [...touchedFaces].sort((a, b) => a - b)) {
    const ring = dedupeRing(k.faceVerts(f).flatMap((u) => (fans.has(u) ? cornerR(u, f) : [u])));
    if (ring.length < 3 || new Set(ring).size !== ring.length) throw new Error(`bevelEdges: face ${f} would become invalid`);
    newRings.set(f, ring);
  }
  // 倒角带的两侧（在改环之前按原拓扑找：f1 里 a → b）
  const strips: { e: number; a: number; b: number; f1: number; f2: number }[] = [];
  for (const e of [...B].sort((x, y) => x - y)) {
    const a = k.edgeA[e], b = k.edgeB[e], [fa, fb] = [...k.eFaces(e)], r = k.faceVerts(fa), i = r.indexOf(a);
    const f1 = r[(i + 1) % r.length] === b ? fa : fb;
    strips.push({ e, a, b, f1, f2: f1 === fa ? fb : fa });
  }
  for (const [f, ring] of newRings) k.setFaceRing(f, ring);

  // ---- 倒角带 ----
  const out: number[] = [], stripOf = new Map<number, number[]>();
  for (const { e, a, b, f1, f2 } of strips) {
    const ra1 = cornerR(a, f1), rb1 = cornerR(b, f1), rb2 = cornerR(b, f2), ra2 = cornerR(a, f2);
    const pa = profile(a, ra1[ra1.length - 1], ra2[0]), pb = profile(b, rb1[0], rb2[rb2.length - 1]);
    const n = Math.max(pa.length, pb.length) - 1, ids: number[] = [];
    for (let j = 0; j < n; j++) {
      const A0 = pa[Math.min(j, pa.length - 1)], A1 = pa[Math.min(j + 1, pa.length - 1)], B0 = pb[Math.min(j, pb.length - 1)], B1 = pb[Math.min(j + 1, pb.length - 1)];
      const ring = dedupeRing([B0, A0, A1, B1]);
      if (ring.length >= 3 && new Set(ring).size === ring.length) { const f = k.addFace(ring, k.faceMat[f1]); ids.push(f); out.push(f); }
    }
    stripOf.set(e, ids);
    if (s > 1) for (let j = 1; j < s && j < pa.length - 1 && j < pb.length - 1; j++) { const le = k.edgeOf(pa[j], pb[j]); if (le >= 0) k.setEdgeFlags(le, (k.edgeFlags[le] & ~MARKS) | F_SOFT | F_SMOOTH); }
  }

  // ---- 角上的洞 ----
  for (const v of vs) {
    const fan = fans.get(v)!, cyc: number[] = [];
    fan.forEach((c, i) => {
      const r = cornerR(v, c.f), next = fan[(i + 1) % fan.length];
      cyc.push(...r);
      if (isB(c.eb)) { const p = profile(v, r[r.length - 1], cornerR(v, next.f)[0]); cyc.push(...p.slice(1, -1)); }
    });
    const hole = reduceCycle(cyc);
    if (!hole.length) continue;
    if (new Set(hole).size !== hole.length) throw new Error(`bevelEdges: corner at vertex ${v} is too tangled to patch`);
    const ring = orientPatch(k, hole);
    const bEdges = fan.map((c) => c.ea).filter(isB);
    if (bEdges.length === 1 && s === 1) {   // 一条倒边的末端（度 ≥ 4）：洞并进那条倒角带
      const strip = stripOf.get(bEdges[0])?.[0];
      if (strip !== undefined && k.hasF(strip) && mergeInto(k, strip, ring)) continue;
    }
    const f = k.addFace(ring, k.faceMat[fan[0].f]); out.push(f);
  }

  // ---- 不倒的边的标记搬到换出来的新边；没边的老点删掉 ----
  for (const [e, { a, b, fl }] of carry) {
    const a2 = fans.has(a) ? sv(a, e) : a, b2 = fans.has(b) ? sv(b, e) : b;
    if (a2 === a && b2 === b) continue;   // 两头都没滑：还是原来那条边
    const ne = k.edgeOf(a2, b2);
    if (ne >= 0) k.setEdgeFlags(ne, (k.edgeFlags[ne] & F_WIRE) | (fl & ~F_WIRE));
  }
  for (const v of vs) if (k.hasV(v) && k.vEdges(v).length === 0) k.removeVertex(v);
  return { faces: out, width: w, clamped, skipped };
}

/** 倒点：选中的点各自在连着的每条边上往外 width 处切一刀，角换成一张补片。不是封闭扇的点跳过。 */
export function bevelVerts(k: MeshKernel, verts: readonly number[], width: number): BevelResult {
  const asked = [...new Set(verts)].filter((v) => k.hasV(v)).sort((a, b) => a - b);
  const fans = new Map<number, Corner[]>();
  for (const v of asked) { const f = fanOf(k, v); if (f) fans.set(v, f); }
  const skipped = [...new Set(verts)].length - fans.size;
  if (!fans.size || !(width > 0)) return { faces: [], width: 0, clamped: false, skipped };
  const other = (e: number, v: number): number => (k.edgeA[e] === v ? k.edgeB[e] : k.edgeA[e]);
  let w = width;
  for (const v of fans.keys()) for (const e of k.vEdges(v)) { const L = len3(sub3(k.pt(k.edgeA[e]), k.pt(k.edgeB[e]))); w = Math.min(w, (fans.has(other(e, v)) ? 0.49 : 0.98) * L); }
  const clamped = w < width - 1e-12;
  const vs = [...fans.keys()];
  const cut = new Map<string, number>();
  for (const v of vs) for (const c of fans.get(v)!) for (const e of [c.ea, c.eb]) {
    const key = `${v}|${e}`;
    if (!cut.has(key)) cut.set(key, k.addVertex(add3(k.pt(v), scale3(normalize3(sub3(k.pt(other(e, v)), k.pt(v))), w))));
  }
  const carry = new Map<number, { a: number; b: number; fl: number }>();
  for (const v of vs) for (const e of k.vEdges(v)) if (!carry.has(e)) carry.set(e, { a: k.edgeA[e], b: k.edgeB[e], fl: k.edgeFlags[e] });
  const touched = new Set<number>(); for (const v of vs) for (const c of fans.get(v)!) touched.add(c.f);
  const corner = (v: number, f: number): number[] => { const c = fans.get(v)!.find((x) => x.f === f)!; return [cut.get(`${v}|${c.ea}`)!, cut.get(`${v}|${c.eb}`)!]; };
  const rings = new Map<number, number[]>();
  for (const f of [...touched].sort((a, b) => a - b)) rings.set(f, dedupeRing(k.faceVerts(f).flatMap((u) => (fans.has(u) ? corner(u, f) : [u]))));
  for (const [f, r] of rings) k.setFaceRing(f, r);
  const out: number[] = [];
  for (const v of vs) {
    const fan = fans.get(v)!, cyc = dedupeRing(fan.flatMap((c) => corner(v, c.f)));
    if (cyc.length >= 3) out.push(k.addFace(orientPatch(k, cyc), k.faceMat[fan[0].f]));
  }
  // 标记：原来那条边 (a, b) 现在是 (a 那头的切点或 a, b 那头的切点或 b)
  for (const [e, { a, b, fl }] of carry) {
    const a2 = fans.has(a) ? cut.get(`${a}|${e}`)! : a, b2 = fans.has(b) ? cut.get(`${b}|${e}`)! : b, ne = k.edgeOf(a2, b2);
    if (ne >= 0) k.setEdgeFlags(ne, (k.edgeFlags[ne] & F_WIRE) | (fl & ~F_WIRE));
  }
  for (const v of vs) if (k.hasV(v) && k.vEdges(v).length === 0) k.removeVertex(v);
  return { faces: out, width: w, clamped, skipped };
}

/** 补片并进一条倒角带：倒角带走 q → p、补片走 p → q 的那条边去掉，两张拼成一张。找不到这样一条边 = false（照常另补一张）。 */
function mergeInto(k: MeshKernel, strip: number, ring: readonly number[]): boolean {
  const cr = k.faceVerts(strip), n = cr.length;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length], j = cr.indexOf(q);
    if (j < 0 || cr[(j + 1) % n] !== p) continue;
    const rot = [...ring.slice(i), ...ring.slice(0, i)];                      // p, q, r1 … rm
    const fromP = [...cr.slice((j + 1) % n), ...cr.slice(0, (j + 1) % n)];   // p … q（倒角带）
    const merged = [...fromP, ...rot.slice(2)];
    if (new Set(merged).size !== merged.length) return false;
    k.setFaceRing(strip, merged);
    return true;
  }
  return false;
}
