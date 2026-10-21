// offset.ts —— 面的外环偏移（SU Offset 工具的几何本体，纯函数，DOM-free，node 直测）。
// created 2026-10-21 by Claude Fable 5.1（0.8 纪元；user 2026-09-06「我想要offset了…offset多了退化了你能搞得定吗（比如一些边长变成0只会拓扑变还能继续offset）
// 顺便offset还能offset到更大的外面，sketchup会长膜」；2026-10-21「wishlist里面加一个offset」）
//
// 规则（SU 同款，只外环；总账 B7「按区域侵蚀」的提案先不做，逐环 miter 够用）：
//   ① 每条边沿自己的外法向平移 d（环 CCW：外法向 = (dy, −dx)）；相邻两条平移线的交点 = 新顶点（miter）；近平行 → 直接平移点。
//   ② 退化：偏移后方向反转的边（内缩时短边被吃掉）→ 删掉它，两端并成相邻平移线的交点；迭代到稳定。
//   ③ 自交 / 越界（外扩撞上别的几何）不在这里管：输出当手势线段交给像表结算机，sticky 自愈 + BIRTH 分割。
// 符号：d > 0 = 外扩（远离面心），d < 0 = 内缩。
import type { Pt } from "../kernel/geom.ts";

const EPS = 1e-9;

/** 外环（任意绕向）按 d 偏移；退化边合并；退化到 < 3 点 → []。 */
export function offsetRing(ring: readonly Pt[], d: number): Pt[] {
  if (ring.length < 3 || Math.abs(d) < EPS) return ring.map((p) => ({ ...p }));
  // 统一成 CCW（外法向 = 右手法则 (dy, −dx)）
  let area = 0;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; area += a.x * b.y - b.x * a.y; }
  const pts = area > 0 ? [...ring] : [...ring].reverse();
  // 多边形按**边**表示（每条边 = 平移后的直线：过点 + 单位方向）。退化 = 删边不删点——删点会改原形
  //（切角方删掉切角顶点 = 把右边和顶边换成一条斜边，交点就错到 (6.5, 5.1) 去了；删边 = 右边线 ∩ 顶边线 = (6, 6)，才是 SU 的答案）。
  const lines = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const nx = dy / l, ny = -dx / l;
    return { ax: a.x + nx * d, ay: a.y + ny * d, dx: dx / l, dy: dy / l };
  });
  for (let round = 0; round <= ring.length; round++) {
    const n = lines.length;
    if (n < 3) return [];
    const out: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const L0 = lines[(i + n - 1) % n], L1 = lines[i];
      const cross = L0.dx * L1.dy - L0.dy * L1.dx;
      if (Math.abs(cross) < 1e-9) {
        if (L0.dx * L1.dx + L0.dy * L1.dy < 0) return [];   // 相邻两边反向平行 = 环已塌成一条线
        out.push({ x: L1.ax, y: L1.ay }); continue;         // 共线：平移点
      }
      const rx = L1.ax - L0.ax, ry = L1.ay - L0.ay;
      const t = (rx * L1.dy - ry * L1.dx) / cross;
      out.push({ x: L0.ax + L0.dx * t, y: L0.ay + L0.dy * t });
    }
    // 退化检测：偏移后反向（或缩到 0）的边 → 删那条边，两端并成相邻两线的交点
    let bad = -1;
    for (let i = 0; i < n; i++) {
      const a = out[i], b = out[(i + 1) % n];
      if ((b.x - a.x) * lines[i].dx + (b.y - a.y) * lines[i].dy < EPS) { bad = i; break; }
    }
    if (bad < 0) return out;
    lines.splice(bad, 1);
  }
  return [];
}
