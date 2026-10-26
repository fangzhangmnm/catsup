// 参考圆 / 参考球（圆规 / 球规，纪元账本 DT50）：几何纯函数、参考几何模型（加 / 擦 / 变换 / 世界视图）、求解器吸附、橡皮拾取、工具的「世界 → 池本地」换算。
// created 2026-10-26 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import type { GeomView } from "../src/scene/world-view.ts";
import { applyOp } from "../src/editor/ops.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { snapPoint } from "../src/editor/solver.ts";
import { GROUND, NO_HAND } from "../src/editor/pick.ts";
import { WORLD_FRAME, compose, rotationAbout, scalingAbout, translation } from "../src/scene/xform.ts";
import { addGuideCircle, addGuideSphere, emptyGuides, eraseGuides, guideCount, guidesToWorld, transformGuides } from "../src/scene/guides.ts";
import { circleCircle, lineCircle, lineSphere, nearestOnCircle, raySphereFront, spherePlane } from "../src/editor/guide-curves.ts";
import { pickGuide, withoutGuides } from "../src/editor/guide-pick.ts";
import { compassOp } from "../src/editor/tools/compass.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: Pt3, b: Pt3, tol = 1e-9): boolean => Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.z - b.z) < tol;
const has = (ps: Pt3[], q: Pt3, tol = 1e-9): boolean => ps.some((p) => near(p, q, tol));
const Z = P(0, 0, 1), X = P(1, 0, 0), O = P(0, 0, 0), R3 = Math.sqrt(3);

describe("guide-curves: 圆 / 球的几何", () => {
  it("射线离圆最近的点 = 射线打到圆面、沿圆心方向推到半径上；平行于圆面 / 正对圆心 = null", () => {
    assert(near(nearestOnCircle(O, Z, 2, P(3, 4, 10), P(0, 0, -1))!, P(1.2, 1.6, 0)), "(3,4) 推回半径 2");
    assert(near(nearestOnCircle(O, Z, 2, P(0.3, 0.4, 10), P(0, 0, -1))!, P(1.2, 1.6, 0)), "圆里面也往外推");
    eq(nearestOnCircle(O, Z, 2, P(0, 0, 10), P(1, 0, 0)), null, "平行于圆面");
    eq(nearestOnCircle(O, Z, 2, P(0, 0, 10), P(0, 0, -1)), null, "正对圆心：方向不定");
  });
  it("直线 × 圆：圆面里两个 / 线段裁掉一个 / 穿过圆面在圆周上才算 / 平行不共面 = 空", () => {
    const two = lineCircle(P(-5, 0, 0), X, O, Z, 2);
    eq(two.length, 2); assert(has(two, P(-2, 0, 0)) && has(two, P(2, 0, 0)));
    const seg = lineCircle(P(-5, 0, 0), X, O, Z, 2, 4);
    eq(seg.length, 1); assert(near(seg[0], P(-2, 0, 0)), "线段 [−5, −1] 只碰左边那个");
    const tan = lineCircle(P(-5, 2, 0), X, O, Z, 2);
    eq(tan.length, 1); assert(near(tan[0], P(0, 2, 0)), "相切 = 一个");
    const pierce = lineCircle(P(2, 0, -1), Z, O, Z, 2);
    eq(pierce.length, 1); assert(near(pierce[0], P(2, 0, 0)), "竖着穿过圆周");
    eq(lineCircle(P(1, 0, -1), Z, O, Z, 2).length, 0, "穿过圆面但在圆里面");
    eq(lineCircle(P(-5, 0, 0.5), X, O, Z, 2).length, 0, "平行于圆面但不在圆面里");
  });
  it("圆 × 圆：共面两个 / 相切一个 / 不共面、同心、离太远 = 空", () => {
    const x = circleCircle(O, Z, 2, P(2, 0, 0), Z, 2);
    eq(x.length, 2); assert(has(x, P(1, R3, 0)) && has(x, P(1, -R3, 0)));
    const t = circleCircle(O, Z, 2, P(4, 0, 0), Z, 2);
    eq(t.length, 1); assert(near(t[0], P(2, 0, 0)));
    eq(circleCircle(O, Z, 2, P(2, 0, 0), X, 2).length, 0, "法向不平行");
    eq(circleCircle(O, Z, 2, P(2, 0, 0.3), Z, 2).length, 0, "平行但不在同一平面");
    eq(circleCircle(O, Z, 2, O, Z, 1).length, 0, "同心");
    eq(circleCircle(O, Z, 1, P(5, 0, 0), Z, 1).length, 0, "离太远");
  });
  it("直线 × 球 / 球 ∩ 平面那一圈 / 射线先碰到的球面点（从球里面看 = null）", () => {
    const ls = lineSphere(P(-5, 0, 1), X, O, 2);
    eq(ls.length, 2); assert(has(ls, P(-R3, 0, 1)) && has(ls, P(R3, 0, 1)));
    eq(lineSphere(P(-5, 0, 1), X, O, 2, 2).length, 0, "线段没够到");
    eq(lineSphere(P(-5, 0, 3), X, O, 2).length, 0, "离太远");
    const ring = spherePlane(P(0, 0, 1), 2, Z, 0)!;
    assert(near(ring.c, O) && Math.abs(ring.r - R3) < 1e-12, "z = 0 切出半径 √3 的圈");
    eq(spherePlane(P(0, 0, 1), 2, Z, 5), null, "平面没碰到球");
    const f = raySphereFront(O, 2, P(0, 0, 10), P(0, 0, -1))!;
    assert(near(f.p, P(0, 0, 2)) && Math.abs(f.t - 8) < 1e-12, "先碰到上面那个");
    eq(raySphereFront(O, 2, P(0, 0, 1), P(0, 0, -1)), null, "起点在球里");
    eq(raySphereFront(O, 2, P(5, 0, 10), P(0, 0, -1)), null, "没打中");
    eq(raySphereFront(O, 2, P(0, 0, -10), P(0, 0, -1)), null, "球在身后");
  });
});

