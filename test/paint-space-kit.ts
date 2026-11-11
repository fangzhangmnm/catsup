// 空间里的笔（贴图主线 1-4a）测试共用的东西：针孔相机、给网格体铺一套贴图坐标、目标、笔。不叫 .test.ts（测试文件之间不许互相 import）。created 2026-11-11 by Claude Opus 5.5
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/corner-columns.ts";
import { layoutFaces } from "../src/paint/layout.ts";
import type { PaintTarget } from "../src/paint/space-target.ts";
import type { SpaceCamera } from "../src/paint/space-stroke.ts";
import { resolveBrush } from "../src/paint/kernel/src/common/resolved-brush.ts";
import type { ResolvedBrush } from "../src/paint/kernel/src/common/resolved-brush.ts";
import { IDENTITY, type Xform } from "../src/scene/xform.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

export const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }), add = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul = (a: Pt3, s: number): Pt3 => ({ x: a.x * s, y: a.y * s, z: a.z * s }), dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }), unit = (a: Pt3): Pt3 => mul(a, 1 / Math.hypot(a.x, a.y, a.z));
export const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

/** 针孔相机（屏幕 W × H 像素、y 朝下）：射线、投影、一个屏幕像素在某一点那里有多大（深度 × 2·tan(半视场) ÷ H）。 */
export function pinhole(eye: Pt3, target: Pt3, fovDeg = 50, W = 1000, H = 800, occluded?: SpaceCamera["occluded"]): SpaceCamera & { project(p: Pt3): { x: number; y: number }; W: number; H: number } {
  const f = unit(sub(target, eye)), upRef = Math.abs(f.z) > 0.999 ? P(0, 1, 0) : P(0, 0, 1), right = unit(cross(f, upRef)), up = cross(right, f), t = Math.tan((fovDeg * Math.PI) / 360);
  return {
    W, H,
    ray: (sx, sy) => ({ origin: eye, dir: unit(add(f, add(mul(right, ((sx - W / 2) / (H / 2)) * t), mul(up, (-(sy - H / 2) / (H / 2)) * t)))) }),
    project: (p) => { const q = sub(p, eye), z = dot(q, f); return { x: W / 2 + (dot(q, right) / z / t) * (H / 2), y: H / 2 - (dot(q, up) / z / t) * (H / 2) }; },
    pixelSize: (p) => (dot(sub(p, eye), f) * 2 * t) / H,
    ...(occluded ? { occluded } : {}),
  };
}

/** 给网格体铺一套贴图坐标（1-3a layoutFaces），写进 guid 那一列。 */
export function laidOut(m: MeshKernel, guid = "uv", faces = m.faces(), o: { density?: number; maxSize?: number } = {}): { guid: string; width: number; height: number; pxPerM: number } {
  m.addColumn({ guid, arity: 2 });
  const r = layoutFaces(m, faces, { ...(o.density !== undefined ? { density: o.density } : {}), maxSize: o.maxSize ?? 4096 });
  if (!r.ok) throw new Error(`layout: ${r.reason}`);
  for (const [f, v] of r.values) m.setFaceValues(f, guid, v);
  return { guid, width: r.width, height: r.height, pxPerM: r.density };
}
export function targetOf(m: MeshKernel, uv: { guid: string; width: number; height: number; pxPerM: number }, o: { id?: string; xform?: Xform; walks?: (f: number) => boolean; pxPerM?: number } = {}): PaintTarget {
  return { id: o.id ?? "t", mesh: m, xform: o.xform ?? IDENTITY, uvSet: uv.guid, pxPerM: o.pxPerM ?? uv.pxPerM, canvas: { width: uv.width, height: uv.height }, walks: o.walks ?? (() => true) };
}
/** 一支笔（屏幕上 size 像素大；间距 0.1；不随压感变；没有起收笔渐细）。resolveBrush 只收 预设 / 大小 / 浓度 / 颜色，别的字段在解析出来的那份上盖。 */
export const brush = (o: Partial<ResolvedBrush> = {}): ResolvedBrush => ({ ...resolveBrush({ size: o.size ?? 8, color: "#203040" }), spacing: 0.1, flow: 1, opacity: 1, sizeCoeff: 0, flowCoeff: 0, opaCoeff: 0, pressureGamma: 1, pressureLPF: 0, taperIn: 0, taperOut: 0, streamline: 0, stabilization: 0, ...o }) as ResolvedBrush;
/** 平滑器几乎不平滑（中心线 ≈ 输入的点）。 */
export const RAW = { tau: 1, deadzone: 0 };

/** 一块网格（n × n 个四边形，铺在 xy 上，z = h(x, y)）。 */
export function gridMesh(n: number, size: number, h: (x: number, y: number) => number = () => 0, o: Pt3 = P(0, 0, 0)): MeshKernel {
  const m = new MeshKernel(), id: number[][] = [];
  for (let i = 0; i <= n; i++) { id.push([]); for (let j = 0; j <= n; j++) { const x = o.x - size / 2 + (size * i) / n, y = o.y - size / 2 + (size * j) / n; id[i].push(m.addVertex(P(x, y, o.z + h(x, y)))); } }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m.addFace([id[i][j], id[i + 1][j], id[i + 1][j + 1], id[i][j + 1]], -1, FRESH);
  return m;
}
