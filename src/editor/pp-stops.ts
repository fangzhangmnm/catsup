// pp-stops.ts —— 推拉高度通道的停靠集（2026-10-24，Claude Fable 5.1；user 退役清单第四条「改成『光标下的点 + 参考点 + 整数长度』」「好，先做」）。
// 之前 = 全场景每个顶点沿法向的高度都进停靠集（「城市另一端的烟灰缸」本尊）。现在只留会改拓扑的 + 参考几何的：
//   · 0（回到起点）
//   · 同柱子里的平行面（推到它 = 穿透 / 挖通；柱子 = 源面沿法向的投影，按两张面在面基下的包围盒重叠判）
//   · 参考点的高度、与源面平行的参考线的高度
// 光标下的点 / 面高度在 ppTrack 里另走光标通道（SU「指到哪咬哪」）；整数长度在网格开着时取整。纯函数，测试直跑。
import type { Pt3 } from "../kernel/kernel.ts";
import { dot3, sub3 } from "../kernel/geom.ts";

export interface PpStopsView {
  faces(): { id: number }[];
  planeOf(id: number): { plane: { n: Pt3; d: number }; basis: { u: Pt3; v: Pt3 } } | undefined;
  faceRings3(id: number): { outer: Pt3[] } | undefined;
  guides?(): { lines: { p: Pt3; dir: Pt3 }[]; points: { p: Pt3 }[] };
}
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

export function ppStopsOf(view: PpStopsView, face: number, anchor: Pt3, n: Pt3): number[] {
  const rec = view.planeOf(face), ring = view.faceRings3(face);
  const hs = new Set<number>([0]);
  if (!rec || !ring) return [0];
  const { u, v } = rec.basis;
  const bbox = (pts: readonly Pt3[]): [number, number, number, number] => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { const x = dot3(p, u), y = dot3(p, v); if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  };
  const hOf = (p: Pt3): number => r6(dot3(sub3(p, anchor), n));
  const [ax0, ay0, ax1, ay1] = bbox(ring.outer);
  for (const f of view.faces()) {
    if (f.id === face) continue;
    const fr = view.planeOf(f.id), rr = view.faceRings3(f.id);
    if (!fr || !rr || Math.abs(dot3(fr.plane.n, n)) < 0.999) continue;   // 只要平行面
    const [bx0, by0, bx1, by1] = bbox(rr.outer);
    if (bx1 < ax0 || bx0 > ax1 || by1 < ay0 || by0 > ay1) continue;        // 不在柱子里
    hs.add(hOf(rr.outer[0]));
  }
  const g = view.guides?.();
  if (g) {
    for (const q of g.points) hs.add(hOf(q.p));
    for (const l of g.lines) if (Math.abs(dot3(l.dir, n)) < 1e-6) hs.add(hOf(l.p));
  }
  return [...hs].sort((a, b) => a - b);
}
