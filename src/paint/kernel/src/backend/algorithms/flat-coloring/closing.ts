// 笔画闭合——论文 §5：端点配对（质量因子 ω，式 6）→ 数字化 Hermite 样条桥接，
// 再从剩余端点沿法线补直线段（§5.2）。每条候选闭合笔画要过两道守卫：
//  · τ 相交测试（Def 6）：路径对当前 Ic 的 0/1 过渡数必须恰为 2（离开笔画一次、
//    进入对面笔画一次）——天然禁止穿越既有线条与已画的闭合笔画（不允许自交模式）。
//  · 最小面积守卫（§5.1.5）：新笔画不得制造 5 ≤ |R| < amin 的 4-连通背景小区
//    （< 5 px 视为局部噪声不管）。
// 全部纯函数，node 直测。

import type { Keypoint } from "./border.ts";

export interface ClosingParams {
  /** 端点配对最大距离（px）；≤0 = 关闭样条配对 */
  dmax: number;
  /** 法线对置容差角 α（度），∈(0,90]；式 6 第三项 */
  alphaDeg: number;
  /** 样条切线长度系数 ρ ∈ [0,2] */
  rho: number;
  /** 闭合后允许的最小背景区面积（px）；防过碎 */
  amin: number;
  /** 直线段最大长度（px）；≤0 = 关闭补段 */
  smax: number;
  /** 单个端点最多发出的闭合笔画数 */
  cmax: number;
}

/** Bresenham，向 out 追加 (x0,y0)→(x1,y1) 的像素（含两端；起点若与 out 末尾重复则跳过）。 */
function bresenhamInto(out: number[], x0: number, y0: number, x1: number, y1: number, w: number, h: number): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    const p = y * w + x;
    if (x >= 0 && x < w && y >= 0 && y < h && (out.length === 0 || out[out.length - 1] !== p)) out.push(p);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

/** 数字化 Hermite 样条：端点 s/t + 各自朝断口的法线为切向。返回 8-连通去重像素路径（packed index）。 */
export function digitizeSpline(
  s: Keypoint, t: Keypoint, rho: number, w: number, h: number,
): number[] {
  const D = Math.hypot(t.x - s.x, t.y - s.y);
  const m0x = s.nx * rho * D, m0y = s.ny * rho * D;
  const m1x = -t.nx * rho * D, m1y = -t.ny * rho * D;
  const N = Math.max(8, Math.ceil(D * 2));
  const path: number[] = [];
  let px = s.x, py = s.y;
  for (let i = 1; i <= N; i++) {
    const u = i / N, u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    const fx = h00 * s.x + h10 * m0x + h01 * t.x + h11 * m1x;
    const fy = h00 * s.y + h10 * m0y + h01 * t.y + h11 * m1y;
    const qx = Math.round(fx), qy = Math.round(fy);
    if (qx !== px || qy !== py) {
      bresenhamInto(path, px, py, qx, qy, w, h);
      px = qx; py = qy;
    }
  }
  if (path.length === 0 || path[path.length - 1] !== py * w + px) {
    // 单点退化（D≈0）
    if (px >= 0 && px < w && py >= 0 && py < h) path.push(py * w + px);
  }
  // 起点像素补进开头（bresenhamInto 首段已含，但 D≈0 时可能缺）
  if (path.length === 0 || path[0] !== s.y * w + s.x) path.unshift(s.y * w + s.x);
  return path;
}

/** τ(C, J)：路径相邻像素间 0/1 过渡数（Def 6）。 */
export function transitionCount(path: number[], img: Uint8Array): number {
  let c = 0;
  for (let i = 1; i < path.length; i++) {
    if ((img[path[i]] !== 0) !== (img[path[i - 1]] !== 0)) c++;
  }
  return c;
}

