// 第二点平面查询：含光标的膜（且含锚点）胜出——从侧面底边往上拖矩形/线，几何落在侧面而不是地面。
// created 2026-09-06 by Claude Fable 5.1（user 截图案：「一个 cube，我从侧面的底边开始往上拖 rect，结果没有吸附在侧面上，反而一直显示边上」）
import { describe, it, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { resolveRectPlane, faceUnderCursor, NO_HAND } from "../src/editor/solver.ts";
import { rectSegments, rectSegmentsOnPlane } from "../src/editor/tools.ts";
import { dist3, distToPlane } from "../src/kernel/geom.ts";

const VP = { w: 1000, h: 800 };
const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });

function box(): Kernel {
  const k = new Kernel();
  k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 100, y: 60 }));
  k.pushPull(k.faces()[0].id, 40);
  return k;
}
/** 从南面（-Y）略俯视看盒子的正面 y=0。 */
function frontCam(proj: "ortho" | "persp"): OrbitCamera {
  const c = new OrbitCamera();
  c.projection = proj;
  c.yaw = -Math.PI / 2; c.pitch = 0.5; c.halfH = 120; c.target = P(50, 30, 20);
  return c;
}

describe("plane-second-point", () => {
  it("矩形第二点不吸自己：预演里新生的角点在手中集，光标停在上一帧角点旁 6px 不报 endpoint（一 snap 一 snap 真凶）", () => {
    const k = new Kernel();
    const c = frontCam("persp"); c.setView("top"); c.target = P(50, 30, 0); c.halfH = 100;
    const p1 = P(0, 0, 0);
    // 预演：把上一帧的矩形画进影子副本（新生 4 顶点），手中集 = 不在 checkpoint（空核）里的顶点 = 全部
    const live = k.clone(); live.addEdges(rectSegments({ x: 0, y: 0 }, { x: 40, y: 25 }));
    const known = new Set(k.vertices().map((v) => v.id));
    const hand = { has: (vid: number) => !known.has(vid), opaque: false };
    const near = c.worldToScreen(P(40, 25, 0), VP);
    const bad = resolveRectPlane(live, c, VP, p1, near.x + 6, near.y, 8, [], NO_HAND);           // 不传手中集 → 吸自己（6px < 端点 ε 10）
    const good = resolveRectPlane(live, c, VP, p1, near.x + 6, near.y, 8, [], hand);    // 传了 → 不吸
    assert(bad.snap.kind === "endpoint", `复现自吸：${bad.snap.kind}`);
    assert(good.snap.kind !== "endpoint" && good.snap.kind !== "on-edge", `仍在吸自己：${good.snap.kind}`);
  });

  for (const proj of ["ortho", "persp"] as const) {
    it(`${proj}：光标在正面膜内 → faceUnderCursor 命中正面（法向 ±Y）`, () => {
      const k = box(); const c = frontCam(proj);
      const s = c.worldToScreen(P(60, 0, 25), VP);
      const f = faceUnderCursor(k, c, VP, s.x, s.y);
      assert(f && Math.abs(f.plane.n.y) > 0.99, `hit=${JSON.stringify(f?.plane.n)}`);
    });

    it(`${proj}：锚点在正面底边、光标在正面膜内 → 平面=正面，解析点在正面上（不再躺地报「边上」）`, () => {
      const k = box(); const c = frontCam(proj);
      const p1 = P(40, 0, 0);                       // 底边上一点（正面与底面共享）
      const s = c.worldToScreen(P(60, 0, 25), VP);  // 正面内部、不在任何轴线上
      const r = resolveRectPlane(k, c, VP, p1, s.x, s.y, 8, [], NO_HAND);
      assert(Math.abs(r.plane.plane.n.y) > 0.99, `plane n=${JSON.stringify(r.plane.plane.n)}`);
      assert(distToPlane(r.snap.p, r.plane.plane) < 1e-6, "解析点应在正面平面上");
      assert(dist3(r.snap.p, P(60, 0, 25)) < 1e-6, `解析点 ${JSON.stringify(r.snap.p)}`);
      assert(r.snap.kind !== "on-edge", `不该报边上：${r.snap.kind}`);
    });

    it(`${proj}：锚点在背面底边（不在正面平面上）、光标在正面膜内 → 正面不胜出，平面仍含锚点`, () => {
      const k = box(); const c = frontCam(proj);
      const p1 = P(40, 60, 0);
      const s = c.worldToScreen(P(60, 0, 25), VP);
      const r = resolveRectPlane(k, c, VP, p1, s.x, s.y, 8, [], NO_HAND);
      assert(distToPlane(p1, r.plane.plane) < 1e-6, "平面必须含锚点");
      assert(Math.abs(distToPlane(P(60, 0, 25), r.plane.plane)) > 1 || Math.abs(r.plane.plane.n.y) < 0.99 || Math.abs(r.plane.plane.d - 60) < 1e-6, "正面(y=0)不得胜出");
    });

    it(`${proj}：锚点在底边、光标在空中（无膜）→ 退回过锚点轴平面`, () => {
      const k = box(); const c = frontCam(proj);
      const p1 = P(40, 0, 0);
      const s = c.worldToScreen(P(-80, 0, 30), VP);   // 盒子左侧空中
      const r = resolveRectPlane(k, c, VP, p1, s.x, s.y, 8, [], NO_HAND);
      assert(distToPlane(p1, r.plane.plane) < 1e-6, "平面必须含锚点");
      const n = r.plane.plane.n;
      assert([Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)].some((v) => v > 0.999), "应是轴向平面");
    });
  }
});