describe("guide-curves: 参考几何模型", () => {
  it("加圆 / 球：法向归一、半径取绝对值；和线 / 点同一个 id 空间；擦除 / 计数四类一起", () => {
    const g = emptyGuides();
    const c = addGuideCircle(g, P(1, 1, 0), P(0, 0, 3), -2);
    const s = addGuideSphere(g, P(0, 0, 1), 1.5);
    assert(near(c.n, Z) && c.r === 2, "法向归一 + |r|");
    eq(`${c.id},${s.id}`, "1,2"); eq(guideCount(g), 2);
    eq(eraseGuides(g, new Set([1])), 1); eq(g.circles.length, 0); eq(g.spheres.length, 1);
  });
  it("变换：平移 + 旋转 + 等比缩放 → 圆心 / 法向 / 半径都跟着变；世界视图同一套算法", () => {
    const g = emptyGuides();
    addGuideCircle(g, P(1, 0, 0), Z, 1); addGuideSphere(g, P(0, 1, 0), 2);
    const m = compose(translation(P(10, 0, 0)), compose(rotationAbout(O, X, Math.PI / 2), scalingAbout(O, P(2, 2, 2))));
    const w = guidesToWorld(g, m);
    transformGuides(g, m);
    assert(near(g.circles[0].c, P(12, 0, 0)) && near(g.circles[0].n, P(0, -1, 0), 1e-9) && Math.abs(g.circles[0].r - 2) < 1e-12, "圆：×2 → 绕 x 转 90° → 平移");
    assert(near(g.spheres[0].c, P(10, 0, 2), 1e-9) && Math.abs(g.spheres[0].r - 4) < 1e-12, "球");
    assert(near(w.circles[0].c, g.circles[0].c, 1e-9) && near(w.circles[0].n, g.circles[0].n, 1e-9) && Math.abs(w.circles[0].r - 2) < 1e-12, "世界视图 = 原地变换");
    eq(w.spheres[0].r, g.spheres[0].r);
  });
  it("场景 ops：addGuide 圆 / 球进活动池；clearGuides 四类全清；克隆是深拷贝", () => {
    let s = new Scene(new Kernel());
    const at = { def: s.root, group: null };
    s = applyOp(s, { op: "addGuide", at, circle: { c: P(1, 1, 0), n: Z, r: 0.5 } }).scene;
    s = applyOp(s, { op: "addGuide", at, sphere: { c: O, r: 2 } }).scene;
    s = applyOp(s, { op: "addGuide", at, point: P(3, 3, 0) }).scene;
    eq(s.guidesOf(at).circles.length, 1); eq(s.guidesOf(at).spheres.length, 1);
    const c = s.clone();
    s = applyOp(s, { op: "clearGuides", at }).scene;
    eq(guideCount(s.guidesOf(at)), 0, "四类全清");
    eq(c.guidesOf(at).circles[0].r, 0.5, "克隆不受影响");
  });
});

