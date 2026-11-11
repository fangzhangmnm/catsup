// paint/space-path.ts —— 落成路（贴图主线 1-4a 第二节，施工单 ai-docs/20261110-paint-workorders-9.md）：0-6 的 PathPlacer 的实现。created 2026-11-11 by Claude Opus 5.5
// 输入：平滑好的中心线（屏幕上的点和压感，前 frozenCount 个不会再变）+ 「屏幕上一点 → 打中了什么」。输出：一条三维的路（StrokePath），路上只有打中的点。
// 做法：在屏幕上对半分。中心线上相邻两点 A、B：
//   · 两头都打中：世界里的距离不超过步长上限 = 这一段是路上的一段；超过 = 取屏幕上的中点（压感取平均）打一条射线，分两段各自再看；
//     分到屏幕上不到 minPx（1/256 像素）还超过 = 这里断开（笔从一处跳到了另一处）。
//   · 一头打中、一头没打中：同样对半分到 minPx，路在最后一个打中的点上断开（线一直画到轮廓边上）。
//   · 两头都没打中：屏幕上超过 missPx（2 像素）就对半分着找（中间可能有一条细的东西），不超过就算了。
// 为什么分得出「连着」和「跳了」：连着的表面再斜，屏幕上分一半世界里也跟着减半，总能分到上限以内；真的跳了，怎么分都有一段不变短。
// 定型：中心线前面不会再变的那些点对应的路算过一次就留着（射线不重打），路的 frozenCount 跟着涨、只增不减；每次只重算尾巴。
// 一对相邻点里射线的条数有上限（maxRays，默认 4096）：到了 = 剩下的当断开，并在 stats.capped 记一笔。同样的输入 = 路逐位相同。
import type { Pt3 } from "../kernel/geom.ts";
import type { PathPlacer, StrokePath } from "./kernel/src/backend/stroke-core.ts";
import type { Hit } from "./space-target.ts";

export interface PlacerOpts {
  /** 屏幕上一点 → 打中了什么（一般 = space-target.ts rayHit 包一层相机）。 */
  hit(sx: number, sy: number): Hit;
  /** 路的单位（世界里一格多大）。 */
  readonly unit: number;
  /** 步长上限（世界长度）= 这一笔定下来的半径的一半和一个路的单位，两个里大的那个（调用方算）。 */
  readonly stepMax: number;
  readonly minPx?: number;
  readonly missPx?: number;
  readonly maxRays?: number;
}
/** 路上一点打中的是谁（第几项目标、格子里第几个三角形）：笔尖找起点用（tip-reach.ts）。 */
export interface PathHit { readonly ti: number; readonly tri: number }
export interface SpacePath extends StrokePath { hitAt(i: number): PathHit }

interface Node { readonly sx: number; readonly sy: number; readonly p: number; readonly h: Hit }
interface Pt { readonly x: number; readonly y: number; readonly z: number; readonly p: number; brk: boolean; readonly ti: number; readonly tri: number }
interface RunState { broken: boolean; have: boolean }

export class SpacePathPlacer implements PathPlacer {
  readonly dim = 3;
  readonly unit: number;
  /** rays = 一共打了多少条射线；capped = 有几对相邻点到了射线上限（剩下的当断开）。 */
  readonly stats = { rays: 0, capped: 0 };
  private readonly o: Required<Omit<PlacerOpts, "hit">> & Pick<PlacerOpts, "hit">;
  private readonly frozenHits: Hit[] = [];   // 定型的中心线点打中的（不重打）
  private readonly frozenOut: Pt[] = [];
  private frozenPairs = 0;                    // 处理过的定型的相邻对：(i − 1, i)，i < frozenPairs + 1
  private frozenFirst = false;                // 第 0 个点进过定型的路了
  private readonly frozenState: RunState = { broken: false, have: false };

  constructor(o: PlacerOpts) {
    this.o = { minPx: 1 / 256, missPx: 2, maxRays: 4096, ...o };
    this.unit = o.unit;
  }

  private cast(sx: number, sy: number): Hit { this.stats.rays++; return this.o.hit(sx, sy); }

