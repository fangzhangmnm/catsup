// mesh/ops/primitives.ts —— 基本体（右键新建；2026-10-27 Claude Opus 5.5）。created 2026-10-27 by Claude Opus 5.5
// user 10-27「然后以后圆柱，长立方体建立的时候都是原点在底部中心，和锥体一样。不过球的话还是圆点在原点」：立方体 / 圆柱 / 圆锥 / 平面 = 原点在底面中心，球 = 原点在球心。
// 都在给定的坐标架里长（origin + 三根单位轴，本地坐标）；面一律朝外（封闭体）/ 朝 +z（平面）；新面材质槽 -1（默认）。确定性：只按参数加点加面。
import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel } from "../mesh-kernel.ts";

export type PrimitiveKind = "box" | "cylinder" | "cone" | "sphere" | "plane";
export interface PrimitiveFrame { o: Pt3; x: Pt3; y: Pt3; z: Pt3; }
/** size：立方体 = [宽, 深, 高]；圆柱 / 圆锥 = [半径, 半径, 高]；球 = [半径, 半径, 半径]；平面 = [宽, 深, 0]。segments：圆的段数（≥ 3）；球的纬向圈数 = segments / 2。 */
export function addPrimitive(k: MeshKernel, kind: PrimitiveKind, f: PrimitiveFrame, size: readonly [number, number, number], segments = 16): { faces: number[]; verts: number[] } {
  const at = (a: number, b: number, c: number): Pt3 => ({ x: f.o.x + f.x.x * a + f.y.x * b + f.z.x * c, y: f.o.y + f.x.y * a + f.y.y * b + f.z.y * c, z: f.o.z + f.x.z * a + f.y.z * b + f.z.z * c });
  const verts: number[] = [], faces: number[] = [];
  const V = (a: number, b: number, c: number): number => { const v = k.addVertex(at(a, b, c)); verts.push(v); return v; };
  const F = (ring: number[]): void => { faces.push(k.addFace(ring)); };
  const n = Math.max(3, Math.round(segments));
  const [s0, s1, s2] = size;
  if (kind === "box") {
    const w = s0 / 2, d = s1 / 2, h = s2;
    const b = [V(-w, -d, 0), V(w, -d, 0), V(w, d, 0), V(-w, d, 0)], t = [V(-w, -d, h), V(w, -d, h), V(w, d, h), V(-w, d, h)];
    F([b[0], b[3], b[2], b[1]]); F([t[0], t[1], t[2], t[3]]);
    for (let i = 0; i < 4; i++) F([b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]]);
  } else if (kind === "plane") {
    const w = s0 / 2, d = s1 / 2;
    F([V(-w, -d, 0), V(w, -d, 0), V(w, d, 0), V(-w, d, 0)]);
  } else if (kind === "cylinder" || kind === "cone") {
    const r = s0, h = s2, ring = (z: number): number[] => Array.from({ length: n }, (_, i) => V(r * Math.cos(2 * Math.PI * i / n), r * Math.sin(2 * Math.PI * i / n), z));
    const b = ring(0);
    F([...b].reverse());
    if (kind === "cylinder") { const t = ring(h); F(t); for (let i = 0; i < n; i++) F([b[i], b[(i + 1) % n], t[(i + 1) % n], t[i]]); }
    else { const apex = V(0, 0, h); for (let i = 0; i < n; i++) F([b[i], b[(i + 1) % n], apex]); }
  } else {
    const r = s0, rings = Math.max(2, Math.round(n / 2));
    const top = V(0, 0, r), bottom = V(0, 0, -r), lat: number[][] = [];
    for (let j = 1; j < rings; j++) { const phi = Math.PI * j / rings; lat.push(Array.from({ length: n }, (_, i) => V(r * Math.sin(phi) * Math.cos(2 * Math.PI * i / n), r * Math.sin(phi) * Math.sin(2 * Math.PI * i / n), r * Math.cos(phi)))); }
    for (let i = 0; i < n; i++) F([top, lat[0][i], lat[0][(i + 1) % n]]);
    for (let j = 0; j + 1 < lat.length; j++) for (let i = 0; i < n; i++) F([lat[j][i], lat[j + 1][i], lat[j + 1][(i + 1) % n], lat[j][(i + 1) % n]]);
    const last = lat[lat.length - 1];
    for (let i = 0; i < n; i++) F([bottom, last[(i + 1) % n], last[i]]);
  }
  return { faces, verts };
}
/** 每种的默认尺寸（米）和人话名字。 */
export const PRIMITIVES: Readonly<Record<PrimitiveKind, { label: string; size: [number, number, number]; round: boolean }>> = {
  box: { label: "立方体", size: [1, 1, 1], round: false },
  cylinder: { label: "圆柱", size: [0.5, 0.5, 1], round: true },
  cone: { label: "圆锥", size: [0.5, 0.5, 1], round: true },
  sphere: { label: "球", size: [0.5, 0.5, 0.5], round: true },
  plane: { label: "平面", size: [1, 1, 0], round: false },
};