/** 面积守卫：候选 T 已画进 base（= Ib∪T）后，检查其毗邻的 4-连通背景区没有 5 ≤ |R| < amin 的。
 *
 *  有界 flood + 早退防污染（v0.7.6 修真机指尖误毙）：每个探测点数到 amin 即"判大早退"，
 *  但早退会留下部分标记——同一候选的下一个探测点若从**同一个大区**的未标记部分起 flood，
 *  会把残留标记当墙、只数到一小片余量（5..amin-1 就误毙，且余量大小随 amin 抖动）。
 *  解法：每个探测点用自己的 probe 序号标记；flood 撞到「本候选内、更早 probe」的标记，
 *  说明撞上了早退的大区（数满的区才会留残标；数完没满的区是封闭的、别的 probe 进不来）
 *  → 同一连通区 → 直接判大。genState.v 全局单调，跨候选的旧标记（≤ candStart）视同未访问。
 *  测试直连（lineart-partition.test.mjs 有毒化回归），导出仅供测试。 */
export function areaGuardOk(
  base: Uint8Array, w: number, h: number, newPx: number[], amin: number,
  visited: Int32Array, genState: { v: number }, stack: number[],
): boolean {
  if (amin <= 5) return true;
  const candStart = genState.v;
  for (const np of newPx) {
    const nx0 = np % w, ny0 = (np / w) | 0;
    for (let d = 0; d < 4; d++) {
      const qx = nx0 + (d === 1 ? 1 : d === 3 ? -1 : 0);
      const qy = ny0 + (d === 2 ? 1 : d === 0 ? -1 : 0);
      if (qx < 0 || qx >= w || qy < 0 || qy >= h) continue;
      const q = qy * w + qx;
      if (base[q] !== 0 || visited[q] > candStart) continue;   // 墙 / 本候选已探过（判过大或 <5 封闭区）
      const myGen = ++genState.v;
      let size = 0;
      let big = false;
      stack.length = 0;
      stack.push(q);
      visited[q] = myGen;
      outer: while (stack.length) {
        const p = stack.pop()!;
        size++;
        if (size >= amin) { big = true; break; }
        const px = p % w, py = (p / w) | 0;
        for (let dd = 0; dd < 4; dd++) {
          const bx = px + (dd === 1 ? 1 : dd === 3 ? -1 : 0);
          const by = py + (dd === 2 ? 1 : dd === 0 ? -1 : 0);
          if (bx < 0 || bx >= w || by < 0 || by >= h) continue;
          const b = by * w + bx;
          if (base[b] !== 0) continue;
          const v = visited[b];
          if (v === myGen) continue;
          if (v > candStart) { big = true; break outer; }   // 撞早退大区残标 → 同一连通区 → 大
          visited[b] = myGen;
          stack.push(b);
        }
      }
      if (!big && size >= 5) return false;
    }
  }
  return true;
}

/** 调试记录：一条候选闭合笔画的像素路径 + 是否被采纳（false 时给守卫原因）。
 *  ω=0 被结构性排除的配对（如 U 型平行开口）不产生记录——画面上「有端点无桥」即是它。 */
export interface BridgeDebug { px: number[]; ok: boolean; reason?: "tau" | "amin" }

