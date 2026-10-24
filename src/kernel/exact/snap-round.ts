// exact/snap-round.ts —— 迭代 snap rounding（Hobby 1999；Guibas–Marimont 1998；Halperin–Packer 2002 迭代版）：整数 2D 线段集 → 一致的 PSLG，
// 顶点全在像素代表点（格点）上，每条输入段变成穿过它所经过的 hot pixel 的折线；迭代到不再出现新 hot pixel = 任何顶点离非邻接边都 ≥ 半像素（分离性）。
// 一切判定走 exact/predicates.ts（精确），构造只有「落像素」一种。设计稿 ai-docs/20261024-exact-geometry-design.md §2–§3。created 2026-10-24 by Claude Fable 5.1
import type { IPt2 } from "./lattice.ts";
import { cellOf, intersectParam, intersectionCell, onSegment2d, orient2d, segSeg2d } from "./predicates.ts";

export interface ISeg { readonly a: IPt2; readonly b: IPt2; }
export interface SnapRoundResult {
  /** 输出顶点（像素代表点，格点整数）。 */
  vertices: IPt2[];
  /** 输出边（顶点下标对，a < b 规范化，无重复、无零长）。 */
  edges: [number, number][];
  /** 第 i 条输入段 → 它的折线（顶点下标序列，≥ 1 个；退化段 = 1 个）。 */
  chains: number[][];
  /** 迭代轮数（1 = 一轮就稳定）。 */
  rounds: number;
}

const key2 = (p: IPt2): string => `${p.x},${p.y}`;
/** 像素代表点：左下角 + ⌊P/2⌋（P 偶数就是中心；P 奇数偏半格，Hausdorff 界相应放宽）。 */
export const cellRep = (c: IPt2, P: number): IPt2 => ({ x: c.x * P + Math.floor(P / 2), y: c.y * P + Math.floor(P / 2) });

/** 线段是否「经过」闭像素（不只是碰一个角）：端点在像素里，或直线穿过像素内部且线段够到像素，或与像素某条边共线重叠。 */
export function segPassesCell(a: IPt2, b: IPt2, cell: IPt2, P: number): boolean {
  const x0 = cell.x * P, x1 = x0 + P, y0 = cell.y * P, y1 = y0 + P;
  const inside = (p: IPt2): boolean => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
  if (inside(a) || inside(b)) return true;
  if (Math.max(a.x, b.x) < x0 || Math.min(a.x, b.x) > x1 || Math.max(a.y, b.y) < y0 || Math.min(a.y, b.y) > y1) return false;
  const C = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  const o = C.map((c) => orient2d(a, b, c));
  const mn = Math.min(...o), mx = Math.max(...o);
  if (mn === 0 && mx === 0) return true;          // 退化：不会发生（a≠b 时四角不可能全共线），保守
  if (!(mn < 0 && mx > 0)) {
    // 直线不穿内部：只可能沿着某条像素边（两个零）或碰一个角（一个零）
    const zeros = o.filter((v) => v === 0).length;
    if (zeros < 2) return false;
    for (let i = 0; i < 4; i++) if (o[i] === 0 && o[(i + 1) % 4] === 0 && segSeg2d(a, b, C[i], C[(i + 1) % 4]) === "overlap") return true;
    return false;
  }
  // 直线穿内部：线段是否真的到达像素（与四条边之一相交 / 相触）
  for (let i = 0; i < 4; i++) if (segSeg2d(a, b, C[i], C[(i + 1) % 4]) !== "none") return true;
  return false;
}

/** 粗网格（空间哈希）：按边长 G 的格子索引线段包围盒。 */
class SegGrid {
  private cells = new Map<string, number[]>();
  private readonly segs: readonly ISeg[];
  private readonly G: number;
  constructor(segs: readonly ISeg[], G: number) {   // node strip-types 不认参数属性，显式赋值
    this.segs = segs; this.G = G;
    segs.forEach((s, i) => this.forCells(s.a, s.b, (k) => { const l = this.cells.get(k); if (l) l.push(i); else this.cells.set(k, [i]); }));
  }
  private forCells(a: IPt2, b: IPt2, fn: (k: string) => void): void {
    const x0 = Math.floor(Math.min(a.x, b.x) / this.G), x1 = Math.floor(Math.max(a.x, b.x) / this.G), y0 = Math.floor(Math.min(a.y, b.y) / this.G), y1 = Math.floor(Math.max(a.y, b.y) / this.G);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) fn(`${x},${y}`);
  }
  /** 与线段 i 可能相交的其它线段（下标 > i，去重）。 */
  near(i: number): number[] {
    const s = this.segs[i], out = new Set<number>();
    this.forCells(s.a, s.b, (k) => { for (const j of this.cells.get(k) ?? []) if (j > i) out.add(j); });
    return [...out];
  }
  /** 包围盒覆盖点 p 所在粗格的线段。 */
  at(p: IPt2, pad: number): number[] {
    const out = new Set<number>();
    this.forCells({ x: p.x - pad, y: p.y - pad }, { x: p.x + pad, y: p.y + pad }, (k) => { for (const j of this.cells.get(k) ?? []) out.add(j); });
    return [...out];
  }
}

