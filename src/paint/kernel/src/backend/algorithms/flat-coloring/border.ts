// 边界参数化 + 法线/曲率估计 + 端点（key-point）检测——论文 §4。
//
// 边 = (前景像素 p, 指向背景 4-邻居的方向 d)，编码 pIdx*4+d。遍历规则 = 论文 Fig 3
// 的等价墙随器：8-连通前景 / 4-连通背景，外轮廓走向为屏幕顺时针（y 向下）。
// 每条边的 canonical 法线 = 方向 d 的单位向量（从 X 指向背景）；沿环高斯平滑（式 1）；
// 曲率 = 相邻平滑法线差的一半（式 2）。注意：论文式 (2) 写 det(ñ_{i+1}, ñ_{i-1})，
// 在我们的顺时针走向下凸处（笔画断口端点）det 为负——这里取 det(ñ_{i-1}, ñ_{i+1})
// 使「凸 = 正」，与论文语义一致（测试 lineart-partition.test.mjs 守着这个符号约定）。

export interface Keypoint {
  x: number;
  y: number;
  /** 端点处朝背景（断口方向）的单位法线，= 式 (3) 的 κ² 加权平均 */
  nx: number;
  ny: number;
  kappa: number;
}

export interface BorderParams {
  /** 法线平滑核半径 L（核宽 2L+1 条边），论文默认 5 */
  kernelL: number;
  /** 端点曲率阈值 θκ ∈ (0,1) */
  thetaKappa: number;
}

// 方向序（顺时针）：0=上 1=右 2=下 3=左
const OFFX = [0, 1, 0, -1];
const OFFY = [-1, 0, 1, 0];

/** 追踪全部边界环。返回每环的边列表（编码 (y*w+x)*4+d，按遍历序）。 */
export function traceBorderCycles(Ib: Uint8Array, w: number, h: number): number[][] {
  const inX = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h && Ib[y * w + x] !== 0;
  const visited = new Uint8Array(w * h); // 每像素 4 bit，位 d = 该方向的边已走过
  const cycles: number[][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!Ib[y * w + x]) continue;
      for (let d = 0; d < 4; d++) {
        if (inX(x + OFFX[d], y + OFFY[d])) continue; // 邻居也是前景 → 无边
        if (visited[y * w + x] & (1 << d)) continue;
        // 从 (x,y,d) 起走完整个环
        const cycle: number[] = [];
        let cx = x, cy = y, cd = d;
        do {
          visited[cy * w + cx] |= 1 << cd;
          cycle.push((cy * w + cx) * 4 + cd);
          // Fig 3 规则：n=法线方向，f=前进方向（法线顺时针 90°）
          const fx = OFFX[(cd + 1) % 4], fy = OFFY[(cd + 1) % 4];
          const sx = cx + fx + OFFX[cd], sy = cy + fy + OFFY[cd]; // 斜前方
          const tx = cx + fx, ty = cy + fy;                        // 正前方
          if (inX(sx, sy)) {          // case (c)：斜前是前景 → 跨角左转
            cx = sx; cy = sy; cd = (cd + 3) % 4;
          } else if (inX(tx, ty)) {   // case (b)：正前是前景 → 直行
            cx = tx; cy = ty;
          } else {                    // case (a)：原地右转
            cd = (cd + 1) % 4;
          }
        } while (!(cx === x && cy === y && cd === d));
        cycles.push(cycle);
      }
    }
  }
  return cycles;
}

