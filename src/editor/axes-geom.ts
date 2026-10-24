// axes-geom.ts —— 轴工具的纯几何（0.11 尺规纪元 ④，2026-10-24，Claude Fable 5.1）：三点定帧。不 import editor.ts（测试直跑）。
import type { Pt3 } from "../kernel/kernel.ts";
import { cross3, dot3, normalize3, scale3, sub3 } from "../kernel/geom.ts";
import type { Frame } from "../scene/xform.ts";

export const AXES_MIN = 0.01;

/**
 * SU Axes 三下：原点 o → x 方向点 px → y 方向点 py。x = o→px；z = x × (o→py)（右手系）；y = z × x（把 py 正交化到 x 的垂面）。
 * py 与 x 共线时用 fallbackZ（通常 = 手势平面法向）定 z；fallbackZ 也与 x 共线 → null。
 */
export function frameFrom3(o: Pt3, px: Pt3, py: Pt3 | null, fallbackZ: Pt3): Frame | null {
  const vx = sub3(px, o);
  if (Math.hypot(vx.x, vx.y, vx.z) < AXES_MIN) return null;
  const x = normalize3(vx);
  let z: Pt3 | null = null;
  if (py) {
    const c = cross3(x, sub3(py, o));
    if (Math.hypot(c.x, c.y, c.z) > 1e-9) z = normalize3(c);
  }
  if (!z) {
    const f = sub3(fallbackZ, scale3(x, dot3(fallbackZ, x)));
    if (Math.hypot(f.x, f.y, f.z) < 1e-9) return null;
    z = normalize3(f);
  }
  const y = cross3(z, x);
  return { origin: { ...o }, x, y, z };
}
