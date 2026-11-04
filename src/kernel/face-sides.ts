// face-sides.ts —— 新面的两侧（单面 / 双面第四版，计划书 ai-docs/20261104-identity-foundation-plan.md §9.2-D + §9.2½ ③；user 11-04「试试邻面，然后初始面……意图可以进非常窄的」）。
// 规矩（全部机械，同一串 op 重放同一结果）：
//   ① 新面先跟邻面：沿「恰好两张面」的共享边看对面哪侧是默认背面，按「过边反向」推自己（kernel/flood.ts faceLeftSign，和按侧灌同一条判据）；多条邻边按边长投票，平票 = 没结论。
//      一批新面按轮推（同一轮一起定、下一轮才看得见），和遍历顺序无关。
//   ② 邻面给不出 → 看指令里带的方向 front（编辑器算好写进 op；内核只见方向，相机不进内核）：法向和它同号那侧 = 正面，另一侧写默认背面；正好侧视（点积 ≈ 0）= 不写。
//      有 seed（推拉的面）= 先按 front 定它，再从它灌，这样推出来的盒子朝向一致（各面单独看相机会一半朝里）。seed 那一侧已经涂了就不动，只拿它当灌的起点。
//   ③ 没有 front（老复现包）又没邻面 = 不写 = 两侧默认正面（今天的样子）。
// 内核不知道哪个槽号是默认背面：槽表归 Scene，这里由调用方（editor/ops.ts）传进来。
// created 2026-11-04 by Claude Opus 5.5
import type { FaceEvent } from "./face-lifecycle.ts";
import type { FaceId, Kernel, Pt3 } from "./kernel.ts";
import { faceLeftSign } from "./flood.ts";
import { dist3, dot3, normalize3 } from "./geom.ts";

type Side = 0 | 1;
/** 侧视判据：法向和方向的点积（都是单位向量）小于它 = 分不出哪侧朝这边（≈ 0.06°）。 */
const SIDE_ON = 1e-3;

/** 这张面哪一侧是默认背面（0 = +n、1 = −n）；两侧都不是或都是 = null（没有朝向信息）。 */
export function backSideOf(k: Pick<Kernel, "faceMaterialOf">, f: FaceId, back: number): Side | null {
  if (back < 0) return null;
  const a = k.faceMaterialOf(f, 0) === back, b = k.faceMaterialOf(f, 1) === back;
  return a === b ? null : a ? 0 : 1;
}

/** 这一批事件之后还活着的新面（BIRTH，含同一批里被再切开的）。 */
export function bornFaces(events: readonly FaceEvent[]): FaceId[] {
  const born = new Set<FaceId>();
  for (const ev of events) {
    if (ev.type === "BIRTH") born.add(ev.face);
    else if (ev.type === "DIVIDE") { if (born.delete(ev.from)) for (const c of ev.into) born.add(c); }
    else if (ev.type === "MERGE") { if (ev.from.every((f) => born.has(f))) { for (const f of ev.from) born.delete(f); born.add(ev.into); } else for (const f of ev.from) born.delete(f); }
    else if (ev.type === "ABSORB") { if (born.delete(ev.from)) born.add(ev.into); }
    else if (ev.type === "BURST" || ev.type === "FACE_ERASED") born.delete(ev.face);
  }
  return [...born].sort((a, b) => a - b);
}

export interface NewFaceSides {
  /** 现在的默认背面槽号（这个定义还没开过 = −1）。 */
  readonly back: number;
  /** 要写时才开槽（槽表归调用方）。 */
  openBack(): number;
  /** 指令里带的方向（池本地坐标）。 */
  readonly front?: Pt3;
  /** 先按 front 定朝向的面（推拉的那张面）。 */
  readonly seed?: FaceId;
}

/** 给这批新面定两侧。只碰两侧都没写的新面（载荷自带的层不动），也只写默认背面、永不写默认正面（默认正面 = 槽缺）。 */
export function settleNewFaceSides(k: Kernel, born: readonly FaceId[], o: NewFaceSides): void {
  const open = new Set<FaceId>(born.filter((f) => k.face(f) && k.faceMaterialOf(f, 0) === undefined && k.faceMaterialOf(f, 1) === undefined));
  if (!open.size) return;
  let back = o.back;
  const told = new Map<FaceId, Side>();   // seed 涂过时写不进去：只拿来灌
  const sideOf = (f: FaceId): Side | null => told.get(f) ?? backSideOf(k, f, back);
  const write = (f: FaceId, side: Side): void => { if (back < 0) back = o.openBack(); k.setFaceMaterial([f], back, [side]); };
  const ringEdges = (f: FaceId) => { const F = k.face(f)!; return [F.outer, ...F.holes].flatMap((r) => r.edges.map((d) => d.edge)); };
  const othersOf = (f: FaceId, e: number): FaceId[] => [...new Set(k.graph.edge(e).faceLinks)].filter((g) => g !== f && k.face(g));
  /** 从邻面投票：一轮一起定（谁先谁后不影响结果），下一轮只看这一轮定下来的面的邻居。 */
  const flood = (start: Iterable<FaceId>): void => {
    let cands = [...new Set(start)].filter((f) => open.has(f)).sort((a, b) => a - b);
    while (cands.length) {
      const decided: [FaceId, Side][] = [];
      for (const f of cands) {
        const votes = [0, 0];
        for (const e of ringEdges(f)) {
          const others = othersOf(f, e);
          if (others.length !== 1) continue;   // 恰好两张面才有「对面」；T 字边不投
          const s = sideOf(others[0]), la = faceLeftSign(k, f, e), lb = faceLeftSign(k, others[0], e);
          if (s === null || la === null || lb === null) continue;
          const E = k.graph.edge(e);
          votes[la * lb < 0 ? s : 1 - s] += dist3(k.graph.pt(E.a), k.graph.pt(E.b));
        }
        if (Math.abs(votes[0] - votes[1]) > 1e-9) decided.push([f, votes[0] > votes[1] ? 0 : 1]);
      }
      const next = new Set<FaceId>();
      for (const [f, side] of decided) { write(f, side); open.delete(f); for (const e of ringEdges(f)) for (const g of othersOf(f, e)) if (open.has(g)) next.add(g); }
      cands = [...next].sort((a, b) => a - b);
    }
  };
  const fromFront = (f: FaceId, n: Pt3): Side | null => { const d = dot3(k.planeOf(f)!.plane.n, n); return Math.abs(d) < SIDE_ON ? null : d > 0 ? 1 : 0; };
  flood(open);
  if (!o.front || !open.size) return;
  const n = normalize3(o.front);
  if (o.seed !== undefined && k.face(o.seed) && sideOf(o.seed) === null) {
    const side = fromFront(o.seed, n);
    if (side !== null) {
      told.set(o.seed, side);
      if (k.faceMaterialOf(o.seed, side) === undefined) write(o.seed, side);
      flood(open);
    }
  }
  for (const f of [...open].sort((a, b) => a - b)) {
    if (!open.has(f)) continue;
    const side = fromFront(f, n);
    if (side === null) continue;
    write(f, side); open.delete(f);
    flood(ringEdges(f).flatMap((e) => othersOf(f, e)));
  }
}
