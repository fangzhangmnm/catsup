// mesh/ops/primitives.ts —— 基本体（右键新建；2026-10-27 Claude Opus 5.5）。created 2026-10-27 by Claude Opus 5.5
// user 10-27「然后以后圆柱，长立方体建立的时候都是原点在底部中心，和锥体一样。不过球的话还是圆点在原点」：立方体 / 圆柱 / 圆锥 / 平面 = 原点在底面中心，球 = 原点在球心。
// 都在给定的坐标架里长（origin + 三根单位轴，本地坐标）；面一律朝外（封闭体）/ 朝 +z（平面）；新面材质槽 -1（默认）。确定性：只按参数加点加面。
// 圆圈 / 方框 = 只有边、没有面的一圈裸线（F_WIRE），躺在坐标架的 xy 平面里、圆心 / 中心 = 原点（2026-10-28 夜 user「新建其实更常用的是2d的edge loop」：
// 拉一个圈出来接着挤出 / 补洞，Blender 加圆时「填充：无」那种）。
import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel, F_WIRE } from "../mesh-kernel.ts";

export type PrimitiveKind = "circleLoop" | "squareLoop" | "box" | "cylinder" | "cone" | "sphere" | "plane";
export interface PrimitiveFrame { o: Pt3; x: Pt3; y: Pt3; z: Pt3; }
/** size：立方体 = [宽, 深, 高]；圆柱 / 圆锥 = [半径, 半径, 高]；球 = [半径, 半径, 半径]；平面 / 方框 = [宽, 深, 0]；圆圈 = [x 半径, y 半径, 0]（不等 = 椭圆）。segments：圆的段数（≥ 3）；球的纬向圈数 = segments / 2。
 *  返回新长出来的面 / 点 / 裸线（圆圈 / 方框只有点和裸线）。 */
export function addPrimitive(k: MeshKernel, kind: PrimitiveKind, f: PrimitiveFrame, size: readonly [number, number, number], segments = 16): { faces: number[]; verts: number[]; edges: number[] } {
  const at = (a: number, b: number, c: number): Pt3 => ({ x: f.o.x + f.x.x * a + f.y.x * b + f.z.x * c, y: f.o.y + f.x.y * a + f.y.y * b + f.z.y * c, z: f.o.z + f.x.z * a + f.y.z * b + f.z.z * c });
  const verts: number[] = [], faces: number[] = [];
  const V = (a: number, b: number, c: number): number => { const v = k.addVertex(at(a, b, c)); verts.push(v); return v; };
  const F = (ring: number[]): void => { faces.push(k.addFace(ring)); };
  const n = Math.max(3, Math.round(segments));
  const [s0, s1, s2] = size, edges: number[] = [];
  const W = (ring: number[]): void => { for (let i = 0; i < ring.length; i++) { const e = k.ensureEdge(ring[i], ring[(i + 1) % ring.length]); k.setEdgeFlags(e, k.edgeFlags[e] | F_WIRE); edges.push(e); } };
  if (kind === "circleLoop") W(Array.from({ length: n }, (_, i) => V(s0 * Math.cos(2 * Math.PI * i / n), s1 * Math.sin(2 * Math.PI * i / n), 0)));   // s1 ≠ s0 = 椭圆
  else if (kind === "squareLoop") { const w = s0 / 2, d = s1 / 2; W([V(-w, -d, 0), V(w, -d, 0), V(w, d, 0), V(-w, d, 0)]); }
  else if (kind === "box") {
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
  return { faces, verts, edges };
}
/** 每种的默认尺寸（米）、人话名字、有没有段数、尺寸怎么量（边长 = 方的；直径 = 圆的）。顺序 = 菜单 / 下拉里的顺序（线圈排前面：user「更常用的是2d的edge loop」）。 */
export const PRIMITIVES: Readonly<Record<PrimitiveKind, { label: string; size: [number, number, number]; round: boolean; measure: "边长" | "直径" }>> = {
  circleLoop: { label: "圆圈", size: [0.5, 0.5, 0], round: true, measure: "直径" },
  squareLoop: { label: "方框", size: [1, 1, 0], round: false, measure: "边长" },
  box: { label: "立方体", size: [1, 1, 1], round: false, measure: "边长" },
  cylinder: { label: "圆柱", size: [0.5, 0.5, 1], round: true, measure: "直径" },
  cone: { label: "圆锥", size: [0.5, 0.5, 1], round: true, measure: "直径" },
  sphere: { label: "球", size: [0.5, 0.5, 0.5], round: true, measure: "直径" },
  plane: { label: "平面", size: [1, 1, 0], round: false, measure: "边长" },
};
/** 平的（能拖出长宽比的）几种。 */
export const isFlatPrimitive = (kind: PrimitiveKind): boolean => kind === "circleLoop" || kind === "squareLoop" || kind === "plane";
/** 一个世界长度（边长 / 直径，按 measure）→ addPrimitive 的三个尺寸；aspect = 深 / 宽（只平的几种认）。 */
export function primitiveDims(kind: PrimitiveKind, sz: number, aspect = 1): [number, number, number] {
  switch (kind) {
    case "box": return [sz, sz, sz];
    case "plane": case "squareLoop": return [sz, sz * aspect, 0];
    case "circleLoop": return [sz / 2, sz * aspect / 2, 0];
    case "sphere": return [sz / 2, sz / 2, sz / 2];
    default: return [sz / 2, sz / 2, sz];
  }
}
/** 默认的那个世界长度（边长 / 直径）。 */
export const primitiveDefaultLen = (kind: PrimitiveKind): number => (PRIMITIVES[kind].measure === "边长" ? PRIMITIVES[kind].size[0] : PRIMITIVES[kind].size[0] * 2);
