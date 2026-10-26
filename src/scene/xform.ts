// xform.ts —— 仿射变换（3×4，行主序：[r00 r01 r02 tx, r10 r11 r12 ty, r20 r21 r22 tz]）。零依赖；component 实例 / group 整体变换 /
// rotate / scale 工具共用。created 2026-10-21 by Claude Fable 5.1（group / component 纪元）
import { type PlaneParams, type Pt3, canonicalPlane, cross3, dot3, len3, normalize3, scale3 } from "../kernel/geom.ts";

export type Xform = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

export const IDENTITY: Xform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

export const isIdentity = (m: Xform): boolean => m.every((v, i) => Math.abs(v - IDENTITY[i]) < 1e-12);

export const applyPt = (m: Xform, p: Pt3): Pt3 => ({
  x: m[0] * p.x + m[1] * p.y + m[2] * p.z + m[3],
  y: m[4] * p.x + m[5] * p.y + m[6] * p.z + m[7],
  z: m[8] * p.x + m[9] * p.y + m[10] * p.z + m[11],
});
export const applyDir = (m: Xform, d: Pt3): Pt3 => ({
  x: m[0] * d.x + m[1] * d.y + m[2] * d.z,
  y: m[4] * d.x + m[5] * d.y + m[6] * d.z,
  z: m[8] * d.x + m[9] * d.y + m[10] * d.z,
});

/** a ∘ b：先 b 后 a。 */
export function compose(a: Xform, b: Xform): Xform {
  const r = (i: number, j: number): number => a[i * 4 + 0] * b[0 * 4 + j] + a[i * 4 + 1] * b[1 * 4 + j] + a[i * 4 + 2] * b[2 * 4 + j];
  const t = (i: number): number => a[i * 4 + 0] * b[3] + a[i * 4 + 1] * b[7] + a[i * 4 + 2] * b[11] + a[i * 4 + 3];
  return [r(0, 0), r(0, 1), r(0, 2), t(0), r(1, 0), r(1, 1), r(1, 2), t(1), r(2, 0), r(2, 1), r(2, 2), t(2)];
}

export function invert(m: Xform): Xform {
  const [a, b, c, tx, d, e, f, ty, g, h, i, tz] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-18) throw new Error("xform: singular (zero scale)");
  const k = 1 / det;
  const r: number[] = [
    (e * i - f * h) * k, (c * h - b * i) * k, (b * f - c * e) * k, 0,
    (f * g - d * i) * k, (a * i - c * g) * k, (c * d - a * f) * k, 0,
    (d * h - e * g) * k, (b * g - a * h) * k, (a * e - b * d) * k, 0,
  ];
  r[3] = -(r[0] * tx + r[1] * ty + r[2] * tz);
  r[7] = -(r[4] * tx + r[5] * ty + r[6] * tz);
  r[11] = -(r[8] * tx + r[9] * ty + r[10] * tz);
  return r as unknown as Xform;
}

export const translation = (t: Pt3): Xform => [1, 0, 0, t.x, 0, 1, 0, t.y, 0, 0, 1, t.z];

/** 绕过 center、方向 axis（单位化）转 angle 弧度（右手）。 */
export function rotationAbout(center: Pt3, axis: Pt3, angle: number): Xform {
  const u = normalize3(axis);
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  const R: Xform = [
    t * u.x * u.x + c, t * u.x * u.y - s * u.z, t * u.x * u.z + s * u.y, 0,
    t * u.x * u.y + s * u.z, t * u.y * u.y + c, t * u.y * u.z - s * u.x, 0,
    t * u.x * u.z - s * u.y, t * u.y * u.z + s * u.x, t * u.z * u.z + c, 0,
  ];
  return compose(translation(center), compose(R, translation(scale3(center, -1))));
}

/** 以 center 为不动点、按三轴各自系数缩放（世界轴）。 */
export function scalingAbout(center: Pt3, s: Pt3): Xform {
  const S: Xform = [s.x, 0, 0, 0, 0, s.y, 0, 0, 0, 0, s.z, 0];
  return compose(translation(center), compose(S, translation(scale3(center, -1))));
}

/** 平面变换：法向走逆转置，d 由变换后的一个面上点重算；输出 canonical。 */
/** 沿一根方向缩放（绕 center）：线性部分 = I + (f − 1)·a aᵀ（a = 单位方向）；轴不和世界轴对齐时用（变换工具的单轴缩放块，2026-10-26）。 */
export function scalingAlong(center: Pt3, axis: Pt3, f: number): Xform {
  const l = Math.hypot(axis.x, axis.y, axis.z) || 1, a = { x: axis.x / l, y: axis.y / l, z: axis.z / l }, k = f - 1;
  const L = [1 + k * a.x * a.x, k * a.x * a.y, k * a.x * a.z, k * a.y * a.x, 1 + k * a.y * a.y, k * a.y * a.z, k * a.z * a.x, k * a.z * a.y, 1 + k * a.z * a.z];
  const t = (r: number): number => (r === 0 ? center.x : r === 1 ? center.y : center.z) - (L[r * 3] * center.x + L[r * 3 + 1] * center.y + L[r * 3 + 2] * center.z);
  return [L[0], L[1], L[2], t(0), L[3], L[4], L[5], t(1), L[6], L[7], L[8], t(2)];
}
/**
 * 斜切（剪切）：3×3 部分的三列不两两正交 = 分解不成「平移 · 旋转 · 缩放」。glTF 节点矩阵不许（规范：必须能分解成 TRS）——
 * CatsUp 跟 glTF 对齐（2026-10-26 user「斜切：和gltf对齐。然后如果发生斜切能不能在发生的时候护栏住，然后提示报错？」）。
 * 镜像（负缩放）不算斜切；容差按夹角余弦（数值误差 ~1e−15，远小于它）。
 */
