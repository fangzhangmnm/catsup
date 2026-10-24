// guide-pick.ts —— 参考几何的拾取（D18，2026-10-24；user「参考线橡皮擦不掉，以及参考点怎么删」）。纯函数：屏距 ≤ 容差的最近参考点 / 参考线（无限长）。
// 参考点先于参考线（同实体拾取「点 > 边」的口径）；都用本帧度量（桌面 px / VR 度）。created 2026-10-24 by Claude Fable 5.1
import type { Pt3 } from "../kernel/kernel.ts";
import { add3 } from "../kernel/geom.ts";
import type { GuidesWorld } from "../scene/guides.ts";
import type { PointerFrame, Viewport } from "./pointer-frame.ts";

export type GuidePick = { kind: "point" | "line"; id: number; d: number };

export function pickGuide(G: GuidesWorld, pf: PointerFrame, vp: Viewport, sx: number, sy: number, tol: number): GuidePick | null {
  let best: GuidePick | null = null;
  for (const q of G.points) {
    const d = pf.distTo(sx, sy, q.p, vp);
    if (d <= tol && (!best || d < best.d)) best = { kind: "point", id: q.id, d };
  }
  if (best) return best;
  for (const l of G.lines) {
    const d = pf.distToSeg(sx, sy, l.p, add3(l.p, l.dir), vp, true).d;
    if (d <= tol && (!best || d < best.d)) best = { kind: "line", id: l.id, d };
  }
  return best;
}

/** 擦掉 ids 之后的参考几何（预演用：刮过的先从画面上消失）。 */
export function withoutGuides(G: GuidesWorld, ids: ReadonlySet<number>): GuidesWorld {
  return ids.size ? { lines: G.lines.filter((l) => !ids.has(l.id)), points: G.points.filter((q) => !ids.has(q.id)) } : G;
}