/** 主入口：Ib + 端点 → 闭合后的 Ic（不改 Ib）+ 桥调试记录（v0.7.4 调试视图）。 */
export function closeStrokes(
  Ib: Uint8Array, w: number, h: number, kps: Keypoint[], params: ClosingParams,
): { Ic: Uint8Array; bridges: BridgeDebug[] } {
  const Ic = Ib.slice();
  // 碎区守卫基底（论文 §5.1.5 原文：R ⊂ 非(I_b ∪ T)）：**只有真墨水 + 当前候选**当墙，
  //   已接受的闭合桥不算——两条桥夹出的小缝是作者接受的轻微过分割，不拦。
  //   每次检查画入候选后恒回滚，让下一条候选的基底仍是纯 Ib。
  //   （v0.7.5 修：此前误用 Ic 当基底 → 幻觉端点长出的桥会把邻近 innocent 桥夹死。
  //     τ 相交测试仍按 §5.1.4「禁互穿」语义用 Ic，别混。）
  const Iguard = Ib.slice();
  const bridges: BridgeDebug[] = [];
  const MAX_BRIDGE_RECORDS = 1000;   // 病态图护栏（正常线稿几十条）
  const K = kps.length;
  const counts = new Uint16Array(K);
  const visited = new Int32Array(w * h);
  const genState = { v: 0 };   // areaGuardOk 的 probe 序号（全局单调，见其头注释）
  const floodStack: number[] = [];
  const cosA = Math.cos((Math.max(1, Math.min(90, params.alphaDeg)) * Math.PI) / 180);

  const record = (path: number[], ok: boolean, reason?: "tau" | "amin") => {
    if (bridges.length < MAX_BRIDGE_RECORDS) bridges.push({ px: path, ok, reason });
  };
  const tryStroke = (path: number[], ki: number, kj: number): boolean => {
    if (transitionCount(path, Ic) !== 2) { record(path, false, "tau"); return false; }
    const newPx: number[] = [];
    for (const p of path) {
      if (Ic[p] === 0) { Ic[p] = 1; newPx.push(p); }
    }
    if (newPx.length === 0) return false;   // 全在已有笔画里 = 无效候选，不记
    // 守卫在 Iguard（= Ib ∪ T）上做：候选像素按 Ib 基底重算（可能比 newPx 多——
    //   与已接受桥重叠的像素在 Ic 里已是 1，但对 Ib 仍是新增）
    const guardPx: number[] = [];
    for (const p of path) {
      if (Iguard[p] === 0) { Iguard[p] = 1; guardPx.push(p); }
    }
    const guardOk = areaGuardOk(Iguard, w, h, guardPx, params.amin, visited, genState, floodStack);
    for (const p of guardPx) Iguard[p] = 0;   // 恒回滚（无论采纳与否）
    if (!guardOk) {
      for (const p of newPx) Ic[p] = 0; // 回滚
      record(path, false, "amin");
      return false;
    }
    counts[ki]++;
    if (kj >= 0) counts[kj]++;
    record(path, true);
    return true;
  };

  // —— 样条配对（§5.1）——
  if (params.dmax > 0 && K >= 2) {
    const cand: { i: number; j: number; om: number }[] = [];
    for (let i = 0; i < K; i++) {
      for (let j = i + 1; j < K; j++) {
        const a = kps[i], b = kps[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 0 || dist >= params.dmax) continue;
        const t1 = 1 - dist / params.dmax;
        const vx = dx / dist, vy = dy / dist;
        const t2 = 0.5 * Math.max(0, a.nx * vx + a.ny * vy + b.nx * -vx + b.ny * -vy);
        if (t2 <= 0) continue;
        const t3 = Math.max(0, -(a.nx * b.nx + a.ny * b.ny) - cosA);
        if (t3 <= 0) continue;
        cand.push({ i, j, om: t1 * t2 * t3 });
      }
    }
    cand.sort((p, q) => q.om - p.om);
    for (const c of cand) {
      if (counts[c.i] >= params.cmax || counts[c.j] >= params.cmax) continue;
      tryStroke(digitizeSpline(kps[c.i], kps[c.j], params.rho, w, h), c.i, c.j);
    }
  }

  // —— 直线段补漏（§5.2）：从剩余端点沿法线走，限距内撞到笔画就连 ——
  if (params.smax > 0) {
    const order = kps.map((_, i) => i).sort((a, b) => kps[b].kappa - kps[a].kappa);
    for (const ki of order) {
      if (counts[ki] >= params.cmax) continue;
      const kp = kps[ki];
      if (Math.hypot(kp.nx, kp.ny) < 0.5) continue; // 法线退化的端点没有可信方向
      let inside = true;
      let hx = -1, hy = -1;
      for (let st = 0.5; st <= params.smax; st += 0.5) {
        const ix = Math.round(kp.x + kp.nx * st), iy = Math.round(kp.y + kp.ny * st);
        if (ix < 0 || ix >= w || iy < 0 || iy >= h) break;
        const v = Ic[iy * w + ix];
        if (inside) {
          if (!v) inside = false;
        } else if (v) { hx = ix; hy = iy; break; }
      }
      if (hx < 0) continue;
      const path: number[] = [];
      bresenhamInto(path, kp.x, kp.y, hx, hy, w, h);
      tryStroke(path, ki, -1);
    }
  }

  return { Ic, bridges };
}