/** 一轮：给定线段集与像素尺寸，产出 hot pixel 集 + 每段折线。 */
function roundOnce(segs: readonly ISeg[], P: number): { hot: Map<string, IPt2>; chains: IPt2[][] } {
  const hot = new Map<string, IPt2>();
  const addHot = (c: IPt2): void => { const k = key2(c); if (!hot.has(k)) hot.set(k, c); };
  for (const s of segs) { addHot(cellOf(s.a, P)); addHot(cellOf(s.b, P)); }
  // 粗格边长：按平均段长，至少 16 像素
  let total = 0; for (const s of segs) total += Math.abs(s.b.x - s.a.x) + Math.abs(s.b.y - s.a.y);
  const G = Math.max(16 * P, Math.ceil(total / Math.max(1, segs.length)));
  const grid = new SegGrid(segs, G);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.a.x === s.b.x && s.a.y === s.b.y) continue;
    for (const j of grid.near(i)) {
      const t = segs[j];
      if (t.a.x === t.b.x && t.a.y === t.b.y) continue;
      const rel = segSeg2d(s.a, s.b, t.a, t.b);
      if (rel === "proper") { const r = intersectParam(s.a, s.b, t.a, t.b)!; addHot(intersectionCell(s.a, s.b, r, P)); }
      // touch：触点是某条段的端点 → 它的像素已在 hot 里；overlap：重叠区端点也是端点
    }
  }
  // 每段穿过的 hot pixel（候选 = 段包围盒 ±P 内的 hot pixel），按沿段参数排序（像素代表点在段方向上的投影；同投影按另一轴稳定）
  const hotList = [...hot.values()];
  const hotGrid = new Map<string, IPt2[]>();
  const HG = Math.max(1, Math.ceil(G / P));   // hot pixel 的粗格（以像素为单位）
  for (const c of hotList) { const k = `${Math.floor(c.x / HG)},${Math.floor(c.y / HG)}`; const l = hotGrid.get(k); if (l) l.push(c); else hotGrid.set(k, [c]); }
  const chains: IPt2[][] = segs.map((s) => {
    const ca = cellOf(s.a, P), cb = cellOf(s.b, P);
    if (s.a.x === s.b.x && s.a.y === s.b.y) return [cellRep(ca, P)];
    const cx0 = Math.floor(Math.min(ca.x, cb.x) / HG), cx1 = Math.floor(Math.max(ca.x, cb.x) / HG), cy0 = Math.floor(Math.min(ca.y, cb.y) / HG), cy1 = Math.floor(Math.max(ca.y, cb.y) / HG);
    const passed: IPt2[] = [];
    for (let x = cx0; x <= cx1; x++) for (let y = cy0; y <= cy1; y++) for (const c of hotGrid.get(`${x},${y}`) ?? []) if (segPassesCell(s.a, s.b, c, P)) passed.push(c);
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
    const proj = (c: IPt2): number => (c.x * P - s.a.x) * dx + (c.y * P - s.a.y) * dy;   // 像素左下角沿段方向的投影（整数；单调性对走廊内的像素成立）
    passed.sort((u, v) => proj(u) - proj(v) || (u.x - v.x) * dx + (u.y - v.y) * dy || u.x - v.x || u.y - v.y);
    const out: IPt2[] = [];
    for (const c of passed) { const r = cellRep(c, P); if (!out.length || out[out.length - 1].x !== r.x || out[out.length - 1].y !== r.y) out.push(r); }
    return out;
  });
  return { hot, chains };
}

/**
 * 迭代 snap rounding：直到一轮下来 hot pixel 集不再变化（= 分离性成立）。maxRounds 守卫（Halperin–Packer 证明有限步收敛）。
 */