export function hasShear(m: Xform, cosTol = 1e-6): boolean {
  const c = [0, 1, 2].map((j) => ({ x: m[j], y: m[4 + j], z: m[8 + j] }));
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]] as const) {
    const a = c[i], b = c[j], la = Math.hypot(a.x, a.y, a.z), lb = Math.hypot(b.x, b.y, b.z);
    if (la < 1e-12 || lb < 1e-12) return true;   // 某个方向被压成零 = 退化，同样分解不了
    if (Math.abs(a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb) > cosTol) return true;
  }
  return false;
}
/** 沿几根互相垂直的方向一起缩放 f（变换工具的平面缩放块 = 两根；单轴块 = 一根）。 */
export function scalingAlongAxes(center: Pt3, axes: readonly Pt3[], f: number): Xform {
  let X: Xform = IDENTITY;
  for (const a of axes) X = compose(scalingAlong(center, a, f), X);
  return X;
}
/**
 * 法向的变换：逆转置作用在法向 n' = (M⁻¹)ᵀ n，**不归一、不规范化**（朝向保留）。长度 = 本地沿法向 1 个单位在世界里是多少分之一：
 * 本地平面沿法向挪 d ⇔ 世界平面沿 normalize(n') 挪 d / |n'|。推拉这类「本地按法向走多远」的动词换到世界一律走它（2026-10-26：
 * 转 180° 的负重轮推拉方向反了——工具拿了 applyPlane 规范化过的世界法向，组件里的 +x 到世界是 −x、被规范化翻回 +x，只换了长度没换正负）。
 */
export function applyNormal(m: Xform, n0: Pt3): Pt3 {
  const inv = invert(m);
  return {
    x: inv[0] * n0.x + inv[4] * n0.y + inv[8] * n0.z,
    y: inv[1] * n0.x + inv[5] * n0.y + inv[9] * n0.z,
    z: inv[2] * n0.x + inv[6] * n0.y + inv[10] * n0.z,
  };
}

/** 平面的变换（结果规范化：共面的面共用一个平面记录，朝向丢了——要朝向用 applyNormal）。 */
export function applyPlane(m: Xform, pl: PlaneParams): PlaneParams {
  const n = applyNormal(m, pl.n);
  const p0 = applyPt(m, scale3(pl.n, pl.d));
  const nn = normalize3(n);
  return canonicalPlane(nn, dot3(nn, p0));
}

/** 行列式（镜像 < 0；均匀缩放 = cbrt(|det|)）。 */
export const det3 = (m: Xform): number => m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8]);

/** 是否刚体（正交 + 行列式 +1，容差 1e-9）。 */
export function isRigid(m: Xform): boolean {
  const cx: Pt3 = { x: m[0], y: m[4], z: m[8] }, cy: Pt3 = { x: m[1], y: m[5], z: m[9] }, cz: Pt3 = { x: m[2], y: m[6], z: m[10] };
  const ok = (v: Pt3): boolean => Math.abs(len3(v) - 1) < 1e-9;
  return ok(cx) && ok(cy) && ok(cz) && Math.abs(dot3(cx, cy)) < 1e-9 && Math.abs(dot3(cx, cz)) < 1e-9 && Math.abs(dot3(cy, cz)) < 1e-9 && det3(m) > 0;
}

/** glTF 4×4 列主序（Y-up 换轴由调用方做）。 */
export const toMatrix16 = (m: Xform): number[] => [m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, m[3], m[7], m[11], 1];
export function fromMatrix16(a: readonly number[]): Xform {
  if (a.length !== 16) throw new Error("xform: matrix must have 16 numbers");
  return [a[0], a[4], a[8], a[12], a[1], a[5], a[9], a[13], a[2], a[6], a[10], a[14]];
}

/** 轴框（group 的编辑轴 / definition 的轴）：原点 + 三正交单位向量。 */
export interface Frame { origin: Pt3; x: Pt3; y: Pt3; z: Pt3; }
export const WORLD_FRAME: Frame = { origin: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } };
export const frameAt = (origin: Pt3): Frame => ({ ...WORLD_FRAME, origin });
export function transformFrame(m: Xform, f: Frame): Frame {
  const x = normalize3(applyDir(m, f.x)), y0 = applyDir(m, f.y);
  const z = normalize3(cross3(x, y0));
  const y = cross3(z, x);
  return { origin: applyPt(m, f.origin), x, y, z };
}
export const frameToXform = (f: Frame): Xform => [f.x.x, f.y.x, f.z.x, f.origin.x, f.x.y, f.y.y, f.z.y, f.origin.y, f.x.z, f.y.z, f.z.z, f.origin.z];