describe("guide-curves: 求解器沿圆 / 球吸", () => {
  const VP = { w: 1000, h: 800 };
  const topCam = (): OrbitCamera => { const c = new OrbitCamera(); c.yaw = -Math.PI / 2; c.pitch = 1.5707; c.halfH = 50; return c; };
  const viewOf = (k: Kernel, guides: object): GeomView => Object.assign(k, { frame: () => WORLD_FRAME, guides: () => ({ lines: [], points: [], circles: [], spheres: [], ...guides }) }) as unknown as GeomView;
  const far = (): Kernel => { const k = new Kernel(); k.addEdges([[P(-40, -40), P(-39, -40)]]); return k; };
  const snapAt = (view: GeomView, q: Pt3) => { const cam = topCam(), s = cam.angularPx(q, VP); return snapPoint(view, cam, VP, s.x, s.y, 8, { plane: GROUND, hand: NO_HAND, lines: false }); };
  it("光标挨着参考圆 → 落在圆周上，标签「参考圆上」", () => {
    const view = viewOf(far(), { circles: [{ id: 1, c: P(5, 5, 0), n: Z, r: 3 }] });
    const a = snapAt(view, P(8.2, 5.1, 0));
    eq(a.label, "参考圆上");
    assert(Math.abs(Math.hypot(a.p.x - 5, a.p.y - 5) - 3) < 1e-9 && Math.abs(a.p.z) < 1e-9, "在圆周上");
    const b = snapAt(view, P(5, 5, 0) /* 圆心附近：离圆周远 */);
    assert(b.label !== "参考圆上", "离圆周远不吸");
  });
  it("参考圆 × 参考线 / 参考圆 × 参考圆 / 圆 × 边 → 交点", () => {
    const k = far(); k.addEdges([[P(-10, 9, 0), P(20, 9, 0)]]);
    const view = viewOf(k, {
      circles: [{ id: 1, c: P(0, 0, 0), n: Z, r: 5 }, { id: 2, c: P(6, 0, 0), n: Z, r: 5 }],
      lines: [{ id: 3, p: P(-20, 3, 0), dir: X }],
    });
    const a = snapAt(view, P(4.1, 3.1, 0));
    eq(a.label, "参考圆 × 参考线"); assert(near(a.p, P(4, 3, 0), 1e-9));
    const b = snapAt(view, P(3.1, 4.1, 0));
    eq(b.label, "参考圆 × 参考圆"); assert(near(b.p, P(3, 4, 0), 1e-9));
    const k2 = far(); k2.addEdges([[P(-10, 3, 0), P(20, 3, 0)]]);
    const c = snapAt(viewOf(k2, { circles: [{ id: 1, c: O, n: Z, r: 5 }] }), P(-4.1, 3.1, 0));
    eq(c.label, "参考圆 × 边"); assert(near(c.p, P(-4, 3, 0), 1e-9));
  });
  it("参考球 ∩ 地面那一圈：俯视时光标挨着那一圈 → 「参考球 × 画面」，落在地上", () => {
    const view = viewOf(far(), { spheres: [{ id: 1, c: P(0, 0, 3), r: 5 }] });   // 切地面 = 半径 4 的圈
    const a = snapAt(view, P(4.1, 0.1, 0));
    eq(a.label, "参考球 × 画面");
    assert(Math.abs(Math.hypot(a.p.x, a.p.y) - 4) < 1e-9 && Math.abs(a.p.z) < 1e-9);
  });
});

describe("guide-curves: 拾取 + 圆规工具的坐标换算", () => {
  it("橡皮点在圆周上 = 圆；点在球的三圈上 = 球；圆心附近不算；withoutGuides 四类一起过滤", () => {
    const cam = new OrbitCamera(); cam.yaw = -Math.PI / 2; cam.pitch = 1.5707; cam.halfH = 50;
    const VP = { w: 1000, h: 800 };
    const G = { lines: [], points: [], circles: [{ id: 1, c: P(0, 0, 0), n: Z, r: 5 }], spheres: [{ id: 2, c: P(20, 0, 0), r: 3 }] };
    const at = (p: Pt3) => cam.angularPx(p, VP);
    const s1 = at(P(5.05, 0, 0)); eq(pickGuide(G, cam, VP, s1.x, s1.y, 6)?.kind, "circle");
    const s2 = at(P(23.05, 0, 0)); eq(pickGuide(G, cam, VP, s2.x, s2.y, 6)?.kind, "sphere", "球的赤道圈");
    const s3 = at(P(0.2, 0, 0)); eq(pickGuide(G, cam, VP, s3.x, s3.y, 6), null, "圆心附近不是圆");
    const left = withoutGuides(G, new Set([1, 2]));
    eq(left.circles.length + left.spheres.length, 0);
  });
  it("compassOp：世界坐标 → 池本地（池缩放 ×2 → 本地半径减半；法向按本地归一）", () => {
    const inv = scalingAbout(O, P(0.5, 0.5, 0.5));
    const ctx = { toLocal: (p: Pt3): Pt3 => ({ x: inv[0] * p.x + inv[3], y: inv[5] * p.y + inv[7], z: inv[10] * p.z + inv[11] }) };
    const at = { def: 0, group: null } as never;
    const op = compassOp(ctx, at, P(2, 4, 0), Z, 3, false) as { circle: { c: Pt3; n: Pt3; r: number } };
    assert(near(op.circle.c, P(1, 2, 0)) && near(op.circle.n, Z) && Math.abs(op.circle.r - 1.5) < 1e-12, "圆");
    const sp = compassOp(ctx, at, P(2, 4, 0), Z, 3, true) as { sphere: { c: Pt3; r: number } };
    assert(near(sp.sphere.c, P(1, 2, 0)) && Math.abs(sp.sphere.r - 1.5) < 1e-12, "球");
  });
});