export function snapRound(input: readonly ISeg[], P: number, maxRounds = 16): SnapRoundResult {
  // 当前轮的段集（去重、去零长）+ 键 → 下标；输入段的链用顶点坐标表示，每轮按键查折线替换
  const segKey = (a: IPt2, b: IPt2): { k: string; fwd: boolean } => { const fwd = a.x < b.x || (a.x === b.x && a.y <= b.y); return { k: fwd ? `${key2(a)}|${key2(b)}` : `${key2(b)}|${key2(a)}`, fwd }; };
  let chainsOfInput: IPt2[][] = input.map((s) => (s.a.x === s.b.x && s.a.y === s.b.y ? [s.a] : [s.a, s.b]));
  const buildSegs = (): { segs: ISeg[]; index: Map<string, number> } => {
    const index = new Map<string, number>(); const segs: ISeg[] = [];
    for (const ch of chainsOfInput) {
      if (ch.length === 1) { const { k } = segKey(ch[0], ch[0]); if (!index.has(k)) { index.set(k, segs.length); segs.push({ a: ch[0], b: ch[0] }); } continue; }
      for (let i = 0; i + 1 < ch.length; i++) { const a = ch[i], b = ch[i + 1]; const { k, fwd } = segKey(a, b); if (!index.has(k)) { index.set(k, segs.length); segs.push(fwd ? { a, b } : { a: b, b: a }); } }
    }
    return { segs, index };
  };
  let rounds = 0;
  for (;;) {
    rounds++;
    const { segs, index } = buildSegs();
    const { chains } = roundOnce(segs, P);
    let changed = false;
    const next: IPt2[][] = chainsOfInput.map((ch) => {
      const pts: IPt2[] = [];
      const push = (p: IPt2): void => { if (!pts.length || pts[pts.length - 1].x !== p.x || pts[pts.length - 1].y !== p.y) pts.push(p); };
      if (ch.length === 1) { const poly = chains[index.get(segKey(ch[0], ch[0]).k)!]; for (const p of poly) push(p); }
      else for (let i = 0; i + 1 < ch.length; i++) {
        const { k, fwd } = segKey(ch[i], ch[i + 1]);
        const poly = chains[index.get(k)!];
        const seq = fwd ? poly : [...poly].reverse();
        for (const p of seq) push(p);
      }
      if (pts.length !== ch.length || pts.some((p, i) => p.x !== ch[i].x || p.y !== ch[i].y)) changed = true;
      return pts;
    });
    chainsOfInput = next;
    if (!changed || rounds >= maxRounds) break;
  }
  // 装配输出
  const vid = new Map<string, number>(); const vertices: IPt2[] = [];
  const id = (p: IPt2): number => { const k = key2(p); let i = vid.get(k); if (i === undefined) { i = vertices.length; vertices.push(p); vid.set(k, i); } return i; };
  const eset = new Set<string>(); const edges: [number, number][] = [];
  const chains = chainsOfInput.map((ch) => {
    const ids: number[] = [];
    for (const p of ch) { const i = id(p); if (!ids.length || ids[ids.length - 1] !== i) ids.push(i); }
    for (let i = 0; i + 1 < ids.length; i++) { const a = Math.min(ids[i], ids[i + 1]), b = Math.max(ids[i], ids[i + 1]); const k = `${a}-${b}`; if (!eset.has(k)) { eset.add(k); edges.push([a, b]); } }
    return ids;
  });
  return { vertices, edges, chains, rounds };
}

/** 校验（测试 / 调试）：PSLG 不变量——边两两不真交、不重叠、相触只在公共端点；顶点不骑在非邻接边内部。返回问题列表（空 = 好）。 */
export function pslgProblems(r: SnapRoundResult): string[] {
  const out: string[] = [], V = r.vertices;
  for (let i = 0; i < r.edges.length; i++) for (let j = i + 1; j < r.edges.length; j++) {
    const [a1, b1] = r.edges[i], [a2, b2] = r.edges[j];
    const shared = a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2;
    const rel = segSeg2d(V[a1], V[b1], V[a2], V[b2]);
    if (rel === "proper" || rel === "overlap") out.push(`edges ${i}/${j}: ${rel}`);
    else if (rel === "touch" && !shared) out.push(`edges ${i}/${j}: touch without shared vertex`);
  }
  for (let v = 0; v < V.length; v++) for (let e = 0; e < r.edges.length; e++) { const [a, b] = r.edges[e]; if (a === v || b === v) continue; if (onSegment2d(V[v], V[a], V[b])) out.push(`vertex ${v} rides edge ${e}`); }
  return out;
}