// 2026-09-06 user：「矩形侧面上往下拖一个矩形，很难吸附底边，或者干脆不吸附，有时候会吸附到这个面后面的某个底边」
// 三根因：①上一帧矩形吸到底边 → 底边被手中切点切三段、每段带手中端点 → 整条底边退赛（下一帧又回来 → 横跳）
// ②触手膜全豁免遮挡 → 正面被矩形 DIVIDE 后透明 → 背后底边露出 ③光标滑出底边 → 平面按落底偏置翻到水平面。
// 修：edgeTargets 链式溶解 / AlignHand.faces（draw 只报 BIRTH 膜）/ resolvePlane prev 黏性。edited by Claude Fable 5.1
describe("plane-second-point: 侧面往下拖矩形吸底边（拖拽中的手中集）", () => {
  /** 盒子挪开原点（底边与世界 x 轴既不重合也不贴近，免得原点轴线冒充「align」）。 */
  function boxOff(): Kernel {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 10, y: 20 }, { x: 110, y: 80 }));
    k.pushPull(k.faces()[0].id, 40);
    return k;
  }
  function camOff(proj: "ortho" | "persp"): OrbitCamera {
    const c = new OrbitCamera();
    c.projection = proj;
    c.yaw = -Math.PI / 2; c.pitch = 0.5; c.halfH = 120; c.target = P(60, 50, 20);
    return c;
  }
  /** 上一帧的预演世界：矩形从锚点拉到 (70,5,prevZ)；手中集 = 新生顶点 + BIRTH 膜。 */
  function liveAfterPreview(k: Kernel, p1: Pt3, prevZ: number) {
    const plane = k.planeOf(k.hitTest(P(60, 20, 20), 0.1).face!)!;
    const live = k.clone();
    const ev = live.addEdges(rectSegmentsOnPlane(plane.plane, plane.basis, p1, P(70, 20, prevZ)));
    const known = new Set(k.vertices().map((v) => v.id));
    const born = new Set(ev.filter((e) => e.type === "BIRTH").map((e) => (e as { face: number }).face));
    const hand = { has: (vid: number) => !known.has(vid), opaque: false, faces: (fid: number) => born.has(fid) };
    return { live, hand, plane: { plane: plane.plane, basis: plane.basis } };
  }

  for (const proj of ["ortho", "persp"] as const) {
    it(`${proj}：上一帧已吸到底边（底边被切三段）→ 这一帧仍报边上、点在底边（不横跳）`, () => {
      const k = boxOff(); const c = camOff(proj);
      const p1 = P(50, 20, 30);
      const { live, hand, plane } = liveAfterPreview(k, p1, 0);
      const s = c.worldToScreen(P(70, 20, 0), VP);
      for (const dy of [-4, 0, 4]) {
        const r = resolveRectPlane(live, c, VP, p1, s.x, s.y + dy, 8, [], hand, plane);
        assert(r.snap.kind === "on-edge", `dy=${dy} kind=${r.snap.kind}`);
        assert(Math.abs(r.snap.p.z) < 1e-6 && Math.abs(r.snap.p.y - 20) < 1e-6, `dy=${dy} p=${JSON.stringify(r.snap.p)}`);
      }
    });

    it(`${proj}：光标滑到底边下方（射线不再命中含锚点的膜）→ 平面黏住正面，不翻到过锚点的水平面`, () => {
      const k = boxOff(); const c = camOff(proj);
      const p1 = P(50, 20, 30);
      const { live, hand, plane } = liveAfterPreview(k, p1, 0);
      const s = c.worldToScreen(P(70, 20, 0), VP);
      const r = resolveRectPlane(live, c, VP, p1, s.x, s.y + 12, 8, [], hand, plane);
      assert(Math.abs(r.plane.plane.n.y) > 0.99, `plane n=${JSON.stringify(r.plane.plane.n)}`);
      assert(distToPlane(r.snap.p, plane.plane) < 1e-6 && r.snap.p.z < 0, `解析点应在正面平面上、底边下方：${JSON.stringify(r.snap.p)}`);
    });

    it(`${proj}：拖拽中正面被矩形 DIVIDE → 子膜照常遮挡，背面底边不可吸`, () => {
      const k = boxOff(); const c = camOff(proj);
      const p1 = P(50, 20, 30);
      const { live, hand, plane } = liveAfterPreview(k, p1, 3);   // 上一帧矩形底在 z=3（未触底边）
      const sBack = c.worldToScreen(P(70, 80, 0), VP);             // 背面底边在屏上投影（落在正面剪影内）
      const r = resolveRectPlane(live, c, VP, p1, sBack.x, sBack.y, 8, [], hand, plane);
      assert(Math.abs(r.snap.p.y - 20) < 1e-6, `不该吸到背面（y=80）：kind=${r.snap.kind} p=${JSON.stringify(r.snap.p)}`);
      // 对照：老定义（触手膜全豁免）会让背面底边露出来
      const loose = { has: hand.has, opaque: false };
      const r0 = resolveRectPlane(live, c, VP, p1, sBack.x, sBack.y, 8, [], loose, plane);
      assert(Math.abs(r0.snap.p.y - 80) < 1e-6, `对照组应复现露背（老定义）：kind=${r0.snap.kind} p=${JSON.stringify(r0.snap.p)}`);
    });
  }
});
