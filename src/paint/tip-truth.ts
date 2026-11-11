// paint/tip-truth.ts —— 标准答案：每一格吃多少（贴图主线 1-4a 第四节，施工单 ai-docs/20261110-paint-workorders-9.md）。created 2026-11-11 by Claude Opus 5.5
// 这是定义，也是 1-4b 显卡那一半要对拍的东西：普通的函数，不碰显卡，不求快。
// 一颗笔尖 × 一块画布多边形 × 一格：
//   ① 这一格归不归这块多边形（1-3a 的归属表）。不归 = 不吃。
//   ② 对着这一格的每张面（第三节挂在这块多边形下面的那几张）：取样点在这张面上的空间位置（1-3a positionOnFace：这张面自己的三角形里贴图坐标上离取样点最近的那个、
//      用它的公式算），乘上这份摆放 = 世界位置，量到球心的距离；取最近的那个。同一颗笔尖对同一格只算一次。
//   ③ 距离和半径（都是世界里的长度）交给内核的笔尖边缘曲线（和画画软件同一份：soft-shaders.ts 导出的 stampFalloff），硬芯 = 硬度 × 半径（和二维笔尖同一个算法），
//      再乘这颗笔尖的浓度。距离不小于半径 = 不吃。
// 一笔之内怎么攒：照内核的两种——取最大（淡彩）：每一格留最浓的；叠加（叠色）：按笔尖的先后一颗一颗盖上去（a + v·(1 − a)）。
import { stampFalloff } from "./kernel/src/backend/gl/stamp-falloff.ts";   // 笔尖边缘的曲线：内核导出的那一份（公式，不是软件显卡）
import { applyPt } from "../scene/xform.ts";
import { positionOnFace, samplePoint } from "./texel-table.ts";
import type { TargetGeo } from "./space-target.ts";
import type { Reach, Tip } from "./tip-reach.ts";

export interface InkTip extends Tip { readonly alpha: number }
export type Accum = "max" | "over";

/** 硬度 → 硬芯的比例（和二维笔尖 gl-stamp.ts 同一个夹法）。 */
const coreOf = (hardness: number): number => Math.max(0, Math.min(0.999, hardness));

/** 一颗笔尖 × 一块画布多边形：格子（行 × 宽 + 列）→ 浓度（只有 > 0 的）。tris = 第三节挂在这块多边形下面的空间三角形（格子里的编号）。 */
export function tipCellsInPoly(g: TargetGeo, poly: number, tris: readonly number[], tip: InkTip, hardness: number): Map<number, number> {
  const t = g.table, out = new Map<number, number>(), faces = [...new Set(tris.map((k) => g.grid.face[k]))].sort((a, b) => a - b), X = g.target.xform, R = t.gap / 2, ring = t.polys[poly];
  if (!ring || !faces.length) return out;
  let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity;
  for (let j = 0; j < ring.length; j += 2) { mx = Math.min(mx, ring[j]); Mx = Math.max(Mx, ring[j]); my = Math.min(my, ring[j + 1]); My = Math.max(My, ring[j + 1]); }
  const x0 = Math.max(0, Math.floor(mx - R - 0.5)), x1 = Math.min(t.width - 1, Math.ceil(Mx + R - 0.5)), y0 = Math.max(0, Math.floor(my - R - 0.5)), y1 = Math.min(t.height - 1, Math.ceil(My + R - 0.5));
  const inner = coreOf(hardness) * tip.r;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = y * t.width + x;
    if (t.owner[c] !== poly) continue;
    const s = samplePoint(t, x, y)!;
    let best = Infinity;
    for (const f of faces) {
      const q = positionOnFace(t, f, s[0], s[1]);
      if (!q) continue;
      const w = applyPt(X, q.pos), d = Math.hypot(w.x - tip.x, w.y - tip.y, w.z - tip.z);
      if (d < best) best = d;
    }
    if (best >= tip.r) continue;
    const v = stampFalloff(best, tip.r, inner) * tip.alpha;
    if (v > 0) out.set(c, v);
  }
  return out;
}

/** 一颗笔尖吃了哪些格：目标（第几项）→ 格子 → 浓度。 */
export function tipCells(geos: readonly TargetGeo[], tip: InkTip, reach: Reach, hardness: number): Map<number, Map<number, number>> {
  const out = new Map<number, Map<number, number>>();
  for (const [ti, polys] of reach) {
    const m = new Map<number, number>();
    for (const [poly, tris] of polys) for (const [c, v] of tipCellsInPoly(geos[ti], poly, tris, tip, hardness)) m.set(c, v);   // 每一格只归一块多边形：不会算两次
    if (m.size) out.set(ti, m);
  }
  return out;
}

/** 一笔（按笔尖的先后）攒起来：目标 → 格子 → 浓度。mode = 取最大（淡彩）/ 叠加（叠色）。 */
export function strokeTruth(geos: readonly TargetGeo[], tips: readonly { readonly tip: InkTip; readonly reach: Reach }[], hardness: number, mode: Accum): Map<number, Map<number, number>> {
  const acc = new Map<number, Map<number, number>>();
  for (const { tip, reach } of tips) for (const [ti, cells] of tipCells(geos, tip, reach, hardness)) {
    const m = acc.get(ti) ?? new Map<number, number>();
    for (const [c, v] of cells) { const a = m.get(c) ?? 0; m.set(c, mode === "max" ? Math.max(a, v) : a + v * (1 - a)); }
    acc.set(ti, m);
  }
  return acc;
}

/**
 * 标准答案的 8 位版（统筹 11-11 裁定 ②：三维的累积和画画内核二维笔尖同一种精度、同一种量化次序）：按笔尖的先后，每颗笔尖往每一格写一次、写完四舍五入到 8 位。
 * 写的是预乘的 (c·v, v)：淡彩 = 每通道取最大；叠色 = src + dst·(1 − src.a)（dst 取上一步量化过的字节 / 255）。返回 目标 → 格子 → RGBA 字节。
 * 上面的 strokeTruth 是不量化的连续版，留着当参考值：叠色一路叠下去，每一步的舍入会留一部分在下一步里，两版最多差约 1.06/255（1-4b 量的，测试里写着）。
 */
export function strokeTruth8(geos: readonly TargetGeo[], tips: readonly { readonly tip: InkTip; readonly reach: Reach }[], hardness: number, mode: Accum, color: readonly [number, number, number]): Map<number, Map<number, Uint8ClampedArray>> {
  const q = (x: number): number => Math.round(Math.max(0, Math.min(1, x)) * 255), acc = new Map<number, Map<number, Uint8ClampedArray>>();
  for (const { tip, reach } of tips) for (const [ti, cells] of tipCells(geos, tip, reach, hardness)) {
    const m = acc.get(ti) ?? new Map<number, Uint8ClampedArray>();
    for (const [c, v] of cells) {
      const p = m.get(c) ?? new Uint8ClampedArray(4), src = [color[0] * v, color[1] * v, color[2] * v, v];
      if (mode === "max") for (let k = 0; k < 4; k++) p[k] = Math.max(p[k], q(src[k]));
      else { const kk = 1 - v; for (let k = 0; k < 4; k++) p[k] = q(src[k] + (p[k] / 255) * kk); }
      m.set(c, p);
    }
    acc.set(ti, m);
  }
  return acc;
}
