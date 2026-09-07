// world-query.ts —— player 深模块对「世界」的唯一认识：四个几何原语（注入式，player 不 import kernel/three）。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元；user：「player.ts 帮我好好模块化一个，尽量不要和别的代码混乱」）
//
// 坐标：世界右手系 +Z 上（CatsUp 家规），单位米（A10 纪律：内部单位 SI）。
// 实现方：src/editor/collision-world.ts（内核膜 = 多边形汤）；测试用 test/player.test.ts 里的盒子世界替身。
// 原则（user 2026-09-07 E12 旁）：「geometry 是默认有碰撞的，除非用户 override or assign proxy」——phase 1 全部膜参与。

import type { Pt3 } from "../kernel/geom.ts";

export interface Ray { origin: Pt3; dir: Pt3; }
export interface WorldHit {
  p: Pt3;        // 命中点
  n: Pt3;        // 命中面单位法向（膜双面：符号无意义，用 |n.z| 判坡度）
  t: number;     // 沿线段的参数 ∈ [0,1]
}

export interface WorldQuery {
  /** 安全地板 z = min(0, 模型最低 z)：永远存在的无限平面，掉不到无穷（user：「地板用 min(0,min(model))」）。 */
  floorZ(): number;
  /** 球（球心 c、半径 r）若与几何相交，返回把它推出的位移向量（多面累计一轮；调用方迭代几次收敛）；不相交 → null。不含安全地板。 */
  pushOut(c: Pt3, r: number): Pt3 | null;
  /**
   * 竖直探针：从 (x, y, zTop) 向下找 ≥ zMin 的**最高**可站立面 z（|n.z| ≥ minNz 才算地，墙不算）；含安全地板。
   * 没有 → null（真悬空）。
   */
  floorBelow(x: number, y: number, zTop: number, zMin: number, minNz: number): number | null;
  /** 线段 a→b 与几何（含安全地板）的首个命中；无 → null。teleport 抛射体折线逐段用。 */
  segmentHit(a: Pt3, b: Pt3): WorldHit | null;
}

/** 空世界：只有安全地板 z=0（无模型时 / 单元测试基线）。 */
export function flatFloorWorld(z0 = 0): WorldQuery {
  return {
    floorZ: () => z0,
    pushOut: () => null,
    floorBelow: (_x, _y, zTop, zMin) => (z0 <= zTop + 1e-9 && z0 >= zMin - 1e-9 ? z0 : null),
    segmentHit: (a, b) => {
      const dz = b.z - a.z;
      if (Math.abs(dz) < 1e-12) return null;
      const t = (z0 - a.z) / dz;
      if (t < 0 || t > 1) return null;
      return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: z0 }, n: { x: 0, y: 0, z: 1 }, t };
    },
  };
}
