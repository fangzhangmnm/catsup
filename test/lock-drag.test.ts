// 锁面拖动跟手（白模 W-13，2026-11-11 Claude Opus 5.5；controller/lock-drag.ts）：纯计算的性质测试。
// 随机相机（透视 / 正交）、随机的锁面和轴、随机拖动方向，P0 在按下那条射线上：
//   · 锁面：P0 + d 在锁着的面上（过 P0），投回屏幕就是现在光标的位置（差不到半个像素）；朝哪个方向拖都一样。
//   · 视线贴着面：退回投影（有界），并标出来；交点太远：夹在 maxLen，并标出来。
//   · 锁轴：照 FM18 = 不锁时的位移投到轴上（不改）。不锁：P0 + d 投回屏幕就是光标（过 P0 的平面）。
import { describe, it, eq, assert } from "./runner.mjs";
import { dragDelta, dragMaxLen, rayOnPlane } from "../src/controller/lock-drag.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }), add = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul = (a: Pt3, s: number): Pt3 => ({ x: a.x * s, y: a.y * s, z: a.z * s }), dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }), unit = (a: Pt3): Pt3 => mul(a, 1 / Math.hypot(a.x, a.y, a.z));
/** 一台相机：眼睛、看哪、透视（视场）或正交（半高）；屏幕 W × H 像素、y 朝下。 */
function camera(r: () => number, persp: boolean) {
  const W = 1000, H = 800, eye = { x: (r() - 0.5) * 20, y: (r() - 0.5) * 20, z: 2 + r() * 10 }, target = { x: (r() - 0.5) * 2, y: (r() - 0.5) * 2, z: r() };
  const f = unit(sub(target, eye)), right = unit(cross(f, { x: 0, y: 0, z: 1 })), up = cross(right, f), fov = 0.6 + r() * 0.6, halfH = 1 + r() * 4;
  const ray = (sx: number, sy: number) => {
    const u = (sx - W / 2) / (H / 2), v = -(sy - H / 2) / (H / 2);
    if (persp) { const t = Math.tan(fov / 2); return { origin: eye, dir: unit(add(f, add(mul(right, u * t), mul(up, v * t)))) }; }
    return { origin: add(eye, add(mul(right, u * halfH), mul(up, v * halfH))), dir: f };
  };
  const project = (p: Pt3) => {
    const q = sub(p, eye), z = dot(q, f);
    if (persp) { const t = Math.tan(fov / 2); return { x: W / 2 + (dot(q, right) / z / t) * (H / 2), y: H / 2 - (dot(q, up) / z / t) * (H / 2) }; }
    return { x: W / 2 + (dot(q, right) / halfH) * (H / 2), y: H / 2 - (dot(q, up) / halfH) * (H / 2) };
  };
  return { W, H, ray, project, f };
}
const randUnit = (r: () => number): Pt3 => unit({ x: r() - 0.5, y: r() - 0.5, z: r() - 0.5 });

describe("锁面拖动跟手（W-13，controller/lock-drag.ts）", () => {
  for (const persp of [true, false]) it(`${persp ? "透视" : "正交"}：随机的面、随机的拖动——抓住的点在面上、投回屏幕就是光标（< 0.5 px）；贴着面 / 太远时标出来`, () => {
    const r = rng(persp ? 11 : 12);
    let ok = 0, graze = 0, clamped = 0, worst = 0;
    for (let k = 0; k < 400; k++) {
      const cam = camera(r, persp), s0 = { x: 200 + r() * 600, y: 150 + r() * 500 }, r0 = cam.ray(s0.x, s0.y), p0 = add(r0.origin, mul(r0.dir, 3 + r() * 8));
      const n = k % 3 === 0 ? { x: 0, y: 0, z: 1 } : randUnit(r), ang = r() * Math.PI * 2, L = 20 + r() * 200, s1 = { x: s0.x + Math.cos(ang) * L, y: s0.y + Math.sin(ang) * L }, r1 = cam.ray(s1.x, s1.y);
      const maxLen = dragMaxLen(r0, cam.ray(cam.project(p0).x, 0), cam.ray(cam.project(p0).x, cam.H), p0);
      const res = dragDelta(r0, r1, p0, { axis: null, plane: n }, maxLen), q = add(p0, res.d);
      if (res.graze) { graze++; assert(Math.abs(dot(res.d, n)) < 1e-9, "贴着面：投影兜底也在面里"); continue; }
      assert(Math.abs(dot(sub(q, p0), n)) < 1e-9 * (1 + Math.hypot(res.d.x, res.d.y, res.d.z)), "P0 + d 在锁着的面上");
      if (res.clamped) { clamped++; assert(Math.abs(Math.hypot(res.d.x, res.d.y, res.d.z) - maxLen) < 1e-6 * maxLen, "夹在 maxLen"); continue; }
      const sp = cam.project(q), e = Math.hypot(sp.x - s1.x, sp.y - s1.y);
      worst = Math.max(worst, e); ok++;
    }
    assert(worst < 0.5, `投回屏幕离光标最远 ${worst.toFixed(4)} px`);
    assert(ok > 300, `真跟手的有 ${ok} 次（贴着面 ${graze}、夹住 ${clamped}）`);
  });
  it("锁轴照 FM18：不锁时的位移投到轴上；不锁：抓住的点投回屏幕就是光标", () => {
    const r = rng(5);
    for (let k = 0; k < 200; k++) {
      const persp = k % 2 === 0, cam = camera(r, persp), s0 = { x: 300 + r() * 400, y: 200 + r() * 400 }, r0 = cam.ray(s0.x, s0.y), p0 = add(r0.origin, mul(r0.dir, 4 + r() * 5));
      const s1 = { x: s0.x + (r() - 0.5) * 300, y: s0.y + (r() - 0.5) * 300 }, r1 = cam.ray(s1.x, s1.y), ax = randUnit(r);
      const free = dragDelta(r0, r1, p0, { axis: null, plane: null }, Infinity).d, sp = cam.project(add(p0, free));
      assert(Math.hypot(sp.x - s1.x, sp.y - s1.y) < 1e-6, "不锁：跟手");
      const a = dragDelta(r0, r1, p0, { axis: ax, plane: null }, Infinity).d, want = mul(ax, dot(free, ax));
      assert(Math.hypot(a.x - want.x, a.y - want.y, a.z - want.z) < 1e-12, "锁轴 = 投到轴上");
    }
  });
  it("贴着面的保护是明着的：|cos| ≤ 0.05 或交在眼睛后面 = 不用交点", () => {
    const o = { x: 0, y: 0, z: 1 }, n = { x: 0, y: 0, z: 1 };
    eq(rayOnPlane({ origin: o, dir: unit({ x: 1, y: 0, z: -0.04 }) }, { x: 0, y: 0, z: 0 }, n), null, "差不多平行");
    eq(rayOnPlane({ origin: o, dir: { x: 0, y: 0, z: 1 } }, { x: 0, y: 0, z: 0 }, n), null, "交在眼睛后面");
    assert(rayOnPlane({ origin: o, dir: unit({ x: 1, y: 0, z: -0.2 }) }, { x: 0, y: 0, z: 0 }, n) !== null, "夹角够大 = 交得到");
  });
});