/** 二值图 → 端点列表（每个高曲率 8-连通簇取曲率最大者）。 */
export function keypointsFromBinary(
  Ib: Uint8Array,
  w: number,
  h: number,
  params: BorderParams,
): Keypoint[] {
  const cycles = traceBorderCycles(Ib, w, h);
  const L = Math.max(1, params.kernelL | 0);

  // 边界像素紧凑索引（省内存：只有边界像素有曲率/法线累积）
  const pixIdx = new Int32Array(w * h).fill(-1);
  const pixList: number[] = [];
  const pixOf = (p: number): number => {
    let i = pixIdx[p];
    if (i < 0) {
      i = pixList.length;
      pixIdx[p] = i;
      pixList.push(p);
    }
    return i;
  };
  const kappaP: number[] = [];  // κ̃(p) = max_e max(0, κ̃(e))
  const accNX: number[] = [];   // m̃(p) = Σ max(0,κ̃(e))² · ñ(e)（式 3，负曲率边不投票）
  const accNY: number[] = [];

  for (const cycle of cycles) {
    const n = cycle.length;
    const K = Math.min(L, (n - 1) >> 1); // 短环收缩核宽，保证每条边只计一次（式 1 的限制）
    // canonical 法线
    const cnx = new Float32Array(n), cny = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = cycle[i] & 3;
      cnx[i] = OFFX[d];
      cny[i] = OFFY[d];
    }
    // 高斯平滑（w_k = e^{-k²/L²}）+ 归一
    const snx = new Float32Array(n), sny = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let mx = 0, my = 0;
      for (let k = -K; k <= K; k++) {
        const wgt = Math.exp(-(k * k) / (L * L));
        const j = (i + k + n) % n;
        mx += wgt * cnx[j];
        my += wgt * cny[j];
      }
      const len = Math.hypot(mx, my);
      if (len > 1e-6) { snx[i] = mx / len; sny[i] = my / len; }
      else { snx[i] = cnx[i]; sny[i] = cny[i]; } // 对称退化（如 1px 宽笔画中段）→ 退回 canonical
    }
    // 逐边曲率 → 散点到像素
    for (let i = 0; i < n; i++) {
      const ip = (i - 1 + n) % n, iq = (i + 1) % n;
      const det = snx[ip] * sny[iq] - sny[ip] * snx[iq]; // det(ñ_{i-1}, ñ_{i+1})，凸为正
      const mag = 0.5 * Math.hypot(snx[iq] - snx[ip], sny[iq] - sny[ip]);
      const kap = (det < 0 ? -1 : 1) * mag;
      const p = cycle[i] >> 2;
      const pi = pixOf(p);
      const kpos = kap > 0 ? kap : 0;
      if (kappaP[pi] === undefined) { kappaP[pi] = 0; accNX[pi] = 0; accNY[pi] = 0; }
      if (kpos > kappaP[pi]) kappaP[pi] = kpos;
      accNX[pi] += kpos * kpos * snx[i];
      accNY[pi] += kpos * kpos * sny[i];
    }
  }

  // J' = {p: κ̃(p) ≥ θκ}，8-连通簇内取 argmax
  const nb = pixList.length;
  const inJ = new Uint8Array(nb);
  for (let i = 0; i < nb; i++) if (kappaP[i] >= params.thetaKappa) inJ[i] = 1;
  const seen = new Uint8Array(nb);
  const out: Keypoint[] = [];
  const stack: number[] = [];
  for (let i = 0; i < nb; i++) {
    if (!inJ[i] || seen[i]) continue;
    // BFS 收簇
    let best = i;
    stack.length = 0;
    stack.push(i);
    seen[i] = 1;
    while (stack.length) {
      const ci = stack.pop()!;
      if (kappaP[ci] > kappaP[best]) best = ci;
      const p = pixList[ci];
      const px = p % w, py = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const qx = px + dx, qy = py + dy;
          if (qx < 0 || qx >= w || qy < 0 || qy >= h) continue;
          const qi = pixIdx[qy * w + qx];
          if (qi >= 0 && inJ[qi] && !seen[qi]) { seen[qi] = 1; stack.push(qi); }
        }
      }
    }
    const p = pixList[best];
    let nx = accNX[best], ny = accNY[best];
    const len = Math.hypot(nx, ny);
    if (len > 1e-6) { nx /= len; ny /= len; }
    else { nx = 0; ny = 0; }
    out.push({ x: p % w, y: (p / w) | 0, nx, ny, kappa: kappaP[best] });
  }
  return out;
}