  place(cx: readonly number[], cy: readonly number[], cp: readonly number[], count: number, frozenCount: number): SpacePath {
    const fc = Math.min(frozenCount, count);
    const node = (i: number, frozen: boolean): Node => {
      let h: Hit;
      if (frozen) { if (i >= this.frozenHits.length) this.frozenHits[i] = this.cast(cx[i], cy[i]); h = this.frozenHits[i]; }
      else h = this.cast(cx[i], cy[i]);
      return { sx: cx[i], sy: cy[i], p: cp[i], h };
    };
    // 1) 定型的部分往前长（只做没做过的）
    if (fc >= 1 && !this.frozenFirst) { this.first(node(0, true), this.frozenOut, this.frozenState); this.frozenFirst = true; }
    for (let i = this.frozenPairs + 1; i < fc; i++) { this.pair(node(i - 1, true), node(i, true), this.frozenOut, this.frozenState); this.frozenPairs = i; }
    // 2) 尾巴（每次重算）
    const tail: Pt[] = [], st: RunState = { ...this.frozenState };
    if (count >= 1 && !this.frozenFirst) this.first(node(0, fc >= 1), tail, st);
    for (let i = Math.max(1, this.frozenPairs + 1); i < count; i++) this.pair(node(i - 1, i - 1 < fc), node(i, i < fc), tail, st);
    const pts = tail.length ? [...this.frozenOut, ...tail] : this.frozenOut.slice(), nFrozen = this.frozenOut.length;
    return {
      dim: 3, count: pts.length, frozenCount: nFrozen,
      coord: (i, k) => (k === 0 ? pts[i].x : k === 1 ? pts[i].y : pts[i].z),
      pressure: (i) => pts[i].p,
      breakBefore: (i) => pts[i].brk,
      hitAt: (i) => ({ ti: pts[i].ti, tri: pts[i].tri }),
    };
  }

  private emit(n: Node, connected: boolean, out: Pt[], st: RunState): void {
    const h = n.h as Extract<Hit, { kind: "target" }>;
    out.push({ x: h.pos.x, y: h.pos.y, z: h.pos.z, p: n.p, brk: st.have && (st.broken || !connected), ti: h.ti, tri: h.tri });
    st.broken = false; st.have = true;
  }
  private first(n: Node, out: Pt[], st: RunState): void { if (n.h?.kind === "target") this.emit(n, true, out, st); else st.broken = true; }

  /** 一对相邻的中心线点：对半分着落（见文件头）。 */
  private pair(A: Node, B: Node, out: Pt[], st: RunState): void {
    const { stepMax, minPx, missPx, maxRays } = this.o;
    let budget = maxRays, capped = false;
    const isT = (h: Hit): h is Extract<Hit, { kind: "target" }> => h?.kind === "target";
    const dist = (a: Pt3, b: Pt3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    const seg = (a: Node, b: Node): void => {
      if (capped) { st.broken = true; return; }
      const sd = Math.hypot(b.sx - a.sx, b.sy - a.sy), ha = isT(a.h), hb = isT(b.h);
      if (ha && hb) {
        if (dist((a.h as Extract<Hit, { kind: "target" }>).pos, (b.h as Extract<Hit, { kind: "target" }>).pos) <= stepMax) { this.emit(b, true, out, st); return; }
        if (sd < minPx) { this.emit(b, false, out, st); return; }   // 跳了：在 b 前面断开
      } else if (!ha && !hb) {
        if (sd <= missPx) { st.broken = true; return; }
      } else if (sd < minPx) {
        if (ha) { st.broken = true; return; }   // a 中、b 没中：路在 a 上断开
        this.emit(b, false, out, st); return;   // a 没中、b 中：b 开始新的一段
      }
      if (budget <= 0) { capped = true; this.stats.capped++; st.broken = true; return; }
      budget--;
      const mx = (a.sx + b.sx) / 2, my = (a.sy + b.sy) / 2, m: Node = { sx: mx, sy: my, p: (a.p + b.p) / 2, h: this.cast(mx, my) };
      seg(a, m); seg(m, b);
    };
    seg(A, B);
  }
}
